import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as engine from './engine.js';
import * as content from './content.js';

// Exercise the real controller and engine, with only rendering/audio helpers
// replaced. This is a state integration harness, not a layout or browser test.
// Native close() clears open synchronously and queues its close event:
// https://html.spec.whatwg.org/multipage/interactive-elements.html#close-the-dialog
const appModuleUrl = new URL('./app.js', import.meta.url);
const controller = readFileSync(appModuleUrl, 'utf8')
  .replace(/^import .+;\n/gm, '')
  .replace(/\bimport\.meta\.url\b/g, JSON.stringify(appModuleUrl.href));

function mount(storage = {}) {
  const entries = new Map(Object.entries(storage));
  const elements = new Map();
  const tasks = [];
  let now = 0;

  function element() {
    const listeners = new Map();
    return {
      innerHTML: '', textContent: '', open: false, dataset: {},
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {}, focus() {}, scrollIntoView() {}, select() {},
      append() {}, remove() {}, click() {},
      addEventListener(type, callback) {
        listeners.set(type, [...(listeners.get(type) || []), callback]);
      },
      dispatch(type, event = {}) {
        for (const callback of listeners.get(type) || []) callback({ target: this, ...event });
      },
      showModal() { this.open = true; },
      close() {
        if (!this.open) return;
        this.open = false;
        tasks.push(() => this.dispatch('close'));
      },
      getBoundingClientRect() { return { left: 0, top: 0, right: 100, bottom: 100 }; },
    };
  }

  const document = {
    ...element(), hidden: false, body: element(), fonts: { ready: Promise.resolve() },
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, element());
      return elements.get(selector);
    },
    createElement: element,
  };
  const context = vm.createContext({
    ...engine, ...content, document, URL, URLSearchParams,
    window: { innerWidth: 1200, scrollTo() {}, addEventListener() {} },
    location: { search: '' },
    localStorage: {
      getItem: key => entries.get(key) ?? null,
      setItem: (key, value) => entries.set(key, value),
    },
    performance: { now: () => now },
    matchMedia: () => ({ matches: true }),
    navigator: { clipboard: { writeText: async () => {} } },
    setTimeout: () => 1, clearTimeout() {}, setInterval() {},
    renderOffice: () => '', renderCrew: () => '', renderHR: () => '', renderAvatar: () => '',
    setSound() {}, playSound() {},
  });
  vm.runInContext(controller, context, { filename: 'game/app.js' });
  const read = expression => vm.runInContext(expression, context);
  const dialog = elements.get('#game-dialog');
  const flush = () => {
    let count = 0;
    while (tasks.length) {
      assert.ok(count++ < 20, 'A close event must not create an endless modal loop');
      tasks.shift()();
    }
  };
  const dispatch = (dataset, settle = true) => {
    const target = {
      dataset,
      closest(selector) {
        const key = { '[data-action]': 'action', '[data-choice]': 'choice', '[data-hr-choice]': 'hrChoice' }[selector];
        return key && Object.hasOwn(dataset, key) ? target : null;
      },
    };
    document.dispatch('click', { target });
    if (settle) flush();
  };
  return {
    entries, dialog, read, flush,
    state: () => read('state'),
    action: (action, settle = true) => dispatch({ action }, settle),
    choose(kind = 'risk') {
      const choice = engine.getCurrentCase(read('state')).choices.find(item => item.kind === kind);
      dispatch({ choice: choice.id });
    },
    tick(ms) { now += ms; },
    body: () => elements.get('#dialog-content').innerHTML,
    saved(mode) { return engine.restoreState(JSON.parse(entries.get('closed-career-v2:' + mode)).game); },
    dismiss(kind = 'x', settle = true) {
      if (kind === 'x') dispatch({ action: 'close-modal' }, false);
      else if (kind === 'backdrop') dialog.dispatch('click', { clientX: -10, clientY: -10 });
      else {
        // Native Escape fires a cancel event, then closes unless prevented.
        let cancelled = false;
        dialog.dispatch('cancel', { preventDefault() { cancelled = true; } });
        if (!cancelled) dialog.close();
      }
      if (settle) flush();
    },
  };
}

const envelope = (state, elapsedMs = 0, sound = false, format = 2) =>
  JSON.stringify({ format, game: engine.serializeState(state), elapsedMs, sound });

function resultAfter(count, mode = 'full') {
  let state = engine.createState(123, mode);
  for (let index = 0; index < count; index += 1) {
    const choice = engine.getCurrentCase(state).choices.find(item => item.kind === 'risk');
    state = engine.resolveChoice(state, choice.id, 5_000);
    if (index < count - 1) state = engine.advanceCase(state);
  }
  return state;
}

function atResult(result) {
  const app = mount({ ['closed-career-v2:' + result.mode]: envelope(result) });
  app.action('start-' + result.mode);
  return app;
}

test('invalid preferences never hide or overwrite valid Express and Full career saves', () => {
  const express = engine.advanceCase(resultAfter(3, 'express'));
  const full = engine.advanceCase(resultAfter(15));
  for (const prefs of ['{broken', 'null', '[]', '"not preferences"']) {
    const app = mount({
      'closed-preferences-v2': prefs,
      'closed-career-v2:express': envelope(express, 4000),
      'closed-career-v2:full': envelope(full, 7000),
    });
    assert.equal(app.read('storageAvailable'), true);
    app.action('start-express');
    assert.deepEqual(app.state(), express);
    assert.equal(app.read('currentElapsed()'), 4000);
    app.action('home');
    app.action('start-full');
    assert.deepEqual(app.state(), full);
    assert.equal(app.read('currentElapsed()'), 7000);
    assert.deepEqual(app.saved('express'), express);
    assert.deepEqual(app.saved('full'), full);
  }
});

