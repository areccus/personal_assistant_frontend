import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { api, CLIENT_ID, AGENTS } from '../constants';

const AB_EVERY = 6;

export function useChat() {
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [agent, setAgent]                 = useState('jarvis');
  const [isLoading, setIsLoading]         = useState(false);
  const [theme, setTheme]                 = useState(() => localStorage.getItem('zc_theme') || 'dark');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [chats, setChats]                 = useState([]);
  const [currentChat, setCurrentChat]     = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [renamingChat, setRenamingChat]   = useState(null);
  const [renameValue, setRenameValue]     = useState('');
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [streamState, setStreamState]     = useState(null);
  const [abTarget, setAbTarget]           = useState(null);
  const [financeError, setFinanceError]   = useState(null);

  const fileInputRef   = useRef(null);
  const messagesEndRef = useRef(null);
  const abortRef       = useRef(null);
  const searchTimer    = useRef(null);
  const searchInputRef = useRef(null);
  const chatMsgCount   = useRef(0);

  // ── Theme ────────────────────────────────────────────────────────────────────

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'tahoe' : 'dark';
    setTheme(next);
    localStorage.setItem('zc_theme', next);
    document.body.classList.toggle('tahoe', next === 'tahoe');
  };

  // Sync theme to body on mount
  useEffect(() => {
    document.body.classList.toggle('tahoe', theme === 'tahoe');
  }, [theme]);

  // ── View / navigation ────────────────────────────────────────────────────────

  const pathToView = (p) =>
    p.startsWith('/finance')    ? 'finance'    :
    p.startsWith('/hoopcipher') ? 'hoopcipher' :
    p.startsWith('/projects')   ? 'projects'   : 'chat';

  const [view, setView] = useState(() => pathToView(window.location.pathname));

  const navigateTo = async (v) => {
    if (v === 'finance') {
      try {
        const res = await axios.get(`${api.url}/finance/access`);
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
    const path = v === 'finance' ? '/finance' : v === 'hoopcipher' ? '/hoopcipher' : v === 'projects' ? '/projects' : '/chats';
    window.history.pushState({ view: v }, '', path);
    setView(v);
  };

  useEffect(() => {
    const onPop = (e) => setView(e.state?.view || pathToView(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── API URL probe + initial chat fetch ───────────────────────────────────────

  const PRIMARY_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';
  const FALLBACK_API_URL = 'http://localhost:8081';

  useEffect(() => {
    if (PRIMARY_API_URL === FALLBACK_API_URL) { fetchChats(); return; }
    axios.get(`${PRIMARY_API_URL}/sessions`, { timeout: 1500 })
      .catch(() => { api.url = FALLBACK_API_URL; })
      .finally(() => fetchChats());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search modal ─────────────────────────────────────────────────────────────

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
      const res = await axios.get(`${api.url}/sessions/search`, { params: { q } });
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

  // ── Chat management ──────────────────────────────────────────────────────────

  const fetchChats = async () => {
    try {
      const res = await axios.get(`${api.url}/sessions`);
      setChats(res.data.sessions || []);
    } catch (err) { console.error('Failed to fetch chats:', err); }
  };

  const startNewChat = async () => {
    try { await axios.post(`${api.url}/sessions/reset`, { client_id: CLIENT_ID }); } catch (err) {}
    setMessages([]);
    setCurrentChat(null);
    setSidebarOpen(false);
  };

  const switchChat = async (name) => {
    if (name === currentChat) { setSidebarOpen(false); return; }
    try {
      const res = await axios.post(`${api.url}/sessions/load`, { name, client_id: CLIENT_ID });
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
      await axios.post(`${api.url}/sessions/delete`, { name });
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
      await axios.post(`${api.url}/sessions/rename`, { old_name: oldName, new_name: newName });
      if (currentChat === oldName) setCurrentChat(newName);
      setRenamingChat(null);
      setRenameValue('');
      await fetchChats();
    } catch (err) { cancelRename(); }
  };

  // ── Agent switching ──────────────────────────────────────────────────────────

  const switchAgent = (newAgent) => {
    if (newAgent === agent) return;
    setAgent(newAgent);
    setMessages(prev => [...prev, { role: 'system', content: `Switched to ${AGENTS[newAgent].name}` }]);
  };

  // ── File attachments ─────────────────────────────────────────────────────────

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

  // ── Request cancel ───────────────────────────────────────────────────────────

  const cancelRequest = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  // ── Internal: add assistant message + A/B trigger ────────────────────────────

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

  // ── Send message ─────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;
    const userText = input.trim();
    const snapshot = [...attachedFiles];

    const fileLabels = snapshot.map(f => f.isImage ? `📷 ${f.name}` : `📄 ${f.name}`).join('  ');
    const displayText = [fileLabels, userText].filter(Boolean).join('\n');
    setMessages(prev => [...prev, { role: 'user', content: displayText }]);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);
    setStreamState(null);

    const controller = new AbortController();
    abortRef.current = controller;

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
      const resp = await fetch(`${api.url}/ask`, {
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
        // ── Streaming MLX path ────────────────────────────────────────────────
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
        // ── Non-streaming JSON path (Friday, home control) ────────────────────
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

  return {
    // State
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
    // Refs
    fileInputRef,
    messagesEndRef,
    searchInputRef,
    // Actions
    toggleTheme,
    navigateTo,
    onSearchChange,
    openSearchResult,
    fetchChats,
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
  };
}
