// ConnectFour3D – staircase, platform, and prop components
// Extracted from ConnectFour3DView.jsx

import React, { useMemo, useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useTexture, RoundedBox, Text } from '@react-three/drei';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import {
  COLS, ROWS, CELL, GAP, GROUND_CLEAR,
  STAIR2_POS_X, STAIR2_POS_Z, STAIR2_WIDTH, STAIR2_RUN, STAIR2_RISE, STAIR2_STEPS,
  STAIR2_PLATFORM_DEPTH, STAIR2_PLATFORM_WIDTH, STAIR2_PLATFORM_THICKNESS,
  STAIR3_POS_X, STAIR3_POS_Z, STAIR3_BASE_Y, STAIR3_WIDTH, STAIR3_RUN, STAIR3_RISE, STAIR3_STEPS,
  STAIR3_YAW, STAIR3_PLATFORM_DEPTH, STAIR3_PLATFORM_WIDTH, STAIR3_PLATFORM_THICKNESS,
} from './constants';
import { buildStairAABBsWorld } from './terrainPhysics';

export function RocketPedestal({ position = [0, 0, 0], scale = 0.15, onLaunchClick = null, rocketPositionRef = null, onFollowRocket = null, showCollisionMeshes = false }) {
  const src = useFBX('/models/props/rocket/rocket_pedestal.fbx');
  const [mountKey, setMountKey] = useState(0);
  const model = useMemo(() => {
    if (!src) return null;
    const cloned = skeletonClone(src);
    if (cloned) {
      cloned.scale.set(1, 1, 1);
      cloned.position.set(0, 0, 0);
      cloned.rotation.set(0, 0, 0);
    }
    return cloned;
  }, [src, mountKey]);
  const [yOffset, setYOffset] = useState(0);
  const rocketPosRef = useRef(new THREE.Vector3(...position));
  const rocketVelRef = useRef(new THREE.Vector3(0, 0, 0));
  const launchTimeRef = useRef(null);
  const [hasLaunched, setHasLaunched] = useState(false);
  const [launchRequested, setLaunchRequested] = useState(false);
  const groupRef = useRef();
  const handleLaunch = useCallback(() => {
    if (!launchRequested && !hasLaunched) {
      setLaunchRequested(true);
      launchTimeRef.current = Date.now() + 1000;
      if (onLaunchClick) onLaunchClick();
      if (onFollowRocket) onFollowRocket(true);
    }
  }, [launchRequested, hasLaunched, onLaunchClick, onFollowRocket]);
  const EARTH_POS = new THREE.Vector3(-4000, 2000, 3000);
  const smokeParticlesRef = useRef([]);
  const smokeGeometryRef = useRef();
  const smokeMaterialRef = useRef();
  useEffect(() => {
    const particleCount = 50;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({ x: 0, y: 0, z: 0, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 8 + 4, vz: (Math.random() - 0.5) * 2, life: Math.random(), maxLife: 1.0 + Math.random() * 0.5, size: 2 + Math.random() * 3 });
    }
    smokeParticlesRef.current = particles;
  }, []);
  useFrame((_, delta) => {
    const now = Date.now();
    if (groupRef.current && launchTimeRef.current && now > launchTimeRef.current) {
      if (!hasLaunched) setHasLaunched(true);
      const timeSinceLaunch = (now - launchTimeRef.current) / 1000;
      const VERTICAL_PHASE_DURATION = 3.0;
      const TURN_PHASE_DURATION = 4.0;
      const TURN_START_TIME = VERTICAL_PHASE_DURATION;
      const TURN_END_TIME = TURN_START_TIME + TURN_PHASE_DURATION;
      let targetDirection;
      if (timeSinceLaunch < VERTICAL_PHASE_DURATION) {
        targetDirection = new THREE.Vector3(0, 1, 0);
      } else if (timeSinceLaunch < TURN_END_TIME) {
        const turnProgress = (timeSinceLaunch - TURN_START_TIME) / TURN_PHASE_DURATION;
        const easedProgress = turnProgress * turnProgress * (3 - 2 * turnProgress);
        const upDirection = new THREE.Vector3(0, 1, 0);
        const earthDirection = new THREE.Vector3().subVectors(EARTH_POS, rocketPosRef.current).normalize();
        targetDirection = new THREE.Vector3().lerpVectors(upDirection, earthDirection, easedProgress).normalize();
      } else {
        targetDirection = new THREE.Vector3().subVectors(EARTH_POS, rocketPosRef.current).normalize();
      }
      const THRUST = 25.0;
      rocketVelRef.current.add(targetDirection.multiplyScalar(THRUST * delta));
      const MAX_SPEED = 120;
      if (rocketVelRef.current.length() > MAX_SPEED) rocketVelRef.current.normalize().multiplyScalar(MAX_SPEED);
      rocketPosRef.current.add(rocketVelRef.current.clone().multiplyScalar(delta));
      groupRef.current.position.copy(rocketPosRef.current);
      const flyDirection = rocketVelRef.current.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion();
      const axis = new THREE.Vector3().crossVectors(up, flyDirection).normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(flyDirection))));
      if (axis.length() > 0.001) { quaternion.setFromAxisAngle(axis, angle); groupRef.current.quaternion.copy(quaternion); }
      if (rocketPositionRef) rocketPositionRef.current = rocketPosRef.current.clone();
      const distanceToEarth = rocketPosRef.current.distanceTo(EARTH_POS);
      if (distanceToEarth < 500 && onFollowRocket) onFollowRocket(false);
    }
    const particles = smokeParticlesRef.current;
    if (!particles.length || !smokeGeometryRef.current) return;
    const positions = smokeGeometryRef.current.attributes.position.array;
    const sizes = smokeGeometryRef.current.attributes.size.array;
    const opacities = smokeGeometryRef.current.attributes.opacity.array;
    particles.forEach((p, i) => {
      p.life += delta;
      if (p.life > p.maxLife) {
        p.x = (Math.random() - 0.5) * 3; p.y = 0; p.z = (Math.random() - 0.5) * 3;
        p.vx = (Math.random() - 0.5) * 2; p.vy = Math.random() * 8 + 4; p.vz = (Math.random() - 0.5) * 2;
        p.life = 0; p.maxLife = 1.0 + Math.random() * 0.5; p.size = 2 + Math.random() * 3;
      }
      p.x += p.vx * delta; p.y += p.vy * delta; p.z += p.vz * delta;
      p.vx *= 1.01; p.vz *= 1.01;
      const i3 = i * 3;
      positions[i3] = p.x; positions[i3 + 1] = p.y; positions[i3 + 2] = p.z;
      const lifeRatio = p.life / p.maxLife;
      sizes[i] = p.size * (1 + lifeRatio * 2);
      opacities[i] = Math.max(0, 1 - lifeRatio);
    });
    smokeGeometryRef.current.attributes.position.needsUpdate = true;
    smokeGeometryRef.current.attributes.size.needsUpdate = true;
    smokeGeometryRef.current.attributes.opacity.needsUpdate = true;
  });
  useLayoutEffect(() => {
    if (!model) return;
    try {
      model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); model.scale.set(1, 1, 1);
      model.scale.set(scale, scale, scale);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const minY = box.min.y;
      model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      if (isFinite(minY)) setYOffset(-minY);
    } catch (e) { console.error('[RocketPedestal] Error:', e); }
  }, [model, scale]);
  useEffect(() => {
    const reloadCount = window.__CF_HOT_RELOAD_COUNT__ || 0;
    if (reloadCount > 0) setMountKey(reloadCount);
  }, []);
  if (!model) return null;
  const particleCount = 50;
  const posArr = new Float32Array(particleCount * 3);
  const sizeArr = new Float32Array(particleCount);
  const opacityArr = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) { posArr[i*3]=0; posArr[i*3+1]=0; posArr[i*3+2]=0; sizeArr[i]=2; opacityArr[i]=1; }
  return (
    <group ref={groupRef} position={position}>
      <primitive object={model} />
      <points position={[0, -5, 0]}>
        <bufferGeometry ref={smokeGeometryRef}>
          <bufferAttribute attach="attributes-position" count={particleCount} array={posArr} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={particleCount} array={sizeArr} itemSize={1} />
          <bufferAttribute attach="attributes-opacity" count={particleCount} array={opacityArr} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial ref={smokeMaterialRef} size={3} color="#e0e0e0" transparent={true} opacity={0.6} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} vertexColors={false} />
      </points>
      {!hasLaunched && !launchRequested && (
        <group position={[35, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh onClick={handleLaunch} onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }} onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'default'; }}>
            <planeGeometry args={[12, 5]} />
            <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.8} metalness={0.2} roughness={0.3} />
          </mesh>
          <Text position={[0, 0, 0.1]} fontSize={2.2} color="white" anchorX="center" anchorY="middle" fontWeight="bold">LAUNCH</Text>
        </group>
      )}
    </group>
  );
}

