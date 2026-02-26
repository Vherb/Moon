// ConnectFour3D – Settings menu component
// Extracted from ConnectFour3DView.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
export function SettingsMenu({ isOpen, onClose, settings, onSave, onLiveUpdate }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [turnSensitivity, setTurnSensitivity] = useState(settings.turnSensitivity);
  const [cameraDistance, setCameraDistance] = useState(settings.cameraDistance);
  const [cameraHeight, setCameraHeight] = useState(settings.cameraHeight);
  const menuItems = ['turnSensitivity', 'cameraDistance', 'cameraHeight', 'save', 'close'];
  
  // Controller cursor state
  const [cursorPos, setCursorPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const cursorPosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 }); // Ref for immediate access
  const cursorSpeed = 35; // pixels per frame - faster movement
  const lastHoveredElement = useRef(null);
  const [usingController, setUsingController] = useState(false); // Track if controller is being used
  
  // Update ref when cursorPos changes
  useEffect(() => {
    cursorPosRef.current = cursorPos;
  }, [cursorPos]);
  
  // Log when usingController changes
  useEffect(() => {
    console.log('[Settings Menu] usingController:', usingController);
  }, [usingController]);
  
  // Reset cursor to center when menu opens
  useEffect(() => {
    if (isOpen) {
      setCursorPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
  }, [isOpen]);
  
  // Gamepad polling for menu navigation
  const gamepadState = useRef({
    dpadUp: false,
    dpadDown: false,
    dpadLeft: false,
    dpadRight: false,
    aButton: false,
    yButton: false,
    leftStickX: 0,
    leftStickY: 0
  });
  
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset to saved values when menu opens (only run once when menu opens)
    setTurnSensitivity(settings.turnSensitivity);
    setCameraDistance(settings.cameraDistance);
    setCameraHeight(settings.cameraHeight);
    setSelectedIndex(-1); // Start with nothing selected
    
    // Detect mouse movement to show real cursor
    const handleMouseMove = (e) => {
      // Only update when actually moving the mouse (not just passive events while controller is active)
      setUsingController(false); // Mouse is being used
      setCursorPos({ x: e.clientX, y: e.clientY }); // Update cursor position to match mouse
    };
    
    // Only Escape key support (removed arrow keys to avoid conflicts with game movement)
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup hover state when menu closes
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (lastHoveredElement.current) {
        const leaveEvent = new MouseEvent('mouseleave', { bubbles: true, cancelable: true });
        lastHoveredElement.current.dispatchEvent(leaveEvent);
        lastHoveredElement.current = null;
      }
    };
  }, [isOpen]); // Only depend on isOpen - don't reset when settings change!
  
  // Live update camera when distance or height changes
  useEffect(() => {
    if (isOpen && onLiveUpdate) {
      onLiveUpdate({ turnSensitivity, cameraDistance, cameraHeight });
    }
  }, [cameraDistance, cameraHeight, isOpen, onLiveUpdate, turnSensitivity]);
  
  // Gamepad polling for menu navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const pollInterval = setInterval(() => {
      try {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gamepad = gamepads[0];
        
        if (!gamepad) return;
        
        const deadzone = 0.1; // Lower deadzone for more responsive cursor
        
        // Left stick for cursor movement - smooth and responsive
        const leftX = Math.abs(gamepad.axes[0]) > deadzone ? gamepad.axes[0] : 0;
        const leftY = Math.abs(gamepad.axes[1]) > deadzone ? gamepad.axes[1] : 0;
        
        // Update cursor position based on left stick with acceleration
        if (leftX !== 0 || leftY !== 0) {
          const magnitude = Math.sqrt(leftX * leftX + leftY * leftY);
          const speedMultiplier = 1 + magnitude; // Speed increases with stick distance
          
          setUsingController(true); // Controller is being used
          
          setCursorPos(prev => ({
            x: Math.max(0, Math.min(window.innerWidth, prev.x + leftX * cursorSpeed * speedMultiplier)),
            y: Math.max(0, Math.min(window.innerHeight, prev.y + leftY * cursorSpeed * speedMultiplier))
          }));
        }
        
        // D-pad buttons: 12=up, 13=down, 14=left, 15=right
        const dpadUpNow = gamepad.buttons[12]?.pressed || false;
        const dpadDownNow = gamepad.buttons[13]?.pressed || false;
        const dpadLeftNow = gamepad.buttons[14]?.pressed || false;
        const dpadRightNow = gamepad.buttons[15]?.pressed || false;
        const aButtonNow = gamepad.buttons[0]?.pressed || false;
        const yButtonNow = gamepad.buttons[3]?.pressed || false;
        
        // Detect button press (not hold)
        const dpadUpPressed = dpadUpNow && !gamepadState.current.dpadUp;
        const dpadDownPressed = dpadDownNow && !gamepadState.current.dpadDown;
        const dpadLeftPressed = dpadLeftNow && !gamepadState.current.dpadLeft;
        const dpadRightPressed = dpadRightNow && !gamepadState.current.dpadRight;
        const aButtonPressed = aButtonNow && !gamepadState.current.aButton;
        const yButtonPressed = yButtonNow && !gamepadState.current.yButton;
        
        // Update state
        gamepadState.current.dpadUp = dpadUpNow;
        gamepadState.current.dpadDown = dpadDownNow;
        gamepadState.current.dpadLeft = dpadLeftNow;
        gamepadState.current.dpadRight = dpadRightNow;
        gamepadState.current.aButton = aButtonNow;
        gamepadState.current.yButton = yButtonNow;
        
        // Y button closes menu
        if (yButtonPressed) {
          onClose();
          return;
        }
        
        // Navigate menu items with D-pad up/down
        if (dpadUpPressed) {
          setSelectedIndex(prev => Math.max(0, prev - 1));
        }
        if (dpadDownPressed) {
          setSelectedIndex(prev => Math.min(menuItems.length - 1, prev + 1));
        }
        
        // Adjust sliders with D-pad left/right
        if (selectedIndex === 0) { // Turn Sensitivity
          if (dpadLeftPressed) {
            setTurnSensitivity(prev => Math.max(0.5, prev - 0.1));
          }
          if (dpadRightPressed) {
            setTurnSensitivity(prev => Math.min(3.0, prev + 0.1));
          }
        } else if (selectedIndex === 1) { // Camera Distance
          if (dpadLeftPressed) {
            setCameraDistance(prev => Math.max(20, prev - 5));
          }
          if (dpadRightPressed) {
            setCameraDistance(prev => Math.min(100, prev + 5));
          }
        } else if (selectedIndex === 2) { // Camera Height
          if (dpadLeftPressed) {
            setCameraHeight(prev => Math.max(5, prev - 2));
          }
          if (dpadRightPressed) {
            setCameraHeight(prev => Math.min(30, prev + 2));
          }
        }
        
        // A button activates selected item OR simulates click at cursor position
        if (aButtonPressed) {
          console.log('A button pressed!');
          // Get current cursor position from ref
          const currentX = cursorPosRef.current.x;
          const currentY = cursorPosRef.current.y;
          console.log('Cursor position:', currentX, currentY);
          
          // Try to click element at cursor position first
          const elementsAtCursor = document.elementsFromPoint(currentX, currentY);
          // Filter out cursor elements
          const filteredElements = elementsAtCursor.filter(e => 
            !e.classList.contains('controller-cursor') && 
            !e.closest('.controller-cursor')
          );
          
          console.log('Elements for click:', filteredElements.map(e => e.tagName));
          let clickHandled = false;
          
          for (const elem of filteredElements) {
            if (elem.tagName === 'BUTTON' || elem.tagName === 'INPUT' || elem.onclick) {
              console.log('Clicking element:', elem.tagName, elem.textContent?.substring(0, 20));
              // Create and dispatch a proper click event
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: currentX,
                clientY: currentY
              });
              elem.dispatchEvent(clickEvent);
              clickHandled = true;
              
              // Also trigger mousedown and mouseup for better compatibility
              const downEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: currentX,
                clientY: currentY
              });
              const upEvent = new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: currentX,
                clientY: currentY
              });
              elem.dispatchEvent(downEvent);
              elem.dispatchEvent(upEvent);
              break;
            }
          }
          
          console.log('Click handled:', clickHandled);
          
          // If no clickable element found, use D-pad navigation
          if (!clickHandled) {
            if (selectedIndex === 3) { // Save
              onSave({ turnSensitivity, cameraDistance, cameraHeight });
            } else if (selectedIndex === 4) { // Close
              onClose();
            }
          }
        }
      } catch {}
    }, 50); // Poll 20 times per second
    
    return () => clearInterval(pollInterval);
  }, [isOpen, selectedIndex, turnSensitivity, cameraDistance, cameraHeight, onClose, onSave, menuItems.length, cursorPos.x, cursorPos.y]);
  
  // Separate effect for hover detection - runs on cursor position change
  useEffect(() => {
    if (!isOpen) return;
    
    const updateHover = () => {
      try {
        const elementsAtCursor = document.elementsFromPoint(cursorPos.x, cursorPos.y);
        // Filter out cursor elements
        const filteredElements = elementsAtCursor.filter(e => 
          !e.classList.contains('controller-cursor') && 
          !e.closest('.controller-cursor')
        );
        
        console.log('Elements at cursor:', filteredElements.map(e => e.tagName + (e.className ? '.' + e.className : '')));
        
        let hoveredElement = null;
        let menuIndex = -1;
        
        for (const elem of filteredElements) {
          // Check for menu items with data-menu-index (on element or parent)
          let currentElem = elem;
          while (currentElem && currentElem !== document.body) {
            const dataIndex = currentElem.getAttribute('data-menu-index');
            if (dataIndex !== null) {
              hoveredElement = currentElem;
              menuIndex = parseInt(dataIndex);
              console.log('Found menu item with index:', menuIndex);
              break;
            }
            currentElem = currentElem.parentElement;
          }
          
          if (menuIndex !== -1) break;
          
          // Check for divs with padding (our slider containers), buttons, inputs, labels
          if (elem.tagName === 'BUTTON' || 
              elem.tagName === 'INPUT' || 
              elem.tagName === 'LABEL' || 
              elem.style.cursor === 'pointer' ||
              elem.onclick || 
              (elem.tagName === 'DIV' && elem.style.padding)) {
            hoveredElement = elem;
            console.log('Found hoverable element:', elem.tagName, elem.textContent?.substring(0, 20));
            break;
          }
        }
        
        // Update selectedIndex directly for both mouse and controller cursor
        // This ensures hover works for controller cursor since React synthetic events won't fire from dispatched events
        if (menuIndex !== -1) {
          console.log('[Hover] Setting selectedIndex to:', menuIndex);
          setSelectedIndex(menuIndex);
        } else if (!hoveredElement || hoveredElement.tagName !== 'INPUT') {
          // Don't reset if hovering over input (slider), only reset when truly not on any menu item
          console.log('[Hover] Resetting selectedIndex to -1');
          setSelectedIndex(-1);
        }
        
        // Trigger mouseenter/mouseleave events for hover animations
        if (hoveredElement !== lastHoveredElement.current) {
          // Always fire leave event first if there was a previous element
          if (lastHoveredElement.current) {
            console.log('Leaving element:', lastHoveredElement.current.tagName);
            
            // Fire mouseleave with all necessary event properties
            const leaveEvent = new MouseEvent('mouseleave', { 
              bubbles: false,  // mouseleave doesn't bubble
              cancelable: false,
              clientX: cursorPos.x,
              clientY: cursorPos.y,
              view: window
            });
            lastHoveredElement.current.dispatchEvent(leaveEvent);
            
            // Also fire mouseout for better compatibility (does bubble)
            const outEvent = new MouseEvent('mouseout', { 
              bubbles: true, 
              cancelable: true,
              clientX: cursorPos.x,
              clientY: cursorPos.y,
              view: window
            });
            lastHoveredElement.current.dispatchEvent(outEvent);
          }
          
          // Then fire enter event for new element
          if (hoveredElement) {
            console.log('Entering element:', hoveredElement.tagName);
            
            // Fire mouseenter with all necessary event properties
            const enterEvent = new MouseEvent('mouseenter', { 
              bubbles: false,  // mouseenter doesn't bubble
              cancelable: false,
              clientX: cursorPos.x,
              clientY: cursorPos.y,
              view: window
            });
            hoveredElement.dispatchEvent(enterEvent);
            
            // Also dispatch mouseover for additional compatibility (does bubble)
            const overEvent = new MouseEvent('mouseover', { 
              bubbles: true, 
              cancelable: true,
              clientX: cursorPos.x,
              clientY: cursorPos.y,
              view: window
            });
            hoveredElement.dispatchEvent(overEvent);
          }
          
          lastHoveredElement.current = hoveredElement;
        }
      } catch (err) {
        console.error('Hover update error:', err);
      }
    };
    
    updateHover();
  }, [isOpen, cursorPos.x, cursorPos.y]);
  
  if (!isOpen) return null;
  
  // Dim menu when adjusting camera settings (distance or height selected)
  const isAdjustingCamera = selectedIndex === 1 || selectedIndex === 2;
  console.log('[Settings Menu] selectedIndex:', selectedIndex, 'isAdjustingCamera:', isAdjustingCamera);
  
  return (
    <>
    {/* Full screen overlay to hide real cursor only when using controller */}
    {usingController && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        cursor: 'none', // Hide real cursor
        pointerEvents: 'none' // Don't block clicks
      }} />
    )}
    
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: isAdjustingCamera ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.75)', // Much more transparent when adjusting camera
      border: '3px solid #00ff88',
      borderRadius: '16px',
      padding: '30px',
      zIndex: 10000,
      minWidth: '400px',
      fontFamily: 'monospace',
      color: '#00ff88',
      boxShadow: '0 0 40px rgba(0, 255, 136, 0.5)',
      transition: 'background-color 0.2s ease' // Smooth transition
    }}>
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '25px', 
        fontSize: '28px',
        textTransform: 'uppercase',
        letterSpacing: '2px'
      }}>Settings</h2>
      
      {/* Turn Sensitivity */}
      <div 
        data-menu-index="0"
        onMouseEnter={() => !usingController && setSelectedIndex(0)}
        onMouseLeave={() => !usingController && setSelectedIndex(-1)}
        style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: selectedIndex === 0 ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
        borderRadius: '8px',
        border: selectedIndex === 0 ? '2px solid #00ff88' : '2px solid transparent',
        transition: 'all 0.2s ease'
      }}>
        <div style={{ marginBottom: '8px', fontSize: '18px' }}>Turn Sensitivity: {turnSensitivity.toFixed(1)}</div>
        <input
          type="range"
          min="0.5"
          max="3.0"
          step="0.1"
          value={turnSensitivity}
          onChange={(e) => setTurnSensitivity(parseFloat(e.target.value))}
          style={{
            width: '100%',
            cursor: 'pointer',
            accentColor: '#00ff88'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '5px' }}>
          <span>0.5</span>
          <span>3.0</span>
        </div>
      </div>
      
      {/* Camera Distance */}
      <div 
        data-menu-index="1"
        onMouseEnter={() => !usingController && setSelectedIndex(1)}
        onMouseLeave={() => !usingController && setSelectedIndex(-1)}
        style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: selectedIndex === 1 ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
        borderRadius: '8px',
        border: selectedIndex === 1 ? '2px solid #00ff88' : '2px solid transparent',
        transition: 'all 0.2s ease'
      }}>
        <div style={{ marginBottom: '8px', fontSize: '18px' }}>Camera Distance: {cameraDistance}</div>
        <input
          type="range"
          min="20"
          max="100"
          step="5"
          value={cameraDistance}
          onChange={(e) => setCameraDistance(parseInt(e.target.value))}
          style={{
            width: '100%',
            cursor: 'pointer',
            accentColor: '#00ff88'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '5px' }}>
          <span>20</span>
          <span>100</span>
        </div>
      </div>
      
      {/* Camera Height */}
      <div 
        data-menu-index="2"
        onMouseEnter={() => !usingController && setSelectedIndex(2)}
        onMouseLeave={() => !usingController && setSelectedIndex(-1)}
        style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: selectedIndex === 2 ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
        borderRadius: '8px',
        border: selectedIndex === 2 ? '2px solid #00ff88' : '2px solid transparent',
        transition: 'all 0.2s ease'
      }}>
        <div style={{ marginBottom: '8px', fontSize: '18px' }}>Camera Height: {cameraHeight}</div>
        <input
          type="range"
          min="5"
          max="30"
          step="2"
          value={cameraHeight}
          onChange={(e) => setCameraHeight(parseInt(e.target.value))}
          style={{
            width: '100%',
            cursor: 'pointer',
            accentColor: '#00ff88'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '5px' }}>
          <span>5</span>
          <span>30</span>
        </div>
      </div>
      
      {/* Save Button */}
      <button
        onClick={() => onSave({ turnSensitivity, cameraDistance, cameraHeight })}
        onMouseEnter={(e) => {
          if (selectedIndex !== 3) {
            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 136, 0.7)'; // Much brighter
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 136, 1), inset 0 0 20px rgba(0, 255, 136, 0.5)'; // Stronger glow
            e.currentTarget.style.color = '#000'; // Black text on bright background
          }
        }}
        onMouseLeave={(e) => {
          if (selectedIndex !== 3) {
            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 136, 0.2)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.color = '#00ff88'; // Back to green text
          }
        }}
        style={{
          width: '100%',
          padding: '15px',
          marginBottom: '10px',
          backgroundColor: selectedIndex === 3 ? '#00ff88' : 'rgba(0, 255, 136, 0.2)',
          color: selectedIndex === 3 ? '#000' : '#00ff88',
          border: selectedIndex === 3 ? '2px solid #00ff88' : '2px solid #00ff88',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          transition: 'all 0.2s ease',
          boxShadow: selectedIndex === 3 ? '0 0 20px rgba(0, 255, 136, 0.8)' : 'none'
        }}
      >
        Save Settings
      </button>
      
      {/* Close Button */}
      <button
        onClick={onClose}
        onMouseEnter={(e) => {
          if (selectedIndex !== 4) {
            e.currentTarget.style.backgroundColor = 'rgba(255, 68, 68, 0.7)'; // Much brighter
            e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 68, 68, 1), inset 0 0 20px rgba(255, 68, 68, 0.5)'; // Stronger glow
            e.currentTarget.style.color = '#fff'; // White text on bright background
          }
        }}
        onMouseLeave={(e) => {
          if (selectedIndex !== 4) {
            e.currentTarget.style.backgroundColor = 'rgba(255, 68, 68, 0.2)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.color = '#ff4444'; // Back to red text
          }
        }}
        style={{
          width: '100%',
          padding: '15px',
          backgroundColor: selectedIndex === 4 ? '#ff4444' : 'rgba(255, 68, 68, 0.2)',
          color: selectedIndex === 4 ? '#fff' : '#ff4444',
          border: selectedIndex === 4 ? '2px solid #ff4444' : '2px solid #ff4444',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          transition: 'all 0.2s ease',
          boxShadow: selectedIndex === 4 ? '0 0 20px rgba(255, 68, 68, 0.8)' : 'none'
        }}
      >
        Close
      </button>
      
      {/* Controller Hint */}
      <div style={{
        marginTop: '20px',
        padding: '10px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#888',
        borderTop: '1px solid #333'
      }}>
        <div style={{ marginTop: '10px' }}>Press <strong style={{ color: '#00ff88' }}>Y</strong> to close menu</div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}} />
    </div>
    
    {/* Controller Cursor - White glowing circle (only visible when using controller) */}
    {usingController && (
      <div className="controller-cursor" style={{
        position: 'fixed',
        left: cursorPos.x,
        top: cursorPos.y,
        width: '40px',
        height: '40px',
        pointerEvents: 'none',
        zIndex: 20001, // Above menu
        transform: 'translate(-50%, -50%)'
      }}>
        {/* Outer glow */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 50%, transparent 70%)',
          boxShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
        {/* White ring */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.9)',
          boxSizing: 'border-box'
        }} />
        {/* Center dot */}
        <div style={{
          position: 'absolute',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'white',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 4px rgba(255,255,255,0.8)'
        }} />
      </div>
    )}
    </>
  );
}

// CRITICAL: Define RemoteAvatarGroup OUTSIDE main component to prevent recreation on every render
// If defined inside, React sees it as a new component type and remounts avatars, resetting animation