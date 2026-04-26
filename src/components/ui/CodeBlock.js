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

export const markdownComponents = {
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

export default CodeBlock;