export const ExtraStairsFBX = React.forwardRef(function ExtraStairsFBX({ offset = [10, 0, 0], yaw = 0, alignToStair2 = false, side = 'right', gap = 1.2, scaleMul = 0.08, scaleMulX = null, scaleMulY = null, scaleMulZ = null, posX = null, posZ = null, posY = 0, onDefChange = null }, ref){
  const src = useFBX('/models/props/stairs/stairs.fbx');
  const model = useMemo(() => (src ? skeletonClone(src) : null), [src]);
  // Compute ground Y
  const fh = ROWS * (CELL + GAP) - GAP + 0.6;
  const groundY = -fh / 2 - GROUND_CLEAR;
  const [worldWidth, setWorldWidth] = useState(null);
  const [worldDepth, setWorldDepth] = useState(null);
  const [worldHeight, setWorldHeight] = useState(null);
  useLayoutEffect(() => {
    if (!model) return;
    try {
      const box = new THREE.Box3().setFromObject(model);
      const minY = box.min.y;
      const widthModel = Math.max(0.001, (box.max.x - box.min.x));
      const depthModel = Math.max(0.001, (box.max.z - box.min.z));
      const heightModel = Math.max(0.001, (box.max.y - box.min.y));
      // enable shadows
      model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      // ground to local y=0
      if (isFinite(minY)) model.position.y += -minY;
      // effective per-axis scales (fallback to uniform if not provided)
      const sx = Number.isFinite(scaleMulX) ? scaleMulX : scaleMul;
      const sy = Number.isFinite(scaleMulY) ? scaleMulY : scaleMul;
      const sz = Number.isFinite(scaleMulZ) ? scaleMulZ : scaleMul;
      // publish scaled world dims
      setWorldWidth(widthModel * sx);
      setWorldDepth(depthModel * sz);
      setWorldHeight(heightModel * sy);
    } catch {}
  }, [model, scaleMul, scaleMulX, scaleMulY, scaleMulZ]);

  // Default position: relative offset from Stair2
  let x = STAIR2_POS_X + offset[0];
  let z = STAIR2_POS_Z + offset[2];
  if (alignToStair2) {
    const sign = side === 'left' ? -1 : 1;
    const propHalfW = (worldWidth != null ? worldWidth / 2 : 2);
    x = STAIR2_POS_X + sign * (STAIR2_WIDTH / 2 + gap + propHalfW);
    z = STAIR2_POS_Z; // align bases at same Z origin as big stairs
  }
  // Manual overrides when not aligning
  if (!alignToStair2) {
    if (posX != null) x = posX;
    if (posZ != null) z = posZ;
  }

  // Publish dynamic stair def (for collision/ground sampling) whenever bounds/placement change
  useEffect(() => {
    if (!onDefChange) return;
    if (worldWidth == null || worldDepth == null || worldHeight == null) return;
    // Guess steps by height and compute run/rise accordingly
    const stepsGuess = Math.max(6, Math.min(22, Math.round(worldHeight / 1.6))); // fewer, broader steps
    const rise = worldHeight / stepsGuess;
    const run = worldDepth / stepsGuess;
    onDefChange({ posX: x, posZ: z, posY, yaw, width: worldWidth, depth: worldDepth, height: worldHeight, steps: stepsGuess, run, rise });
  }, [onDefChange, worldWidth, worldDepth, worldHeight, x, z, yaw, posY]);

  if (!model) return null;
  const rsx = Number.isFinite(scaleMulX) ? scaleMulX : scaleMul;
  const rsy = Number.isFinite(scaleMulY) ? scaleMulY : scaleMul;
  const rsz = Number.isFinite(scaleMulZ) ? scaleMulZ : scaleMul;
  return (
    <group ref={ref} position={[x, groundY + posY, z]} rotation={[0, yaw, 0]} scale={[rsx, rsy, rsz]}>
      <primitive object={model} />
    </group>
  );
});

