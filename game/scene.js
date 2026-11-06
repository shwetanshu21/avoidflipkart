/* Original, dependency-free vector art. Every floor is drawn locally. */
let sceneNumber = 0;

const FLOORS = [
  { title: 'Customer care', wall: '#243c42', shirt: '#94cbb6', sign: 'CLOSE. REPEAT.', detail: 'Your first cubicle. The plant has more job security.' },
  { title: 'Senior customer care', wall: '#284047', shirt: '#94cbb6', sign: 'PLEASE HOLD.', detail: 'A second screen. Twice the opportunity to do nothing.' },
  { title: 'Team lead', wall: '#294047', shirt: '#5d9b96', sign: 'TEAM: RESOLVED.', detail: 'Your own team, your own chart, somebody else’s problem.' },
  { title: 'Grievance office', wall: '#343e46', shirt: '#a5c8b5', sign: 'MAIL NOT FOUND.', detail: 'A grievance office full of correspondence that officially does not exist.' },
  { title: 'Operations director', wall: '#2d4246', shirt: '#487976', sign: 'UP AND TO THE RIGHT.', detail: 'The view has improved. The service has not.' },
  { title: 'Flipkart CEO', wall: '#294047', shirt: '#324c56', sign: 'VISION. NO REFUNDS.', detail: 'A corner office, a gold trophy, and a very distant customer.' },
  { title: 'Walmart CEO', wall: '#253f50', shirt: '#315775', sign: 'GLOBAL. UNRESOLVED.', detail: 'The worldwide headquarters of closing things. A quiet, evil laugh fills the room.' },
];

function skyline(level) {
  const buildings = [
    [64, 169, 35, 76], [98, 137, 36, 108], [130, 155, 30, 90],
    [160, 115, 43, 130], [201, 158, 35, 87], [233, 134, 45, 111],
    [276, 104, 38, 141], [310, 161, 36, 84], [344, 132, 43, 113],
  ];
  return buildings.map(([x, y, w, h], i) => {
    const windows = [];
    for (let row = 0; row < Math.floor((h - 12) / 15); row++) {
      for (let col = 0; col < Math.floor((w - 8) / 10); col++) {
        if ((i * 7 + row * 3 + col * 5 + level) % 4 !== 0) {
          const fill = (row + col + i) % 3 === 0 ? '#d6ac75' : '#6a9492';
          windows.push(`<rect x="${x + 7 + col * 10}" y="${y + 10 + row * 15}" width="3" height="5" fill="${fill}" opacity="${i % 2 ? '.7' : '.4'}"/>`);
        }
      }
    }
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${i % 2 ? '#172f3c' : '#193440'}"/><path d="M${x},${y}h${w}" stroke="#38555b"/>${i === 3 || i === 6 ? `<path d="M${x + w / 2},${y}v-15" stroke="#5e7777"/><circle cx="${x + w / 2}" cy="${y - 16}" r="1.5" fill="#ef987d"/>` : ''}${windows.join('')}</g>`;
  }).join('');
}

function paperStack(x, y, layers = 4, color = '#f6f1e6') {
  return `<g transform="translate(${x} ${y})">${Array.from({ length: layers }, (_, i) => `<path d="M0,${-i * 4}l38,-8 29,15 -39,9Z" fill="${color}" stroke="#758681" stroke-width=".8"/>`).join('')}<path d="M17,${-layers * 4 + 7}l22,-4m-15,8 15,-3" stroke="#8d9b91" stroke-width="1.5"/></g>`;
}

