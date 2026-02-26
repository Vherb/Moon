// ConnectFour3D – board-related components
// Extracted from ConnectFour3DView.jsx

import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLS, ROWS, CELL, GAP, BOARD_THICK } from './constants';
export class ModelErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(){ return { hasError: true }; }
  componentDidCatch(err, info){ /* no-op; could log */ }
  render(){
    return this.props.children;
  }
}

export function RoundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  const cr = Math.min(r, hw, hh);
  shape.moveTo(-hw + cr, -hh);
  shape.lineTo(hw - cr, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + cr);
  shape.lineTo(hw, hh - cr);
  shape.quadraticCurveTo(hw, hh, hw - cr, hh);
  shape.lineTo(-hw + cr, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - cr);
  shape.lineTo(-hw, -hh + cr);
  shape.quadraticCurveTo(-hw, -hh, -hw + cr, -hh);
  return shape;
}

export function FrontPlate() {
  // Classic Connect Four front plate with circular holes (extruded shape with holes)
  const w = COLS * (CELL + GAP) - GAP + 0.6;
  const h = ROWS * (CELL + GAP) - GAP + 0.6;
  const holeR = 0.46; // hole radius
  const depth = BOARD_THICK;
  const geom = useMemo(() => {
    // Base rounded rectangle frame
    const outer = RoundedRectShape(w, h, 0.28);
    // Carve the circular holes for each cell position
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const cx = (c - (COLS - 1) / 2) * (CELL + GAP);
        const cy = (r - (ROWS - 1) / 2) * (CELL + GAP);
        const path = new THREE.Path();
        path.absarc(cx, cy, holeR, 0, Math.PI * 2, false);
        outer.holes.push(path);
      }
    }
    const eg = new THREE.ExtrudeGeometry(outer, {
      depth: depth,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      bevelSegments: 2,
      curveSegments: 32,
      steps: 1,
    });
    eg.center();
    return eg;
  }, [w, h, depth, holeR]);
  return (
    <mesh geometry={geom} position={[0, 0, -BOARD_THICK * 0.6]} castShadow receiveShadow raycast={() => null}>
      {/* Classic blue board */}
      <meshStandardMaterial color={'#1e3a8a'} metalness={0.1} roughness={0.6} />
    </mesh>
  );
}


export function SideSupports() {
  // Inner grid width
  const w  = COLS * (CELL + GAP) - GAP;
  // Frame outer dims (must match FrontPlate)
  const fw = COLS * (CELL + GAP) - GAP + 0.6; // frame width
  const fh = ROWS * (CELL + GAP) - GAP + 0.6; // frame height

  // Table-mounted: triangular brackets at frame base + shallow tray beam
  const legWidth  = 1.05;                                      // bracket base width (x)
  const legHeight = Math.min(1.6, Math.max(1.1, fh * 0.55));   // bracket rise (y)
  const legDepth  = 1.6;                                       // bracket depth (z)

  const trayW = Math.max(fw - 0.2, w + 0.6);  // tray spans nearly the frame
  const trayH = 0.16;                          // tray height
  const trayD = 1.2;                           // tray depth

  // Y positions relative to board center (board bottom is ~ -fh/2)
  const baseY = -fh / 2;                      // frame base
  const trayY = baseY + trayH / 2 + 0.02;     // just above base

  const color = '#1e3a8a';

  // Right-triangle prism with bevels; centered in Z afterward
  const triGeom = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(legWidth, 0);
    shape.lineTo(0, legHeight);
    shape.lineTo(0, 0);
    const eg = new THREE.ExtrudeGeometry(shape, {
      depth: legDepth,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      curveSegments: 16,
      steps: 1,
    });
    // center on Z so zAttach places it correctly
    eg.translate(0, 0, -legDepth / 2);
    return eg;
  }, [legWidth, legHeight, legDepth]);

  const zAttach = -BOARD_THICK * 0.6; // align with FrontPlate plane

  return (
    <group>
      {/* Bottom tray beam connecting both sides (table-mounted) */}
      <mesh position={[0, trayY, zAttach]} castShadow receiveShadow>
        <boxGeometry args={[trayW, trayH, trayD]} />
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.6} />
      </mesh>
      {/* Triangular side brackets flushed to frame sides */}
      <mesh geometry={triGeom} position={[ fw / 2, baseY, zAttach]} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.6} />
      </mesh>
      <mesh geometry={triGeom} position={[-fw / 2, baseY, zAttach]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.6} />
      </mesh>
    </group>
  );
}

// Shadow catcher behind the frame so board-hole shadows have a surface

