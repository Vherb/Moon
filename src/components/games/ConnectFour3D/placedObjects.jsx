// ConnectFour3D – placed object components
// Extracted from ConnectFour3DView.jsx

import React, { Suspense, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { TransformControls, useFBX, useTexture, Text, Billboard, Html } from '@react-three/drei';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import {
  COLS, ROWS, CELL, GAP, GROUND_CLEAR,
  STAIR2_WIDTH, STAIR2_RUN, STAIR2_RISE, STAIR2_STEPS,
} from './constants';
import { CURRENT_PLACED_CUBES, getTerrainHeightXZ } from './terrainPhysics';
import { TerrainGeometry } from './terrainComponents';
export function DraggableObject({ children, cube, editMode, dragMode, isSelected, onDragEnd }) {
  const { camera, gl, raycaster, mouse, scene } = useThree();
  const [isDragging, setIsDragging] = React.useState(false);
  const groupRef = React.useRef();
  const dragPlaneRef = React.useRef();
  const dragOffsetRef = React.useRef({ x: 0, y: 0, z: 0 }); // Store 3D offset between click point and object center
  
  React.useEffect(() => {
    if (!dragMode || !editMode) return;
    
    // Create invisible plane for raycasting - positioned at object height for better control
    if (!dragPlaneRef.current) {
      const planeGeometry = new THREE.PlaneGeometry(10000, 10000);
      planeGeometry.rotateX(-Math.PI / 2);
      const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
      dragPlaneRef.current = new THREE.Mesh(planeGeometry, planeMaterial);
      scene.add(dragPlaneRef.current);
    }
    
    return () => {
      if (dragPlaneRef.current) {
        scene.remove(dragPlaneRef.current);
        dragPlaneRef.current = null;
      }
    };
  }, [dragMode, editMode, scene]);
  
  const handlePointerDown = (e) => {
    if (!dragMode || !editMode || !groupRef.current || !dragPlaneRef.current) return;
    e.stopPropagation();
    
    // Position drag plane at object's current height for more accurate movement
    const objPos = groupRef.current.position;
    dragPlaneRef.current.position.y = objPos.y;
    
    // Calculate initial click offset so object doesn't teleport
    const rect = gl.domElement.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera({ x: mouseX, y: mouseY }, camera);
    const intersects = raycaster.intersectObject(dragPlaneRef.current);
    
    if (intersects.length > 0) {
      const clickPoint = intersects[0].point;
      
      // Scale down the click point to match movement scale
      const movementScale = 0.1;
      const scaledClickX = clickPoint.x * movementScale;
      const scaledClickZ = clickPoint.z * movementScale;
      
      // Store the offset between where we clicked and where the object is
      dragOffsetRef.current = {
        x: objPos.x - scaledClickX,
        y: objPos.y - clickPoint.y,
        z: objPos.z - scaledClickZ
      };
    }
    
    setIsDragging(true);
    gl.domElement.style.cursor = 'grabbing';
  };
  
  const handlePointerMove = (e) => {
    if (!isDragging || !dragMode || !editMode || !groupRef.current || !dragPlaneRef.current) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    // Update mouse coordinates
    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycast to find intersection with drag plane (at object's height)
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(dragPlaneRef.current);
    
    if (intersects.length > 0) {
      const point = intersects[0].point;
      
      // Scale down the raycast point to reduce movement speed (10% of actual distance from center)
      const movementScale = 0.1;
      const scaledX = point.x * movementScale;
      const scaledZ = point.z * movementScale;
      
      // Apply the offset so object stays where you grabbed it
      const targetX = scaledX + dragOffsetRef.current.x;
      const targetZ = scaledZ + dragOffsetRef.current.z;
      
      const terrainHeight = getTerrainHeightXZ(targetX, targetZ);
      
      // Calculate object's height offset from terrain at its original position
      const heightOffset = cube.position.y - getTerrainHeightXZ(cube.position.x, cube.position.z);
      
      // Update position while maintaining terrain height + object's original height offset
      const newY = terrainHeight + heightOffset;
      groupRef.current.position.set(targetX, newY, targetZ);
      
      // Update drag plane Y position to follow the object for smooth dragging
      dragPlaneRef.current.position.y = newY;
    }
  };
  
  const handlePointerUp = (e) => {
    if (!isDragging) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    setIsDragging(false);
    gl.domElement.style.cursor = dragMode ? 'grab' : 'default';
    
    if (groupRef.current && onDragEnd) {
      const pos = groupRef.current.position;
      onDragEnd({
        position: { x: pos.x, y: pos.y, z: pos.z }
      });
    }
  };
  
  React.useEffect(() => {
    if (!dragMode || !editMode) return;
    
    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, dragMode, editMode, gl.domElement]);
  
  return (
    <group
      ref={groupRef}
      position={[cube.position.x, cube.position.y, cube.position.z]}
      onPointerDown={handlePointerDown}
      onPointerOver={() => dragMode && editMode && (gl.domElement.style.cursor = 'grab')}
      onPointerOut={() => !isDragging && (gl.domElement.style.cursor = 'default')}
    >
      {children}
      
      {/* Visual indicator for drag mode - green sphere above object */}
      {dragMode && editMode && isSelected && (
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

// Placed Cube/Sphere Component with TransformControls
// Component for rendering Stairs2 model with collision boxes
export function Stairs2PlacedModel({ cube, isSelected, editMode, dragMode, transformMode, snap, translateSnap, rotateSnapDeg, scaleSnap, onTransformEnd, showCollisionBoxes }) {
  const groupRef = React.useRef();
  const transformRef = React.useRef();
  
  // Interpolation targets for smooth opponent view
  const targetPos = React.useRef(new THREE.Vector3());
  const targetRot = React.useRef(new THREE.Euler());
  const targetScale = React.useRef(new THREE.Vector3(1, 1, 1));
  
  // Load textures (same as main Staircase component)
  const stairsTex = useTexture('/textures/metal_stairs.png');
  useEffect(() => {
    if (stairsTex) {
      stairsTex.wrapS = stairsTex.wrapT = THREE.ClampToEdgeWrapping;
      stairsTex.anisotropy = 8;
      stairsTex.repeat.set(1, 1);
      stairsTex.needsUpdate = true;
    }
  }, [stairsTex]);
  
  const stairMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#dfe4ea',
    metalness: 0.35,
    roughness: 0.6,
    map: stairsTex || null,
  }), [stairsTex]);
  
  const railMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#9ca3af', 
    metalness: 0.7, 
    roughness: 0.35 
  }), []);
  
  // Stairs2 parameters (from constants)
  const width = STAIR2_WIDTH;
  const run = STAIR2_RUN;
  const rise = STAIR2_RISE;
  const steps = STAIR2_STEPS;
  const POST_EVERY = 2;
  const postW = 0.32, postD = 0.32;
  const postH = 6.5;
  const topRailThick = 0.28;
  const midRailThick = 0.22;
  const railInset = 0.45;
  
  // Build stairs geometry (centered at origin for the model)
  const stairsGroup = useMemo(() => {
    const group = new THREE.Group();
    
    // Create each step
    for (let i = 0; i < steps; i++) {
      const y = i * rise;
      const zStart = i * run;
      const zCenter = zStart + run / 2;
      
      // Main step block (using BoxGeometry for simplicity)
      const stepGeo = new THREE.BoxGeometry(width, rise, run);
      const stepMesh = new THREE.Mesh(stepGeo, stairMat);
      stepMesh.position.set(0, y + rise/2, zCenter);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      group.add(stepMesh);
      
      // Bullnose lip
      const lipGeo = new THREE.BoxGeometry(width, 0.26, 0.22);
      const lipMesh = new THREE.Mesh(lipGeo, stairMat);
      lipMesh.position.set(0, y + rise - 0.13, zStart + run - 0.11);
      lipMesh.castShadow = true;
      lipMesh.receiveShadow = true;
      group.add(lipMesh);
      
      // Anti-slip grooves
      for (let gi = 0; gi < 3; gi++) {
        const off = 0.22 + gi * 0.16;
        const grooveGeo = new THREE.BoxGeometry(width, 0.04, 0.02);
        const grooveMesh = new THREE.Mesh(grooveGeo, stairMat);
        grooveMesh.position.set(0, y + rise - 0.18, zStart + run - off);
        grooveMesh.castShadow = true;
        grooveMesh.receiveShadow = true;
        group.add(grooveMesh);
      }
    }
    
    // Side stringers
    const stringer1Geo = new THREE.BoxGeometry(0.5, 1.0, steps * run + 0.0001);
    const stringer1Mesh = new THREE.Mesh(stringer1Geo, stairMat);
    stringer1Mesh.position.set(-width/2 - 0.25, rise*steps/2, (steps * run)/2);
    stringer1Mesh.rotation.x = -Math.atan2(rise*steps, run*steps);
    stringer1Mesh.castShadow = true;
    stringer1Mesh.receiveShadow = true;
    group.add(stringer1Mesh);
    
    const stringer2Geo = new THREE.BoxGeometry(0.5, 1.0, steps * run + 0.0001);
    const stringer2Mesh = new THREE.Mesh(stringer2Geo, stairMat);
    stringer2Mesh.position.set(width/2 + 0.25, rise*steps/2, (steps * run)/2);
    stringer2Mesh.rotation.x = -Math.atan2(rise*steps, run*steps);
    stringer2Mesh.castShadow = true;
    stringer2Mesh.receiveShadow = true;
    group.add(stringer2Mesh);
    
    // Guard rails - posts
    const leftRailX = -width/2 + railInset;
    const rightRailX = width/2 - railInset;
    
    for (let i = 0; i < steps; i += POST_EVERY) {
      const y = (i+1) * rise;
      const zCenter = i * run + run * 0.5;
      
      // Left post
      const leftPostGeo = new THREE.BoxGeometry(postW, postH, postD);
      const leftPostMesh = new THREE.Mesh(leftPostGeo, railMat);
      leftPostMesh.position.set(leftRailX, y + postH/2, zCenter);
      leftPostMesh.castShadow = true;
      leftPostMesh.receiveShadow = true;
      group.add(leftPostMesh);
      
      // Right post
      const rightPostGeo = new THREE.BoxGeometry(postW, postH, postD);
      const rightPostMesh = new THREE.Mesh(rightPostGeo, railMat);
      rightPostMesh.position.set(rightRailX, y + postH/2, zCenter);
      rightPostMesh.castShadow = true;
      rightPostMesh.receiveShadow = true;
      group.add(rightPostMesh);
    }
    
    // Bottom and top posts
    const z0 = run*0.5;
    const z1 = steps * run - run*0.5;
    
    const bottomLeftPostGeo = new THREE.BoxGeometry(postW, postH, postD);
    const bottomLeftPost = new THREE.Mesh(bottomLeftPostGeo, railMat);
    bottomLeftPost.position.set(leftRailX, rise + postH/2, z0);
    bottomLeftPost.castShadow = true;
    bottomLeftPost.receiveShadow = true;
    group.add(bottomLeftPost);
    
    const bottomRightPostGeo = new THREE.BoxGeometry(postW, postH, postD);
    const bottomRightPost = new THREE.Mesh(bottomRightPostGeo, railMat);
    bottomRightPost.position.set(rightRailX, rise + postH/2, z0);
    bottomRightPost.castShadow = true;
    bottomRightPost.receiveShadow = true;
    group.add(bottomRightPost);
    
    const topLeftPostGeo = new THREE.BoxGeometry(postW, postH, postD);
    const topLeftPost = new THREE.Mesh(topLeftPostGeo, railMat);
    topLeftPost.position.set(leftRailX, steps*rise + postH/2, z1);
    topLeftPost.castShadow = true;
    topLeftPost.receiveShadow = true;
    group.add(topLeftPost);
    
    const topRightPostGeo = new THREE.BoxGeometry(postW, postH, postD);
    const topRightPost = new THREE.Mesh(topRightPostGeo, railMat);
    topRightPost.position.set(rightRailX, steps*rise + postH/2, z1);
    topRightPost.castShadow = true;
    topRightPost.receiveShadow = true;
    group.add(topRightPost);
    
    // Top and mid rail bars (sloped)
    const y0 = rise + postH;
    const y1 = steps*rise + postH;
    const dz = z1 - z0;
    const dy = y1 - y0;
    const railLen = Math.sqrt(dz*dz + dy*dy);
    const railPitch = -Math.atan2(dy, dz);
    const midZ = (z0 + z1) / 2;
    const midY = (y0 + y1) / 2;
    
    // Top rails
    const topRailGeoLeft = new THREE.BoxGeometry(topRailThick, topRailThick, railLen);
    const topRailMeshLeft = new THREE.Mesh(topRailGeoLeft, railMat);
    topRailMeshLeft.position.set(leftRailX, midY, midZ);
    topRailMeshLeft.rotation.x = railPitch;
    topRailMeshLeft.castShadow = true;
    topRailMeshLeft.receiveShadow = true;
    group.add(topRailMeshLeft);
    
    const topRailGeoRight = new THREE.BoxGeometry(topRailThick, topRailThick, railLen);
    const topRailMeshRight = new THREE.Mesh(topRailGeoRight, railMat);
    topRailMeshRight.position.set(rightRailX, midY, midZ);
    topRailMeshRight.rotation.x = railPitch;
    topRailMeshRight.castShadow = true;
    topRailMeshRight.receiveShadow = true;
    group.add(topRailMeshRight);
    
    // Mid rails
    const midRailY = midY - postH * 0.25;
    const midRailGeoLeft = new THREE.BoxGeometry(midRailThick, midRailThick, railLen);
    const midRailMeshLeft = new THREE.Mesh(midRailGeoLeft, railMat);
    midRailMeshLeft.position.set(leftRailX, midRailY, midZ);
    midRailMeshLeft.rotation.x = railPitch;
    midRailMeshLeft.castShadow = true;
    midRailMeshLeft.receiveShadow = true;
    group.add(midRailMeshLeft);
    
    const midRailGeoRight = new THREE.BoxGeometry(midRailThick, midRailThick, railLen);
    const midRailMeshRight = new THREE.Mesh(midRailGeoRight, railMat);
    midRailMeshRight.position.set(rightRailX, midRailY, midZ);
    midRailMeshRight.rotation.x = railPitch;
    midRailMeshRight.castShadow = true;
    midRailMeshRight.receiveShadow = true;
    group.add(midRailMeshRight);
    
    return group;
  }, [stairMat, railMat, width, run, rise, steps, postW, postH, postD, topRailThick, midRailThick, railInset, POST_EVERY]);
  
  // Clone the group for each instance to avoid circular references
  const stairsClone = useMemo(() => {
    if (!stairsGroup) return null;
    return stairsGroup.clone();
  }, [stairsGroup, cube.id]); // Re-clone when cube.id changes (new instance)
  
  // Collision boxes (same structure as buildStairAABBsWorld but local coordinates)
  const collisionBoxes = useMemo(() => {
    const boxes = [];
    const halfW = width / 2;
    
    // Step collision boxes
    for (let i = 0; i < steps; i++) {
      const zStart = i * run;
      const zEnd = zStart + run;
      const y0 = i * rise;
      const y1 = y0 + rise;
      const zCenter = (zStart + zEnd) / 2;
      const yCenter = (y0 + y1) / 2;
      
      boxes.push({
        position: [0, yCenter, zCenter],
        size: [width, rise, run],
        key: `step-${i}`
      });
    }
    
    // Rail collision boxes (OUTSIDE the stairs like STAIR2)
    const railWidth = 0.8;
    const railHeight = 8.0;
    const leftX = -width/2 - railInset; // OUTSIDE left (subtract)
    const rightX = width/2 + railInset; // OUTSIDE right (add)
    
    for (let i = 0; i < steps; i++) {
      const zStart = i * run;
      const zEnd = zStart + run;
      const zCenter = (zStart + zEnd) / 2;
      const yBase = i * rise;
      const yCenter = yBase + railHeight/2;
      
      // Left rail
      boxes.push({
        position: [leftX, yCenter, zCenter],
        size: [railWidth, railHeight, run],
        key: `rail-left-${i}`
      });
      
      // Right rail
      boxes.push({
        position: [rightX, yCenter, zCenter],
        size: [railWidth, railHeight, run],
        key: `rail-right-${i}`
      });
    }
    
    return boxes;
  }, [width, run, rise, steps, railInset]);
  
  // Transform controls handlers
  React.useEffect(() => {
    if (transformRef.current && groupRef.current) {
      const controls = transformRef.current;
      const handleMouseUp = () => {
        if (!groupRef.current) return;
        const { position, rotation, scale } = groupRef.current;
        
        // Immediately set targets to current position to prevent snap-back
        targetPos.current.copy(position);
        targetRot.current.copy(rotation);
        targetScale.current.copy(scale);
        
        const updates = {
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
          scale: { x: scale.x, y: scale.y, z: scale.z }
        };
        if (onTransformEnd) onTransformEnd(updates);
      };
      controls.addEventListener('mouseUp', handleMouseUp);
      return () => controls.removeEventListener('mouseUp', handleMouseUp);
    }
  }, [onTransformEnd]);
  
  React.useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(transformMode);
      transformRef.current.setTranslationSnap(snap ? translateSnap : null);
      transformRef.current.setRotationSnap(snap ? (rotateSnapDeg * Math.PI / 180) : null);
      transformRef.current.setScaleSnap(snap ? scaleSnap : null);
    }
  }, [transformMode, snap, translateSnap, rotateSnapDeg, scaleSnap]);
  
  if (!stairsClone) return null;
  
  return (
    <>
      {dragMode && editMode ? (
        <DraggableObject cube={cube} editMode={editMode} dragMode={dragMode} isSelected={isSelected} onDragEnd={onTransformEnd}>
          <group
            ref={groupRef}
            rotation={[cube.rotation.x, cube.rotation.y, cube.rotation.z]}
            scale={[cube.scale.x, cube.scale.y, cube.scale.z]}
          >
            <group>
              <primitive object={stairsClone} />
            </group>
            {/* Collision boxes */}
            {showCollisionBoxes && collisionBoxes.map(box => (
              <mesh key={box.key} position={box.position}>
                <boxGeometry args={box.size} />
                <meshBasicMaterial color={isSelected ? '#10b981' : '#3b82f6'} wireframe opacity={0.3} transparent />
              </mesh>
            ))}
          </group>
        </DraggableObject>
      ) : (
        <>
          <group
            ref={groupRef}
            position={[cube.position.x, cube.position.y, cube.position.z]}
            rotation={[cube.rotation.x, cube.rotation.y, cube.rotation.z]}
            scale={[cube.scale.x, cube.scale.y, cube.scale.z]}
          >
            <group>
              <primitive object={stairsClone} />
            </group>
            {/* Collision boxes */}
            {showCollisionBoxes && collisionBoxes.map(box => (
              <mesh key={box.key} position={box.position}>
                <boxGeometry args={box.size} />
                <meshBasicMaterial color={isSelected ? '#10b981' : '#3b82f6'} wireframe opacity={0.3} transparent />
              </mesh>
            ))}
          </group>
          {editMode && isSelected && !dragMode && (
            <TransformControls ref={transformRef} object={groupRef.current} />
          )}
        </>
      )}
    </>
  );
}

