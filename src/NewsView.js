import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';
const PTR_THRESHOLD = 34;
const PTR_MAX       = 80;

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

/* ── Political lean badge ────────────────────────────────────── */
const LEAN_META = {
  'left':       { label: 'Left',       cls: 'lean-left' },
  'lean-left':  { label: 'Lean Left',  cls: 'lean-left-soft' },
  'center':     { label: 'Center',     cls: 'lean-center' },
  'lean-right': { label: 'Lean Right', cls: 'lean-right-soft' },
  'right':      { label: 'Right',      cls: 'lean-right' },
};

function LeanBadge({ lean }) {
  const meta = LEAN_META[lean];
  if (!meta) return null;
  return <span className={`lean-badge ${meta.cls}`}>{meta.label}</span>;
}

/* ── Article detail ─────────────────────────────────────────── */
function ArticleDetail({ article, onClose }) {
  const [imgFailed, setImgFailed]   = useState(false);
  const [summary,   setSummary]     = useState(null);
  const [impact,    setImpact]      = useState(null);
  const [loadingAI, setLoadingAI]   = useState(false);
  const domain = getDomain(article.url);

  useEffect(() => {
    let cancelled = false;
    setLoadingAI(true);
    fetch(`${API_URL}/news/article`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title: article.title, snippet: article.snippet || '' }),
    })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setSummary(d.summary || null);
        setImpact(d.impact  || null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingAI(false); });
    return () => { cancelled = true; };
  }, [article.title, article.snippet]);

  return (
    <div className="news-detail-view">
      <div className="news-detail-header">
        <button className="news-article-back" onClick={onClose}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="news-detail-header-meta">
          {domain && <span className="news-detail-domain">{domain}</span>}
          <LeanBadge lean={article.lean} />
        </div>
      </div>

      <div className="news-detail-body">
        {article.image && !imgFailed && (
          <img
            className="news-detail-img"
            src={article.image}
            alt={article.title}
            onError={() => setImgFailed(true)}
          />
        )}

        <div className="news-detail-content">
          {article.category && (
            <span className="news-detail-category">{article.category}</span>
          )}
          <h2 className="news-detail-title">{article.title}</h2>
          {domain && <p className="news-detail-meta">{domain}</p>}

          <div className="news-detail-divider" />

          {loadingAI ? (
            <div className="news-ai-loading">
              <span className="material-symbols-outlined spinning">progress_activity</span>
              <span>Summarizing…</span>
            </div>
          ) : summary ? (
            <>
              <p className="news-detail-text">{summary}</p>

              {impact && (
                <div className="news-impact-block">
                  <div className="news-impact-label">
                    <span className="material-symbols-outlined">person</span>
                    Does this affect you?
                  </div>
                  <p className="news-impact-text">{impact}</p>
                </div>
              )}
            </>
          ) : article.snippet ? (
            <p className="news-detail-text">{article.snippet}</p>
          ) : null}

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-detail-read-btn"
          >
            Read full article
            <span className="material-symbols-outlined">open_in_new</span>
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Category placeholder colors ────────────────────────────── */
const CATEGORY_GRADIENTS = {
  'Top Stories':   'linear-gradient(135deg, #1e3a5f, #0f2540)',
  'US & Politics': 'linear-gradient(135deg, #3b1f5e, #1e0f3a)',
  'World':         'linear-gradient(135deg, #0f3d2e, #071f18)',
  'Technology':    'linear-gradient(135deg, #003d4d, #001e26)',
  'Business':      'linear-gradient(135deg, #2d2a00, #1a1800)',
  'Sports':        'linear-gradient(135deg, #3d1a00, #1f0d00)',
  'Science':       'linear-gradient(135deg, #1a0d3d, #0d0720)',
};
const CATEGORY_ICONS = {
  'Top Stories':   'breaking_news',
  'US & Politics': 'account_balance',
  'World':         'public',
  'Technology':    'memory',
  'Business':      'trending_up',
  'Sports':        'sports',
  'Science':       'science',
};

function NoImage({ category, size = 'hero' }) {
  const bg   = CATEGORY_GRADIENTS[category] || 'linear-gradient(135deg, #1a1a2e, #0d0d1a)';
  const icon = CATEGORY_ICONS[category]     || 'newspaper';
  return (
    <div className={`news-${size}-noimg`} style={{ background: bg }}>
      <span className="material-symbols-outlined">{icon}</span>
    </div>
  );
}

/* ── Hero card ───────────────────────────────────────────────── */
function HeroCard({ article, onOpen, category }) {
  const [imgFailed, setImgFailed] = useState(false);
  const domain = getDomain(article.url);

  return (
    <div className="news-hero" role="button" tabIndex={0} onClick={onOpen}>
      {article.image && !imgFailed ? (
        <img
          className="news-hero-img"
          src={article.image}
          alt={article.title}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <NoImage category={category} size="hero" />
      )}
      <div className="news-hero-body">
        <div className="news-hero-source-row">
          {domain && <span className="news-hero-source">{domain}</span>}
          <LeanBadge lean={article.lean} />
        </div>
        <h3 className="news-hero-headline">{article.title}</h3>
        {article.snippet && (
          <p className="news-hero-excerpt">{article.snippet}</p>
        )}
      </div>
    </div>
  );
}

/* ── Compact card ────────────────────────────────────────────── */
function CompactCard({ article, onOpen, category }) {
  const [imgFailed, setImgFailed] = useState(false);
  const domain = getDomain(article.url);

  return (
    <button className="news-compact-item" onClick={onOpen}>
      {article.image && !imgFailed ? (
        <img
          className="news-compact-thumb"
          src={article.image}
          alt={article.title}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <NoImage category={category} size="compact" />
      )}
      <div className="news-compact-body">
        <div className="news-compact-source-row">
          {domain && <span className="news-compact-source">{domain}</span>}
          <LeanBadge lean={article.lean} />
        </div>
        <h4 className="news-compact-headline">{article.title}</h4>
        {article.snippet && (
          <p className="news-compact-excerpt">{article.snippet}</p>
        )}
      </div>
    </button>
  );
}

/* ── Category section ────────────────────────────────────────── */
function NewsSection({ category, onOpen }) {
  const [hero, ...rest] = category.articles;
  if (!hero) return null;

  return (
    <section className="news-section">
      <h2 className="news-section-title">{category.name}</h2>
      <HeroCard article={hero} category={category.name} onOpen={() => onOpen(hero, category.name)} />
      {rest.length > 0 && (
        <div className="news-compact-list">
          {rest.map((a, i) => (
            <CompactCard key={i} article={a} category={category.name} onOpen={() => onOpen(a, category.name)} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Main news feed ─────────────────────────────────────────── */
function NewsView({ onBack, onArticleChange }) {
  const [digest,     setDigest]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [selected,   setSelected]   = useState(null);
  const [pullY,      setPullY]      = useState(0);

  const bodyRef       = useRef(null);
  const refreshingRef = useRef(false);
  const pullYRef      = useRef(0);
  const handleRefRef  = useRef(null);

  const loadDigest = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/news`, { cache: 'no-store' });
      const data = await res.json();
      setDigest(data.content ? data : null);
      setError(null);
    } catch {
      setError('Could not load news digest.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDigest(); }, [loadDigest]);

  const handleRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setError(null);
    try {
      const res  = await fetch(`${API_URL}/news/refresh`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) { await loadDigest(); }
      else { setError(data.error || 'Refresh failed.'); }
    } catch {
      setError('Refresh failed.');
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [loadDigest]);

  useEffect(() => { handleRefRef.current = handleRefresh; }, [handleRefresh]);

  /* pull-to-refresh */
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    let startY = 0, active = false;

    const onStart = (e) => {
      if (el.scrollTop === 0) { startY = e.touches[0].clientY; active = true; }
    };
    const onMove = (e) => {
      if (!active) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 4 && el.scrollTop === 0) {
        e.preventDefault();
        const eased = dy < 62 ? dy * 0.55 : 62 * 0.55 + (dy - 62) * 0.18;
        const v = Math.min(eased, PTR_MAX);
        pullYRef.current = v; setPullY(v);
      } else if (dy <= 0) {
        active = false; pullYRef.current = 0; setPullY(0);
      }
    };
    const onEnd = () => {
      active = false;
      if (pullYRef.current >= PTR_THRESHOLD) handleRefRef.current?.();
      pullYRef.current = 0; setPullY(0);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, []);

  const openArticle = (article, category) => {
    setSelected({ ...article, category });
    onArticleChange?.(true);
  };
  const closeArticle = () => {
    setSelected(null);
    onArticleChange?.(false);
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  const ptrHeight  = refreshing ? 56 : pullY;
  const ptrOpacity = refreshing ? 1  : Math.min(pullY / PTR_THRESHOLD, 1);
  const ptrSpin    = refreshing || pullY >= PTR_THRESHOLD;

  if (selected) {
    return <ArticleDetail article={selected} onClose={closeArticle} />;
  }

  const categories = digest?.categories;

  return (
    <div className="news-view">
      <div className="news-header">
        <button className="back-btn" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="news-title-block">
          <h1 className="news-title">Daily Briefing</h1>
          {digest?.generated_at && (
            <span className="news-updated">Updated {formatTime(digest.generated_at)}</span>
          )}
        </div>
        <button
          className={`news-refresh-btn ${refreshing ? 'refreshing' : ''}`}
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh digest"
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </div>

      <div className="news-body" ref={bodyRef}>
        <div className="ptr-wrap" style={{ height: ptrHeight, opacity: ptrOpacity }}>
          <span className={`material-symbols-outlined${ptrSpin ? ' spinning' : ''}`}>
            {refreshing ? 'progress_activity' : 'arrow_downward'}
          </span>
        </div>

        {loading && (
          <div className="news-loading">
            <span className="material-symbols-outlined spinning">progress_activity</span>
            <span>Loading briefing…</span>
          </div>
        )}

        {!loading && error && (
          <div className="news-error">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        {!loading && !error && !digest && (
          <div className="news-empty">
            <span className="material-symbols-outlined">newspaper</span>
            <p>No briefing yet for today.</p>
            <button className="news-gen-btn" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Generating…' : 'Generate Now'}
            </button>
          </div>
        )}

        {!loading && digest && (
          categories?.length > 0 ? (
            <div className="news-feed">
              {categories.map((cat, i) => (
                <NewsSection key={i} category={cat} onOpen={openArticle} />
              ))}
            </div>
          ) : (
            <div className="news-content">
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                  ),
                }}
              >
                {digest.content}
              </ReactMarkdown>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default NewsView;
