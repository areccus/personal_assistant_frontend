import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { api } from '../../constants';
import CopyableBubble from './CopyableBubble';
import { markdownComponents } from './CodeBlock';
import { parseDownloadLink } from './DownloadBar';

// Aether tier accent colors — violet, rose, amber, cyan, peach, teal
const SECTION_ACCENTS = [
  { color: 'oklch(0.72 0.12 295)', glow: 'oklch(0.72 0.12 295 / 0.7)' },
  { color: 'oklch(0.72 0.14 25)',  glow: 'oklch(0.72 0.14 25  / 0.7)' },
  { color: 'oklch(0.80 0.14 80)',  glow: 'oklch(0.80 0.14 80  / 0.7)' },
  { color: 'oklch(0.80 0.10 220)', glow: 'oklch(0.80 0.10 220 / 0.7)' },
  { color: 'oklch(0.82 0.13 55)',  glow: 'oklch(0.82 0.13 55  / 0.7)' },
  { color: 'oklch(0.74 0.12 320)', glow: 'oklch(0.74 0.12 320 / 0.7)' },
];

// ── Parsers ──────────────────────────────────────────────────

// Strip leading emoji / number prefixes from AI-generated titles
function cleanTitle(title) {
  return title
    .replace(/^\d+\.\s+/, '')
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]️?\s*/gu, '')
    .trim();
}

// Split "TIER I — Absolute top, beyond magic" → { label, main }
function parseTitle(rawTitle) {
  const clean = cleanTitle(rawTitle);
  const m = clean.match(/^([^—–]{1,24}?)\s*[—–]\s*(.+)$/);
  if (m) return { label: m[1].trim(), main: m[2].trim() };
  return { label: null, main: clean };
}

// Extract h3 entity names from section markdown content
function extractEntities(content) {
  const names = [];
  for (const line of content.split('\n')) {
    const m = line.match(/^###\s+(.+)/);
    if (m) names.push(cleanTitle(m[1].trim()));
  }
  return names;
}

// Split section content into entity blocks, callouts, and body text
function parseContent(content) {
  const lines = content.split('\n');
  const items = [];
  let current = null;
  let preamble = [];

  for (const line of lines) {
    const h3 = line.match(/^###\s+(.+)/);
    const bq = line.match(/^>\s*(.*)/);

    if (h3) {
      if (current) items.push(current);
      else if (preamble.join('').trim()) {
        items.push({ type: 'body', text: preamble.join('\n').trim() });
        preamble = [];
      }
      current = { type: 'entity', name: cleanTitle(h3[1].trim()), bodyLines: [] };
    } else if (bq) {
      if (current) { items.push(current); current = null; }
      else if (preamble.join('').trim()) {
        items.push({ type: 'body', text: preamble.join('\n').trim() });
        preamble = [];
      }
      const last = items[items.length - 1];
      if (last && last.type === 'callout') {
        last.text += '\n' + bq[1];
      } else {
        items.push({ type: 'callout', text: bq[1].trim() });
      }
    } else if (current) {
      current.bodyLines.push(line);
    } else {
      preamble.push(line);
    }
  }

  if (current) items.push(current);
  else if (preamble.join('').trim()) {
    items.push({ type: 'body', text: preamble.join('\n').trim() });
  }

  return items;
}

// Parse markdown into lede + h2-delimited section blocks
function parseIntoSections(text) {
  const lines = text.split('\n');
  const result = [];
  let currentSection = null;
  let ledeLines = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      if (currentSection) {
        result.push({ ...currentSection, content: currentSection.contentLines.join('\n') });
      } else {
        const ledeContent = ledeLines.join('\n').trim();
        if (ledeContent) result.push({ type: 'lede', content: ledeContent });
      }
      currentSection = { type: 'section', title: h2Match[1], contentLines: [] };
    } else if (currentSection) {
      currentSection.contentLines.push(line);
    } else {
      ledeLines.push(line);
    }
  }

  if (currentSection) {
    result.push({ ...currentSection, content: currentSection.contentLines.join('\n') });
  } else {
    const remaining = ledeLines.join('\n').trim();
    if (remaining) result.push({ type: 'lede', content: remaining });
  }

  return result;
}

// ── Markdown component sets ──────────────────────────────────

const innerComponents = {
  ...markdownComponents,
  h3({ children }) {
    return <div className="entity-name" style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, marginBottom: 4 }}>{children}</div>;
  },
  blockquote({ children }) {
    return (
      <div className="aether-callout" style={{ marginTop: 8 }}>
        <span className="callout-label">Insight</span>
        <div className="callout-text">{children}</div>
      </div>
    );
  },
  hr() {
    return <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />;
  },
};

// Lede inherits focus-mark from markdownComponents; em uses serif italic class
const ledeComponents = {
  ...innerComponents,
  em({ children }) {
    return <em className="md-em md-em--lede">{children}</em>;
  },
};