// Component for rendering asteroid models
export function AsteroidPlacedModel({ cube, isSelected, editMode, dragMode, transformMode, snap, translateSnap, rotateSnapDeg, scaleSnap, onTransformEnd }) {
  const groupRef = React.useRef();
  const transformRef = React.useRef();
  const asteroidModel = useFBX('/models/props/asteroid/asteroid.fbx');
  
  // Interpolation targets for smooth opponent view
  const targetPos = React.useRef(new THREE.Vector3());
  const targetRot = React.useRef(new THREE.Euler());
  const targetScale = React.useRef(new THREE.Vector3(1, 1, 1));
  
  const modelClone = React.useMemo(() => {
    if (!asteroidModel) return null;
    // Create a new group and only copy meshes (no bones/skeleton)
    const group = new THREE.Group();
    asteroidModel.traverse(o => {
      if (o.isMesh || o.isSkinnedMesh) {
        // Convert SkinnedMesh to regular Mesh to avoid bone issues
        const geometry = o.geometry;
        const material = o.material;
        
        // Create a plain Mesh (not SkinnedMesh)
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Copy world transform
        mesh.position.copy(o.position);
        mesh.rotation.copy(o.rotation);
        mesh.scale.copy(o.scale);
        
        group.add(mesh);
      }
    });
    return group;
  }, [asteroidModel]);
  
  React.useEffect(() => {
    if (transformRef.current && groupRef.current) {
      const controls = transformRef.current;
      const handleMouseUp = () => {
        if (!groupRef.current) return;
        const { position, rotation, scale } = groupRef.current;
        
        // Immediately set targets to current position to prevent snap-back
        targetPos.current.copy(position);
        targetRot.current.copy(rotation);
        targetScale.current.copy(scale);
        
        const updates = {
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
          scale: { x: scale.x, y: scale.y, z: scale.z }
        };
        if (onTransformEnd) onTransformEnd(updates);
      };
      controls.addEventListener('mouseUp', handleMouseUp);
      return () => controls.removeEventListener('mouseUp', handleMouseUp);
    }
  }, [onTransformEnd]);
  
  React.useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(transformMode);
      transformRef.current.setTranslationSnap(snap ? translateSnap : null);
      transformRef.current.setRotationSnap(snap ? (rotateSnapDeg * Math.PI / 180) : null);
      transformRef.current.setScaleSnap(snap ? scaleSnap : null);
    }
  }, [transformMode, snap, translateSnap, rotateSnapDeg, scaleSnap]);
  
  if (!modelClone) return null;
  
  return (
    <>
      {dragMode && editMode ? (
        // Wrap in DraggableObject for free drag mode
        <DraggableObject cube={cube} editMode={editMode} dragMode={dragMode} isSelected={isSelected} onDragEnd={onTransformEnd}>
          <group
            ref={groupRef}
            rotation={[cube.rotation.x, cube.rotation.y, cube.rotation.z]}
            scale={[cube.scale.x, cube.scale.y, cube.scale.z]}
          >
            <primitive object={modelClone} />
            {cube.hasCollision && (
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color={isSelected ? '#10b981' : '#3b82f6'} wireframe opacity={0.3} transparent />
              </mesh>
            )}
          </group>
        </DraggableObject>
      ) : (
        <group
          ref={groupRef}
          position={[cube.position.x, cube.position.y, cube.position.z]}
          rotation={[cube.rotation.x, cube.rotation.y, cube.rotation.z]}
          scale={[cube.scale.x, cube.scale.y, cube.scale.z]}
        >
          <primitive object={modelClone} />
          {cube.hasCollision && editMode && (
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={isSelected ? '#10b981' : '#3b82f6'} wireframe opacity={0.3} transparent />
            </mesh>
          )}
        </group>
      )}
      {/* Always show TransformControls when selected, even in drag mode */}
      {isSelected && editMode && groupRef.current && (
        <TransformControls ref={transformRef} object={groupRef.current} mode={transformMode} enabled={!dragMode} />
      )}
    </>
  );
}

