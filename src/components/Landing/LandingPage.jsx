import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../NavBar';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import './LandingPage.css';

/* ─── API helpers (shared with RegistrationForm) ─── */
function resolveApiBase() {
  const envBase = (process.env.REACT_APP_API_BASE || '').trim();
  if (envBase) return envBase;
  const { protocol, hostname, port } = window.location;
  const envHost  = (process.env.REACT_APP_SERVER_HOST || '').trim();
  const winHost  = window.SERVER_HOST ? String(window.SERVER_HOST).trim() : '';
  let lsHost = '';
  try { lsHost = (localStorage.getItem('serverHost') || '').trim(); } catch {}
  const host = envHost || winHost || lsHost || hostname;
  if (!port || port === '443' || port === '80') return '/api';
  const targetPort = port === '3000' ? '3002' : port;
  return protocol + '//' + host + ':' + targetPort;
}
const API = resolveApiBase();

function timeoutFetch(url, opts = {}, ms = 12000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
}

/* ═══════════════════════════════════════════
   THREE.JS — Immersive full-page space scene
   ═══════════════════════════════════════════ */

/* ─── Multi-layer stars with twinkle shader ─── */
const starVert = `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  varying float vAlpha;
  void main() {
    vAlpha = 0.55 + 0.45 * sin(uTime * 0.7 + aPhase);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (180.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`;
const starFrag = `
  varying float vAlpha;
  uniform vec3 uColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    gl_FragColor = vec4(uColor, glow * vAlpha);
  }
`;

function StarLayer({ count, minSize, maxSize, minR, maxR, color }) {
  const ref = useRef();
  const uniforms = useRef({ uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } });
  const [positions, sizes, phases] = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = minR + Math.random() * (maxR - minR);
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      p[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      p[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      p[i*3+2] = r * Math.cos(phi);
      s[i]  = minSize + Math.random() * (maxSize - minSize);
      ph[i] = Math.random() * Math.PI * 2;
    }
    return [p, s, ph];
  }, [count, minSize, maxSize, minR, maxR]);

  useFrame((_, dt) => {
    uniforms.current.uTime.value += dt;
    if (ref.current) ref.current.rotation.y += dt * 0.004;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-aSize"    array={sizes}     count={count} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase"   array={phases}    count={count} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial vertexShader={starVert} fragmentShader={starFrag} uniforms={uniforms.current}
        transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Stars() {
  return (
    <>
      <StarLayer count={1500} minSize={0.3} maxSize={0.6} minR={30} maxR={120} color="#ffffff" />
      <StarLayer count={400}  minSize={0.8} maxSize={1.5} minR={20} maxR={90}  color="#d4c8ff" />
      <StarLayer count={80}   minSize={1.8} maxSize={3.2} minR={15} maxR={60}  color="#ffe8f0" />
    </>
  );
}

/* ─── 3D Moon sphere ─── */
function Moon3D() {
  const ref = useRef();
  const mat = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(180, 180, 20, 256, 256, 256);
    g.addColorStop(0,    '#e4e2f7');
    g.addColorStop(0.35, '#a89ed0');
    g.addColorStop(0.7,  '#4a3a8a');
    g.addColorStop(1,    '#12091f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), roughness: 0.85, metalness: 0.05 });
  }, []);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.04; });
  return (
    <mesh ref={ref} position={[6, 2, -12]} material={mat}>
      <sphereGeometry args={[4, 64, 64]} />
    </mesh>
  );
}

/* ─── Nebula clouds ─── */
function NebulaCloud({ position, size, c0, c1 }) {
  const mat = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    g.addColorStop(0, c0);
    g.addColorStop(0.45, c1);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  }, [c0, c1]);
  return (
    <mesh position={position} material={mat}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

/* ─── Distant gas-giant planet ─── */
function Planet() {
  const ref = useRef();
  const mat = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const ctx = cv.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#1a0a3e');
    g.addColorStop(0.2, '#2d1b69');
    g.addColorStop(0.35, '#4a2d8a');
    g.addColorStop(0.5, '#2d1b69');
    g.addColorStop(0.65, '#1a0a3e');
    g.addColorStop(0.8, '#2d1b69');
    g.addColorStop(1, '#0d0520');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    ctx.globalAlpha = 0.15;
    for (let y = 0; y < 512; y += 25 + Math.random() * 20) {
      ctx.fillStyle = 'hsl(' + (260 + Math.random() * 40) + ', 60%, ' + (20 + Math.random() * 30) + '%)';
      ctx.fillRect(0, y, 512, 6 + Math.random() * 10);
    }
    return new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cv), roughness: 0.7, metalness: 0.1 });
  }, []);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.012; });
  return (
    <mesh ref={ref} position={[-10, -35, -80]} material={mat}>
      <sphereGeometry args={[14, 64, 64]} />
    </mesh>
  );
}

