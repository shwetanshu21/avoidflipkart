---
name: Avoid Flipkart
description: An independent customer account told through a public-information board and an editorial casebook.
colors:
  navy: "#082442"
  deep: "#071a2d"
  header-blue: "#08284f"
  board-blue: "#071a2c"
  light: "#edf8fc"
  paper: "#f4fafc"
  board-label: "#c4dff4"
  ink: "#071646"
  casebook-ink: "#0b2142"
  muted-ink: "#41637e"
  rule: "#a5c0ce"
  board-rule: "#174369"
  amber: "#ffc62c"
  amber-hover: "#ffdc6a"
  amber-focus: "#ffd55e"
  note-paper: "#fbefd8"
typography:
  display:
    fontFamily: "Murecho, sans-serif"
    fontSize: "clamp(48px, 6.38vw, 98px)"
    fontWeight: 700
    lineHeight: 0.94
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Murecho, sans-serif"
    fontSize: "clamp(2.2rem, 4.35vw, 4.3rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Murecho, sans-serif"
    fontSize: "clamp(24px, 2.2vw, 33px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Murecho, sans-serif"
    fontSize: "clamp(17px, 1.22vw, 19px)"
    fontWeight: 400
    lineHeight: 1.6
  board-data:
    fontFamily: "Chakra, sans-serif"
    fontSize: "clamp(17px, 1.78vw, 28px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.09em"
rounded:
  note: "8px"
  button: "9px"
  board: "10px"
  circle: "50%"
spacing:
  compact: "16px"
  group: "24px"
  column: "28px"
  section-gutter: "clamp(20px, 3.9vw, 76px)"
  section-block: "clamp(76px, 9vw, 140px)"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "#10151c"
    rounded: "{rounded.button}"
  button-primary-hover:
    backgroundColor: "{colors.amber-hover}"
  navigation:
    backgroundColor: "{colors.header-blue}"
    textColor: "{colors.light}"
  arrival-board:
    backgroundColor: "{colors.board-blue}"
    textColor: "{colors.board-label}"
    rounded: "{rounded.board}"
  evidence-note:
    backgroundColor: "{colors.note-paper}"
    textColor: "#111820"
    rounded: "{rounded.note}"
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

## Overview

**Creative North Star: "The Arrival Board"**

The visual world borrows the clarity of an airport information system: deep enamel blues, luminous amber information, cool white lettering, and a large board that makes a changing timeline easy to scan. Humanist type keeps the voice direct and readable; the dry humour belongs in the account rather than in ornamental UI.

The board gives way to a spacious editorial casebook with pale blue paper, strong section headings, ruled rows, and readable prose. Airport and parcel imagery is illustrative and identified as such. The approved direction rejects a generic complaint-card landing page.

**Key Characteristics:**

- A public-information board turns dates and outcomes into the visual signature.
- Enamel blue, cool paper, and amber create a clear light–dark rhythm.
- Murecho supplies the editorial voice; Chakra gives dates and figures their board character.
- Thin rules and generous spacing organize evidence without a stack of cards.
- Illustrative imagery supports the story without presenting itself as documentary evidence.

## Colors

The palette is cool and inky, with amber reserved for actions and information that needs to register quickly.

### Primary

- **Enamel Navy** (`navy`, `header-blue`, `deep`): the page foundation, navigation, and dark section backgrounds. Related dark blues create subtle separation between adjacent planes.
- **Board Blue** (`board-blue`, `board-rule`): the board surface and its crisp divisions.

### Secondary

- **Signal Amber** (`amber`, `amber-hover`, `amber-focus`): primary actions, board dates, and visible keyboard focus. The hover state lightens the action rather than changing its role.

### Neutral

- **Cool Light** (`light`, `board-label`): text and labels on dark surfaces, with a softer blue for supporting board information.
- **Casebook Paper** (`paper`, `note-paper`): pale reading surfaces; the warmer note surface distinguishes a supporting callout.
- **Editorial Ink** (`ink`, `casebook-ink`, `muted-ink`): dark headings and reading text, with muted blue for dates and supporting information.
- **Fine Rule** (`rule`): light-surface row dividers.

**The Signal Rule.** Use amber to call attention to actions, dates, and key information; keep long-form reading surfaces calm and cool.