// Component for rendering rover models
export function RoverPlacedModel({ cube, isSelected, editMode, dragMode, transformMode, snap, translateSnap, rotateSnapDeg, scaleSnap, onTransformEnd }) {
  const groupRef = React.useRef();
  const transformRef = React.useRef();
  const roverModel = useFBX('/models/props/rover/dusty rover/Dusty_Explorer_1020195240_texture.fbx');
  
  // Interpolation targets for smooth opponent view
  const targetPos = React.useRef(new THREE.Vector3());
  const targetRot = React.useRef(new THREE.Euler());
  const targetScale = React.useRef(new THREE.Vector3(1, 1, 1));
  
  const modelClone = React.useMemo(() => {
    if (!roverModel) return null;
    // Create a new group and only copy meshes (no bones/skeleton)
    const group = new THREE.Group();
    roverModel.traverse(o => {
      if (o.isMesh || o.isSkinnedMesh) {
        // Convert SkinnedMesh to regular Mesh to avoid bone issues
        const geometry = o.geometry;
        const material = o.material;
        
        // Create a plain Mesh (not SkinnedMesh)
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Copy world transform
        mesh.position.copy(o.position);
        mesh.rotation.copy(o.rotation);
        mesh.scale.copy(o.scale);
        
        group.add(mesh);
      }
    });
    return group;
  }, [roverModel]);
  
  React.useEffect(() => {
    if (transformRef.current && groupRef.current) {
      const controls = transformRef.current;
      const handleMouseUp = () => {
        if (!groupRef.current) return;
        const { position, rotation, scale } = groupRef.current;
        
        // Immediately set targets to current position to prevent snap-back
        targetPos.current.copy(position);
        targetRot.current.copy(rotation);
        targetScale.current.copy(scale);
        
        const updates = {
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
          scale: { x: scale.x, y: scale.y, z: scale.z }
        };
        if (onTransformEnd) onTransformEnd(updates);
      };
      controls.addEventListener('mouseUp', handleMouseUp);
      return () => controls.removeEventListener('mouseUp', handleMouseUp);
    }
  }, [onTransformEnd]);
  
  React.useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(transformMode);
      transformRef.current.setTranslationSnap(snap ? translateSnap : null);
      transformRef.current.setRotationSnap(snap ? (rotateSnapDeg * Math.PI / 180) : null);
      transformRef.current.setScaleSnap(snap ? scaleSnap : null);
    }
  }, [transformMode, snap, translateSnap, rotateSnapDeg, scaleSnap]);
  
  if (!modelClone) return null;
  
  return (
    <>
      {dragMode && editMode ? (
        // Wrap in DraggableObject for free drag mode
        <DraggableObject cube={cube} editMode={editMode} dragMode={dragMode} isSelected={isSelected} onDragEnd={onTransformEnd}>
          <group
            ref={groupRef}
            rotation={[cube.rotation.x, cube.rotation.y, cube.rotation.z]}
            scale={[cube.scale.x, cube.scale.y, cube.scale.z]}
          >
            <primitive object={modelClone} />
            {cube.hasCollision && (
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color={isSelected ? '#10b981' : '#3b82f6'} wireframe opacity={0.3} transparent />
              </mesh>
            )}
          </group>
        </DraggableObject>
      ) : (
        <group
          ref={groupRef}
          position={[cube.position.x, cube.position.y, cube.position.z]}
          rotation={[cube.rotation.x, cube.rotation.y, cube.rotation.z]}
          scale={[cube.scale.x, cube.scale.y, cube.scale.z]}
        >
          <primitive object={modelClone} />
          {cube.hasCollision && editMode && (
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={isSelected ? '#10b981' : '#3b82f6'} wireframe opacity={0.3} transparent />
            </mesh>
          )}
        </group>
      )}
      {/* Always show TransformControls when selected, even in drag mode */}
      {isSelected && editMode && groupRef.current && (
        <TransformControls ref={transformRef} object={groupRef.current} mode={transformMode} enabled={!dragMode} />
      )}
    </>
  );
}