// Neon LED rings around each hole with slow pulsing and darker neon colors

export function Staircase({ rocketPositionRef = null, setFollowRocket = null, showCollisionMeshes = false }) {
  // Build visible, textured stepped structures for both staircases and a flat platform on Stair 2
  const fh = ROWS * (CELL + GAP) - GAP + 0.6;
  const groundY = -fh / 2 - GROUND_CLEAR;

  // Load separate textures: stairs vs upper platform (floor)
  const stairsTex = useTexture('/textures/metal_stairs.png');
  const floorTex  = useTexture('/textures/metal_floor.png');
  useEffect(() => {
    if (stairsTex) {
      // No tiling: clamp edges and keep 1x1 mapping
      stairsTex.wrapS = stairsTex.wrapT = THREE.ClampToEdgeWrapping;
      stairsTex.anisotropy = 8;
      stairsTex.repeat.set(1, 1);
      stairsTex.needsUpdate = true;
    }
  }, [stairsTex]);
  useEffect(() => {
    if (floorTex) {
      floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
      floorTex.anisotropy = 8;
      // Tile less aggressively for broad platform surface
      floorTex.repeat.set(1.5, 1.5);
      floorTex.needsUpdate = true;
    }
  }, [floorTex]);

  const stairMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#dfe4ea',
    metalness: 0.35,
    roughness: 0.6,
    map: stairsTex || null,
  }), [stairsTex]);

  const platformMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.25,
    roughness: 0.7,
    map: floorTex || null,
  }), [floorTex]);

  const makeStairs = (keyPrefix, posX, posZ, width, run, rise, steps) => {
    const list = [];
    for (let i = 0; i < steps; i++) {
      const y = i * rise;
      const zStart = posZ + i * run;
      const zCenter = zStart + run / 2;
      // Rounded step block
      list.push(
        <group key={`${keyPrefix}-${i}`}>
          <RoundedBox args={[width, rise, run]} radius={0.18} smoothness={4} position={[posX, groundY + y + rise/2, zCenter]} castShadow receiveShadow>
            <primitive attach="material" object={stairMat} />
          </RoundedBox>
          {/* Bullnose lip at the front edge of each step */}
          <RoundedBox args={[width, 0.26, 0.22]} radius={0.08} smoothness={4} position={[posX, groundY + y + rise - 0.13, zStart + run - 0.11]} castShadow receiveShadow>
            <primitive attach="material" object={stairMat} />
          </RoundedBox>
          {/* Anti-slip grooves: three thin strips near the front */}
          {Array.from({length:3}).map((_,gi)=>{
            const off = 0.22 + gi*0.16;
            return (
              <mesh key={`groove-${i}-${gi}`} position={[posX, groundY + y + rise - 0.18, zStart + run - off]} castShadow receiveShadow>
                <boxGeometry args={[width, 0.04, 0.02]} />
                <primitive attach="material" object={stairMat} />
              </mesh>
            );
          })}
        </group>
      );
    }
    return list;
  };

  // Render only stairs2 (stairs1 completely removed)
  const stairs2 = makeStairs('st2', STAIR2_POS_X, STAIR2_POS_Z, STAIR2_WIDTH, STAIR2_RUN, STAIR2_RISE, STAIR2_STEPS);
  
  // Third staircase - rotated 90Â° clockwise, positioned on top of STAIR2 platform
  const makeStairs3Rotated = (keyPrefix, posX, posZ, width, run, rise, steps, baseY) => {
    const list = [];
    for (let i = 0; i < steps; i++) {
      const y = baseY + i * rise;
      const xEnd = posX - i * run; // going in -X direction
      const xCenter = xEnd - run / 2;
      list.push(
        <group key={`${keyPrefix}-${i}`}>
          {/* Main step block - rotated: width becomes depth (Z), run becomes width (X) */}
          <RoundedBox args={[run, rise, width]} radius={0.18} smoothness={4} position={[xCenter, groundY + y + rise/2, posZ]} castShadow receiveShadow>
            <primitive attach="material" object={stairMat} />
          </RoundedBox>
          {/* Bullnose lip at the front edge - rotated 90Â° */}
          <RoundedBox args={[0.22, 0.26, width]} radius={0.08} smoothness={4} position={[xEnd - run + 0.11, groundY + y + rise - 0.13, posZ]} castShadow receiveShadow>
            <primitive attach="material" object={stairMat} />
          </RoundedBox>
          {/* Anti-slip grooves: three thin strips near the front */}
          {Array.from({length:3}).map((_,gi)=>{
            const off = 0.22 + gi*0.16;
            return (
              <mesh key={`groove-${i}-${gi}`} position={[xEnd - run + off, groundY + y + rise - 0.18, posZ]} castShadow receiveShadow>
                <boxGeometry args={[0.02, 0.04, width]} />
                <primitive attach="material" object={stairMat} />
              </mesh>
            );
          })}
        </group>
      );
    }
    return list;
  };
  const stairs3 = makeStairs3Rotated('st3', STAIR3_POS_X, STAIR3_POS_Z, STAIR3_WIDTH, STAIR3_RUN, STAIR3_RISE, STAIR3_STEPS, STAIR3_BASE_Y);

  // Visible top platform for Stair 2 (flat at top height, same width, depth = STAIR2_PLATFORM_DEPTH)
  const stair2TopY = groundY + STAIR2_STEPS * STAIR2_RISE;
  const stair2TopZ = STAIR2_POS_Z + STAIR2_STEPS * STAIR2_RUN;
  const platDepth = STAIR2_PLATFORM_DEPTH;
  const platCenterZ = stair2TopZ + platDepth / 2;
  const platWidth = STAIR2_PLATFORM_WIDTH;
  const platThickness = 1.5; // requested solid thickness
  const eps = 0.001; // slight offset to avoid z-fighting with step tops

  // Platform for Stair 3 (rotated 90Â° - goes in -X direction)
  const stair3TopY = groundY + STAIR3_BASE_Y + STAIR3_STEPS * STAIR3_RISE;
  const stair3TopX = STAIR3_POS_X - STAIR3_STEPS * STAIR3_RUN; // ends in -X direction
  const plat3Depth = STAIR3_PLATFORM_DEPTH;
  const plat3CenterX = stair3TopX - plat3Depth / 2; // platform extends further in -X
  const plat3Width = STAIR3_PLATFORM_WIDTH;
  const plat3Thickness = 1.5;

  // Solid guard rails for the long stairs (stair 2): spaced vertical posts + sloped top/mid rails
  const POST_EVERY = 2;              // post on every Nth step
  const postW = 0.32, postD = 0.32;  // post thickness
  const postH = 6.5;                 // Visual rail height (collision boxes still 16.0)
  const topRailThick = 0.28;
  const midRailThick = 0.22;
  const midRailFrac = 0.5;           // mid-rail halfway up the posts
  const railInset = 1.5;             // Inset from edge (was 0.45)
  const leftRailX = STAIR2_POS_X - STAIR2_WIDTH/2 + railInset;
  const rightRailX = STAIR2_POS_X + STAIR2_WIDTH/2 - railInset;
  const z0 = STAIR2_POS_Z + STAIR2_RUN*0.5;               // near center of first step
  const z1 = stair2TopZ - STAIR2_RUN*0.5;                 // near center of last step
  const y0 = groundY + STAIR2_RISE + postH;               // top of first post (on step 1)
  const y1 = stair2TopY + postH;                          // top of last post
  const dz = z1 - z0; const dy = y1 - y0;
  const railLen = Math.sqrt(dz*dz + dy*dy);
  const railPitch = -Math.atan2(dy, dz); // rotate around X (negative to tilt up along +Z)
  const railMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9ca3af', metalness: 0.7, roughness: 0.35 }), []);

  // Build posts along stairs
  const buildPosts = (x) => {
    const items = [];
    for (let i = 0; i < STAIR2_STEPS; i += POST_EVERY) {
      const y = groundY + (i+1) * STAIR2_RISE; // top surface of step i
      const zStart = STAIR2_POS_Z + i * STAIR2_RUN;
      const zCenter = zStart + STAIR2_RUN * 0.5;
      items.push(
        <mesh key={`post-${x}-${i}`} position={[x, y + postH/2, zCenter]} castShadow receiveShadow>
          <boxGeometry args={[postW, postH, postD]} />
          <primitive attach="material" object={railMat} />
        </mesh>
      );
    }
    // Ensure posts also at very bottom and very top
    items.push(
      <mesh key={`post-${x}-bottom`} position={[x, groundY + STAIR2_RISE + postH/2, z0]} castShadow receiveShadow>
        <boxGeometry args={[postW, postH, postD]} />
        <primitive attach="material" object={railMat} />
      </mesh>
    );
    items.push(
      <mesh key={`post-${x}-top`} position={[x, stair2TopY + postH/2, z1]} castShadow receiveShadow>
        <boxGeometry args={[postW, postH, postD]} />
        <primitive attach="material" object={railMat} />
      </mesh>
    );
    return items;
  };

  // Rail bars helper (sloped along stairs)
  const RailBar = ({ x, yStart, zStart, yEnd, zEnd, thick }) => {
    const dzL = zEnd - zStart; const dyL = yEnd - yStart;
    const len = Math.sqrt(dzL*dzL + dyL*dyL);
    const pitch = -Math.atan2(dyL, dzL);
    const midZ = (zStart + zEnd) / 2;
    const midY = (yStart + yEnd) / 2;
    return (
      <mesh position={[x, midY, midZ]} rotation={[pitch, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[thick, thick, len]} />
        <primitive attach="material" object={railMat} />
      </mesh>
    );
  };

  // STAIR3 guard rails (rotated - goes in -X direction)
  const leftRail3Z = STAIR3_POS_Z - STAIR3_WIDTH/2 + railInset;
  const rightRail3Z = STAIR3_POS_Z + STAIR3_WIDTH/2 - railInset;
  const x0_3 = STAIR3_POS_X - STAIR3_RUN*0.5;               // near center of first step
  const x1_3 = stair3TopX + STAIR3_RUN*0.5;                 // near center of last step
  const y0_3 = groundY + STAIR3_BASE_Y + STAIR3_RISE + postH;     // top of first post
  const y1_3 = stair3TopY + postH;                          // top of last post

  // Build posts for STAIR3 (rotated)
  const buildPosts3 = (z) => {
    const items = [];
    for (let i = 0; i < STAIR3_STEPS; i += POST_EVERY) {
      const y = groundY + STAIR3_BASE_Y + (i + 1) * STAIR3_RISE;
      const xCenter = STAIR3_POS_X - i * STAIR3_RUN - STAIR3_RUN * 0.5;
      items.push(
        <mesh key={`post3-${z}-${i}`} position={[xCenter, y + postH/2, z]} castShadow receiveShadow>
          <boxGeometry args={[postD, postH, postW]} />
          <primitive attach="material" object={railMat} />
        </mesh>
      );
    }
    // Bottom and top posts
    items.push(
      <mesh key={`post3-${z}-bottom`} position={[x0_3, groundY + STAIR3_BASE_Y + STAIR3_RISE + postH/2, z]} castShadow receiveShadow>
        <boxGeometry args={[postD, postH, postW]} />
        <primitive attach="material" object={railMat} />
      </mesh>
    );
    items.push(
      <mesh key={`post3-${z}-top`} position={[x1_3, stair3TopY + postH/2, z]} castShadow receiveShadow>
        <boxGeometry args={[postD, postH, postW]} />
        <primitive attach="material" object={railMat} />
      </mesh>
    );
    return items;
  };

  // Rail bars for STAIR3 (rotated - goes along X axis)
  const RailBar3 = ({ z, yStart, xStart, yEnd, xEnd, thick }) => {
    const dxL = xEnd - xStart; const dyL = yEnd - yStart;
    const len = Math.sqrt(dxL*dxL + dyL*dyL);
    const pitch = Math.atan2(dyL, -dxL); // negative because going in -X direction
    const midX = (xStart + xEnd) / 2;
    const midY = (yStart + yEnd) / 2;
    return (
      <mesh position={[midX, midY, z]} rotation={[0, pitch, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, thick, thick]} />
        <primitive attach="material" object={railMat} />
      </mesh>
    );
  };

  return (
    <group>
      {/* stairs1 removed - keeping only stairs2 */}
      {stairs2}
      {/* Side stringers along stair 2 for a more engineered look */}
      <mesh position={[STAIR2_POS_X - STAIR2_WIDTH/2 - 0.25, groundY + STAIR2_RISE*STAIR2_STEPS/2, stair2TopZ - (STAIR2_STEPS * STAIR2_RUN)/2]} rotation={[ -Math.atan2(STAIR2_RISE*STAIR2_STEPS, STAIR2_RUN*STAIR2_STEPS), 0, 0 ]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1.0, STAIR2_STEPS * STAIR2_RUN + 0.0001]} />
        <primitive attach="material" object={stairMat} />
      </mesh>
      <mesh position={[STAIR2_POS_X + STAIR2_WIDTH/2 + 0.25, groundY + STAIR2_RISE*STAIR2_STEPS/2, stair2TopZ - (STAIR2_STEPS * STAIR2_RUN)/2]} rotation={[ -Math.atan2(STAIR2_RISE*STAIR2_STEPS, STAIR2_RUN*STAIR2_STEPS), 0, 0 ]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1.0, STAIR2_STEPS * STAIR2_RUN + 0.0001]} />
        <primitive attach="material" object={stairMat} />
      </mesh>
      {/* Guard rails: posts */}
      {buildPosts(leftRailX)}
      {buildPosts(rightRailX)}
      {/* Top rails (sloped) */}
      <RailBar x={leftRailX}  yStart={y0} zStart={z0} yEnd={y1} zEnd={z1} thick={topRailThick} />
      <RailBar x={rightRailX} yStart={y0} zStart={z0} yEnd={y1} zEnd={z1} thick={topRailThick} />
      {/* Mid rails (sloped halfway up posts) */}
      <RailBar x={leftRailX}  yStart={y0 - postH*(1.0-midRailFrac)} zStart={z0} yEnd={y1 - postH*(1.0-midRailFrac)} zEnd={z1} thick={midRailThick} />
      <RailBar x={rightRailX} yStart={y0 - postH*(1.0-midRailFrac)} zStart={z0} yEnd={y1 - postH*(1.0-midRailFrac)} zEnd={z1} thick={midRailThick} />
      {/* Platform floor as a box with metal texture */}
      {platDepth > 0 && (
        <mesh position={[STAIR2_POS_X, stair2TopY - platThickness/2 + eps, platCenterZ]} castShadow receiveShadow>
          <boxGeometry args={[platWidth, platThickness, platDepth]} />
          <primitive attach="material" object={platformMat} />
        </mesh>
      )}
      {/* Platform edge railings with posts and bars */}
      {(() => {
        const postW = 0.18, postH = 7.0, postD = 0.18; // Much taller posts (half character height)
        const topBarH = 0.12, topBarW = 0.12;
        const midBarH = 0.10, midBarW = 0.10;
        const midRailFrac = 0.5;
        const postSpacing = 1.5; // spacing between posts
        const xMin = STAIR2_POS_X - platWidth/2;
        const xMax = STAIR2_POS_X + platWidth/2;
        const zMin = stair2TopZ;
        const zMax = stair2TopZ + platDepth;
        const baseY = stair2TopY;
        
        const posts = [];
        const bars = [];
        
        // Back edge (along X axis)
        const backPostCount = Math.ceil(platWidth / postSpacing) + 1;
        for (let i = 0; i < backPostCount; i++) {
          const t = i / (backPostCount - 1);
          const px = xMin + t * platWidth;
          posts.push(
            <mesh key={`back-post-${i}`} position={[px, baseY + postH/2, zMax]} castShadow receiveShadow>
              <boxGeometry args={[postW, postH, postD]} />
              <primitive attach="material" object={railMat} />
            </mesh>
          );
        }
        // Top bar back
        bars.push(
          <mesh key="back-top" position={[STAIR2_POS_X, baseY + postH, zMax]} castShadow receiveShadow>
            <boxGeometry args={[platWidth, topBarH, topBarW]} />
            <primitive attach="material" object={railMat} />
          </mesh>
        );
        // Mid bar back
        bars.push(
          <mesh key="back-mid" position={[STAIR2_POS_X, baseY + postH * midRailFrac, zMax]} castShadow receiveShadow>
            <boxGeometry args={[platWidth, midBarH, midBarW]} />
            <primitive attach="material" object={railMat} />
          </mesh>
        );
        
        // Left edge (along Z axis)
        const leftPostCount = Math.ceil(platDepth / postSpacing) + 1;
        for (let i = 0; i < leftPostCount; i++) {
          const t = i / (leftPostCount - 1);
          const pz = zMin + t * platDepth;
          posts.push(
            <mesh key={`left-post-${i}`} position={[xMin, baseY + postH/2, pz]} castShadow receiveShadow>
              <boxGeometry args={[postW, postH, postD]} />
              <primitive attach="material" object={railMat} />
            </mesh>
          );
        }
        // Top bar left
        bars.push(
          <mesh key="left-top" position={[xMin, baseY + postH, (zMin + zMax)/2]} castShadow receiveShadow>
            <boxGeometry args={[topBarW, topBarH, platDepth]} />
            <primitive attach="material" object={railMat} />
          </mesh>
        );
        // Mid bar left
        bars.push(
          <mesh key="left-mid" position={[xMin, baseY + postH * midRailFrac, (zMin + zMax)/2]} castShadow receiveShadow>
            <boxGeometry args={[midBarW, midBarH, platDepth]} />
            <primitive attach="material" object={railMat} />
          </mesh>
        );
        
        // Right edge (along Z axis)
        const rightPostCount = Math.ceil(platDepth / postSpacing) + 1;
        for (let i = 0; i < rightPostCount; i++) {
          const t = i / (rightPostCount - 1);
          const pz = zMin + t * platDepth;
          posts.push(
            <mesh key={`right-post-${i}`} position={[xMax, baseY + postH/2, pz]} castShadow receiveShadow>
              <boxGeometry args={[postW, postH, postD]} />
              <primitive attach="material" object={railMat} />
            </mesh>
          );
        }
        // Top bar right
        bars.push(
          <mesh key="right-top" position={[xMax, baseY + postH, (zMin + zMax)/2]} castShadow receiveShadow>
            <boxGeometry args={[topBarW, topBarH, platDepth]} />
            <primitive attach="material" object={railMat} />
          </mesh>
        );
        // Mid bar right
        bars.push(
          <mesh key="right-mid" position={[xMax, baseY + postH * midRailFrac, (zMin + zMax)/2]} castShadow receiveShadow>
            <boxGeometry args={[midBarW, midBarH, platDepth]} />
            <primitive attach="material" object={railMat} />
          </mesh>
        );
        
        return <>{posts}{bars}</>;
      })()}
      {/* Rocket Pedestal on the platform */}
      <RocketPedestal 
        position={[STAIR2_POS_X, stair2TopY + platThickness/2, platCenterZ]} 
        scale={0.6}
        onLaunchClick={() => console.log('Rocket launch initiated!')}
        rocketPositionRef={rocketPositionRef}
        onFollowRocket={setFollowRocket}
        showCollisionMeshes={showCollisionMeshes}
      />

      {/* Third staircase and platform - all wrapped in a rotated group */}
      <group position={[STAIR3_POS_X, 0, STAIR3_POS_Z]} rotation={[0, -Math.PI/2, 0]}>
        {/* Render stairs relative to groundY + STAIR3_BASE_Y */}
        {Array.from({length: STAIR3_STEPS}).map((_, i) => {
          const y = groundY + STAIR3_BASE_Y + i * STAIR3_RISE;
          const zStart = i * STAIR3_RUN;
          const zCenter = zStart + STAIR3_RUN / 2;
          return (
            <group key={`st3-${i}`}>
              <RoundedBox args={[STAIR3_WIDTH, STAIR3_RISE, STAIR3_RUN]} radius={0.18} smoothness={4} position={[0, y + STAIR3_RISE/2, zCenter]} castShadow receiveShadow>
                <primitive attach="material" object={stairMat} />
              </RoundedBox>
              <RoundedBox args={[STAIR3_WIDTH, 0.26, 0.22]} radius={0.08} smoothness={4} position={[0, y + STAIR3_RISE - 0.13, zStart + STAIR3_RUN - 0.11]} castShadow receiveShadow>
                <primitive attach="material" object={stairMat} />
              </RoundedBox>
              {Array.from({length:3}).map((_,gi)=>{
                const off = 0.22 + gi*0.16;
                return (
                  <mesh key={`groove-${i}-${gi}`} position={[0, y + STAIR3_RISE - 0.18, zStart + STAIR3_RUN - off]} castShadow receiveShadow>
                    <boxGeometry args={[STAIR3_WIDTH, 0.04, 0.02]} />
                    <primitive attach="material" object={stairMat} />
                  </mesh>
                );
              })}
            </group>
          );
        })}
        
        {/* Side stringers - same as stair2 structure */}
        <mesh position={[-STAIR3_WIDTH/2 - 0.25, groundY + STAIR3_BASE_Y + STAIR3_RISE*STAIR3_STEPS/2, (STAIR3_STEPS * STAIR3_RUN)/2]} rotation={[-Math.atan2(STAIR3_RISE*STAIR3_STEPS, STAIR3_RUN*STAIR3_STEPS), 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 1.0, STAIR3_STEPS * STAIR3_RUN + 0.0001]} />
          <primitive attach="material" object={stairMat} />
        </mesh>
        <mesh position={[STAIR3_WIDTH/2 + 0.25, groundY + STAIR3_BASE_Y + STAIR3_RISE*STAIR3_STEPS/2, (STAIR3_STEPS * STAIR3_RUN)/2]} rotation={[-Math.atan2(STAIR3_RISE*STAIR3_STEPS, STAIR3_RUN*STAIR3_STEPS), 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 1.0, STAIR3_STEPS * STAIR3_RUN + 0.0001]} />
          <primitive attach="material" object={stairMat} />
        </mesh>
        
        {/* Guard rails - same structure as stair2 */}
        {Array.from({length: Math.floor(STAIR3_STEPS/POST_EVERY)}).map((_,idx)=>{
          const i = idx * POST_EVERY;
          const y = groundY + STAIR3_BASE_Y + (i + 1) * STAIR3_RISE;
          const zCenter = i * STAIR3_RUN + STAIR3_RUN * 0.5;
          return (
            <React.Fragment key={`rails3-${i}`}>
              <mesh position={[-STAIR3_WIDTH/2 + railInset, y + postH/2, zCenter]} castShadow receiveShadow>
                <boxGeometry args={[postW, postH, postD]} />
                <primitive attach="material" object={railMat} />
              </mesh>
              <mesh position={[STAIR3_WIDTH/2 - railInset, y + postH/2, zCenter]} castShadow receiveShadow>
                <boxGeometry args={[postW, postH, postD]} />
                <primitive attach="material" object={railMat} />
              </mesh>
            </React.Fragment>
          );
        })}
        
        {/* Top/bottom posts */}
        <mesh position={[-STAIR3_WIDTH/2 + railInset, groundY + STAIR3_BASE_Y + STAIR3_RISE + postH/2, STAIR3_RUN*0.5]} castShadow receiveShadow>
          <boxGeometry args={[postW, postH, postD]} />
          <primitive attach="material" object={railMat} />
        </mesh>
        <mesh position={[STAIR3_WIDTH/2 - railInset, groundY + STAIR3_BASE_Y + STAIR3_RISE + postH/2, STAIR3_RUN*0.5]} castShadow receiveShadow>
          <boxGeometry args={[postW, postH, postD]} />
          <primitive attach="material" object={railMat} />
        </mesh>
        <mesh position={[-STAIR3_WIDTH/2 + railInset, groundY + STAIR3_BASE_Y + STAIR3_STEPS*STAIR3_RISE + postH/2, (STAIR3_STEPS-0.5)*STAIR3_RUN]} castShadow receiveShadow>
          <boxGeometry args={[postW, postH, postD]} />
          <primitive attach="material" object={railMat} />
        </mesh>
        <mesh position={[STAIR3_WIDTH/2 - railInset, groundY + STAIR3_BASE_Y + STAIR3_STEPS*STAIR3_RISE + postH/2, (STAIR3_STEPS-0.5)*STAIR3_RUN]} castShadow receiveShadow>
          <boxGeometry args={[postW, postH, postD]} />
          <primitive attach="material" object={railMat} />
        </mesh>
        
        {/* Rail bars */}
        <RailBar x={-STAIR3_WIDTH/2 + railInset} yStart={groundY + STAIR3_BASE_Y + STAIR3_RISE + postH} zStart={STAIR3_RUN*0.5} yEnd={groundY + STAIR3_BASE_Y + STAIR3_STEPS*STAIR3_RISE + postH} zEnd={(STAIR3_STEPS-0.5)*STAIR3_RUN} thick={topRailThick} />
        <RailBar x={STAIR3_WIDTH/2 - railInset} yStart={groundY + STAIR3_BASE_Y + STAIR3_RISE + postH} zStart={STAIR3_RUN*0.5} yEnd={groundY + STAIR3_BASE_Y + STAIR3_STEPS*STAIR3_RISE + postH} zEnd={(STAIR3_STEPS-0.5)*STAIR3_RUN} thick={topRailThick} />
        <RailBar x={-STAIR3_WIDTH/2 + railInset} yStart={groundY + STAIR3_BASE_Y + STAIR3_RISE + postH*(midRailFrac)} zStart={STAIR3_RUN*0.5} yEnd={groundY + STAIR3_BASE_Y + STAIR3_STEPS*STAIR3_RISE + postH*(midRailFrac)} zEnd={(STAIR3_STEPS-0.5)*STAIR3_RUN} thick={midRailThick} />
        <RailBar x={STAIR3_WIDTH/2 - railInset} yStart={groundY + STAIR3_BASE_Y + STAIR3_RISE + postH*(midRailFrac)} zStart={STAIR3_RUN*0.5} yEnd={groundY + STAIR3_BASE_Y + STAIR3_STEPS*STAIR3_RISE + postH*(midRailFrac)} zEnd={(STAIR3_STEPS-0.5)*STAIR3_RUN} thick={midRailThick} />
        
        {/* Platform */}
        {plat3Depth > 0 && (
          <mesh position={[0, stair3TopY - plat3Thickness/2 + eps, STAIR3_STEPS * STAIR3_RUN + plat3Depth/2]} castShadow receiveShadow>
            <boxGeometry args={[plat3Width, plat3Thickness, plat3Depth]} />
            <primitive attach="material" object={platformMat} />
          </mesh>
        )}
        {/* Platform edge railings with posts and bars (rotated coordinates) */}
        {(() => {
          const postW = 0.18, postH = 7.0, postD = 0.18; // Much taller posts (half character height)
          const topBarH = 0.12, topBarW = 0.12;
          const midBarH = 0.10, midBarW = 0.10;
          const midRailFrac = 0.5;
          const postSpacing = 1.5;
          const xMin = -plat3Width/2;
          const xMax = plat3Width/2;
          const zMin = STAIR3_STEPS * STAIR3_RUN;
          const zMax = STAIR3_STEPS * STAIR3_RUN + plat3Depth;
          const baseY = stair3TopY;
          
          const posts = [];
          const bars = [];
          
          // Back edge (along X axis in rotated space)
          const backPostCount = Math.ceil(plat3Width / postSpacing) + 1;
          for (let i = 0; i < backPostCount; i++) {
            const t = i / (backPostCount - 1);
            const px = xMin + t * plat3Width;
            posts.push(
              <mesh key={`back3-post-${i}`} position={[px, baseY + postH/2, zMax]} castShadow receiveShadow>
                <boxGeometry args={[postW, postH, postD]} />
                <primitive attach="material" object={railMat} />
              </mesh>
            );
          }
          // Top bar back
          bars.push(
            <mesh key="back3-top" position={[0, baseY + postH, zMax]} castShadow receiveShadow>
              <boxGeometry args={[plat3Width, topBarH, topBarW]} />
              <primitive attach="material" object={railMat} />
            </mesh>
          );
          // Mid bar back
          bars.push(
            <mesh key="back3-mid" position={[0, baseY + postH * midRailFrac, zMax]} castShadow receiveShadow>
              <boxGeometry args={[plat3Width, midBarH, midBarW]} />
              <primitive attach="material" object={railMat} />
            </mesh>
          );
          
          // Left edge (along Z axis in rotated space)
          const leftPostCount = Math.ceil(plat3Depth / postSpacing) + 1;
          for (let i = 0; i < leftPostCount; i++) {
            const t = i / (leftPostCount - 1);
            const pz = zMin + t * plat3Depth;
            posts.push(
              <mesh key={`left3-post-${i}`} position={[xMin, baseY + postH/2, pz]} castShadow receiveShadow>
                <boxGeometry args={[postW, postH, postD]} />
                <primitive attach="material" object={railMat} />
              </mesh>
            );
          }
          // Top bar left
          bars.push(
            <mesh key="left3-top" position={[xMin, baseY + postH, (zMin + zMax)/2]} castShadow receiveShadow>
              <boxGeometry args={[topBarW, topBarH, plat3Depth]} />
              <primitive attach="material" object={railMat} />
            </mesh>
          );
          // Mid bar left
          bars.push(
            <mesh key="left3-mid" position={[xMin, baseY + postH * midRailFrac, (zMin + zMax)/2]} castShadow receiveShadow>
              <boxGeometry args={[midBarW, midBarH, plat3Depth]} />
              <primitive attach="material" object={railMat} />
            </mesh>
          );
          
          // Right edge (along Z axis in rotated space)
          const rightPostCount = Math.ceil(plat3Depth / postSpacing) + 1;
          for (let i = 0; i < rightPostCount; i++) {
            const t = i / (rightPostCount - 1);
            const pz = zMin + t * plat3Depth;
            posts.push(
              <mesh key={`right3-post-${i}`} position={[xMax, baseY + postH/2, pz]} castShadow receiveShadow>
                <boxGeometry args={[postW, postH, postD]} />
                <primitive attach="material" object={railMat} />
              </mesh>
            );
          }
          // Top bar right
          bars.push(
            <mesh key="right3-top" position={[xMax, baseY + postH, (zMin + zMax)/2]} castShadow receiveShadow>
              <boxGeometry args={[topBarW, topBarH, plat3Depth]} />
              <primitive attach="material" object={railMat} />
            </mesh>
          );
          // Mid bar right
          bars.push(
            <mesh key="right3-mid" position={[xMax, baseY + postH * midRailFrac, (zMin + zMax)/2]} castShadow receiveShadow>
              <boxGeometry args={[midBarW, midBarH, plat3Depth]} />
              <primitive attach="material" object={railMat} />
            </mesh>
          );
          
          return <>{posts}{bars}</>;
        })()}
      </group>
    </group>
  );
}

