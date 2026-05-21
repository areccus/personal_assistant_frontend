import React from 'react';
import LivingOrb from '../ui/LivingOrb';

const RAIL_APPS = [
  { key: 'chat',       label: 'Chat',           isOrb: true },
  null,
  { key: 'finance',    label: 'Finance',        icon: 'account_balance' },
  { key: 'tasks',      label: 'Tasks',          icon: 'view_kanban' },
  { key: 'hoopcipher', label: 'HoopCipher',     icon: 'sports_basketball' },
  { key: 'news',       label: 'Daily Briefing', icon: 'newspaper' },
];

function AppRail({ view, navigateTo }) {
  return (
    <div className="app-rail">
      {RAIL_APPS.map((app, i) => {
        if (!app) return <div key={i} className="app-rail-divider" />;
        return (
          <button
            key={app.key}
            className={`app-rail-tile${view === app.key ? ' is-active' : ''}`}
            onClick={() => navigateTo(app.key)}
            title={app.label}
          >
            {app.isOrb
              ? <LivingOrb size={22} state="idle" />
              : <span className="material-symbols-outlined app-rail-icon">{app.icon}</span>
            }
            <span className="app-rail-tip">{app.label}</span>
            {app.isOrb && <span className="app-rail-orb-dot" />}
          </button>
        );
      })}
    </div>
  );
}

export default AppRail;
