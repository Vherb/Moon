// ConnectFour3D – Character Select Menu
// Sci-fi styled overlay with 3D character preview, matching SettingsMenu visual language.

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';

/* ================================================================
   Character definitions
   ================================================================ */
const CHARACTERS = [
  {
    id: 'astronaut',
    label: 'Astronaut',
    glyph: '👨‍🚀',
    color: '#3b82f6',
    idleUrl: '/models/avatars/astronaut/Breathing Idle.fbx',
    scale: 0.012,
    yOffset: -0.9,
  },
  {
    id: 'guy1',
    label: 'Guy',
    glyph: '🧑',
    color: '#22c55e',
    idleUrl: '/models/avatars/guy1/Happy Idle (1).fbx',
    scale: 0.012,
    yOffset: -0.9,
  },
  {
    id: 'alien',
    label: 'Alien',
    glyph: '👾',
    color: '#a855f7',
    idleUrl: '/models/avatars/alien 2/Animation_Idle_3_withSkin.fbx',
    scale: 0.012,
    yOffset: -0.75,
  },
  {
    id: 'robot4',
    label: 'Robot',
    glyph: '🤖',
    color: '#ef4444',
    idleUrl: '/models/avatars/robot 4/Breathing Idle (2).fbx',
    scale: 0.014,
    yOffset: -1.0,
  },
];

/* ================================================================
   Idle-preview model — loads one FBX with idle animation, auto-rotates
   ================================================================ */
function IdlePreviewModel({ idleUrl, scale, yOffset }) {
  const fbx = useFBX(idleUrl);
  const model = React.useMemo(() => (fbx ? skeletonClone(fbx) : null), [fbx]);
  const groupRef = useRef();
  const mixerRef = useRef(null);

  // Set up animation
  React.useLayoutEffect(() => {
    if (!model) return;
    const mixer = new THREE.AnimationMixer(model);
    mixerRef.current = mixer;
    const clips = model.animations || fbx.animations || [];
    if (clips.length > 0) {
      const action = mixer.clipAction(clips[0]);
      action.play();
    }
    // Fix materials
    model.traverse(c => {
      if (c.isMesh) {
        c.castShadow = false;
        c.receiveShadow = false;
        if (c.material) {
          c.material.side = THREE.DoubleSide;
        }
      }
    });
    return () => { mixer.stopAllAction(); };
  }, [model, fbx]);

  // Animate
  useFrame((_, delta) => {
    if (mixerRef.current) mixerRef.current.update(delta);
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5; // slow auto-rotate
    }
  });

  if (!model) return null;

  return (
    <group ref={groupRef}>
      <primitive object={model} scale={scale} position={[0, yOffset, 0]} />
    </group>
  );
}

/* ================================================================
   3D Room environment — reflective floor, glow ring, neon accents
   ================================================================ */
