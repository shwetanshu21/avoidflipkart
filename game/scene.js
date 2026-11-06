/* Original cartoon cast generated for CLOSED. Local assets; no runtime dependencies. */
const CREW_IMAGE = new URL('./assets/closed-office-crew.webp', import.meta.url).href;
const CREW_IMAGE_SMALL = new URL('./assets/closed-office-crew-960.webp', import.meta.url).href;

const FLOOR_NAMES = [
  'Customer Care', 'Senior Support', 'Team Lead', 'Grievance Office',
  'Operations Director', 'Flipkart CEO', 'Walmart CEO',
];
const MOODS = new Set(['idle', 'happy', 'deny', 'deflect', 'risk', 'help', 'laugh', 'promotion', 'audit']);
const CREW_DESCRIPTION = 'An original cartoon call-centre cast: a stern HR officer with a clipboard, a grinning support agent with a headset, and a delighted executive with his coffee, surrounded by unopened cases in a blue and amber office.';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const rankIndex = value => Math.max(0, Math.min(6, Math.trunc(Number(value) || 0)));
const safeMood = value => MOODS.has(value) ? value : 'idle';

function crewImage(eager = false) {
  return `<img class="scene-crew__image" src="${CREW_IMAGE}" srcset="${CREW_IMAGE_SMALL} 960w, ${CREW_IMAGE} 1536w" sizes="(max-width: 700px) 100vw, 720px" width="1536" height="1024" alt="${CREW_DESCRIPTION}" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} draggable="false">`;
}

/** The full original crew illustration for the welcome / hero panel. */
export function renderCrew() {
  return `<div class="office-scene scene-crew">
    ${crewImage(true)}
    <span class="scene-crew__lamplight" aria-hidden="true"></span>
    <span class="scene-crew__edge" aria-hidden="true"></span>
  </div>`;
}

/** Compact illustration with the current floor and an optional reaction. */
export function renderOffice(levelIndex = 0, mood = 'idle') {
  const level = rankIndex(levelIndex);
  const currentMood = safeMood(mood);
  const watched = currentMood === 'help' || currentMood === 'audit';
  const laughing = level === 6 || currentMood === 'laugh' || currentMood === 'promotion';
  return `<div class="office-scene scene-crew scene-office scene-level-${level} scene-mood-${currentMood}${watched ? ' scene-office--watched' : ''}${laughing ? ' scene-office--laughing' : ''}">
    ${crewImage()}
    <span class="scene-crew__lamplight" aria-hidden="true"></span>
    <span class="scene-crew__edge" aria-hidden="true"></span>
    <span class="scene-office__floor"><span class="scene-office__floor-dot" aria-hidden="true"></span>FLOOR ${String(level + 1).padStart(2, '0')}<b>${FLOOR_NAMES[level]}</b></span>
    ${watched ? '<span class="scene-office__watch">HR IS TAKING NOTES</span>' : ''}
    ${laughing ? '<span class="scene-office__laugh" aria-hidden="true"><i>HA</i><i>HA</i><i>HA!</i></span>' : ''}
  </div>`;
}

function portrait(character, label, extraClass = '') {
  return `<span class="scene-portrait scene-portrait--${character}${extraClass ? ` ${extraClass}` : ''}" role="img" aria-label="${escape(label)}">
    <img src="${CREW_IMAGE}" width="1536" height="1024" alt="" decoding="async" draggable="false">
  </span>`;
}

/** A clipped, recognizable HR portrait from the same original cast. */
export function renderHR() {
  return portrait('hr', 'The unimpressed HR officer, watching your customer empathy', 'scene-hr');
}

/** Rank-aware player portrait. The optional initials remain an accessible label. */
export function renderAvatar(index = 0, initials = '') {
  const level = rankIndex(index);
  const character = level >= 4 ? 'executive' : 'agent';
  const title = `${FLOOR_NAMES[level]}${initials ? `, ${String(initials).slice(0, 20)}` : ''}`;
  return portrait(character, title, `scene-avatar scene-avatar--rank-${level}`);
}
