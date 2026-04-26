import React, { useState, useRef } from 'react';

function ChatItem({ s, currentChat, renamingChat, renameValue, setRenameValue,
                    onSwitch, onDelete, onStartRename, onConfirmRename, onCancelRename, formatDate, formatChatName }) {
  const [dragX, setDragX]     = useState(0);
  const [dragging, setDragging] = useState(false);
  const [snapOpen, setSnapOpen] = useState(false);
  const startX = useRef(null);

  const SNAP_THRESHOLD   = 60;
  const DELETE_THRESHOLD = 170;
  const SNAP_POS         = 128;

  const dragStart = (e) => {
    if (renamingChat === s.name) return;
    if (snapOpen) { setDragX(0); setSnapOpen(false); return; }
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
    setDragging(true);
  };

  const dragMove = (e) => {
    if (!dragging || startX.current === null) return;
    const x     = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = startX.current - x;
    setDragX(delta > 0 ? Math.min(delta, DELETE_THRESHOLD + 20) : 0);
  };

  const dragEnd = () => {
    if (dragX >= DELETE_THRESHOLD)    onDelete(s.name);
    else if (dragX >= SNAP_THRESHOLD) { setDragX(SNAP_POS); setSnapOpen(true); }
    else                              { setDragX(0); setSnapOpen(false); }
    setDragging(false);
    startX.current = null;
  };

  const closeSnap = () => { setDragX(0); setSnapOpen(false); };

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (snapOpen) { closeSnap(); }
    else { setDragX(SNAP_POS); setSnapOpen(true); }
  };

  const progress = Math.min(dragX / SNAP_POS, 1);

  return (
    <div className="chat-item-outer">
      {/* Reveal panel — edit (blue) + delete (red) */}
      <div className="chat-reveal" style={{ opacity: Math.min(progress * 1.4, 1) }}>
        <button className="reveal-btn reveal-edit"
                onClick={(e) => { e.stopPropagation(); closeSnap(); onStartRename(s.name, e); }}>
          <span className="material-symbols-outlined">edit</span>
        </button>
        <button className="reveal-btn reveal-delete"
                onClick={(e) => { e.stopPropagation(); onDelete(s.name); }}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Draggable row */}
      <div
        className={`chat-item ${s.name === currentChat ? 'active' : ''}`}
        style={{
          transform:  `translateX(-${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          cursor:     dragging ? 'grabbing' : 'pointer',
          userSelect: 'none',
        }}
        onMouseDown={dragStart} onMouseMove={dragMove}
        onMouseUp={dragEnd}     onMouseLeave={dragEnd}
        onTouchStart={dragStart} onTouchMove={dragMove} onTouchEnd={dragEnd}
        onClick={() => {
          if (snapOpen) { closeSnap(); return; }
          if (dragX < 5 && renamingChat !== s.name) onSwitch(s.name);
        }}
        onContextMenu={handleContextMenu}
      >
        <div className="chat-item-info">
          {renamingChat === s.name ? (
            <input
              autoFocus
              className="chat-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  onConfirmRename(s.name);
                if (e.key === 'Escape') onCancelRename();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="chat-name">{formatChatName(s.name)}</span>
          )}
        </div>
      </div>

    </div>
  );
}

export default ChatItem;
