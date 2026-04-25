import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import FinanceDashboard from './FinanceDashboard';
import HoopCipherDashboard from './HoopCipherDashboard';
import './App.css';

const PRIMARY_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';
const FALLBACK_API_URL = 'http://localhost:8081';
let API_URL = PRIMARY_API_URL;

// Stable per-browser identity so each device/tab gets its own session context.
function getClientId() {
  let id = localStorage.getItem('zc_client_id');
  if (!id) {
    id = 'client_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('zc_client_id', id);
  }
  return id;
}
const CLIENT_ID = getClientId();

const AGENTS = {
  jarvis: {
    name: 'Jarvis',
    emoji: '🤖',
    model: 'Qwen3.5 9B (mlx)',
    description: 'Fast local AI for quick questions, home control, and daily tasks',
    placeholder: 'Ask Jarvis anything...',
  },
  friday: {
    name: 'Friday',
    emoji: '⚡',
    model: 'claude-haiku (cloud)',
    description: 'Powerful cloud AI for complex coding, analysis, and deep questions',
    placeholder: 'Ask Friday anything...',
  },
};

const THINKING_PHRASES = [
  "Thinking",
  "Day Dreaming",
  "Brainstorming",
  "Mulling It Over",
  "Letting It Stew",
  "Noodling",
  "Picking My Brain",
  "Dwelling On It",
  "Weighing The Options",
  "Planning A Master Scheme",
  "Bunseki",
  "Conspiring",
  "I Love It When A Plan Comes Together",
  "Everything Is Proceeding As I Have Foreseen",
  "Did You Ever Stop To Think, And Forget To Start Again?",
  "The Wheel Is Turning, But The Hamster Is Dead",
  "Dial-Up Internet Noises",
  "Grinding The Gears",
  "Rubbing Two Brain Cells Together",
  "Consulting The Council (Of Me)",
  "Executing Order 66…",
  "I'll Take A Potato Chip... And EAT IT!",
  "Just As Planned.",
  "What A Drag... (Visualizing The Shogi Board)",
  "Plotting... Hope Those Meddling Kids Don't Show Up.",
  "Building My Inator",
  "Think Mark",
];

function ThinkingPhrase() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * THINKING_PHRASES.length));

  useEffect(() => {
    const t = setInterval(() => {
      setIdx(Math.floor(Math.random() * THINKING_PHRASES.length));
    }, 12000);
    return () => clearInterval(t);
  }, []);

  return <div key={idx} className="thinking-phrase">{THINKING_PHRASES[idx]}</div>;
}

// ── A/B Comparison ────────────────────────────────────────────────────────────

function ABComparison({ messageText, responseA, clientId, onPick }) {
  const [responseB, setResponseB] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [picked, setPicked]       = useState(null);

  useEffect(() => {
    axios.post(`${API_URL}/variant`, {
      message: messageText,
      client_id: clientId,
      response_a: responseA,
    }).then(r => setResponseB(r.data.response)).catch(() => setResponseB(null)).finally(() => setLoading(false));
  }, [messageText, responseA, clientId]);

  const handlePick = async (winner) => {
    setPicked(winner);
    try {
      await axios.post(`${API_URL}/feedback`, {
        message: messageText,
        winner,
        response_a: responseA,
        response_b: responseB,
        client_id: clientId,
      });
    } catch {}
    onPick(winner === 'a' ? responseA : responseB);
  };

  if (loading) return (
    <div className="ab-wrap">
      <div className="ab-label">Which response do you prefer?</div>
      <div className="ab-loading">Generating alternative…</div>
    </div>
  );

  if (!responseB) return null;

  return (
    <div className="ab-wrap">
      <div className="ab-label">Which do you prefer?</div>
      <div className="ab-cards">
        <div className={`ab-card ${picked === 'a' ? 'ab-winner' : picked ? 'ab-loser' : ''}`}>
          <div className="ab-card-tag">A</div>
          <div className="ab-card-body">
            <AssistantMessage content={responseA} image_urls={[]} />
          </div>
          {!picked && <button className="ab-pick-btn" onClick={() => handlePick('a')}>Prefer A</button>}
        </div>
        <div className={`ab-card ${picked === 'b' ? 'ab-winner' : picked ? 'ab-loser' : ''}`}>
          <div className="ab-card-tag">B</div>
          <div className="ab-card-body">
            <AssistantMessage content={responseB} image_urls={[]} />
          </div>
          {!picked && <button className="ab-pick-btn" onClick={() => handlePick('b')}>Prefer B</button>}
        </div>
      </div>
      {picked && <div className="ab-thanks">Got it — preference saved 👍</div>}
    </div>
  );
}

