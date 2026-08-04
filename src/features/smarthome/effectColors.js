/**
 * Farbvorschau zu einem Effektnamen.
 *
 * Warum überhaupt geraten: Die Datenquelle liefert zu einer Szene ausschließlich
 * `id` und `name` – kein Bild, keine Farbwerte, keine URL (geprüft in der
 * Integration am 04.08.2026: kein einziges Feld dafür). Die Kachelbilder der
 * Hersteller-App stammen aus deren interner API und sind über Home Assistant
 * nicht erreichbar. Eine Liste aus 243 reinen Namen ist aber unbenutzbar: man
 * sieht einer Zeile „Karst Cave" nicht an, ob sie blau oder orange leuchtet.
 *
 * Deshalb wird der Name gedeutet. Das ist bewusst eine Ausnahme von der Regel
 * „nichts über das konkrete Gerät annehmen": gedeutet werden keine Hersteller,
 * Modelle oder entity_ids, sondern gewöhnliche englische Wörter („Forest",
 * „Sunset", „Christmas"), die jede Integration gleich schreibt. Trifft nichts
 * zu, entsteht aus dem Namen ein stabiler, aber blasser Verlauf – erkennbar
 * wiedererkennbar, ohne eine Aussage über die echte Farbe vorzutäuschen.
 *
 * Rein und ohne React, damit die Zuordnung ohne Browser prüfbar bleibt.
 */

/**
 * Wortmarken und ihre Farben, von der spezifischsten zur allgemeinsten.
 *
 * Die Reihenfolge ist bedeutsam, weil per Teilzeichenkette gesucht wird:
 * „Night Light" enthält „night", „Blue Sky & White Clouds" enthält „sky" und
 * „blue". Das Speziellere muss zuerst stehen, sonst gewinnt das Allgemeinere.
 */
const SPACE = ['#0b1026', '#3b2f7a', '#9775fa', '#e5dbff'];
const WATER = ['#0b4f6c', '#1098ad', '#66d9e8'];
const GREENERY = ['#1b4332', '#2f9e44', '#8ce99a'];
const WARM_LIGHT = ['#8a3b12', '#e8590c', '#ffc078'];
const NEUTRAL_WHITE = ['#f8f9fa', '#ffffff', '#e9ecef'];
const PARTY = ['#f03e3e', '#be4bdb', '#22b8cf'];
const LOVE = ['#c2255c', '#f783ac', '#ffdeeb'];
const SAND = ['#d9a441', '#e8c99b', '#8a6d3b'];

