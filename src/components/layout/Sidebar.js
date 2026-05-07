import React from 'react';
import ChatItem from '../chat/ChatItem';

export function formatChatName(name) {
  if (!name) return 'Chat';
  const stripped = name.replace(/_[0-9a-f]{6}$/, '');
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
  onCollapse,
  onOpenSettings,
}) {
  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>

      {/* Top fixed section */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-mark">
            <div className="brand-orb" />
            <div>
              <div className="brand-name">Intelligence</div>
              <div className="brand-sub">AI Assistant</div>
            </div>
          </div>
          <button
            className="sidebar-collapse-btn"
            onClick={onCollapse}
            title="Collapse sidebar"
          >
            <span className="material-symbols-outlined">menu_open</span>
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

      {/* Scrollable chat list */}
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

      {/* Bottom nav — Apps */}
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
          className={`sidebar-finance-btn ${view === 'tasks' ? 'active' : ''}`}
          onClick={() => { navigateTo('tasks'); setSidebarOpen(false); }}
        >
          <span className="material-symbols-outlined">view_kanban</span>
          Tasks
        </button>

        <button
          className={`sidebar-finance-btn ${view === 'hoopcipher' ? 'active' : ''}`}
          onClick={() => { navigateTo('hoopcipher'); setSidebarOpen(false); }}
        >
          <span className="material-symbols-outlined">sports_basketball</span>
          HoopCipher
        </button>

        <button
          className={`sidebar-finance-btn ${view === 'news' ? 'active' : ''}`}
          onClick={() => { navigateTo('news'); setSidebarOpen(false); }}
        >
          <span className="material-symbols-outlined">newspaper</span>
          Daily Briefing
        </button>
      </div>

      {/* User card — click to open settings */}
      <div className="sidebar-user" onClick={onOpenSettings} role="button" tabIndex={0}>
        <div className="user-avatar">A</div>
        <div className="user-info">
          <div className="user-name">Areccus</div>
          <div className="user-model">{currentAgent.model}</div>
        </div>
        <span className="material-symbols-outlined user-settings-icon">settings</span>
      </div>

    </aside>
  );
}

export default Sidebar;