function parcels(level) {
  if (level === 3) {
    return `<g class="scene-mail-pile">${paperStack(41, 464, 10)}${paperStack(64, 438, 8, '#e7d9bd')}${paperStack(100, 474, 7)}<g transform="translate(43 398) rotate(-10)"><rect width="49" height="31" fill="#f6f1e6" stroke="#9aab9f"/><path d="m0,0 25,18L49,0M0,31 18,16m31,15L32,16" fill="none" stroke="#9aab9f"/><rect x="38" y="3" width="8" height="10" fill="#d98a72"/></g></g>`;
  }
  return `<g class="scene-parcels">
    <path d="m39,431 44,-11 37,21 -45,13Z" fill="#cb9c6d"/><path d="m39,431 36,23v40l-36,-23Z" fill="#a77553"/><path d="m75,454 45,-13v39l-45,14Z" fill="#b98559"/>
    <path d="m55,427 17,-4 36,22 -17,5Z" fill="#e5be82"/><path d="m91,450 17,-5v16l-17,5Z" fill="#d6ac70"/>
    <path d="m55,389 43,-10 26,16 -42,11Z" fill="#dcb184"/><path d="m55,389 27,17v30l-27,-18Z" fill="#b98660"/><path d="m82,406 42,-11v30l-42,11Z" fill="#c59268"/>
    <path d="m72,385 12,-3 26,17 -12,4Z" fill="#f0cf9d"/><path d="m98,403 12,-4v12l-12,4Z" fill="#dcb983"/>
    <path d="m91,420 16,-4m-16,7 11,-3" stroke="#825d47" stroke-width="2"/>
    <path d="m48,454 9,6m-9,-1 9,6" stroke="#775241" stroke-width="2"/>
  </g>`;
}

function pinboard(level) {
  if (level >= 4) {
    return `<g>
      <rect x="441" y="104" width="137" height="108" rx="2" fill="#152b34" stroke="#94795c" stroke-width="5"/>
      <rect x="450" y="113" width="119" height="90" fill="#e6e0ce"/>
      <path d="M467,173v-27m22,27v-17m23,17v-42m23,42v-57" stroke="#75998d" stroke-width="12"/>
      <path d="m465,147 23,-9 24,1 30,-26" fill="none" stroke="#d48c62" stroke-width="3"/><path d="m530,113 12,0v12" fill="none" stroke="#d48c62" stroke-width="3"/>
      <text x="509" y="190" text-anchor="middle" fill="#3d5755" font-size="6" font-family="monospace" letter-spacing="1.6">PROBLEMS RECLASSIFIED</text>
      <path d="M448,215h122" stroke="#0f222b" stroke-width="4"/>
    </g>`;
  }
  return `<g>
    <rect x="442" y="105" width="136" height="108" rx="2" fill="#97785a" stroke="#c09a72" stroke-width="5"/>
    <path d="M449,112h122v94H449Z" fill="#8c7158"/>
    <g transform="rotate(-6 475 151)"><rect x="452" y="119" width="46" height="59" fill="#e6dfcb"/><circle cx="474" cy="122" r="3" fill="#a34f40"/><text x="475" y="141" text-anchor="middle" fill="#405652" font-size="7" font-family="monospace">${level === 3 ? 'NO MAIL' : 'HANG IN'}</text><text x="475" y="151" text-anchor="middle" fill="#405652" font-size="7" font-family="monospace">${level === 3 ? 'FOUND.' : 'THERE.'}</text><path d="M464,166h22" stroke="#aab0a0" stroke-width="2"/></g>
    <g transform="rotate(5 538 158)"><rect x="510" y="130" width="53" height="66" fill="#efb389"/><circle cx="537" cy="134" r="3" fill="#344e49"/><path d="M519,148h32m-32,7h26m-26,7h29m-29,7h19" stroke="#9c795f" stroke-width="2"/><path d="m520,180 8,6 20,-13" fill="none" stroke="#4d7464" stroke-width="3"/></g>
    <path d="m463,192 30,-5" stroke="#ded4bb" stroke-width="9"/><circle cx="468" cy="191" r="2" fill="#c28162"/>
  </g>`;
}

function plant(level) {
  return `<g class="scene-plant">
    <ellipse cx="578" cy="437" rx="44" ry="11" fill="#0d1b24" opacity=".55"/>
    <path d="M576,384c-6,-35 12,-70 4,-106m-3,80-27,-41m28,19 26,-42" fill="none" stroke="#608a75" stroke-width="4"/>
    <path d="M579,303c-31,-7-41,-29-31,-41 25,2 34,18 31,41Z" fill="#76aa86"/>
    <path d="M578,322c20,-32 45,-36 52,-24-5,21-24,29-52,24Z" fill="#4b9278"/>
    <path d="M576,351c-31,-2-48,-19-42,-33 25,-4 41,11 42,33Z" fill="#78b08b"/>
    <path d="M579,278c-12,-31-1,-51 12,-50 13,20 4,38-12,50Z" fill="#4d8e78"/>
    <path d="M582,371c20,-26 39,-27 48,-15-11,18-24,20-48,15Z" fill="#5a9a7e"/>
    ${level >= 2 ? '<path d="M578,327c-8,-36 4,-50 17,-47 8,21 2,36-17,47Z" fill="#83b891"/>' : ''}
    <path d="M550,383h56l-8,46c-10,8-28,8-39,0Z" fill="${level >= 5 ? '#d8b682' : '#c98d6a'}"/>
    <ellipse cx="578" cy="383" rx="28" ry="8" fill="#e2ad80"/><ellipse cx="578" cy="382" rx="22" ry="5" fill="#3b3c32"/>
    <path d="M559,395h39m-37,7h36" stroke="#b67d5e" stroke-width="2" opacity=".6"/>
    <path d="m557,390 6,35" stroke="#e5b38a" stroke-width="4" opacity=".7"/>
  </g>`;
}

