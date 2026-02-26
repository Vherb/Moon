// ConnectFour3D – Inventory Menu overlay
// Sci-fi styled UI matching SettingsMenu / CharacterSelectMenu visual language.

import React, { useState, useEffect, useCallback } from 'react';
import { useInventoryStore, ITEM_CATALOG, RARITY_COLORS, EQUIP_SLOTS } from './useInventoryStore';

/* ================================================================
   InventoryMenu — main exported component
   ================================================================ */
export function InventoryMenu({ isOpen, onClose }) {
  const ownedItems = useInventoryStore(s => s.ownedItems);
  const equipped   = useInventoryStore(s => s.equipped);
  const toggleEquip = useInventoryStore(s => s.toggleEquip);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState(-1);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => (i + 1) % Math.max(1, ownedItems.length));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => (i - 1 + ownedItems.length) % Math.max(1, ownedItems.length));
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const id = ownedItems[selectedIdx];
        if (id) toggleEquip(id);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, onClose, ownedItems, selectedIdx, toggleEquip]);

  // Gamepad polling
  useEffect(() => {
    if (!isOpen) return;
    let lastDL = false, lastDR = false, lastA = false, lastY = false;
    const poll = setInterval(() => {
      try {
        const gp = navigator.getGamepads ? navigator.getGamepads() : [];
        let pad = null;
        for (const p of gp) { if (p && p.connected) { pad = p; break; } }
        if (!pad) return;
        const dL = pad.buttons[14]?.pressed;
        const dR = pad.buttons[15]?.pressed;
        if (dL && !lastDL) setSelectedIdx(i => (i - 1 + ownedItems.length) % Math.max(1, ownedItems.length));
        if (dR && !lastDR) setSelectedIdx(i => (i + 1) % Math.max(1, ownedItems.length));
        lastDL = dL; lastDR = dR;
        const aBtn = pad.buttons[0]?.pressed;
        if (aBtn && !lastA) {
          const id = ownedItems[selectedIdx];
          if (id) toggleEquip(id);
        }
        lastA = aBtn;
        const yBtn = pad.buttons[3]?.pressed;
        if (yBtn && !lastY) onClose();
        lastY = yBtn;
      } catch {}
    }, 60);
    return () => clearInterval(poll);
  }, [isOpen, ownedItems, selectedIdx, toggleEquip, onClose]);

  const handleEquipClick = useCallback((itemId) => {
    toggleEquip(itemId);
  }, [toggleEquip]);

  if (!isOpen) return null;

  const activeItem = ITEM_CATALOG[ownedItems[selectedIdx]] || null;

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
        width: '520px',
        maxWidth: '94vw',
        maxHeight: '85vh',
        overflowY: 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid #a855f7',
        borderRadius: '16px',
        padding: '24px',
        fontFamily: 'monospace',
        color: '#a855f7',
        boxShadow: '0 0 60px rgba(168, 85, 247, 0.3), inset 0 0 30px rgba(168, 85, 247, 0.05)',
      }}>
        {/* Title */}
        <h2 style={{
          textAlign: 'center',
          margin: '0 0 4px 0',
          fontSize: '24px',
          textTransform: 'uppercase',
          letterSpacing: '3px',
          textShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
        }}>
          Inventory
        </h2>
        <div style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(168, 85, 247, 0.4)',
          marginBottom: '20px',
          letterSpacing: '1px',
        }}>
          EQUIPMENT & ITEMS
        </div>

        {/* Equipment Slots Row */}
        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          marginBottom: '20px',
          padding: '12px',
          borderRadius: '10px',
          border: '1px solid rgba(168, 85, 247, 0.15)',
          background: 'rgba(168, 85, 247, 0.03)',
        }}>
          {EQUIP_SLOTS.map(slot => {
            const eqId = equipped[slot];
            const cat = eqId ? ITEM_CATALOG[eqId] : null;
            const rarityColor = cat ? (RARITY_COLORS[cat.rarity] || '#9ca3af') : 'rgba(168, 85, 247, 0.2)';
            return (
              <div key={slot} style={{
                width: '60px',
                height: '60px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                border: `2px solid ${cat ? rarityColor : 'rgba(168, 85, 247, 0.15)'}`,
                background: cat ? 'rgba(168, 85, 247, 0.12)' : 'rgba(168, 85, 247, 0.03)',
                boxShadow: cat ? `0 0 12px ${rarityColor}44` : 'none',
                position: 'relative',
              }}>
                {cat ? (
                  <span style={{ fontSize: '24px' }}>{cat.glyph}</span>
                ) : (
                  <span style={{ fontSize: '10px', color: 'rgba(168, 85, 247, 0.3)', textTransform: 'uppercase' }}>
                    {slot}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: 'rgba(168, 85, 247, 0.15)',
          margin: '0 0 16px 0',
        }} />

        {/* Backpack label */}
        <div style={{
          fontSize: '12px',
          color: 'rgba(168, 85, 247, 0.5)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '10px',
        }}>
          Backpack ({ownedItems.length} item{ownedItems.length !== 1 ? 's' : ''})
        </div>

        {/* Item Grid */}
        {ownedItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '30px',
            color: 'rgba(168, 85, 247, 0.3)',
            fontSize: '14px',
          }}>
            No items yet. Explore the world to find loot!
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
            gap: '10px',
            marginBottom: '16px',
          }}>
            {ownedItems.map((itemId, i) => {
              const cat = ITEM_CATALOG[itemId];
              if (!cat) return null;
              const isSelected = selectedIdx === i;
              const isHovered = hoveredIdx === i;
              const isEquipped = equipped[cat.slot] === itemId;
              const rarityColor = RARITY_COLORS[cat.rarity] || '#9ca3af';
              return (
                <button
                  key={itemId}
                  onClick={() => { setSelectedIdx(i); handleEquipClick(itemId); }}
                  onMouseEnter={() => { setHoveredIdx(i); setSelectedIdx(i); }}
                  onMouseLeave={() => setHoveredIdx(-1)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '12px 6px',
                    borderRadius: '10px',
                    border: isEquipped
                      ? `2px solid ${rarityColor}`
                      : isSelected || isHovered
                        ? '2px solid rgba(168, 85, 247, 0.5)'
                        : '2px solid rgba(168, 85, 247, 0.12)',
                    background: isEquipped
                      ? `${rarityColor}22`
                      : isSelected || isHovered
                        ? 'rgba(168, 85, 247, 0.08)'
                        : 'rgba(168, 85, 247, 0.03)',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    color: isEquipped ? rarityColor : '#94a3b8',
                    transition: 'all 0.15s ease',
                    boxShadow: isEquipped ? `0 0 16px ${rarityColor}44` : 'none',
                    outline: 'none',
                    position: 'relative',
                  }}
                >
                  {isEquipped && (
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      fontSize: '10px',
                      color: rarityColor,
                      fontWeight: 'bold',
                    }}>E</div>
                  )}
                  <span style={{ fontSize: '28px' }}>{cat.glyph}</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: isEquipped ? 700 : 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {cat.label}
                  </span>
                  <span style={{
                    fontSize: '9px',
                    color: rarityColor,
                    textTransform: 'uppercase',
                    opacity: 0.7,
                  }}>
                    {cat.rarity}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Detail Panel */}
        {activeItem && (
          <div style={{
            padding: '14px',
            borderRadius: '10px',
            border: `1px solid ${RARITY_COLORS[activeItem.rarity] || '#9ca3af'}33`,
            background: 'rgba(168, 85, 247, 0.04)',
            marginBottom: '16px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '32px' }}>{activeItem.glyph}</span>
              <div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#fff',
                  textShadow: `0 0 10px ${RARITY_COLORS[activeItem.rarity]}66`,
                }}>
                  {activeItem.label}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: RARITY_COLORS[activeItem.rarity],
                  textTransform: 'uppercase',
                }}>
                  {activeItem.rarity} · {activeItem.slot}
                </div>
              </div>
            </div>
            <p style={{
              fontSize: '13px',
              color: '#94a3b8',
              margin: '0 0 12px 0',
              lineHeight: 1.5,
            }}>
              {activeItem.description}
            </p>
            <button
              onClick={() => handleEquipClick(activeItem.id)}
              onMouseEnter={(e) => {
                const rc = RARITY_COLORS[activeItem.rarity] || '#a855f7';
                e.currentTarget.style.backgroundColor = `${rc}55`;
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.boxShadow = `0 0 20px ${rc}88`;
              }}
              onMouseLeave={(e) => {
                const isEq = equipped[activeItem.slot] === activeItem.id;
                e.currentTarget.style.backgroundColor = isEq ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)';
                e.currentTarget.style.color = isEq ? '#ef4444' : '#a855f7';
                e.currentTarget.style.boxShadow = `0 0 12px ${isEq ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`;
              }}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: equipped[activeItem.slot] === activeItem.id ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                color: equipped[activeItem.slot] === activeItem.id ? '#ef4444' : '#a855f7',
                border: `2px solid ${equipped[activeItem.slot] === activeItem.id ? '#ef4444' : '#a855f7'}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                transition: 'all 0.2s ease',
                boxShadow: `0 0 12px ${equipped[activeItem.slot] === activeItem.id ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`,
              }}
            >
              {equipped[activeItem.slot] === activeItem.id ? '✕ Unequip' : '⬆ Equip'}
            </button>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
          }}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            color: '#a855f7',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '8px',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transition: 'all 0.2s ease',
          }}
        >
          Close
        </button>

        {/* Hint */}
        <div style={{
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#555',
          borderTop: '1px solid #222',
          paddingTop: '8px',
        }}>
          <span style={{ color: '#a855f7' }}>◄ ►</span> browse &nbsp;·&nbsp;
          <span style={{ color: '#a855f7' }}>A / Enter</span> equip &nbsp;·&nbsp;
          <span style={{ color: '#a855f7' }}>ESC / Y</span> close
        </div>
      </div>
    </div>
  );
}
