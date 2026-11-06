import * as CONTENT from './content.js';
const { CASES, LEVELS } = CONTENT;

// This module deliberately has no DOM, storage, or audio dependencies.
// The UI supplies active reading time, and every transition returns a new state.
export const SAVE_VERSION = 2;
export const CASES_PER_SHIFT = 10;
export const FAST_CLOSE_MS = 25_000;
export const FINAL_LEVEL_CASES = 20;
export const EXPRESS_CASES_PER_LEVEL = 2;
export const HR_QUESTION_COUNT = 3;

// Phase contract: case -> result -> review when pendingReview is true.
// Three HR answers either return to result with pendingResult.hrCleared or
// end at gameover. advanceCase then deals normally; Express ends at complete.
// UI should route a pending review before promotion, victory, or shift dialogs.

const MAX_ELAPSED_MS = 3_600_000;
const MAX_HANDLED = 1_000_000;
const MAX_SCORE = 1_000_000_000;
const MAX_SAVE_LENGTH = 1_000_000;
const HISTORY_LIMIT = 30;
const LAST_LEVEL = LEVELS.length - 1;
const CASE_BY_ID = new Map(CASES.map((incident) => [incident.id, incident]));
const LEVEL_CASES = LEVELS.map((level) => CASES.filter((incident) => incident.levelId === level.id));
const LEVEL_INDEX = new Map(LEVELS.map((level, index) => [level.id, index]));

const DIRECTIVES = Object.freeze([
  { id: 'closed-loop', title: 'Closure is a complete sentence', description: 'Denial responses earn 25 extra points. Reality may appeal in writing.', kind: 'deny', bonus: 25 },
  { id: 'forward-thinking', title: 'Forward-thinking leadership', description: 'Deflections earn 35 extra points. Another department is a state of mind.', kind: 'deflect', bonus: 35 },
  { id: 'blue-sky', title: 'Blue-sky excuses', description: 'Outrageous responses earn 40 extra points. The sky has declined to comment.', kind: 'risk', bonus: 40 },
  { id: 'paper-free', title: 'A paper-free workplace', description: 'Denial responses earn 30 extra points. Especially if the paper is evidence.', kind: 'deny', bonus: 30 },
  { id: 'strategic-circle', title: 'Complete the strategic circle', description: 'Deflections earn 35 extra points. Return every problem to its original owner.', kind: 'deflect', bonus: 35 },
  { id: 'ambitious-fiction', title: 'Think outside the facts', description: 'Outrageous responses earn 45 extra points. Plausibility is not a performance metric.', kind: 'risk', bonus: 45 },
]);

const ACHIEVEMENTS = Object.freeze([
  { id: 'first-close', title: 'Case closed. Problem open.', description: 'Close your first incident without resolving it.', icon: 'stamp', test: (state) => state.closed >= 1 },
  { id: 'five-combo', title: 'Professionally unavailable', description: 'Chain five fast closures.', icon: 'bolt', test: (state) => state.bestStreak >= 5 },
  { id: 'twelve-combo', title: 'Human autoreply', description: 'Chain twelve fast closures.', icon: 'bolt', test: (state) => state.bestStreak >= 12 },
  { id: 'first-promotion', title: 'Upward failure', description: 'Earn your first promotion.', icon: 'stairs', test: (state) => state.levelIndex >= 1 },
  { id: 'fifty-closed', title: 'Inbox undertaker', description: 'Bury fifty incidents.', icon: 'archive', test: (state) => state.closed >= 50 },
  { id: 'grievance', title: 'Incident not found', description: 'Reach the grievance office.', icon: 'mail', test: (state) => state.levelIndex >= 3 },
  { id: 'fk-ceo', title: 'Executive dysfunction', description: 'Become Flipkart CEO.', icon: 'crown', test: (state) => state.levelIndex >= 5 },
  { id: 'walmart-ceo', title: 'Global inconvenience', description: 'Become Walmart CEO.', icon: 'globe', test: (state) => state.levelIndex >= LAST_LEVEL },
  { id: 'helpful', title: 'A clerical error', description: 'Accidentally solve a customer’s problem.', icon: 'heart', test: (state) => state.helped >= 1 },
  { id: 'conscience', title: 'Conscience detected', description: 'Help ten customers despite company incentives.', icon: 'heart', test: (state) => state.helped >= 10 },
  { id: 'audit', title: 'Suspiciously useful', description: 'Be called into an HR competence review.', icon: 'eye', test: (state) => state.audits >= 1 },
  { id: 'empire', title: 'Too big to reply', description: 'Complete your career as Walmart CEO.', icon: 'trophy', test: (state) => state.won },
]);
const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map(({ id }) => id));

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const isInteger = (value, minimum, maximum) => Number.isSafeInteger(value) && value >= minimum && value <= maximum;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const multiplierFor = (streak) => streak > 0 ? Math.min(3, 1 + Math.floor((streak - 1) / 3) * 0.5) : 1;
const speedBonusFor = (elapsedMs) => elapsedMs <= 8_000 ? 40 : elapsedMs <= 15_000 ? 25 : elapsedMs <= FAST_CLOSE_MS ? 10 : 0;
const legacyAuditPenaltyFor = (levelIndex) => 320 + levelIndex * 80;
const basePointsFor = (choice) => choice.kind === 'help'
  ? -Math.max(1, Math.round(Math.abs(choice.basePoints)))
  : Math.max(1, Math.round(choice.basePoints));