// A thin box with different materials on top and bottom (wood top, ceiling bottom)

export function PlatformBlock({ position = [0,0,0], size = [10,0.2,10] }) {
  const [w, h, d] = size;
  // Top: use the provided metal floor texture and tile it so it reads well at large size
  const topTex = useTexture('/textures/metal_floor.png');
  useEffect(() => {
    if (topTex) {
      topTex.wrapS = topTex.wrapT = THREE.RepeatWrapping;
      topTex.anisotropy = 8;
  // Compute repeats and then reduce tiling density by ~95% (make tiles much larger)
      const baseRepX = Math.max(1, Math.round(w / 4));
      const baseRepY = Math.max(1, Math.round(d / 4));
  const repX = Math.max(1, Math.round(baseRepX * 0.05));
  const repY = Math.max(1, Math.round(baseRepY * 0.05));
      topTex.repeat.set(repX, repY);
      topTex.needsUpdate = true;
    }
  }, [topTex, w, d]);

  // Bottom: make a subtle ceiling tile grid procedurally
  const ceilingTex = useMemo(() => {
    const W = 512, H = 512; const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
    // base off-white
    ctx.fillStyle = '#f0f3f6'; ctx.fillRect(0,0,W,H);
    // grid lines
    ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 2;
    const tiles = 8; const sx = W/tiles, sy = H/tiles;
    for (let i=1;i<tiles;i++){ ctx.beginPath(); ctx.moveTo(i*sx,0); ctx.lineTo(i*sx,H); ctx.stroke(); }
    for (let j=1;j<tiles;j++){ ctx.beginPath(); ctx.moveTo(0,j*sy); ctx.lineTo(W,j*sy); ctx.stroke(); }
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    t.needsUpdate = true;
    return t;
  }, []);
  // Repeat bottom similarly
  const botRepeatX = Math.max(1, Math.floor(w / 6));
  const botRepeatY = Math.max(1, Math.floor(d / 6));
  useEffect(() => {
    if (ceilingTex) {
      ceilingTex.repeat.set(botRepeatX, botRepeatY);
      ceilingTex.needsUpdate = true;
    }
  }, [ceilingTex, botRepeatX, botRepeatY]);

  // Materials for box faces: order is +X, -X, +Y(top), -Y(bottom), +Z, -Z
  const sideMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: 0.05, roughness: 0.9 }), []);
  const topMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', map: topTex, metalness: 0.35, roughness: 0.6 }), [topTex]);
  const botMat  = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', map: ceilingTex, metalness: 0.02, roughness: 0.95 }), [ceilingTex]);
  const materials = useMemo(() => [sideMat, sideMat, topMat, botMat, sideMat, sideMat], [sideMat, topMat, botMat]);

  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      {materials.map((m, i) => (
        <primitive key={i} object={m} attach={`material-${i}`} />
      ))}
    </mesh>
  );
}