/* ─── Shooting stars ─── */
function ShootingStars() {
  const groupRef = useRef();
  const data = useRef({ trails: [], timer: 2 + Math.random() * 2 });

  useFrame((_, dt) => {
    const d = data.current;
    const g = groupRef.current;
    if (!g) return;

    d.timer -= dt;
    if (d.timer <= 0) {
      d.timer = 3 + Math.random() * 5;
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geom, mat);
      d.trails.push({
        line,
        pos: new THREE.Vector3((Math.random() - 0.5) * 50, 12 + Math.random() * 15, -5 - Math.random() * 30),
        vel: new THREE.Vector3(
          -0.4 - Math.random() * 0.4,
          -0.7 - Math.random() * 0.3,
          -0.1
        ).normalize().multiplyScalar(28 + Math.random() * 22),
        life: 0,
        maxLife: 0.4 + Math.random() * 0.5,
        len: 2 + Math.random() * 3,
      });
      g.add(line);
    }

    d.trails = d.trails.filter(t => {
      t.life += dt;
      if (t.life >= t.maxLife) {
        g.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        return false;
      }
      t.pos.addScaledVector(t.vel, dt);
      const tailDir = t.vel.clone().normalize().multiplyScalar(-t.len);
      const tail = t.pos.clone().add(tailDir);
      const a = t.line.geometry.attributes.position.array;
      a[0] = tail.x; a[1] = tail.y; a[2] = tail.z;
      a[3] = t.pos.x; a[4] = t.pos.y; a[5] = t.pos.z;
      t.line.geometry.attributes.position.needsUpdate = true;
      t.line.material.opacity = 0.9 * (1 - t.life / t.maxLife);
      return true;
    });
  });

  return <group ref={groupRef} />;
}

/* ─── Scroll-linked camera ─── */
function ScrollCamera({ scrollRef }) {
  const t = useRef(0);
  const sp = useRef(0);

  useFrame((state, dt) => {
    t.current += dt;
    sp.current += (scrollRef.current - sp.current) * Math.min(dt * 3, 1);
    const p = sp.current;
    const drift = t.current;
    const x = Math.sin(drift * 0.12) * 0.6;
    const y = Math.cos(drift * 0.08) * 0.3 - p * 25;
    const z = 8 - p * 50;
    state.camera.position.set(x, y, z);
    state.camera.lookAt(x * 0.3, y - 2, z - 15);
  });

  return null;
}

/* ─── Full-page immersive space canvas ─── */
function SpaceScene({ scrollRef }) {
  return (
    <div className="space-scene" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#050208' }}
      >
        <color attach="background" args={['#050208']} />
        <fog attach="fog" args={['#050208', 50, 150]} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[5, 8, 5]} intensity={0.6} />
        <pointLight position={[8, 5, -10]}   intensity={1.5} distance={40} color="#a855f7" />
        <pointLight position={[-6, 2, -5]}   intensity={0.8} distance={30} color="#ff6edc" />
        <pointLight position={[-4, -30, -60]} intensity={2}  distance={80} color="#6366f1" />
        <Suspense fallback={null}>
          <Stars />
          <Moon3D />
          <NebulaCloud position={[6, 3, -18]}    size={30} c0="rgba(168,85,247,0.22)" c1="rgba(255,110,220,0.06)" />
          <NebulaCloud position={[-14, -14, -35]} size={45} c0="rgba(99,102,241,0.18)"  c1="rgba(59,130,246,0.05)" />
          <NebulaCloud position={[10, -26, -55]}  size={38} c0="rgba(236,72,153,0.15)"  c1="rgba(168,85,247,0.04)" />
          <Planet />
          <ShootingStars />
        </Suspense>
        <ScrollCamera scrollRef={scrollRef} />
      </Canvas>
    </div>
  );
}

