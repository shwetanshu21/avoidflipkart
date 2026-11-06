# CLOSED cartoon cast art

## Production asset

- Main artwork: `closed-office-crew.webp` — 1536 × 1024, 3:2, 342,756 bytes.
- Responsive artwork: `closed-office-crew-960.webp` — 960 × 640, 138,926 bytes.
- Generated with the built-in image-generation tool, then encoded as WebP with Sharp (quality 88 for the full image; quality 86 for the responsive size). No illustration edits or compositing were performed after generation.
- The characters are original designs. The visual direction uses midcentury television cel animation, a hand-painted backdrop, and the site's navy/blue/amber palette.
- Every image is local; the game does not contact an image service during play.

## Scene API

`renderCrew()` renders the full cast for the welcome scene. `renderOffice(levelIndex, mood)` renders a compact scene with the current floor and optional HR/laughter reactions. `renderHR()` renders the HR officer. `renderAvatar(levelIndex, initials)` renders the support agent at ranks 0–3 and executive at ranks 4–6. Portraits use CSS clipping of the same illustration so the characters stay consistent. All return HTML strings; import `scene.css` alongside them.

The image paths are resolved relative to `scene.js`, so they also work when the game is deployed under a project path. Portraits have accessible labels. Main artwork has a descriptive alternative. Decorative effects are hidden from assistive technology, and all animation respects reduced-motion preferences.

## Final generation prompt

Use case: illustration-story.
Asset type: production-ready wide hero illustration and character art for CLOSED, a satirical browser game about a fictional Indian online-shopping customer support office. Produce one beautiful original cartoon illustration, landscape 3:2 composition, high resolution.
Scene: a funny Indian corporate call-centre office after dark, with navy walls, royal-blue office furniture, warm amber desk lamps, stacks of unlabeled parcel boxes and overstuffed paper files, a simple city skyline through windows. Charming hand-painted background with subtle gouache texture and geometric perspective. The primary palette must be deep navy #071a2d, navy #082442, royal blue #08284f and golden amber #ffc62c, with cream paper and warm medium-brown skin tones. Strong readable silhouettes.
Subject: exactly three original human cartoon characters, all entirely invented, in a coordinated cast. Medium-wide three-quarter body group composition behind a low desk, with all three faces generously sized and clearly visible. At left, a stern Indian HR woman with a dark bun, angular cat-eye spectacles, raised eyebrow, navy-and-amber sari and a clipboard held across her chest; she is unimpressed. In the centre, the main support agent: a lanky charismatic Indian man with a swept black pompadour, enormous expressive eyes, long angular nose, warm brown skin, rolled cream shirt sleeves, loose amber necktie and an oversized vintage telephone headset. He leans toward the viewer with a completely unjustified confident grin, one hand making a tiny reassuring gesture. At right, a pompous older Indian executive: round potbelly, neatly groomed theatrical black moustache, slick hair, navy suit and wide golden amber tie; he looks delighted with himself, holding a coffee cup with his pinky out. Their expressions and poses tell the joke.
Style: highly appealing 1950s–1960s television cel-animation character design, classic limited-animation sensibility: bold slightly varied dark ink outlines, angular noses, clean exaggerated mouth shapes, expressive brows, flat warm cel colors, strong tasteful shape language, deliberately simplified anatomy, carefully composed staging. Background painted with textured brushwork; characters crisp and graphic over it. Original character designs, not any existing copyrighted cartoon characters. Sophisticated funny editorial animation, not generic vector clipart, not anime, not 3D, not photorealistic. Faces and hands should be clean and intentional. Rich, cohesive professionally art-directed finish.
Composition: characters fill most of frame; floor and low desk occupy bottom 20%, heads are within central 60% height, head positions approximately 23%, 50%, and 78% across width. Keep all faces unobstructed and well separated for later CSS portrait crops. Leave a small calm navy margin at top. Warm amber rim light and blue ambient evening light. No legible text, no letters, no numbers, no logos, no watermark, no interface graphics.