const PALETTES = [
  // --- Mehrwortnamen zuerst: sie enthalten Wörter aus späteren Gruppen ---
  [['blue sky', 'clear sky'], ['#4dabf7', '#a5d8ff', '#ffffff']],
  [['colorful clouds'], ['#ffa8c5', '#c3a6ff', '#8fd3ff']],
  [['night light'], ['#2b2a4a', '#6b5ca5', '#ffd8a8']],
  [['hot air balloon'], ['#e8590c', '#ffd43b', '#74c0fc']],
  [['love gift box', 'love seesaw', 'love bird', 'i love you'], LOVE],
  [['crab cheer', 'crab', 'clownfish', 'goldfish', 'devil fish', 'dolphin', 'whale', 'octopus', 'seashell'], WATER],
  [['seasonal'], ['#f08c00', '#40c057', '#4dabf7']],
  [['art gallery', 'painting exhibition', 'mona lisa', 'van gogh', 'mondrian', 'vitruvian', 'son of man'], ['#7f5539', '#c9a227', '#e9e2d0']],

  // --- Tageszeiten und Himmel ---
  [['starry sky', 'starry', 'meteor', 'twinkle', 'constellation'], ['#0b1a3a', '#2a3f6f', '#e8eeff']],
  [['sunrise', 'morning', 'dawn', 'wake up', 'aufwachen', 'get up'], ['#ff9f43', '#ffd8a8', '#fff3bf']],
  [['sunset glow', 'sunset', 'dusk', 'twilight', 'evening'], ['#ff6b35', '#f7567c', '#6a4c93']],
  [['sunshine', 'sunny', 'radiance', 'gleam', 'shiny', 'luminous', 'glitter'], ['#ffd43b', '#ffe066', '#fff9db']],
  [['moonlight', 'moon'], ['#1b2440', '#7a8bb5', '#e9efff']],
  [['afternoon'], ['#ffc078', '#ffe8cc', '#fff4e6']],
  [['night'], ['#0f1830', '#243b6b', '#4a5f9e']],
  [['skyline', 'sky'], ['#4dabf7', '#748ffc', '#d0ebff']],
  [['aurora'], ['#20c997', '#4dabf7', '#9775fa']],
  [['lightning', 'flash', 'thunder'], ['#f8f9fa', '#a5d8ff', '#343a40']],
  [['rainbow', 'spectrum'], ['#fa5252', '#fd7e14', '#fab005', '#40c057', '#4dabf7', '#7950f2']],

  // --- Weltraum ---
  [['mars'], ['#7f2704', '#e8590c', '#ffc9a8']],
  [['jupiter'], ['#8a5a2b', '#d9a441', '#f5e6c8']],
  [["saturn"], ['#c9a227', '#e8c99b', '#6b5b3e']],
  [['venus'], ['#d9a441', '#ffe8cc', '#f5c16c']],
  [['mercury'], ['#6c757d', '#adb5bd', '#dee2e6']],
  [['neptune', 'uranus'], ['#0b4f8a', '#22b8cf', '#c5f6fa']],
  [['earth'], ['#1864ab', '#2f9e44', '#e7f5ff']],
  [
    [
      'milky', 'galaxy', 'nebula', 'universe', 'cosmos', 'cosmic', 'interstellar',
      'lightspeed', 'space walk', 'spaceship', 'astronaut', 'satellite',
      'solar system', 'planet', 'ufo', 'station', 'sphinx',
    ],
    SPACE,
  ],

  // --- Natur, Wasser, Landschaft ---
  [
    [
      'deep sea', 'sea bottom', 'sea lighthouse', 'ocean', 'clear lake', 'lake',
      'stream', 'ripple', 'rippling', 'wave', 'flow', 'underwater', 'submarine',
      'diver', 'swimming pool', 'beach', 'swan', 'water drop', 'cruise', 'swimming',
    ],
    WATER,
  ],
  [['glacier', 'ice drinks', 'snowing', 'snow', 'ice'], ['#c5f6fa', '#99e9f2', '#e7f5ff']],
  [['downpour', 'rain', 'rustling leaves', 'dense fog', 'fog', 'mist'], ['#495057', '#748ffc', '#adb5bd']],
  [['karst cave', 'cave', 'profound', 'mysterious', 'suspense', 'tunnel'], ['#1a1a2e', '#3d5a80', '#98c1d9']],
  [
    ['gobi desert', 'desert', 'haystack', 'cornfield', 'green wheat field', 'pyramid', 'taj mahal', 'stonehenge'],
    SAND,
  ],
  [['volcano', 'fire', 'torch', 'passion', 'red mist', 'too hot', 'hot'], ['#7f1d1d', '#f03e3e', '#ff922b']],
  [
    [
      'forest', 'tree shadow', 'grassland', 'garden', 'herbal', 'field',
      'dandelion', 'meadow', 'lush', 'sprouting', 'camping', 'windmill',
    ],
    GREENERY,
  ],
  [['cherry blossom', 'blossom', 'bloom', 'flower', 'peach', 'berry', 'spring'], ['#ffa8c5', '#ffd6e7', '#69db7c']],
  [['firefly'], ['#132a13', '#7bc950', '#ffe066']],
  [['mount fuji', 'lighthouse'], ['#1864ab', '#e7f5ff', '#f8f9fa']],
  [['summer'], ['#ffd43b', '#40c057', '#4dabf7']],
  [['winter'], ['#e7f5ff', '#a5d8ff', '#ffffff']],
  [['fall', 'autumn', 'thanksgiving'], ['#d9480f', '#f08c00', '#ffc078']],

  // --- Tiere ---
  [
    [
      'elephant', 'frog', 'crocodile', 'dachshund', 'kitten', 'puppy', 'chicken',
      'turkey', 'snake', 'birdie', 'eevee', 'furball', 'whack', 'mole', 'piggy',
    ],
    ['#8a6d3b', '#e8c99b', '#40c057'],
  ],

  // --- Anlässe ---
  [['christmas', 'reindeer', 'sleigh', 'santa', 'gift', 'new years'], ['#c92a2a', '#2f9e44', '#ffffff']],
  [
    [
      'halloween', 'pumpkin', 'ghost', 'witch', 'skeleton', 'graveyard', 'spooky',
      'black cat', 'headless', 'trick or treat', 'monster', 'fright', 'bat',
      'devil', 'russian nesting',
    ],
    ['#d9480f', '#5f3dc4', '#212529'],
  ],
  [['easter', 'dyed eggs', 'rabbit'], ['#ffd8a8', '#b2f2bb', '#d0bfff']],
  [["saint patrick"], ['#2b8a3e', '#51cf66', '#ffd43b']],
  [
    ['valentine', 'unspoken love', 'romantic', 'romance', 'heartbeat', 'heart', 'longing', 'sweet', 'kiss', 'proposal', 'tenderness', 'maiden'],
    LOVE,
  ],
  [["mother", "father", 'super dad', 'best mom', 'family', "children's day", 'care', 'blessing', 'healing'], ['#f783ac', '#ffd8a8', '#d0bfff']],
  [['birthday', 'candy', 'carnival', 'carousel', 'toy brick', 'surprise'], ['#ff8787', '#ffd43b', '#74c0fc']],
  [['firework'], ['#212529', '#f783ac', '#ffd43b', '#74c0fc']],

  // --- Sport, Spiel, Bewegung ---
  [
    [
      'dance party', 'disco', 'party', 'game', 'fight', 'boxing', 'archery',
      'billiards', 'fencing', 'soccer', 'table tennis', 'weightlifting',
      'running', 'riding', 'trampoline', 'pushups', 'dunking', 'super bowl',
      'sports', 'puck', 'strike', 'action', 'poker', 'frisbee', 'swing',
      'racing', 'speed racer', 'highway', 'city', 'road', 'cheers', 'excited',
      'exciting', 'joyful', 'energic', 'vibrate', 'beat', 'cadence', 'drumbeat',
    ],
    PARTY,
  ],

  // --- Stimmungen und Alltag ---
  [['candlelight', 'candle', 'coffee', 'warm'], WARM_LIGHT],
  [
    ['meditation', 'soothing', 'relax', 'peaceful', 'quiet', 'mild', 'sleep', 'counting sheep', 'breathe', 'yoga', 'spritual', 'spiritual'],
    ['#364fc7', '#748ffc', '#dbe4ff'],
  ],
  [['dreamlike', 'dreamland', 'dream', 'fascination', 'literary', 'reading'], ['#5f3dc4', '#b197fc', '#f3d9fa']],
  [['energetic', 'happy', 'cheerful', 'optimistic', 'release', 'refreshing', 'cool'], ['#f59f00', '#ffd43b', '#40c057']],
  [['angry', 'alarm'], ['#7f1d1d', '#f03e3e', '#ffa8a8']],
  [['cry', 'separation', 'sad'], ['#364fc7', '#5c7cfa', '#adb5bd']],
  [['movie', 'cinema', 'comedies', 'documentaries', 'war films', 'photo shoot'], ['#0b1a3a', '#495057', '#f59f00']],
  [['science fiction', 'cyberpunk', 'cyber', 'neon', 'technology', 'tech', 'code'], ['#0c8599', '#f06595', '#22b8cf']],
  [['siren'], ['#c92a2a', '#1971c2', '#ffffff']],
  [
    ['graffiti', 'colorful', 'color split', 'ribbon', 'stacking', 'rhythm', 'piano', 'gradient', 'vivid', 'spin', 'circle', 'square', 'layering', 'recombination', 'stippling'],
    ['#f03e3e', '#fab005', '#40c057', '#4dabf7'],
  ],

  // --- Neutrale Weißtöne ---
  [['white light', 'illumination', 'work', 'leisure', 'standard'], NEUTRAL_WHITE],

  // --- Reine Farbwörter zuletzt: sie stecken in vielen zusammengesetzten Namen ---
  [['blue'], ['#1864ab', '#4dabf7', '#d0ebff']],
  [['red'], ['#a51111', '#f03e3e', '#ffc9c9']],
  [['green'], ['#2b8a3e', '#51cf66', '#d3f9d8']],
];