function RoomEnvironment({ floorY }) {
  return (
    <group>
      {/* Reflective dark floor — large so it fills the view */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#080810" roughness={0.15} metalness={0.85} />
      </mesh>

      {/* Glowing platform ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY + 0.01, 0]}>
        <ringGeometry args={[0.85, 0.92, 64]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.6} />
      </mesh>
      {/* Outer faint ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY + 0.01, 0]}>
        <ringGeometry args={[1.1, 1.15, 64]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.2} />
      </mesh>
      {/* Inner glow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY + 0.005, 0]}>
        <circleGeometry args={[0.85, 64]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.04} />
      </mesh>

      {/* Horizontal neon line on floor — left */}
      <mesh position={[-2.5, floorY + 0.01, -1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 0.015]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.3} />
      </mesh>
      {/* Horizontal neon line on floor — right */}
      <mesh position={[2.5, floorY + 0.01, -1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 0.015]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
      </mesh>

      {/* Green rim light — left */}
      <pointLight position={[-3, floorY + 0.8, 1.5]} intensity={4} distance={8} color="#00ff88" />
      {/* Purple rim light — right */}
      <pointLight position={[3, floorY + 0.8, 1.5]} intensity={4} distance={8} color="#8b5cf6" />

      {/* Overhead spotlight on character */}
      <pointLight position={[0, floorY + 4, 0.5]} intensity={8} distance={10} color="#ffffff" />

      {/* Subtle fill from behind */}
      <pointLight position={[0, floorY + 1.5, -3]} intensity={1.5} distance={6} color="#1a1a3a" />
    </group>
  );
}

/* ================================================================
   Preview Canvas — self-contained mini scene with 3D room
   ================================================================ */
function PreviewCanvas({ character }) {
  const floorY = character.yOffset;
  return (
    <Canvas
      camera={{ position: [0, 0.5, 6], fov: 40 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 4]} intensity={0.8} />
      <directionalLight position={[-2, 3, -1]} intensity={0.3} color="#8b5cf6" />
      <color attach="background" args={['#050508']} />
      <fog attach="fog" args={['#050508', 5, 12]} />
      <Suspense fallback={null}>
        <IdlePreviewModel
          key={character.id}
          idleUrl={character.idleUrl}
          scale={character.scale}
          yOffset={character.yOffset}
        />
      </Suspense>
      <RoomEnvironment floorY={floorY} />
    </Canvas>
  );
}

/* ================================================================
   CharacterSelectMenu — main exported component
   ================================================================ */
export function CharacterSelectMenu({ isOpen, onClose, currentCharacter, onSelect }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(currentCharacter || 'astronaut');
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Sync when currentCharacter prop changes
  useEffect(() => {
    if (currentCharacter) setSelectedId(currentCharacter);
  }, [currentCharacter]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Gamepad polling
  useEffect(() => {
    if (!isOpen) return;
    let lastA = false;
    let lastDL = false;
    let lastDR = false;
    let lastY = false;
    const poll = setInterval(() => {
      try {
        const gp = navigator.getGamepads ? navigator.getGamepads() : [];
        let pad = null;
        for (const p of gp) { if (p && p.connected) { pad = p; break; } }
        if (!pad) return;
        // D-pad left/right to cycle characters
        const dL = pad.buttons[14]?.pressed;
        const dR = pad.buttons[15]?.pressed;
        if (dL && !lastDL) {
          setSelectedId(prev => {
            const idx = CHARACTERS.findIndex(c => c.id === prev);
            return CHARACTERS[(idx - 1 + CHARACTERS.length) % CHARACTERS.length].id;
          });
        }
        if (dR && !lastDR) {
          setSelectedId(prev => {
            const idx = CHARACTERS.findIndex(c => c.id === prev);
            return CHARACTERS[(idx + 1) % CHARACTERS.length].id;
          });
        }
        lastDL = dL;
        lastDR = dR;
        // A button to confirm
        const aBtn = pad.buttons[0]?.pressed;
        if (aBtn && !lastA) {
          onSelect(selectedId);
          onClose();
        }
        lastA = aBtn;
        // Y button to close
        const yBtn = pad.buttons[3]?.pressed;
        if (yBtn && !lastY) { onClose(); }
        lastY = yBtn;
      } catch {}
    }, 60);
    return () => clearInterval(poll);
  }, [isOpen, selectedId, onSelect, onClose]);

  const handleConfirm = useCallback(() => {
    onSelect(selectedId);
    onClose();
  }, [selectedId, onSelect, onClose]);

  if (!isOpen) return null;

  const activeChar = CHARACTERS.find(c => c.id === selectedId) || CHARACTERS[0];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9998,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        position: 'relative',
        width: '480px',
        maxWidth: '92vw',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        border: '2px solid #00ff88',
        borderRadius: '16px',
        padding: '24px',
        fontFamily: 'monospace',
        color: '#00ff88',
        boxShadow: '0 0 60px rgba(0, 255, 136, 0.3), inset 0 0 30px rgba(0, 255, 136, 0.05)',
      }}>
        {/* Title */}
        <h2 style={{
          textAlign: 'center',
          margin: '0 0 4px 0',
          fontSize: '24px',
          textTransform: 'uppercase',
          letterSpacing: '3px',
          textShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
        }}>
          Select Character
        </h2>
        <div style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(0, 255, 136, 0.4)',
          marginBottom: '16px',
          letterSpacing: '1px',
        }}>
          CHOOSE YOUR AVATAR
        </div>

        {/* 3D Preview */}
        <div style={{
          width: 'calc(100% + 48px)',
          height: '360px',
          margin: '0 -24px 16px -24px',
          borderTop: '1px solid rgba(0, 255, 136, 0.15)',
          borderBottom: '1px solid rgba(0, 255, 136, 0.15)',
          background: '#050508',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <PreviewCanvas character={activeChar} />
          {/* Character name overlay */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '0 0 12px rgba(0, 255, 136, 0.6)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}>
            {activeChar.label}
          </div>
        </div>

        {/* Character cards row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          marginBottom: '20px',
        }}>
          {CHARACTERS.map((ch, i) => {
            const isActive = selectedId === ch.id;
            const isHovered = hoveredId === ch.id;
            return (
              <button
                key={ch.id}
                data-menu-index={i}
                onClick={() => setSelectedId(ch.id)}
                onMouseEnter={() => { setHoveredId(ch.id); setSelectedIndex(i); }}
                onMouseLeave={() => { setHoveredId(null); setSelectedIndex(-1); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 4px',
                  borderRadius: '10px',
                  border: isActive
                    ? '2px solid #00ff88'
                    : isHovered
                      ? '2px solid rgba(0, 255, 136, 0.5)'
                      : '2px solid rgba(0, 255, 136, 0.15)',
                  background: isActive
                    ? 'rgba(0, 255, 136, 0.2)'
                    : isHovered
                      ? 'rgba(0, 255, 136, 0.08)'
                      : 'rgba(0, 255, 136, 0.03)',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  color: isActive ? '#00ff88' : '#94a3b8',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 0 16px rgba(0, 255, 136, 0.3)' : 'none',
                  outline: 'none',
                }}
              >
                <span style={{ fontSize: '28px' }}>{ch.glyph}</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {ch.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 136, 0.7)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 136, 1), inset 0 0 20px rgba(0, 255, 136, 0.5)';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 136, 0.2)';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 255, 136, 0.4)';
            e.currentTarget.style.color = '#00ff88';
          }}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: 'rgba(0, 255, 136, 0.2)',
            color: '#00ff88',
            border: '2px solid #00ff88',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            transition: 'all 0.2s ease',
            boxShadow: '0 0 12px rgba(0, 255, 136, 0.4)',
          }}
        >
          Enter World →
        </button>

        {/* Hint */}
        <div style={{
          marginTop: '12px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#555',
          borderTop: '1px solid #222',
          paddingTop: '10px',
        }}>
          <span style={{ color: '#00ff88' }}>◄ ►</span> browse &nbsp;·&nbsp;
          <span style={{ color: '#00ff88' }}>A</span> confirm &nbsp;·&nbsp;
          <span style={{ color: '#00ff88' }}>ESC</span> close
        </div>
      </div>
    </div>
  );
}
