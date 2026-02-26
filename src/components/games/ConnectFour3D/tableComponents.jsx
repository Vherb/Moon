// ConnectFour3D – table components
// Extracted from ConnectFour3DView.jsx

import React, { useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBX, useTexture } from '@react-three/drei';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { COLS, ROWS, CELL, GAP, GROUND_CLEAR } from './constants';
export function TableFBX() {
  // Frame sizes and floor reference
  const fw = COLS * (CELL + GAP) - GAP + 0.6;
  const fh = ROWS * (CELL + GAP) - GAP + 0.6;
  const groundY = -fh / 2 - GROUND_CLEAR;
  // Static scale (no dynamic footprint scaling) â€” locked value
  const TABLE_STATIC_SCALE = 0.0825;

  // Simple table asset (no external texture mapping)
  const model = useFBX('/models/props/table/table.fbx');
  const lastFixRef = useRef(0);
  // Fixed Y tweak to raise/lower table (locked so it persists across reloads)
  const TABLE_Y_OFFSET = 0.00;
  useLayoutEffect(() => {
    try {
      if (!model) return;
      // Preserve FBX's original materials; enable shadows and set defaults
      model.traverse((o) => {
        if (o && o.isMesh) {
          o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
          let m = o.material;
          if (!m) {
            m = o.material = new THREE.MeshStandardMaterial({ color: '#6a523a', metalness: 0.15, roughness: 0.8 });
          }
          // Reasonable PBR defaults
          if (typeof m.metalness !== 'number') m.metalness = 0.15;
          if (typeof m.roughness !== 'number') m.roughness = 0.8;
          m.needsUpdate = true;
        }
      });
  // Normalize placement: center on XZ, apply static scale, place on ground
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3(); box.getCenter(center);
      // center horizontally
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.updateMatrixWorld(true);
  // set table rotation to exactly 90Â° around Y
  model.rotation.y = Math.PI / 2;
  // apply static scale
      model.scale.setScalar(TABLE_STATIC_SCALE);
      model.updateMatrixWorld(true);
      // Place so the legs sit on the floor plane (table stands above the floor)
      const box2 = new THREE.Box3().setFromObject(model);
      const bottomWorld = box2.min.y;
      // Parent world Y (the table lives under a parent group with a Y offset)
      let parentWorldY = 0;
      try {
        if (model.parent) {
          const v = new THREE.Vector3();
          model.parent.getWorldPosition(v);
          parentWorldY = v.y || 0;
        }
      } catch {}
      const targetBottomWorld = parentWorldY + groundY + TABLE_Y_OFFSET;
      model.position.y += (targetBottomWorld - bottomWorld);
      model.updateMatrixWorld(true);
      // Publish the XZ footprint for collision/landing alignment
      const box3 = new THREE.Box3().setFromObject(model);
      try {
        window.__CF_TABLE_RECT__ = { minX: box3.min.x, maxX: box3.max.x, minZ: box3.min.z, maxZ: box3.max.z };
        window.__CF_TABLE_TOP_Y__ = box3.max.y; // publish tabletop height for aligning board
        // Also emit an event so other parts of the scene can react immediately on first load
        try {
          const detail = { topY: box3.max.y, rect: window.__CF_TABLE_RECT__ };
          window.dispatchEvent(new CustomEvent('cf:table-ready', { detail }));
        } catch {}
      } catch {}
    } catch {}
  }, [model, groundY, TABLE_STATIC_SCALE, TABLE_Y_OFFSET]);

  // Guard: if anything nudges the table after initial placement, re-clamp to floor
  useFrame((state) => {
    if (!model) return;
    const t = state.clock.getElapsedTime();
    if (t - (lastFixRef.current || 0) < 0.5) return; // throttle checks
    lastFixRef.current = t;
    try {
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const bottomWorld = box.min.y;
      let parentWorldY = 0;
      try {
        if (model.parent) {
          const v = new THREE.Vector3();
          model.parent.getWorldPosition(v);
          parentWorldY = v.y || 0;
        }
      } catch {}
      const targetBottomWorld = parentWorldY + groundY + TABLE_Y_OFFSET;
      const dyWorld = (targetBottomWorld - bottomWorld);
      if (Math.abs(dyWorld) > 0.001) {
        model.position.y += dyWorld;
        model.updateMatrixWorld(true);
      }
    } catch {}
  });

  return model ? <primitive object={model} dispose={null} /> : null;
}

// Classic textured table (original look) below the board