export function BackShadowCatcher({ opacity = 0.14 }){
  const innerW = COLS * (CELL + GAP) - GAP + 0.2;
  const innerH = ROWS * (CELL + GAP) - GAP + 0.2;
  const z = -BOARD_THICK - 0.35;
  return (
    <mesh position={[0, 0, z]} receiveShadow>
      <planeGeometry args={[innerW, innerH]} />
      <shadowMaterial transparent opacity={opacity * 0.8} />
    </mesh>
  );
}

// New: Load an asteroid prop (FBX) and place it somewhere on the ground

export function NeonRings({ innerR = 0.44, outerR = 0.49, speed = 0.12, amp = 0.08, base = 0.12, overlay = false }){
  const refsFront = useRef([]);
  const refsBack = useRef([]);
  const palette = useMemo(() => [
    '#22d3ee', // cyan
    '#7c3aed', // purple
    '#14b8a6', // teal
    '#60a5fa', // blue
    '#f472b6', // pink
  ], []);

  // Build positions for all holes
  const holes = useMemo(() => {
    const arr = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const x = (c - (COLS - 1) / 2) * (CELL + GAP);
        const y = (r - (ROWS - 1) / 2) * (CELL + GAP);
        const idx = r * COLS + c;
        const col = palette[c % palette.length];
        arr.push({ x, y, idx, col });
      }
    }
    return arr;
  }, [palette]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const TWOPI = Math.PI * 2;
    for (let i = 0; i < holes.length; i++) {
      const ph = (i / holes.length) * TWOPI; // phase spread
      const osc = base + amp * (0.5 + 0.5 * Math.sin(t * speed + ph));
      const mF = refsFront.current[i];
      const mB = refsBack.current[i];
      if (mF) mF.opacity = osc;
      if (mB) mB.opacity = osc;
    }
  });

  // Place LEDs just outside the board faces so they always sit in front of the board, but respect other geometry in front
  const zAttach = -BOARD_THICK * 0.6;
  const halfT = BOARD_THICK * 0.5;
  const eps = 0.01;
  const zFront = zAttach + halfT + eps;
  const zBack  = zAttach - halfT - eps;

  const depthTest = !overlay; // when overlay=true (board view), draw on top; otherwise respect depth so avatar occludes
  return (
    <>
      {holes.map((h, i) => (
        <mesh key={`rf-${i}`} position={[h.x, h.y, zFront]} frustumCulled={false} renderOrder={10}>
          <ringGeometry args={[innerR, outerR, 48]} />
          <meshBasicMaterial ref={(m)=>{ if(m) refsFront.current[i] = m; }} color={h.col} toneMapped={false} transparent opacity={base} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={depthTest} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={overlay ? -1 : -4} polygonOffsetUnits={overlay ? -1 : -4} />
        </mesh>
      ))}
      {holes.map((h, i) => (
        <mesh key={`rb-${i}`} position={[h.x, h.y, zBack]} frustumCulled={false} renderOrder={10}>
          <ringGeometry args={[innerR, outerR, 48]} />
          <meshBasicMaterial ref={(m)=>{ if(m) refsBack.current[i] = m; }} color={h.col} toneMapped={false} transparent opacity={base} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={depthTest} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={overlay ? -1 : -4} polygonOffsetUnits={overlay ? -1 : -4} />
        </mesh>
      ))}
    </>
  );
}

// Bright LED border around the frame with sweeping colors

