import React from 'react';
import ChatItem from '../chat/ChatItem';

export function formatChatName(name) {
  if (!name) return 'Chat';
  // Strip trailing _xxxxxx hex uniqueness suffix (e.g. "Bet Scout_a3f9c1" → "Bet Scout")
  const stripped = name.replace(/_[0-9a-f]{6}$/, '');
  // Legacy: time-based fallback names like auto_0412_213808 or hc_0412_2138
  const timeMatch = stripped.match(/^([a-z]+)_(\d{2})(\d{2})_(\d{2})(\d{2})(?:\d{2})?$/);
  if (timeMatch) {
    const [, prefix, month, day, hour, min] = timeMatch;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthName = months[parseInt(month, 10) - 1] || month;
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const labels = { auto: '', hc: 'HoopCipher · ', home: 'Home · ', siri: 'Siri · ' };
    const label = labels[prefix] ?? '';
    return `${label}${monthName} ${parseInt(day, 10)}, ${h12}:${min} ${ampm}`;
  }
  // Descriptive synonym-pool name or user-renamed — show as-is (already readable)
  return stripped;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  theme,
  toggleTheme,
  startNewChat,
  setSearchOpen,
  chats,
  currentChat,
  renamingChat,
  renameValue,
  setRenameValue,
  switchChat,
  deleteChat,
  startRename,
  confirmRename,
  cancelRename,
  view,
  navigateTo,
  financeError,
  currentAgent,
}) {
  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>

      {/* Top fixed section */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div>
            <div className="brand-name">Chats</div>
            <div className="brand-sub">AI Assistant</div>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} title={theme === 'tahoe' ? 'Switch to Dark' : 'Switch to Tahoe'}>
            <div className="theme-toggle-orb" />
          </button>
        </div>

        <button className="new-chat-btn" onClick={startNewChat}>
          <span className="material-symbols-outlined">add</span>
          New Chat
        </button>

        <button className="search-chats-btn" onClick={() => setSearchOpen(true)}>
          <span className="material-symbols-outlined">search</span>
          Search Chats
        </button>

        <div className="chat-list-label">Recent Chats</div>
      </div>

      {/* Scrollable chat list — fills all remaining space */}
      <nav className="chat-list">
        {chats.length === 0 && (
          <div className="chat-empty">No saved chats yet</div>
        )}
        {chats.map((s) => (
          <ChatItem
            key={s.name}
            s={s}
            currentChat={currentChat}
            renamingChat={renamingChat}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            onSwitch={switchChat}
            onDelete={(name) => deleteChat(name, { stopPropagation: () => {} })}
            onStartRename={startRename}
            onConfirmRename={confirmRename}
            onCancelRename={cancelRename}
            formatDate={formatDate}
            formatChatName={formatChatName}
          />
        ))}
      </nav>

      {/* Bottom nav — pinned above user card */}
      <div className="sidebar-nav-footer">
        <div className="sidebar-nav-label">Apps</div>

        {financeError && (
          <div className="finance-access-error">
            <span className="material-symbols-outlined">lock</span>
            {financeError}
          </div>
        )}

        <button
          className={`sidebar-finance-btn ${view === 'finance' ? 'active' : ''}`}
          onClick={() => { navigateTo('finance'); setSidebarOpen(false); }}
        >
          <span className="material-symbols-outlined">account_balance</span>
          Finance
        </button>

        <button
          className={`sidebar-finance-btn ${view === 'projects' ? 'active' : ''}`}
          onClick={() => { navigateTo('projects'); setSidebarOpen(false); }}
        >
          <span className="material-symbols-outlined">view_kanban</span>
          Projects
        </button>

        <button
          className={`sidebar-finance-btn ${view === 'hoopcipher' ? 'active' : ''}`}
          onClick={() => { navigateTo('hoopcipher'); setSidebarOpen(false); }}
        >
          <span className="material-symbols-outlined">sports_basketball</span>
          HoopCipher
        </button>
      </div>

      {/* User section at bottom */}
      <div className="sidebar-user">
        <div className="user-avatar">A</div>
        <div>
          <div className="user-name">Areccus</div>
          <div className="user-model">{currentAgent.model}</div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