// Component for rendering custom uploaded models (dynamic path)
export function CustomPlacedModel({ cube, isSelected, onSelect, editMode, dragMode, transformMode, snap, translateSnap, rotateSnapDeg, scaleSnap, onTransformEnd, showCollisionMeshes }) {
  const groupRef = React.useRef();
  const transformRef = React.useRef();
  const isDragging = React.useRef(false); // Track if this model is currently being dragged
  
  // Store parent transform reference globally so children can access it
  React.useEffect(() => {
    if (!window.__CF_PARENT_TRANSFORMS__) {
      window.__CF_PARENT_TRANSFORMS__ = {};
    }
    if (groupRef.current) {
      window.__CF_PARENT_TRANSFORMS__[cube.id] = groupRef.current;
    }
    return () => {
      if (window.__CF_PARENT_TRANSFORMS__) {
        delete window.__CF_PARENT_TRANSFORMS__[cube.id];
      }
    };
  }, [cube.id]);
  
  // Dynamically load model based on cube.customModelPath
  const modelPath = cube.customModelPath || '';
  const modelExtension = modelPath.toLowerCase().split('.').pop();
  
  // Load FBX models
  const fbxModel = useFBX(modelExtension === 'fbx' ? modelPath : null);
  // For other formats (GLB, GLTF, etc.), we'd use useGLTF or useLoader
  // For now, focusing on FBX support like the other models
  
  const modelClone = React.useMemo(() => {
    if (!fbxModel) return null;
    const group = new THREE.Group();
    fbxModel.traverse(o => {
      if (o.isMesh || o.isSkinnedMesh) {
        const geometry = o.geometry;
        const material = o.material;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.copy(o.position);
        mesh.rotation.copy(o.rotation);
        mesh.scale.copy(o.scale);
        group.add(mesh);
      }
    });
    return group;
  }, [fbxModel]);
  
  // Calculate actual model bounding box dimensions
  const modelBounds = React.useMemo(() => {
    if (!modelClone) return { width: 1, height: 1, depth: 1 };
    const box = new THREE.Box3().setFromObject(modelClone);
    const size = new THREE.Vector3();
    box.getSize(size);
    // These are the raw model dimensions BEFORE scaling
    return { 
      width: size.x || 1, 
      height: size.y || 1, 
      depth: size.z || 1 
    };
  }, [modelClone]);
  
  // Store bounds on cube for UI to use (only once when model loads)
  React.useEffect(() => {
    if (modelBounds && cube && !cube.modelBounds) {
      // Update the cube with its bounds so UI can spawn proper collision
      if (onTransformEnd) {
        onTransformEnd({ modelBounds });
      }
    }
  }, [modelBounds, cube, onTransformEnd]);
  
  React.useEffect(() => {
    // Only set position directly from state when NOT dragging (prevents fighting with TransformControls)
    if (groupRef.current && cube && !isDragging.current) {
      // Set targets for interpolation instead of direct position
      targetPos.current.set(cube.position.x, cube.position.y, cube.position.z);
      targetRot.current.set(cube.rotation.x, cube.rotation.y, cube.rotation.z);
      targetScale.current.set(cube.scale.x, cube.scale.y, cube.scale.z);
    }
  }, [cube]);
  
  // SMOOTH INTERPOLATION for opponent's view when they see live updates
  // Store target transform and lerp toward it each frame
  const targetPos = React.useRef(new THREE.Vector3());
  const targetRot = React.useRef(new THREE.Euler());
  const targetScale = React.useRef(new THREE.Vector3(1, 1, 1));
  
  // Initialize targets on first mount
  React.useEffect(() => {
    if (cube && groupRef.current) {
      targetPos.current.set(cube.position.x, cube.position.y, cube.position.z);
      targetRot.current.set(cube.rotation.x, cube.rotation.y, cube.rotation.z);
      targetScale.current.set(cube.scale.x, cube.scale.y, cube.scale.z);
      // Set initial position directly
      groupRef.current.position.set(cube.position.x, cube.position.y, cube.position.z);
      groupRef.current.rotation.set(cube.rotation.x, cube.rotation.y, cube.rotation.z);
      groupRef.current.scale.set(cube.scale.x, cube.scale.y, cube.scale.z);
    }
  }, [cube.id]); // Only on mount/cube change
  
  // Smooth interpolation for opponent viewing your transforms
  useFrame((_, delta) => {
    if (!groupRef.current || isDragging.current) return; // Skip if you're dragging it
    
    // Super smooth interpolation - high factor for responsive feel
    const lerpFactor = Math.min(1, delta * 50);
    
    // Lerp position
    groupRef.current.position.lerp(targetPos.current, lerpFactor);
    
    // Lerp rotation
    groupRef.current.rotation.x += (targetRot.current.x - groupRef.current.rotation.x) * lerpFactor;
    groupRef.current.rotation.y += (targetRot.current.y - groupRef.current.rotation.y) * lerpFactor;
    groupRef.current.rotation.z += (targetRot.current.z - groupRef.current.rotation.z) * lerpFactor;
    
    // Lerp scale
    groupRef.current.scale.lerp(targetScale.current, lerpFactor);
  });
  
  // Main model transform controls
  React.useEffect(() => {
    if (!transformRef.current) return;
    const controls = transformRef.current;
    
    const onDraggingChanged = (event) => {
      isDragging.current = event.value; // Track drag state
      
      // Notify parent component about drag state
      if (window.__CF_SET_DRAGGING_CUBE__) {
        window.__CF_SET_DRAGGING_CUBE__(event.value);
      }
      
      if (!event.value) {
        // Drag ended - send final transform
        if (!groupRef.current || !onTransformEnd) return;
        const pos = groupRef.current.position;
        const rot = groupRef.current.rotation;
        const scl = groupRef.current.scale;
        
        // Immediately set targets to current position to prevent snap-back
        targetPos.current.copy(pos);
        targetRot.current.copy(rot);
        targetScale.current.copy(scl);
        
        onTransformEnd({
          position: { x: pos.x, y: pos.y, z: pos.z },
          rotation: { x: rot.x, y: rot.y, z: rot.z },
          scale: { x: scl.x, y: scl.y, z: scl.z }
        });
      }
    };
    
    controls.addEventListener('dragging-changed', onDraggingChanged);
    
    return () => {
      if (controls && controls.removeEventListener) {
        controls.removeEventListener('dragging-changed', onDraggingChanged);
      }
    };
  }, [onTransformEnd]);
  
  // LIVE TRANSFORM BROADCAST - Send position/rotation/scale to opponent in real-time while dragging
  const lastBroadcastRef = React.useRef(0);
  useFrame(() => {
    if (!isDragging.current || !groupRef.current) return;
    
    // Throttle broadcasts to ~30fps (every ~33ms) to avoid overwhelming the network
    const now = performance.now();
    if (now - lastBroadcastRef.current < 33) return;
    lastBroadcastRef.current = now;
    
    // Broadcast live transform to opponent
    if (onTransformEnd) {
      const pos = groupRef.current.position;
      const rot = groupRef.current.rotation;
      const scl = groupRef.current.scale;
      onTransformEnd({
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotation: { x: rot.x, y: rot.y, z: rot.z },
        scale: { x: scl.x, y: scl.y, z: scl.z },
        isLive: true // Flag to indicate this is a live update, not final
      });
    }
  });
  
  React.useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setTranslationSnap(snap && translateSnap ? translateSnap : null);
      transformRef.current.setRotationSnap(snap && rotateSnapDeg ? THREE.MathUtils.degToRad(rotateSnapDeg) : null);
      transformRef.current.setScaleSnap(snap && scaleSnap ? scaleSnap : null);
    }
  }, [snap, translateSnap, rotateSnapDeg, scaleSnap]);
  
  if (!modelClone) return null;
  
  return (
    <>
      {dragMode && !isSelected ? (
        <DraggableObject initialPosition={cube.position} onDragEnd={onTransformEnd}>
          <group ref={groupRef} onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(); }}>
            <primitive object={modelClone} />
          </group>
        </DraggableObject>
      ) : (
        <group ref={groupRef} onClick={(e) => { e.stopPropagation(); if (onSelect && editMode) onSelect(); }}>
          <primitive object={modelClone} />
          
          {isSelected && editMode && (
            <mesh visible={false}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={isSelected ? '#10b981' : '#3b82f6'} wireframe opacity={0.3} transparent />
            </mesh>
          )}
        </group>
      )}
      
      {/* Main model transform controls */}
      {isSelected && editMode && groupRef.current && (
        <TransformControls ref={transformRef} object={groupRef.current} mode={transformMode} enabled={!dragMode} />
      )}
    </>
  );
}

// Component for rendering table models
export function TablePlacedModel({ cube, isSelected, editMode, dragMode, transformMode, snap, translateSnap, rotateSnapDeg, scaleSnap, onTransformEnd }) {
  const groupRef = React.useRef();
  const transformRef = React.useRef();
  const tableModel = useFBX('/models/props/table/table.fbx');
  
  // Interpolation targets for smooth opponent view
  const targetPos = React.useRef(new THREE.Vector3());
  const targetRot = React.useRef(new THREE.Euler());
  const targetScale = React.useRef(new THREE.Vector3(1, 1, 1));
  
  const modelClone = React.useMemo(() => {
    if (!tableModel) return null;
    const clone = skeletonClone(tableModel);
    clone.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return clone;
  }, [tableModel]);
  
  React.useEffect(() => {
    if (transformRef.current && groupRef.current) {
      const controls = transformRef.current;
      const handleMouseUp = () => {
        if (!groupRef.current) return;
        const { position, rotation, scale } = groupRef.current;
        
        // Immediately set targets to current position to prevent snap-back
        targetPos.current.copy(position);
        targetRot.current.copy(rotation);
        targetScale.current.copy(scale);
        
        const updates = {
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
          scale: { x: scale.x, y: scale.y, z: scale.z }
        };
        if (onTransformEnd) onTransformEnd(updates);
      };
      controls.addEventListener('mouseUp', handleMouseUp);
      return () => controls.removeEventListener('mouseUp', handleMouseUp);
    }
  }, [onTransformEnd]);
  
  React.useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(transformMode);
      transformRef.current.setTranslationSnap(snap ? translateSnap : null);
      transformRef.current.setRotationSnap(snap ? (rotateSnapDeg * Math.PI / 180) : null);
      transformRef.current.setScaleSnap(snap ? scaleSnap : null);
    }
  }, [transformMode, snap, translateSnap, rotateSnapDeg, scaleSnap]);
  
  if (!modelClone) return null;
  
  return (
    <>
      {dragMode && editMode ? (
        // Wrap in DraggableObject for free drag mode
        <DraggableObject cube={cube} editMode={editMode} dragMode={dragMode} isSelected={isSelected} onDragEnd={onTransformEnd}>
          <group
            ref={groupRef}
            rotation={[cube.rotation.x, cube.rotation.y, cube.rotation.z]}
            scale={[cube.scale.x, cube.scale.y, cube.scale.z]}
          >
            <primitive object={modelClone} />
            {cube.hasCollision && (
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color={isSelected ? '#10b981' : '#3b82f6'} wireframe opacity={0.3} transparent />
              </mesh>
            )}
          </group>
        </DraggableObject>
      ) : (
        <group
          ref={groupRef}
          position={[cube.position.x, cube.position.y, cube.position.z]}
          rotation={[cube.rotation.x, cube.rotation.y, cube.rotation.z]}
          scale={[cube.scale.x, cube.scale.y, cube.scale.z]}
        >
          <primitive object={modelClone} />
          {cube.hasCollision && editMode && (
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={isSelected ? '#10b981' : '#3b82f6'} wireframe opacity={0.3} transparent />
            </mesh>
          )}
        </group>
      )}
      {/* Always show TransformControls when selected, even in drag mode */}
      {isSelected && editMode && groupRef.current && (
        <TransformControls ref={transformRef} object={groupRef.current} mode={transformMode} enabled={!dragMode} />
      )}
    </>
  );
}

