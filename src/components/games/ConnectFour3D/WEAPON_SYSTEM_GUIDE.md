# Weapon System Integration Guide

This guide shows you how to integrate the weapon and shooting system into your Connect Four 3D game.

## Files Created

1. **WeaponSystem.jsx** - Contains all weapon-related React components:
   - `WeaponModel` - 3D weapon models
   - `Bullet` - Projectile component with physics
   - `MuzzleFlash` - Visual effect when shooting
   - `Crosshair` - Aiming reticle overlay
   - `CombatUI` - HUD showing health, ammo, weapon info
   - `HitMarker` - Visual feedback when hitting enemies

2. **useWeaponSystem.js** - Custom React hook for weapon logic:
   - Manages weapon state (ammo, reloading, current weapon)
   - Handles shooting mechanics
   - Bullet spawning and management
   - Health and damage system
   - Kill feed

## Integration Steps

### Step 1: Add Weapon System to Your Scene

In your main `ConnectFour3DView.jsx` or wherever you have your player, import the components:

\`\`\`jsx
import { useWeaponSystem } from './useWeaponSystem';
import { 
  WeaponModel, 
  Bullet, 
  MuzzleFlash, 
  Crosshair, 
  CombatUI, 
  HitMarker,
  WeaponSound 
} from './WeaponSystem';
\`\`\`

### Step 2: Initialize Weapon System in Your Component

\`\`\`jsx
function YourGameComponent() {
  // Initialize weapon system
  const weaponSystem = useWeaponSystem({
    enabled: true,
    initialWeapon: 'pistol',
    onShoot: (shootInfo) => {
      console.log('Shot fired:', shootInfo);
      // Send to server for multiplayer sync
      // ws.send(JSON.stringify({ type: 'shoot', ...shootInfo }));
    },
    onWeaponChange: (weapon) => {
      console.log('Weapon changed to:', weapon);
    },
    onReload: (weapon) => {
      console.log('Reloading:', weapon);
    }
  });

  // ... rest of your component
}
\`\`\`

### Step 3: Add Shooting Controls

Add mouse click handling for shooting (add this to your PlayerMover or main game component):

\`\`\`jsx
// Add mouse click listener for shooting
useEffect(() => {
  const handleMouseDown = (e) => {
    // Left click = shoot
    if (e.button === 0 && !settingsMenuOpen) {
      const playerPos = [
        playerRef.current?.position.x || 0,
        playerRef.current?.position.y || 0,
        playerRef.current?.position.z || 0
      ];
      
      // Calculate shoot direction from camera
      const camera = threeRef.current?.camera;
      if (camera) {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        
        weaponSystem.shoot(
          playerPos,
          [direction.x, direction.y, direction.z],
          'yourPlayerId'
        );
      }
    }
    
    // Right click = aim
    if (e.button === 2) {
      weaponSystem.setIsAiming(true);
    }
  };
  
  const handleMouseUp = (e) => {
    if (e.button === 2) {
      weaponSystem.setIsAiming(false);
    }
  };
  
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  
  return () => {
    window.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}, [weaponSystem, settingsMenuOpen]);
\`\`\`

### Step 4: Render Weapon on Character

Add weapon attachment to your character (in the Canvas/3D scene):

\`\`\`jsx
{/* Weapon attached to character */}
<group position={[playerX, playerY, playerZ]}>
  {/* Your character model */}
  <YourCharacterComponent />
  
  {/* Weapon in hand */}
  <WeaponModel 
    weaponType={weaponSystem.currentWeapon}
    position={[0.3, 1.2, -0.2]} // Adjust to position in character's hand
    rotation={[0, playerYaw, 0]}
  />
  
  {/* Muzzle flash at weapon tip */}
  {weaponSystem.showMuzzleFlash && (
    <MuzzleFlash 
      position={[0.3, 1.3, -0.5]}
      active={weaponSystem.showMuzzleFlash}
      onComplete={() => {}}
    />
  )}
  
  {/* Weapon sound */}
  <WeaponSound
    weaponType={weaponSystem.currentWeapon}
    position={[playerX, playerY, playerZ]}
    playTrigger={weaponSystem.weaponSoundTrigger}
  />
</group>
\`\`\`

### Step 5: Render Bullets

Render all active bullets in the scene:

\`\`\`jsx
{/* Render bullets */}
{weaponSystem.bullets.map(bullet => (
  <Bullet
    key={bullet.id}
    id={bullet.id}
    startPos={bullet.position}
    direction={bullet.direction}
    speed={bullet.speed}
    damage={bullet.damage}
    ownerId={bullet.ownerId}
    onHit={weaponSystem.handleBulletHit}
    onExpire={weaponSystem.removeBullet}
  />
))}
\`\`\`

### Step 6: Add UI Overlays

Add UI elements outside the Canvas (in your React component return):

\`\`\`jsx
return (
  <>
    {/* 3D Canvas */}
    <Canvas>
      {/* Your 3D scene */}
    </Canvas>
    
    {/* Combat UI Overlays */}
    <Crosshair 
      isAiming={weaponSystem.isAiming}
      spread={WEAPONS[weaponSystem.currentWeapon].spread}
    />
    
    <CombatUI
      currentWeapon={weaponSystem.currentWeapon}
      ammo={weaponSystem.ammo}
      maxAmmo={weaponSystem.maxAmmo}
      health={weaponSystem.health}
      maxHealth={weaponSystem.maxHealth}
      isReloading={weaponSystem.isReloading}
      killFeed={weaponSystem.killFeed}
    />
    
    <HitMarker hits={weaponSystem.hitMarkers} />
  </>
);
\`\`\`

## Weapon Controls

- **Left Click**: Shoot
- **Right Click**: Aim (changes crosshair color)
- **1 Key**: Switch to Pistol
- **2 Key**: Switch to Rifle
- **3 Key**: Switch to Shotgun
- **R Key**: Reload

## Weapon Stats

### Pistol
- Damage: 25
- Fire Rate: 0.5s between shots
- Ammo: 12 rounds
- Reload Time: 1.5s
- Type: Instant raycast

### Rifle
- Damage: 35
- Fire Rate: 0.15s between shots
- Ammo: 30 rounds
- Reload Time: 2.0s
- Type: Instant raycast
- Lower spread than pistol

### Shotgun
- Damage: 15 per pellet (8 pellets = 120 total)
- Fire Rate: 0.8s between shots
- Ammo: 6 rounds
- Reload Time: 2.5s
- Type: Instant raycast
- High spread for close range

## Multiplayer Synchronization

To sync shooting across network, add WebSocket handlers:

\`\`\`jsx
// Send shoot event
const handleShoot = (shootInfo) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'shoot',
      weapon: shootInfo.weapon,
      position: shootInfo.position,
      direction: shootInfo.direction,
      timestamp: shootInfo.timestamp,
      playerId: yourPlayerId
    }));
  }
};

// Receive shoot event from other players
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'shoot') {
    // Spawn bullet from other player's position
    const bulletId = \`bullet_\${Date.now()}_\${Math.random()}\`;
    setBullets(prev => [...prev, {
      id: bulletId,
      position: data.position,
      direction: data.direction,
      speed: WEAPONS[data.weapon].bulletSpeed,
      damage: WEAPONS[data.weapon].damage,
      ownerId: data.playerId
    }]);
  }
  
  if (data.type === 'hit') {
    // Apply damage to local player
    if (data.targetId === yourPlayerId) {
      weaponSystem.takeDamage(data.damage);
      weaponSystem.addKillFeedEntry(\`Hit by \${data.shooterId}\`);
    }
  }
};
\`\`\`

## Adding Custom Weapons

To add a new weapon, edit `WeaponSystem.jsx`:

\`\`\`jsx
export const WEAPONS = {
  // ... existing weapons
  
  sniper: {
    name: 'Sniper Rifle',
    damage: 100,
    fireRate: 1.5,
    ammo: 5,
    maxAmmo: 5,
    reloadTime: 3.0,
    bulletSpeed: 300,
    bulletType: 'instant',
    modelPath: '/models/props/weapons/sniper.fbx',
    soundPath: '/sounds/weapons/sniper_shot.mp3',
    recoil: { x: 0.1, y: 0.2 },
    spread: 0.001, // Very accurate
  },
};
\`\`\`

## Next Steps

1. **Add 3D weapon models**: Replace the placeholder boxes with actual weapon FBX/GLTF models
2. **Add weapon sounds**: Place sound files in \`/public/sounds/weapons/\`
3. **Improve hit detection**: Add player hitboxes and collision tags
4. **Add animations**: Weapon idle, fire, reload animations
5. **Polish effects**: Better muzzle flash, bullet trails, impact effects
6. **Balance gameplay**: Adjust damage, fire rates, movement speed

## Troubleshooting

- **Bullets not spawning**: Check console for errors, ensure player position is valid
- **Can't shoot**: Check \`canShoot\` property, may be out of ammo or reloading
- **No sound**: Ensure audio files exist in \`/public/sounds/weapons/\`
- **Hit detection not working**: Add \`userData.isPlayer = true\` to player meshes

## Example Complete Implementation

See the example below for a complete minimal implementation:

\`\`\`jsx
function MyGame() {
  const weaponSystem = useWeaponSystem({ enabled: true });
  const [playerPos, setPlayerPos] = useState([0, 0, 0]);
  
  return (
    <>
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        
        {/* Player with weapon */}
        <group position={playerPos}>
          <mesh>
            <boxGeometry args={[1, 2, 1]} />
            <meshStandardMaterial color="blue" />
          </mesh>
          <WeaponModel weaponType={weaponSystem.currentWeapon} />
        </group>
        
        {/* Bullets */}
        {weaponSystem.bullets.map(bullet => (
          <Bullet key={bullet.id} {...bullet} 
            onHit={weaponSystem.handleBulletHit}
            onExpire={weaponSystem.removeBullet}
          />
        ))}
      </Canvas>
      
      {/* UI */}
      <Crosshair isAiming={weaponSystem.isAiming} />
      <CombatUI {...weaponSystem} />
      <HitMarker hits={weaponSystem.hitMarkers} />
    </>
  );
}
\`\`\`

Good luck with your weapon system implementation!
