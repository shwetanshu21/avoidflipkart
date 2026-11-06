---
name: Avoid Flipkart
description: A satirical editorial cover, historical arrival board and documented customer casebook.
colors:
  navy: "#082442"
  deep: "#071a2d"
  blue: "#1264bd"
  light: "#edf8fc"
  amber: "#ffc62c"
  paper: "#f4f8f8"
  ink: "#0b2540"
  muted: "#50677b"
  rule: "#bdcdd3"
typography:
  display:
    fontFamily: "Murecho, sans-serif"
    fontSize: "clamp(62px, 6.7vw, 104px)"
    fontWeight: 700
    lineHeight: 0.99
  headline:
    fontFamily: "Murecho, sans-serif"
    fontSize: "clamp(34px, 4vw, 60px)"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Murecho, sans-serif"
    fontSize: "17px"
    lineHeight: 1.65
  board-data:
    fontFamily: "Chakra, sans-serif"
spacing:
  section-gutter: "clamp(22px, 5.2vw, 88px)"
  section-block: "clamp(68px, 7.7vw, 118px)"
---

# Design System: Avoid Flipkart

## CLOSED game extension

The playable game at `/game/` carries the site's original blue-and-yellow identity into a fictional customer-care office. The documented casebook retains the design system below. Keep fictional game conversations and policies visibly separate from that account.

### Palette and typography

Use deep navy `#071a2d` for the surrounding workspace, enamel navy `#082442` for the frame, royal blue `#1264bd` for the support application's header and selected folder, and signal yellow `#ffc62c` for primary actions, scores and focus. The monitor's reading surface is cool paper `#edf8fc`, with dark editorial ink `#0b2142`. These are the same blue, pale-paper and amber relationships as the original site; the game adds stronger blue application chrome.

Murecho carries the customer's message, response text and headings. Chakra carries compact labels, reference numbers, timers and performance figures. Keep long replies in sentence case, give them comfortable line height and allow their containers to grow. Both fonts are served locally.

### Original cartoon cast

The visual anchor is an original, generated retro cartoon illustration: a confident support agent in a headset, an unimpressed HR officer with a clipboard, and a delighted executive. Midcentury television-animation shapes, dark outlines and a painted office background supply expression without replacing the interface with decoration. The art uses navy, blue and amber, with warm skin tones and cream shirts.

The welcome screen shows the full cast. Employee portraits, HR reviews and later-rank reactions crop the same artwork so the characters remain consistent. Rank labels, lamp glow and laughter effects add restrained animation; the illustration is not a set of seven separate office scenes. Production images are local WebP assets in two sizes. [Artwork notes](game/assets/ART_DIRECTION.md) record their generation, provenance and rendering API.

### The monitor is the workplace

The main interaction takes place inside a physical monitor frame with a camera, bezel and stand. Its blue application header leads into an employee sidebar and an inbox. The sidebar holds the player portrait, rank, folders, promotion progress and an internal memo. The inbox presents the customer, order reference, prior escalations, subject, first-person message and expandable evidence. Four replies sit beneath it in the reply composer.

After sending, show the selected message as a sent reply, followed by the closure stamp, score change and consequences. The surrounding performance strip tracks the career without competing with the complaint. Career information, the handbook and sharing use native modal dialogs. The responsive layout simplifies the monitor and stacks the reply choices while preserving readable messages, the case context and keyboard access.

### Equal choices and delayed feedback

Every customer reply uses the same button style, type, border and prominence. Do not show kind labels, point previews, coloured answer categories, an empathy warning or a suggested choice before the player answers. Deterministic shuffling prevents a fixed button position from standing in for reading the case. The distinction between answers belongs in the prose; the effect becomes visible afterward.

Management heat means suspicion of employee competence. Genuine help raises heat and costs approval points; ridiculous closures cool heat, and the most absurd answer earns the highest base reward. Keep this inversion clear in the handbook and result feedback, without turning the reply composer into an answer key.

At 100% heat, the HR officer conducts three questions. Their options also have equal visual treatment. Collect all three responses before revealing the verdict: any empathetic answer ends the run with a termination report; a pass clears heat to zero and returns the player to the career. Pending HR reviews take precedence over promotion or victory celebrations.