// Terrain Sculpting Tool - displays brush cursor and handles sculpting interactions

// Terrain geometry generator with procedural noise
// Floating labels for terrain identification


// Edge snapping helper for terrain floors
// Detects ALL edges that can snap to neighbors - supports multiple simultaneous snaps
export function detectEdgeSnap(movingCube, allCubes, snapDistance = 2.0) {
  if (!movingCube.isTerrain) return null;
  
  const snapThreshold = snapDistance;
  const movingHalfX = movingCube.scale.x / 2;
  const movingHalfZ = movingCube.scale.z / 2;
  
  // Calculate moving cube's edge center positions and directions
  const cosY = Math.cos(movingCube.rotation.y);
  const sinY = Math.sin(movingCube.rotation.y);
  
  // Edge centers and their perpendicular direction vectors
  const movingEdges = {
    north: { 
      center: { x: movingCube.position.x + movingHalfZ * sinY, z: movingCube.position.z + movingHalfZ * cosY },
      perpDir: { x: sinY, z: cosY }, // Direction perpendicular to edge (outward normal)
      parallelDir: { x: cosY, z: -sinY } // Direction parallel to edge
    },
    south: { 
      center: { x: movingCube.position.x - movingHalfZ * sinY, z: movingCube.position.z - movingHalfZ * cosY },
      perpDir: { x: -sinY, z: -cosY },
      parallelDir: { x: cosY, z: -sinY }
    },
    east: { 
      center: { x: movingCube.position.x + movingHalfX * cosY, z: movingCube.position.z - movingHalfX * sinY },
      perpDir: { x: cosY, z: -sinY },
      parallelDir: { x: sinY, z: cosY }
    },
    west: { 
      center: { x: movingCube.position.x - movingHalfX * cosY, z: movingCube.position.z + movingHalfX * sinY },
      perpDir: { x: -cosY, z: sinY },
      parallelDir: { x: sinY, z: cosY }
    }
  };
  
  // Collect ALL snap connections (up to 4 edges can snap simultaneously)
  const snapConnections = {};
  let totalSnapOffsetX = 0;
  let totalSnapOffsetY = 0;
  let totalSnapOffsetZ = 0;
  let snapCount = 0;
  
  // Maximum center-to-center distance to even consider snapping (prevent far away terrains from snapping)
  // Use half the sum of both cubes' dimensions plus a small buffer
  const movingMaxDim = Math.max(movingCube.scale.x, movingCube.scale.z);
  
  // Check against all other terrain cubes
  for (const targetCube of allCubes) {
    if (!targetCube.isTerrain || targetCube.id === movingCube.id) continue;
    
    const targetMaxDim = Math.max(targetCube.scale.x, targetCube.scale.z);
    
    // Pre-filter: Skip if cubes are too far apart (center-to-center)
    // They should only snap if within reach of their combined edge distances + snap threshold
    const maxReasonableDistance = (movingMaxDim / 2) + (targetMaxDim / 2) + snapThreshold + 5;
    const centerDist = Math.sqrt(
      Math.pow(targetCube.position.x - movingCube.position.x, 2) +
      Math.pow(targetCube.position.z - movingCube.position.z, 2)
    );
    
    if (centerDist > maxReasonableDistance) {
      continue; // Too far away, skip this target
    }
    
    const targetHalfX = targetCube.scale.x / 2;
    const targetHalfZ = targetCube.scale.z / 2;
    const targetCosY = Math.cos(targetCube.rotation.y);
    const targetSinY = Math.sin(targetCube.rotation.y);
    
    const targetEdges = {
      north: { 
        center: { x: targetCube.position.x + targetHalfZ * targetSinY, z: targetCube.position.z + targetHalfZ * targetCosY },
        perpDir: { x: targetSinY, z: targetCosY },
        parallelDir: { x: targetCosY, z: -targetSinY }
      },
      south: { 
        center: { x: targetCube.position.x - targetHalfZ * targetSinY, z: targetCube.position.z - targetHalfZ * targetCosY },
        perpDir: { x: -targetSinY, z: -targetCosY },
        parallelDir: { x: targetCosY, z: -targetSinY }
      },
      east: { 
        center: { x: targetCube.position.x + targetHalfX * targetCosY, z: targetCube.position.z - targetHalfX * targetSinY },
        perpDir: { x: targetCosY, z: -targetSinY },
        parallelDir: { x: targetSinY, z: targetCosY }
      },
      west: { 
        center: { x: targetCube.position.x - targetHalfX * targetCosY, z: targetCube.position.z + targetHalfX * targetSinY },
        perpDir: { x: -targetCosY, z: targetSinY },
        parallelDir: { x: targetSinY, z: targetCosY }
      }
    };
    
    // Check all edge combinations for proximity
    const edgePairs = [
      ['north', 'south'], ['south', 'north'],
      ['east', 'west'], ['west', 'east']
    ];
    
    for (const [movingEdgeName, targetEdgeName] of edgePairs) {
      const movingEdge = movingEdges[movingEdgeName];
      const targetEdge = targetEdges[targetEdgeName];
      
      // Calculate perpendicular distance from moving edge to target edge
      // Vector from target edge to moving edge
      const dx = movingEdge.center.x - targetEdge.center.x;
      const dz = movingEdge.center.z - targetEdge.center.z;
      
      // Project onto target edge's perpendicular direction (distance perpendicular to edge)
      const perpDistance = Math.abs(dx * targetEdge.perpDir.x + dz * targetEdge.perpDir.z);
      
      if (perpDistance < snapThreshold) {
        // Only store if this is closer than any existing connection for this edge
        if (!snapConnections[movingEdgeName] || perpDistance < snapConnections[movingEdgeName].perpDistance) {
          // Calculate parallel offset (how far off-center the edges are along the edge direction)
          const parallelOffset = dx * targetEdge.parallelDir.x + dz * targetEdge.parallelDir.z;
          
          // Calculate snap offsets to align edges flush (no gap, no overlap)
          const signedPerpDist = dx * targetEdge.perpDir.x + dz * targetEdge.perpDir.z;
          
          // ONLY align perpendicular (make flush) - don't adjust parallel offset
          // Parallel offset correction can cause issues at corners
          const snapOffsetX = -signedPerpDist * targetEdge.perpDir.x;
          const snapOffsetZ = -signedPerpDist * targetEdge.perpDir.z;
          
          // Calculate Y position to align BOTTOM of terrains (base alignment)
          // Edge blending will handle the height matching at the edges
          // Don't use collision box top - that causes slight lift when blending adjusts heights
          const movingBottom = movingCube.position.y - (movingCube.scale.y / 2);
          const targetBottom = targetCube.position.y - (targetCube.scale.y / 2);
          const yOffset = targetBottom - movingBottom;
          
          // Store this snap connection (overwrite if this is closer)
          snapConnections[movingEdgeName] = {
            targetCubeId: targetCube.id,
            targetEdge: targetEdgeName,
            snapOffset: { x: snapOffsetX, y: yOffset, z: snapOffsetZ },
            perpDistance
          };
        }
      }
    }
  }
  
  // If we found any snaps, calculate the combined offset
  snapCount = Object.keys(snapConnections).length;
  
  if (snapCount > 0) {
    let combinedSnapOffset;
    
    if (snapCount === 1) {
      // Single edge - use the offset directly from the initial detection
      const connection = Object.values(snapConnections)[0];
      combinedSnapOffset = { ...connection.snapOffset };
    } else {
      // Multiple edges (corner snap)
      // At corners, we need BOTH edge corrections applied independently
      // Don't sum - use each edge's full correction for its respective axis
      const connections = Object.entries(snapConnections);
      let xOffset = 0, zOffset = 0, ySum = 0;
      
      for (const [edgeName, conn] of connections) {
        ySum += conn.snapOffset.y;
        
        // North/South edges correct Z position
        if (edgeName === 'north' || edgeName === 'south') {
          zOffset = conn.snapOffset.z;
        }
        // East/West edges correct X position  
        else if (edgeName === 'east' || edgeName === 'west') {
          xOffset = conn.snapOffset.x;
        }
      }
      
      combinedSnapOffset = {
        x: xOffset,
        y: ySum / snapCount,
        z: zOffset
      };
    }
    
    return {
      snapConnections, // Object: { edgeName: { targetCubeId, targetEdge, snapOffset, perpDistance } }
      averageSnapOffset: combinedSnapOffset, // Use this for position adjustment
      snapCount
    };
  }
  
  return null;
}

