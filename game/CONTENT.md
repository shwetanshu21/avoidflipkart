# Case library and conversation curation

This game contains **840 playable cases: 120 at each of seven career levels**.
Each level has 20 original situations, each with six separately written developments and evidence records. Developments are self-contained, so the shuffled full-career deck can present them in any order. The response framing varies by development; the underlying complaint, bureaucratic explanation, relevant remedy and absurd corporate action belong to the particular situation.

## Express career

`EXPRESS_CASE_IDS` in `content.js` selects exactly two conversations per level, for a complete 14-case career. These use 56 individually written replies. An additional curated conversation—the imaginary basement and pincode—appears in the full case library.

| Level | First conversation | Second conversation |
| --- | --- | --- |
| Customer Care | Mouse requiring an airport boarding pass | Flagship phone replaced by lemon soap |
| Senior Support | Pigeon disqualifies an unboxing video | OTP treated as six satisfied customers |
| Team Lead | Complaint transferred around the office | Hold music promoted into management |
| Grievance Officer | Missing incident simultaneously closed | Invoice requested from a no-reply inbox |
| Operations Director | Warehouse exists only in a presentation | Delivery pincode stranded at Silk Board |
| Flipkart CEO | Paid access to unanswered support | CEO caught in the same impossible return rule |
| Walmart CEO | Pickup locker placed in a lake | Returned air fryers orbiting Earth |

The selected IDs are stable, use the same four mechanical choice kinds as the full deck, and retain deterministic shuffled answer order. Visible replies are customer-facing prose. Scoring, choice kinds and action labels are separate data fields for the engine; the conversation interface must not display them before the player responds.

## Creative reference

The supplied text attachment was headed as a 750-case archive, but its contents combine illustrative cases, partial examples and generation matrices rather than 750 fully expanded incident records. It was used as a creative brief. The game does **not** claim to have imported 750 complete records.

`reference-cases.js` contains original adaptations of the most useful premises, with additional authored developments and conversations. It replaces 15 scenario slots in place, preserving the existing case IDs. The source attachment itself is not distributed. Famous quotations, drawing-based compensation jokes and recognisable borrowed form numbers have not been reproduced.

Indian details are part of the incidents: a housing-society watchman witnesses delivery; an OTP is misused as acceptance; a tiffin allowance follows a complaint around the office; a pincode works at checkout but fails in delivery; a letter travels by speed post; a parcel acquires residency at Silk Board. Later levels expand the same fictional bureaucracy into global operations.

## Metadata and incentives

Every case supplies a `customerMessage`, `orderId`, `priorEscalations` and `internalMemo` as well as the existing body, evidence, subject and four replies. Curated first contacts have independently written conversation text and internal memos. Other developments use their authored complaint and evidence with shared stage framing.

The game's deliberate inversion is consistent: ordinary denials and referrals earn corporate points; the most outrageous answer earns the most and reduces management heat further. Actually helping the customer loses corporate points and raises management heat. These are fictional game incentives, not statements about actual company policies.

All customers, incidents, internal documents and policies are fictional. The case text is bundled locally and works without a content service.

## Verification

Run `node --test game/content.test.js`. Tests check counts, stable IDs, six distinct developments per situation, unique evidence, the four choice kinds, shuffled answer positions, correct incentive directions, 14 curated Express cases, 56 unique Express replies, required conversation metadata, readable length limits and the absence of pre-answer scoring hints.
