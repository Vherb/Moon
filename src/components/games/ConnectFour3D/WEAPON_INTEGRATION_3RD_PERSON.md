# Weapon System Integration Guide - 3rd Person Controller

This guide shows how to integrate the weapon system into your 3rd person Xbox controller-based game.

## Controller Layout

```
Xbox Controller Mapping:
├── Left Stick: Movement (already implemented)
├── Right Stick: Camera rotation (already implemented)
├── RT (Right Trigger - Axis 5 or Button 7): SHOOT
├── LT (Left Trigger - Axis 4 or Button 6): AIM
├── D-pad Left (Button 14): Previous Weapon
├── D-pad Right (Button 15): Next Weapon (when not in menu)
├── Y Button (Button 3): Reload
├── B Button (Button 1): Jump (already implemented)
└── Left Stick Click (L3 - Button 10): Run (already implemented)
```

## Step 1: Add Weapon System Import to ConnectFour3DView.jsx

At the top of your file, add these imports:

```javascript
import { useWeaponSystem } from './useWeaponSystem';
import { WeaponModel, Bullet, MuzzleFlash, Crosshair, CombatUI, HitMarker } from './WeaponSystem';
import './WeaponSystem.css';
```

## Step 2: Initialize Weapon System in PlayerMover

Inside the `PlayerMover` function component, after the existing state declarations (around line 9920), add:

```javascript
// Weapon system for 3rd person shooting
const weaponSystem = useWeaponSystem({
  enabled: enabled,
  gamepadState: gamepadState, // Pass the existing gamepad state ref
  initialWeapon: 'pistol',
  onShoot: (shootInfo) => {
    // Send shoot event to multiplayer server
    console.log('Shot fired:', shootInfo);
    // TODO: Send via WebSocket
  }
});
```

## Step 3: Add RT/LT Trigger Controls in useFrame

Inside the `useFrame` hook (around line 10520), after the existing gamepad button checks, add:

```javascript
// Weapon controls - RT (Right Trigger) to shoot, LT (Left Trigger) to aim
if (gamepad) {
  // Right Trigger (button 7 or axis 5) - Shoot
  const rtValue = gamepad.buttons[7]?.value || gamepad.axes[5] || 0;
  const rtPressed = rtValue > 0.5;
  gamepadState.current.rtButton = rtPressed;
  
  // Left Trigger (button 6 or axis 4) - Aim
  const ltValue = gamepad.buttons[6]?.value || gamepad.axes[4] || 0;
  const ltPressed = ltValue > 0.5;
  gamepadState.current.ltButton = ltPressed;
  weaponSystem.setIsAiming(ltPressed);
  
  // Y button (button 3) - Reload
  gamepadState.current.yButton = gamepad.buttons[3]?.pressed || false;
  
  // D-pad Left (button 14) - Previous weapon
  // (already handled for menu navigation)
  
  // Check weapon controls
  weaponSystem.checkGamepadControls();
  
  // Shoot when RT pressed
  if (rtPressed && weaponSystem.canShoot && ref.current) {
    // Get shooting direction from character facing
    const yaw = yawRef.current;
    const direction = [
      Math.sin(yaw),
      0, // Shoot horizontally in 3rd person
      Math.cos(yaw)
    ];
    
    // Get weapon position (slightly in front of character)
    const weaponOffset = 1.5; // Distance in front of character
    const heightOffset = 1.8; // Eye level height
    const shootPos = [
      ref.current.position.x + direction[0] * weaponOffset,
      ref.current.position.y + heightOffset + jumpY + platformLift,
      ref.current.position.z + direction[2] * weaponOffset
    ];
    
    weaponSystem.shoot(shootPos, direction, characterId);
  }
}
```

## Step 4: Render Weapon on Character

Inside the PlayerMover's return statement, add the weapon model attached to the character. Find where `{children}` is rendered and add before or after it:

```javascript
{/* Weapon System Components */}
{enabled && weaponSystem.currentWeapon && (
  <group>
    {/* Weapon Model - positioned at character's hand/side */}
    <WeaponModel
      weaponType={weaponSystem.currentWeapon}
      position={[0.5, 1.5, -0.3]} // Right side, chest height, slightly forward
      rotation={[0, yawRef.current, 0]}
    />
    
    {/* Muzzle Flash */}
    {weaponSystem.showMuzzleFlash && (
      <MuzzleFlash
        position={[
          ref.current.position.x + Math.sin(yawRef.current) * 1.5,
          ref.current.position.y + 1.8 + jumpY + platformLift,
          ref.current.position.z + Math.cos(yawRef.current) * 1.5
        ]}
      />
    )}
  </group>
)}

{children}
```

## Step 5: Render Bullets in Main Scene

Outside the PlayerMover component, in the main scene render (around line 18000+), add:

```javascript
{/* Render all active bullets */}
{weaponSystem?.bullets?.map(bullet => (
  <Bullet
    key={bullet.id}
    {...bullet}
    onHit={(hitInfo) => weaponSystem.handleBulletHit(hitInfo)}
  />
))}
```

## Step 6: Add Combat UI Overlay

In the main component return statement, after the `<Canvas>` element, add the 2D UI overlay:

```javascript
{/* Combat UI - rendered outside Canvas for 2D overlay */}
{moveEnabled && weaponSystem && (
  <>
    <Crosshair 
      isAiming={weaponSystem.isAiming}
      spread={WEAPONS[weaponSystem.currentWeapon].spread}
    />
    <CombatUI
      health={weaponSystem.health}
      maxHealth={weaponSystem.maxHealth}
      ammo={weaponSystem.ammo}
      maxAmmo={weaponSystem.maxAmmo}
      weaponName={weaponSystem.currentWeapon}
      isReloading={weaponSystem.isReloading}
      killFeed={weaponSystem.killFeed}
    />
    {weaponSystem.hitMarkers.map(marker => (
      <HitMarker
        key={marker.id}
        screenX={marker.screenX}
        screenY={marker.screenY}
      />
    ))}
  </>
)}
```

## Step 7: Update Gamepad State Ref

Make sure the gamepadState ref includes the new weapon buttons. In the PlayerMover component (around line 10044), update:

```javascript
const gamepadState = useRef({
  leftStickX: 0,
  leftStickY: 0,
  rightStickX: 0,
  rightStickY: 0,
  bButton: false,
  bButtonPressed: false,
  leftStickClick: false,
  lb: false,
  rb: false,
  dpadUp: false,
  dpadDown: false,
  dpadLeft: false,
  dpadRight: false,
  aButton: false,
  bButtonForMenu: false,
  rtButton: false,  // Right trigger for shooting
  ltButton: false,  // Left trigger for aiming
  yButton: false,   // Y button for reload
  dpadRightWeapon: false, // Separate state for weapon switching vs menu navigation
});
```

## Step 8: Handle D-pad Right Priority

Since D-pad Right is already used for menu navigation, we need to make weapon switching only work when NOT in menu. Update the existing D-pad Right handler (around line 10100):

```javascript
// D-pad Right button (button 15) - horizontal menu navigation when in section, or weapon switching
const dpadRightNow = gamepad.buttons[15]?.pressed || false;
const dpadRightPressed = dpadRightNow && !gamepadState.current.dpadRight;
gamepadState.current.dpadRight = dpadRightNow;

if (dpadRightPressed) {
  // Priority 1: Menu navigation if menu is open
  if (showEditMenu && isInSubMenu && setSelectedSubItemIndex) {
    // ... existing menu navigation code ...
  }
  else if (showEditMenu && isInSection && /*...*/) {
    // ... existing menu navigation code ...
  }
  // Priority 2: Weapon switching when menu is closed
  else if (!showEditMenu) {
    gamepadState.current.dpadRightWeapon = true;
    // Weapon switching is handled in weaponSystem.checkGamepadControls()
  }
  // Priority 3: Toggle chat UI (existing fallback)
  else if (setShowChatUI) {
    // ... existing chat toggle code ...
  }
}

// Reset weapon flag when button released
if (!dpadRightNow && gamepadState.current.dpadRightWeapon) {
  gamepadState.current.dpadRightWeapon = false;
}
```

