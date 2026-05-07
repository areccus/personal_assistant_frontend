import React, { useState, useEffect } from 'react';
import FinanceDashboard from './FinanceDashboard';
import HoopCipherDashboard from './HoopCipherDashboard';
import TasksView from './TasksView';
import NewsView from './NewsView';
import Sidebar from './components/layout/Sidebar';
import ThinkingPhrase from './components/ui/ThinkingPhrase';
import { AssistantMessage } from './components/ui/ABComparison';
import ABComparison from './components/ui/ABComparison';
import CopyableBubble from './components/ui/CopyableBubble';
import DownloadBar from './components/ui/DownloadBar';
import { useChat } from './hooks/useChat';
import { AGENTS, CLIENT_ID } from './constants';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';

const WELCOME_MESSAGES = [
  "How can I help you today?",
  "What's on your mind?",
  "Ready when you are.",
  "What are we working on?",
  "Ask me anything.",
  "What do you need?",
  "What can I help you with?",
];

function App() {
  const {
    messages,
    setMessages,
    input,
    setInput,
    agent,
    isLoading,
    theme,
    attachedFiles,
    chats,
    currentChat,
    sidebarOpen,
    setSidebarOpen,
    renamingChat,
    renameValue,
    setRenameValue,
    searchOpen,
    setSearchOpen,
    searchQuery,
    searchResults,
    searchLoading,
    streamState,
    abTarget,
    setAbTarget,
    financeError,
    view,
    fileInputRef,
    messagesEndRef,
    searchInputRef,
    toggleTheme,
    navigateTo,
    onSearchChange,
    openSearchResult,
    startNewChat,
    switchChat,
    deleteChat,
    startRename,
    cancelRename,
    confirmRename,
    switchAgent,
    handleFileChange,
    removeAttachment,
    cancelRequest,
    sendMessage,
    handleKeyDown,
  } = useChat();

  const currentAgent = AGENTS[agent];
  const [newsInArticle, setNewsInArticle] = useState(false);

  // ── Real viewport height — recalculates on resume so iOS PWA bar stays gone ──
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty('--real-vh', `${window.innerHeight}px`);
    };
    // iOS hasn't finished restoring the viewport at visibilitychange/pageshow,
    // so we set immediately and again after it settles.
    const setVhAfterSettle = () => { setVh(); setTimeout(setVh, 120); };
    setVh();
    window.addEventListener('resize', setVh);
    document.addEventListener('visibilitychange', setVhAfterSettle);
    window.addEventListener('pageshow', setVhAfterSettle);
    return () => {
      window.removeEventListener('resize', setVh);
      document.removeEventListener('visibilitychange', setVhAfterSettle);
      window.removeEventListener('pageshow', setVhAfterSettle);
    };
  }, []);

  // ── Local UI state ────────────────────────────────────────────────────────────

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem('zc_sidebar_collapsed') === 'true'
  );
  const [welcomeMsg] = useState(
    () => WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [agentDropOpen, setAgentDropOpen] = useState(false);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('zc_sidebar_collapsed', next.toString());
      return next;
    });
  };

  // Close model dropdown when clicking outside
  useEffect(() => {
    if (!agentDropOpen) return;
    const close = (e) => {
      if (!e.target.closest('.model-selector-wrap')) setAgentDropOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [agentDropOpen]);

  return (
    <>
      {/* ── Animated background orbs — outside shell so they can't affect its layout ── */}
      <div className="orb orb-teal" />
      <div className="orb orb-purple" />
      <div className="bg-overlay" />
      <div className="bg-noise" />

      <div className={`shell ${theme}${sidebarCollapsed ? ' sidebar-desktop-hidden' : ''}`}>

      {/* ── Settings popup ── */}
      {settingsOpen && (
        <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="settings-popup" onClick={e => e.stopPropagation()}>
            <div className="settings-header">Settings</div>
            <button className="settings-item" onClick={toggleTheme}>
              <span className="material-symbols-outlined">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
              {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
            </button>
          </div>
        </div>
      )}

      {/* ── Chat Search Modal ── */}
      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="search-modal" onClick={e => e.stopPropagation()}>
            <div className="search-input-row">
              <span className="material-symbols-outlined search-icon">search</span>
              <input
                ref={searchInputRef}
                className="search-input"
                placeholder="Search all chats..."
                value={searchQuery}
                onChange={onSearchChange}
                onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchOpen(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>
            <div className="search-results">
              {searchLoading && <div className="search-empty">Searching...</div>}
              {!searchLoading && searchQuery && searchResults.length === 0 && (
                <div className="search-empty">No chats found for "{searchQuery}"</div>
              )}
              {!searchLoading && !searchQuery && (
                <div className="search-empty">Type to search across all your chats</div>
              )}
              {searchResults.map((r, i) => (
                <button key={i} className="search-result-item" onClick={() => openSearchResult(r.session)}>
                  <div className="search-result-name">
                    <span className="material-symbols-outlined">chat_bubble</span>
                    {r.session}
                  </div>
                  <div className="search-result-snippet">{r.snippet}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile overlay — clicking it closes the sidebar ── */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Floating action buttons ── */}

      {/* Hamburger: chat always; news feed only (not when article open) */}
      {(view === 'chat' || (view === 'news' && !newsInArticle)) && (
        <button
          className="fab-sidebar-open floating-fab"
          onClick={() => setSidebarOpen(true)}
          title="Open sidebar"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      )}

      {/* Desktop re-expand: same condition as hamburger */}
      {(view === 'chat' || (view === 'news' && !newsInArticle)) && (
        <button
          className="fab-sidebar-expand floating-fab"
          onClick={toggleSidebarCollapsed}
          title="Expand sidebar"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      )}

      {/* New chat: chat only */}
      {view === 'chat' && (
        <button
          className="fab-new-chat floating-fab"
          onClick={startNewChat}
          title="New chat"
        >
          <span className="material-symbols-outlined">edit_note</span>
        </button>
      )}

      {/* ── SIDEBAR ── */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        startNewChat={startNewChat}
        setSearchOpen={setSearchOpen}
        chats={chats}
        currentChat={currentChat}
        renamingChat={renamingChat}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        switchChat={switchChat}
        deleteChat={deleteChat}
        startRename={startRename}
        confirmRename={confirmRename}
        cancelRename={cancelRename}
        view={view}
        navigateTo={navigateTo}
        financeError={financeError}
        currentAgent={currentAgent}
        onCollapse={toggleSidebarCollapsed}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* ── MAIN ── */}
      <main className="main">

        {view === 'finance' && (
          <FinanceDashboard onBack={() => navigateTo('chat')} theme={theme} />
        )}

        {view === 'hoopcipher' && (
          <HoopCipherDashboard onBack={() => navigateTo('chat')} />
        )}

        {view === 'tasks' && (
          <TasksView onBack={() => navigateTo('chat')} />
        )}

        {view === 'news' && (
          <NewsView onBack={() => navigateTo('chat')} onArticleChange={setNewsInArticle} />
        )}

        {view === 'chat' && <>

        <section className="messages-area">
          <div className="messages-inner">

            {messages.length === 0 && (
              <div className="empty-state">
                <h2 className="welcome-heading">{welcomeMsg}</h2>
                <p className="welcome-sub">Powered by {currentAgent.name} · {currentAgent.model}</p>
                <div className="welcome-chips">
                  {['Explain quantum computing', 'Write a Python script', 'Help me plan my week', "What's the best way to learn design?"].map(prompt => (
                    <button key={prompt} className="welcome-chip" onClick={() => setInput(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`msg-row msg-${msg.role}`}>

                {msg.role === 'assistant' && (
                  <>
                    <div className="assistant-card">
                      <div className="card-header">
                        <div className="card-header-dot" />
                        <span className="card-header-name">{msg.agent || currentAgent.name}</span>
                        {msg.model && <span className="model-pill">{msg.model}</span>}
                        <div className="meta-badges">
                          {msg.web_search_used   && <span className="meta-badge search">🔍 web</span>}
                          {msg.tutor_mode        && <span className="meta-badge tutor">🎓 tutor mode</span>}
                          {msg.memory_used       && <span className="meta-badge memory">🧠 memory</span>}
                          {msg.context_used      && <span className="meta-badge ctx">📋 context</span>}
                          {msg.balance_fetched   && <span className="meta-badge balance">💳 balance</span>}
                          {msg.file_generated    && <span className="meta-badge file">📄 file</span>}
                          {msg.memory_auto_saved && <span className="meta-badge remembered" title={msg.memory_fact ? `${msg.memory_fact.key}: ${msg.memory_fact.value}` : ''}>💾 remembered</span>}
                          {msg.history_searched  && <span className="meta-badge history">🕓 {msg.history_results} past</span>}
                        </div>
                      </div>
                      <div className="card-body">
                        <AssistantMessage content={msg.content} image_urls={msg.image_urls} />
                      </div>
                      <div className="card-actions">
                        <button className="card-action-btn" onClick={() => { try { navigator.clipboard.writeText(msg.content); } catch(e) {} }}>
                          <span className="material-symbols-outlined">content_copy</span>
                          Copy
                        </button>
                        {['up', 'down'].map(dir => (
                          <button
                            key={dir}
                            className={`card-action-btn${msg.rating === dir ? ' card-action-btn--rated' : ''}`}
                            disabled={msg.rating != null}
                            onClick={() => {
                              setMessages(prev => prev.map((m, i) => i === idx ? { ...m, rating: dir } : m));
                              fetch(`${API_URL}/thumbs`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  direction: dir,
                                  user_message: msg._userText || '',
                                  ai_response: msg.content || '',
                                }),
                              }).catch(() => {});
                            }}
                          >
                            <span className="material-symbols-outlined">
                              {dir === 'up'
                                ? (msg.rating === 'up' ? 'thumb_up' : 'thumb_up')
                                : (msg.rating === 'down' ? 'thumb_down' : 'thumb_down')}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {msg.tks != null && (
                      <div className="tks-line">{Math.round(msg.tks)} tok/s</div>
                    )}
                    {msg.tutor_mode && <DownloadBar content={msg.content} />}
                    {abTarget && abTarget.msgIndex === idx && (
                      <ABComparison
                        messageText={abTarget.userText}
                        responseA={msg.content}
                        clientId={CLIENT_ID}
                        onPick={(preferred) => {
                          setMessages(prev => prev.map((m, i) =>
                            i === idx ? { ...m, content: preferred } : m
                          ));
                          setAbTarget(null);
                        }}
                      />
                    )}
                  </>
                )}
                {msg.role === 'user' && (
                  <div className="bubble-user">
                    <CopyableBubble text={msg.content}>{msg.content}</CopyableBubble>
                  </div>
                )}
                {msg.role === 'error' && (
                  <div className="bubble bubble-error">{msg.content}</div>
                )}
                {msg.role === 'system' && (
                  <div className="system-msg">{msg.content}</div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="msg-row msg-assistant">
                <div className="assistant-card">
                  <div className="card-header">
                    <div className="card-header-dot" />
                    <span className="card-header-name">{currentAgent.name}</span>
                    {streamState && streamState.tks > 0 && (
                      <span className="tks-badge">{Math.round(streamState.tks)} tok/s</span>
                    )}
                  </div>
                  {!streamState || streamState.content === '' ? (
                    <div className="card-loading">
                      <div className="typing"><span /><span /><span /></div>
                      <ThinkingPhrase />
                    </div>
                  ) : (
                    <div className="streaming-content">
                      {streamState.content}
                      <span className="stream-cursor" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Input bar */}
        <div className="input-area">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".py,.js,.ts,.jsx,.tsx,.html,.css,.json,.yaml,.yml,.txt,.md,.sql,.sh,.rs,.go,.java,.cpp,.c,.rb,.php,.swift,.kt,image/png,image/jpeg,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div className="input-pill-wrap">
            <div className="input-pill">
              {attachedFiles.length > 0 && (
                <div className="attachment-chips">
                  {attachedFiles.map((f, i) => (
                    <div key={i} className="attach-chip">
                      {f.isImage
                        ? <img src={f.previewUrl} alt={f.name} className="attach-chip-thumb" />
                        : <span className="material-symbols-outlined attach-chip-icon">description</span>
                      }
                      <span className="attach-chip-name">{f.name}</span>
                      <button className="attach-chip-remove" onClick={() => removeAttachment(i)}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="input-pill-row">

                <button
                  className="attach-btn"
                  type="button"
                  title="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-symbols-outlined">attach_file</span>
                </button>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentAgent.placeholder}
                  rows="1"
                  disabled={isLoading}
                  className="pill-textarea"
                />

                {/* Model selector — right side, before send */}
                <div className="model-selector-wrap">
                  <button
                    className="model-selector-btn"
                    onClick={() => setAgentDropOpen(prev => !prev)}
                    title={`Switch model (${currentAgent.name})`}
                  >
                    {/* Desktop: name + chevron */}
                    <span className="model-selector-name">{currentAgent.name}</span>
                    <span className="material-symbols-outlined model-chevron">expand_more</span>
                    {/* Mobile: icon only */}
                    <span className="material-symbols-outlined model-selector-icon-mobile">tune</span>
                  </button>
                  {agentDropOpen && (
                    <div className="model-dropdown">
                      {Object.entries(AGENTS).map(([key, info]) => (
                        <button
                          key={key}
                          className={`model-option ${agent === key ? 'active' : ''}`}
                          onClick={() => { switchAgent(key); setAgentDropOpen(false); }}
                        >
                          <span className="model-option-emoji">{info.emoji}</span>
                          <span className="model-option-info">
                            <span className="model-option-name">{info.name}</span>
                            <span className="model-option-desc">{info.model}</span>
                          </span>
                          {agent === key && (
                            <span className="material-symbols-outlined model-option-check">check</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isLoading ? (
                  <button onClick={cancelRequest} className="stop-btn">
                    <span className="material-symbols-outlined">stop</span>
                  </button>
                ) : (
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() && attachedFiles.length === 0}
                    className="send-btn"
                  >
                    <span className="material-symbols-outlined">arrow_upward</span>
                  </button>
                )}
              </div>
            </div>
            <div className="input-hint">Press Enter to send · Shift+Enter for new line</div>
          </div>
        </div>
        </>}

      </main>
    </div>
    </>
  );
}

export default App;
