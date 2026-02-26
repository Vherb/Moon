import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// A compact, mobile-only bottom nav to jump between games.
// It updates --footer-h so content and floating UI respect the bar height.
export default function MobileBottomNav() {
  const ref = React.useRef(null);
  const { pathname } = useLocation();

  const updateHeight = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    try {
      const style = window.getComputedStyle(el);
      const hidden = style?.display === 'none' || style?.visibility === 'hidden';
      if (hidden) return; // Don't claim space if not visible
    } catch {}
    const h = (ref.current?.offsetHeight || 0);
    try { document.documentElement.style.setProperty('--footer-h', h + 'px'); } catch {}
  }, []);

  React.useEffect(() => {
    updateHeight();
    let ro;
    try {
      ro = new ResizeObserver(updateHeight);
      if (ref.current) ro.observe(ref.current);
    } catch {}
    window.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
      try { ro && ro.disconnect(); } catch {}
    };
  }, [updateHeight]);

  const announceNavigate = React.useCallback((to) => {
    try { window.dispatchEvent(new CustomEvent('game:beforeNavigate', { detail: { to, ts: Date.now() } })); } catch {}
  }, []);

  const Item = ({ to, label, icon }) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={`mbn-item ${active ? 'active' : ''}`}
        aria-current={active ? 'page' : undefined}
        onMouseDown={() => announceNavigate(to)}
        onTouchStart={() => announceNavigate(to)}
      >
        <span className="mbn-ico" aria-hidden>
          {icon}
        </span>
        <span className="mbn-label">{label}</span>
      </Link>
    );
  };

  // No actions in bottom nav — keep original five game links

  return (
    <nav ref={ref} className="mobile-bottom-nav" role="navigation" aria-label="Game shortcuts">
      <Item to="/" label="Home" icon={<span>🌙</span>} />
      <Item to="/rooms" label="Rooms" icon={<span>🏠</span>} />
      <Item to="/connect-four" label="Quick Play" icon={<span>🚀</span>} />
    </nav>
  );
}
