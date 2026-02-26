import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX } from '@react-three/drei';
import * as THREE from 'three';

// Vehicle interaction hook
export function useVehicleSystem() {
  const [isInVehicle, setIsInVehicle] = useState(false);
  const [nearVehicle, setNearVehicle] = useState(null);
  const vehicleRef = useRef();
  const vehiclePosition = useRef(new THREE.Vector3());
  const vehicleRotation = useRef(new THREE.Euler());
  const velocity = useRef(new THREE.Vector3());
  const angularVelocity = useRef(new THREE.Vector3());

  const enterVehicle = (vehicleData) => {
    setIsInVehicle(true);
    setNearVehicle(null);
    if (vehicleData) {
      if (vehicleData.position instanceof THREE.Vector3) {
        vehiclePosition.current.copy(vehicleData.position);
      } else if (vehicleRef.current) {
        vehicleRef.current.getWorldPosition(vehiclePosition.current);
      }
      if (vehicleData.rotation instanceof THREE.Euler) {
        vehicleRotation.current.copy(vehicleData.rotation);
      } else if (vehicleRef.current) {
        vehicleRef.current.getWorldQuaternion(new THREE.Quaternion()).toEuler(vehicleRotation.current);
      }
    }
    
    // Give the jet initial forward velocity when entering
    const initialSpeed = 50; // Start with moderate speed
    const forwardDir = new THREE.Vector3(0, 0, 1);
    forwardDir.applyEuler(vehicleRotation.current);
    velocity.current.copy(forwardDir.multiplyScalar(initialSpeed));
    console.log('🚁 [VEHICLE] Starting with initial velocity:', velocity.current);
  };

  const exitVehicle = () => {
    setIsInVehicle(false);
    velocity.current.set(0, 0, 0);
    angularVelocity.current.set(0, 0, 0);
  };

  const checkNearVehicle = (playerPos, vehiclePos, distance = 10) => {
    const dist = playerPos.distanceTo(vehiclePos);
    if (dist < distance && !isInVehicle) {
      setNearVehicle({ position: vehiclePos, distance: dist });
    } else if (dist >= distance || isInVehicle) {
      setNearVehicle(null);
    }
  };

  return {
    isInVehicle,
    nearVehicle,
    vehicleRef,
    vehiclePosition,
    vehicleRotation,
    velocity,
    angularVelocity,
    enterVehicle,
    exitVehicle,
    checkNearVehicle
  };
}