/* ─── Inline auth form ─── */
function InlineAuth() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [err, setErr]   = useState(null);
  const [busy, setBusy] = useState(false);

  const isReg = mode === 'register';

  const ok = useMemo(() => {
    const u = form.username.trim().length >= 3;
    const p = form.password.length >= 6;
    const e = isReg ? /\S+@\S+\.\S+/.test(form.email) : true;
    return u && p && e;
  }, [form, isReg]);

  const set = e => { const { name, value } = e.target; setForm(s => ({ ...s, [name]: value })); };

  const submit = async e => {
    e.preventDefault();
    if (!ok || busy) return;
    setErr(null);
    setBusy(true);
    try {
      const url = API + (isReg ? '/registration' : '/login');
      const body = isReg
        ? { email: form.email, username: form.username, password: form.password }
        : { username: form.username, password: form.password };
      const res = await timeoutFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Request failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      if (data.userId != null) localStorage.setItem('userId', String(data.userId));
      window.dispatchEvent(new Event('authchange'));
      setForm(s => ({ ...s, password: '' }));
    } catch (ex) {
      setErr(ex.name === 'AbortError' ? 'Connection timed out.' : ex.message || 'Something went wrong.');
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-box">
      <div className="auth-tabs">
        <button className={'atab' + (mode === 'login' ? ' on' : '')} onClick={() => { setMode('login'); setErr(null); }}>Log In</button>
        <button className={'atab' + (mode === 'register' ? ' on' : '')} onClick={() => { setMode('register'); setErr(null); }}>Sign Up</button>
      </div>
      {err && <p className="auth-err">{err}</p>}
      <form onSubmit={submit} className="auth-form">
        {isReg && <input className="auth-input" type="email" name="email" placeholder="Email" value={form.email} onChange={set} required disabled={busy} />}
        <input className="auth-input" type="text" name="username" placeholder="Username" value={form.username} onChange={set} required disabled={busy} autoComplete="username" />
        <input className="auth-input" type="password" name="password" placeholder={isReg ? 'Password (6+ chars)' : 'Password'} value={form.password} onChange={set} required disabled={busy} autoComplete={isReg ? 'new-password' : 'current-password'} />
        <button className="auth-submit" type="submit" disabled={!ok || busy}>
          {busy ? 'Please wait\u2026' : isReg ? 'Create Account' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════ */
export default function LandingPage() {
  const root = useRef(null);
  const scrollRef = useRef(0);

  /* scroll progress 0 → 1 */
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* reveal-on-scroll */
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); });
    }, { rootMargin: '0px 0px -80px 0px', threshold: 0.12 });
    root.current?.querySelectorAll('.anim')?.forEach(n => io.observe(n));
    return () => io.disconnect();
  }, []);

  /* auth */
  const check = useCallback(() => !!localStorage.getItem('token') && !!localStorage.getItem('username'), []);
  const [authed, setAuthed] = useState(check());
  const [user, setUser]     = useState(localStorage.getItem('username') || '');
  useEffect(() => {
    const sync = () => { setAuthed(check()); setUser(localStorage.getItem('username') || ''); };
    window.addEventListener('authchange', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('authchange', sync); window.removeEventListener('storage', sync); };
  }, [check]);

  return (
    <div className="lp" ref={root}>
      <NavBar />

      {/* Fixed full-page 3D canvas */}
      <SpaceScene scrollRef={scrollRef} />

      {/* ══════ HERO ══════ */}
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-h1">Moon</h1>
          <p className="hero-tag">Build &middot; Explore &middot; Play</p>
          <p className="hero-sub">
            A multiplayer 3D sandbox set on the lunar surface.<br />
            No downloads. Just open your browser and jump in.
          </p>
          <Link className="cta" to="/rooms">Play Now &rarr;</Link>
        </div>

        <div className="hero-scroll" aria-hidden="true">
          <div className="scroll-track"><div className="scroll-dot" /></div>
          <span className="scroll-label">Scroll</span>
        </div>
      </section>

      {/* ══════ ABOUT ══════ */}
      <section className="sect sect--glass">
        <div className="wrap">
          <div className="about anim">
            <span className="label label--center">About the game</span>
            <h2 className="hdg hdg--center">What is Moon?</h2>
            <p className="txt txt--center">
              Moon is a multiplayer 3D sandbox set on the lunar surface. Drop into a
              shared world, place cubes and props, shape terrain, and challenge other
              players &mdash; all from your browser. No downloads, no installs.
            </p>
            <p className="txt txt--center">
              Build towering structures, race rovers across craters, or face off in
              strategy games. Moon gives you the tools and the stage &mdash; your
              creativity is the only limit.
            </p>
          </div>
        </div>
      </section>

      {/* ══════ FEATURES ══════ */}
      <section className="sect sect--glass">
        <div className="wrap anim">
          <span className="label label--center">Features</span>
          <h2 className="hdg hdg--center">Everything you need to play</h2>

          <div className="feat-grid">
            <div className="feat anim">
              <div className="feat-ico">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/><path d="M12 22V12"/><path d="M21 7l-9 5-9-5"/></svg>
              </div>
              <h3 className="feat-t">Sandbox Building</h3>
              <p className="feat-d">Place cubes, spheres, props, and terrain &mdash; build anything you can imagine on the lunar surface.</p>
            </div>
            <div className="feat anim">
              <div className="feat-ico">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="19" cy="7" r="3"/><path d="M21 21v-2a3 3 0 00-3-3"/></svg>
              </div>
              <h3 className="feat-t">Real-Time Multiplayer</h3>
              <p className="feat-d">Play with friends in real-time. See their builds, compete in games, and explore the Moon together.</p>
            </div>
            <div className="feat anim">
              <div className="feat-ico">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"/></svg>
              </div>
              <h3 className="feat-t">Immersive 3D World</h3>
              <p className="feat-d">A fully interactive moon environment powered by Three.js &mdash; walk around, build, and customize your space.</p>
            </div>
            <div className="feat anim">
              <div className="feat-ico">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
              </div>
              <h3 className="feat-t">Cross-Platform</h3>
              <p className="feat-d">Works on desktop and mobile browsers. No downloads, no installs &mdash; just open and play.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ COMMUNITY ══════ */}
      <section className="sect sect--glass">
        <div className="wrap anim" style={{ textAlign: 'center' }}>
          <span className="label label--center">Community</span>
          <h2 className="hdg hdg--center">Join the explorers</h2>
          <p className="txt txt--center">
            Connect with other Moon players. Share your builds, find teammates, and stay up to date.
          </p>
          <div className="socials">
            <a className="soc soc--discord" href="https://discord.com/" target="_blank" rel="noopener noreferrer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.369A19.791 19.791 0 0 0 16.558 3c-.2.363-.43.85-.589 1.232a18.27 18.27 0 0 0-4-.003A12.3 12.3 0 0 0 11.38 3 19.73 19.73 0 0 0 7.64 4.37C3.67 9.7 2.88 14.9 3.25 20.05a19.86 19.86 0 0 0 4.9 1.58c.396-.54.75-1.116 1.06-1.72a12.9 12.9 0 0 1-1.67-.64c.14-.1.28-.21.41-.32a13.9 13.9 0 0 0 11.99 0c.13.11.27.22.41.32-.53.21-1.09.46-1.68.65.31.6.66 1.17 1.06 1.71a19.82 19.82 0 0 0 4.9-1.58c.4-5.68-.68-10.82-3.97-15.68ZM9.68 15.33c-1.02 0-1.85-1-1.85-2.24 0-1.24.82-2.25 1.85-2.25 1.03 0 1.86 1.01 1.85 2.25 0 1.24-.82 2.24-1.85 2.24Zm4.64 0c-1.02 0-1.85-1-1.85-2.24 0-1.24.83-2.25 1.85-2.25 1.03 0 1.85 1.01 1.85 2.25s-.82 2.24-1.85 2.24Z"/></svg>
              Discord
            </a>
            <a className="soc soc--x" href="https://twitter.com/" target="_blank" rel="noopener noreferrer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2H21l-6.56 7.49L22 22h-6.59l-5.16-6.71L3.93 22H1.17l7.02-8.01L2 2h6.7l4.66 6.2L18.24 2Zm-2.31 18h2.2L8.17 4h-2.3l10.06 16Z"/></svg>
              Twitter / X
            </a>
            <a className="soc soc--yt" href="https://youtube.com/" target="_blank" rel="noopener noreferrer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2s-.23-1.62-.93-2.33c-.89-.93-1.89-.94-2.35-.99C16.98 2.5 12 2.5 12 2.5h-.01s-4.98 0-8.21.38c-.46.05-1.46.06-2.35.99C.73 4.58.5 6.2.5 6.2S.25 8.12.25 10.03v1.85c0 1.92.25 3.84.25 3.84s.23 1.62.93 2.33c.89.93 2.06.9 2.58 1 1.88.18 7.99.37 7.99.37s4.99-.01 8.22-.39c.46-.05 1.46-.06 2.35-.99.7-.71.93-2.33.93-2.33s.25-1.92.25-3.84v-1.85c0-1.91-.25-3.83-.25-3.83ZM9.75 13.5V7.75l6.25 2.88-6.25 2.87Z"/></svg>
              YouTube
            </a>
          </div>
        </div>
      </section>

      {/* ══════ CTA / AUTH ══════ */}
      <section className="sect sect--glass sect--last">
        <div className="wrap" style={{ textAlign: 'center' }}>
          {authed ? (
            <div className="anim">
              <h2 className="hdg hdg--center">Welcome back, <span className="accent">{user}</span></h2>
              <p className="txt txt--center">Ready to continue your lunar adventure?</p>
              <Link className="cta cta--lg" to="/rooms">Play Now &rarr;</Link>
            </div>
          ) : (
            <div className="anim">
              <span className="label label--center">Get Started</span>
              <h2 className="hdg hdg--center">Create your free account</h2>
              <p className="txt txt--center">Sign up in seconds and start exploring the Moon.</p>
              <InlineAuth />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