function employee(level, mood) {
  const executive = level >= 4;
  const laugh = level === 6 || mood === 'laugh' || mood === 'promotion';
  return `<g class="scene-employee ${laugh ? 'scene-laughing' : ''}">
    <path d="M367,330v85m-26,10 26,-10 30,15m-30,-15-19,25" fill="none" stroke="#15252c" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="340" cy="426" rx="8" ry="5" fill="#0c1920"/><ellipse cx="397" cy="431" rx="8" ry="5" fill="#0c1920"/>
    <rect x="351" y="232" width="83" height="101" rx="18" fill="${executive ? '#8a7352' : '#385458'}" stroke="#101f28" stroke-width="5"/>
    <rect x="360" y="244" width="65" height="73" rx="12" fill="${executive ? '#4f5345' : '#426566'}"/>
    <path d="M344,307h-9v28h30m67,-28h9v28h-28" fill="none" stroke="#1a2e34" stroke-width="6" stroke-linejoin="round"/>
    <path d="M369,274h31c17,5 24,20 25,48l-68,10c-8,-27-7,-48 12,-58Z" fill="${FLOORS[level].shirt}"/>
    <path d="m374,276 9,16 10,-17" fill="#e4dfc9"/>
    ${executive ? '<path d="m383,291-6,7 3,26 10,-3-2,-22Z" fill="#e5a17a"/><path d="m368,278 14,15-15,13m31,-29-14,16 15,10" fill="none" stroke="#5d7975" stroke-width="2"/>' : '<path d="m372,278 11,30 14,-30" fill="none" stroke="#e7bb6c" stroke-width="3"/><rect x="376" y="304" width="17" height="22" rx="2" fill="#f4edda"/><rect x="380" y="308" width="9" height="7" fill="#71a18e"/><path d="M380,320h9" stroke="#7f9186"/>'}
    <g class="scene-head">
      <path d="M377,266v13c5,7 13,7 18,0v-14" fill="#cd916f"/>
      <path d="M365,230c0,-18 44,-20 49,-1v25c0,16-11,23-22,23-15,0-26,-10-26,-24Z" fill="#edb58b"/>
      <path d="M362,239v-16l9,-14h29l14,10 3,22-8,-3-2,-16-10,3-17,-2-8,9v12Z" fill="#273337"/>
      <path d="m369,218 9,-10 20,1 9,7-22,4Z" fill="#354447"/>
      <path d="M414,239c9,-4 10,12 0,14" fill="#dda27b"/>
      <path d="M377,244h5m15,0h5" stroke="#38413a" stroke-width="3" stroke-linecap="round"/>
      ${executive ? '<path d="M371,238h15v12h-15Zm20,0h15v12h-15Zm-5,4h5" fill="none" stroke="#4a5c50" stroke-width="2"/>' : ''}
      ${laugh ? '<path d="M382,256q10,17 20,-1Z" fill="#714a3d"/><path d="M384,257h15l-2,4h-11Z" fill="#f6f1e6"/>' : mood === 'help' || mood === 'audit' ? '<path d="M383,260q7,-6 14,0" fill="none" stroke="#8a5748" stroke-width="2" stroke-linecap="round"/>' : '<path d="M384,258q7,5 13,-1" fill="none" stroke="#9b6350" stroke-width="2" stroke-linecap="round"/>'}
      <path d="M362,243v-11c0,-28 58,-26 58,2v10" fill="none" stroke="#122c35" stroke-width="5"/>
      <rect x="357" y="236" width="10" height="20" rx="4" fill="#182e35"/><rect x="360" y="239" width="4" height="13" rx="2" fill="#719b8b"/>
      <path d="M362,252v8l17,4" fill="none" stroke="#1b353b" stroke-width="3" stroke-linecap="round"/><rect x="376" y="261" width="8" height="5" rx="2" fill="#182d32"/>
    </g>
  </g>`;
}