/** Verlauf für einen Namen, dem keine Wortmarke entspricht. */
function fallbackPalette(name) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  const hue = hash % 360;
  // Bewusst blass und wenig gesättigt: der Verlauf macht die Kachel
  // unterscheidbar und wiedererkennbar, behauptet aber keine Lichtfarbe.
  return [
    `hsl(${hue} 32% 62%)`,
    `hsl(${(hue + 35) % 360} 28% 72%)`,
    `hsl(${(hue + 70) % 360} 30% 58%)`,
  ];
}

/**
 * Farben zu einem Effektnamen.
 * @param {string} name
 * @returns {{colors: string[], known: boolean}} `known: false` heißt, dass die
 *   Farben aus dem Namen abgeleitet und nicht gedeutet sind.
 */
export function effectPalette(name) {
  const needle = (name ?? '').toLowerCase();

  for (const [keywords, colors] of PALETTES) {
    if (keywords.some((keyword) => needle.includes(keyword))) {
      return { colors, known: true };
    }
  }

  return { colors: fallbackPalette(needle), known: false };
}

/**
 * Fertiger CSS-Verlauf für die Vorschaufläche.
 * Bei einer einzelnen Farbe entsteht eine Fläche, sonst harte Streifen –
 * ein weicher Verlauf über fünf Regenbogenfarben wird sonst zu Matsch.
 */
export function effectGradient(name) {
  const { colors, known } = effectPalette(name);

  if (colors.length === 1) return { background: colors[0], known };

  const step = 100 / colors.length;
  const stops = colors
    .map((color, index) => `${color} ${index * step}%, ${color} ${(index + 1) * step}%`)
    .join(', ');

  return { background: `linear-gradient(135deg, ${stops})`, known };
}
