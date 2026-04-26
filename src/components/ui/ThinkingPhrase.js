import React, { useState, useEffect } from 'react';
import { THINKING_PHRASES } from '../../constants';

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

export default ThinkingPhrase;