## Step 9: Add Weapon Position Logic for Different Avatars

Each avatar (Astronaut, Alien2, Guy1, Robot4) may need different weapon positions. You can create a helper:

```javascript
function getWeaponPositionForAvatar(avatarType) {
  const positions = {
    'Astronaut': { position: [0.6, 1.6, -0.2], rotation: [0, 0, 0] },
    'Alien2': { position: [0.5, 1.4, -0.3], rotation: [0, 0, 0] },
    'Guy1': { position: [0.5, 1.5, -0.3], rotation: [0, 0, 0] },
    'Robot4': { position: [0.6, 1.7, -0.2], rotation: [0, 0, 0] },
  };
  return positions[avatarType] || positions['Astronaut'];
}
```

## Step 10: Add Multiplayer Sync

In your WebSocket message handler, add cases for weapon events:

```javascript
// Receive shoot event
if (msg.type === 'shoot') {
  // Spawn bullet from other player
  const { playerId, position, direction, weapon, timestamp } = msg;
  // Add bullet to scene
}

// Receive hit event
if (msg.type === 'hit') {
  const { playerId, targetId, damage } = msg;
  if (targetId === yourPlayerId) {
    weaponSystem.takeDamage(damage);
  }
}

// Send shoot event
function sendShootEvent(shootInfo) {
  ws.send(JSON.stringify({
    type: 'shoot',
    weapon: weaponSystem.currentWeapon,
    position: shootInfo.position,
    direction: shootInfo.direction,
    timestamp: Date.now(),
    playerId: yourPlayerId
  }));
}
```

## Controller Testing Checklist

- [ ] RT (Right Trigger) fires weapon
- [ ] LT (Left Trigger) enables aiming (affects crosshair)
- [ ] D-pad Left cycles to previous weapon
- [ ] D-pad Right cycles to next weapon (when menu closed)
- [ ] Y button reloads weapon
- [ ] Weapon appears attached to character
- [ ] Bullets spawn from character position
- [ ] Bullets fly in character's facing direction
- [ ] Crosshair appears in center of screen
- [ ] Combat UI shows health, ammo, weapon name
- [ ] Hit markers appear when hitting targets
- [ ] Camera follows player smoothly while shooting
- [ ] Can move and shoot simultaneously
- [ ] Can't shoot while reloading
- [ ] Auto-reload when ammo depleted

## 3D Model Assets Needed

Replace placeholder weapon boxes with real models:

```
public/models/props/weapons/
├── pistol.fbx
├── rifle.fbx
└── shotgun.fbx
```

Use your existing FBX loader pattern:

```javascript
const { scene: pistolModel } = useFBX('/models/props/weapons/pistol.fbx');
```

## Performance Notes

- Bullets use raycasting for hit detection (no physics simulation)
- UI updates at 60fps
- Muzzle flash auto-hides after 100ms
- Hit markers auto-remove after 500ms
- Kill feed entries auto-remove after 5 seconds
- Max 5 kill feed entries visible

## Troubleshooting

**RT trigger not working**: Check `gamepad.buttons[7]` AND `gamepad.axes[5]` (triggers can be either)

**Weapon not visible**: Check character ref is valid, weapon position offset, and camera angle

**Shooting wrong direction**: Verify `yawRef.current` matches character rotation

**Can't shoot while moving**: Ensure `enabled` prop is true and gamepad polling works

**D-pad Right conflicts**: Menu navigation takes priority over weapon switching

## Next Steps

1. Add muzzle flash particle effects
2. Add bullet tracer visuals
3. Add hit sound effects
4. Add recoil animation
5. Add weapon bob/sway while moving
6. Add damage numbers floating above enemies
7. Add different crosshairs per weapon
8. Add scope/zoom for aiming
