import React, { useState, useRef, useEffect } from 'react';

function CopyableBubble({ text, children }) {
  const [showPill,    setShowPill]    = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [menuPos,     setMenuPos]     = useState(null); // {x, y} for desktop menu
  const holdTimer   = useRef(null);
  const pillTimer   = useRef(null);

  const doCopy = () => {
    // Clipboard API needs HTTPS or localhost; fall back to execCommand on iOS
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity  = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
    } catch (e) {}
    setCopied(true);
    clearTimeout(pillTimer.current);
    pillTimer.current = setTimeout(() => { setCopied(false); setShowPill(false); setMenuPos(null); }, 2000);
  };

  // ── Desktop right-click ──
  const onContextMenu = (e) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowPill(false);
  };

  // ── Mobile long-press ──
  const onTouchStart = (e) => {
    holdTimer.current = setTimeout(() => {
      setShowPill(true);
      setMenuPos(null);
    }, 500);
  };
  const cancelHold = () => clearTimeout(holdTimer.current);

  // Close menu on outside click
  useEffect(() => {
    if (!menuPos) return;
    const close = () => setMenuPos(null);
    document.addEventListener('click', close, { once: true });
    return () => document.removeEventListener('click', close);
  }, [menuPos]);

  const onMouseLeave = () => {
    setShowPill(false);
    setMenuPos(null);
    setCopied(false);
    clearTimeout(pillTimer.current);
  };

  return (
    <div
      className="copyable-bubble"
      onContextMenu={onContextMenu}
      onTouchStart={onTouchStart}
      onTouchEnd={cancelHold}
      onTouchMove={cancelHold}
      onMouseLeave={onMouseLeave}
    >
      {children}

      {/* Mobile long-press pill */}
      {showPill && (
        <div className="copy-pill">
          <button className="copy-pill-btn" onClick={doCopy}>
            <span className="material-symbols-outlined">{copied ? 'check' : 'content_copy'}</span>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Desktop right-click menu */}
      {menuPos && (
        <div className="ctx-menu" style={{ top: menuPos.y, left: menuPos.x }}>
          <button className="ctx-menu-item" onClick={doCopy}>
            <span className="material-symbols-outlined">{copied ? 'check' : 'content_copy'}</span>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}

export default CopyableBubble;
