// ── API URL with live-binding mutable ref ────────────────────────────────────
// Using an object so all importers share the same reference and mutations
// (fallback on connection failure) are visible everywhere.
export const api = {
  url: process.env.REACT_APP_API_URL || 'http://localhost:8081',
};

export const PRIMARY_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';
export const FALLBACK_API_URL = 'http://localhost:8081';

// Stable per-browser identity so each device/tab gets its own session context.
export function getClientId() {
  let id = localStorage.getItem('zc_client_id');
  if (!id) {
    id = 'client_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('zc_client_id', id);
  }
  return id;
}

export const CLIENT_ID = getClientId();

export const AGENTS = {
  jarvis: {
    name: 'Jarvis',
    emoji: '🤖',
    model: 'Qwen3.5 9B (mlx)',
    description: 'Fast local AI for quick questions, home control, and daily tasks',
    placeholder: 'Ask Jarvis anything...',
  },
  friday: {
    name: 'Friday',
    emoji: '⚡',
    model: 'claude-haiku (cloud)',
    description: 'Powerful cloud AI for complex coding, analysis, and deep questions',
    placeholder: 'Ask Friday anything...',
  },
};

export const THINKING_PHRASES = [
  "Thinking",
  "Day Dreaming",
  "Brainstorming",
  "Mulling It Over",
  "Letting It Stew",
  "Noodling",
  "Picking My Brain",
  "Dwelling On It",
  "Weighing The Options",
  "Planning A Master Scheme",
  "Bunseki",
  "Conspiring",
  "I Love It When A Plan Comes Together",
  "Everything Is Proceeding As I Have Foreseen",
  "Did You Ever Stop To Think, And Forget To Start Again?",
  "The Wheel Is Turning, But The Hamster Is Dead",
  "Dial-Up Internet Noises",
  "Grinding The Gears",
  "Rubbing Two Brain Cells Together",
  "Consulting The Council (Of Me)",
  "Executing Order 66…",
  "I'll Take A Potato Chip... And EAT IT!",
  "Just As Planned.",
  "What A Drag... (Visualizing The Shogi Board)",
  "Plotting... Hope Those Meddling Kids Don't Show Up.",
  "Building My Inator",
  "Think Mark",
];
