import React, { useState } from 'react';
import axios from 'axios';
import { api } from '../../constants';

export const EXPORT_FORMATS = ['md', 'pdf', 'docx'];

export function parseDownloadLink(content) {
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
      const res = await axios.post(`${api.url}/export`, { content, format: fmt });
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

export default DownloadBar;
