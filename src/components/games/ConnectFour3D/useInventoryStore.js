// ConnectFour3D – Inventory System (Zustand store)
// Manages collectible items, equipment slots, and persistence via localStorage.

import { create } from 'zustand';

/* ================================================================
   Item Catalog — every item the game knows about
   ================================================================ */
export const ITEM_CATALOG = {
  jetpack: {
    id: 'jetpack',
    label: 'Jetpack',
    glyph: '🚀',
    description: 'Strap on some thrust. Hold F or RT to fly.',
    slot: 'back',          // equipment slot
    rarity: 'epic',
    modelUrl: '/models/props/jetpack/Meshy_AI_jetpack_0226164513_texture.fbx',
    textureUrl: '/models/props/jetpack/Meshy_AI_jetpack_0226164513_texture.png',
    metallicUrl: '/models/props/jetpack/Meshy_AI_jetpack_0226164513_texture_metallic.png',
    normalUrl: '/models/props/jetpack/Meshy_AI_jetpack_0226164513_texture_normal.png',
    roughnessUrl: '/models/props/jetpack/Meshy_AI_jetpack_0226164513_texture_roughness.png',
    // Visual tuning for attachment on avatar back
    attachOffset: [-1.668, -0.739, -11.960],
    attachScale: 0.360,
    attachRotation: [-2.870, -0.063, 3.089],
    // Gameplay effect
    effect: 'enableJetpack',
  },
  // Future items can be added here:
  // helmet: { id: 'helmet', label: 'Space Helmet', glyph: '🪖', slot: 'head', ... },
  // boots: { id: 'boots', label: 'Moon Boots', glyph: '👢', slot: 'feet', ... },
};

/* ================================================================
   Rarity colours (for UI borders / glow)
   ================================================================ */
export const RARITY_COLORS = {
  common:    '#9ca3af',
  uncommon:  '#22c55e',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f59e0b',
};

/* ================================================================
   Equipment slots
   ================================================================ */
export const EQUIP_SLOTS = ['head', 'back', 'hand', 'feet'];

/* ================================================================
   localStorage helpers
   ================================================================ */
const LS_KEY = 'cf3d_inventory';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveToStorage(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      ownedItems: state.ownedItems,
      equipped: state.equipped,
    }));
  } catch {}
}

/* ================================================================
   Zustand Store
   ================================================================ */
const saved = loadFromStorage();

export const useInventoryStore = create((set, get) => ({
  // Items the player owns (array of item IDs)
  ownedItems: saved?.ownedItems || ['jetpack'], // start with jetpack in inventory

  // Currently equipped items: { [slot]: itemId | null }
  equipped: saved?.equipped || { head: null, back: 'jetpack', hand: null, feet: null },

  // UI state
  isOpen: false,
  openInventory: () => set({ isOpen: true }),
  closeInventory: () => set({ isOpen: false }),
  toggleInventory: () => set(s => ({ isOpen: !s.isOpen })),

  // ---- Actions ----

  /** Give the player an item (no duplicates) */
  addItem: (itemId) => {
    set(s => {
      if (s.ownedItems.includes(itemId)) return s;
      const next = { ...s, ownedItems: [...s.ownedItems, itemId] };
      saveToStorage(next);
      return next;
    });
  },

  /** Remove an item (also unequips if equipped) */
  removeItem: (itemId) => {
    set(s => {
      const next = {
        ...s,
        ownedItems: s.ownedItems.filter(id => id !== itemId),
        equipped: { ...s.equipped },
      };
      // Unequip if currently equipped
      for (const slot of EQUIP_SLOTS) {
        if (next.equipped[slot] === itemId) next.equipped[slot] = null;
      }
      saveToStorage(next);
      return next;
    });
  },

  /** Equip an item into its slot (unequips previous occupant) */
  equipItem: (itemId) => {
    const catalog = ITEM_CATALOG[itemId];
    if (!catalog) return;
    set(s => {
      if (!s.ownedItems.includes(itemId)) return s;
      const next = {
        ...s,
        equipped: { ...s.equipped, [catalog.slot]: itemId },
      };
      saveToStorage(next);
      return next;
    });
  },

  /** Unequip an item from its slot */
  unequipItem: (itemId) => {
    const catalog = ITEM_CATALOG[itemId];
    if (!catalog) return;
    set(s => {
      if (s.equipped[catalog.slot] !== itemId) return s;
      const next = {
        ...s,
        equipped: { ...s.equipped, [catalog.slot]: null },
      };
      saveToStorage(next);
      return next;
    });
  },

  /** Toggle equip / unequip */
  toggleEquip: (itemId) => {
    const catalog = ITEM_CATALOG[itemId];
    if (!catalog) return;
    const s = get();
    if (s.equipped[catalog.slot] === itemId) {
      get().unequipItem(itemId);
    } else {
      get().equipItem(itemId);
    }
  },

  /** Check if a specific effect is active (any equipped item provides it) */
  hasEffect: (effect) => {
    const s = get();
    return Object.values(s.equipped).some(id => {
      if (!id) return false;
      const cat = ITEM_CATALOG[id];
      return cat && cat.effect === effect;
    });
  },

  /** Get the catalog entry for an equipped slot */
  getEquippedInSlot: (slot) => {
    const id = get().equipped[slot];
    return id ? ITEM_CATALOG[id] : null;
  },
}));
