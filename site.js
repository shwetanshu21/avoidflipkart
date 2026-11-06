// Small, optional enhancements for the documented casebook. The game is separate.
(() => {
  'use strict';
  const canonical = 'https://avoidflipkart.com/';
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = document.getElementById('progress-bar');
  const chapterLinks = [...document.querySelectorAll('.chapter-nav a')];
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  let scheduled = false;

  function updateReadingPosition() {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${height > 0 ? Math.max(0, Math.min(1, window.scrollY / height)) : 0})`;
    let current = chapters[0];
    for (const chapter of chapters) {
      if (chapter.getBoundingClientRect().top <= 170) current = chapter;
    }
    for (const link of chapterLinks) {
      if (current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    scheduled = false;
  }
  function queueReadingPosition() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateReadingPosition);
  }
  window.addEventListener('scroll', queueReadingPosition, { passive: true });
  window.addEventListener('resize', queueReadingPosition, { passive: true });
  window.addEventListener('load', queueReadingPosition, { once: true });
  document.fonts?.ready.then(queueReadingPosition);
  updateReadingPosition();

  const mobileNav = document.querySelector('.mobile-nav');
  mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { mobileNav.open = false; }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobileNav?.open) {
      mobileNav.open = false;
      mobileNav.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', event => {
    if (mobileNav?.open && !mobileNav.contains(event.target)) mobileNav.open = false;
  });

  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const orderRows = [...document.querySelectorAll('tr[data-status]')];
  const filterStatus = document.getElementById('filter-status');
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    orderRows.forEach(row => { row.hidden = filter !== 'all' && row.dataset.status !== filter; });
    filterButtons.forEach(control => control.setAttribute('aria-pressed', String(control === button)));
    const count = orderRows.filter(row => !row.hidden).length;
    filterStatus.textContent = filter === 'all' ? `Showing all ${count} orders.` : filter === 'delivered' ? `Showing ${count} orders reported delivered.` : `Showing ${count} orders without confirmed delivery as of 6 November 2026.`;
    queueReadingPosition();
  }));

  const phraseEntries = [...document.querySelectorAll('.phrase-list details')];
  let phraseIndex = Math.max(0, phraseEntries.findIndex(entry => entry.open));
  phraseEntries.forEach((entry, index) => entry.addEventListener('toggle', () => {
    if (entry.open) phraseIndex = index;
    queueReadingPosition();
  }));
  document.getElementById('next-translation')?.addEventListener('click', () => {
    phraseIndex = (phraseIndex + 1) % phraseEntries.length;
    phraseEntries.forEach((entry, index) => { entry.open = index === phraseIndex; });
    const current = phraseEntries[phraseIndex];
    document.getElementById('translation-status').textContent = current.querySelector('.translation > p').textContent;
    current.querySelector('summary').focus({ preventScroll: true });
    current.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'instant' : 'smooth' });
    queueReadingPosition();
  });

  const shareStatus = document.getElementById('share-status');
  const copyDialog = document.getElementById('share-fallback');
  const copyValue = document.getElementById('share-value');
  let toastTimer;
  function showCopyFallback(text) {
    copyValue.value = text;
    if (!copyDialog.open) copyDialog.showModal();
    copyValue.focus();
    copyValue.select();
  }
  async function copyShareText(text) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      clearTimeout(toastTimer);
      shareStatus.textContent = 'Copied. No concerned team required.';
      toastTimer = setTimeout(() => { shareStatus.textContent = ''; }, 3200);
    } catch {
      // Do not announce success when permission is denied or copying is unavailable.
      showCopyFallback(text);
    }
  }
  document.querySelectorAll('[data-share-target]').forEach(button => button.addEventListener('click', () => {
    const target = button.dataset.shareTarget;
    const url = canonical + (target ? `#${encodeURIComponent(target)}` : '');
    const text = [button.dataset.shareText, url].filter(Boolean).join('\n\n');
    copyShareText(text);
  }));

  const readingTime = document.getElementById('reading-time');
  const fullAccount = ['casebook', 'emails', 'verdict'].map(id => document.getElementById(id)?.textContent || '').join(' ');
  if (readingTime) readingTime.textContent = `${Math.max(1, Math.ceil(fullAccount.trim().split(/\s+/).length / 200))} min read`;
  document.querySelectorAll('[data-enhanced]').forEach(control => { control.hidden = false; });

  // Retain the read-only casebook tools for compatible agent browsers.
  const context = document.modelContext || navigator.modelContext;
  if (!context || typeof context.registerTool !== 'function') return;
  const sections = ['story', 'orders', 'phrasebook', 'casebook', 'emails', 'simulator', 'verdict', 'questions', 'about', 'case-story'];
  const controller = new AbortController();
  function register(tool) {
    try {
      const pending = context.registerTool(tool, { signal: controller.signal });
      pending?.catch?.(() => {});
    } catch { /* A browser without this optional API still has the entire casebook. */ }
  }
  register({
    name: 'get_case_summary',
    description: 'Return a factual summary of the documented Avoid Flipkart customer account, reviewed through 6 November 2026.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute() {
      return { content: [{ type: 'text', text: 'Avoid Flipkart is an independent account of five Flipkart orders placed in September and October 2026. The mouse was delivered six days late, the extender seven days late, and Microsoft 365 licences were reported delivered thirty days after ordering (not a claim of thirty days overdue). The Acer stand was cancelled on 4 November, with a replacement expected on 11 November. No stand or trimmer delivery was confirmed through 6 November. The missing stand’s delivery complaint was marked resolved; the delivered mouse’s issue remained open. Customer Support replied, but no named leadership recipient replied in the captured correspondence. The commentary and phrasebook translations are satire. Source: https://avoidflipkart.com/' }] };
    }
  });
  register({
    name: 'open_case_section',
    description: 'Scroll to a named section of the customer casebook.',
    inputSchema: { type: 'object', properties: { section: { type: 'string', enum: sections } }, required: ['section'], additionalProperties: false },
    execute(args) {
      const id = sections.includes(args?.section) ? args.section : 'orders';
      const element = document.getElementById(id);
      if (!element) return { content: [{ type: 'text', text: 'Section not found.' }], isError: true };
      element.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'instant' : 'smooth' });
      return { content: [{ type: 'text', text: `Opened ${id} at ${canonical}#${id}` }] };
    }
  });
  register({
    name: 'get_career_game',
    description: 'Return the URL of CLOSED, a fictional customer-care career game with seven ranks and 840 cases, separate from the documented casebook.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute() {
      return { content: [{ type: 'text', text: 'Play CLOSED at https://avoidflipkart.com/game/ — a fictional satire in which increasingly absurd excuses earn promotions from customer support to Walmart CEO.' }] };
    }
  });
})();