// ── Download bar ──────────────────────────────────────────────────────────────

const EXPORT_FORMATS = ['md', 'pdf', 'docx'];

function DownloadBar({ content }) {
  const [fmt, setFmt] = useState(() => localStorage.getItem('zc_export_fmt') || 'md');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFmtChange = (e) => {
    const v = e.target.value;
    setFmt(v);
    localStorage.setItem('zc_export_fmt', v);
  };

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/export`, { content, format: fmt });
      const { url, filename } = res.data;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } catch (e) {
      setError('Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="download-bar">
      <button className="download-btn" onClick={handleDownload} disabled={loading}>
        <span className="material-symbols-outlined">download</span>
        {loading ? 'Exporting…' : 'Download'}
      </button>
      <select className="download-fmt" value={fmt} onChange={handleFmtChange}>
        {EXPORT_FORMATS.map(f => (
          <option key={f} value={f}>{f.toUpperCase()}</option>
        ))}
      </select>
      {error && <span className="download-error">{error}</span>}
    </div>
  );
}

// ── Code block with copy button ───────────────────────────────────────────────

function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(children).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="code-block-wrapper">
      <button className="code-copy-btn" onClick={handleCopy}>
        {copied ? '✓' : 'Copy'}
      </button>
      {language && <span className="code-lang-label">{language}</span>}
      <SyntaxHighlighter
        language={language || 'text'}
        style={dracula}
        customStyle={{ margin: 0, borderRadius: '10px', fontSize: '13px', padding: '16px 14px' }}
        PreTag="div"
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeStr = String(children).replace(/\n$/, '');
    if (!inline) return <CodeBlock language={match ? match[1] : ''}>{codeStr}</CodeBlock>;
    return <code className="inline-code" {...props}>{children}</code>;
  },
  a({ href, children }) {
    return (
      <a href={href} className="md-link" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
};

// ── Parse [DOWNLOAD: filename](url) pattern ───────────────────────────────────

function parseDownloadLink(content) {
  const match = content.match(/\[DOWNLOAD: ([^\]]+)\]\(([^)]+)\)/);
  if (match) {
    return {
      text: content.replace(/\[DOWNLOAD: [^\]]+\]\([^)]+\)/, '').trimEnd(),
      filename: match[1],
      url: match[2],
    };
  }
  return { text: content, filename: null, url: null };
}

// ── Copyable bubble wrapper ───────────────────────────────────────────────────
// Desktop: right-click → context menu with Copy
// Mobile:  long-press → copy pill slides in over the bubble

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

// ── Assistant message ─────────────────────────────────────────────────────────

function AssistantMessage({ content, image_urls }) {
  const { text, filename, url } = parseDownloadLink(content);

  return (
    <CopyableBubble text={text}>
      <div className="message-content markdown-content">
        <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
        {url && (
          <a href={url} download={filename} className="download-btn">⬇ Download {filename}</a>
        )}
        {image_urls && image_urls.length > 0 && (
          <div className="image-results">
            {image_urls.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                <img
                  src={src}
                  alt={`result ${i + 1}`}
                  className="search-image"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </CopyableBubble>
  );
}

// ── Swipe-to-delete chat item ─────────────────────────────────────────────────

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

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [agent, setAgent]                 = useState('jarvis');
  const [isLoading, setIsLoading]         = useState(false);
  const [theme, setTheme]                 = useState(() => localStorage.getItem('zc_theme') || 'dark');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'tahoe' : 'dark';
    setTheme(next);
    localStorage.setItem('zc_theme', next);
    document.body.classList.toggle('tahoe', next === 'tahoe');
  };

  // Sync theme to body on mount so Finance page picks it up immediately
  useEffect(() => {
    document.body.classList.toggle('tahoe', theme === 'tahoe');
  }, [theme]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const [chats, setChats]                 = useState([]);
  const [currentChat, setCurrentChat]     = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [renamingChat, setRenamingChat]   = useState(null);
  const [renameValue, setRenameValue]     = useState('');
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);

  // A/B comparison: fire every 6th chat assistant message
  const chatMsgCount  = useRef(0);
  const AB_EVERY      = 6;
  // { msgIndex, userText } — set when a comparison should show for a message
  const [abTarget, setAbTarget] = useState(null);

  // Derive initial view from URL, default to chats
  const pathToView = (p) =>
    p.startsWith('/finance') ? 'finance' :
    p.startsWith('/hoopcipher') ? 'hoopcipher' : 'chat';
  const [view, setView] = useState(() => pathToView(window.location.pathname));
  const [financeError, setFinanceError] = useState(null);

  const navigateTo = async (v) => {
    if (v === 'finance') {
      try {
        const res = await axios.get(`${API_URL}/finance/access`);
        if (!res.data.allowed) {
          setFinanceError(res.data.reason || 'Not authorized.');
          return;
        }
      } catch (err) {
        const msg = err.response?.data?.reason || 'Your IP is not authorized to view finances.';
        setFinanceError(msg);
        return;
      }
      setFinanceError(null);
    }
    const path = v === 'finance' ? '/finance' : v === 'hoopcipher' ? '/hoopcipher' : '/chats';
    window.history.pushState({ view: v }, '', path);
    setView(v);
  };

  // Handle browser back/forward
  useEffect(() => {
    const onPop = (e) => setView(e.state?.view || pathToView(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const [streamState, setStreamState] = useState(null); // { content, tks } during MLX streaming

  const messagesEndRef = useRef(null);
  const abortRef       = useRef(null);
  const searchTimer    = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (PRIMARY_API_URL === FALLBACK_API_URL) { fetchChats(); return; }
    axios.get(`${PRIMARY_API_URL}/sessions`, { timeout: 1500 })
      .catch(() => { API_URL = FALLBACK_API_URL; })
      .finally(() => fetchChats());
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [searchOpen]);

  const runSearch = async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await axios.get(`${API_URL}/sessions/search`, { params: { q } });
      setSearchResults(res.data.results || []);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const onSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(q), 280);
  };

  const openSearchResult = (sessionName) => {
    setSearchOpen(false);
    switchChat(sessionName);
  };

  const fetchChats = async () => {
    try {
      const res = await axios.get(`${API_URL}/sessions`);
      setChats(res.data.sessions || []);
    } catch (err) { console.error('Failed to fetch chats:', err); }
  };

  const startNewChat = async () => {
    try { await axios.post(`${API_URL}/sessions/reset`, { client_id: CLIENT_ID }); } catch (err) {}
    setMessages([]);
    setCurrentChat(null);
    setSidebarOpen(false);
  };

  const switchChat = async (name) => {
    if (name === currentChat) { setSidebarOpen(false); return; }
    try {
      const res = await axios.post(`${API_URL}/sessions/load`, { name, client_id: CLIENT_ID });
      setCurrentChat(name);
      const history = res.data.history || [];
      setMessages(history.map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content,
        agent: h.role === 'assistant' ? (name.includes('friday') ? 'Friday' : 'Jarvis') : undefined,
        model: h.role === 'assistant' ? AGENTS[agent].model : undefined,
      })));
      await fetchChats();
      setSidebarOpen(false);
    } catch (err) { console.error('Failed to switch chat:', err); }
  };

  const deleteChat = async (name, e) => {
    e.stopPropagation();
    try {
      await axios.post(`${API_URL}/sessions/delete`, { name });
      if (name === currentChat) { setMessages([]); setCurrentChat(null); }
      await fetchChats();
    } catch (err) {}
  };

  const startRename = (name, e) => {
    e.stopPropagation();
    setRenamingChat(name);
    setRenameValue(name);
  };

  const cancelRename = () => { setRenamingChat(null); setRenameValue(''); };

  const confirmRename = async (oldName) => {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) { cancelRename(); return; }
    try {
      await axios.post(`${API_URL}/sessions/rename`, { old_name: oldName, new_name: newName });
      if (currentChat === oldName) setCurrentChat(newName);
      setRenamingChat(null);
      setRenameValue('');
      await fetchChats();
    } catch (err) { cancelRename(); }
  };

  const cancelRequest = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          setAttachedFiles(prev => [...prev, {
            name: file.name, isImage: true,
            mimeType: file.type,
            base64: dataUrl.split(',')[1],
            previewUrl: dataUrl,
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (ev) => {
          setAttachedFiles(prev => [...prev, {
            name: file.name, isImage: false,
            content: ev.target.result,
          }]);
        };
        reader.readAsText(file);
      }
    });
    e.target.value = '';
  };

  const removeAttachment = (idx) =>
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));

  const _addAssistantMsg = (data, userText) => {
    setMessages(prev => {
      const next = [...prev, {
        role: 'assistant',
        content: data.response,
        agent: data.agent || AGENTS[agent].name,
        model: AGENTS[agent].model,
        web_search_used: data.web_search_used,
        memory_used: data.memory_used,
        context_used: data.context_used,
        balance_fetched: data.balance_fetched,
        file_generated: data.file_generated,
        image_urls: data.image_urls || [],
        memory_auto_saved: data.memory_auto_saved,
        memory_fact: data.memory_fact,
        history_searched: data.history_searched,
        history_results: data.history_results || 0,
        tutor_mode: data.tutor_mode,
        tks: data.tks ?? null,
        _userText: userText,
      }];
      chatMsgCount.current += 1;
      if (chatMsgCount.current % AB_EVERY === 0) {
        setAbTarget({ msgIndex: next.length - 1, userText });
      }
      return next;
    });
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;
    const userText = input.trim();
    const snapshot = [...attachedFiles];

    // Build display message with file names noted
    const fileLabels = snapshot.map(f => f.isImage ? `📷 ${f.name}` : `📄 ${f.name}`).join('  ');
    const displayText = [fileLabels, userText].filter(Boolean).join('\n');
    setMessages(prev => [...prev, { role: 'user', content: displayText }]);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);
    setStreamState(null);

    const controller = new AbortController();
    abortRef.current = controller;

    // Inject text file contents as code blocks into the message
    const textFiles = snapshot.filter(f => !f.isImage);
    const imageFiles = snapshot.filter(f => f.isImage);
    let finalMessage = userText;
    if (textFiles.length > 0) {
      const blocks = textFiles.map(f => {
        const ext = f.name.split('.').pop().toLowerCase();
        return `**File: ${f.name}**\n\`\`\`${ext}\n${f.content}\n\`\`\``;
      }).join('\n\n');
      finalMessage = blocks + (finalMessage ? '\n\n' + finalMessage : '');
    }

    // Images force Friday (Jarvis is text-only)
    const hasImages = imageFiles.length > 0;
    const routedMessage = (agent === 'friday' || hasImages)
      ? `ask friday ${finalMessage}`
      : finalMessage;

    const body = {
      message: routedMessage,
      client_id: CLIENT_ID,
      session_name: currentChat,
    };
    if (hasImages) {
      body.attached_images = imageFiles.map(f => ({
        data: f.base64, media_type: f.mimeType,
      }));
    }

    try {
      const resp = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!resp.ok && !resp.headers.get('content-type')?.includes('text/event-stream')) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const contentType = resp.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // ── Streaming MLX path ──────────────────────────────────────────────
        const reader  = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const raw = trimmed.slice(6).trim();
            if (!raw) continue;
            let evt;
            try { evt = JSON.parse(raw); } catch { continue; }

            if (evt.type === 'token') {
              setStreamState(prev => ({
                content: (prev?.content || '') + evt.delta,
                tks: evt.tks,
              }));
            } else if (evt.type === 'done') {
              _addAssistantMsg(evt, userText);
              if (evt.session_name) setCurrentChat(evt.session_name);
              await fetchChats();
            } else if (evt.type === 'error') {
              setMessages(prev => [...prev, { role: 'error', content: `Router error: ${evt.message}` }]);
            }
          }
        }
      } else {
        // ── Non-streaming JSON path (Friday, home control) ──────────────────
        const data = await resp.json();
        _addAssistantMsg(data, userText);
        if (data.session_name) setCurrentChat(data.session_name);
        await fetchChats();
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setMessages(prev => prev.slice(0, -1));
        setInput(userText);
      } else {
        setMessages(prev => [...prev, {
          role: 'error',
          content: "Failed to reach ZeroClaw router. Make sure it's running on port 8081.",
        }]);
      }
    } finally {
      setIsLoading(false);
      setStreamState(null);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const switchAgent = (newAgent) => {
    if (newAgent === agent) return;
    setAgent(newAgent);
    setMessages(prev => [...prev, { role: 'system', content: `Switched to ${AGENTS[newAgent].name}` }]);
  };

  const formatChatName = (name) => {
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
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = Date.now() - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

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
                <button className="search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); searchInputRef.current?.focus(); }}>
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

          <button className="sidebar-finance-btn sidebar-btn-soon" disabled>
            <span className="material-symbols-outlined">view_kanban</span>
            Trello
            <span className="sidebar-soon-badge">Soon</span>
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