function globe() {
  return `<g class="scene-globe" transform="translate(98 295)">
    <ellipse cx="0" cy="27" rx="29" ry="7" fill="#0b202b" opacity=".6"/>
    <path d="M-17,22H18m-17,-1v-13" fill="none" stroke="#c4a26d" stroke-width="5" stroke-linecap="round"/>
    <path d="M-24,-43c36,-20 64,39 22,52" fill="none" stroke="#d8b883" stroke-width="3"/>
    <circle cy="-20" r="28" fill="#437a8e" stroke="#87c3c1" stroke-width="1.5"/>
    <path d="m-22,-32 12,-9 8,6-5,9 8,5-5,11-13,-3-7,-8Zm23,-13 14,4 7,10-10,3-5,10-8,-4 5,-10Zm3,30 12,1 4,9-9,12-8,-7Z" fill="#9cc4a3"/>
    <ellipse cy="-20" rx="14" ry="28" fill="none" stroke="#d4e8ce" stroke-width=".8" opacity=".35"/><path d="M-26,-30h52m-54,20h54M0,-48V8" stroke="#d4e8ce" stroke-width=".8" opacity=".35"/>
    <path d="M-24,-43 25,6" fill="none" stroke="#efd2a0" stroke-width="2" opacity=".8"/>
  </g>`;
}

