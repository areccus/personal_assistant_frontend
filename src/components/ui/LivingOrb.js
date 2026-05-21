import React from 'react';

function LivingOrb({ size = 22, state = 'idle' }) {
  return (
    <span
      className={`living-orb living-orb--${state}`}
      style={{ '--orb-sz': `${size}px` }}
      aria-hidden="true"
    >
      <span className="living-orb-core" />
      <span className="living-orb-ring" />
      <span className="living-orb-glow" />
    </span>
  );
}

export default LivingOrb;