// AI Content Renderer - converts structured data to Three.js meshes
export function AIContentRenderer({ contentData, boxScale, position, rotation }) {
  console.log('[AIContentRenderer] Called with:', { contentData, boxScale, position, rotation });
  
  if (!contentData || !contentData.type) {
    console.log('[AIContentRenderer] No content data or type');
    return null;
  }
  
  console.log('[AIContentRenderer] Rendering', contentData.parts?.length, 'parts');
  
  // contentData structure example:
  // {
  //   type: 'robot',
  //   parts: [
  //     { name: 'head', shape: 'sphere', position: [0, 0.3, 0], scale: [0.2, 0.2, 0.2], color: '#ffcc00' },
  //     { name: 'body', shape: 'box', position: [0, 0, 0], scale: [0.3, 0.4, 0.25], color: '#3366ff' },
  //     ...
  //   ]
  // }
  
  return (
    <group position={position} rotation={rotation}>
      {contentData.parts && contentData.parts.map((part, index) => {
        // Convert 0-1 normalized coordinates to centered positions
        // 0.5 = center, so we need to offset by -0.5 and then scale
        const scaledPos = [
          (part.position[0] - 0.5) * boxScale.x,
          (part.position[1] - 0.5) * boxScale.y,
          (part.position[2] - 0.5) * boxScale.z
        ];
        const scaledScale = [
          part.scale[0] * boxScale.x,
          part.scale[1] * boxScale.y,
          part.scale[2] * boxScale.z
        ];
        
        return (
          <mesh
            key={`${contentData.type}-${part.name}-${index}`}
            position={scaledPos}
            rotation={part.rotation || [0, 0, 0]}
            castShadow
            receiveShadow
          >
            {part.shape === 'sphere' && <sphereGeometry args={[scaledScale[0], 32, 32]} />}
            {part.shape === 'box' && <boxGeometry args={scaledScale} />}
            {part.shape === 'cylinder' && <cylinderGeometry args={[scaledScale[0], scaledScale[0], scaledScale[1], 32]} />}
            {part.shape === 'cone' && <coneGeometry args={[scaledScale[0], scaledScale[1], 32]} />}
            {part.shape === 'torus' && <torusGeometry args={[scaledScale[0], scaledScale[1], 16, 32]} />}
            
            <meshStandardMaterial
              color={part.color || '#ffffff'}
              metalness={part.metalness || 0.3}
              roughness={part.roughness || 0.7}
              emissive={part.emissive || '#000000'}
              emissiveIntensity={part.emissiveIntensity || 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Component to sync AI content position with mesh position
export function AIContentSyncedWithMesh({ meshRef, contentData, cubePosition, cubeRotation, cubeScale, isSelected }) {
  const groupRef = React.useRef();
  
  // Sync position with mesh on every frame when selected
  useFrame(() => {
    if (meshRef.current && groupRef.current) {
      if (isSelected) {
        // Follow meshRef position when selected (being transformed)
        groupRef.current.position.copy(meshRef.current.position);
        groupRef.current.rotation.copy(meshRef.current.rotation);
        groupRef.current.scale.copy(meshRef.current.scale);
      }
    }
  });
  
  // Set initial position from cube state
  React.useEffect(() => {
    if (groupRef.current && !isSelected) {
      groupRef.current.position.set(cubePosition.x, cubePosition.y, cubePosition.z);
      groupRef.current.rotation.set(cubeRotation.x, cubeRotation.y, cubeRotation.z);
      groupRef.current.scale.set(cubeScale.x, cubeScale.y, cubeScale.z);
    }
  }, [cubePosition, cubeRotation, cubeScale, isSelected]);
  
  return (
    <group ref={groupRef}>
      <AIContentRenderer
        contentData={contentData}
        boxScale={{ x: 1, y: 1, z: 1 }}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}

export function PlacedCube({ cube, isSelected, onSelect, editMode, dragMode, transformMode, snap, translateSnap, rotateSnapDeg, scaleSnap, onTransformEnd, showCollisionMeshes, orbitControlsRef, snapConfirmDialog, setSnapConfirmDialog, pendingSnapCubeId, setPendingSnapCubeId, placedCubes }) {
  const meshRef = React.useRef();
  const transformRef = React.useRef();
  const [isSnapped, setIsSnapped] = React.useState(false);
  
  // If this cube is a child (has parentId), follow parent's transform in real-time
  useFrame(() => {
    if (cube.parentId && meshRef.current) {
      const parentTransform = window.__CF_PARENT_TRANSFORMS__?.[cube.parentId];
      if (parentTransform && cube.followParentScale) {
        // Get parent's current transform from the scene
        meshRef.current.position.copy(parentTransform.position);
        
        // Recalculate scale based on parent's bounds and current scale
        const parentCube = CURRENT_PLACED_CUBES.find(c => c.id === cube.parentId);
        if (parentCube && parentCube.modelBounds) {
          const bounds = parentCube.modelBounds;
          meshRef.current.scale.set(
            bounds.width * parentTransform.scale.x,
            bounds.height * parentTransform.scale.y,
            bounds.depth * parentTransform.scale.z
          );
        }
        
        // Force update of mesh matrix for all children (helpers, wireframes, etc.)
        meshRef.current.updateMatrix();
        meshRef.current.updateMatrixWorld(true); // true = force update children
        
        // Update TransformControls to follow the mesh
        if (transformRef.current) {
          transformRef.current.updateMatrixWorld();
        }
      }
    }
  });
  
  // Render primitive shapes (box/sphere) for collision objects
  // Send live transform updates while dragging + final on mouseUp
  const isDragging = React.useRef(false);
  const lastBroadcastRef = React.useRef(0);
  
  React.useEffect(() => {
    if (transformRef.current && meshRef.current) {
      const controls = transformRef.current;
      
      const handleDraggingChanged = (event) => {
        isDragging.current = event.value;
        
        // When starting to drag a terrain, clear its snappedEdges
        // because it's no longer in the snapped position
        if (event.value && cube.isTerrain && cube.snappedEdges && Object.keys(cube.snappedEdges).length > 0) {
          if (onTransformEnd) {
            onTransformEnd({ snappedEdges: {} });
          }
        }
      };
      
      const handleMouseUp = () => {
        if (!meshRef.current) return;
        const { position, rotation, scale } = meshRef.current;
        
        // Immediately set targets to current position to prevent snap-back
        targetPos.current.copy(position);
        targetRot.current.copy(rotation);
        targetScale.current.copy(scale);
        
        // Check for snap at the FINAL position (mouseUp), not during drag
        if (cube.isTerrain) {
          const mainFloorTerrain = {
            id: 'main-floor',
            isTerrain: true,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 100, y: 1, z: 100 },
            hasTerrainNoise: true
          };
          
          const snapInfo = detectEdgeSnap(
            {
              ...cube,
              position: { x: position.x, y: position.y, z: position.z },
              rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
              scale: { x: scale.x, y: scale.y, z: scale.z }
            },
            [...CURRENT_PLACED_CUBES, mainFloorTerrain],
            2.0
          );
          
          if (snapInfo) {
            // Build detailed message showing terrain IDs and edges
            const connections = Object.entries(snapInfo.snapConnections).map(([edgeName, conn]) => {
              const terrainCubes = placedCubes.filter(c => c.isTerrain);
              const terrainIndex = terrainCubes.findIndex(c => c.id === conn.targetCubeId) + 1;
              return `Terrain #${terrainIndex} (${edgeName} edge)`;
            }).join(', ');
            
            // Show confirmation dialog with CURRENT position (at mouseUp)
            setSnapConfirmDialog({
              cubeId: cube.id,
              snapInfo: snapInfo,
              position: { x: position.x, y: position.y, z: position.z }, // Use current position, not pre-snap
              message: `Edge snapping detected!\nSnapping to ${connections}\nDo you want to snap?`
            });
            setPendingSnapCubeId(cube.id);
            return; // Don't send transform update yet
          }
        }
        
        // Check if snap was detected during drag (old path, shouldn't happen now)
        if (meshRef.current.userData.pendingSnapInfo) {
          const snapInfo = meshRef.current.userData.pendingSnapInfo;
          
          // Build detailed message showing terrain IDs and edges
          const connections = Object.entries(snapInfo.snapConnections).map(([edgeName, conn]) => {
            const terrainCubes = placedCubes.filter(c => c.isTerrain);
            const terrainIndex = terrainCubes.findIndex(c => c.id === conn.targetCubeId) + 1;
            return `Terrain #${terrainIndex} (${edgeName} edge)`;
          }).join(', ');
          
          // Show confirmation dialog
          setSnapConfirmDialog({
            cubeId: cube.id,
            snapInfo: snapInfo,
            position: { ...meshRef.current.userData.preSnapPosition },
            message: `Edge snapping detected!\nSnapping to ${connections}\nDo you want to snap?`
          });
          setPendingSnapCubeId(cube.id);
          return; // Don't send transform update yet
        }
        
        const updates = {
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
          scale: { x: scale.x, y: scale.y, z: scale.z }
        };
        
        // Include snap information if present (supports multiple edges)
        if (meshRef.current.userData.snapInfo && meshRef.current.userData.snapInfo.snapConnections) {
          // Convert snapConnections to snappedEdges format: { edgeName: neighborCubeId }
          const snappedEdges = {};
          for (const [edgeName, connection] of Object.entries(meshRef.current.userData.snapInfo.snapConnections)) {
            snappedEdges[edgeName] = connection.targetCubeId;
          }
          updates.snappedEdges = snappedEdges;
        } else {
          updates.snappedEdges = {};
        }
        
        // Send final snapped position to opponent
        if (onTransformEnd) onTransformEnd(updates);
      };
      
      controls.addEventListener('dragging-changed', handleDraggingChanged);
      controls.addEventListener('mouseUp', handleMouseUp);
      return () => {
        controls.removeEventListener('dragging-changed', handleDraggingChanged);
        controls.removeEventListener('mouseUp', handleMouseUp);
      };
    }
  }, [onTransformEnd, cube.isTerrain, cube.snappedEdges, placedCubes]);
  
  // LIVE TRANSFORM BROADCAST for primitives (box/sphere/cylinder)
  // Also applies edge snapping for terrain floors
  useFrame(() => {
    if (!isDragging.current || !meshRef.current) return;
    
    // Throttle to ~30fps
    const now = performance.now();
    if (now - lastBroadcastRef.current < 33) return;
    lastBroadcastRef.current = now;
    
    const { position, rotation, scale } = meshRef.current;
    
    // Apply edge snapping for terrain floors during translate mode
    if (cube.isTerrain && transformMode === 'translate') {
      // Skip snap detection if this cube is already pending confirmation
      if (pendingSnapCubeId === cube.id) return;
      
      // Create virtual main floor terrain for snapping
      const mainFloorTerrain = {
        id: 'main-floor',
        isTerrain: true,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 100, y: 1, z: 100 }, // Approximate size of main floor
        hasTerrainNoise: true
      };
      
      const snapInfo = detectEdgeSnap(
        {
          ...cube,
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
          scale: { x: scale.x, y: scale.y, z: scale.z }
        },
        [...CURRENT_PLACED_CUBES, mainFloorTerrain], // Include main floor in snap candidates
        2.0 // Snap distance threshold
      );
      
      if (snapInfo) {
        // Store snap info but DON'T apply yet - show confirmation dialog
        meshRef.current.userData.pendingSnapInfo = snapInfo;
        meshRef.current.userData.preSnapPosition = { x: position.x, y: position.y, z: position.z };
        setIsSnapped(true);
      } else {
        delete meshRef.current.userData.pendingSnapInfo;
        delete meshRef.current.userData.preSnapPosition;
        setIsSnapped(false);
      }
    }
    
    if (onTransformEnd) {
      // Convert snapConnections to snappedEdges for broadcast
      const snappedEdges = {};
      if (meshRef.current.userData.snapInfo && meshRef.current.userData.snapInfo.snapConnections) {
        for (const [edgeName, connection] of Object.entries(meshRef.current.userData.snapInfo.snapConnections)) {
          snappedEdges[edgeName] = connection.targetCubeId;
        }
      }
      
      onTransformEnd({
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        scale: { x: scale.x, y: scale.y, z: scale.z },
        isLive: true,
        snappedEdges: snappedEdges
      });
    }
  });
  
  // Update transform controls mode and snap
  React.useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(transformMode);
      transformRef.current.setTranslationSnap(snap ? translateSnap : null);
      transformRef.current.setRotationSnap(snap ? (rotateSnapDeg * Math.PI / 180) : null);
      transformRef.current.setScaleSnap(snap ? scaleSnap : null);
    }
  }, [transformMode, snap, translateSnap, rotateSnapDeg, scaleSnap]);
  
  // SMOOTH INTERPOLATION for primitives (box/sphere/cylinder) when opponent sees live updates
  const targetPos = React.useRef(new THREE.Vector3());
  const targetRot = React.useRef(new THREE.Euler());
  const targetScale = React.useRef(new THREE.Vector3(1, 1, 1));
  
  // When FIRST selected, initialize position from cube state
  // (Only when transitioning from unselected -> selected, not the reverse)
  const wasSelected = React.useRef(false);
  React.useEffect(() => {
    if (isSelected && !wasSelected.current && meshRef.current && cube) {
      // Transitioning to selected state - set initial position
      meshRef.current.position.set(cube.position.x, cube.position.y, cube.position.z);
      meshRef.current.rotation.set(cube.rotation.x, cube.rotation.y, cube.rotation.z);
      meshRef.current.scale.set(cube.scale.x, cube.scale.y, cube.scale.z);
      // Also set targets to prevent lerping
      targetPos.current.set(cube.position.x, cube.position.y, cube.position.z);
      targetRot.current.set(cube.rotation.x, cube.rotation.y, cube.rotation.z);
      targetScale.current.set(cube.scale.x, cube.scale.y, cube.scale.z);
    }
    wasSelected.current = isSelected;
  }, [isSelected, cube]);
  
  React.useEffect(() => {
    if (cube && !cube.parentId && !isDragging.current) {
      targetPos.current.set(cube.position.x, cube.position.y, cube.position.z);
      targetRot.current.set(cube.rotation.x, cube.rotation.y, cube.rotation.z);
      targetScale.current.set(cube.scale.x, cube.scale.y, cube.scale.z);
    }
  }, [cube]);
  
  // Ultra-smooth interpolation for opponent watching the transform
  useFrame((_, delta) => {
    if (!meshRef.current || isDragging.current || cube.parentId) return;
    
    const lerpFactor = Math.min(1, delta * 50); // Super smooth for opponent
    
    meshRef.current.position.lerp(targetPos.current, lerpFactor);
    meshRef.current.rotation.x += (targetRot.current.x - meshRef.current.rotation.x) * lerpFactor;
    meshRef.current.rotation.y += (targetRot.current.y - meshRef.current.rotation.y) * lerpFactor;
    meshRef.current.rotation.z += (targetRot.current.z - meshRef.current.rotation.z) * lerpFactor;
    meshRef.current.scale.lerp(targetScale.current, lerpFactor);
  });
  
  // Load texture if cube has one (for terrain) - MUST be before any conditional returns
  const [texture, setTexture] = React.useState(null);
  
  React.useEffect(() => {
    if (cube.texture && cube.texture !== '') {
      console.log('[TEXTURE LOAD] 📥 Loading texture:', cube.texture, 'for cube:', cube.id);
      const loader = new THREE.TextureLoader();
      loader.load(
        cube.texture,
        (loadedTexture) => {
          console.log('[TEXTURE LOAD] ✅ Successfully loaded:', cube.texture, 'for cube:', cube.id);
          if (cube.isTerrain) {
            loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;
            const repeatScale = cube.textureRepeat || 10;
            loadedTexture.repeat.set(repeatScale, repeatScale);
          }
          setTexture(loadedTexture);
        },
        undefined,
        (err) => {
          console.error('[TEXTURE LOAD] ❌ Failed to load:', cube.texture, err);
          setTexture(null);
        }
      );
    } else {
      console.log('[TEXTURE LOAD] ⭕ No texture for cube:', cube.id, '(isTerrain:', cube.isTerrain, 'texture:', cube.texture, ')');
      setTexture(null);
    }
  }, [cube.texture, cube.isTerrain, cube.textureRepeat, cube.id]);
  
  // Update texture repeat to maintain square tiles even with non-uniform scaling
  React.useEffect(() => {
    if (texture && cube.isTerrain) {
      const repeatValue = cube.textureRepeat || 10;
      const scaleX = cube.scale?.x || 1;
      const scaleZ = cube.scale?.z || 1;
      
      // Calculate aspect ratio and adjust repeat to keep tiles square
      // If floor is wider in X, use more repeat in X direction
      const aspectRatio = scaleX / scaleZ;
      
      if (aspectRatio > 1) {
        // Wider in X direction
        texture.repeat.set(repeatValue * aspectRatio, repeatValue);
      } else {
        // Wider in Z direction (or square)
        texture.repeat.set(repeatValue, repeatValue / aspectRatio);
      }
      
      texture.needsUpdate = true;
    }
  }, [texture, cube.textureRepeat, cube.scale?.x, cube.scale?.z, cube.isTerrain]);
  
  // Debug: Log material properties for terrain - MUST be before any conditional returns
  React.useEffect(() => {
    if (cube.isTerrain) {
      console.log('[MATERIAL DEBUG] Cube:', cube.id, {
        hasTextureProp: !!cube.texture,
        textureValue: cube.texture,
        textureState: texture ? 'loaded' : 'null',
        willShowColor: texture ? '#ffffff' : '#22c55e'
      });
    }
  }, [cube.isTerrain, cube.texture, texture, cube.id]);
  
  // Define shape variables - MUST be before any conditional returns
  const isSphere = cube.shape === 'sphere';
  const isCylinder = cube.shape === 'cylinder';
  
  // Route to specialized components for 3D models (after all hooks)
  // Check for customModelPath first (handles all models from props folder)
  if (cube.customModelPath) {
    return (
      <Suspense fallback={null}>
        <CustomPlacedModel cube={cube} isSelected={isSelected} onSelect={onSelect} editMode={editMode} dragMode={dragMode} transformMode={transformMode} snap={snap} translateSnap={translateSnap} rotateSnapDeg={rotateSnapDeg} scaleSnap={scaleSnap} onTransformEnd={onTransformEnd} showCollisionMeshes={showCollisionMeshes} />
      </Suspense>
    );
  }
  
  // Legacy hardcoded model types (for backward compatibility)
  if (cube.modelType === 'asteroid') {
    return (
      <Suspense fallback={null}>
        <AsteroidPlacedModel cube={cube} isSelected={isSelected} onSelect={onSelect} editMode={editMode} dragMode={dragMode} transformMode={transformMode} snap={snap} translateSnap={translateSnap} rotateSnapDeg={rotateSnapDeg} scaleSnap={scaleSnap} onTransformEnd={onTransformEnd} />
      </Suspense>
    );
  }
  
  if (cube.modelType === 'rover') {
    return (
      <Suspense fallback={null}>
        <RoverPlacedModel cube={cube} isSelected={isSelected} onSelect={onSelect} editMode={editMode} dragMode={dragMode} transformMode={transformMode} snap={snap} translateSnap={translateSnap} rotateSnapDeg={rotateSnapDeg} scaleSnap={scaleSnap} onTransformEnd={onTransformEnd} />
      </Suspense>
    );
  }
  
  if (cube.modelType === 'table') {
    return (
      <Suspense fallback={null}>
        <TablePlacedModel cube={cube} isSelected={isSelected} onSelect={onSelect} editMode={editMode} dragMode={dragMode} transformMode={transformMode} snap={snap} translateSnap={translateSnap} rotateSnapDeg={rotateSnapDeg} scaleSnap={scaleSnap} onTransformEnd={onTransformEnd} />
      </Suspense>
    );
  }
  
  if (cube.modelType === 'stairs2') {
    return (
      <Suspense fallback={null}>
        <Stairs2PlacedModel cube={cube} isSelected={isSelected} editMode={editMode} dragMode={dragMode} transformMode={transformMode} snap={snap} translateSnap={translateSnap} rotateSnapDeg={rotateSnapDeg} scaleSnap={scaleSnap} onTransformEnd={onTransformEnd} showCollisionBoxes={showCollisionMeshes} />
      </Suspense>
    );
  }
  
  // Don't render anything if collision meshes are hidden (except terrain - always show terrain)
  if (!showCollisionMeshes && !cube.isTerrain && !cube.isAIBox) return null;
  
  // Render primitive shapes (box/sphere/cylinder) for collision objects
  return (
    <>
      {dragMode && editMode ? (
        // Wrap in DraggableObject for free drag mode
        <DraggableObject cube={cube} editMode={editMode} dragMode={dragMode} isSelected={isSelected} onDragEnd={onTransformEnd}>
          <mesh
            ref={meshRef}
            rotation={[cube.rotation.x, cube.rotation.y, cube.rotation.z]}
            scale={[cube.scale.x, cube.scale.y, cube.scale.z]}
            castShadow
            receiveShadow
          >
            {isSphere ? (
              <sphereGeometry args={[0.5, 32, 32]} />
            ) : isCylinder ? (
              <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
            ) : (
              <boxGeometry args={[1, 1, 1]} />
            )}
            <meshStandardMaterial 
              key={`material-${cube.id}-${texture ? 'textured' : 'notextured'}-${cube.isAIBox ? 'aibox' : 'normal'}`}
              color={isSelected && !cube.isTerrain ? '#10b981' : (cube.isTerrain ? (texture ? '#ffffff' : '#22c55e') : cube.color)}
              metalness={0.3}
              roughness={0.7}
              transparent={cube.isTerrain ? !texture : true}
              opacity={cube.isAIBox ? 0.15 : (cube.isTerrain ? (texture ? 1 : 0.6) : (texture ? 1 : 0.7))}
              wireframe={cube.isAIBox || !cube.hasCollision}
              map={texture || undefined}
            />
          </mesh>
        </DraggableObject>
      ) : (
        <group>
          {/* Main collision box - always render but make invisible when terrain noise is on and collision boxes hidden */}
          <mesh
            ref={(el) => {
              meshRef.current = el;
              if (el && cube.hasCollision && !cube.isTerrain && !cube.isAIBox) {
                el.userData.isDestructible = true;
                if (!el.userData.health) el.userData.health = 100;
              }
              if (el && cube.isTerrain) {
                el.userData.isTerrain = true;
              }
            }}
            position={cube.parentId || isSelected ? undefined : [cube.position.x, cube.position.y, cube.position.z]}
            rotation={isSelected ? undefined : [cube.rotation.x, cube.rotation.y, cube.rotation.z]}
            scale={cube.parentId || isSelected ? undefined : [cube.scale.x, cube.scale.y, cube.scale.z]}
            castShadow={!(cube.isTerrain && cube.hasTerrainNoise && !showCollisionMeshes)}
            receiveShadow={!(cube.isTerrain && cube.hasTerrainNoise && !showCollisionMeshes)}
            onClick={(e) => {
              if (editMode) {
                e.stopPropagation();
                onSelect();
              }
            }}
            visible={
              cube.isAIBox 
                ? (showCollisionMeshes || isSelected) // AI Box visible when collision meshes shown OR when selected
                : !(cube.isTerrain && cube.hasTerrainNoise && !showCollisionMeshes)
            }
          >
            {isSphere ? (
              <sphereGeometry args={[0.5, 32, 32]} />
            ) : isCylinder ? (
              <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
            ) : (
              <boxGeometry args={[1, 1, 1]} />
            )}
            <meshStandardMaterial 
              key={`material-${cube.id}-${texture ? 'textured' : 'notextured'}-${cube.hasTerrainNoise ? 'terrain' : 'flat'}-${isSnapped ? 'snapped' : 'unsnapped'}-${cube.isAIBox ? 'aibox' : 'normal'}`}
              color={isSelected && !cube.isTerrain ? '#10b981' : (isSnapped && cube.isTerrain ? '#0ea5e9' : (cube.isTerrain ? (cube.hasTerrainNoise ? '#22c55e' : (texture ? '#ffffff' : '#22c55e')) : cube.color))}
              metalness={0.3}
              roughness={0.7}
              transparent={cube.isTerrain ? true : true}
              opacity={cube.isAIBox ? 0.15 : (cube.isTerrain ? (cube.hasTerrainNoise ? 0.6 : (texture ? 1 : 0.6)) : (editMode ? (texture ? 1 : 0.7) : (texture ? 1 : 0.5)))}
              wireframe={cube.isAIBox || !cube.hasCollision}
              map={cube.isTerrain && cube.hasTerrainNoise ? undefined : (texture || undefined)}
              emissive={isSnapped && cube.isTerrain ? '#0ea5e9' : (cube.isAIBox ? '#22d3ee' : '#000000')}
              emissiveIntensity={isSnapped && cube.isTerrain ? 0.5 : (cube.isAIBox ? 0.5 : 0)}
            />
          </mesh>
          
          {/* AI-Generated Content - synced with mesh position via useFrame */}
          {cube.isAIBox && (cube.aiContentData || cube.aiContent) && (
            <AIContentSyncedWithMesh
              meshRef={meshRef}
              contentData={cube.aiContentData || cube.aiContent}
              cubePosition={cube.position}
              cubeRotation={cube.rotation}
              cubeScale={cube.scale}
              isSelected={isSelected}
            />
          )}
          
          {/* Terrain surface mesh on top - only if terrain noise enabled */}
          {cube.isTerrain && cube.hasTerrainNoise && (
            <mesh
              ref={(el) => {
                if (el) { el.userData.terrainId = cube.id; el.userData.isTerrain = true; }
              }}
              position={[
                cube.position.x,
                cube.position.y + (cube.scale.y / 2), // Position on top of the box
                cube.position.z
              ]}
              rotation={[
                cube.rotation.x + (-Math.PI / 2), // Horizontal rotation + cube's X rotation
                cube.rotation.y, // Cube's Y rotation
                cube.rotation.z  // Cube's Z rotation
              ]}
              castShadow
              receiveShadow
            >
              <TerrainGeometry cube={cube} />
              <meshStandardMaterial 
                key={`terrain-surface-${cube.id}-${texture ? 'textured' : 'notextured'}`}
                color={texture ? '#ffffff' : '#22c55e'}
                metalness={0.3}
                roughness={0.7}
                map={texture || undefined}
              />
            </mesh>
          )}
          
          {/* Debug AI Box data */}
          {cube.isAIBox && console.log('[DEBUG] AI Box found:', {
            id: cube.id,
            label: cube.aiBoxLabel,
            hasAiContent: !!cube.aiContent,
            hasAiContentData: !!cube.aiContentData,
            aiContent: cube.aiContent,
            aiContentData: cube.aiContentData
          })}
          
          {/* AI Box Label - floating text above the box */}
          {cube.isAIBox && cube.aiBoxLabel && (
            <Billboard
              follow={true}
              position={[
                cube.position.x,
                cube.position.y + (cube.scale.y / 2) + 3,
                cube.position.z
              ]}
            >
              <Text
                fontSize={1.5}
                color={'#22d3ee'}
                anchorX="center"
                anchorY="bottom"
                outlineWidth={0.1}
                outlineColor={'#000'}
                font={'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf'}
              >
                {`🤖 ${cube.aiBoxLabel}`}
              </Text>
              <Text
                fontSize={0.8}
                color={'#cbd5e1'}
                anchorX="center"
                anchorY="top"
                position={[0, -0.5, 0]}
                outlineWidth={0.05}
                outlineColor={'#000'}
                font={'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf'}
              >
                {(cube.aiContentData || cube.aiContent) ? 'Content Generated ✓' : 'Awaiting AI Content...'}
              </Text>
            </Billboard>
          )}
          
          {/* Always show TransformControls when selected, even in drag mode */}
          {isSelected && editMode && meshRef.current && (
            <TransformControls
              ref={transformRef}
              object={meshRef.current}
              mode={transformMode}
              enabled={!dragMode}
            />
          )}
        </group>
      )}
    </>
  );
}
