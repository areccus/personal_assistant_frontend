import React, { useState, useEffect } from 'react';
import FinanceDashboard from './FinanceDashboard';
import HoopCipherDashboard from './HoopCipherDashboard';
import TasksView from './TasksView';
import NewsView from './NewsView';
import Sidebar from './components/layout/Sidebar';
import AppRail from './components/layout/AppRail';
import LivingOrb from './components/ui/LivingOrb';
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
  "Good morning.",
  "Good afternoon.",
  "Good evening.",
  "What are we working on?",
  "Ready when you are.",
];

const AGENT_SUGGESTIONS = {
  jarvis: [
    { label: 'What\'s on my calendar today?',  sigil: '📅' },
    { label: 'Remind me to...',                sigil: '🔔' },
    { label: 'Check my finances',              sigil: '💰' },
    { label: 'Set a savings goal',             sigil: '🎯' },
  ],
  friday: [
    { label: 'Debug this code',                sigil: '🐛' },
    { label: 'Explain like I\'m 5',            sigil: '💡' },
    { label: 'Write a summary',                sigil: '📝' },
    { label: 'Compare my options',             sigil: '⚖️' },
  ],
  tutor: [
    { label: 'Quiz me on this topic',          sigil: '🧠' },
    { label: 'Explain the key concepts',       sigil: '📖' },
    { label: 'Give me an exam question',       sigil: '✏️' },
    { label: 'What should I study next?',      sigil: '🗺️' },
  ],
};

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
    contextChips,
    contextContinue,
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
    regenerate,
  } = useChat();

  const currentAgent = AGENTS[agent];
  const [newsInArticle, setNewsInArticle] = useState(false);

  // ── Real viewport height + keyboard offset ───────────────────────────────────
  // Uses visualViewport when available so the layout tracks the area ABOVE the
  // soft keyboard, not the full layout viewport. Resets any iOS scroll drift on
  // keyboard dismiss so the page never stays stuck above where the keyboard was.
  useEffect(() => {
    const vv = window.visualViewport;

    const update = () => {
      const h = vv ? vv.height : window.innerHeight;
      // Offset from viewport top — non-zero when browser chrome scrolls the
      // page to focus an input; we use this to keep the composer glued to the
      // visible bottom rather than the layout bottom.
      const off = vv ? vv.offsetTop : 0;
      document.documentElement.style.setProperty('--real-vh', `${h}px`);
      document.documentElement.style.setProperty('--vv-offset-top', `${off}px`);
      // Reset iOS scroll drift when keyboard closes (offset returns to ~0)
      if (off === 0 && window.scrollY !== 0) window.scrollTo(0, 0);
    };

    const settle = () => { update(); setTimeout(update, 100); setTimeout(update, 350); };

    update();
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    } else {
      window.addEventListener('resize', update);
    }
    document.addEventListener('visibilitychange', settle);
    window.addEventListener('pageshow', settle);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      } else {
        window.removeEventListener('resize', update);
      }
      document.removeEventListener('visibilitychange', settle);
      window.removeEventListener('pageshow', settle);
    };
  }, []);

  // ── Local UI state ────────────────────────────────────────────────────────────

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem('zc_sidebar_collapsed') === 'true'
  );
  const [welcomeMsg] = useState(() => {
    const h = new Date().getHours();
    if (h < 5)  return 'Good evening.';
    if (h < 12) return 'Good morning.';
    if (h < 18) return 'Good afternoon.';
    return 'Good evening.';
  });
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

      {/* Hamburger: always visible (mobile nav for all views) */}
      {(view !== 'news' || !newsInArticle) && (
        <button
          className="fab-sidebar-open floating-fab"
          onClick={() => setSidebarOpen(true)}
          title="Open sidebar"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      )}

      {/* Desktop re-expand: chat + news only */}
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

      {/* Mobile back-to-chat: non-chat app views only */}
      {view !== 'chat' && (
        <button
          className="fab-back-chat floating-fab"
          onClick={() => navigateTo('chat')}
          title="Back to chat"
        >
          <span className="material-symbols-outlined">chat</span>
        </button>
      )}

      {/* ── APP RAIL (desktop) ── */}
      <AppRail view={view} navigateTo={navigateTo} />

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
        agent={agent}
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
                <div className="empty-mark">
                  <LivingOrb size={18} state={agent === 'friday' ? 'friday' : agent === 'tutor' ? 'tutor' : 'idle'} />
                  <span className="empty-agent-label">{currentAgent.name} · Listening</span>
                </div>
                <h2 className="welcome-heading">
                  {welcomeMsg} <span className="accent">How can I help?</span>
                </h2>
                <p className="welcome-sub">{currentAgent.model}</p>
                <div className="sugg-grid">
                  {(AGENT_SUGGESTIONS[agent] || AGENT_SUGGESTIONS.jarvis).map(s => (
                    <button key={s.label} className="sugg-tile" onClick={() => setInput(s.label)}>
                      <span className="sugg-tile-icon">{s.sigil}</span>
                      <span className="sugg-tile-label">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`msg-row msg-${msg.role}`}>

                {msg.role === 'assistant' && (
                  <>
                    <div className="assistant-card" data-agent={msg.agent || currentAgent.name}>
                      <div className="card-header">
                        <LivingOrb size={10} state={msg.tutor_mode ? 'tutor' : (msg.agent || currentAgent.name) === 'Friday' ? 'friday' : 'idle'} />
                        <span className="card-header-name">{msg.agent || currentAgent.name}</span>
                        {msg.model && <span className={`model-pill${(msg.agent || currentAgent.name) === 'Friday' ? ' model-pill--friday' : ''}`}>{msg.model}</span>}
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
                      {msg.sources?.length > 0 && (
                        <div className="sources-strip">
                          {msg.sources.map((s, si) => (
                            <a key={si} href={s.url} target="_blank" rel="noopener noreferrer" className="source-pill">
                              <span className="material-symbols-outlined source-pill-icon">link</span>
                              {s.title}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="card-actions">
                        <button className="card-action-btn" onClick={() => { try { navigator.clipboard.writeText(msg.content); } catch(e) {} }}>
                          <span className="material-symbols-outlined">content_copy</span>
                          Copy
                        </button>
                        <button className="card-action-btn" onClick={regenerate}>
                          <span className="material-symbols-outlined">refresh</span>
                          Regenerate
                        </button>
                        {[{dir:'up',label:'Helpful'},{dir:'down',label:'Not quite'}].map(({dir,label}) => (
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
                            <span className="material-symbols-outlined">{dir === 'up' ? 'thumb_up' : 'thumb_down'}</span>
                            {label}
                          </button>
                        ))}
                        <button className="card-action-btn" onClick={() => {
                          const text = `${msg._userText ? msg._userText + '\n\n' : ''}${msg.content}`;
                          if (navigator.share) { navigator.share({ text }); }
                          else { try { navigator.clipboard.writeText(text); } catch(e) {} }
                        }}>
                          <span className="material-symbols-outlined">share</span>
                          Share
                        </button>
                      </div>
                      {msg.continue_suggestion && (
                        <button className="continue-suggestion" onClick={() => setInput(msg.continue_suggestion)}>
                          <span className="material-symbols-outlined">arrow_forward</span>
                          Continue — <em>{msg.continue_suggestion}</em>
                        </button>
                      )}
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
                <div className="assistant-card" data-agent={currentAgent.name}>
                  <div className="card-header">
                    <LivingOrb size={10} state={currentAgent.name === 'Friday' ? 'friday-thinking' : 'thinking'} />
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
            {!input.trim() && !isLoading && (
              <div className="composer-suggestions">
                {contextChips.length > 0
                  ? contextChips.map(chip => (
                    <button
                      key={chip}
                      className={`composer-sugg-chip composer-sugg-chip--${agent} composer-sugg-chip--context`}
                      onClick={() => setInput(chip)}
                    >
                      {chip}
                    </button>
                  ))
                  : (AGENT_SUGGESTIONS[agent] || AGENT_SUGGESTIONS.jarvis).map(s => (
                    <button
                      key={s.label}
                      className={`composer-sugg-chip composer-sugg-chip--${agent}`}
                      onClick={() => setInput(s.label)}
                    >
                      <span className="sugg-chip-icon">{s.sigil}</span>
                      {s.label}
                    </button>
                  ))
                }
              </div>
            )}
            <div className={`input-pill${agent === 'friday' ? ' input-pill--friday' : agent === 'tutor' ? ' input-pill--tutor' : ''}`}>
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