/** Returns a self-contained, accessible SVG. Recognised moods include idle, help, audit, laugh and promotion. */
export function renderOffice(levelIndex = 0, mood = 'idle') {
  const level = Number.isFinite(levelIndex) ? Math.max(0, Math.min(6, Math.floor(levelIndex))) : 0;
  const safeMood = ['idle', 'happy', 'deny', 'deflect', 'risk', 'help', 'laugh', 'promotion', 'audit'].includes(mood) ? mood : 'idle';
  const floor = FLOORS[level];
  const id = `office-${level}-${++sceneNumber}`;
  const watching = safeMood === 'help' || safeMood === 'audit';
  const rain = Array.from({ length: 19 }, (_, i) => `<path d="m${75 + (i * 47) % 307},${70 + (i * 31) % 170} -7,20"/>`).join('');
  return `<svg class="office-scene scene-level-${level} scene-mood-${safeMood}" viewBox="0 0 640 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${id}-title ${id}-desc" focusable="false">
    <title id="${id}-title">${floor.title} office</title>
    <desc id="${id}-desc">${floor.detail} An original illustrated night office, with a headset-wearing employee, a glowing computer, city windows, paperwork, and a potted plant.</desc>
    <defs>
      <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#102635"/><stop offset="1" stop-color="#325059"/></linearGradient>
      <linearGradient id="${id}-wall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${floor.wall}"/><stop offset="1" stop-color="#1e333c"/></linearGradient>
      <linearGradient id="${id}-light" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f4d7a1" stop-opacity=".13"/><stop offset="1" stop-color="#f4d7a1" stop-opacity="0"/></linearGradient>
      <clipPath id="${id}-window"><rect x="63" y="70" width="331" height="176"/></clipPath>
    </defs>

    <path d="M0,0H640V520H0Z" fill="#101b25"/>
    <path d="M0,0H640V350H0Z" fill="url(#${id}-wall)"/>
    <path d="M0,0H31V354L0,380Z" fill="#172b34"/>
    <path d="M31,0H640V20H31Z" fill="#30464b" opacity=".55"/>
    <path d="M0,350H640V520H0Z" fill="#182b34"/>
    <path d="M0,351H640" stroke="#0f222c" stroke-width="8"/>
    <path d="m0,455 250,-103m-81,168 328,-168m-58,168 201,-106M0,399h640M0,483h640" fill="none" stroke="#34505a" stroke-width="1" opacity=".36"/>
    <path d="m96,408 282,-31 194,85-284,51Z" fill="#254344"/>
    <path d="m119,409 255,-26 174,77-256,44Z" fill="none" stroke="#43625c" stroke-width="1.5" stroke-dasharray="5 6"/>
    <ellipse cx="335" cy="440" rx="182" ry="43" fill="#0b1b24" opacity=".35"/>

    <rect x="55" y="62" width="347" height="196" rx="2" fill="#142c35" stroke="#4c6567" stroke-width="2"/>
    <rect x="63" y="70" width="331" height="176" fill="url(#${id}-sky)"/>
    <g clip-path="url(#${id}-window)">
      <circle cx="337" cy="100" r="17" fill="#e0d6b1"/><circle cx="330" cy="94" r="17" fill="#142c3a"/>
      <path d="M104,95h2m28,20h2m51,-31h2m61,22h2m46,-18h2" stroke="#d3e2ca" stroke-width="2" opacity=".6"/>
      ${skyline(level)}
      <g class="scene-rain" fill="none" stroke="#a1c3c1" stroke-width="1" opacity=".24">${rain}</g>
      <path d="M65,71H156L64,235Zm132,0h38L133,246H95Z" fill="#b4d4cb" opacity=".045"/>
    </g>
    <path d="M172,68v180M283,68v180M61,190H396" stroke="#17333b" stroke-width="8"/>
    <path d="M176,70v176M287,70v176M65,194H393" stroke="#516c6c" stroke-width="1" opacity=".5"/>
    <path d="M51,251H407v10H51Z" fill="#536c68"/><path d="M51,261H407v7H51Z" fill="#1a3037"/>
    <path d="M414,64v204m-3,0h7" stroke="#7c9282" stroke-width="1.5"/><circle cx="414" cy="270" r="3" fill="#baa27c"/>

    <g class="scene-ceiling-light">
      <path d="M235,0v47" stroke="#101e27" stroke-width="4"/><path d="m212,46-15,21h76l-16,-21Z" fill="#244047" stroke="#4a6666" stroke-width="1.5"/>
      <path d="M199,67h72" stroke="#f2cc92" stroke-width="4"/><path d="m201,69-79,270H347L269,69Z" fill="url(#${id}-light)"/>
    </g>
    <g class="scene-clock">
      <circle cx="535" cy="58" r="23" fill="#122b33"/><circle cx="535" cy="58" r="19" fill="#d6dac4"/><circle cx="535" cy="58" r="15" fill="none" stroke="#aebca8" stroke-width=".6"/>
      <path d="M535,42v3m0,26v3m-16,-16h3m26,0h3" stroke="#576e62" stroke-width="1.5"/><path d="M535,58 526,52" stroke="#3d5d52" stroke-width="2.5" stroke-linecap="round"/>
      <path class="scene-clock-hand" d="M535,58V46" stroke="#bd7f5d" stroke-width="1.5"/><circle cx="535" cy="58" r="2" fill="#3d5d52"/>
    </g>
    ${pinboard(level)}
    <g class="scene-sign"><rect x="441" y="235" width="139" height="30" rx="2" fill="#192e35" stroke="#566b60"/><text x="510" y="254" text-anchor="middle" fill="#bad2b3" font-size="7.4" font-family="monospace" letter-spacing=".7">${floor.sign}</text></g>

    ${level >= 2 ? `<g class="scene-shelf"><path d="M63,302h92v9H63Z" fill="#806c55"/><path d="M70,311v27m77,-27v27" stroke="#172d34" stroke-width="5"/>${level < 6 ? '<rect x="75" y="276" width="11" height="26" fill="#b57760"/><rect x="88" y="271" width="10" height="31" fill="#83a392"/><rect x="100" y="279" width="8" height="23" fill="#c7b88c"/>' : ''}${level >= 4 && level < 6 ? '<path d="M129,283v13m-9,4h18" stroke="#cfa967" stroke-width="5"/><path d="M119,269h21v9c0,15-21,15-21,0Z" fill="#debd7e"/><path d="M119,273h-7v8l11,4m17,-12h7v8l-11,4" fill="none" stroke="#bfa06b" stroke-width="3"/>' : ''}</g>` : ''}
    ${level === 6 ? globe() : ''}
    <g class="scene-bin"><ellipse cx="90" cy="376" rx="18" ry="6" fill="#0d1e27"/><path d="m73,375 5,33c6,4 17,4 23,0l6,-33" fill="#344a4d"/><path d="m79,383 3,20m8,-20v21m9,-21-3,20" stroke="#596d65" stroke-width="1"/><path d="m81,372-2,-12 10,5 5,-8 10,15" fill="#c7caba"/><ellipse cx="90" cy="376" rx="18" ry="6" fill="none" stroke="#6e8175" stroke-width="2"/></g>
    ${plant(level)}
    ${employee(level, safeMood)}

    <g class="scene-desk">
      <path d="M148,329v115l10,5 4,-114m326,47v88l12,7 4,-93" fill="#a57555"/>
      <path d="M159,437h19v7h-20m340,23h18v8h-18" fill="#253b3b"/>
      <path d="M116,307H398L532,382H250Z" fill="#d3a17b"/>
      <path d="M116,307 250,382v15L116,322Z" fill="#a77559"/>
      <path d="M250,382H532v15H250Z" fill="#b48360"/>
      <path d="M119,308H397L528,380H251Z" fill="none" stroke="#e4b891" stroke-width="1.5"/>
      <path d="m133,317 114,64m-80,-64 115,64m-83,-64 114,64m-82,-64 114,64m-82,-64 114,64m-82,-64 114,64m-82,-64 114,64" stroke="#af7f5d" stroke-width=".5" opacity=".25"/>
      <path d="M443,397h74v39h-74Z" fill="#806851"/><path d="M448,403h64v27h-64Z" fill="#96765a"/><path d="M471,413h17" stroke="#d3b287" stroke-width="3" stroke-linecap="round"/>
    </g>

    ${paperStack(145, 321, level === 3 ? 9 : level >= 4 ? 2 : 4)}
    ${level === 3 ? '<path d="m155,282 38,-8 26,15-39,9Z" fill="#c77566"/><path d="m165,284 20,-4" stroke="#efd9be" stroke-width="3"/>' : ''}
    <g class="scene-keyboard"><path d="m284,343 61,-8 34,17-61,10Z" fill="#20353b"/><path d="m287,343 58,-6 28,14-57,8Z" fill="#415b59"/><path d="m296,345 47,-6m-39,10 47,-6m-38,10 29,-4" stroke="#98b6a2" stroke-width="2" stroke-dasharray="4 3"/></g>
    <path d="M358,302 346,316 328,322 334,332 358,328 373,314" fill="${floor.shirt}"/><path d="m328,322-15,3 1,8 20,-1Z" fill="#edb58b"/>
    <path d="m410,303 17,24-14,16-12,-7 11,-12-12,-13" fill="${floor.shirt}"/><path d="m401,336-11,5 4,8 16,-6Z" fill="#edb58b"/>
    <ellipse cx="397" cy="350" rx="11" ry="5" fill="#687e71" transform="rotate(16 397 350)"/><path d="m394,345 4,5" stroke="#b2c1a8"/>

    <g class="scene-monitor">
      <ellipse cx="274" cy="340" rx="32" ry="7" fill="#8d775e" opacity=".45"/>
      <path d="M267,315v21l-19,7 39,-2 14,-7-20,-2v-19" fill="#29424a"/><path d="m249,343 38,-2 14,-7v4l-13,8-39,2Z" fill="#172d35"/>
      <path d="m206,245 112,-12 7,5v84l-113,13-6,-5Z" fill="#102731"/><path d="m212,247 113,-12v87l-113,13Z" fill="#253f48" stroke="#4c6866"/>
      <path d="m219,254 98,-11v68l-98,12Z" fill="${watching ? '#442f32' : '#173c43'}"/>
      <path d="m220,255 96,-10v12l-96,11Z" fill="${watching ? '#69433e' : '#2b5557'}"/>
      <circle cx="227" cy="261" r="1.5" fill="#e8a67d"/><circle cx="233" cy="260" r="1.5" fill="#bdcc9a"/><circle cx="239" cy="260" r="1.5" fill="#80b69b"/>
      <path d="m229,279 37,-4m-37,12 27,-3m-27,11 47,-5m-47,13 30,-4" stroke="#6e9d91" stroke-width="2" opacity=".75"/>
      <path class="scene-screen-cursor" d="m266,305 7,-1" stroke="#9ce0b4" stroke-width="2"/>
      <g class="scene-screen-check"><path d="m283,269 25,-3v30l-25,3Z" fill="${watching ? '#6e423c' : '#305c55'}"/>${watching ? '<path d="M296,273v12m0,4v2" stroke="#f4a577" stroke-width="2.5"/>' : '<path d="m288,282 5,4 10,-12" fill="none" stroke="#9ce0b4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'}</g>
      <circle cx="270" cy="323" r="1.5" fill="#9ce0b4"/>
    </g>
    ${level === 1 || level === 2 ? '<g class="scene-extra-monitor"><path d="M172,278v20m-10,2h27" stroke="#233a43" stroke-width="4"/><path d="m139,246 57,4v40l-57,-5Z" fill="#1a303a" stroke="#526b68" stroke-width="2"/><path d="m145,253 44,3v25l-44,-3Z" fill="#2b5052"/><path d="m152,261 30,2m-30,7 20,1" stroke="#87b199" stroke-width="2"/></g>' : ''}
    <g class="scene-mug">
      <ellipse cx="463" cy="366" rx="20" ry="5" fill="#947656" opacity=".45"/>
      <path d="M471,343h6c11,0 11,17-2,17h-5" fill="none" stroke="#b87354" stroke-width="5"/>
      <path d="M449,341h25v20c-2,8-23,8-25,0Z" fill="#e4a178"/><ellipse cx="461.5" cy="341" rx="12.5" ry="4" fill="#f5c497"/><ellipse cx="461.5" cy="341" rx="9" ry="2.5" fill="#644b3a"/>
      <path d="M453,347v10" stroke="#f3bc92" stroke-width="2" stroke-linecap="round"/><path d="m459,352 2,3 6,-6" fill="none" stroke="#855d49" stroke-width="1.5"/>
      <g class="scene-steam" fill="none" stroke="#d5dfc8" stroke-width="1.5" stroke-linecap="round" opacity=".55"><path d="M457,331c-8,-8 5,-10 0,-18"/><path d="M467,333c-6,-7 6,-11 0,-17"/></g>
    </g>
    ${level >= 4 ? '<g class="scene-nameplate"><path d="m369,365 61,-8 9,18-62,9Z" fill="#1b343a"/><path d="m374,368 52,-7 5,10-52,9Z" fill="#c7aa77"/><path d="m382,371 36,-5m-34,8 26,-4" stroke="#635e4b" stroke-width="1.5"/></g>' : '<path d="m382,370 38,-5 7,4-39,6Z" fill="#4f5f55"/><path d="m384,370 29,-4" stroke="#d9c5a0" stroke-width="1.4"/>'}
    ${parcels(level)}

    ${level === 6 || safeMood === 'laugh' ? '<g class="scene-laugh" fill="#e5c69a" font-family="monospace" font-weight="bold"><text class="scene-ha scene-ha-one" x="436" y="227" font-size="13" transform="rotate(-9 436 227)">ha.</text><text class="scene-ha scene-ha-two" x="462" y="206" font-size="11" transform="rotate(9 462 206)">ha.</text><text class="scene-ha scene-ha-three" x="481" y="184" font-size="9" transform="rotate(-5 481 184)">HA.</text></g>' : ''}
    ${watching ? '<g class="scene-manager"><rect x="39" y="280" width="133" height="40" rx="4" fill="#24343a" stroke="#c38364"/><circle cx="57" cy="300" r="9" fill="#c38364"/><path d="M57,294v7m0,3v1" stroke="#24343a" stroke-width="2"/><text x="74" y="297" fill="#edc8a1" font-family="monospace" font-size="6.3">MANAGEMENT IS</text><text x="74" y="307" fill="#edc8a1" font-family="monospace" font-size="6.3">WATCHING.</text></g>' : ''}

    <path d="M1,1H639V519H1Z" fill="none" stroke="#f6f1e6" stroke-opacity=".035" stroke-width="2"/>
  </svg>`;
}

/** Tiny customer portrait for optional use alongside a case. Initials are escaped. */
export function renderAvatar(index = 0, initials = '?') {
  const colors = ['#b3d8bd', '#efb18a', '#b7c9d6', '#d9c3a4', '#d5b5aa', '#a9c6bc'];
  const safeIndex = Number.isFinite(index) ? Math.abs(Math.floor(index)) : 0;
  const color = colors[safeIndex % colors.length];
  const text = String(initials).slice(0, 3).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  return `<svg class="case-avatar" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><rect width="44" height="44" rx="14" fill="${color}"/><text x="22" y="27" text-anchor="middle" fill="#293c3c" font-family="monospace" font-size="14" font-weight="bold">${text}</text></svg>`;
}
