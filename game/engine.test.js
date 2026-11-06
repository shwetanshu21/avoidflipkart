import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES, LEVELS } from './content.js';
import {
  advanceCase, createState, getAchievements, getCurrentCase, getDebrief,
  getLevel, getPromotionProgress, getShiftDirective, resolveChoice,
  restoreState, serializeState,
} from './engine.js';

function choose(state, kind = 'risk', elapsedMs = 5_000) {
  const choice = getCurrentCase(state).choices.find((item) => item.kind === kind);
  assert.ok(choice, `Missing ${kind} response on ${state.caseId}`);
  return resolveChoice(state, choice.id, elapsedMs);
}

function play(state, kind = 'risk', elapsedMs = 5_000) {
  return advanceCase(choose(state, kind, elapsedMs));
}

function deepFreeze(object) {
  for (const value of Object.values(object)) {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) deepFreeze(value);
  }
  return Object.freeze(object);
}

test('a new career starts with a readable case, a zero score, and a valid resumable save', () => {
  const state = createState(42);
  assert.equal(state.phase, 'case');
  assert.equal(getLevel(state).id, 'support');
  assert.equal(getCurrentCase(state).levelId, 'support');
  assert.equal(state.score, 0);
  assert.equal(state.handled, 0);
  assert.equal(state.shift, 1);
  assert.equal(state.shiftCases, 0);
  assert.equal(state.seenIds.length, 1);
  assert.equal(getShiftDirective(state).kind, 'deny');
  assert.deepEqual(restoreState(serializeState(state)), state);
  assert.equal(getPromotionProgress(state).pointsNeeded, LEVELS[1].threshold);
  assert.equal(getPromotionProgress(state).casesNeeded, LEVELS[1].quota);
});

test('response handling is immutable and duplicate clicks cannot score twice', () => {
  const state = deepFreeze(createState(101));
  const next = choose(state);
  assert.notEqual(next, state);
  assert.equal(state.closed, 0);
  assert.equal(state.score, 0);
  assert.equal(state.history.length, 0);
  assert.equal(next.closed, 1);
  assert.equal(next.handled, 1);
  assert.ok(next.score > 0);
  assert.equal(resolveChoice(next, next.pendingResult.choiceId, 1), next);
  assert.equal(resolveChoice(state, 'not-a-response', 1), state);
  assert.equal(advanceCase(state), state);
  const following = advanceCase(deepFreeze(next));
  assert.equal(following.phase, 'case');
  assert.equal(following.pendingResult, null);
  assert.notEqual(following.caseId, state.caseId);
  assert.equal(following.score, next.score);
});

test('fast closures earn speed bonuses and a capped combo; slow replies reset it', () => {
  const first = createState(22);
  const immediate = choose(first, 'risk', 1_000);
  const quick = choose(first, 'risk', 12_000);
  const timely = choose(first, 'risk', 22_000);
  const slow = choose(first, 'risk', 26_000);
  assert.ok(immediate.score > quick.score);
  assert.ok(quick.score > timely.score);
  assert.ok(timely.score > slow.score);
  assert.equal(immediate.pendingResult.speedBonus, 40);
  assert.equal(timely.pendingResult.speedBonus, 10);
  assert.equal(slow.pendingResult.speedBonus, 0);
  let state = first;
  for (let count = 1; count <= 20; count += 1) {
    state = choose(state);
    assert.equal(state.streak, count);
    assert.ok(state.multiplier >= 1 && state.multiplier <= 3);
    if (count === 4) assert.equal(state.multiplier, 1.5);
    if (count >= 13) assert.equal(state.multiplier, 3);
    state = advanceCase(state);
  }
  const broken = choose(state, 'deny', 30_000);
  assert.equal(broken.streak, 0);
  assert.equal(broken.multiplier, 1);
  assert.equal(broken.bestStreak, 20);
  assert.equal(choose(advanceCase(broken)).streak, 1);
});