export function NeonBorder({ thickness = 0.07, inset = 0.02, speed = 0.36, amp = 0.34, base = 0.22, colorRate = 0.04, overlay = false }){
  const matsFront = useRef([]);
  const matsBack = useRef([]);
  // Use a continuous HSL hue gradient for smoother blending
  const palette = useMemo(() => [
    '#22d3ee', '#60a5fa', '#7c3aed', '#f472b6', '#14b8a6'
  ], []);

  const fw = COLS * (CELL + GAP) - GAP + 0.6;
  const fh = ROWS * (CELL + GAP) - GAP + 0.6;
  const COUNT_H = 56; // higher density for smoother sweep
  const COUNT_V = 40; // higher density for smoother sweep
  const segW = (fw - inset * 2) / COUNT_H;
  const segH = (fh - inset * 2) / COUNT_V;

  const segments = useMemo(() => {
    const segs = [];
    // top edge (y = +fh/2 - inset)
    for (let i = 0; i < COUNT_H; i++) {
      const x = -fw / 2 + inset + segW * (i + 0.5);
      const y = fh / 2 - inset;
      segs.push({ x, y, w: segW, h: thickness, rot: 0 });
    }
    // bottom edge (y = -fh/2 + inset)
    for (let i = 0; i < COUNT_H; i++) {
      const x = -fw / 2 + inset + segW * (i + 0.5);
      const y = -fh / 2 + inset;
      segs.push({ x, y, w: segW, h: thickness, rot: 0 });
    }
    // left edge (x = -fw/2 + inset)
    for (let i = 0; i < COUNT_V; i++) {
      const x = -fw / 2 + inset;
      const y = -fh / 2 + inset + segH * (i + 0.5);
      segs.push({ x, y, w: thickness, h: segH, rot: 0 });
    }
    // right edge (x = +fw/2 - inset)
    for (let i = 0; i < COUNT_V; i++) {
      const x = fw / 2 - inset;
      const y = -fh / 2 + inset + segH * (i + 0.5);
      segs.push({ x, y, w: thickness, h: segH, rot: 0 });
    }
    return segs;
  }, [fw, fh, COUNT_H, COUNT_V, segW, segH, thickness, inset]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const K = segments.length;
    const TWOPI = Math.PI * 2;
    // Advance hue smoothly across the entire strip using a time-shifted gradient
    const hueBase = (t * colorRate) % 1; // 0..1
    for (let i = 0; i < K; i++) {
      const ph = (i / K) * TWOPI;
      // Ease opacity oscillation for smoother in/out
      const s = Math.sin(t * speed - ph);
      const eased = 0.5 - 0.5 * Math.cos((s * 0.5 + 0.5) * Math.PI);
      const osc = base + amp * eased;
      // Compute hue smoothly over segments
      const hue = (hueBase + i / K) % 1;
      const c = new THREE.Color().setHSL(0.58 + 0.6 * hue, 0.85, 0.55);
      const mF = matsFront.current[i];
      const mB = matsBack.current[i];
      if (mF) {
        mF.opacity = osc;
        mF.color && mF.color.set(c);
      }
      if (mB) {
        mB.opacity = osc;
        mB.color && mB.color.set(c);
      }
    }
  });

  const zAttach = -BOARD_THICK * 0.6;
  const halfT = BOARD_THICK * 0.5;
  const eps = 0.01;
  const zFront = zAttach + halfT + eps;
  const zBack  = zAttach - halfT - eps;

  const depthTest = !overlay; // when overlay=true (board view), draw on top; otherwise respect depth so avatar occludes
  return (
    <>
      {segments.map((s, i) => (
        <mesh key={`bf-${i}`} position={[s.x, s.y, zFront]} frustumCulled={false} renderOrder={9}>
          <boxGeometry args={[s.w, s.h, 0.02]} />
          <meshBasicMaterial ref={(m)=>{ if(m) matsFront.current[i] = m; }} color={'#22d3ee'} toneMapped={false} transparent opacity={base} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={depthTest} polygonOffset polygonOffsetFactor={overlay ? -1 : -4} polygonOffsetUnits={overlay ? -1 : -4} />
        </mesh>
      ))}
      {segments.map((s, i) => (
        <mesh key={`bb-${i}`} position={[s.x, s.y, zBack]} frustumCulled={false} renderOrder={9}>
          <boxGeometry args={[s.w, s.h, 0.02]} />
          <meshBasicMaterial ref={(m)=>{ if(m) matsBack.current[i] = m; }} color={'#22d3ee'} toneMapped={false} transparent opacity={base} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={depthTest} polygonOffset polygonOffsetFactor={overlay ? -1 : -4} polygonOffsetUnits={overlay ? -1 : -4} />
        </mesh>
      ))}
    </>
  );
}

// Plain FBX table below the board (new table model)

export function Piece({ color = '#e63946', c, r, flip180 = false }) {
  const ref = useRef();
  const x = (c - (COLS - 1) / 2) * (CELL + GAP);
  // Map logical board row (0=top, ROWS-1=bottom) to visual row index (0=bottom)
  const rv = (ROWS - 1 - r);
  // Direction-aware positions so pieces always fall from the top of the screen
  const dirY = flip180 ? -1 : 1;
  const targetY = dirY * ((rv - (ROWS - 1) / 2) * (CELL + GAP));
  const startY = dirY * (ROWS * (CELL + GAP) + 2);
  const vy = useRef(0);
  // Set initial position once on mount; avoid controlling position via props so animation isn't reset every render
  const didInit = useRef(false);
  useLayoutEffect(() => {
    if (ref.current && !didInit.current) {
      ref.current.position.set(x, startY, -0.1);
      didInit.current = true;
    }
  }, [x, startY]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    // Move toward target from above, respecting orientation
    if ((dirY > 0 && ref.current.position.y > targetY) || (dirY < 0 && ref.current.position.y < targetY)) {
      vy.current = Math.min(vy.current + 20 * dt, 12);
      if (dirY > 0) {
        ref.current.position.y = Math.max(targetY, ref.current.position.y - vy.current * dt);
      } else {
        ref.current.position.y = Math.min(targetY, ref.current.position.y + vy.current * dt);
      }
    }
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.46, 0.46, 0.18, 40]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.45} emissive={color} emissiveIntensity={0.22} />
    </mesh>
  );
}

// Keyboard movement wrapper for the local player's avatar