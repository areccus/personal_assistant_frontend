import React from 'react';
import './HoopCipherDashboard.css';

export default function HoopCipherDashboard({ onBack }) {
  return (
    <div className="hc-wrapper">
      <div className="hc-topbar">
        <button className="hc-back-btn" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="hc-title">
          <span className="material-symbols-outlined">sports_basketball</span>
          HoopCipher
        </span>
      </div>
      <iframe
        className="hc-frame"
        src="https://dtyqiqnr5irt6.cloudfront.net/"
        title="HoopCipher"
        allow="fullscreen"
      />
    </div>
  );
}
