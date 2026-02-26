// ConnectFour3D – Jetpack 3D attachment
// Loads the jetpack FBX, applies PBR textures.
// Uses the same bone-attachment + window tuner pattern as the rifle system.

import React, { useMemo, useRef, useEffect } from 'react';
import { useFBX } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ITEM_CATALOG, useInventoryStore } from './useInventoryStore';

const cat = ITEM_CATALOG.jetpack;
const ADD = THREE.AdditiveBlending;

/* ----------------------------------------------------------------
   findSpineBone — walk FBX skeleton for best upper-back bone
   ---------------------------------------------------------------- */
function findSpineBone(root) {
  if (!root) return null;
  let spine2 = null, spine1 = null, spine = null, chest = null, hips = null;
  root.traverse(o => {
    if (!o.isBone) return;
    const n = (o.name || '').toLowerCase();
    if (n.includes('spine2') && !spine2) spine2 = o;
    else if (n.includes('spine1') && !spine1) spine1 = o;
    else if ((n.includes('spine') || n.includes('chest')) && !spine) spine = o;
    else if (n.includes('hips') && !hips) hips = o;
  });
  return spine2 || spine1 || spine || chest || hips;
}

/* ---- Single thruster flame stack (rendered as JSX) ---- */
function ThrusterFlame({ coreRef, innerRef, midRef, outerRef, glowRef, lightRef }) {
  return (
    <group>
      {/* White-hot core — narrow, tallest */}
      <mesh ref={coreRef} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[2, 40, 12]} />
        <meshBasicMaterial color={[4, 4, 4]} transparent opacity={0} blending={ADD} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Blue inner */}
      <mesh ref={innerRef} rotation={[Math.PI, 0, 0]} position={[0, 4, 0]}>
        <coneGeometry args={[4, 32, 12]} />
        <meshBasicMaterial color={[0.3, 0.7, 3.5]} transparent opacity={0} blending={ADD} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Orange mid */}
      <mesh ref={midRef} rotation={[Math.PI, 0, 0]} position={[0, 6, 0]}>
        <coneGeometry args={[6, 25, 10]} />
        <meshBasicMaterial color={[3, 1.2, 0.1]} transparent opacity={0} blending={ADD} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Red outer glow — widest, shortest */}
      <mesh ref={outerRef} rotation={[Math.PI, 0, 0]} position={[0, 7, 0]}>
        <coneGeometry args={[8, 18, 10]} />
        <meshBasicMaterial color={[2, 0.3, 0.05]} transparent opacity={0} blending={ADD} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Glow sphere at nozzle mouth */}
      <mesh ref={glowRef} position={[0, 2, 0]}>
        <sphereGeometry args={[5, 8, 8]} />
        <meshBasicMaterial color={[1.5, 0.7, 0.2]} transparent opacity={0} blending={ADD} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Point light for scene illumination */}
      <pointLight ref={lightRef} color="#ff8833" intensity={0} distance={50} decay={2} />
    </group>
  );
}

/* ================================================================
   JetpackBoneAttachment
   ================================================================ */