### Modes, continuity and shareable results

The welcome screen offers two distinct entry points. Express is a complete 14-case career with two curated conversations at each of seven ranks and 56 individually written replies. Full Career draws from 840 cases, with 120 per rank, and uses point and closure thresholds for promotion. Express advances after two handled cases at each rank. Explain this difference at selection time and keep progress displays appropriate to the selected mode.

Each mode has its own version 2 browser save and restart action. Valid version 1 careers continue as Full Career. Preserve stable content IDs and restore the current case, result or HR question consistently so a reload does not change the decision being made. The supplied creative reference contains examples and matrices, not 750 expanded records; [content notes](game/CONTENT.md) explain the actual library and curation.

Sharing begins with an explicit player action. Offer the X post composer, native share sheet, copyable challenge and a downloadable 1200 × 630 PNG career or termination card. Use the same navy, yellow, Murecho and Chakra system for the card. Keep its score, closed-case count and rank readable. The player chooses what to publish; no action automatically posts a result.

### Motion and access

Retain visible amber focus, the skip link, semantic buttons, evidence disclosures, descriptive artwork alternatives and native dialog behaviour. Decorative marks and effects should be hidden from assistive technology. Honour reduced-motion preferences for scene effects, message arrivals, stamps, confetti and scrolling. Sound is optional and synthesized locally.

The timer counts active case time. Pause it for results, dialogs and hidden tabs; returning from a hidden tab requires an explicit resume. A slow reply forfeits speed rewards but does not automatically fail the case. Never use animation, colour or sound as the only carrier of a decision's outcome.

## Core casebook

### Cover and reading order

“Tomorrow. Now available daily.” leads a split editorial cover, paired with the existing airport illustration and a boarding-pass joke. The image is explicitly identified as an illustration. Two entry links offer the short summary and the full account. A horizontal chapter navigation follows the cover and becomes a scrollable strip on smaller screens.

The short version establishes the historical review date and three counts: five orders, three reported delivered, two without confirmed delivery. The arrival board then shows the five order timelines. Selected contradictions introduce the humor before the phrasebook, order files and correspondence. Practical questions and source notes explain the limitations of the records.

### Voice and evidence

Use original deadpan commentary, bureaucratic absurdity and precise reversals. Keep recorded quotes, dates and statuses visibly distinct from invented commentary. The phrasebook uses native disclosure elements and explicitly identifies every translation as satire. A promise of resolution is not an actual resolution; thirty days elapsed for the licences does not establish thirty days of lateness. Avoid claiming the support agent was a bot or that a later delivery was caused by an escalation.

The historical account is reviewed through 6 November 2026. Private correspondence and full identifiers remain outside the repository. Every order and correspondence entry has a stable, unique link. Keep the HTML, Markdown and APIs factually aligned.

### Palette, typography and layout

Deep navy, cool paper and amber create alternating sections. Murecho carries the cover and prose; Chakra carries compact labels and board figures. Fonts are self-hosted. Use large, compact headings, thin rules, generous margins and comfortable prose widths. The cover illustration, information board and dark correspondence section supply visual variety without obscuring the text.

At 800 pixels the major columns stack; at 560 pixels the arrival board becomes labeled rows. Buttons have generous targets and restrained corners. Keyboard focus is blue on light surfaces and amber on dark surfaces. The chapter bar and scroll offsets must leave anchored headings visible.

### Progressive interaction

All narrative text and native disclosures work without JavaScript. Enhancement adds order filtering, phrasebook cycling, reading progress and manual sharing. Filters announce their results, active chapter navigation exposes its current location, and a native dialog provides selectable text when clipboard copying is unavailable. Sharing opens a composer or copies text; it never automatically publishes. Respect reduced-motion preferences.

The separate game keeps its own styles, scripts, assets, rules and save data. The core page only provides the existing game description and entry link.

### Publication and review

Use a concise descriptive search title, a factual description and explicit social metadata. Connected structured data describes the site and article using the canonical production domain and the recorded review date. Keep historical dates accurate when making visual changes. `/docs/layout-preview.html` is a noindex developer surface for responsive inspection at common widths, not public navigation.