test('helping reduces score and raises management heat; outrageous excuses cool it', () => {
  let state = createState(33);
  for (let count = 0; count < 8; count += 1) state = play(state);
  const helpful = choose(state, 'help');
  assert.ok(helpful.score < state.score);
  assert.ok(helpful.heat > state.heat);
  assert.equal(helpful.closed, state.closed);
  assert.equal(helpful.helped, 1);
  assert.equal(helpful.streak, 0);
  assert.equal(helpful.pendingResult.speedBonus, 0);
  assert.equal(helpful.pendingResult.directiveBonus, 0);
  assert.equal(helpful.pendingResult.multiplier, 1);
  const ready = advanceCase(helpful);
  const outrageous = choose(ready, 'risk');
  const denial = choose(ready, 'deny');
  const deflection = choose(ready, 'deflect');
  assert.ok(outrageous.score > denial.score);
  assert.ok(outrageous.score > deflection.score);
  for (const result of [outrageous, denial, deflection]) {
    assert.ok(result.heat <= ready.heat);
    assert.equal(result.pendingResult.audit, false);
  }
  const firstHelp = choose(createState(99), 'help');
  assert.equal(firstHelp.score, 0, 'A helpful first response cannot create negative scores');
  assert.ok(firstHelp.heat > 0);
  assert.equal(getDebrief(firstHelp).grade, 'D', 'The score floor cannot hide excessive helpfulness from HR');
});

test('HR audits excessive competence, never extravagant nonsense', () => {
  let state = createState(45);
  for (let count = 0; count < 10; count += 1) state = play(state);
  let audited = null;
  for (let count = 0; count < 10; count += 1) {
    const result = choose(state, 'help');
    if (result.pendingResult.audit) {
      audited = result;
      break;
    }
    state = advanceCase(result);
  }
  assert.ok(audited, 'Repeated useful responses must trigger a competence audit');
  assert.equal(audited.pendingResult.kind, 'help');
  assert.equal(audited.audits, 1);
  assert.equal(audited.heat, 28);
  assert.ok(audited.pendingResult.auditPenalty > 0);
  assert.match(audited.pendingResult.auditReason, /actual customer service/);
  assert.equal(audited.streak, 0);
  assert.ok(getAchievements(audited).find(({ id }) => id === 'audit').unlocked);
  state = advanceCase(audited);
  for (let count = 0; count < 200; count += 1) {
    const result = choose(state, 'risk');
    assert.equal(result.pendingResult.audit, false);
    assert.ok(result.heat <= state.heat);
    state = advanceCase(result);
  }
  assert.equal(state.audits, 1);
});

test('promotions require both the score and closed-case quota; helpful cases do not qualify', () => {
  let state = createState(56);
  for (let count = 0; count < 11; count += 1) state = play(state);
  assert.ok(state.score >= LEVELS[1].threshold);
  assert.equal(state.levelIndex, 0, 'High score alone cannot bypass the 12-close quota');
  assert.equal(getPromotionProgress(state).casesNeeded, 1);
  assert.equal(getPromotionProgress(state).pointsNeeded, 0);
  const helped = choose(state, 'help');
  assert.equal(helped.levelIndex, 0);
  assert.equal(helped.closed, 11);
  const promoted = choose(advanceCase(helped));
  assert.equal(promoted.levelIndex, 1);
  assert.equal(promoted.pendingResult.promotedFrom, 0);
  assert.equal(promoted.pendingResult.promotedTo, 1);
  assert.equal(getCurrentCase(promoted).levelId, 'support', 'The answered case remains visible during promotion');
  state = advanceCase(promoted);
  assert.equal(getCurrentCase(state).levelId, 'senior');
  for (let count = 0; count < 50; count += 1) state = play(state, 'help');
  assert.equal(state.score, 0);
  assert.equal(state.levelIndex, 1, 'Career titles are never revoked when score drops');
  assert.ok(getAchievements(state).find(({ id }) => id === 'first-promotion').unlocked);
  assert.ok(restoreState(serializeState(state)), 'A below-threshold score must still save at the earned rank');
});