// Space Jet Vehicle Component
export function SpaceJet({ position = [0, 5, 0], rotation = [0, 0, 0], vehicleRef, onInteract }) {
  const groupRef = useRef();
  const model = useFBX('/models/props/jet rocket/Space_Jet_Ignition_1021061919_texture.fbx');
  
  useEffect(() => {
    if (groupRef.current && vehicleRef) {
      vehicleRef.current = groupRef.current;
    }
  }, [vehicleRef]);

  useEffect(() => {
    if (model) {
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [model]);
  
  // Update vehicle position from vehicle system
  useFrame(() => {
    const vehicleSys = window.__CF_VEHICLE_SYSTEM__;
    if (vehicleSys && vehicleSys.isInVehicle && groupRef.current) {
      groupRef.current.position.copy(vehicleSys.vehiclePosition.current);
      groupRef.current.rotation.copy(vehicleSys.vehicleRotation.current);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={model.clone()} scale={0.02} />
      {/* Interaction trigger zone - invisible */}
      <mesh visible={false}>
        <sphereGeometry args={[10, 8, 8]} />
      </mesh>
    </group>
  );
}

// Vehicle Physics Controller
export function VehiclePhysicsController({ placedCubes }) {
  const jetRef = useRef();
  
  // Find the jet model in placedCubes
  const jetCube = placedCubes?.find(cube => 
    cube.customModelPath && (
      cube.customModelPath.toLowerCase().includes('jet') || 
      cube.customModelPath.toLowerCase().includes('space') ||
      cube.customModelPath.toLowerCase().includes('plane') ||
      cube.customModelPath.toLowerCase().includes('aircraft') ||
      cube.customModelPath.toLowerCase().includes('ship')
    )
  );
  
  // Debug log on mount
  useEffect(() => {
    console.log('🚁 [VehiclePhysicsController] Mounted. Jet cube found:', !!jetCube, jetCube?.customModelPath);
    if (placedCubes) {
      console.log('🚁 [VehiclePhysicsController] All cubes with models:', 
        placedCubes.filter(c => c.customModelPath).map(c => c.customModelPath)
      );
    }
  }, []);
  
  useFrame((_, dt) => {
    const vehicleSys = window.__CF_VEHICLE_SYSTEM__;
    if (!vehicleSys || !vehicleSys.isInVehicle || !jetCube) return;

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0];
    if (!gamepad) return;

    const deadzone = 0.15;
    
    // Left stick: pitch (up/down) and roll (left/right)
    const leftX = Math.abs(gamepad.axes[0]) > deadzone ? gamepad.axes[0] : 0;
    const leftY = Math.abs(gamepad.axes[1]) > deadzone ? -gamepad.axes[1] : 0; // Negative for inverted
    
    // Right stick: yaw (turn left/right)
    const rightX = Math.abs(gamepad.axes[2]) > deadzone ? gamepad.axes[2] : 0;
    
    // Triggers: RT (throttle) and LT (brake)
    const throttle = gamepad.buttons[7]?.value || 0; // RT
    const brake = gamepad.buttons[6]?.value || 0;    // LT
    
    // Face buttons: A (ascend) and B (descend)
    const ascend = gamepad.buttons[0]?.pressed ? 1 : 0;  // A
    const descend = gamepad.buttons[1]?.pressed ? 1 : 0; // B

    // Physics constants
    const acceleration = 80;
    const maxSpeed = 150;
    const brakeForce = 60;
    const drag = 0.98;
    const pitchSpeed = 1.5;
    const rollSpeed = 2.0;
    const yawSpeed = 1.2;
    const verticalSpeed = 40;

    // Apply acceleration/braking
    const currentSpeed = vehicleSys.velocity.current.length();
    if (throttle > 0.1) {
      const forwardDir = new THREE.Vector3(0, 0, 1);
      forwardDir.applyEuler(vehicleSys.vehicleRotation.current);
      forwardDir.multiplyScalar(acceleration * throttle * dt);
      vehicleSys.velocity.current.add(forwardDir);
    }
    if (brake > 0.1) {
      vehicleSys.velocity.current.multiplyScalar(1 - brake * brakeForce * dt / Math.max(currentSpeed, 1));
    }

    // Apply drag
    vehicleSys.velocity.current.multiplyScalar(drag);

    // Clamp to max speed
    if (currentSpeed > maxSpeed) {
      vehicleSys.velocity.current.normalize().multiplyScalar(maxSpeed);
    }

    // Apply rotations
    vehicleSys.angularVelocity.current.x += leftY * pitchSpeed * dt; // Pitch
    vehicleSys.angularVelocity.current.z += leftX * rollSpeed * dt;  // Roll
    vehicleSys.angularVelocity.current.y += rightX * yawSpeed * dt;  // Yaw

    // Apply vertical movement (ascend/descend)
    const verticalForce = (ascend - descend) * verticalSpeed * dt;
    vehicleSys.velocity.current.y += verticalForce;

    // Apply angular drag
    vehicleSys.angularVelocity.current.multiplyScalar(0.9);

    // Update rotation from angular velocity
    vehicleSys.vehicleRotation.current.x += vehicleSys.angularVelocity.current.x * dt;
    vehicleSys.vehicleRotation.current.y += vehicleSys.angularVelocity.current.y * dt;
    vehicleSys.vehicleRotation.current.z += vehicleSys.angularVelocity.current.z * dt;

    // Clamp pitch to prevent flipping
    vehicleSys.vehicleRotation.current.x = THREE.MathUtils.clamp(
      vehicleSys.vehicleRotation.current.x,
      -Math.PI / 3,
      Math.PI / 3
    );

    // Update position from velocity
    vehicleSys.vehiclePosition.current.x += vehicleSys.velocity.current.x * dt;
    vehicleSys.vehiclePosition.current.y += vehicleSys.velocity.current.y * dt;
    vehicleSys.vehiclePosition.current.z += vehicleSys.velocity.current.z * dt;

    // Prevent going below ground (y = 2)
    if (vehicleSys.vehiclePosition.current.y < 2) {
      vehicleSys.vehiclePosition.current.y = 2;
      vehicleSys.velocity.current.y = Math.max(0, vehicleSys.velocity.current.y);
    }

    // Update player avatar position while in vehicle
    window.__CF_LOCAL_AVATAR__ = {
      ...window.__CF_LOCAL_AVATAR__,
      x: vehicleSys.vehiclePosition.current.x,
      z: vehicleSys.vehiclePosition.current.z,
      yaw: vehicleSys.vehicleRotation.current.y,
      lift: vehicleSys.vehiclePosition.current.y - 2 // Offset from ground
    };
    
    // Update the jet cube's position in the world (this will be synced via the cube update system)
    if (window.__CF_UPDATE_CUBE__) {
      window.__CF_UPDATE_CUBE__(jetCube.id, {
        position: [
          vehicleSys.vehiclePosition.current.x,
          vehicleSys.vehiclePosition.current.y,
          vehicleSys.vehiclePosition.current.z
        ],
        rotation: [
          vehicleSys.vehicleRotation.current.x,
          vehicleSys.vehicleRotation.current.y,
          vehicleSys.vehicleRotation.current.z
        ]
      });
    }
  });

  return null;
}

// Vehicle HUD
export function VehicleHUD({ speed, altitude, throttle, isInVehicle }) {
  if (!isInVehicle) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontSize: '18px',
      textShadow: '0 0 10px #00ffff',
      background: 'rgba(0, 0, 0, 0.5)',
      padding: '15px 30px',
      borderRadius: '10px',
      border: '2px solid #00ffff',
      zIndex: 1000,
      minWidth: '300px',
      textAlign: 'center'
    }}>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: '#888' }}>SPEED:</span> {Math.floor(speed)} m/s
      </div>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: '#888' }}>ALTITUDE:</span> {Math.floor(altitude)} m
      </div>
      <div>
        <span style={{ color: '#888' }}>THROTTLE:</span>
        <div style={{ 
          width: '100%', 
          height: '10px', 
          background: '#222', 
          marginTop: '5px',
          border: '1px solid #00ffff'
        }}>
          <div style={{ 
            width: `${throttle * 100}%`, 
            height: '100%', 
            background: 'linear-gradient(90deg, #00ff00, #ffff00, #ff0000)',
            transition: 'width 0.1s'
          }} />
        </div>
      </div>
      <div style={{ 
        marginTop: '15px', 
        fontSize: '14px', 
        color: '#888',
        borderTop: '1px solid #444',
        paddingTop: '10px'
      }}>
        Press <span style={{ color: '#00ffff' }}>Y</span> to exit vehicle
      </div>
    </div>
  );
}

// Interaction prompt
export function VehicleInteractionPrompt({ nearVehicle }) {
  if (!nearVehicle) {
    return null;
  }

  console.log('🚁 [PROMPT] Showing vehicle interaction prompt!');

  return (
    <div style={{
      position: 'fixed',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontSize: '20px',
      textShadow: '0 0 10px #00ffff',
      background: 'rgba(0, 0, 0, 0.7)',
      padding: '15px 30px',
      borderRadius: '10px',
      border: '2px solid #00ffff',
      zIndex: 1000,
      animation: 'pulse 2s infinite'
    }}>
      Press <span style={{ 
        color: '#ffff00', 
        fontWeight: 'bold',
        fontSize: '24px' 
      }}>E</span> or <span style={{ 
        color: '#ffff00', 
        fontWeight: 'bold',
        fontSize: '24px' 
      }}>X button</span> to enter vehicle
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
