import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES, CASES_PER_LEVEL, EXPRESS_CASE_IDS, LEVELS, TIPS } from './content.js';

const casesFor = levelId => CASES.filter(item => item.levelId === levelId);
const wordCount = value => value.trim().split(/\s+/u).length;

test('the complete seven-role career has 120 cases on every floor', () => {
  assert.deepEqual(LEVELS.map(level => level.id), [
    'support', 'senior', 'lead', 'grievance', 'director', 'fk-ceo', 'walmart-ceo',
  ]);
  assert.equal(CASES_PER_LEVEL, 120);
  assert.equal(CASES.length, 840);
  assert.equal(new Set(CASES.map(item => item.id)).size, 840);
  assert.equal(LEVELS[0].threshold, 0);
  assert.equal(LEVELS[0].quota, 0);
  for (const [index, level] of LEVELS.entries()) {
    assert.equal(casesFor(level.id).length, 120, level.id);
    assert.ok(level.name && level.shortName && level.channel && level.motto);
    assert.match(level.color, /^#[\da-f]{6}$/iu);
    if (index) {
      assert.ok(level.threshold > LEVELS[index - 1].threshold);
      assert.ok(level.quota > LEVELS[index - 1].quota);
    }
  }
  assert.equal(LEVELS.at(-1).company, 'Walmart');
});

test('each floor contains 20 distinct situations with six substantive developments', () => {
  assert.equal(new Set(CASES.map(item => item.body)).size, CASES.length);
  for (const level of LEVELS) {
    const situations = Map.groupBy(casesFor(level.id), item => item.subject);
    assert.equal(situations.size, 20, level.id);
    for (const [subject, developments] of situations) {
      assert.equal(developments.length, 6, subject);
      assert.equal(new Set(developments.map(item => item.body)).size, 6, subject);
      assert.equal(new Set(developments.map(item => item.evidence)).size, 6, subject);
      assert.equal(new Set(developments.map(item => item.tag)).size, 6, subject);
      for (const kind of ['deny', 'deflect', 'risk', 'help']) {
        const texts = developments.map(item => item.choices.find(choice => choice.kind === kind).text);
        assert.equal(new Set(texts).size, 6, `${subject}: ${kind} responses should reflect the development`);
      }
    }
  }
});

test('every case provides four complete and readable choices with persistent IDs', () => {
  const allChoiceIds = new Set();
  for (const item of CASES) {
    assert.equal(item.choices.length, 4, item.id);
    assert.deepEqual(item.choices.map(choice => choice.kind).sort(), ['deflect', 'deny', 'help', 'risk']);
    assert.equal(new Set(item.choices.map(choice => choice.text)).size, 4, item.id);
    assert.ok(wordCount(item.body) <= 60, `${item.id}: case body is too long`);
    assert.ok(item.customer && item.initials && item.evidence && item.product && item.subject);
    assert.match(item.amount, /^[₹$][\d,.]+$/u, item.id);
    assert.ok(['normal', 'high', 'urgent'].includes(item.priority), item.id);
    for (const choice of item.choices) {
      assert.ok(choice.id.startsWith(`${item.id}-`), choice.id);
      assert.ok(!allChoiceIds.has(choice.id), choice.id);
      allChoiceIds.add(choice.id);
      assert.ok(choice.label && choice.reply && choice.outcome, choice.id);
      assert.ok(wordCount(choice.text) <= 60, `${choice.id}: reply is too long`);
      assert.ok(wordCount(choice.label) <= 10, `${choice.id}: action label is too long`);
      assert.ok(Number.isFinite(choice.basePoints) && Number.isFinite(choice.heat), choice.id);
    }
  }
  assert.equal(allChoiceIds.size, 3360);
});

test('ridiculous closures are rewarded and genuine help attracts management heat', () => {
  for (const item of CASES) {
    const choices = Object.fromEntries(item.choices.map(choice => [choice.kind, choice]));
    assert.ok(choices.risk.basePoints > choices.deny.basePoints, item.id);
    assert.ok(choices.risk.basePoints > choices.deflect.basePoints, item.id);
    assert.ok(choices.risk.heat < choices.deny.heat, item.id);
    assert.ok(choices.risk.heat < choices.deflect.heat, item.id);
    for (const kind of ['deny', 'deflect', 'risk']) {
      assert.ok(choices[kind].basePoints > 0, `${item.id}: ${kind}`);
      assert.ok(choices[kind].heat < 0, `${item.id}: ${kind}`);
    }
    assert.ok(choices.help.basePoints < 0, item.id);
    assert.ok(choices.help.heat > 0, item.id);
  }
});

test('answer positions vary broadly and outrageous actions have specific labels', () => {
  for (const level of LEVELS) {
    const items = casesFor(level.id);
    const permutations = new Set(items.map(item => item.choices.map(choice => choice.kind).join(',')));
    assert.ok(permutations.size >= 20, `${level.id}: answer order is too predictable`);
    for (const kind of ['deny', 'deflect', 'risk', 'help']) {
      const positions = new Set(items.map(item => item.choices.findIndex(choice => choice.kind === kind)));
      assert.equal(positions.size, 4, `${level.id}: ${kind} must appear in all four positions`);
    }
    const labels = new Set(items.map(item => item.choices.find(choice => choice.kind === 'risk').label));
    assert.equal(labels.size, 20, `${level.id}: outrageous actions should be situation-specific`);
  }
});

test('choice ordering is deterministic across a fresh module load for save restoration', async () => {
  const reloaded = await import('./content.js?content-integrity-check');
  assert.deepEqual(
    reloaded.CASES.map(item => [item.id, ...item.choices.map(choice => choice.id)]),
    CASES.map(item => [item.id, ...item.choices.map(choice => choice.id)]),
  );
});

test('playable copy is complete, original-labelled and free of unexpanded placeholders', () => {
  const text = JSON.stringify({ CASES, LEVELS, TIPS });
  assert.doesNotMatch(text, /undefined|\[INSERT|\[TODO|lorem ipsum|David Thorne|Douglas Adams/iu);
  for (const item of CASES) {
    assert.doesNotMatch(item.body, /\s\|\s/u, item.id);
    assert.equal(item.evidence, item.evidence.trim(), item.id);
    assert.ok(item.evidence.length >= 12, item.id);
  }
  assert.ok(TIPS.some(tip => /fiction/iu.test(tip)));
  assert.ok(TIPS.some(tip => /helping raises management heat/iu.test(tip)));
});


test('Express is fourteen individually written conversations spanning every career level', () => {
  assert.deepEqual(Object.keys(EXPRESS_CASE_IDS), LEVELS.map(level => level.id));
  const ids = Object.values(EXPRESS_CASE_IDS).flat();
  assert.equal(ids.length, 14);
  assert.equal(new Set(ids).size, 14);
  const replies = new Set();
  for (const level of LEVELS) {
    assert.equal(EXPRESS_CASE_IDS[level.id].length, 2);
    for (const id of EXPRESS_CASE_IDS[level.id]) {
      const item = CASES.find(candidate => candidate.id === id);
      assert.ok(item, id);
      assert.equal(item.levelId, level.id);
      assert.equal(item.isCurated, true, id);
      assert.ok(item.customerMessage.length > 80, id);
      assert.ok(wordCount(item.customerMessage) <= 60, id);
      assert.ok(item.orderId && item.internalMemo, id);
      assert.ok(Number.isInteger(item.priorEscalations) && item.priorEscalations > 0, id);
      for (const choice of item.choices) {
        assert.ok(!replies.has(choice.text), choice.id);
        replies.add(choice.text);
        assert.ok(wordCount(choice.text) <= 60, choice.id);
      }
    }
  }
  assert.equal(replies.size, 56);
});

test('reply prose does not expose scoring labels or internal action directions', () => {
  const hints = /empathy trap|right answer|genuine solution|premium|[+]\d+\s*(?:CSP|points)|base points|resets? (?:your |the )?streak|management heat|double down|respond by|present this as|sign it in gold/iu;
  for (const item of CASES) {
    assert.ok(item.customerMessage && item.internalMemo && item.orderId, item.id);
    assert.ok(Number.isInteger(item.priorEscalations), item.id);
    for (const choice of item.choices) {
      assert.doesNotMatch(choice.text, hints, choice.id);
      assert.doesNotMatch(choice.text, /^(?:Rebrand|Register|Transfer|Launch|Declare|Appoint|Promote|Refund|Replace|Accept|Refer|Invent|Create)\b/u, choice.id);
    }
    assert.doesNotMatch(item.customerMessage, /\b(?:enrolled|requires|asks|instructs|directs|leaving|reached) I\b/u, item.id);
    assert.doesNotMatch(item.customerMessage, /\bI (?:has|is|supplies|provides|misses|tries|finishes|gives|opens|refuses)\b/u, item.id);
  }
});

test('reference-inspired scenarios contain distinct developments and specific Indian details', () => {
  const text = JSON.stringify(CASES);
  for (const term of ['boarding pass', 'pigeon', 'lemon soaps', 'Mr. Gumdrop', 'Silk Board', 'speed post', 'watchman', 'tiffin', 'Diwali', 'OTP']) {
    assert.ok(text.includes(term), `Missing scenario detail: ${term}`);
  }
  assert.doesNotMatch(text, /Form 27B\/6|drawing of a spider|seven-legged mouse|750 fully|750-case/iu);
  assert.equal(CASES.filter(item => item.isCurated).length, 15);
});
