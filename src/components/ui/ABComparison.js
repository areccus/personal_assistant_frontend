import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { api } from '../../constants';
import CopyableBubble from './CopyableBubble';
import { markdownComponents } from './CodeBlock';
import { parseDownloadLink } from './DownloadBar';

export function AssistantMessage({ content, image_urls }) {
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
