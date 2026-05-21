import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

// Recursively extract plain text from ReactMarkdown children
function childrenToText(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(childrenToText).join('');
  if (children?.props?.children) return childrenToText(children.props.children);
  return String(children ?? '');
}

// Link pill with site favicon
function MdLink({ href, children }) {
  const [imgOk, setImgOk] = useState(true);

  let domain = '';
  let shortUrl = href || '';
  let faviconSrc = '';

  try {
    const url = new URL(href || '');
    domain = url.hostname.replace(/^www\./, '');
    const pathPart = url.pathname !== '/' ? url.pathname : '';
    shortUrl = domain + pathPart;
    faviconSrc = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
  } catch {
    // relative/anchor link — fall back to plain style
  }

  // If no valid domain, render a simple underline link
  if (!domain) {
    return (
      <a href={href} className="md-link" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  const labelText = childrenToText(children).trim();
  // Use custom link text if it differs from the raw URL; otherwise show shortened URL
  const isRawUrl = labelText === href || labelText === shortUrl || labelText.startsWith('http');
  const displayText = isRawUrl ? shortUrl : labelText;

  return (
    <a
      href={href}
      className="md-link-pill"
      target="_blank"
      rel="noopener noreferrer"
      title={href}
    >
      {imgOk && (
        <img
          src={faviconSrc}
          alt=""
          className="md-link-favicon"
          onError={() => setImgOk(false)}
        />
      )}
      <span className="md-link-text">{displayText}</span>
    </a>
  );
}

export const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeStr = String(children).replace(/\n$/, '');
    if (!inline) return <CodeBlock language={match ? match[1] : ''}>{codeStr}</CodeBlock>;
    return <code className="inline-code" {...props}>{children}</code>;
  },
  a({ href, children }) {
    return <MdLink href={href}>{children}</MdLink>;
  },
  strong({ children }) {
    return <span className="focus-mark">{children}</span>;
  },
  em({ children }) {
    return <em className="md-em">{children}</em>;
  },
};

export default CodeBlock;