export function ClassicTableFBX(){
  // Frame sizes and floor reference
  const fw = COLS * (CELL + GAP) - GAP + 0.6;
  const fh = ROWS * (CELL + GAP) - GAP + 0.6;
  const groundY = -fh / 2 - GROUND_CLEAR;
  // Target tabletop span so the board fits comfortably with margin
  // Fixed scale: smaller for "normal" size
  const FIXED_TABLE_SCALE = 0.75;
  const TARGET_TOP_W = (Math.max(fw + 4.0, 12.0)) * FIXED_TABLE_SCALE;

  // Load the classic asset + textures
  const model = useFBX('/models/props/table/i_need_a_fancy_lookin_1016113959_texture.fbx');
  const texBase = useTexture('/models/props/table/i_need_a_fancy_lookin_1016113959_texture.png');
  const texNormal = useTexture('/models/props/table/i_need_a_fancy_lookin_1016113959_texture_normal.png');
  const texMetal = useTexture('/models/props/table/i_need_a_fancy_lookin_1016113959_texture_metallic.png');
  const texMetalRough = useTexture('/models/props/table/i_need_a_fancy_lookin_1016113959_texture_metallic_roughness.png');
  const texRough = useTexture('/models/props/table/i_need_a_fancy_lookin_1016113959_texture_roughness.png');

  const lastFixRef = useRef(0);
  useLayoutEffect(()=>{
    try{
      if(!model) return;
      // Check if this specific model instance has already been scaled
      // Use userData to persist across hot reloads and reconnects
      if(model.userData.__tableScaled__) return;
      model.traverse((o)=>{
        if(o && o.isMesh){
          o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
          const m = (o.material = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            map: texBase || null,
            normalMap: texNormal || null,
            metalnessMap: texMetal || null,
            roughnessMap: texRough || texMetalRough || null,
            metalness: 0.2,
            roughness: 0.8,
          }));
          if (m.map) { m.map.anisotropy = 8; m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; }
          if (m.normalMap) { m.normalMap.anisotropy = 4; }
          if (m.roughnessMap) { m.roughnessMap.anisotropy = 2; }
          if (m.metalnessMap) { m.metalnessMap.anisotropy = 2; }
          m.needsUpdate = true;
        }
      });
      // Center horizontally before scaling/rotation
      model.updateMatrixWorld(true);
      const box0 = new THREE.Box3().setFromObject(model);
      const center0 = new THREE.Vector3(); box0.getCenter(center0);
      model.position.x -= center0.x; model.position.z -= center0.z;
      // Uniform rotation (classic asset forward to match scene)
      model.rotation.y = Math.PI / 2;
      model.updateMatrixWorld(true);
      // Compute scale so the tabletop span roughly matches target width
      const box1 = new THREE.Box3().setFromObject(model);
      const baseW = Math.max(0.001, box1.max.x - box1.min.x);
  const s = TARGET_TOP_W / baseW;
      model.scale.setScalar(s);
      model.updateMatrixWorld(true);
      // Sit on ground
      const box2 = new THREE.Box3().setFromObject(model);
      const bottomWorld = box2.min.y;
      let parentWorldY = 0;
      try{ if(model.parent){ const v=new THREE.Vector3(); model.parent.getWorldPosition(v); parentWorldY = v.y || 0; } }catch{}
      const targetBottomWorld = parentWorldY + groundY;
      model.position.y += (targetBottomWorld - bottomWorld);
      model.updateMatrixWorld(true);
      // Publish table rect + top Y
      const box3 = new THREE.Box3().setFromObject(model);
      try{
        window.__CF_TABLE_RECT__ = { minX: box3.min.x, maxX: box3.max.x, minZ: box3.min.z, maxZ: box3.max.z };
        window.__CF_TABLE_TOP_Y__ = box3.max.y;
        const detail = { topY: box3.max.y, rect: window.__CF_TABLE_RECT__ };
        window.dispatchEvent(new CustomEvent('cf:table-ready', { detail }));
      }catch{}
      // Mark model as scaled to prevent rescaling on hot reload/reconnect
      model.userData.__tableScaled__ = true;
    }catch{}
  }, [model, texBase, texNormal, texMetal, texMetalRough, texRough, groundY, TARGET_TOP_W]);

  // Keep clamped to floor if anything moves
  useFrame((state)=>{
    if(!model) return;
    const t = state.clock.getElapsedTime();
    if(t - (lastFixRef.current||0) < 0.5) return;
    lastFixRef.current = t;
    try{
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const bottomWorld = box.min.y;
      let parentWorldY = 0;
      try{ if(model.parent){ const v=new THREE.Vector3(); model.parent.getWorldPosition(v); parentWorldY = v.y || 0; } }catch{}
      const targetBottomWorld = parentWorldY + groundY;
      const dy = targetBottomWorld - bottomWorld;
      if(Math.abs(dy) > 0.001){ model.position.y += dy; model.updateMatrixWorld(true); }
    }catch{}
  });

  return model ? <primitive object={model} dispose={null} /> : null;
}

// Asteroid surface floor with craters and scrolling motion to feel like flying over an asteroid