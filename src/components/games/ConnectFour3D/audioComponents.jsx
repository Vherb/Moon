// ConnectFour3D – audio components
// Extracted from ConnectFour3DView.jsx

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { TransformControls, Text, Billboard, PositionalAudio, Html } from '@react-three/drei';
import * as THREE from 'three';
import { DraggableObject } from './placedObjects';
export function FootstepAudio({ isWalking = false, isWalkingBackward = false, isRunning = false, characterId = null }) {
  const audioRef = useRef();
  const isPlayingRef = useRef(false);
  const currentSpeedRef = useRef(1.35);
  
  // Setup omnidirectional audio on mount
  useEffect(() => {
    if (!audioRef.current) return;
    
    const timer = setTimeout(() => {
      try {
        const audio = audioRef.current;
        if (audio && audio.gain && audio.panner) {
          // Make footsteps truly omnidirectional by accessing the PannerNode directly
          audio.panner.coneInnerAngle = 360;
          audio.panner.coneOuterAngle = 360;
          audio.panner.coneOuterGain = 1.0;
          console.log('FootstepAudio: Set omnidirectional cone');
        }
      } catch (error) {
        console.warn('FootstepAudio: Error setting up audio:', error);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    const isMoving = isWalking || isWalkingBackward || isRunning;
    
    if (!audioRef.current) return;
    
    try {
      const audio = audioRef.current;
      
      // Determine playback speed: faster for alien (shorter strides), normal for others
      let targetSpeed;
      if (characterId === 'alien') {
        targetSpeed = isRunning ? 2.0 : 1.8; // Faster for alien's short strides
      } else {
        targetSpeed = isRunning ? 1.65 : 1.35; // Normal speed for other characters
      }
      
      if (isMoving && !isPlayingRef.current) {
        // Start playing
        audio.play();
        audio.setPlaybackRate(targetSpeed);
        audio.setVolume(5.0); // 5x louder
        isPlayingRef.current = true;
        currentSpeedRef.current = targetSpeed;
      } else if (isMoving && isPlayingRef.current && currentSpeedRef.current !== targetSpeed) {
        // Update speed if state changed (e.g., from walking to running)
        audio.setPlaybackRate(targetSpeed);
        currentSpeedRef.current = targetSpeed;
      } else if (!isMoving && isPlayingRef.current) {
        // Stop playing
        audio.stop();
        isPlayingRef.current = false;
      }
    } catch (error) {
      console.warn('FootstepAudio: Error controlling audio:', error);
    }
  }, [isWalking, isWalkingBackward, isRunning, characterId]);
  
  return (
    <PositionalAudio 
      ref={audioRef}
      url="/sounds/moon_surface_walk.mp3"
      loop
      distance={20}
      autoplay={false}
    />
  );
}

// Jetpack spatial audio — plays looping thruster sound while jetpacking, heard by all players spatially
export function JetpackAudio({ isJetpacking = false, isRunning = false }) {
  const audioRef = useRef();
  const isPlayingRef = useRef(false);
  const currentSpeedRef = useRef(1.0);

  // Setup omnidirectional audio on mount
  useEffect(() => {
    if (!audioRef.current) return;

    const timer = setTimeout(() => {
      try {
        const audio = audioRef.current;
        if (audio && audio.panner) {
          audio.panner.coneInnerAngle = 360;
          audio.panner.coneOuterAngle = 360;
          audio.panner.coneOuterGain = 1.0;
        }
      } catch (error) {
        console.warn('JetpackAudio: Error setting up audio:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    try {
      const audio = audioRef.current;
      // Speed fly = higher pitch, louder
      const targetSpeed = isRunning && isJetpacking ? 1.25 : 1.0;
      const targetVolume = isRunning && isJetpacking ? 6.0 : 4.0;

      if (isJetpacking && !isPlayingRef.current) {
        audio.play();
        audio.setPlaybackRate(targetSpeed);
        audio.setVolume(targetVolume);
        isPlayingRef.current = true;
        currentSpeedRef.current = targetSpeed;
      } else if (isJetpacking && isPlayingRef.current && currentSpeedRef.current !== targetSpeed) {
        // Shift pitch/volume when toggling speed fly
        audio.setPlaybackRate(targetSpeed);
        audio.setVolume(targetVolume);
        currentSpeedRef.current = targetSpeed;
      } else if (!isJetpacking && isPlayingRef.current) {
        audio.stop();
        isPlayingRef.current = false;
      }
    } catch (error) {
      console.warn('JetpackAudio: Error controlling audio:', error);
    }
  }, [isJetpacking, isRunning]);

  return (
    <PositionalAudio
      ref={audioRef}
      url="/sounds/Spacial Aduio Sounds/jetpack.mp3"
      loop
      distance={25}
      autoplay={false}
    />
  );
}

// Rocket ambience spatial audio component
export function RocketAmbience() {
  const audioRef = useRef();
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (!audioRef.current) return;
    
    // Wait a bit for the audio to load
    const timer = setTimeout(() => {
      try {
        const audio = audioRef.current;
        if (audio && audio.gain) {
          console.log('RocketAmbience: Starting audio playback');
          audio.setVolume(1.5); // Reduced volume
          audio.setRefDistance(50); // Full volume within 50 units (much larger area, less affected by turning)
          audio.setMaxDistance(65); // Can hear from up to 65 units away
          audio.setRolloffFactor(1); // Gentle rolloff for gradual volume decrease
          audio.setDistanceModel('linear'); // Linear distance model for more predictable falloff
          
          audio.play();
          setIsReady(true);
          
          // Make audio truly omnidirectional by accessing the PannerNode directly AFTER play
          setTimeout(() => {
            if (audio.panner) {
              audio.panner.coneInnerAngle = 360;
              audio.panner.coneOuterAngle = 360;
              audio.panner.coneOuterGain = 1.0; // Full volume even outside cone
              console.log('RocketAmbience: Panner cone set to:', {
                inner: audio.panner.coneInnerAngle,
                outer: audio.panner.coneOuterAngle,
                gain: audio.panner.coneOuterGain
              });
            } else {
              console.warn('RocketAmbience: No panner node found!');
            }
          }, 100);
          
          console.log('RocketAmbience: Audio playing, isPlaying:', audio.isPlaying);
        }
      } catch (error) {
        console.error('RocketAmbience: Error playing audio:', error);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <PositionalAudio 
      ref={audioRef}
      url="/sounds/rocket_ambience.mp3"
      loop={true}
      distance={10}
      autoplay={false}
    />
  );
}

// Audio Range Visualizer - shows the audio zones for the rocket
export function AudioRangeVisualizer({ position = [0, 30, 0], refDistance = 50, maxDistance = 65, showLabels = true, showMeshes = false }) {
  const { camera } = useThree();
  const [playerDistance, setPlayerDistance] = React.useState(0);
  
  // Calculate distance from player to sound source
  useFrame(() => {
    const soundPos = new THREE.Vector3(...position);
    const dist = camera.position.distanceTo(soundPos);
    setPlayerDistance(dist);
  });
  
  // Calculate current volume based on distance
  const calculateVolume = (distance) => {
    if (distance <= refDistance) return 1.0; // Full volume
    if (distance >= maxDistance) return 0.0; // Silent
    // Linear falloff between refDistance and maxDistance
    return 1.0 - ((distance - refDistance) / (maxDistance - refDistance));
  };
  
  const currentVolume = calculateVolume(playerDistance);
  
  return (
    <group position={position}>
      {showMeshes && (
        <>
          {/* Full Volume Zone (refDistance) - Green */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <ringGeometry args={[refDistance - 0.5, refDistance, 64]} />
            <meshBasicMaterial color="#00ff00" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          
          {/* Max Distance Zone (maxDistance) - Red */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <ringGeometry args={[maxDistance - 0.5, maxDistance, 64]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          
          {/* Fade Zone - Yellow gradient circles */}
          {[0.25, 0.5, 0.75].map((percent, i) => {
            const radius = refDistance + (maxDistance - refDistance) * percent;
            return (
              <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                <ringGeometry args={[radius - 0.3, radius, 64]} />
                <meshBasicMaterial 
                  color="#ffff00" 
                  transparent 
                  opacity={0.2} 
                  side={THREE.DoubleSide} 
                  depthWrite={false} 
                />
              </mesh>
            );
          })}
          
          {/* Center marker */}
          <mesh position={[0, 0.2, 0]}>
            <sphereGeometry args={[2, 16, 16]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.5} />
          </mesh>
        </>
      )}
      
      {/* Distance and volume text labels (always face camera) */}
      {showLabels && showMeshes && (
        <>
          <Text
            position={[0, 0.5, 0]}
            fontSize={3}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.2}
            outlineColor="#000000"
          >
            Audio Zones
          </Text>
          
          {/* Green ring label - Full volume zone */}
          <Text
            position={[refDistance + 5, 0.5, 0]}
            fontSize={2}
            color="#00ff00"
            anchorX="left"
            anchorY="middle"
            outlineWidth={0.15}
            outlineColor="#000000"
          >
            {`Green Ring: Full Volume Zone\nRadius: ${refDistance} units\nVolume: 100%`}
          </Text>
          
          {/* Red ring label - Silent zone */}
          <Text
            position={[maxDistance + 5, 0.5, 0]}
            fontSize={2}
            color="#ff0000"
            anchorX="left"
            anchorY="middle"
            outlineWidth={0.15}
            outlineColor="#000000"
          >
            {`Red Ring: Silent Zone\nRadius: ${maxDistance} units\nVolume: 0%`}
          </Text>
          
          {/* Yellow rings label - Fade zone */}
          <Text
            position={[(refDistance + maxDistance) / 2 + 5, 3, 0]}
            fontSize={2}
            color="#ffff00"
            anchorX="left"
            anchorY="middle"
            outlineWidth={0.15}
            outlineColor="#000000"
          >
            {`Yellow Rings: Volume Fade Zone\nLinear falloff between green & red`}
          </Text>
          
          {/* Player position info */}
          <Text
            position={[0, -5, 0]}
            fontSize={2.5}
            color="#00ffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.2}
            outlineColor="#000000"
          >
            {`Your Distance: ${playerDistance.toFixed(1)} units\nCurrent Volume: ${(currentVolume * 100).toFixed(0)}%`}
          </Text>
        </>
      )}
    </group>
  );
}

// Editable Audio Range Visualizer with TransformControls (like asteroids/cubes)
// Custom Positional Audio with manual volume control
export function CustomPositionalAudio({ url, position, refDistance, maxDistance, baseVolume }) {
  const audioRef = useRef();
  const { camera } = useThree();
  const [sound, setSound] = React.useState(null);
  
  // Load and setup audio - re-run when settings change
  React.useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    // Wait for audio to load, then setup and play
    const timer = setTimeout(() => {
      try {
        // Setup audio
        audio.setLoop(true);
        audio.setVolume(baseVolume);
        
        // DISABLE the panner - we're using manual distance-based volume control
        // The panner uses camera position, but we want to use character position
        if (audio.panner) {
          audio.setRefDistance(9999999); // Effectively disable distance attenuation
          audio.setMaxDistance(9999999);
          audio.setRolloffFactor(0); // No automatic rolloff
        }
        
        // Start playing if not already playing
        if (!audio.isPlaying) {
          audio.play();
          console.log('Audio started:', url);
        }
        
        setSound(audio);
      } catch (err) {
        console.warn('Audio setup error:', err);
      }
    }, 300);
    
    return () => {
      clearTimeout(timer);
    };
  }, [url, baseVolume, refDistance, maxDistance]);
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current && audioRef.current.isPlaying) {
        try {
          audioRef.current.stop();
        } catch (err) {
          console.warn('Audio stop error:', err);
        }
      }
    };
  }, []);
  
  // Update volume based on distance every frame
  useFrame(() => {
    if (!audioRef.current || !audioRef.current.isPlaying) return;
    
    try {
      const audio = audioRef.current;
      const soundPos = new THREE.Vector3(...position);
      
      // Use player/avatar position instead of camera position
      const avatar = window.__CF_LOCAL_AVATAR__ || {};
      const playerX = avatar.x || 0;
      const playerZ = avatar.z || 0;
      const playerY = (typeof avatar.lift === 'number' ? avatar.lift : 0); // Use lift for Y height
      const playerPos = new THREE.Vector3(playerX, playerY, playerZ);
      
      const distance = playerPos.distanceTo(soundPos);
      
      let volumeMultiplier = 1.0;
      
      if (distance <= refDistance) {
        // Inside green circle - full volume
        volumeMultiplier = 1.0;
      } else if (distance >= maxDistance) {
        // Outside red circle - silent
        volumeMultiplier = 0.0;
      } else {
        // Between green and red - linear falloff
        const range = maxDistance - refDistance;
        const distanceFromRef = distance - refDistance;
        volumeMultiplier = 1.0 - (distanceFromRef / range);
      }
      
      audio.setVolume(baseVolume * volumeMultiplier);
    } catch (err) {
      // Silently fail
    }
  });
  
  return (
    <group position={position}>
      <PositionalAudio ref={audioRef} url={url} />
    </group>
  );
}

export function EditableAudioVisualizer({ 
  visualizer,
  isSelected,
  editMode,
  dragMode,
  transformMode,
  snap,
  translateSnap,
  rotateSnapDeg,
  scaleSnap,
  onTransformEnd,
  onSelect,
  showMeshes = false,
  availableSounds = [],
  setAvailableSounds = null
}) {
  const groupRef = useRef();
  const transformRef = useRef();
  const { camera } = useThree();
  const [playerDistance, setPlayerDistance] = React.useState(0);
  
  // Calculate distance from player to sound source (using player position, not camera)
  useFrame(() => {
    if (groupRef.current) {
      const soundPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(soundPos);
      
      // Use player/avatar position instead of camera position
      const avatar = window.__CF_LOCAL_AVATAR__ || {};
      const playerX = avatar.x || 0;
      const playerZ = avatar.z || 0;
      const playerY = avatar.y || 0;
      const playerPos = new THREE.Vector3(playerX, playerY, playerZ);
      
      const dist = playerPos.distanceTo(soundPos);
      setPlayerDistance(dist);
    }
  });
  
  // Calculate current volume based on distance
  const calculateVolume = (distance) => {
    if (distance <= visualizer.refDistance) return 1.0; // Full volume
    if (distance >= visualizer.maxDistance) return 0.0; // Silent
    // Linear falloff between refDistance and maxDistance
    return 1.0 - ((distance - visualizer.refDistance) / (visualizer.maxDistance - visualizer.refDistance));
  };
  
  const currentVolume = calculateVolume(playerDistance);
  
  // Handle transform end (like asteroid/cube)
  React.useEffect(() => {
    if (transformRef.current && groupRef.current) {
      const controls = transformRef.current;
      
      const handleDraggingChanged = (event) => {
        // No special logic needed - just track dragging state if needed
      };
      
      const handleMouseUp = () => {
        if (!groupRef.current) return;
        const { position, rotation, scale } = groupRef.current;
        
        // Calculate new refDistance and maxDistance based on scale
        // Store the initial values to calculate relative change
        const initialRefDistance = visualizer.refDistance;
        const initialMaxDistance = visualizer.maxDistance;
        
        // Use the average scale factor to adjust the radii
        const scaleFactor = (scale.x + scale.y + scale.z) / 3;
        
        const newRefDistance = Math.max(5, Math.min(100, initialRefDistance * scaleFactor));
        const newMaxDistance = Math.max(newRefDistance + 5, Math.min(200, initialMaxDistance * scaleFactor));
        
        const updates = {
          position: [position.x, position.y, position.z],
          rotation: [rotation.x, rotation.y, rotation.z],
          refDistance: newRefDistance,
          maxDistance: newMaxDistance
        };
        
        // Reset scale to 1 after applying to distances
        groupRef.current.scale.set(1, 1, 1);
        
        if (onTransformEnd) onTransformEnd(updates);
      };
      
      controls.addEventListener('dragging-changed', handleDraggingChanged);
      controls.addEventListener('mouseUp', handleMouseUp);
      return () => {
        controls.removeEventListener('dragging-changed', handleDraggingChanged);
        controls.removeEventListener('mouseUp', handleMouseUp);
      };
    }
  }, [onTransformEnd, visualizer.refDistance, visualizer.maxDistance]);
  
  // Update transform mode and snap settings
  React.useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setMode(transformMode);
      transformRef.current.setTranslationSnap(snap ? translateSnap : null);
      transformRef.current.setRotationSnap(snap ? (rotateSnapDeg * Math.PI / 180) : null);
      transformRef.current.setScaleSnap(snap ? scaleSnap : null);
    }
  }, [transformMode, snap, translateSnap, rotateSnapDeg, scaleSnap]);
  
  const VisualizerRings = () => (
    <>
      {/* Full Volume Zone (refDistance) - Green - THICKER LINES */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[visualizer.refDistance - 1.0, visualizer.refDistance, 64]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      
      {/* Max Distance Zone (maxDistance) - Red - THICKER LINES */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[visualizer.maxDistance - 1.0, visualizer.maxDistance, 64]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      
      {/* Fade Zone - Yellow gradient circles - THICKER LINES */}
      {[0.25, 0.5, 0.75].map((percent, i) => {
        const radius = visualizer.refDistance + (visualizer.maxDistance - visualizer.refDistance) * percent;
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <ringGeometry args={[radius - 0.7, radius, 64]} />
            <meshBasicMaterial 
              color="#ffff00" 
              transparent 
              opacity={0.4} 
              side={THREE.DoubleSide} 
              depthWrite={false} 
            />
          </mesh>
        );
      })}
      
      {/* Center marker - clickable sphere */}
      <mesh position={[0, 0.2, 0]} onClick={(e) => {
        e.stopPropagation();
        onSelect && onSelect(visualizer.id);
      }}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial color={isSelected ? "#ff00ff" : "#00ffff"} transparent opacity={0.7} />
      </mesh>
      
      {/* Billboard Labels - Always face camera */}
      <Billboard position={[0, 5, 0]}>
        <Text
          fontSize={3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.3}
          outlineColor="#000000"
        >
          {visualizer.label}
        </Text>
      </Billboard>
      
      {/* Green ring label - Billboard */}
      <Billboard position={[visualizer.refDistance + 3, 1, 0]}>
        <Text
          fontSize={1.5}
          color="#00ff00"
          anchorX="left"
          anchorY="middle"
          outlineWidth={0.15}
          outlineColor="#000000"
        >
          {`Green: Full Volume\n${visualizer.refDistance}u`}
        </Text>
      </Billboard>
      
      {/* Red ring label - Billboard */}
      <Billboard position={[visualizer.maxDistance + 3, 1, 0]}>
        <Text
          fontSize={1.5}
          color="#ff0000"
          anchorX="left"
          anchorY="middle"
          outlineWidth={0.15}
          outlineColor="#000000"
        >
          {`Red: Silent\n${visualizer.maxDistance}u`}
        </Text>
      </Billboard>
      
      {/* Player distance info - Billboard */}
      <Billboard position={[0, -3, 0]}>
        <Text
          fontSize={2}
          color="#00ffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.2}
          outlineColor="#000000"
        >
          {`Distance: ${playerDistance.toFixed(1)}u\nVolume: ${(currentVolume * 100).toFixed(0)}%`}
        </Text>
      </Billboard>
    </>
  );
  
  // Convert visualizer format to cube format for DraggableObject
  const cubeFormat = {
    id: visualizer.id,
    position: { 
      x: visualizer.position[0], 
      y: visualizer.position[1], 
      z: visualizer.position[2] 
    },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  };
  
  return (
    <>
      {dragMode && editMode ? (
        // Wrap in DraggableObject for free drag mode (like asteroids)
        <DraggableObject 
          cube={cubeFormat} 
          editMode={editMode} 
          dragMode={dragMode} 
          isSelected={isSelected} 
          onDragEnd={(updates) => {
            // Convert back to array format
            if (updates.position) {
              onTransformEnd({ 
                position: [updates.position.x, updates.position.y, updates.position.z] 
              });
            }
          }}
        >
          <group ref={groupRef}>
            {/* Small collision box for faster dragging */}
            <mesh visible={false}>
              <boxGeometry args={[5, 5, 5]} />
            </mesh>
            {showMeshes && <VisualizerRings />}
          </group>
        </DraggableObject>
      ) : (
        <group
          ref={groupRef}
          position={[visualizer.position[0], visualizer.position[1], visualizer.position[2]]}
        >
          {showMeshes && <VisualizerRings />}
        </group>
      )}
      
      {/* Custom Controlled Audio - always play so you can hear it while positioning */}
      {visualizer.soundFile && (
        <CustomPositionalAudio
          url={`/sounds/Spacial Aduio Sounds/${visualizer.soundFile}`}
          position={[visualizer.position[0], visualizer.position[1], visualizer.position[2]]}
          refDistance={visualizer.refDistance}
          maxDistance={visualizer.maxDistance}
          baseVolume={visualizer.volume}
        />
      )}
      
      {/* TransformControls - Always show when selected, like asteroids */}
      {isSelected && editMode && groupRef.current && (
        <TransformControls 
          ref={transformRef} 
          object={groupRef.current} 
          mode={transformMode} 
          enabled={!dragMode}
        />
      )}
      
      {/* Label editing panel when selected */}
      {isSelected && editMode && (
        <Html 
          position={[
            visualizer.position[0], 
            visualizer.position[1] + 15, 
            visualizer.position[2]
          ]} 
          style={{ pointerEvents: 'none' }}
        >
          <div 
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '0',
              left: '400px',
              background: 'rgba(15, 23, 42, 0.95)',
              padding: '10px',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '12px',
              minWidth: '200px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              pointerEvents: 'auto',
              zIndex: 10000,
              border: '2px solid #f59e0b'
            }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#fbbf24', fontSize: '13px' }}>🔊 Audio Zone Settings</div>
            
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <div style={{ marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>Name:</div>
              <input 
                type="text" 
                value={visualizer.label}
                onChange={(e) => {
                  const newLabel = e.target.value;
                  onTransformEnd({ label: newLabel });
                }}
                style={{ 
                  width: '100%', 
                  padding: '6px', 
                  borderRadius: '4px', 
                  border: '1px solid #334155', 
                  background: '#0f172a', 
                  color: '#e2e8f0', 
                  fontSize: '12px' 
                }}
              />
            </label>
            
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <div style={{ marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>
                Green Circle (Full Volume) - {visualizer.refDistance}u
              </div>
              <input 
                type="range" 
                min="5" 
                max="100" 
                step="1"
                value={visualizer.refDistance}
                onChange={(e) => {
                  const newRef = parseFloat(e.target.value);
                  onTransformEnd({ refDistance: newRef });
                }}
                style={{ width: '100%' }}
              />
            </label>
            
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <div style={{ marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>
                Red Circle (Silent) - {visualizer.maxDistance}u
              </div>
              <input 
                type="range" 
                min={visualizer.refDistance + 5}
                max="200" 
                step="1"
                value={visualizer.maxDistance}
                onChange={(e) => {
                  const newMax = parseFloat(e.target.value);
                  onTransformEnd({ maxDistance: newMax });
                }}
                style={{ width: '100%' }}
              />
            </label>
            
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <div style={{ marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>
                Volume: {visualizer.volume.toFixed(1)}
              </div>
              <input 
                type="range" 
                min="0" 
                max="2" 
                step="0.1"
                value={visualizer.volume}
                onChange={(e) => {
                  const newVol = parseFloat(e.target.value);
                  onTransformEnd({ volume: newVol });
                }}
                style={{ width: '100%' }}
              />
            </label>
            
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <div style={{ marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>
                🎵 Sound File
              </div>
              <select
                value={visualizer.soundFile || 'rocket_ambience.mp3'}
                onChange={(e) => {
                  onTransformEnd({ soundFile: e.target.value });
                }}
                style={{ 
                  width: '100%', 
                  padding: '6px', 
                  borderRadius: '4px', 
                  border: '1px solid #334155', 
                  background: '#0f172a', 
                  color: '#e2e8f0', 
                  fontSize: '12px' 
                }}
              >
                {availableSounds.map((sound) => (
                  <option key={sound} value={sound}>
                    {sound.replace('.mp3', '').replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            
            <label style={{ display: 'block', marginBottom: '10px' }}>
              <div style={{ 
                padding: '16px 12px', 
                borderRadius: '4px', 
                border: '2px dashed #334155', 
                background: '#1e293b', 
                color: '#94a3b8',
                textAlign: 'center',
                cursor: 'pointer',
                fontSize: '11px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#f59e0b';
                e.currentTarget.style.background = '#292524';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.background = '#1e293b';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.background = '#064e3b';
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.background = '#1e293b';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.background = '#1e293b';
                
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('audio/')) {
                  // Create FormData to upload
                  const formData = new FormData();
                  formData.append('sound', file);
                  
                  // Upload to server
                  fetch('/api/upload-sound', {
                    method: 'POST',
                    body: formData
                  })
                  .then(res => res.json())
                  .then(data => {
                    if (data.success && data.filename) {
                      // Add to available sounds if not already there
                      if (setAvailableSounds && !availableSounds.includes(data.filename)) {
                        setAvailableSounds(prev => [...prev, data.filename]);
                        // Notify other player about the new sound
                        if (window.__SEND_SOUND_UPLOAD__) {
                          window.__SEND_SOUND_UPLOAD__(data.filename);
                        }
                      }
                      // Set this file as the current sound
                      onTransformEnd({ soundFile: data.filename });
                    }
                  })
                  .catch(err => console.error('Upload failed:', err));
                } else {
                  alert('Please drop an audio file (.mp3, .wav, .ogg, etc.)');
                }
              }}
              >
                📁 Upload or Drag & Drop Audio File
                <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
                  Click to browse or drag MP3/WAV here
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Create FormData to upload
                      const formData = new FormData();
                      formData.append('sound', file);
                      
                      // Upload to server
                      fetch('/api/upload-sound', {
                        method: 'POST',
                        body: formData
                      })
                      .then(res => res.json())
                      .then(data => {
                        if (data.success && data.filename) {
                          // Add to available sounds if not already there
                          if (setAvailableSounds && !availableSounds.includes(data.filename)) {
                            setAvailableSounds(prev => [...prev, data.filename]);
                            // Notify other player about the new sound
                            if (window.__SEND_SOUND_UPLOAD__) {
                              window.__SEND_SOUND_UPLOAD__(data.filename);
                            }
                          }
                          // Set this file as the current sound
                          onTransformEnd({ soundFile: data.filename });
                        }
                      })
                      .catch(err => console.error('Upload failed:', err));
                    }
                  }}
                />
              </div>
            </label>
          </div>
        </Html>
      )}
    </>
  );
}

// FBX-based Guy1 (animated like Astronaut): Idle/Walk/Run/Turn/Jump with cross-fades