test('legacy Full migration preserves an explicit mute preference and uses legacy sound only as a fallback', () => {
  const legacy = JSON.parse(engine.serializeState(engine.createState(444)));
  legacy.version = 1;
  for (const key of ['mode', 'pendingReview', 'review', 'reviewOutcome', 'termination']) delete legacy[key];
  for (const prefs of [{ sound: false }, {}]) {
    const app = mount({
      'closed-career-v1': envelope(legacy, 8000, true, 1),
      'closed-preferences-v2': JSON.stringify(prefs),
    });
    assert.equal(app.read('sound'), prefs.sound === undefined);
    app.action('start-full');
    assert.equal(app.state().version, 2);
    assert.equal(app.state().mode, 'full');
    assert.equal(app.state().seed, legacy.seed);
    assert.equal(app.read('currentElapsed()'), 8000);
    assert.equal(app.saved('full').seed, legacy.seed);
  }
});

test('X, Escape, and backdrop dismissal each consume a promotion once after the queued close event', () => {
  const result = resultAfter(2, 'express');
  const expected = engine.advanceCase(result);
  for (const kind of ['x', 'escape', 'backdrop']) {
    const app = atResult(result);
    app.action('next');
    assert.equal(app.dialog.open, true);
    assert.match(app.body(), /PROMOTION APPROVED/);
    app.dismiss(kind, false);
    assert.equal(app.dialog.open, false);
    assert.equal(app.state().phase, 'result', 'The native close event has not fired yet');
    app.flush();
    assert.deepEqual(app.state(), expected);
    assert.equal(app.dialog.open, false);
    app.flush();
    assert.deepEqual(app.state(), expected, 'A result must never be dealt twice');
  }
});

test('chained promotion and shift dialogs replace the open modal without stale close events advancing twice', () => {
  const result = resultAfter(100);
  assert.equal(result.pendingResult.promotedTo, 5);
  assert.equal(result.pendingResult.shiftCompleted, true);
  for (const useButton of [true, false]) {
    const app = atResult(result);
    app.action('next');
    assert.match(app.body(), /PROMOTION APPROVED/);
    if (useButton) app.action('continue-celebrations');
    else app.dismiss('escape');
    assert.equal(app.dialog.open, true);
    assert.match(app.body(), /Your performance review/);
    assert.deepEqual(app.state(), result);
    app.action('continue-celebrations', false);
    const next = app.state();
    assert.equal(app.dialog.open, false);
    assert.deepEqual(next, engine.advanceCase(result));
    app.tick(1000);
    app.flush();
    assert.equal(app.state(), next, 'The old close event must not trigger another advance');
    assert.equal(app.read('currentElapsed()'), 1000, 'The old close event must not reset the next case timer');
  }
});

test('sharing from the Full victory preserves the continuation and returns to endless play once', () => {
  const result = resultAfter(152);
  assert.equal(result.pendingResult.won, true);
  const app = atResult(result);
  app.action('next');
  assert.match(app.body(), /FULL CAREER COMPLETE/);
  app.action('share');
  assert.equal(app.dialog.open, true);
  assert.match(app.body(), /CHALLENGE A FRIEND/);
  assert.equal(app.state().phase, 'result');
  app.dismiss('escape');
  assert.deepEqual(app.state(), engine.advanceCase(result));
  assert.equal(app.state().won, true);
  assert.equal(app.dialog.open, false);
  app.action('next');
  assert.equal(app.dialog.open, false, 'The old winning result cannot reopen its victory dialog');
});

test('home and a fresh run clear celebration continuation before queued close events fire', () => {
  const result = resultAfter(2, 'express');
  const home = atResult(result);
  home.action('next');
  home.action('home', false);
  assert.equal(home.read('view'), 'welcome');
  home.flush();
  assert.equal(home.read('view'), 'welcome');
  assert.deepEqual(home.saved('express'), result);
  home.action('start-full');
  assert.equal(home.state().mode, 'full');
  assert.equal(home.state().handled, 0);

  const reset = atResult(result);
  reset.action('next');
  reset.action('new-run', false);
  const fresh = reset.state();
  assert.equal(fresh.handled, 0);
  assert.equal(fresh.phase, 'case');
  reset.tick(1000);
  reset.flush();
  assert.equal(reset.state(), fresh);
  assert.equal(reset.read('currentElapsed()'), 1000);
  assert.equal(reset.dialog.open, false);
});

test('regular dialogs pause active case time and their delayed close events resume without advancing', () => {
  const app = mount();
  app.action('start-full');
  app.tick(5500);
  const original = app.state();
  app.action('handbook');
  app.tick(100000);
  assert.equal(app.read('currentElapsed()'), 5500);
  app.dismiss('escape', false);
  app.tick(1000);
  assert.equal(app.read('currentElapsed()'), 5500);
  app.flush();
  app.tick(500);
  assert.equal(app.state(), original);
  app.choose('risk');
  assert.equal(app.state().pendingResult.elapsedMs, 6000);
});
