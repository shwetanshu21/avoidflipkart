import { LEVELS, CASES, TIPS } from './content.js';
import { createState, getLevel, getCurrentCase, getPromotionProgress, getAchievements, resolveChoice, advanceCase, serializeState, restoreState, getDebrief, getHRQuestion, answerHRQuestion } from './engine.js';
import { renderOffice, renderCrew, renderHR, renderAvatar } from './scene.js';
import { setSound, playSound } from './audio.js';

const $ = selector => document.querySelector(selector);
const main = $('#main');
const dialog = $('#game-dialog');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const number = value => Number(value || 0).toLocaleString('en-IN');
const signed = value => value === 0 ? '0' : `${value > 0 ? '+' : '−'}${number(Math.abs(value))}`;
const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
const storageKey = mode => `closed-career-v2:${mode}`;
const modeName = mode => mode === 'express' ? 'Express' : 'Full Career';
const icons = {
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>', sound: '<path d="m11 4-6 5H2v6h3l6 5zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5zM17 9l5 6m0-6-5 6"/>', pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="m8 4 12 8-12 8z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>', inbox: '<path d="M4 4h16v16H4zM4 13h5l2 3h2l2-3h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', clip: '<path d="m8 13 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9"/>',
  badge: '<path d="M6 4h12v16H6zM10 2h4v4h-4z"/><circle cx="12" cy="11" r="2"/><path d="M9 17h6"/>',
  cup: '<path d="M8 3h8v6c0 5-8 5-8 0zM8 5H4v3c0 3 3 3 4 3m8-6h4v3c0 3-3 3-4 3M12 13v5m-4 3h8m-8-3h8"/>',
  stamp: '<path d="M8 3h8v7l3 5H5l3-5zM4 19h16v3H4z"/>', spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>', memo: '<path d="M6 3h12v18H6zM9 8h6m-6 4h6m-6 4h4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  chart: '<path d="M4 3v17h17M8 16v-4m5 4V8m5 8V4"/>', share: '<path d="M12 16V3m-5 5 5-5 5 5M5 13v8h14v-8"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/>', home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.stamp}</svg>`;
const fkMark = (label = 'FK') => `<span class="fk-mark" aria-hidden="true"><span>${label}</span></span>`;
const EXPRESS_TIPS = [
  'Express: two cases at each rank. Fourteen complaints stand between you and a global corporation.',
  'The more ridiculous the excuse, the higher your score. HR prefers results that do not resolve anything.',
  'Helping raises heat. At 100%, a three-question HR review decides whether you stay employed.',
  'Your Express and Full careers save separately. Corporate ambition now comes in two sizes.',
  'The customer gets an answer. You find out what it cost after pressing send.',
  'Pause for chai. The clock waits, which is more than the delivery agent normally does.',
  'Your score is for bragging rights. Every two handled cases earns an Express promotion.',
  'Fourteen cases. Seven ranks. One exceptionally questionable career.',
];
const MEMOS = [
  'Your customer has been on hold for 47 minutes. On the bright side, so has your increment.',
  'The chai break is 15 minutes. The refund investigation is a way of life.',
  'Please do not feed the customers. They may return with expectations.',
  'The grievance inbox is empty. We have renamed it something else.',
  'A resolved ticket is a ticket that has stopped making eye contact.',
  'The office printer has declared independence. Its policies are still binding.',
  'Customer satisfaction is at an all-time high. We stopped asking customers.',
];
let mode = 'express';
let state;
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
let requestedRestart = null;
let continueOnDialogClose = false;
const saves = { express: null, full: null };
const challenge = new URLSearchParams(location.search);
const challengeSeed = /^\d{1,10}$/.test(challenge.get('seed') || '') ? Number(challenge.get('seed')) >>> 0 : null;

function readEnvelope(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const game = [1, 2].includes(data?.format) && typeof data.game === 'string' ? restoreState(data.game) : null;
    if (!game) { unreadableSave = true; return null; }
    return { game, elapsedMs: Number.isFinite(data.elapsedMs) && data.elapsedMs >= 0 ? Math.min(data.elapsedMs, 3_600_000) : 0, sound: data.sound === true };
  } catch { unreadableSave = true; return null; }
}
let prefs = {};
try {
  try {
    const value = JSON.parse(localStorage.getItem('closed-preferences-v2') || '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) prefs = value;
  } catch { /* A broken preference must never hide a valid career save. */ }
  sound = prefs.sound === true;
  for (const key of ['express', 'full']) {
    const data = readEnvelope(localStorage.getItem(storageKey(key)));
    if (data?.game.mode === key) saves[key] = data;
  }
  if (!saves.full) {
    const old = readEnvelope(localStorage.getItem('closed-career-v1'));
    if (old?.game.mode === 'full') { saves.full = old; if (typeof prefs.sound !== 'boolean') sound = old.sound; }
  }
  mode = challenge.get('mode') === 'full' ? 'full' : challenge.get('mode') === 'express' ? 'express' : prefs.mode === 'full' ? 'full' : 'express';
} catch { storageAvailable = false; }
state = saves[mode]?.game || createState(challengeSeed || Date.now(), mode);
elapsedMs = saves[mode]?.elapsedMs || 0;

function currentElapsed() { return elapsedMs + (clockRunning ? performance.now() - clockStart : 0); }
function freezeClock() { elapsedMs = currentElapsed(); clockRunning = false; }
function resumeClock() {
  if (!clockRunning && view === 'play' && state.phase === 'case' && !paused && !dialog.open && !document.hidden) {
    clockStart = performance.now(); clockRunning = true;
  }
}
function savePreferences() {
  try { localStorage.setItem('closed-preferences-v2', JSON.stringify({ mode, sound })); } catch { /* Current run remains playable. */ }
}
function save() {
  saves[mode] = { game: state, elapsedMs: Math.round(currentElapsed()), sound };
  try {
    localStorage.setItem(storageKey(mode), JSON.stringify({ format: 2, game: serializeState(state), elapsedMs: Math.round(currentElapsed()), sound }));
    storageAvailable = true;
  } catch {
    if (storageAvailable) toast('Your browser cannot save this career. You can still play in this tab.');
    storageAvailable = false;
  }
  savePreferences();
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $('#toast').classList.remove('show'), 4200);
}
function updateHeader() {
  $('#sound-button').innerHTML = icon(sound ? 'sound' : 'mute');
  $('#sound-button').setAttribute('aria-label', sound ? 'Turn sound off' : 'Turn sound on');
  $('#sound-button').setAttribute('aria-pressed', String(sound));
  $('#pause-button').hidden = view !== 'play' || ['gameover', 'complete'].includes(state.phase);
  $('#pause-button').innerHTML = icon(paused ? 'play' : 'pause');
  $('#pause-button').setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
  document.body.dataset.view = view;
}
function renderWelcome() {
  freezeClock(); view = 'welcome'; paused = false;
  const express = saves.express;
  const full = saves.full;
  const resumeText = data => data ? `${data.game.phase === 'gameover' ? 'FIRED' : data.game.phase === 'complete' ? 'COMPLETED' : 'SAVED'} · ${escape(LEVELS[data.game.levelIndex].shortName)} · ${number(data.game.score)} PTS` : 'AUTOSAVES IN THIS BROWSER';
  main.innerHTML = `${!storageAvailable ? '<div class="storage-note">Browser storage is unavailable. You can play for as long as this tab stays open.</div>' : ''}
    <section class="welcome-hero" aria-labelledby="intro-title">
      <div class="welcome-copy"><div class="eyebrow"><span class="status-light"></span> NOW HIRING. CONSCIENCE OPTIONAL.</div>
        <h1 id="intro-title">Customer care.<br><span>Without the care.</span></h1>
        <p class="welcome-lead">Your parcel is missing.<br>Our employee is <em>getting promoted.</em></p>
        <p class="welcome-description">Clock in at Flipkart. Read the complaint. Send an outrageous excuse. Climb all the way to Walmart CEO. Try not to get caught being helpful.</p>
        <div class="hero-actions"><button class="primary-button" data-action="start-express">Clock in. Care less. ${icon('arrow')}</button><a href="#mode-title">Choose a game mode ↓</a></div><div class="welcome-badges"><span>${icon('mail')} ${number(CASES.length)} fictional cases</span><span>${icon('cup')} 7 ranks of nonsense</span></div>
      </div>
      <div class="welcome-art"><div class="art-caption"><span>MEET YOUR NEW COLLEAGUES</span><span>DESK 0042 ↙</span></div>${renderCrew()}<div class="speech-sticker">“Your concern is very<br>important to our queue.”</div><div class="art-footer">A company full of characters. None of them character references.</div></div>
    </section>
    <section class="mode-picker" aria-labelledby="mode-title"><div class="mode-heading"><h2 id="mode-title">How quickly would you like to fail upwards?</h2><span>NO SIGN-UP. JUST QUESTIONABLE JUDGEMENT.</span></div>
      <div class="mode-cards"><article class="mode-card express-mode"><div class="mode-icon">${icon('bolt')}</div><div class="mode-copy"><div class="eyebrow">THE LUNCH-BREAK TAKEOVER</div><h3>Express game <span>14 CASES</span></h3><p>Two cases. One promotion. From headset to private jet in seven wildly unearned steps.</p><small>${resumeText(express)}</small></div><button class="primary-button" data-action="start-express">${express ? 'Resume Express' : 'Play Express'} ${icon('arrow')}</button>${express ? '<button class="mode-restart" data-action="restart-express">New Express run</button>' : ''}</article>
      <article class="mode-card full-mode"><div class="mode-icon">${icon('badge')}</div><div class="mode-copy"><div class="eyebrow">THE LONG CORPORATE CON</div><h3>Full career <span>840 CASES</span></h3><p>Earn your promotions through points, closure targets, speed combos, and spectacular non-answers.</p><small>${resumeText(full)}</small></div><button class="secondary-button" data-action="start-full">${full ? 'Resume full career' : 'Start full career'} ${icon('arrow')}</button>${full ? '<button class="mode-restart" data-action="restart-full">New full career</button>' : ''}</article></div>
    </section>
    <div class="company-ticker"><strong>HR CIRCULAR / 0042</strong><p>Empathy is a fireable offence. The employee handbook has declined to elaborate.</p><button data-action="handbook">Read the rules ${icon('arrow')}</button></div>
    <section class="how-it-works" aria-label="How to play"><div><span>01</span><h3>They send a problem.</h3><p>Missing parcels. Phantom refunds. A toaster that is legally a hedge.</p></div><div><span>02</span><h3>You send an excuse.</h3><p>Pick a reply. The more ridiculous it is, the more management loves it.</p></div><div><span>03</span><h3>You get the corner office.</h3><p>Unless HR detects empathy. Then you get a cardboard box.</p></div></section>`;
  updateHeader();
}
function renderHud() {
  const heat = state.heat || 0;
  return `<section class="hud" aria-label="Career statistics">
    <div class="hud-stat"><span>${icon('spark')} CORPORATE APPROVAL</span><strong>${number(state.score)}<small>pts</small></strong></div>
    <div class="hud-stat"><span>${icon('stamp')} CASES CLOSED</span><strong>${number(state.closed)}<small>${number(state.helped)} helped</small></strong></div>
    <div class="hud-stat"><span>${icon('bolt')} SPEED COMBO</span><strong>×${state.multiplier}<small>${number(state.streak)} streak</small></strong></div>
    <div class="hud-stat heat-stat ${heat >= 60 ? 'heat-high' : ''}"><span>${icon('eye')} HR SUSPICION</span><div class="heat-value"><strong>${heat}<small>%</small></strong><span>${state.phase === 'gameover' ? 'EMPLOYMENT TERMINATED' : heat >= 100 ? 'REVIEW REQUIRED' : heat >= 60 ? 'UNDER OBSERVATION' : 'WATCHING. ALWAYS.'}</span></div><div class="heat-meter" role="meter" aria-label="HR suspicion" aria-valuenow="${heat}" aria-valuemin="0" aria-valuemax="100"><i style="width:${heat}%"></i></div></div>
  </section>`;
}
function renderPromotionTrack() {
  const progress = getPromotionProgress(state);
  const percent = Math.round(Math.min(1, Math.max(0, progress.progress)) * 100);
  const next = progress.nextLevel?.shortName || (state.won ? 'World domination achieved' : 'Global non-responsibility');
  return `<div class="promotion-track"><div class="tiny-heading">${progress.nextLevel ? 'NEXT UNDESERVED PROMOTION' : 'THE FINAL BOARD MEETING'}</div><strong>${escape(next)}</strong><div class="promotion-meter" role="progressbar" aria-label="Career progression" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${percent}%"></i></div><p>${state.mode === 'express' ? `${Math.min(2, state.levelHandled[state.levelIndex])} / 2 cases this rank` : progress.nextLevel ? `${number(progress.pointsNeeded)} pts · ${number(progress.casesNeeded)} closures to go` : state.won ? 'Endless excuses unlocked' : `${Math.min(20, state.levelHandled[6])} / 20 global cases`}</p><button data-action="career">View career ladder ${icon('arrow')}</button></div>`;
}
function renderSidebar(file) {
  const level = getLevel(state);
  return `<aside class="work-sidebar" aria-label="Your workstation"><div class="employee-card"><div class="employee-portrait">${renderAvatar(state.levelIndex)}</div><span class="online-dot"></span><div class="tiny-heading">EMPLOYEE 0042 · LVL ${state.levelIndex + 1}</div><h2>${escape(level.shortName || level.name)}</h2><span class="employee-status">${state.phase === 'review' ? 'SUMMONED TO HR' : 'AVAILABLE (TECHNICALLY)'}</span></div>
    <div class="mail-folders"><div class="folder active">${icon('inbox')} Inbox <b>1</b></div><button class="folder" data-action="history">${icon('stamp')} Closed <b>${number(state.closed)}</b></button><button class="folder" data-action="ledger">${icon('badge')} My record</button></div>
    ${renderPromotionTrack()}
    <div class="sidebar-memo"><span class="tiny-heading">PINNED BY MANAGEMENT</span><p>${escape(MEMOS[Math.floor(state.handled / 2) % MEMOS.length])}</p><span class="memo-signature">Regards, The System.</span></div>
    ${state.levelIndex === 6 ? '<button class="laugh-button" data-action="laugh">MUAHAHA. ↗</button>' : ''}
  </aside>`;
}
function renderCase(file) {
  const evidence = Array.isArray(file.evidence) ? file.evidence.join(' · ') : file.evidence;
  const ticket = String(state.phase === 'result' ? state.handled : state.handled + 1).padStart(5, '0');
  return `<div class="inbox-toolbar"><span>${icon('mail')} ${escape(getLevel(state).channel || 'CUSTOMER INBOX')}</span><div id="case-timer" class="case-timer"></div></div>
    <article class="customer-message" aria-labelledby="case-title"><div class="message-meta"><span>INC-${ticket}</span><span>${escape(file.tag || 'CUSTOMER COMPLAINT')}</span><span class="unread-dot">${state.phase === 'result' ? 'REPLIED' : 'NEW MESSAGE'}</span></div>
    <div class="customer-line"><div class="customer-avatar" aria-hidden="true">${escape(file.initials || file.customer?.slice(0, 2) || 'CC')}</div><div><strong>${escape(file.customer)}</strong><p>to ${state.levelIndex === 6 ? 'Walmart' : 'Flipkart'} customer care <span>· just now</span></p></div><span class="attachment-amount">${escape(file.amount || '')}</span></div>
    <h2 id="case-title" tabindex="-1">${escape(file.isCurated ? file.subject : file.title)}</h2><div class="message-bubble"><p>${escape(file.customerMessage || file.body)}</p><span class="message-tail" aria-hidden="true"></span></div>
    <details class="evidence"><summary>${icon('clip')} Evidence attached <span>OPEN FILE</span></summary><p><strong>${escape(file.orderId || 'ORDER RECORD')}</strong>${file.priorEscalations ? ` · ${file.priorEscalations} previous escalations` : ''}<br>${escape(evidence)}</p></details></article>`;
}
function renderChoices(file) {
  // Deliberately no kind, label, score, heat, or outcome hints in visible or accessible choices.
  return `<section class="reply-composer" aria-labelledby="decision-title"><div class="composer-heading"><h3 id="decision-title">Your official reply</h3><span><kbd>1</kbd>–<kbd>4</kbd> TO SEND</span></div><p class="composer-subtitle">Pick one. Management is pretending not to watch.</p><div class="choices">${file.choices.map((choice, index) => `<button class="choice" data-choice="${escape(choice.id)}" ${paused ? 'disabled' : ''}><span class="choice-key" aria-hidden="true">${index + 1}</span><span>${escape(choice.text)}</span>${icon('arrow')}</button>`).join('')}</div><div class="composer-footer"><span>${icon('eye')} Logged in as you. Unfortunately.</span><span>↵ SEND & CLOSE</span></div></section>`;
}
function renderResult() {
  const result = state.pendingResult;
  if (!result) return '';
  const selected = getCurrentCase(state)?.choices.find(choice => choice.id === result.choiceId);
  const helpful = result.kind === 'help';
  const achievements = getAchievements(state).filter(item => result.newAchievements?.includes(item.id));
  const label = state.pendingReview ? 'Report to HR' : result.promotedTo != null ? 'Accept promotion' : result.won ? 'Take over the world' : 'Next incoming complaint';
  return `<section id="result-panel" class="result-panel ${helpful ? 'helped' : ''}" aria-labelledby="result-title" tabindex="-1"><div class="sent-heading">${icon('mail')} YOUR REPLY HAS BEEN SENT <span>✓✓</span></div><p class="sent-message">${escape(selected?.text || result.reply)}</p>
    <div class="result-summary"><div><div class="rubber-stamp" id="result-title">${helpful ? 'CUSTOMER HELPED' : 'INCIDENT CLOSED'}</div><p>${helpful ? 'A dangerous precedent has been set.' : 'The problem remains. The spreadsheet looks wonderful.'}</p></div><strong class="points-change">${signed(result.points)}<small>APPROVAL</small></strong></div>
    <p class="result-outcome">${escape(result.reply)}</p>
    <div class="result-breakdown"><span>BASE ${signed(result.basePoints)}</span>${result.speedBonus ? `<span>SPEED ${signed(result.speedBonus)}</span>` : ''}${result.multiplier > 1 ? `<span>COMBO ×${result.multiplier}</span>` : ''}${result.directiveBonus ? `<span>MANAGEMENT ${signed(result.directiveBonus)}</span>` : ''}<span>HEAT ${signed(result.heatDelta)}%</span></div>
    ${state.pendingReview ? '<div class="hr-notice"><strong>HR HAS REQUESTED YOUR PRESENCE.</strong><p>Your alarming interest in customer outcomes has triggered a mandatory three-question review.</p></div>' : ''}
    ${result.hrCleared ? '<div class="clearance-notice"><strong>HR CLEARANCE GRANTED.</strong><p>No actionable evidence of compassion. Your suspicion meter has been reset. Please return to being part of the problem.</p></div>' : ''}
    ${result.promotedTo != null ? `<div class="promotion-notice">${icon('cup')} <span>Promotion approved: <strong>${escape(LEVELS[result.promotedTo].name)}</strong></span></div>` : ''}
    ${achievements.length ? `<p class="unlocks">${icon('spark')} ${achievements.map(item => escape(item.title)).join(' · ')}</p>` : ''}
    <button class="primary-button result-next" data-action="next" ${paused ? 'disabled' : ''}>${label} ${icon('arrow')}</button><p class="result-footnote">The clock is stopped. Take a moment to admire your work.</p></section>`;
}
function renderReview() {
  const question = getHRQuestion(state);
  if (!question) return '';
  const index = state.review.index;
  return `<section class="hr-review" aria-labelledby="hr-title"><div class="hr-letterhead"><span>CONFIDENTIAL / YOUR CAREER DEPENDS ON IT</span>${icon('eye')}</div><div class="hr-intro"><div class="hr-portrait">${renderHR()}</div><div><div class="eyebrow">DEPARTMENT OF HUMAN RESOURCES</div><h2 id="hr-title" tabindex="-1">A quick chat<br>about your <em>attitude.</em></h2><p>“This is a safe space. Everything you say will be used against you.”</p></div></div>
    <div class="hr-progress"><span>MANDATORY EMPATHY ASSESSMENT</span><strong>QUESTION ${index + 1} OF 3</strong><div>${[0, 1, 2].map(n => `<i class="${n < index ? 'done' : n === index ? 'current' : ''}"></i>`).join('')}</div></div>
    <h3 class="hr-question" tabindex="-1" id="hr-question">${escape(question.prompt)}</h3><div class="choices hr-choices">${question.choices.map((choice, n) => `<button class="choice" data-hr-choice="${escape(choice.id)}" ${paused ? 'disabled' : ''}><span class="choice-key" aria-hidden="true">${n + 1}</span><span>${escape(choice.text)}</span>${icon('arrow')}</button>`).join('')}</div>
    <p class="hr-fine-print">All three answers are recorded before HR makes its decision. There is no timer. There is also no appeal department.</p></section>`;
}
function renderTerminal() {
  const fired = state.phase === 'gameover';
  return `<section class="terminal-report ${fired ? 'fired-report' : 'victory-report'}" aria-labelledby="terminal-title"><div class="terminal-art">${fired ? renderHR() : renderOffice(6, 'laugh')}</div><div class="terminal-copy"><div class="eyebrow">${fired ? 'HR FILE / EMPLOYMENT CLOSED' : 'BOARD RESOLUTION / GLOBAL TAKEOVER'}</div><h2 id="terminal-title" tabindex="-1">${fired ? 'Fired.<br><em>For empathy.</em>' : 'CEO.<br><em>Of not our problem.</em>'}</h2><p class="terminal-lead">${fired ? 'You showed an interest in the customer receiving what they paid for. We simply cannot have that here.' : 'From Flipkart support to Walmart CEO. Your executive chair turns 360°. You can finally turn your back on everyone.'}</p><div class="terminal-stamp">${fired ? 'GAME OVER' : 'EXPRESS CAREER COMPLETE'}</div></div><div class="termination-letter"><span>OFFICIAL ${fired ? 'TERMINATION' : 'APPOINTMENT'} LETTER</span><p>${fired ? 'Dear Employee 0042,\n\nYour position has been made redundant by your conscience. Please return your headset, access card, and any remaining concern for human beings. Your exit interview has already been marked resolved.\n\nWarm regards (a template),\nHR' : 'Dear Chief Executive,\n\nThe board congratulates you on your extraordinary ability to turn customer distress into upward mobility. Please accept this global corporation. It was cheaper than processing the refunds.\n\nEntirely self-satisfied regards,\nThe Board'}</p></div>${renderReportStats()}<div class="terminal-actions"><button class="primary-button" data-action="share">${icon('share')} ${fired ? 'Share my termination' : 'Show off my promotion'}</button><button class="secondary-button" data-action="new-run">${fired ? 'Apply again. Learn nothing.' : 'Another hostile takeover'} ${icon('arrow')}</button><button class="text-button" data-action="home">Choose another mode</button>${!fired ? '<button class="text-button" data-action="laugh">MUAHAHA. (Tap to laugh.)</button>' : ''}</div><p class="terminal-footnote">${fired ? `${escape(getLevel(state).name)} · ${number(state.helped)} customers helped · ${state.reviewOutcome?.empathyCount || 0} empathetic HR answer${state.reviewOutcome?.empathyCount === 1 ? '' : 's'}` : 'Seven ranks. Fourteen cases. An entirely fictional corporate catastrophe.'}</p></section>`;
}
function renderReportStats() {
  return `<div class="report-stats"><div><strong>${number(state.score)}</strong><span>APPROVAL POINTS</span></div><div><strong>${number(state.closed)}</strong><span>CASES CLOSED</span></div><div><strong>${number(state.bestStreak)}</strong><span>BEST STREAK</span></div><div><strong>${state.levelIndex + 1}<small>/7</small></strong><span>CAREER RANK</span></div></div>`;
}
function renderGame({ focus = false } = {}) {
  view = 'play';
  const file = getCurrentCase(state);
  const terminal = ['gameover', 'complete'].includes(state.phase);
  const company = state.levelIndex === 6 ? 'WALMART' : 'FLIPKART';
  main.innerHTML = `${!storageAvailable ? '<div class="storage-note">This career cannot be saved in your browser. Keep this tab open to finish.</div>' : ''}
    <div class="desk-heading"><div><span class="eyebrow"><span class="status-light"></span> ${modeName(state.mode).toUpperCase()} / ${state.mode === 'express' ? `${Math.min(state.handled, 14)} OF 14 CASES` : `SHIFT ${String(state.shift).padStart(2, '0')}`}</span><h1>${state.phase === 'review' ? 'Management would like a word.' : terminal ? state.phase === 'gameover' ? 'Your concern has been escalated. To unemployment.' : 'The problem is now global.' : 'Welcome to your dream desk job.'}</h1></div><button class="desk-home" data-action="home">${icon('home')} Change mode</button></div>
    ${renderHud()}<div class="workstation ${paused ? 'is-paused' : ''}"><div class="monitor-bezel"><div class="monitor-camera" aria-hidden="true"></div><div class="monitor-screen"><div class="os-topbar"><div class="os-brand">${fkMark(state.levelIndex === 6 ? 'W' : 'FK')}<span>${company}<b>CARE OS</b></span><small>EMPLOYEE PORTAL</small></div><div class="os-status"><span class="connection-dot"></span>${state.phase === 'review' ? 'HR HAS ENTERED THE CHAT' : terminal ? 'SESSION ENDED' : 'CONNECTED TO THE PROBLEM'}<span class="window-controls" aria-hidden="true">— □ ×</span></div></div>
    <div class="work-window ${terminal ? 'terminal-window' : ''}">${!terminal ? renderSidebar(file) : ''}<div class="inbox-window">${state.phase === 'review' ? renderReview() : terminal ? renderTerminal() : `${renderCase(file)}${state.phase === 'result' ? renderResult() : renderChoices(file)}`}</div></div>
    <div class="os-bottom"><span>${icon('badge')} ${escape(getLevel(state).name)}</span><span>ALL SYSTEMS NOMINAL. CUSTOMERS DISAGREE.</span><span>${state.mode === 'express' ? 'EXPRESS' : 'FULL CAREER'} · LOCAL SAVE ${storageAvailable ? '✓' : 'OFF'}</span></div></div><div class="monitor-chin"><span>CLOSED<span class="yellow">.</span></span><span>PROPERTY OF ${company}. INCLUDING YOUR AFTERNOON.</span><i class="power-light"></i></div></div><div class="monitor-stand" aria-hidden="true"></div><div class="desk-accessories" aria-hidden="true"><span class="desk-note">REMINDER:<br><b>Close the ticket.<br>Not the loop.</b></span><div class="keyboard">${Array.from({ length: 40 }, (_, i) => `<i class="${i === 37 ? 'spacebar' : ''}"></i>`).join('')}</div><div class="chai-mug"><span>World’s<br>okayest<br>employee</span></div></div>
    ${paused ? '<div class="pause-overlay"><div><span class="eyebrow">OFFICIALLY ON A CHAI BREAK</span><h2>Please hold.</h2><p>Your timer is paused. The imaginary customer can wait.</p><button class="primary-button" data-action="pause">Back to being unavailable '+icon('play')+'</button><button class="text-button" data-action="home">Choose another mode</button></div></div>' : ''}</div>
    <div class="game-bottom"><span>${icon('memo')} ${escape(state.mode === 'express' ? EXPRESS_TIPS[state.handled % EXPRESS_TIPS.length] : TIPS[state.handled % TIPS.length])}</span><button data-action="share">${icon('share')} Challenge a friend</button></div>`;
  updateHeader(); updateTimer();
  if (focus) {
    const target = terminal ? $('#terminal-title') : state.phase === 'review' ? $('#hr-question') : state.phase === 'result' ? $('#result-panel') : $('#case-title');
    target?.focus({ preventScroll: true });
  }
  resumeClock();
}
function updateTimer() {
  const target = $('#case-timer');
  if (!target) return;
  const ms = state.phase === 'result' ? state.pendingResult.elapsedMs : currentElapsed();
  const total = Math.floor(ms / 1000);
  target.classList.toggle('slow', ms > 25_000);
  target.innerHTML = `${icon('clock')}<span>${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}</span><small>${paused ? 'PAUSED' : state.phase === 'result' ? 'FILED' : ms > 25_000 ? 'TAKE YOUR TIME' : 'ON THE CLOCK'}</small>`;
  target.setAttribute('aria-label', `Active case time: ${total} seconds${paused ? ', paused' : ''}`);
}
function start(selectedMode = mode) {
  freezeClock();
  mode = selectedMode;
  state = saves[mode]?.game || createState(challengeSeed || Date.now(), mode);
  elapsedMs = saves[mode]?.elapsedMs || 0;
  paused = false; pendingCelebrations = []; savedSecond = -1;
  setSound(sound); playSound('notification');
  renderGame({ focus: true }); save();
  if (window.innerWidth < 760) $('.monitor-screen')?.scrollIntoView({ behavior: motion(), block: 'start' });
  else window.scrollTo({ top: 0, behavior: 'instant' });
}
function choose(choiceId) {
  if (view !== 'play' || paused || dialog.open || state.phase !== 'case') return;
  freezeClock();
  const previous = state;
  state = resolveChoice(state, choiceId, elapsedMs);
  if (state === previous) { resumeClock(); return; }
  playSound(state.pendingReview ? 'hr' : state.pendingResult.kind === 'help' ? 'help' : 'stamp');
  save(); renderGame({ focus: true });
  $('#result-panel')?.scrollIntoView({ behavior: motion(), block: 'nearest' });
}
function hrAnswer(choiceId) {
  if (view !== 'play' || paused || dialog.open || state.phase !== 'review') return;
  const previous = state;
  state = answerHRQuestion(state, choiceId);
  if (state === previous) return;
  playSound(state.phase === 'gameover' ? 'fired' : state.phase === 'result' ? 'promotion' : 'click');
  save(); renderGame({ focus: true });
  if (state.phase === 'gameover') $('#terminal-title')?.scrollIntoView({ behavior: motion(), block: 'center' });
  else if (state.phase === 'result') $('#result-panel')?.scrollIntoView({ behavior: motion(), block: 'nearest' });
}
function advance() {
  freezeClock();
  state = advanceCase(state);
  elapsedMs = 0; savedSecond = -1;
  save(); playSound(state.phase === 'review' ? 'hr' : state.phase === 'complete' ? 'laugh' : 'notification');
  renderGame({ focus: true });
  if (state.phase === 'complete') confetti();
  const arrival = state.phase === 'complete' ? $('.workstation') : $('.inbox-window');
  arrival?.scrollIntoView({ behavior: motion(), block: 'start' });
}
function next() {
  if (paused || dialog.open || state.phase !== 'result') return;
  if (state.pendingReview) return advance();
  const result = state.pendingResult;
  pendingCelebrations = [];
  if (result.promotedTo != null) pendingCelebrations.push('promotion');
  if (result.won && state.mode === 'full') pendingCelebrations.push('win');
  if (result.shiftCompleted && state.mode === 'full') pendingCelebrations.push('debrief');
  continueCelebrations();
}
function continueCelebrations() {
  const kind = pendingCelebrations.shift();
  if (kind === 'promotion') return promotionModal();
  if (kind === 'win') return winModal();
  if (kind === 'debrief') return debriefModal();
  continueOnDialogClose = false;
  if (dialog.open) dialog.close();
  advance();
}
function openModal(title, label, body, options = {}) {
  freezeClock();
  continueOnDialogClose = options.celebration === true || (dialog.open && continueOnDialogClose);
  $('#dialog-content').innerHTML = `<div class="dialog-header"><div><div class="eyebrow">${escape(label)}</div><h2 id="dialog-title" tabindex="-1">${escape(title)}</h2></div><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div><div class="dialog-body">${body}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0; $('#dialog-title').focus({ preventScroll: true });
  if (options.sound) playSound(options.sound);
}
function handbookModal() {
  openModal('Please pretend to read this.', 'THE EMPLOYEE HANDBOOK', `<p>Your job is to make the dashboard look good. Customer happiness did not fit on the dashboard.</p><div class="handbook-grid"><section><span>01 / THE REPLY</span><h3>Read. Reply. Disappoint.</h3><p>Read each fictional complaint and choose one of four replies. No answer is labelled. You see the points and consequences only after sending it. The more ridiculous the excuse, the more approval it earns.</p></section><section><span>02 / THE COMBO</span><h3>Be efficiently useless.</h3><p>Close within 25 seconds to build a speed combo, up to ×3. Slower replies still earn their base points. The clock stops for results, pauses, dialogs, and hidden tabs.</p></section><section><span>03 / THE HEAT</span><h3>Competence is suspicious.</h3><p>Helping costs approval, breaks your combo, and adds HR suspicion. Excuses cool it. At 100%, HR asks three questions. An empathetic answer means you are fired after the assessment. No empathy detected? Your heat resets and you return to work.</p></section><section><span>04 / THE CAREER</span><h3>Pick your bad ambition.</h3><p><strong>Express:</strong> two handled cases per rank, 14 cases through all seven roles. Points determine your bragging rights. HR can still end the run. <strong>Full Career:</strong> meet both score and closure targets, with 120 cases per rank. Complete 20 Walmart cases to finish, then play endlessly.</p></section></div><p>The two modes have separate automatic saves. Your progress stays in this browser. Scores cannot fall below zero. A promotion does not protect you from HR.</p><div class="shortcut-row"><span><kbd>1</kbd>–<kbd>4</kbd> Reply</span><span><kbd>Enter</kbd> Continue</span><span><kbd>P</kbd> Pause</span><span><kbd>M</kbd> Sound</span><span><kbd>?</kbd> Rules</span></div><div class="dialog-actions"><button class="primary-button" data-action="close-modal">I understand the wrong priorities ${icon('arrow')}</button></div>`);
}
function careerModal() {
  openModal('The upward failure programme.', `${modeName(state.mode).toUpperCase()} / SEVEN CORPORATE RANKS`, `<p>${state.mode === 'express' ? 'Two cases at every rank. Fourteen cases to a global empire. Your score tells the world how impressively unhelpful you were.' : 'Meet both lifetime approval and closure targets to earn each promotion. Every rank has its own queue of 120 cases.'}</p><ol class="career-list">${LEVELS.map((level, i) => `<li class="${i <= state.levelIndex ? 'unlocked' : ''} ${i === state.levelIndex ? 'current' : ''}"><span>${i < state.levelIndex ? '✓' : String(i + 1).padStart(2, '0')}</span><div><h3>${escape(level.name)}</h3><p>${escape(level.motto)}</p><small>${state.mode === 'express' ? '2 CASES AT THIS RANK' : i === 0 ? 'QUALIFICATION: AN AVAILABLE CHAIR' : `${number(level.threshold)} PTS + ${number(level.quota)} TOTAL CLOSURES`}</small></div>${i === state.levelIndex ? '<b>YOU</b>' : ''}</li>`).join('')}</ol><button class="primary-button" data-action="close-modal">Back to the dream ${icon('arrow')}</button>`);
}
function ledgerModal(tab = 'achievements') {
  const achievements = getAchievements(state);
  const history = [...state.history].reverse();
  let body = `<div class="modal-tabs"><button class="${tab === 'achievements' ? 'active' : ''}" data-action="ledger">Achievements</button><button class="${tab === 'history' ? 'active' : ''}" data-action="history">Recent incidents</button></div>`;
  if (tab === 'achievements') body += `<div class="achievement-list">${achievements.map(item => `<div class="achievement-card ${item.unlocked ? 'unlocked' : ''}"><span>${item.unlocked ? '✓ UNLOCKED' : '○ NOT YET EARNED'}</span><h3>${escape(item.title)}</h3><p>${escape(item.description)}</p></div>`).join('')}</div>`;
  else body += history.length ? `<ol class="ledger-list">${history.map(item => `<li><div><strong>${escape(item.caseTitle)}</strong><span>${item.kind === 'help' ? 'CUSTOMER HELPED' : 'CASE CLOSED'} · ${(item.elapsedMs / 1000).toFixed(1)}s</span></div><b>${signed(item.points)} pts</b></li>`).join('')}</ol>` : '<p class="empty-state">A spotless record. Enjoy the next few seconds.</p>';
  body += '<div class="dialog-actions"><button class="secondary-button" data-action="reset">Start over in this mode</button><button class="primary-button" data-action="close-modal">Back to my desk</button></div>';
  openModal('Your permanent record.', `EMPLOYEE 0042 / ${modeName(state.mode).toUpperCase()}`, body);
}
function promotionModal() {
  const level = getLevel(state);
  confetti();
  openModal('Outstanding lack of service.', 'PROMOTION APPROVED', `<div class="promotion-celebration"><div class="promotion-art">${renderOffice(state.levelIndex, 'promotion')}</div><span class="eyebrow">YOUR NEW DESIGNATION</span><h3>${escape(level.name)}</h3><p>${escape(level.motto)}</p><p>${state.levelIndex === 6 ? 'Flipkart was merely a practice run. Walmart has heard about your ability to reduce complaints by reducing the definition of a complaint.' : 'Your talent for making the problem someone else’s problem has not gone unnoticed. A more expensive chair awaits.'}</p><div class="promotion-details"><span>RANK ${state.levelIndex + 1} / 7</span><span>${state.mode === 'express' ? 'NEXT: 2 MORE CASES' : '120 FRESH CASES'}</span></div><button class="primary-button" data-action="continue-celebrations">${state.levelIndex === 6 ? 'Assume global non-responsibility' : 'Accept my entirely earned promotion'} ${icon('arrow')}</button></div>`, { sound: 'promotion', celebration: true });
}
function debriefModal() {
  const report = getDebrief(state);
  openModal('Your performance review.', `SHIFT ${String(report.shift).padStart(2, '0')} / FILED`, `<div class="debrief-score"><strong>${escape(report.grade)}</strong><div><h3>${escape(report.title)}</h3><p>Measured exclusively by things that look good in spreadsheets.</p></div></div><div class="report-stats"><div><strong>${signed(report.points)}</strong><span>APPROVAL</span></div><div><strong>${number(report.closed)}</strong><span>CLOSED</span></div><div><strong>${number(report.helped)}</strong><span>HELPED</span></div></div><p>Average handling time: <strong>${(report.averageMs / 1000).toFixed(1)} seconds.</strong> ${report.helped ? 'HR has put a little star next to your name. It is not the good sort.' : 'No customers were helped in the making of this shift. Management is delighted.'}</p><button class="primary-button" data-action="continue-celebrations">Another productive non-event ${icon('arrow')}</button>`, { celebration: true });
}
function winModal() {
  confetti();
  openModal('Chief Executive of Not Our Problem.', 'FULL CAREER COMPLETE / ENDLESS PLAY UNLOCKED', `<div class="promotion-celebration">${renderOffice(6, 'laugh')}<p>Twenty global cases handled. A planet of problems successfully reclassified as somebody else’s. The board would shake your hand, but it is busy counting something.</p>${renderReportStats()}<div class="dialog-actions"><button class="secondary-button" data-action="share">${icon('share')} Share my corporate downfall upwards</button><button class="primary-button" data-action="continue-celebrations">Keep the empire disappointingly alive ${icon('arrow')}</button></div></div>`, { sound: 'laugh', celebration: true });
}
function home() {
  continueOnDialogClose = false;
  freezeClock(); if (view === 'play') save();
  if (dialog.open) dialog.close();
  pendingCelebrations = []; renderWelcome(); window.scrollTo({ top: 0, behavior: motion() });
}
function resetModal(selectedMode = mode) {
  requestedRestart = selectedMode;
  openModal('A fresh badge. The same bad instincts.', `NEW ${modeName(selectedMode).toUpperCase()} RUN`, `<p>This replaces your <strong>${modeName(selectedMode)}</strong> save with a new run from customer care. Your ${selectedMode === 'express' ? 'Full Career' : 'Express'} save stays exactly where you left it.</p><div class="dialog-actions"><button class="secondary-button" data-action="close-modal">Keep my current run</button><button class="primary-button" data-action="confirm-reset">Clock in from scratch ${icon('arrow')}</button></div>`);
}
function freshRun(selectedMode = mode) {
  continueOnDialogClose = false;
  freezeClock(); mode = selectedMode;
  saves[mode] = { game: createState(challengeSeed || Date.now(), mode), elapsedMs: 0, sound };
  if (dialog.open) dialog.close();
  start(mode); toast('New badge. Same questionable employer.');
}
function aboutModal() {
  openModal('An extremely unofficial career.', 'AN AVOID FLIPKART ORIGINAL', '<p><strong>CLOSED.</strong> is an independent satire of customer-service bureaucracy and backwards corporate incentives. All game customers, complaints, dialogue, offices and events are fictional.</p><p>Flipkart and Walmart are the subjects of the satire. This game is not affiliated with or endorsed by either company. Fictional game cases are separate from the original documented customer account.</p><p>No login, purchases, analytics, or AI calls during play. Saves stay in your browser. Share buttons open your share sheet or a post composer; you choose what to publish.</p><div class="dialog-actions"><a class="secondary-button" href="/">Read the original casebook ↗</a><button class="primary-button" data-action="close-modal">Back to the bureaucracy</button></div>');
}
function shareUrl() {
  const url = new URL('https://avoidflipkart.com/game/');
  url.searchParams.set('mode', state.mode);
  if (state.mode === 'express') url.searchParams.set('seed', state.seed);
  return url.toString();
}
function shareText() {
  if (state.phase === 'gameover') return `I got fired from FK customer care for showing empathy. ${number(state.closed)} cases closed. ${number(state.score)} approval points. Apparently listening was the problem. Can you survive?`;
  if (state.won) return `I went from FK customer care to Walmart CEO by being spectacularly unhelpful. ${number(state.score)} points. ${number(state.closed)} cases closed. Zero lessons learned. Beat my ${modeName(state.mode)} run.`;
  if (state.handled) return `I’m a ${getLevel(state).name} in CLOSED. ${number(state.score)} points for ${number(state.closed)} complaints closed. The problems are thriving. Can you fail upwards faster?`;
  return 'This game promotes you for ridiculous customer-care excuses and fires you for empathy. From FK support to Walmart CEO in 14 cases. Your lunch break has a villain arc.';
}
function shareModal() {
  const tweet = new URL('https://twitter.com/intent/tweet');
  tweet.searchParams.set('text', shareText()); tweet.searchParams.set('url', shareUrl());
  openModal(state.phase === 'gameover' ? 'Please circulate your termination.' : 'Make this someone else’s problem.', 'CHALLENGE A FRIEND', `<div class="share-preview"><span>CLOSED. / ${modeName(state.mode).toUpperCase()}</span><h3>${state.phase === 'gameover' ? 'FIRED FOR<br>EMPATHY.' : state.won ? 'PROMOTED FOR<br>NOTHING.' : 'YOUR CAREER.<br>THEIR PROBLEM.'}</h3><p>${number(state.score)} PTS · ${number(state.closed)} CASES CLOSED</p><small>avoidflipkart.com/game</small></div><p>${escape(shareText())}</p><div class="share-actions"><a class="primary-button" href="${escape(tweet.href)}" target="_blank" rel="noopener noreferrer">Post on X ${icon('arrow')}</a><button class="secondary-button" data-action="share-native">${icon('share')} Share…</button><button class="secondary-button" data-action="copy-share">Copy challenge</button><button class="secondary-button" data-action="download-card">${icon('download')} Save result image</button></div><p class="fine-print">${state.mode === 'express' ? 'Your friend gets the same curated cases. Reply choices are shuffled. Your score stays yours.' : 'Invite a friend into the full career. Their progress starts in their own browser.'}</p>`);
}
async function copyShare() {
  const text = `${shareText()}\n${shareUrl()}`;
  try { await navigator.clipboard.writeText(text); toast('Challenge copied. HR would prefer you did not circulate it.'); }
  catch { openModal('Your challenge, ready to copy.', 'CLIPBOARD UNAVAILABLE', `<label class="copy-label" for="share-copy">Select and copy this text</label><textarea id="share-copy" readonly rows="6">${escape(text)}</textarea><button class="primary-button" data-action="close-modal">Done</button>`); $('#share-copy').select(); }
}
async function nativeShare() {
  if (!navigator.share) return copyShare();
  try { await navigator.share({ title: 'CLOSED. — Your career. Their problem.', text: shareText(), url: shareUrl() }); }
  catch (error) { if (error.name !== 'AbortError') await copyShare(); }
}
async function downloadCard() {
  const report = { phase: state.phase, won: state.won, score: state.score, closed: state.closed, levelIndex: state.levelIndex, mode: state.mode };
  const portraitReady = new Promise(resolve => {
    const image = new Image();
    const finish = result => { clearTimeout(timeout); image.onload = null; image.onerror = null; resolve(result); };
    const timeout = setTimeout(() => finish(null), 2500);
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = new URL('./assets/closed-office-crew.webp', import.meta.url).href;
  });
  const [portrait] = await Promise.all([portraitReady, document.fonts.ready]);
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return toast('The image could not be created. Copy your challenge instead.');
  ctx.fillStyle = '#082442'; ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = '#0b3158'; for (let x = 0; x < 1200; x += 48) ctx.fillRect(x, 0, 1, 630); for (let y = 0; y < 630; y += 48) ctx.fillRect(0, y, 1200, 1);
  ctx.fillStyle = '#ffc62c'; ctx.fillRect(48, 45, 92, 86);
  ctx.fillStyle = '#082442'; ctx.font = '900 45px Murecho, sans-serif'; ctx.fillText('FK', 64, 104);
  ctx.fillStyle = '#edf8fc'; ctx.font = '700 32px Chakra, sans-serif'; ctx.fillText('CLOSED. / CAREER REPORT', 164, 83);
  ctx.fillStyle = '#a7c7dc'; ctx.font = '500 21px Chakra, sans-serif'; ctx.fillText(`${modeName(report.mode).toUpperCase()} · EMPLOYEE 0042`, 166, 117);
  const fired = report.phase === 'gameover';
  const headline = fired ? ['FIRED FOR', 'EMPATHY.'] : report.won ? ['PROMOTED FOR', 'NOTHING.'] : ['YOUR CAREER.', 'THEIR PROBLEM.'];
  let headlineSize = 80;
  ctx.font = `900 ${headlineSize}px Murecho, sans-serif`;
  while (headlineSize > 32 && headline.some(line => ctx.measureText(line).width > 800)) {
    headlineSize -= 1; ctx.font = `900 ${headlineSize}px Murecho, sans-serif`;
  }
  ctx.fillStyle = '#edf8fc'; ctx.fillText(headline[0], 52, 250); ctx.fillStyle = '#ffc62c'; ctx.fillText(headline[1], 52, 353);

  // Crop the same original cast used by the game; the frame ends above the statistics.
  const centerX = 1010, centerY = 258, radius = 128;
  ctx.beginPath(); ctx.arc(centerX, centerY, 136, 0, Math.PI * 2); ctx.fillStyle = '#ffc62c'; ctx.fill();
  ctx.beginPath(); ctx.arc(centerX, centerY, 131, 0, Math.PI * 2); ctx.fillStyle = '#071a2d'; ctx.fill();
  let portraitDrawn = false;
  if (portrait) {
    const [cropX, cropY, cropSize] = fired ? [115, 80, 390] : report.won ? [990, 145, 400] : [475, 35, 500];
    const scaleX = portrait.naturalWidth / 1536, scaleY = portrait.naturalHeight / 1024;
    ctx.save(); ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.clip();
    try {
      ctx.drawImage(portrait, cropX * scaleX, cropY * scaleY, cropSize * scaleX, cropSize * scaleY, centerX - radius, centerY - radius, radius * 2, radius * 2);
      portraitDrawn = true;
    } catch { /* The report still downloads when the optional illustration cannot be drawn. */ }
    ctx.restore();
  }
  if (!portraitDrawn) {
    ctx.fillStyle = '#ffc62c'; ctx.font = '900 64px Murecho, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fired ? 'HR' : report.won ? 'CEO' : 'FK', centerX, centerY);
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  }

  ctx.fillStyle = '#edf8fc'; ctx.font = '600 30px Murecho, sans-serif'; ctx.fillText(`${number(report.score)} POINTS     ${number(report.closed)} CASES CLOSED     RANK ${report.levelIndex + 1}/7`, 57, 430);
  ctx.fillStyle = '#a7c7dc'; ctx.font = '400 23px Murecho, sans-serif'; ctx.fillText(fired ? 'Customer care caught me caring. Management took it personally.' : 'An extraordinary career in making things somebody else’s problem.', 57, 482);
  ctx.fillStyle = '#ffc62c'; ctx.fillRect(0, 545, 1200, 85); ctx.fillStyle = '#082442'; ctx.font = '700 27px Chakra, sans-serif'; ctx.fillText('CAN YOU FAIL UPWARDS FASTER?  →  avoidflipkart.com/game', 57, 596);
  canvas.toBlob(blob => {
    if (!blob) return toast('The image could not be created. Copy your challenge instead.');
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `closed-${fired ? 'fired-for-empathy' : 'career-report'}.png`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30_000); toast('Your report is ready. Attach it to your post for maximum corporate embarrassment.');
  }, 'image/png');
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const container = document.createElement('div'); container.className = 'confetti'; container.setAttribute('aria-hidden', 'true');
  container.innerHTML = Array.from({ length: 32 }, (_, i) => `<i style="left:${(i * 47) % 100}%;animation-delay:${(i % 9) * .07}s;transform:rotate(${i * 23}deg)"></i>`).join('');
  document.body.append(container); setTimeout(() => container.remove(), 3500);
}
function togglePause() {
  if (view !== 'play' || dialog.open || ['gameover', 'complete'].includes(state.phase)) return;
  freezeClock(); paused = !paused; renderGame(); save();
}
function toggleSound() {
  sound = !sound; setSound(sound); updateHeader(); playSound('click'); savePreferences();
  if (view === 'play') save();
  toast(sound ? 'Sound on. Your incompetence now has a soundtrack.' : 'Sound off. Customer disappointment remains implied.');
}
function laugh() {
  if (state.levelIndex !== 6) return;
  if (!sound) { sound = true; setSound(true); updateHeader(); savePreferences(); }
  playSound('laugh');
  const target = $('.workstation'); if (target) { target.classList.remove('evil-laugh'); void target.offsetWidth; target.classList.add('evil-laugh'); }
  toast('MUAHAHA. Your laugh has been expensed to customer experience.');
}
const actions = {
  'start-express': () => start('express'), 'start-full': () => start('full'),
  'restart-express': () => resetModal('express'), 'restart-full': () => resetModal('full'),
  next, home, career: careerModal, handbook: handbookModal, ledger: () => ledgerModal(), history: () => ledgerModal('history'), about: aboutModal,
  pause: togglePause, sound: toggleSound, laugh, reset: () => resetModal(mode),
  'close-modal': () => dialog.close(), 'continue-celebrations': continueCelebrations,
  'confirm-reset': () => freshRun(requestedRestart || mode), 'new-run': () => freshRun(mode),
  share: shareModal, 'copy-share': copyShare, 'share-native': nativeShare, 'download-card': downloadCard,
};
document.addEventListener('click', event => {
  const choice = event.target.closest('[data-choice]'); if (choice) return choose(choice.dataset.choice);
  const hrChoice = event.target.closest('[data-hr-choice]'); if (hrChoice) return hrAnswer(hrChoice.dataset.hrChoice);
  const target = event.target.closest('[data-action]'); if (target) actions[target.dataset.action]?.();
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.target.matches('input, textarea, select') || event.target.isContentEditable) return;
  if (dialog.open) return;
  const key = event.key.toLowerCase();
  if (key === 'm') { event.preventDefault(); return toggleSound(); }
  if (key === '?') { event.preventDefault(); return handbookModal(); }
  if (view !== 'play') return;
  if (key === 'p') { event.preventDefault(); return togglePause(); }
  if (paused) return;
  if (/^[1-4]$/.test(key) && state.phase === 'case') { event.preventDefault(); const choice = getCurrentCase(state).choices[Number(key) - 1]; if (choice) choose(choice.id); }
  if (/^[1-3]$/.test(key) && state.phase === 'review') { event.preventDefault(); const choice = getHRQuestion(state).choices[Number(key) - 1]; if (choice) hrAnswer(choice.id); }
  if (key === 'enter' && state.phase === 'result' && !event.target.closest('button, a, summary')) { event.preventDefault(); next(); }
});
dialog.addEventListener('close', () => {
  if (continueOnDialogClose) { continueOnDialogClose = false; continueCelebrations(); return; }
  resumeClock(); if (view === 'play') save();
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && view === 'play') {
    freezeClock();
    if (!['gameover', 'complete'].includes(state.phase)) paused = true;
    save(); renderGame();
  }
});
window.addEventListener('pagehide', () => { freezeClock(); if (view === 'play') save(); });
setInterval(() => {
  if (view !== 'play') return;
  updateTimer();
  const second = Math.floor(currentElapsed() / 1000);
  if (clockRunning && second !== savedSecond) { savedSecond = second; save(); }
}, 250);
renderWelcome();
if (unreadableSave) toast('An older save could not be read. Other saved modes are still available.');