export function StairCollisionDebug({ show = false }) {
  const [aabbs, setAabbs] = React.useState([]);
  const meshRefs = React.useRef([]);
  
  // Update AABBs every frame to read live transforms
  useFrame(() => {
    if (!show) return;
    const newAabbs = buildStairAABBsWorld();
    
    // Update mesh positions/scales based on new AABBs
    newAabbs.forEach((b, idx) => {
      const meshRef = meshRefs.current[idx];
      if (meshRef) {
        const sx = (b.max.x - b.min.x);
        const sy = (b.max.y - b.min.y);
        const sz = (b.max.z - b.min.z);
        const cx = (b.min.x + b.max.x) / 2;
        const cy = (b.min.y + b.max.y) / 2;
        const cz = (b.min.z + b.max.z) / 2;
        
        meshRef.position.set(cx, cy, cz);
        meshRef.scale.set(sx, sy, sz);
      }
    });
    
    // Update state if AABB count changed (cubes added/removed)
    if (newAabbs.length !== aabbs.length) {
      setAabbs(newAabbs);
    }
  });
  
  // Initialize AABBs on mount
  React.useEffect(() => {
    if (show) {
      setAabbs(buildStairAABBsWorld());
    }
  }, [show]);
  
  if (!show) return null;
  
  const meshes = aabbs.map((b, idx) => {
    const sx = (b.max.x - b.min.x);
    const sy = (b.max.y - b.min.y);
    const sz = (b.max.z - b.min.z);
    const cx = (b.min.x + b.max.x) / 2;
    const cy = (b.min.y + b.max.y) / 2;
    const cz = (b.min.z + b.max.z) / 2;
    // Red for disabled stair1, cyan for stair2, green for stair3
    const color = b.disabled ? '#ef4444' : (b.stair3 ? '#22ff22' : '#22d3ee');
    return (
      <mesh 
        key={`scb-${idx}`} 
        ref={el => meshRefs.current[idx] = el}
        position={[cx, cy, cz]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.6} depthWrite={false} />
      </mesh>
    );
  });
  return <group>{meshes}</group>;
}

// Large 3D asteroids drifting by in the far background