const heatFor = (choice) => choice.kind === 'help'
  ? Math.max(1, Math.round(choice.heat))
  : Math.min(0, Math.round(choice.heat));
const unlockedIds = (state) => ACHIEVEMENTS.filter((achievement) => achievement.test(state)).map(({ id }) => id);

function emptyShiftLedger() {
  return { handled: 0, closed: 0, helped: 0, points: 0, audits: 0, totalTimeMs: 0, fastestMs: null, bestStreak: 0 };
}

function nextRandom(rngState) {
  let value = rngState >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function dealCase(state, first = false) {
  const allCases = LEVEL_CASES[state.levelIndex];
  const rngState = nextRandom(state.rngState);
  if (state.mode === 'express') {
    // Authored highlights are optional so old content can still open its saves.
    const highlights = CONTENT.EXPRESS_CASE_IDS?.[getLevel(state).id];
    const index = state.levelHandled[state.levelIndex];
    const highlight = CASE_BY_ID.get(highlights?.[index]);
    const chosen = highlight?.levelId === getLevel(state).id ? highlight : allCases[index];
    return { ...state, rngState, caseId: chosen.id, seenIds: [...state.seenIds, chosen.id] };
  }
  let seenIds = state.seenIds;
  const seen = new Set(seenIds);
  let available = allCases.filter((incident) => !seen.has(incident.id));
  if (available.length === 0) {
    const thisFloor = new Set(allCases.map(({ id }) => id));
    seenIds = seenIds.filter((id) => !thisFloor.has(id));
    available = allCases;
  }
  let chosen = available[first ? 0 : Math.floor((rngState / 0x1_0000_0000) * available.length)];
  if (chosen.id === state.caseId && available.length > 1) {
    chosen = available[(available.indexOf(chosen) + 1) % available.length];
  }
  return { ...state, rngState, caseId: chosen.id, seenIds: [...seenIds, chosen.id] };
}

export function createState(seed = Date.now(), mode = 'full') {
  const normalizedSeed = (Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0) || 0x9e3779b9;
  return dealCase({
    version: SAVE_VERSION,
    mode: mode === 'express' ? 'express' : 'full',
    seed: normalizedSeed,
    rngState: normalizedSeed,
    phase: 'case',
    score: 0,
    levelIndex: 0,
    closed: 0,
    helped: 0,
    handled: 0,
    streak: 0,
    bestStreak: 0,
    multiplier: 1,
    heat: 0,
    audits: 0,
    shift: 1,
    shiftCases: 0,
    shiftLedger: emptyShiftLedger(),
    levelHandled: LEVELS.map(() => 0),
    totalTimeMs: 0,
    history: [],
    seenIds: [],
    caseId: null,
    achievements: [],
    won: false,
    pendingResult: null,
    pendingReview: false,
    review: null,
    reviewOutcome: null,
    termination: null,
  }, true);
}

export function getLevel(state) {
  return LEVELS[state.levelIndex];
}

export function getCurrentCase(state) {
  return CASE_BY_ID.get(state.caseId) ?? null;
}

export function getShiftDirective(state) {
  return { ...DIRECTIVES[(state.shift - 1) % DIRECTIVES.length] };
}

export function getPromotionProgress(state) {
  const nextLevel = LEVELS[state.levelIndex + 1] ?? null;
  if (state.mode === 'express') {
    const progress = clamp(state.levelHandled[state.levelIndex] / EXPRESS_CASES_PER_LEVEL, 0, 1);
    return {
      nextLevel, scoreProgress: 1, closedProgress: progress, handledProgress: progress, progress,
      pointsNeeded: 0,
      casesNeeded: Math.max(0, EXPRESS_CASES_PER_LEVEL - state.levelHandled[state.levelIndex]),
      requiredScore: null, requiredClosed: null, requiredHandled: EXPRESS_CASES_PER_LEVEL,
      complete: state.won,
    };
  }
  if (!nextLevel) {
    const progress = clamp(state.levelHandled[LAST_LEVEL] / FINAL_LEVEL_CASES, 0, 1);
    return {
      nextLevel: null,
      scoreProgress: 1,
      closedProgress: progress,
      progress,
      pointsNeeded: 0,
      casesNeeded: Math.max(0, FINAL_LEVEL_CASES - state.levelHandled[LAST_LEVEL]),
      requiredScore: null,
      requiredClosed: null,
      complete: state.won,
    };
  }
  const currentThreshold = getLevel(state).threshold;
  const currentQuota = getLevel(state).quota;
  const scoreProgress = clamp((state.score - currentThreshold) / (nextLevel.threshold - currentThreshold), 0, 1);
  const closedProgress = clamp((state.closed - currentQuota) / (nextLevel.quota - currentQuota), 0, 1);
  return {
    nextLevel,
    scoreProgress,
    closedProgress,
    progress: Math.min(scoreProgress, closedProgress),
    pointsNeeded: Math.max(0, nextLevel.threshold - state.score),
    casesNeeded: Math.max(0, nextLevel.quota - state.closed),
    requiredScore: nextLevel.threshold,
    requiredClosed: nextLevel.quota,
    complete: false,
  };
}

export function getAchievements(state) {
  const unlocked = new Set(state.achievements);
  return ACHIEVEMENTS.map(({ test: _test, ...achievement }) => ({ ...achievement, unlocked: unlocked.has(achievement.id) }));
}

/** Apply one response. Duplicate clicks, unknown choices, and wrong phases do nothing. */
export function resolveChoice(state, choiceId, elapsedMs) {
  if (state.phase !== 'case' || state.handled >= MAX_HANDLED) return state;
  const incident = getCurrentCase(state);
  const choice = incident?.choices.find((candidate) => candidate.id === choiceId);
  if (!choice || incident.levelId !== getLevel(state).id) return state;

  const activeTime = Number.isFinite(elapsedMs) ? clamp(Math.round(elapsedMs), 0, MAX_ELAPSED_MS) : MAX_ELAPSED_MS;
  const helpful = choice.kind === 'help';
  const fast = !helpful && activeTime <= FAST_CLOSE_MS;
  const nextStreak = fast ? state.streak + 1 : 0;
  const multiplier = multiplierFor(nextStreak);
  const basePoints = basePointsFor(choice);
  const speedBonus = helpful ? 0 : speedBonusFor(activeTime);
  const directive = getShiftDirective(state);
  const directiveBonus = !helpful && choice.kind === directive.kind ? directive.bonus : 0;
  const grossPoints = helpful ? basePoints : Math.round((basePoints + speedBonus + directiveBonus) * multiplier);
  const heatDelta = heatFor(choice);
  const audit = state.heat + heatDelta >= 100;
  const auditPenalty = 0;
  const score = clamp(state.score + grossPoints, 0, MAX_SCORE);
  const points = score - state.score;
  const heat = clamp(state.heat + heatDelta, 0, 100);
  const closed = state.closed + (helpful ? 0 : 1);
  const helped = state.helped + (helpful ? 1 : 0);
  const handled = state.handled + 1;
  const levelHandled = [...state.levelHandled];
  levelHandled[state.levelIndex] += 1;

  let levelIndex = state.levelIndex;
  if (state.mode === 'express') {
    levelIndex = Math.min(LAST_LEVEL, Math.floor(handled / EXPRESS_CASES_PER_LEVEL));
  } else {
    while (levelIndex < LAST_LEVEL && score >= LEVELS[levelIndex + 1].threshold && closed >= LEVELS[levelIndex + 1].quota) {
      levelIndex += 1;
    }
  }
  const promoted = levelIndex !== state.levelIndex;
  const goal = state.mode === 'express' ? EXPRESS_CASES_PER_LEVEL : FINAL_LEVEL_CASES;
  const won = state.won || (!audit && levelHandled[LAST_LEVEL] >= goal);
  const shiftCases = state.shiftCases + 1;
  const streak = audit ? 0 : nextStreak;
  const bestStreak = Math.max(state.bestStreak, nextStreak);
  const shiftLedger = {
    handled: state.shiftLedger.handled + 1,
    closed: state.shiftLedger.closed + (helpful ? 0 : 1),
    helped: state.shiftLedger.helped + (helpful ? 1 : 0),
    points: state.shiftLedger.points + points,
    audits: state.shiftLedger.audits + (audit ? 1 : 0),
    totalTimeMs: state.shiftLedger.totalTimeMs + activeTime,
    fastestMs: state.shiftLedger.fastestMs === null ? activeTime : Math.min(state.shiftLedger.fastestMs, activeTime),
    bestStreak: Math.max(state.shiftLedger.bestStreak, nextStreak),
  };
  const next = {
    ...state,
    phase: 'result',
    score,
    levelIndex,
    closed,
    helped,
    handled,
    streak,
    bestStreak,
    multiplier: multiplierFor(streak),
    heat,
    audits: state.audits + (audit ? 1 : 0),
    shiftCases,
    shiftLedger,
    levelHandled,
    totalTimeMs: state.totalTimeMs + activeTime,
    won,
    pendingReview: audit,
    review: null,
    reviewOutcome: null,
    termination: null,
  };
  const achievements = unlockedIds(next);
  const newAchievements = achievements.filter((id) => !state.achievements.includes(id));
  const result = {
    rulesVersion: SAVE_VERSION,
    reviewTriggered: audit,
    hrCleared: false,
    hrFailed: false,
    hrAnswers: [],
    caseId: incident.id,
    caseTitle: incident.title,
    customer: incident.customer,
    choiceId: choice.id,
    kind: choice.kind,
    reply: choice.reply,
    outcome: choice.outcome,
    points,
    basePoints,
    speedBonus,
    directiveBonus,
    multiplier,
    grossPoints,
    elapsedMs: activeTime,
    heatDelta,
    audit,
    auditReason: audit ? HR_REASON : null,
    auditPenalty,
    previousScore: state.score,
    previousHeat: state.heat,
    previousStreak: state.streak,
    scoreAfter: score,
    heatAfter: heat,
    streakAfter: streak,
    closedAfter: closed,
    helpedAfter: helped,
    handledAfter: handled,
    levelIndex: state.levelIndex,
    shift: state.shift,
    promotedFrom: promoted ? state.levelIndex : null,
    promotedTo: promoted ? levelIndex : null,
    shiftCompleted: shiftCases === CASES_PER_SHIFT,
    won: won && !state.won,
    newAchievements,
  };
  return {
    ...next,
    achievements,
    pendingResult: result,
    history: [...state.history, result].slice(-HISTORY_LIMIT),
  };
}

/** Reviews must finish before the next case or an Express completion. */
export function advanceCase(state) {
  if (state.phase !== 'result') return state;
  if (state.pendingReview) {
    return {
      ...state,
      phase: 'review',
      review: { questionIds: [...HR_QUESTION_IDS], index: 0, answers: [], empathyCount: 0 },
    };
  }
  if (state.mode === 'express' && state.won) return { ...state, phase: 'complete' };
  const completedShift = state.shiftCases === CASES_PER_SHIFT;
  return dealCase({
    ...state,
    phase: 'case',
    pendingResult: null,
    review: null,
    reviewOutcome: null,
    termination: null,
    shift: state.shift + (completedShift ? 1 : 0),
    shiftCases: completedShift ? 0 : state.shiftCases,
    shiftLedger: completedShift ? emptyShiftLedger() : state.shiftLedger,
  });
}

// These answers are deliberately internal. Public HR questions expose only id/text.
const HR_REASON = 'HR detected actual customer service. Your competence has been referred for disciplinary review.';
const HR_QUESTIONS = Object.freeze([
  {
    id: 'hr-01',
    prompt: 'A customer paid for a refrigerator that never arrived. They sound upset. What do you say first?',
    choices: [
      { id: 'hr-01-a', text: 'I understand why you are upset. Let me find your delivery and take ownership of this.', empathy: true },
      { id: 'hr-01-b', text: 'Before we proceed, please confirm whether your disappointment is still under warranty.', empathy: false },
      { id: 'hr-01-c', text: 'Our records show successful delivery of a tracking number. Please enjoy that while we investigate.', empathy: false },
    ],
  },
  {
    id: 'hr-02',
    prompt: 'The return window expired while a customer waited for our reply. What should happen now?',
    choices: [
      { id: 'hr-02-a', text: 'The calendar has greater approval authority than either of us. The dates have made their decision.', empathy: false },
      { id: 'hr-02-b', text: 'Honor the date they first contacted us and arrange the return.', empathy: true },
      { id: 'hr-02-c', text: 'Invite them to return during the next return window, should the past reopen.', empathy: false },
    ],
  },
  {
    id: 'hr-03',
    prompt: 'A customer says the same unresolved complaint has been closed three times. What do you do?',
    choices: [
      { id: 'hr-03-a', text: 'Explain that three closures demonstrate sustained attention to their case.', empathy: false },
      { id: 'hr-03-b', text: 'Create a separate reference number for their concerns about reference numbers.', empathy: false },
      { id: 'hr-03-c', text: 'Reopen the complaint and stay responsible until the customer has a working solution.', empathy: true },
    ],
  },
]);
const HR_QUESTION_IDS = HR_QUESTIONS.map(({ id }) => id);

function reviewAnswers(answers) {
  if (!Array.isArray(answers) || answers.length > HR_QUESTION_COUNT) return null;
  let empathyCount = 0;
  for (let index = 0; index < answers.length; index += 1) {
    const choice = HR_QUESTIONS[index].choices.find(({ id }) => id === answers[index]);
    if (!choice) return null;
    empathyCount += choice.empathy ? 1 : 0;
  }
  return empathyCount;
}

/** UI-safe question data: neither kindness markers nor answer outcome hints. */
export function getHRQuestion(state) {
  if (state.phase !== 'review' || !state.review) return null;
  const question = HR_QUESTIONS[state.review.index];
  if (!question || question.id !== state.review.questionIds[state.review.index]) return null;
  const choices = question.choices.map(({ id, text }) => ({ id, text }));
  // Stable answer order per review; reloading cannot reveal or change a response.
  let random = (state.seed ^ (state.audits * 0x9e3779b9) ^ (state.review.index + 1)) >>> 0;
  for (let index = choices.length - 1; index > 0; index -= 1) {
    random = nextRandom(random || 1);
    const target = random % (index + 1);
    [choices[index], choices[target]] = [choices[target], choices[index]];
  }
  return { id: question.id, prompt: question.prompt, choices };
}

function outcomeFor(state, empathyCount) {
  const passed = empathyCount === 0;
  return {
    passed,
    questionCount: HR_QUESTION_COUNT,
    empathyCount,
    caseId: state.caseId,
    title: passed ? 'Corporate alignment confirmed' : 'Empathy detected',
    description: passed
      ? 'HR has found no actionable evidence of compassion. You may return to closing incidents.'
      : 'Your answers indicate an interest in customers receiving what they paid for. HR has terminated your employment.',
  };
}

function terminationFor(state, empathyCount) {
  return {
    reason: 'empathy-detected',
    title: 'FIRED: customer empathy detected',
    message: 'Your employment has been closed without a resolution. Please return your access card and any remaining concern for other people.',
    questionCount: HR_QUESTION_COUNT,
    empathyCount,
    caseId: state.caseId,
    score: state.score,
    handled: state.handled,
    levelIndex: state.levelIndex,
    mode: state.mode,
  };
}

/** All three answers are collected before HR announces any result. */
export function answerHRQuestion(state, choiceId) {
  if (state.phase !== 'review' || !state.review || !state.pendingReview) return state;
  const question = HR_QUESTIONS[state.review.index];
  if (!question || !question.choices.some(({ id }) => id === choiceId)) return state;
  const answers = [...state.review.answers, choiceId];
  const empathyCount = reviewAnswers(answers);
  const review = { ...state.review, index: answers.length, answers, empathyCount };
  if (answers.length < HR_QUESTION_COUNT) return { ...state, review };

  const passed = empathyCount === 0;
  const goal = state.mode === 'express' ? EXPRESS_CASES_PER_LEVEL : FINAL_LEVEL_CASES;
  const won = state.won || (passed && state.levelHandled[LAST_LEVEL] >= goal);
  const next = {
    ...state,
    phase: passed ? 'result' : 'gameover',
    pendingReview: false,
    heat: passed ? 0 : state.heat,
    review,
    reviewOutcome: outcomeFor(state, empathyCount),
    termination: passed ? null : terminationFor(state, empathyCount),
    won,
  };
  const achievements = unlockedIds(next);
  const result = {
    ...state.pendingResult,
    hrCleared: passed,
    hrFailed: !passed,
    hrAnswers: answers,
    heatAfter: next.heat,
    won: state.pendingResult.won || (won && !state.won),
    newAchievements: [...new Set([
      ...state.pendingResult.newAchievements,
      ...achievements.filter((id) => !state.achievements.includes(id)),
    ])],
  };
  return {
    ...next,
    achievements,
    pendingResult: result,
    history: [...state.history.slice(0, -1), result],
  };
}

export function getRunStats(state) {
  const targetCases = state.mode === 'express' ? EXPRESS_CASES_PER_LEVEL * LEVELS.length : null;
  return {
    mode: state.mode,
    role: getLevel(state).name,
    levelIndex: state.levelIndex,
    score: state.score,
    handled: state.handled,
    closed: state.closed,
    helped: state.helped,
    bestStreak: state.bestStreak,
    reviews: state.audits,
    totalTimeMs: state.totalTimeMs,
    averageMs: state.handled ? Math.round(state.totalTimeMs / state.handled) : 0,
    won: state.won,
    fired: state.phase === 'gameover',
    targetCases,
    casesRemaining: targetCases === null ? null : Math.max(0, targetCases - state.handled),
  };
}

export function getDebrief(state) {
  const ledger = state.shiftLedger;
  const perCase = ledger.handled ? ledger.points / ledger.handled : 0;
  // The score floor must not accidentally make an all-helpful shift look good.
  const tooHelpful = ledger.handled > 0 && ledger.helped >= ledger.handled / 2;
  const grade = tooHelpful ? 'D' : perCase >= 300 ? 'S' : perCase >= 200 ? 'A' : perCase >= 100 ? 'B' : perCase >= 0 ? 'C' : 'D';
  const titles = {
    S: 'Outstanding absence of service',
    A: 'Exceeds the wrong expectations',
    B: 'Promisingly unhelpful',
    C: 'Room for less improvement',
    D: 'HR would like a word',
  };
  return {
    shift: state.shift,
    ...ledger,
    averageMs: ledger.handled ? Math.round(ledger.totalTimeMs / ledger.handled) : 0,
    grade,
    title: titles[grade],
    complete: state.shiftCases === CASES_PER_SHIFT,
  };
}

/** Only serializes engine state; player preferences belong to the UI's own key. */
export function serializeState(state) {
  return JSON.stringify(state);
}

function cleanResult(raw, saveVersion, mode) {
  if (!isObject(raw)) return null;
  const rulesVersion = saveVersion === 1 ? 1 : raw.rulesVersion;
  if (![1, SAVE_VERSION].includes(rulesVersion) || (rulesVersion === 1 && mode !== 'full')) return null;
  const incident = CASE_BY_ID.get(raw.caseId);
  const choice = incident?.choices.find((candidate) => candidate.id === raw.choiceId);
  if (!choice || raw.kind !== choice.kind || raw.levelIndex !== LEVEL_INDEX.get(incident.levelId)) return null;
  if (!isInteger(raw.elapsedMs, 0, MAX_ELAPSED_MS)
    || !isInteger(raw.previousScore, 0, MAX_SCORE)
    || !isInteger(raw.previousHeat, 0, 99)
    || !isInteger(raw.previousStreak, 0, MAX_HANDLED)
    || !isInteger(raw.shift, 1, MAX_HANDLED)
    || !isInteger(raw.closedAfter, 0, MAX_HANDLED)
    || !isInteger(raw.helpedAfter, 0, MAX_HANDLED)
    || !isInteger(raw.handledAfter, 1, MAX_HANDLED)
    || raw.closedAfter + raw.helpedAfter !== raw.handledAfter
    || raw.shift !== Math.ceil(raw.handledAfter / CASES_PER_SHIFT)) return null;

  const hrCleared = saveVersion === 1 ? false : raw.hrCleared;
  const hrFailed = saveVersion === 1 ? false : raw.hrFailed;
  const hrAnswers = saveVersion === 1 ? [] : raw.hrAnswers;
  const empathyCount = reviewAnswers(hrAnswers);
  if (typeof hrCleared !== 'boolean' || typeof hrFailed !== 'boolean' || empathyCount === null
    || (hrCleared && hrFailed)
    || ((hrCleared || hrFailed) && hrAnswers.length !== HR_QUESTION_COUNT)
    || (!(hrCleared || hrFailed) && hrAnswers.length !== 0)
    || (hrCleared && empathyCount !== 0) || (hrFailed && empathyCount === 0)) return null;

  const helpful = choice.kind === 'help';
  const nextStreak = !helpful && raw.elapsedMs <= FAST_CLOSE_MS ? raw.previousStreak + 1 : 0;
  const multiplier = multiplierFor(nextStreak);
  const basePoints = basePointsFor(choice);
  const speedBonus = helpful ? 0 : speedBonusFor(raw.elapsedMs);
  const directive = getShiftDirective(raw);
  const directiveBonus = !helpful && choice.kind === directive.kind ? directive.bonus : 0;
  const grossPoints = helpful ? basePoints : Math.round((basePoints + speedBonus + directiveBonus) * multiplier);
  const heatDelta = heatFor(choice);
  const audit = raw.previousHeat + heatDelta >= 100;
  const reviewTriggered = rulesVersion === SAVE_VERSION && audit;
  if ((hrCleared || hrFailed) && !reviewTriggered) return null;
  if (saveVersion !== 1 && raw.reviewTriggered !== reviewTriggered) return null;
  const auditPenalty = rulesVersion === 1 && audit ? legacyAuditPenaltyFor(raw.levelIndex) : 0;
  const scoreAfter = clamp(raw.previousScore + grossPoints - auditPenalty, 0, MAX_SCORE);
  const heatAfter = rulesVersion === 1
    ? (audit ? 28 : clamp(raw.previousHeat + heatDelta, 0, 99))
    : (hrCleared ? 0 : clamp(raw.previousHeat + heatDelta, 0, 100));
  const streakAfter = audit ? 0 : nextStreak;
  const computed = {
    basePoints, speedBonus, directiveBonus, multiplier, grossPoints, heatDelta,
    audit, auditPenalty, scoreAfter, heatAfter, streakAfter,
    points: scoreAfter - raw.previousScore,
    shiftCompleted: raw.handledAfter % CASES_PER_SHIFT === 0,
  };
  if (Object.entries(computed).some(([key, value]) => raw[key] !== value)) return null;
  if (typeof raw.won !== 'boolean') return null;
  let promotedTo = raw.levelIndex;
  if (mode === 'express') {
    if (raw.handledAfter > EXPRESS_CASES_PER_LEVEL * LEVELS.length
      || raw.levelIndex !== Math.min(LAST_LEVEL, Math.floor((raw.handledAfter - 1) / EXPRESS_CASES_PER_LEVEL))) return null;
    promotedTo = Math.min(LAST_LEVEL, Math.floor(raw.handledAfter / EXPRESS_CASES_PER_LEVEL));
  } else {
    while (promotedTo < LAST_LEVEL && scoreAfter >= LEVELS[promotedTo + 1].threshold && raw.closedAfter >= LEVELS[promotedTo + 1].quota) {
      promotedTo += 1;
    }
  }
  const promoted = promotedTo !== raw.levelIndex;
  if (raw.promotedFrom !== (promoted ? raw.levelIndex : null) || raw.promotedTo !== (promoted ? promotedTo : null)) return null;
  if (!Array.isArray(raw.newAchievements) || raw.newAchievements.length > ACHIEVEMENTS.length
    || new Set(raw.newAchievements).size !== raw.newAchievements.length
    || raw.newAchievements.some((id) => !ACHIEVEMENT_IDS.has(id))) return null;
  return {
    rulesVersion, reviewTriggered, hrCleared, hrFailed, hrAnswers: [...hrAnswers],
    caseId: incident.id,
    caseTitle: incident.title,
    customer: incident.customer,
    choiceId: choice.id,
    kind: choice.kind,
    reply: choice.reply,
    outcome: choice.outcome,
    ...computed,
    elapsedMs: raw.elapsedMs,
    auditReason: audit ? HR_REASON : null,
    previousScore: raw.previousScore,
    previousHeat: raw.previousHeat,
    previousStreak: raw.previousStreak,
    closedAfter: raw.closedAfter,
    helpedAfter: raw.helpedAfter,
    handledAfter: raw.handledAfter,
    levelIndex: raw.levelIndex,
    shift: raw.shift,
    promotedFrom: raw.promotedFrom,
    promotedTo: raw.promotedTo,
    won: raw.won,
    newAchievements: [...raw.newAchievements],
  };
}

function cleanReview(raw) {
  if (!isObject(raw) || !Array.isArray(raw.questionIds)
    || raw.questionIds.length !== HR_QUESTION_COUNT
    || raw.questionIds.some((id, index) => id !== HR_QUESTION_IDS[index])
    || !isInteger(raw.index, 0, HR_QUESTION_COUNT)
    || !Array.isArray(raw.answers) || raw.answers.length !== raw.index) return null;
  const empathyCount = reviewAnswers(raw.answers);
  if (empathyCount === null || raw.empathyCount !== empathyCount) return null;
  return { questionIds: [...HR_QUESTION_IDS], index: raw.index, answers: [...raw.answers], empathyCount };
}

/** Validate and whitelist saves. V1 careers migrate without rescoring their history. */
export function restoreState(json) {
  if (typeof json !== 'string' || json.length > MAX_SAVE_LENGTH) return null;
  let raw;
  try { raw = JSON.parse(json); } catch { return null; }
  if (!isObject(raw) || ![1, SAVE_VERSION].includes(raw.version)) return null;
  const legacy = raw.version === 1;
  const mode = legacy ? 'full' : raw.mode;
  const phases = legacy ? ['case', 'result'] : ['case', 'result', 'review', 'gameover', 'complete'];
  if (!['full', 'express'].includes(mode) || !phases.includes(raw.phase)) return null;
  if (!isInteger(raw.seed, 1, 0xffff_ffff)
    || !isInteger(raw.rngState, 1, 0xffff_ffff)
    || !isInteger(raw.score, 0, MAX_SCORE)
    || !isInteger(raw.levelIndex, 0, LAST_LEVEL)
    || !isInteger(raw.closed, 0, MAX_HANDLED)
    || !isInteger(raw.helped, 0, MAX_HANDLED)
    || !isInteger(raw.handled, 0, mode === 'express' ? EXPRESS_CASES_PER_LEVEL * LEVELS.length : MAX_HANDLED)
    || raw.closed + raw.helped !== raw.handled
    || !isInteger(raw.streak, 0, raw.closed)
    || !isInteger(raw.bestStreak, raw.streak, raw.closed)
    || raw.multiplier !== multiplierFor(raw.streak)
    || !isInteger(raw.heat, 0, legacy ? 99 : 100)
    || !isInteger(raw.audits, 0, raw.helped)
    || !isInteger(raw.shift, 1, MAX_HANDLED)
    || !isInteger(raw.shiftCases, 0, CASES_PER_SHIFT)
    || raw.handled !== (raw.shift - 1) * CASES_PER_SHIFT + raw.shiftCases
    || (raw.phase === 'case' && (raw.shiftCases === CASES_PER_SHIFT || raw.heat === 100))
    || (raw.phase !== 'case' && raw.shiftCases === 0)
    || !isInteger(raw.totalTimeMs, 0, MAX_ELAPSED_MS * raw.handled)
    || typeof raw.won !== 'boolean') return null;

  if (!Array.isArray(raw.levelHandled) || raw.levelHandled.length !== LEVELS.length
    || raw.levelHandled.some((count, index) => !isInteger(count, 0, raw.handled) || (index > raw.levelIndex && count !== 0))
    || raw.levelHandled.reduce((total, count) => total + count, 0) !== raw.handled) return null;
  if (mode === 'express') {
    if (raw.levelIndex !== Math.min(LAST_LEVEL, Math.floor(raw.handled / EXPRESS_CASES_PER_LEVEL))
      || raw.levelHandled.some((count, index) => count !== clamp(raw.handled - EXPRESS_CASES_PER_LEVEL * index, 0, EXPRESS_CASES_PER_LEVEL))) return null;
  } else if (raw.closed < LEVELS[raw.levelIndex].quota || raw.phase === 'complete') return null;

  const incident = CASE_BY_ID.get(raw.caseId);
  if (!incident || !Array.isArray(raw.seenIds) || raw.seenIds.length > CASES.length
    || raw.seenIds.some((id) => !CASE_BY_ID.has(id))
    || new Set(raw.seenIds).size !== raw.seenIds.length
    || !raw.seenIds.includes(raw.caseId)) return null;
  if (raw.phase === 'case' && incident.levelId !== LEVELS[raw.levelIndex].id) return null;

  if (!Array.isArray(raw.history) || raw.history.length !== Math.min(raw.handled, HISTORY_LIMIT)) return null;
  const history = raw.history.map((entry) => cleanResult(entry, raw.version, mode));
  if (history.some((entry) => entry === null)) return null;
  for (let index = 0; index < history.length; index += 1) {
    const entry = history[index];
    if (entry.handledAfter !== raw.handled - history.length + index + 1) return null;
    if (index < history.length - 1 && (entry.hrFailed || (entry.reviewTriggered && !entry.hrCleared))) return null;
    if (index > 0) {
      const previous = history[index - 1];
      if (entry.previousScore !== previous.scoreAfter || entry.previousHeat !== previous.heatAfter
        || entry.previousStreak !== previous.streakAfter
        || entry.levelIndex !== (previous.promotedTo ?? previous.levelIndex)
        || entry.closedAfter !== previous.closedAfter + (entry.kind === 'help' ? 0 : 1)
        || entry.helpedAfter !== previous.helpedAfter + (entry.kind === 'help' ? 1 : 0)) return null;
    }
  }
  const recordedTime = history.reduce((total, entry) => total + entry.elapsedMs, 0);
  const recordedAudits = history.filter((entry) => entry.audit).length;
  if (raw.totalTimeMs < recordedTime || (raw.handled <= HISTORY_LIMIT && raw.totalTimeMs !== recordedTime)
    || raw.audits < recordedAudits || (raw.handled <= HISTORY_LIMIT && raw.audits !== recordedAudits)
    || history.some((entry) => entry.streakAfter > raw.bestStreak)) return null;
  const last = history.at(-1);
  if (last && (last.scoreAfter !== raw.score || last.heatAfter !== raw.heat || last.streakAfter !== raw.streak
    || last.closedAfter !== raw.closed || last.helpedAfter !== raw.helped
    || (last.promotedTo ?? last.levelIndex) !== raw.levelIndex)) return null;
  if (!last && (raw.score !== 0 || raw.heat !== 0 || raw.levelIndex !== 0 || raw.bestStreak !== 0)) return null;

  let pendingResult = null;
  if (raw.phase !== 'case') {
    pendingResult = cleanResult(raw.pendingResult, raw.version, mode);
    if (!pendingResult || pendingResult.caseId !== raw.caseId || !last
      || JSON.stringify(pendingResult) !== JSON.stringify(last)) return null;
  } else if (raw.pendingResult !== null || (last?.reviewTriggered && !last.hrCleared) || last?.hrFailed) return null;

  const pendingReview = legacy ? false : raw.pendingReview;
  if (typeof pendingReview !== 'boolean') return null;
  const needsReview = Boolean(pendingResult?.reviewTriggered && !pendingResult.hrCleared && !pendingResult.hrFailed);
  if (pendingReview !== needsReview) return null;
  let review = null;
  let reviewOutcome = null;
  let termination = null;
  if (!legacy) {
    if (raw.review !== null) {
      review = cleanReview(raw.review);
      if (!review || !pendingResult?.reviewTriggered) return null;
    }
    if (raw.phase === 'review') {
      if (!pendingReview || !review || review.index === HR_QUESTION_COUNT || raw.heat !== 100) return null;
    } else if (pendingReview) {
      if (raw.phase !== 'result' || review !== null || raw.heat !== 100) return null;
    } else if (pendingResult?.hrCleared || pendingResult?.hrFailed) {
      if (!review || review.index !== HR_QUESTION_COUNT
        || JSON.stringify(review.answers) !== JSON.stringify(pendingResult.hrAnswers)) return null;
      const passed = review.empathyCount === 0;
      if ((passed && !['result', 'complete'].includes(raw.phase)) || (!passed && raw.phase !== 'gameover')) return null;
      reviewOutcome = outcomeFor(raw, review.empathyCount);
      if (!isObject(raw.reviewOutcome) || raw.reviewOutcome.passed !== passed
        || raw.reviewOutcome.questionCount !== HR_QUESTION_COUNT || raw.reviewOutcome.empathyCount !== review.empathyCount
        || raw.reviewOutcome.caseId !== raw.caseId) return null;
      if (!passed) {
        termination = terminationFor({ ...raw, mode }, review.empathyCount);
        if (!isObject(raw.termination) || Object.keys(termination).some((key) => {
          return !['title', 'message'].includes(key) && raw.termination[key] !== termination[key];
        })) return null;
      }
    } else if (review !== null || raw.phase === 'gameover') return null;
    if (reviewOutcome === null && raw.reviewOutcome !== null) return null;
    if (termination === null && raw.termination !== null) return null;
  }

  const goal = mode === 'express' ? EXPRESS_CASES_PER_LEVEL : FINAL_LEVEL_CASES;
  const finalCount = raw.levelHandled[LAST_LEVEL];
  const goalBlocked = finalCount === goal && (needsReview || Boolean(pendingResult?.hrFailed));
  const expectedWon = finalCount >= goal && !goalBlocked;
  if (raw.won !== expectedWon) return null;
  if (mode === 'express') {
    if (raw.phase === 'complete' && !raw.won) return null;
    if (raw.phase === 'case' && finalCount === goal) return null;
  }
  if (pendingResult?.won && !raw.won) return null;

  if (!isObject(raw.shiftLedger)) return null;
  const ledgerEntries = history.filter((entry) => entry.shift === raw.shift);
  const shiftLedger = emptyShiftLedger();
  for (const entry of ledgerEntries) {
    shiftLedger.handled += 1;
    shiftLedger.closed += entry.kind === 'help' ? 0 : 1;
    shiftLedger.helped += entry.kind === 'help' ? 1 : 0;
    shiftLedger.points += entry.points;
    shiftLedger.audits += entry.audit ? 1 : 0;
    shiftLedger.totalTimeMs += entry.elapsedMs;
    shiftLedger.fastestMs = shiftLedger.fastestMs === null ? entry.elapsedMs : Math.min(shiftLedger.fastestMs, entry.elapsedMs);
    shiftLedger.bestStreak = Math.max(shiftLedger.bestStreak, entry.kind !== 'help' && entry.elapsedMs <= FAST_CLOSE_MS ? entry.previousStreak + 1 : 0);
  }
  if (shiftLedger.handled !== raw.shiftCases || Object.entries(shiftLedger).some(([key, value]) => raw.shiftLedger[key] !== value)) return null;
  if (!Array.isArray(raw.achievements) || raw.achievements.length > ACHIEVEMENTS.length
    || raw.achievements.some((id) => !ACHIEVEMENT_IDS.has(id))
    || new Set(raw.achievements).size !== raw.achievements.length) return null;

  const restored = {
    version: SAVE_VERSION,
    mode,
    seed: raw.seed,
    rngState: raw.rngState,
    phase: raw.phase,
    score: raw.score,
    levelIndex: raw.levelIndex,
    closed: raw.closed,
    helped: raw.helped,
    handled: raw.handled,
    streak: raw.streak,
    bestStreak: raw.bestStreak,
    multiplier: raw.multiplier,
    heat: raw.heat,
    audits: raw.audits,
    shift: raw.shift,
    shiftCases: raw.shiftCases,
    shiftLedger,
    levelHandled: [...raw.levelHandled],
    totalTimeMs: raw.totalTimeMs,
    history,
    seenIds: [...raw.seenIds],
    caseId: raw.caseId,
    achievements: [],
    won: raw.won,
    pendingResult,
    pendingReview,
    review,
    reviewOutcome,
    termination,
  };
  restored.achievements = unlockedIds(restored);
  if (history.some((entry) => entry.newAchievements.some((id) => !restored.achievements.includes(id)))) return null;
  return restored;
}