export function JetpackBoneAttachment({ modelRef, isJetpacking = false, isRunning = false }) {
  const jetpackEquipped = useInventoryStore(s => s.hasEffect('enableJetpack'));
  const groupRef = useRef();
  const attachedRef = useRef(false);

  // Flame refs — left and right thruster, each with 4 layers + glow sphere + light
  const lCore = useRef(), lInner = useRef(), lMid = useRef(), lOuter = useRef(), lGlow = useRef(), lightL = useRef();
  const rCore = useRef(), rInner = useRef(), rMid = useRef(), rOuter = useRef(), rGlow = useRef(), lightR = useRef();
  const allFlameRefs = [lCore, lInner, lMid, lOuter, lGlow, rCore, rInner, rMid, rOuter, rGlow];
  const allLights = [lightL, lightR];
  const flameGroupL = useRef();
  const flameGroupR = useRef();

  // Smooth intensity lerp ref (0 = idle, 1 = flying, 2 = speed flying)
  const intensityRef = useRef(0);

  // Load jetpack FBX
  const fbx = useFBX(cat.modelUrl);

  // Clone so we don't corrupt the cached asset
  const jetpackScene = useMemo(() => {
    if (!fbx) return null;
    return fbx.clone(true);
  }, [fbx]);

  // Apply PBR textures once
  useEffect(() => {
    if (!jetpackScene) return;
    const loader = new THREE.TextureLoader();
    const diffuse   = loader.load(cat.textureUrl);
    const metallic  = loader.load(cat.metallicUrl);
    const normal    = loader.load(cat.normalUrl);
    const roughness = loader.load(cat.roughnessUrl);

    diffuse.colorSpace = THREE.SRGBColorSpace;
    metallic.colorSpace = THREE.LinearSRGBColorSpace;
    normal.colorSpace   = THREE.LinearSRGBColorSpace;
    roughness.colorSpace = THREE.LinearSRGBColorSpace;

    jetpackScene.traverse(child => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: diffuse,
          metalnessMap: metallic,
          normalMap: normal,
          roughnessMap: roughness,
          metalness: 1.0,
          roughness: 1.0,
          side: THREE.DoubleSide,
        });
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });
  }, [jetpackScene]);

  // Attach to spine bone (same pattern as rifle → rightHand)
  useEffect(() => {
    if (!groupRef.current || !modelRef) return;
    const bone = findSpineBone(modelRef);
    if (!bone) {
      console.warn('[Jetpack] No spine bone found on model');
      return;
    }
    try {
      bone.add(groupRef.current);
      attachedRef.current = true;
      console.log('[Jetpack] Attached to bone:', bone.name);
    } catch (e) { console.warn('[Jetpack] Attach failed:', e); }
    return () => {
      try {
        if (groupRef.current && groupRef.current.parent) {
          groupRef.current.parent.remove(groupRef.current);
        }
        attachedRef.current = false;
      } catch {}
    };
  }, [modelRef]);

  // Every frame: read tuner + animate flames with flight-mode intensity
  useFrame(() => {
    if (!groupRef.current) return;

    // Visibility
    groupRef.current.visible = jetpackEquipped;

    const tuner = window.__CF_JETPACK_TUNER__;
    const isDragging = !!window.__CF_JETPACK_DRAGGING__;

    if (tuner && !isDragging) {
      groupRef.current.position.set(tuner.pos[0], tuner.pos[1], tuner.pos[2]);
      groupRef.current.rotation.set(tuner.rot[0], tuner.rot[1], tuner.rot[2]);
      const sc = tuner.scale || 0.36;
      groupRef.current.scale.set(sc, sc, sc);
      groupRef.current.matrixAutoUpdate = true;
      if (tuner.forceVisible) groupRef.current.visible = true;
    }

    // Expose ref for gizmo
    window.__CF_MY_JETPACK_REF__ = groupRef.current;

    // Read flame position from tuner and move flame groups imperatively
    if (tuner) {
      const fp = tuner.flamePos || [0.5, -94, 51];
      const fs = tuner.flameSpread ?? 48;
      if (flameGroupL.current) flameGroupL.current.position.set(fp[0] - fs, fp[1], fp[2]);
      if (flameGroupR.current) flameGroupR.current.position.set(fp[0] + fs, fp[1], fp[2]);
    }

    // ── Flight mode: 0 = idle, 1 = flying, 2 = speed flying ──
    const forceFlames = !!(tuner && tuner.forceVisible);
    const flamesOn = isJetpacking || forceFlames;
    const speedFlying = isJetpacking && isRunning;

    // Target intensity: 0 idle, 1 flying, 2 speed fly
    const targetIntensity = speedFlying ? 2.0 : (flamesOn ? 1.0 : 0.0);
    intensityRef.current += (targetIntensity - intensityRef.current) * 0.08;
    const intensity = intensityRef.current;

    const target = flamesOn ? 1.0 : 0.0;
    const lerpSpeed = flamesOn ? 0.25 : 0.12;
    const t = performance.now() * 0.001;

    // ── Scale multiplier based on flight mode ──
    // idle (equipped but not flying) = 1.0x
    // flying = 1.8x
    // speed flying = 2.6x
    const scaleMul = 1.0 + intensity * 0.8;

    // ── Color shift factor: 0 = normal colors, 1 = full blue ──
    const blueShift = Math.max(0, Math.min(1, intensity - 1.0)); // only kicks in above 1.0

    // Default colors per layer: [r,g,b] — core, inner, mid, outer, glow
    const defaultColors = [
      [4, 4, 4],           // core — white hot
      [0.3, 0.7, 3.5],    // inner — blue
      [3, 1.2, 0.1],      // mid — orange
      [2, 0.3, 0.05],     // outer — red
      [1.5, 0.7, 0.2],    // glow — orange
    ];
    // Speed-fly colors (blue/cyan theme)
    const speedColors = [
      [3, 4, 8],           // core — blue-white
      [0.2, 0.8, 6.0],    // inner — intense blue
      [0.1, 0.6, 5.0],    // mid — bright blue
      [0.05, 0.3, 4.0],   // outer — deep blue
      [0.2, 0.5, 3.0],    // glow — blue
    ];

    // Max opacities per layer type: core, inner, mid, outer, glow (×2 for L and R)
    const baseOps = [0.95, 0.7, 0.5, 0.35, 0.4];
    // Boost opacity slightly during flight
    const opBoost = 1.0 + intensity * 0.15;

    allFlameRefs.forEach((r, i) => {
      if (!r.current) return;
      const mat = r.current.material;
      const layerIdx = i % 5;
      const flicker = 1.0 + Math.sin(t * 30 + i * 1.7) * 0.08 + Math.sin(t * 47 + i * 3.1) * 0.05;
      const goalOp = target * baseOps[layerIdx] * opBoost * flicker;
      mat.opacity += (goalOp - mat.opacity) * lerpSpeed;

      // Color shift toward blue during speed fly
      const dc = defaultColors[layerIdx];
      const sc = speedColors[layerIdx];
      const cr = dc[0] + (sc[0] - dc[0]) * blueShift;
      const cg = dc[1] + (sc[1] - dc[1]) * blueShift;
      const cb = dc[2] + (sc[2] - dc[2]) * blueShift;
      mat.color.setRGB(cr, cg, cb);
    });

    // Scale jitter while jetting — multiplied by flight-mode scaleMul
    if (flamesOn) {
      allFlameRefs.forEach((r, i) => {
        if (!r.current) return;
        if (i === 4 || i === 9) {
          // Glow spheres pulse
          const pulse = (1.0 + Math.sin(t * 20 + i * 4) * 0.25) * scaleMul;
          r.current.scale.setScalar(pulse);
        } else {
          const fy = (0.85 + Math.sin(t * 35 + i * 2.3) * 0.15 + Math.random() * 0.1) * scaleMul;
          const fxz = (0.9 + Math.sin(t * 25 + i * 1.9) * 0.1) * scaleMul;
          r.current.scale.set(fxz, fy, fxz);
        }
      });
    } else {
      allFlameRefs.forEach(r => {
        if (r.current) r.current.scale.set(1, 1, 1);
      });
    }

    // Point lights — brighter during speed fly, with blue tint
    allLights.forEach(r => {
      if (!r.current) return;
      const baseIntensity = 3.0 + intensity * 2.5;
      const goalI = flamesOn ? (baseIntensity + Math.sin(t * 30) * 0.8) : 0;
      r.current.intensity += (goalI - r.current.intensity) * lerpSpeed;
      // Shift light color: orange → blue during speed fly
      const lr = 1.0 - blueShift * 0.7;
      const lg = 0.53 + blueShift * 0.2;
      const lb = 0.2 + blueShift * 0.8;
      r.current.color.setRGB(lr, lg, lb);
    });
  });

  if (!jetpackScene) return null;

  const [ox, oy, oz] = cat.attachOffset;
  const [rx, ry, rz] = cat.attachRotation;

  return (
    <group ref={groupRef}
      position={[ox, oy, oz]}
      rotation={[rx, ry, rz]}
      scale={cat.attachScale}
    >
      <primitive object={jetpackScene} dispose={null} />

      {/* Left thruster */}
      <group ref={flameGroupL} position={[0.5 - 48, -94, 51]}>
        <ThrusterFlame coreRef={lCore} innerRef={lInner} midRef={lMid} outerRef={lOuter} glowRef={lGlow} lightRef={lightL} />
      </group>
      {/* Right thruster */}
      <group ref={flameGroupR} position={[0.5 + 48, -94, 51]}>
        <ThrusterFlame coreRef={rCore} innerRef={rInner} midRef={rMid} outerRef={rOuter} glowRef={rGlow} lightRef={lightR} />
      </group>
    </group>
  );
}