// ── Aether components ────────────────────────────────────────

// Tier overview strip — mini-card row
function TierRow({ sections }) {
  if (sections.length < 2) return null;
  return (
    <div className="tier-row">
      {sections.map((s, i) => {
        const accent = SECTION_ACCENTS[i % SECTION_ACCENTS.length];
        const { label, main } = parseTitle(s.title);
        const entities = extractEntities(s.content);
        return (
          <div key={i} className="tier-mini">
            <span className="tier-mini-glow" style={{ background: accent.color }} />
            <div className="tier-mini-num">
              <span
                className="tier-mini-dot"
                style={{ background: accent.color, boxShadow: `0 0 8px ${accent.glow}` }}
              />
              {label || `Section ${i + 1}`}
              <span className="bar" />
            </div>
            <div className="tier-mini-title">{main}</div>
            {entities.length > 0 && (
              <div className="tier-mini-who">{entities.slice(0, 3).join(' · ')}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Single tier block (h2 section)
function TierBlock({ title, content, accent, index }) {
  const { label, main } = parseTitle(title);
  const contentItems = useMemo(() => parseContent(content), [content]);
  const entityCount = contentItems.filter(i => i.type === 'entity').length;

  return (
    <div className="tier-block">
      <div className="tier-head">
        <span className="tier-stamp">
          <span
            className="tier-pip"
            style={{ background: accent.color, boxShadow: `0 0 10px ${accent.glow}` }}
          />
          {label || `Section ${index + 1}`}
        </span>
        <h2 className="tier-h2">{main}</h2>
        {entityCount > 0 && (
          <span className="tier-aside">
            {entityCount} {entityCount === 1 ? 'entity' : 'entities'}
          </span>
        )}
      </div>

      <div className="aether-entities">
        {contentItems.map((item, i) => {
          if (item.type === 'entity') {
            return (
              <div key={i} className="aether-entity">
                <div className="entity-who">
                  <div className="entity-name">{item.name}</div>
                </div>
                <div className="entity-body">
                  <ReactMarkdown components={innerComponents}>
                    {item.bodyLines.join('\n')}
                  </ReactMarkdown>
                </div>
              </div>
            );
          }
          if (item.type === 'callout') {
            return (
              <div key={i} className="aether-callout">
                <span className="callout-label">Analogy</span>
                <div className="callout-text">
                  <ReactMarkdown components={innerComponents}>{item.text}</ReactMarkdown>
                </div>
              </div>
            );
          }
          if (item.type === 'body') {
            return (
              <div key={i} className="tier-body">
                <ReactMarkdown components={innerComponents}>{item.text}</ReactMarkdown>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

// Full Aether-structured response renderer
function AetherResponse({ text }) {
  const hasH2 = text.includes('\n## ') || text.startsWith('## ');

  const sections = useMemo(() => {
    if (!hasH2) return null;
    return parseIntoSections(text);
  }, [text, hasH2]);

  if (!sections) {
    return (
      <div className="markdown-content">
        <ReactMarkdown components={innerComponents}>{text}</ReactMarkdown>
      </div>
    );
  }

  const ledeBlock = sections.find(b => b.type === 'lede');
  const sectionBlocks = sections.filter(b => b.type === 'section');

  return (
    <div className="aether-response">
      {ledeBlock && (
        <div className="aether-lede">
          <ReactMarkdown components={ledeComponents}>{ledeBlock.content}</ReactMarkdown>
        </div>
      )}

      <TierRow sections={sectionBlocks} />

      {sectionBlocks.map((block, i) => {
        const accent = SECTION_ACCENTS[i % SECTION_ACCENTS.length];
        return (
          <TierBlock
            key={i}
            title={block.title}
            content={block.content}
            accent={accent}
            index={i}
          />
        );
      })}
    </div>
  );
}

// ── Public components ────────────────────────────────────────

export function AssistantMessage({ content, image_urls }) {
  const { text, filename, url } = parseDownloadLink(content);

  return (
    <CopyableBubble text={text}>
      <AetherResponse text={text} />
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
    </CopyableBubble>
  );
}

function ABComparison({ messageText, responseA, clientId, onPick }) {
  const [responseB, setResponseB] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [picked, setPicked]       = useState(null);

  useEffect(() => {
    axios.post(`${api.url}/variant`, {
      message: messageText,
      client_id: clientId,
      response_a: responseA,
    }).then(r => setResponseB(r.data.response)).catch(() => setResponseB(null)).finally(() => setLoading(false));
  }, [messageText, responseA, clientId]);

  const handlePick = async (winner) => {
    setPicked(winner);
    try {
      await axios.post(`${api.url}/feedback`, {
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

export default ABComparison;
