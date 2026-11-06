import { LEVELS, CASES, TIPS } from './content.js';
import { createState, getLevel, getCurrentCase, getShiftDirective, getPromotionProgress, getAchievements, resolveChoice, advanceCase, serializeState, restoreState, getDebrief } from './engine.js';
import { renderOffice } from './scene.js';
import { setSound, playSound } from './audio.js';

const $ = (selector) => document.querySelector(selector);
const main = $('#main');
const dialog = $('#game-dialog');
const storageKey = 'closed-career-v1';
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const number = (value) => Number(value || 0).toLocaleString('en-IN');
const signed = (value) => value === 0 ? '0' : `${value > 0 ? '+' : '−'}${number(Math.abs(value))}`;
const scrollBehavior = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
const icons = {
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5zM17 9l5 6m0-6-5 6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  inbox: '<path d="M4 4h16v16H4zM4 13h5l2 3h2l2-3h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  clip: '<path d="m8 13 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9"/>',
  badge: '<path d="M6 4h12v16H6zM10 2h4v4h-4z"/><circle cx="12" cy="11" r="2"/><path d="M9 17h6"/>',
  cup: '<path d="M8 3h8v6c0 5-8 5-8 0zM8 5H4v3c0 3 3 3 4 3m8-6h4v3c0 3-3 3-4 3M12 13v5m-4 3h8m-8-3h8"/>',
  stamp: '<path d="M8 3h8v7l3 5H5l3-5zM4 19h16v3H4z"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  memo: '<path d="M6 3h12v18H6zM9 8h6m-6 4h6m-6 4h4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  heart: '<path d="M12 21 3 12C-2 4 8-1 12 7c4-8 14-3 9 5z"/>',
  chart: '<path d="M4 3v17h17M8 16v-4m5 4V8m5 8V4"/>',
};
const icon = (name) => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.stamp}</svg>`;
const kinds = {
  deny: { label: 'By the non-existent book', badge: 'POLICY EXCUSE' },
  deflect: { label: 'Someone else’s problem', badge: 'PASS THE PARCEL' },
  risk: { label: 'Executive material', badge: 'PREMIUM NONSENSE' },
  help: { label: 'A career-limiting move', badge: 'ACTUALLY HELP' },
};

let state = createState(Date.now());
let hasSave = false;
let view = 'welcome';
let paused = false;
let elapsedMs = 0;
let clockStart = 0;
let clockRunning = false;
let sound = false;
let storageAvailable = true;
let unreadableSave = false;
let toastTimeout;
let savedSecond = -1;
let pendingCelebrations = [];

try {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    let data;
    try { data = JSON.parse(raw); } catch { unreadableSave = true; }
    const restored = data?.format === 1 && typeof data?.game === 'string' ? restoreState(data.game) : null;
    if (restored) {
      state = restored;
      elapsedMs = Number.isFinite(data.elapsedMs) && data.elapsedMs >= 0 ? Math.min(data.elapsedMs, 86400000) : 0;
      sound = data.sound === true;
      hasSave = true;
    } else unreadableSave = true;
  }
} catch { storageAvailable = false; }

function currentElapsed() { return elapsedMs + (clockRunning ? performance.now() - clockStart : 0); }
function freezeClock() { elapsedMs = currentElapsed(); clockRunning = false; }
function resumeClock() {
  if (!clockRunning && view === 'play' && state.phase === 'case' && !paused && !dialog.open && !document.hidden) {
    clockStart = performance.now(); clockRunning = true;
  }
}
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ format: 1, game: serializeState(state), elapsedMs: Math.round(currentElapsed()), sound }));
    hasSave = true;
    storageAvailable = true;
  } catch {
    if (storageAvailable) toast('This browser cannot save progress. Keep this tab open to finish your career.');
    storageAvailable = false;
  }
}
function toast(message) {
  const target = $('#toast');
  target.textContent = message;
  target.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => target.classList.remove('show'), 4200);
}
function updateHeader() {
  const soundButton = $('#sound-button');
  soundButton.innerHTML = icon(sound ? 'sound' : 'mute');
  soundButton.setAttribute('aria-label', sound ? 'Turn sound off' : 'Turn sound on');
  soundButton.setAttribute('aria-pressed', String(sound));
  const pauseButton = $('#pause-button');
  pauseButton.hidden = view !== 'play';
  pauseButton.innerHTML = icon(paused ? 'play' : 'pause');
  pauseButton.setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
}
function scene(levelIndex, welcome = false, mood = 'idle') {
  const level = LEVELS[levelIndex];
  if (welcome) return `<div class="scene-frame"><div class="scene-topline"><span>FK · CUSTOMER SUPPORT FLOOR</span><span>● NIGHT SHIFT</span></div><div class="scene-wrap">${renderOffice(0, mood)}</div><div class="scene-bottomline"><span>DESK 0042 · BENGALURU</span><b>EVERYTHING IS FINE.</b></div></div>`;
  return `<div class="scene-frame"><div class="employee-bar"><div class="employee-icon">${icon(levelIndex >= 5 ? 'cup' : 'badge')}</div><div class="employee-info"><div class="eyebrow">${escape(level.company)} · EMPLOYEE 0042</div><h2>${escape(level.name)}</h2></div><span class="floor-tag">LVL ${String(levelIndex + 1).padStart(2, '0')}</span></div><div class="scene-wrap" id="office-art">${renderOffice(levelIndex, mood)}</div><div class="office-quote">${icon('memo')}<span>${escape(level.motto)}</span></div><div class="scene-bottomline"><span>${levelIndex >= 5 ? 'EXECUTIVE SUITE' : `FLOOR ${String(levelIndex + 1).padStart(2, '0')} · NIGHT SHIFT`}</span><b>${levelIndex === 6 ? 'GLOBAL NON-RESOLUTION' : 'ON COMPANY TIME'}</b></div></div>`;
}
function renderWelcome() {
  freezeClock(); view = 'welcome'; paused = false;
  main.innerHTML = `${!storageAvailable ? '<div class="storage-note">Browser storage is unavailable. Your career will last for this tab.</div>' : ''}<section class="intro" aria-labelledby="intro-title"><div class="intro-copy"><div class="eyebrow orange"><span class="live-dot"></span> NOW HIRING · NO EMPATHY REQUIRED</div><h1 id="intro-title">Close tickets.<br>Open<br> <em>opportunities.</em></h1><p class="intro-description">Welcome to customer care, where the customer is optional. Invent ridiculous excuses, close complaints, and fail your way from <strong>Flipkart support to Walmart CEO.</strong></p><div class="start-actions"><button class="primary-button" data-action="start">${hasSave ? 'Resume your career' : 'Clock in. Care less.'}${icon('arrow')}</button>${hasSave ? '<button class="text-button" data-action="reset">Start a new career</button>' : '<button class="text-button" data-action="handbook">Read the employee handbook</button>'}</div><p class="intro-footnote">${hasSave ? `SAVE FOUND · ${escape(getLevel(state).shortName || getLevel(state).name)} · ${number(state.score)} POINTS` : 'NO SIGN-UP. NO INSTALL. DEFINITELY NO REFUNDS.'}</p><div class="intro-stats"><div class="intro-stat"><strong>${number(CASES.length)}</strong><span>Ridiculous cases</span></div><div class="intro-stat"><strong>07</strong><span>Corporate ranks</span></div><div class="intro-stat"><strong>00</strong><span>Accountability</span></div></div></div><div class="intro-art">${scene(0, true)}<div class="floating-note"><span class="paperclip" aria-hidden="true"></span><span class="note-label">MEMO FROM MANAGEMENT</span><p>“The problem isn’t the problem. The open ticket is.”</p></div></div></section><div class="ticker"><strong>${icon('bolt')} COMPANY NEWS</strong><p>Customer satisfaction has been removed from the customer satisfaction survey.</p><span class="ticker-right">BUSINESS AS USUAL</span></div><section class="welcome-bottom" aria-label="How the game works"><div class="welcome-rule"><span class="rule-no">01 /</span><div><h3>Read the complaint. Find the loophole.</h3><p>Four possible replies. One unfortunate customer. An entire department of bad decisions.</p></div></div><div class="welcome-rule"><span class="rule-no">02 /</span><div><h3>More nonsense. More points.</h3><p>Close fast, chain combos, get promoted. Actually helping attracts management heat.</p></div></div><div class="welcome-rule"><span class="rule-no">03 /</span><div><h3>Take incompetence to the top.</h3><p>New floors. Bigger problems. Eventually, a global corporation and an evil laugh.</p></div></div></section>`;
  updateHeader();
}
function renderHud() {
  const heat = state.heat || 0;
  return `<section class="hud" aria-label="Career statistics"><div class="hud-stat"><div class="hud-label">${icon('spark')} CORPORATE APPROVAL</div><div class="hud-number orange">${number(state.score)}<small>pts</small></div><div class="hud-sub">Your most valuable lack of contribution.</div></div><div class="hud-stat"><div class="hud-label">${icon('stamp')} TICKETS CLOSED</div><div class="hud-number">${number(state.closed)}<small>and forgotten</small></div><div class="hud-sub">${number(state.helped)} actually helped. HR is counting.</div></div><div class="hud-stat"><div class="hud-label">${icon('bolt')} SPEED COMBO</div><div class="hud-number green">×${state.multiplier || 1}<small>${number(state.streak)} streak</small></div><div class="hud-sub">Close within 25 seconds to keep it going.</div></div><div class="hud-stat"><div class="hud-label">${icon('eye')} MANAGEMENT HEAT</div><div class="heat-heading"><strong class="${heat >= 60 ? 'hot' : ''}">${heat}%</strong><span>${heat >= 60 ? 'SUSPICIOUSLY HELPFUL' : heat > 0 ? 'HR IS WATCHING' : 'SAFELY INCOMPETENT'}</span></div><div class="meter heat ${heat >= 60 ? 'hot' : ''}" role="meter" aria-label="Management heat" aria-valuenow="${heat}" aria-valuemin="0" aria-valuemax="100"><span style="width:${heat}%"></span></div><div class="hud-sub">Helping raises heat. Nonsense cools it.</div></div></section>`;
}
function renderPromotionTrack() {
  const progress = getPromotionProgress(state);
  if (!progress.nextLevel) return `<div class="promotion-track"><div class="promotion-top"><span>CAREER LADDER</span><button data-action="career">VIEW ALL ↗</button></div><div class="promotion-name"><span>Top of the food chain.</span><span>07 / 07</span></div><div class="meter"><span style="width:100%"></span></div><p class="promotion-caption">${state.won ? 'Endless mode. The complaints are now global.' : `${Math.min(20, state.levelHandled?.[6] || 0)} / 20 global cases to complete your career.`}</p><button class="laugh-button" data-action="laugh">PRACTISE YOUR EVIL LAUGH ${sound ? '♪' : '↗'}</button></div>`;
  const percent = Math.round(Math.min(1, Math.max(0, progress.progress || 0)) * 100);
  return `<div class="promotion-track"><div class="promotion-top"><span>YOUR NEXT PROMOTION</span><button data-action="career">VIEW LADDER ↗</button></div><div class="promotion-name"><span>${escape(progress.nextLevel.shortName || progress.nextLevel.name)}</span><span>${percent}%</span></div><div class="meter" role="progressbar" aria-label="Progress to next promotion" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${percent}%"></span></div><p class="promotion-caption">${number(progress.pointsNeeded)} more points · ${number(progress.casesNeeded)} more closures</p></div>`;
}
function renderCase(file) {
  const evidence = Array.isArray(file.evidence) ? file.evidence.join(' · ') : file.evidence;
  return `<div class="inbox-header"><span>${icon('inbox')} ${escape(getLevel(state).channel || 'INCOMING COMPLAINT')}</span><div class="case-timer" id="case-timer" aria-label="Active case time">${icon('clock')}<span>00:00</span> <span class="timer-bonus">· COMBO WINDOW</span></div></div><article class="case-file" aria-labelledby="case-title"><div class="ticket-meta"><span>INC-${String(state.phase === 'result' ? state.handled : state.handled + 1).padStart(5, '0')}</span><span class="case-label">${escape(file.tag || 'CUSTOMER COMPLAINT')}</span></div><div class="customer-row"><div class="customer-avatar" aria-hidden="true">${escape(file.initials || file.customer?.slice(0, 2) || 'CC')}</div><div><h3>${escape(file.customer)}</h3><p>${escape(file.product || file.subject)}${file.amount ? ` · ${escape(file.amount)}` : ''}</p></div><span class="priority-pill ${file.priority === 'urgent' || file.priority === 'high' ? 'urgent' : ''}">${escape((file.priority || 'normal').toUpperCase())}</span></div><h2 id="case-title" tabindex="-1">${escape(file.title)}</h2><p class="complaint">${escape(file.body)}</p><details class="evidence"><summary>${icon('clip')} View attached evidence <span>(inconvenient)</span></summary><p>${escape(evidence)}</p></details></article>`;
}
function renderChoices(file) {
  return `<section aria-labelledby="decision-title"><div class="decision-header"><h3 id="decision-title">Choose your official response.</h3><span><kbd>1</kbd>–<kbd>4</kbd> TO REPLY</span></div><div class="choices">${file.choices.map((choice, index) => `<button class="choice ${escape(choice.kind)}" data-choice="${escape(choice.id)}" ${paused ? 'disabled' : ''} aria-label="${index + 1}. ${escape(choice.label)}. ${escape(choice.text)} Base points: ${signed(choice.basePoints)}."><span class="choice-top"><span class="choice-kind">${kinds[choice.kind]?.badge || 'OFFICIAL RESPONSE'}</span><kbd aria-hidden="true">${index + 1}</kbd></span><strong class="choice-title">${escape(choice.label)}</strong><span class="choice-text">${escape(choice.text)}</span><span class="choice-impact"><span>${kinds[choice.kind]?.label || ''}</span><b>${signed(choice.basePoints)} pts</b></span></button>`).join('')}</div><p class="fine-print">Fictional complaints. Corporate incentives are deliberately, spectacularly backwards.</p></section>`;
}
function renderResult() {
  const result = state.pendingResult;
  if (!result) return '';
  const helpful = result.kind === 'help';
  const selectedChoice = getCurrentCase(state)?.choices.find(choice => choice.id === result.choiceId);
  const achievements = getAchievements(state).filter(item => result.newAchievements?.includes(item.id));
  return `<section class="result-panel ${helpful ? 'help' : ''}" aria-labelledby="result-title" tabindex="-1" id="result-panel"><div class="result-header"><h3 class="result-stamp" id="result-title">${helpful ? 'ACTUALLY SOLVED' : 'CASE CLOSED'}</h3><div class="result-points">${signed(result.points)}<small>pts</small></div></div><div class="result-content"><div class="eyebrow" style="font-size:8px;margin-bottom:10px">ACTION ENTERED INTO THE RECORD</div><p class="result-reply">${escape(selectedChoice?.text || result.reply)}</p><p class="result-outcome">${escape(result.reply)}</p><div class="result-breakdown"><span>BASE ${signed(result.basePoints)}</span>${result.speedBonus ? `<span>SPEED ${signed(result.speedBonus)}</span>` : ''}${result.multiplier > 1 ? `<span>COMBO ×${result.multiplier}</span>` : ''}${result.directiveBonus ? `<span>MEMO ${signed(result.directiveBonus)}</span>` : ''}${result.heatDelta ? `<span class="${result.heatDelta > 0 ? 'negative' : ''}">HEAT ${signed(result.heatDelta)}%</span>` : ''}${result.auditPenalty ? `<span class="negative">HR PENALTY −${number(result.auditPenalty)}</span>` : ''}</div>${result.audit ? `<div class="result-note"><strong>COMPETENCE DETECTED. HR AUDIT.</strong>${escape(result.auditReason || 'Management has noticed a disturbing pattern: customers are receiving help. Please reflect on your lack of corporate values.')}</div>` : ''}${achievements.map(item => `<div class="achievement-inline">${icon('cup')}<span>UNLOCKED · ${escape(item.title)}</span></div>`).join('')}${result.promotedTo !== null && result.promotedTo !== undefined ? `<div class="result-note"><strong>YOU’VE BEEN PROMOTED.</strong>${escape(LEVELS[result.promotedTo].name)}. Your chair now costs more than the refunds you refused.</div>` : ''}<button class="primary-button result-cta" data-action="next">${result.won ? 'Attend your coronation' : result.promotedTo !== null && result.promotedTo !== undefined ? 'Accept promotion' : result.shiftCompleted ? 'Finish shift & see review' : 'Next unfortunate customer'}${icon('arrow')}</button><p class="fine-print">Press Enter to continue. Take your time reading the aftermath — the clock is stopped.</p></div></section>`;
}
function renderGame({ focusCase = false, focusResult = false } = {}) {
  view = 'play';
  const file = getCurrentCase(state);
  if (!file) { toast('This case has slipped behind a filing cabinet. Starting a fresh queue.'); state = createState(Date.now()); return renderGame(); }
  const level = getLevel(state);
  const directive = getShiftDirective(state);
  const mood = state.phase === 'result' ? state.pendingResult?.audit ? 'audit' : state.pendingResult?.kind === 'help' ? 'help' : state.levelIndex === 6 ? 'laugh' : 'stamp' : 'idle';
  const dots = Array.from({ length: 10 }, (_, index) => `<i class="${index < state.shiftCases ? 'done' : index === state.shiftCases ? 'current' : ''}"></i>`).join('');
  const tip = TIPS[state.handled % TIPS.length] || 'The queue is infinite. Your responsibility is not.';
  main.innerHTML = `${!storageAvailable ? '<div class="storage-note">Progress cannot be saved in this browser. Keep this tab open.</div>' : ''}${paused ? '<div class="pause-strip"><span>ON A BREAK · Even the excuses need a rest. Your timer is paused.</span><button data-action="pause">Resume</button></div>' : ''}<div class="game-heading"><div><div class="eyebrow"><span class="live-dot"></span> SHIFT ${String(state.shift).padStart(2, '0')} / ${escape(level.company)} SUPPORT SYSTEMS</div><h1>Your career. Their problem.</h1></div><div class="shift-chips"><button class="ledger-button" data-action="ledger">${icon('chart')} Your record</button><div class="shift-counter"><strong>${Math.min(state.shiftCases, 10)}</strong> / 10 CASES<div class="shift-dots" aria-hidden="true">${dots}</div></div></div></div>${renderHud()}<div class="game-grid ${paused ? 'is-paused' : ''}"><aside class="office-column" aria-label="Your office and promotion progress">${scene(state.levelIndex, false, mood)}${renderPromotionTrack()}<div class="directive"><div class="directive-icon">${icon('memo')}</div><div><div class="eyebrow">TODAY’S MANAGEMENT MEMO</div><h3>${escape(directive.title)}</h3><p>${escape(directive.description)}</p></div></div></aside><div class="ticket-column">${renderCase(file)}${state.phase === 'result' ? renderResult() : renderChoices(file)}</div></div><div class="ticker shift-ticker"><strong>FROM HR</strong><p>${escape(tip)}</p><button class="text-button" data-action="ledger">Employee record ↗</button></div>`;
  updateHeader(); updateTimer();
  if (focusCase) $('#case-title')?.focus({ preventScroll: true });
  if (focusResult) $('#result-panel')?.focus({ preventScroll: true });
  resumeClock();
}
function updateTimer() {
  const target = $('#case-timer');
  if (!target) return;
  const milliseconds = state.phase === 'result' ? state.pendingResult.elapsedMs : currentElapsed();
  const total = Math.floor(milliseconds / 1000);
  const text = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  const slow = milliseconds > 25000;
  const status = paused ? 'PAUSED' : state.phase === 'result' ? 'FILED' : slow ? 'NO SPEED BONUS' : 'COMBO WINDOW';
  target.classList.toggle('slow', slow);
  target.innerHTML = `${icon('clock')}<span>${text}</span><span class="timer-bonus">· ${status}</span>`;
  target.setAttribute('aria-label', `Case time ${total} seconds. ${status.toLowerCase()}`);
}
function start() {
  setSound(sound); playSound('paper'); view = 'play'; paused = false;
  renderGame(); save();
  if (window.innerWidth < 700) $('.inbox-header')?.scrollIntoView({ behavior: 'auto', block: 'start' });
  else window.scrollTo({ top: 0, behavior: 'instant' });
}
function choose(choiceId) {
  if (view !== 'play' || paused || dialog.open || state.phase !== 'case') return;
  freezeClock();
  const previous = state;
  state = resolveChoice(state, choiceId, elapsedMs);
  if (state === previous) { resumeClock(); return; }
  playSound(state.pendingResult.kind === 'help' ? 'help' : 'stamp');
  save(); renderGame({ focusResult: true });
  if (window.innerWidth < 700) $('#result-panel')?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
}
function advance() {
  freezeClock(); state = advanceCase(state); elapsedMs = 0; savedSecond = -1;
  save(); playSound('paper'); renderGame({ focusCase: true });
  if (window.innerWidth < 700) $('.inbox-header')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
}
function next() {
  if (paused || dialog.open || state.phase !== 'result') return;
  const result = state.pendingResult;
  pendingCelebrations = [];
  if (result.promotedTo !== null && result.promotedTo !== undefined) pendingCelebrations.push('promotion');
  if (result.won) pendingCelebrations.push('win');
  if (result.shiftCompleted) pendingCelebrations.push('debrief');
  continueCelebrations();
}
function continueCelebrations() {
  if (dialog.open) dialog.close();
  const kind = pendingCelebrations.shift();
  if (kind === 'promotion') return promotionModal();
  if (kind === 'win') return winModal();
  if (kind === 'debrief') return debriefModal();
  advance();
}
function openModal(title, label, body, options = {}) {
  freezeClock();
  $('#dialog-content').innerHTML = `<div class="dialog-header"><div><div class="eyebrow orange">${escape(label)}</div><h2 id="dialog-title" tabindex="-1">${escape(title)}</h2></div><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body">${body}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  $('#dialog-title').focus({ preventScroll: true });
  if (options.sound) playSound(options.sound);
}
function handbookModal() {
  openModal('A handbook for getting ahead.', 'PLEASE PRETEND TO READ', `<p>Your job is to make the dashboard look good. The dashboard does not have a refund button.</p><div class="handbook-grid"><div class="handbook-rule"><span>01 / REPLY & CLOSE</span><h3>Choose one of four replies.</h3><p>Read the case and its inconvenient evidence. Ordinary excuses earn points. Outrageous nonsense earns the most. Every unhelpful reply closes the ticket.</p></div><div class="handbook-rule"><span>02 / THE COMBO</span><h3>Be efficiently useless.</h3><p>Close within 25 seconds to earn a speed bonus and build your streak, up to a ×3 multiplier. Slower replies still earn base points. Helping resets the streak.</p></div><div class="handbook-rule"><span>03 / MANAGEMENT HEAT</span><h3>Competence is a liability.</h3><p>Actually solving an issue loses points and raises heat. Excuses cool it down. At 100% heat, HR audits your alarming helpfulness and deducts points. You keep your rank.</p></div><div class="handbook-rule"><span>04 / CLIMB THE LADDER</span><h3>Seven floors of bad incentives.</h3><p>Meet both point and closure targets to get promoted. Each rank has 120 cases. A new office and inbox await. Handle 20 Walmart cases to complete the career, then continue endlessly.</p></div></div><p style="margin-top:22px">Ten cases make a shift. Follow the management memo for extra points. Your career saves automatically in this browser. Pausing, opening this handbook, or switching tabs stops the active case timer.</p><div class="shortcut-row"><span><kbd>1</kbd>–<kbd>4</kbd> Reply</span><span><kbd>Enter</kbd> Next case</span><span><kbd>P</kbd> Pause</span><span><kbd>M</kbd> Sound</span><span><kbd>?</kbd> Handbook</span><span><kbd>Esc</kbd> Close dialog</span></div><div class="dialog-actions"><button class="primary-button" data-action="close-modal">I understand the wrong priorities ${icon('arrow')}</button></div>`);
}
function careerModal() {
  openModal('The upward failure trajectory.', 'CORPORATE MOBILITY PROGRAMME', `<p>Every promotion needs <strong>both approval points and closed tickets</strong>. All seven ranks have 120 cases; each queue is shuffled without repeats until its deck is exhausted.</p><ol class="career-list">${LEVELS.map((level, index) => `<li class="career-level ${index <= state.levelIndex ? 'unlocked' : ''} ${index === state.levelIndex ? 'current' : ''}"><span class="level-node">${index < state.levelIndex ? '✓' : index + 1}</span><div><h3>${escape(level.name)}</h3><p>${escape(level.motto)}</p><div class="level-requirements">${index === 0 ? 'A PULSE. FLEXIBLE ABOUT THE PULSE.' : `${number(level.threshold)} PTS + ${number(level.quota)} TOTAL CLOSURES`}</div></div><span class="level-number">${index === state.levelIndex ? 'YOU ARE HERE' : index < state.levelIndex ? 'COMPLETED' : 'LOCKED'}</span></li>`).join('')}</ol><div class="dialog-actions"><button class="secondary-button" data-action="ledger">View employee record</button><button class="primary-button" data-action="close-modal">Back to business ${icon('arrow')}</button></div>`);
}
function ledgerModal(tab = 'achievements') {
  const achievements = getAchievements(state);
  const history = [...(state.history || [])].reverse();
  let body = `<div class="modal-tabs"><button class="${tab === 'achievements' ? 'active' : ''}" data-action="ledger">Achievements (${achievements.filter(item => item.unlocked).length}/${achievements.length})</button><button class="${tab === 'history' ? 'active' : ''}" data-action="history">Recent incidents</button></div>`;
  if (tab === 'achievements') body += `<div class="achievement-list">${achievements.map(item => `<div class="achievement-card ${item.unlocked ? 'unlocked' : ''}"><span>${item.unlocked ? '✓ UNLOCKED' : '○ NOT YET EARNED'}</span><h3>${escape(item.title)}</h3><p>${escape(item.description)}</p></div>`).join('')}</div>`;
  else body += history.length ? `<p>Your last ${history.length} decisions. A record that HR will interpret creatively.</p><ol class="ledger-list">${history.map(item => `<li class="ledger-entry"><div>${escape(item.caseTitle || item.title || CASES.find(file => file.id === item.caseId)?.title || 'Closed incident')}<br><span>${escape(kinds[item.kind]?.badge || item.kind)} · ${Math.round((item.elapsedMs || 0) / 1000)}s</span></div><b class="${item.points < 0 ? 'negative' : ''}">${signed(item.points)} pts</b></li>`).join('')}</ol>` : '<div class="empty-state">A spotless record. This will not last.<br>Clock in and make your first questionable decision.</div>';
  body += `<div class="dialog-actions"><button class="secondary-button danger-button" data-action="reset">Start a new career</button><button class="primary-button" data-action="close-modal">Back to my desk ${icon('arrow')}</button></div>`;
  openModal('Your permanent record.', 'EMPLOYEE 0042 / STRICTLY INTERNAL', body);
}
function promotionModal() {
  const level = getLevel(state);
  confetti();
  openModal('You are failing upwards.', 'PROMOTION APPROVED', `<div class="promotion-celebration"><div class="promotion-emblem">${icon('cup')}</div><div class="eyebrow">YOUR NEW POSITION</div><h3>${escape(level.name)}</h3><p>${escape(level.motto)}</p><p>Management admired your ability to turn unresolved problems into completed spreadsheets. Your new office comes with <strong>120 fresh cases</strong> and fewer consequences.</p>${state.levelIndex === 6 ? '<p>Flipkart was merely the tutorial in scale. Welcome to Walmart. The entire planet is now eligible for a non-answer.</p>' : ''}<button class="primary-button" data-action="continue-celebrations">${state.levelIndex === 6 ? 'Assume global non-responsibility' : 'Move into my new office'}${icon('arrow')}</button></div>`, { sound: 'promotion' });
}
function debriefModal() {
  const report = getDebrief(state);
  openModal('Your performance review.', `SHIFT ${String(report.shift).padStart(2, '0')} / FILED SUCCESSFULLY`, `<div class="debrief-score"><span class="grade">${escape(report.grade)}</span><div><h3>${escape(report.title)}</h3><p>Measured exclusively by things that look impressive in a spreadsheet.</p></div></div><div class="debrief-grid"><div><strong>${signed(report.points)}</strong><span>APPROVAL POINTS</span></div><div><strong>${number(report.closed)}</strong><span>TICKETS BURIED</span></div><div><strong>${number(report.helped)}</strong><span>HR CONCERNS</span></div></div><p>Average handling time: <strong>${(report.averageMs / 1000).toFixed(1)} seconds</strong>. ${report.helped === 0 ? 'No customers were helped in the making of this shift. Management is delighted.' : 'Some customers received help. Management has scheduled a meeting about your attitude.'}</p><div class="dialog-actions"><button class="primary-button" data-action="continue-celebrations">Clock in for the next shift ${icon('arrow')}</button></div>`);
}
function winModal() {
  confetti();
  openModal('The problem is now global.', 'CAREER COMPLETE / WALMART CEO', `<div class="promotion-celebration"><div class="promotion-emblem">${icon('cup')}</div><div class="eyebrow">FROM DESK 0042 TO WORLD DOMINATION</div><h3>Chief Executive<br>of Not Our Problem.</h3><p>You handled 20 global cases as Walmart CEO. The board has never been happier. The customers have never been asked.</p><div class="debrief-grid"><div><strong>${number(state.score)}</strong><span>APPROVAL</span></div><div><strong>${number(state.closed)}</strong><span>CLOSURES</span></div><div><strong>${number(state.bestStreak)}</strong><span>BEST COMBO</span></div></div><p>The executive chair rotates a full 360°. Finally, a way to turn your back on everyone.</p><button class="laugh-button" data-action="laugh">MUAHAHA. (EXECUTIVE PRIVILEGE.)</button><button class="primary-button" data-action="continue-celebrations">Keep the empire disappointingly alive ${icon('arrow')}</button></div>`, { sound: 'laugh' });
}
function resetModal() {
  openModal('Hand in your golden stapler?', 'START A NEW CAREER', '<p>This will replace the saved career in this browser, including your points, rank, history, and achievements. You will return to the customer-care desk with a fresh shuffled queue.</p><div class="dialog-actions"><button class="secondary-button" data-action="close-modal">Keep my current career</button><button class="primary-button" data-action="confirm-reset">Start over at desk 0042</button></div>');
}
function aboutModal() {
  openModal('A very unserious career.', 'AN AVOID FLIPKART ORIGINAL', '<p><strong>CLOSED.</strong> is an independent satirical game about customer-service bureaucracy and backwards corporate incentives. All game customers, complaints, dialogue, memos, offices, and events are invented.</p><p>Flipkart and Walmart are named as the subjects of the satire. This game is not affiliated with or endorsed by either company, and the fictional game scenarios are not claims about specific real incidents or employees.</p><p>The original documented customer account lives in the casebook. The game has no login, leaderboard, purchases, or external AI calls. Progress is saved only in this browser.</p><div class="dialog-actions"><a class="secondary-button" href="/">Read the original casebook ↗</a><button class="primary-button" data-action="close-modal">Back to my questionable career</button></div>');
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const container = document.createElement('div'); container.className = 'confetti'; container.setAttribute('aria-hidden', 'true');
  container.innerHTML = Array.from({ length: 35 }, (_, index) => `<i style="left:${(index * 47) % 100}%;animation-delay:${(index % 9) * .08}s;transform:rotate(${index * 23}deg)"></i>`).join('');
  document.body.append(container); setTimeout(() => container.remove(), 3700);
}
function togglePause() {
  if (view !== 'play' || dialog.open) return;
  freezeClock(); paused = !paused; renderGame(); save();
}
function toggleSound() {
  sound = !sound; setSound(sound); updateHeader(); playSound('click');
  if (hasSave || view === 'play') save();
  toast(sound ? 'Sound on. The sound of a flourishing non-service economy.' : 'Sound off. The complaints remain imaginary.');
}
function laugh() {
  if (state.levelIndex !== 6) return;
  playSound('laugh');
  const art = $('#office-art');
  if (art) { art.innerHTML = renderOffice(6, 'laugh'); setTimeout(() => { if ($('#office-art') && state.levelIndex === 6) $('#office-art').innerHTML = renderOffice(6, 'idle'); }, 2300); }
  toast(sound ? 'MUAHAHA. Your laugh has been expensed to customer experience.' : 'MUAHAHA. Even your evil laugh has been placed on mute.');
}
const actions = {
  start, next, career: careerModal, handbook: handbookModal, ledger: () => ledgerModal(), history: () => ledgerModal('history'), about: aboutModal,
  pause: togglePause, sound: toggleSound, laugh, reset: resetModal,
  'close-modal': () => dialog.close(),
  'continue-celebrations': continueCelebrations,
  'confirm-reset': () => {
    freezeClock(); state = createState(Date.now()); elapsedMs = 0; pendingCelebrations = []; paused = false; hasSave = false;
    if (dialog.open) dialog.close();
    save(); start(); toast('New badge. Same questionable employer.');
  },
};
document.addEventListener('click', event => {
  const choice = event.target.closest('[data-choice]');
  if (choice) { choose(choice.dataset.choice); return; }
  const target = event.target.closest('[data-action]');
  if (target) actions[target.dataset.action]?.();
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.target.matches('input, textarea, select') || event.target.isContentEditable) return;
  if (dialog.open) return;
  const key = event.key.toLowerCase();
  if (key === 'm') { event.preventDefault(); toggleSound(); return; }
  if (key === '?') { event.preventDefault(); handbookModal(); return; }
  if (view !== 'play') return;
  if (key === 'p') { event.preventDefault(); togglePause(); return; }
  if (paused) return;
  if (/^[1-4]$/.test(key) && state.phase === 'case') {
    event.preventDefault();
    const choice = getCurrentCase(state).choices[Number(key) - 1];
    if (choice) choose(choice.id);
  }
  if (key === 'enter' && state.phase === 'result' && !event.target.closest('button, a, summary')) { event.preventDefault(); next(); }
});
dialog.addEventListener('close', () => { resumeClock(); saveIfPlaying(); });
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
function saveIfPlaying() { if (view === 'play') save(); }
document.addEventListener('visibilitychange', () => {
  if (document.hidden && view === 'play') {
    freezeClock(); paused = true; save(); renderGame();
  }
});
window.addEventListener('pagehide', () => { freezeClock(); saveIfPlaying(); });
setInterval(() => {
  if (view !== 'play') return;
  updateTimer();
  const second = Math.floor(currentElapsed() / 1000);
  if (clockRunning && second !== savedSecond) { savedSecond = second; save(); }
}, 250);

renderWelcome();
if (unreadableSave) toast('Your saved career could not be read. Clock in to start a fresh one.');
