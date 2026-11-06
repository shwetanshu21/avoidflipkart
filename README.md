# Avoid Flipkart

An independent, evidence-led customer account of delivery delays and support correspondence. This is a buildless static website made with HTML and CSS; the airport and product images are illustrations.

## CLOSED. — the game

![CLOSED game preview](docs/closed-preview.jpg)

**Play at [avoidflipkart.com/game/](https://avoidflipkart.com/game/).** The original casebook remains at the site root. The former support-chat demo has been replaced by an entry into the full game.

CLOSED is a deliberately backwards customer-care career simulator: increasingly ridiculous excuses earn corporate approval; actually helping a customer loses points and raises management heat. All game cases, people, dialogue and policies are fictional satire, separate from the documented casebook.

- Seven ranks: Customer Care Executive → Senior Support Executive → Team Lead → Grievance Officer → Operations Director → Flipkart CEO → Walmart CEO.
- 120 playable cases per rank, 840 total. Each rank contains 20 original scenarios with six separately authored developments and evidence. Developments are self-contained and can arrive in any order; four responses accompany every case.
- Deterministically shuffled queues without repeats until that rank's 120-case deck is exhausted.
- Fast closures within 25 seconds earn speed bonuses and build a multiplier up to ×3. Taking longer never fails a case; it only forfeits the speed bonus. The clock stops while reading the outcome.
- Helpful responses cost points and raise heat; absurd closures reduce it. At 100% heat, HR imposes a competence-audit penalty. Scores never drop below zero and earned promotions are retained.
- Promotions require both lifetime closures and approval points. Ten-case shifts carry rotating management memos and performance reviews.
- Seven animated original SVG offices, stamp feedback, optional synthesized sound, achievements, a recent-case record, and a final Walmart celebration after 20 global cases. Endless play remains available afterward.
- Automatic local saves, guarded restoration, keyboard controls, native accessible dialogs, and reduced-motion support. There is no backend, account, external AI call, analytics, or external asset dependency in the game.

### Controls

| Control | Action |
| --- | --- |
| Click/tap a reply, or **1–4** | Respond to the case |
| **Enter** on the result screen | Continue |
| **P** | Pause/resume |
| **M** | Toggle sound |
| **?** | Open the handbook |
| **Escape** | Close a dialog |

Switching away from the tab pauses the timer. Returning requires an explicit resume, so reading time is never silently consumed in the background. Progress is saved only in the current browser. Resetting a career requires confirmation in the game; it does not alter the documented casebook.

## Run locally

From a checkout of this repository, run `python -m http.server 4173` and open `http://localhost:4173/`. No package installation or build step is needed.

Alternatively, with Node.js 22 or newer, use `npm run dev` and open the printed URL. The development server accepts `--host` and `--port` arguments, e.g. `npm run dev -- --port 4173`. Visit `/game/` for the game. The local static servers do not emulate Vercel's serverless API or content-negotiation proxy.

### Verify

Run `npm test` with Node.js 22 or newer. No dependency installation is needed for the game or its tests. The built-in Node test runner checks the complete case library, scoring, combos, competence heat, promotions, no-repeat dealing, shift reviews, achievements, final victory, and save restoration. The existing Vercel deployment workflow runs these tests before building and deploying a push to `main`.

### Game source

| File | Responsibility |
| --- | --- |
| `game/content.js` | Authored scenarios, developments, responses, rank definitions and tips |
| `game/engine.js` | Pure, immutable state transitions, seeded dealing and validated saves |
| `game/app.js` | UI rendering, active-time tracking, storage, dialogs and input |
| `game/game.css` | Responsive interface, paper case files and effects |
| `game/scene.js`, `game/scene.css` | Original animated office illustrations |
| `game/audio.js` | Optional, locally synthesized effects |
| `game/*.test.js` | Dependency-free regression tests |

Adding a new scenario requires six distinct `development | evidence` entries and meaningful case-specific replies. Content tests enforce 120 cases per rank, unique IDs and complaints, complete choices, and the intended scoring direction. Keep published save compatibility in mind when changing IDs or score rules; bump the engine save version for breaking changes.

## Deploy and search metadata

The site is published at `https://avoidflipkart.com/`. The canonical URL, Open Graph/Twitter card (`og-image.jpg`, 1200×630), `Article` structured data, `sitemap.xml` and `robots.txt` all use that address; update them together if the domain changes. When content changes, update `dateModified`/`article:modified_time` in `index.html` and `lastmod` in `sitemap.xml`. After deployment, submit the sitemap in Google Search Console and Bing Webmaster Tools. Indexing and ranking are controlled by search engines.

Images are served as WebP. The full-resolution source PNGs are kept outside the repository.

The original correspondence, contact details, full order identifiers, and private case notes are not part of this repository. Font licenses are included alongside the self-hosted fonts in `assets/fonts/`.