test('the complete career reaches all seven roles, celebrates once, and continues in endless mode', () => {
  let state = createState(67);
  const reached = new Set([state.levelIndex]);
  for (let count = 0; count < 500 && state.levelIndex < LEVELS.length - 1; count += 1) {
    const result = choose(state);
    if (result.pendingResult.promotedTo !== null) {
      const level = LEVELS[result.levelIndex];
      assert.ok(result.score >= level.threshold);
      assert.ok(result.closed >= level.quota);
      reached.add(result.levelIndex);
      assert.ok(restoreState(serializeState(result)), 'Promotion results must survive reload');
    }
    state = advanceCase(result);
  }
  assert.deepEqual([...reached], [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(getLevel(state).id, 'walmart-ceo');
  assert.equal(state.won, false);
  assert.equal(getPromotionProgress(state).casesNeeded, 20);
  for (let count = 0; count < 19; count += 1) state = play(state);
  assert.equal(state.won, false);
  const victory = choose(state);
  assert.equal(victory.won, true);
  assert.equal(victory.pendingResult.won, true);
  assert.equal(getPromotionProgress(victory).complete, true);
  assert.equal(getPromotionProgress(victory).casesNeeded, 0);
  assert.ok(getAchievements(victory).find(({ id }) => id === 'empire').unlocked);
  assert.ok(restoreState(serializeState(victory)));
  const encore = choose(advanceCase(victory));
  assert.equal(encore.won, true);
  assert.equal(encore.pendingResult.won, false, 'The victory overlay must not recur every case');
  assert.equal(encore.levelIndex, 6);
  assert.ok(encore.score > victory.score);
});

test('all 120 cases on every floor can be played without repeats before deck exhaustion', () => {
  let state = createState(78);
  const encountered = new Set();
  for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
    assert.equal(state.levelIndex, levelIndex);
    const count = CASES.filter((incident) => incident.levelId === LEVELS[levelIndex].id).length;
    assert.equal(count, 120);
    const seen = new Set();
    for (let index = 0; index < count; index += 1) {
      assert.equal(getCurrentCase(state).levelId, LEVELS[levelIndex].id);
      assert.ok(!seen.has(state.caseId), `Repeat before exhaustion: ${state.caseId}`);
      seen.add(state.caseId);
      encountered.add(state.caseId);
      state = play(state, 'help');
    }
    assert.equal(seen.size, 120);
    assert.ok(seen.has(state.caseId), 'The exhausted deck should become available again');
    if (levelIndex < LEVELS.length - 1) {
      for (let attempts = 0; attempts < 300 && state.levelIndex === levelIndex; attempts += 1) state = play(state);
      assert.equal(state.levelIndex, levelIndex + 1);
    }
  }
  assert.equal(encountered.size, 840);
  assert.ok(state.history.length <= 30);
  assert.ok(state.seenIds.length <= CASES.length);
  assert.ok(restoreState(serializeState(state)));
});

test('shift directives, summaries, and result saves survive exact shift boundaries', () => {
  let state = createState(89);
  const directive = getShiftDirective(state);
  for (let count = 0; count < 9; count += 1) state = play(state, 'deny');
  const result = choose(state, 'deny');
  assert.equal(result.shift, 1);
  assert.equal(result.shiftCases, 10);
  assert.equal(result.pendingResult.shiftCompleted, true);
  assert.equal(result.pendingResult.directiveBonus, directive.bonus);
  const debrief = getDebrief(result);
  assert.equal(debrief.handled, 10);
  assert.equal(debrief.closed, 10);
  assert.equal(debrief.helped, 0);
  assert.equal(debrief.points, result.score);
  assert.equal(debrief.averageMs, 5_000);
  assert.equal(debrief.fastestMs, 5_000);
  assert.equal(debrief.complete, true);
  const restored = restoreState(serializeState(result));
  assert.deepEqual(getDebrief(restored), debrief);
  state = advanceCase(restored);
  assert.equal(state.shift, 2);
  assert.equal(state.shiftCases, 0);
  assert.equal(getDebrief(state).handled, 0);
  assert.equal(getDebrief(state).fastestMs, null);
  assert.notEqual(getShiftDirective(state).id, directive.id);
  assert.equal(getShiftDirective(state).kind, 'deflect');
  assert.ok(choose(state, 'deflect').pendingResult.directiveBonus > 0);
  assert.deepEqual(restoreState(serializeState(state)), state);
});

test('seeded careers and resumed careers produce identical future case order', () => {
  let original = createState(123456);
  let identical = createState(123456);
  let different = createState(654321);
  for (let count = 0; count < 30; count += 1) {
    original = play(original);
    identical = play(identical);
    different = play(different);
    assert.deepEqual(identical, original);
  }
  assert.notDeepEqual(different.seenIds, original.seenIds);
  let resumed = restoreState(serializeState(original));
  for (let count = 0; count < 40; count += 1) {
    const kind = count % 7 === 0 ? 'help' : 'risk';
    original = play(original, kind, 11_000);
    resumed = play(resumed, kind, 11_000);
    assert.deepEqual(resumed, original);
  }
  const pending = choose(original, 'deflect', 12_000);
  assert.deepEqual(restoreState(serializeState(pending)), pending);
});

test('invalid save data is rejected and authored prose is rehydrated from trusted content', () => {
  const valid = choose(createState(90));
  for (const value of [null, undefined, 42, '', '{', 'null', '[]', '{}', 'x'.repeat(1_000_001)]) {
    assert.equal(restoreState(value), null);
  }
  const badMutations = [
    (state) => { state.version = 999; },
    (state) => { state.score = -1; },
    (state) => { state.score = null; },
    (state) => { state.score = 10 ** 30; },
    (state) => { state.score += 1; },
    (state) => { state.levelIndex = 200; },
    (state) => { state.heat = 100; },
    (state) => { state.closed = 500; },
    (state) => { state.caseId = 'missing-case'; },
    (state) => { state.rngState = 0; },
    (state) => { state.seenIds.push(state.caseId); },
    (state) => { state.seenIds = ['unknown']; },
    (state) => { state.levelHandled = [1]; },
    (state) => { state.achievements = ['invented']; },
    (state) => { state.history = Array(100).fill(state.history[0]); },
    (state) => { state.pendingResult = null; },
    (state) => { state.pendingResult.choiceId = 'not-a-choice'; },
    (state) => { state.shiftLedger.points += 1; },
    (state) => { state.shiftCases = 9; },
    (state) => { state.totalTimeMs = -1; },
  ];
  for (const mutate of badMutations) {
    const corrupted = JSON.parse(serializeState(valid));
    mutate(corrupted);
    assert.equal(restoreState(JSON.stringify(corrupted)), null, mutate.toString());
  }
  const injected = JSON.parse(serializeState(valid));
  injected.pendingResult.reply = '<script>untrusted prose</script>';
  injected.history[0].reply = '<script>untrusted prose</script>';
  injected.extraField = 'ignored';
  const safe = restoreState(JSON.stringify(injected));
  assert.equal(safe.pendingResult.reply, valid.pendingResult.reply);
  assert.equal(safe.history[0].reply, valid.history[0].reply);
  assert.equal(safe.extraField, undefined);
});

test('long mixed play preserves score, heat, counters, and saves through every phase', () => {
  let state = createState(20261106);
  const kinds = ['risk', 'deny', 'deflect', 'risk', 'help', 'risk', 'risk'];
  for (let index = 0; index < 400; index += 1) {
    const kind = kinds[index % kinds.length];
    const result = choose(state, kind, index % 11 === 0 ? 35_000 : 6_500);
    assert.ok(Number.isFinite(result.score) && result.score >= 0);
    assert.ok(result.heat >= 0 && result.heat < 100);
    assert.equal(result.closed + result.helped, result.handled);
    assert.equal(result.levelHandled.reduce((total, count) => total + count, 0), result.handled);
    assert.ok(result.levelIndex >= state.levelIndex);
    assert.ok(result.history.length <= 30);
    assert.equal(new Set(result.seenIds).size, result.seenIds.length);
    if (kind !== 'help') {
      assert.equal(result.pendingResult.audit, false);
      assert.ok(result.heat <= state.heat);
      assert.ok(result.score > state.score);
    }
    if (index % 10 === 0) assert.deepEqual(restoreState(serializeState(result)), result);
    state = advanceCase(result);
    if (index % 10 === 0) assert.deepEqual(restoreState(serializeState(state)), state);
  }
  assert.equal(state.handled, 400);
});

test('non-finite timer values cannot poison scores or grant a fast-close combo', () => {
  for (const invalid of [NaN, Infinity, -Infinity, undefined, '1000']) {
    const initial = createState(100);
    const choice = getCurrentCase(initial).choices.find(({ kind }) => kind === 'risk');
    const state = resolveChoice(initial, choice.id, invalid);
    assert.ok(Number.isFinite(state.score));
    assert.equal(state.pendingResult.speedBonus, 0);
    assert.equal(state.streak, 0);
    assert.ok(restoreState(serializeState(state)));
  }
});
