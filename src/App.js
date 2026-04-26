import React from 'react';
import FinanceDashboard from './FinanceDashboard';
import HoopCipherDashboard from './HoopCipherDashboard';
import ProjectsView from './ProjectsView';
import Sidebar from './components/layout/Sidebar';
import ThinkingPhrase from './components/ui/ThinkingPhrase';
import { AssistantMessage } from './components/ui/ABComparison';
import ABComparison from './components/ui/ABComparison';
import CopyableBubble from './components/ui/CopyableBubble';
import DownloadBar from './components/ui/DownloadBar';
import { useChat } from './hooks/useChat';
import { AGENTS, CLIENT_ID } from './constants';
import './App.css';

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

  return (
    <div className={`shell ${theme}`}>

      {/* ── Ambient background glows ── */}
      <div className="glow-primary" />
      <div className="glow-tertiary" />

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
                <button className="search-clear" onClick={() => { setSearchOpen(false); }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>

            <div className="search-results">
              {searchLoading && (
                <div className="search-empty">Searching...</div>
              )}
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

      {/* ── SIDEBAR ── */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        theme={theme}
        toggleTheme={toggleTheme}
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
      />

      {/* ── MAIN ── */}
      <main className="main">

        {/* Finance dashboard — replaces chat area */}
        {view === 'finance' && (
          <FinanceDashboard onBack={() => navigateTo('chat')} theme={theme} />
        )}

        {/* HoopCipher dashboard — replaces chat area */}
        {view === 'hoopcipher' && (
          <HoopCipherDashboard onBack={() => navigateTo('chat')} />
        )}

        {/* Projects board */}
        {view === 'projects' && (
          <ProjectsView onBack={() => navigateTo('chat')} />
        )}

        {/* Chat view — top bar + messages + input */}
        {view === 'chat' && <>
        <header className="top-bar">
          {/* Hamburger — mobile only */}
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="topbar-title">ZeroClaw</div>

          {/* Agent switcher pills */}
          <div className="agent-pills">
            {Object.entries(AGENTS).map(([key, info]) => (
              <button
                key={key}
                className={`agent-pill ${agent === key ? 'active' : ''}`}
                onClick={() => switchAgent(key)}
              >
                {info.emoji} {info.name}
              </button>
            ))}
          </div>

          {/* New chat shortcut in topbar */}
          <button className="icon-btn" onClick={startNewChat} title="New chat">
            <span className="material-symbols-outlined">edit_note</span>
          </button>
        </header>

        {/* Scrollable chat area */}
        <section className="messages-area">
          <div className="messages-inner">

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="empty-state">
                <div className="empty-logo">{currentAgent.emoji}</div>
                <h2>{currentAgent.name}</h2>
                <p>{currentAgent.description}</p>
                <div className="agent-cards">
                  {Object.entries(AGENTS).map(([key, info]) => (
                    <div
                      key={key}
                      className={`agent-card ${agent === key ? 'active' : ''}`}
                      onClick={() => switchAgent(key)}
                    >
                      <div className="agent-card-title">{info.emoji} {info.name}</div>
                      <div className="agent-card-model">{info.model}</div>
                      <div className="agent-card-desc">{info.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, idx) => (
              <div key={idx} className={`msg-row msg-${msg.role}`}>

                {/* Assistant label */}
                {msg.role === 'assistant' && (
                  <div className="msg-label">
                    <div className="msg-label-icon">
                      <span className="material-symbols-outlined">smart_toy</span>
                    </div>
                    <span className="msg-label-text">{msg.agent || currentAgent.name} Intelligence</span>
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
                )}

                {/* Bubble */}
                {msg.role === 'assistant' && (
                  <>
                    <div className="bubble bubble-assistant">
                      <AssistantMessage content={msg.content} image_urls={msg.image_urls} />
                    </div>
                    {msg.tks != null && (
                      <div className="tks-line">{Math.round(msg.tks)} tok/s</div>
                    )}
                    {msg.tutor_mode && (
                      <DownloadBar content={msg.content} />
                    )}
                    {/* A/B comparison — only for the targeted message, chat source only */}
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
                  <div className="bubble bubble-user">
                    <CopyableBubble text={msg.content}>
                      {msg.content}
                    </CopyableBubble>
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

            {/* Loading / streaming row */}
            {isLoading && (
              <div className="msg-row msg-assistant">
                <div className="msg-label">
                  <div className="msg-label-icon">
                    <span className="material-symbols-outlined">smart_toy</span>
                  </div>
                  <span className="msg-label-text">{currentAgent.name} Intelligence</span>
                  {streamState && streamState.tks > 0 && (
                    <span className="tks-badge">{Math.round(streamState.tks)} tok/s</span>
                  )}
                </div>
                <div className="bubble bubble-assistant">
                  {!streamState || streamState.content === '' ? (
                    <div className="typing"><span /><span /><span /></div>
                  ) : (
                    <div className="streaming-content">
                      {streamState.content}
                      <span className="stream-cursor" />
                    </div>
                  )}
                </div>
                {(!streamState || streamState.content === '') && <ThinkingPhrase />}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Floating input pill */}
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
                <button className="attach-btn" type="button" title="Attach file"
                        onClick={() => fileInputRef.current?.click()}>
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
                {isLoading ? (
                  <button onClick={cancelRequest} className="stop-btn">
                    <span className="material-symbols-outlined">stop</span>
                  </button>
                ) : (
                  <button onClick={sendMessage} disabled={!input.trim() && attachedFiles.length === 0} className="send-btn">
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
  );
}

export default App;