## Typography

**Display and body font:** Murecho, with a sans-serif fallback. **Board and figure font:** Chakra, with a sans-serif fallback. Both are served locally by the site.

The pairing balances a humanist editorial voice with the square, public-display character of figures. Large headings are compact and confident; paragraph text has a more open rhythm.

### Hierarchy

- **Display:** the large, tightly set page title uses the `display` token; on smaller screens it changes to `clamp(43px, 11vw, 70px)`.
- **Headline:** the `headline` token introduces the major casebook sections, with headings limited to about `15ch`.
- **Title:** the `title` token identifies individual correspondence entries and other substantial blocks.
- **Body:** the `body` token supports reading, with prose generally constrained to `70ch` and paragraphs set at `1.6` line-height.
- **Board data:** the `board-data` token sets dates and values in uppercase, tracked Chakra. Board headers use uppercase Murecho with wider tracking; ordinary prose stays in sentence case.

**The Board Voice Rule.** Use Chakra and wide tracking for compact dates and values; keep board labels and extended explanations in Murecho.

## Layout

The opening flows in normal document order: a full-width dark header, then a hero whose illustrative scene sits behind a left-aligned message and the board (up to `68vw` wide), then a pale overview. Nothing is absolutely positioned, so longer copy never collides with the board. The casebook below changes to fluid editorial sections with `clamp(20px, 3.9vw, 76px)` horizontal gutters and generous vertical space. Common reading sections use a `5fr 7fr` split and a `7%` gap; rows use thin dividers and a narrower metadata column.

At `1100px` and below, the board spans the full width and the overview stacks. At `800px` and below, the navigation becomes a disclosure, multi-column editorial content stacks, and the four overview steps become two columns. The board can scroll horizontally at intermediate widths. At `600px` and below, each board row becomes a two-column labeled record, with the item and status spanning the row. Keep the board's relationship between item, promised or ordered date, reported delivery, and status clear at every size.

## Elevation & Depth

The site is predominantly flat. Depth comes from the dark-to-light section rhythm, restrained tonal planes, borders, and the gradient that protects text over the illustrative scene. The mobile navigation menu alone uses a shadow (`0 10px 24px rgba(0, 0, 0, 0.22)`) to separate an open overlay from the page.

## Shapes

The board and primary buttons are softly rounded rectangles (`10px` and `9px` respectively), while the supporting notice panel uses an `8px` radius. Step icons sit in circles. Elsewhere, straight one-pixel rules and open rows carry structure; corners and shadows are not used to turn every piece of content into a card.

## Components

- **Primary action:** amber, dark text, bold Murecho, and a minimum `44px` height. Hover lightens the fill and lifts the button by `2px`; reduced-motion preferences remove the transition and lift.
- **Navigation:** deep-blue bar with a bold wordmark, inline desktop links, and a compact amber action. The mobile menu is a native disclosure with a minimum `44px` summary target.
- **Arrival board:** a rounded dark surface with a title strip, uppercase column labels, ruled table, amber date and status values, and linked item names. Its mobile form retains labels and reading order.
- **Overview steps and supporting note:** circular pale-blue icon fields organize a short sequence; a warm, rounded panel distinguishes the priority-support note.
- **Editorial rows:** order and message entries use generous vertical padding, a metadata column, and horizontal rules instead of individual cards.
- **Question disclosure:** native `details` and `summary` elements make each question an accessible, ruled row.

Links and the scrollable board receive a `3px` amber focus outline with a `4px` offset. Board rows animate into place only when reduced motion is not requested; the effect uses a short upward reveal and small stagger.

## Do's and Don'ts

### Do:

- **Do** preserve the clear distinction between board data, editorial prose, and supporting notes.
- **Do** use amber for meaningful actions and compact high-signal information.
- **Do** retain visible keyboard focus, semantic table relationships, and reduced-motion behavior.
- **Do** label illustrative imagery so it cannot be mistaken for the documented events.

### Don't:

- **Don't** replace the board and ruled editorial structure with a generic complaint-card layout.
- **Don't** use the board's uppercase, tracked figure style for long paragraphs.
- **Don't** remove the responsive labels that connect each mobile date to its meaning.
