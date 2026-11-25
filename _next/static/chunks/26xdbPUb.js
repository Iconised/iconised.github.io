import{A as e,k as t}from"./Ceg0oLf2.js";import{C as n,F as r,M as i,N as a,bt as o,c as s,j as c}from"./wDoPzj63.js";var l=`const vec3 GOLD_DEEP = vec3(0.4, 0.22, 0.035);
const vec3 GOLD = vec3(0.92, 0.66, 0.14);
const vec3 GOLD_PALE = vec3(1.0, 0.88, 0.5);
const vec3 GOLD_FRONT = vec3(-0.3, 0.55, 1.0);
const float GLINT_EVERY = 5.0;
const float GLINT_RUN = 0.45;
float goldWorld(vec3 d) {
  float l = 0.3 + 0.7 * smoothstep(-0.5, 0.15, d.y);
  float card = (d.y - 0.26) / 0.11, line = (d.y + 0.32) / 0.045;
  l *= 1.0 - 0.6 * exp(-card * card);
  l += 0.5 * exp(-line * line);
  return l + 6.0 * pool(d, KEY, 60.0) + 3.0 * pool(d, RIM, 24.0) + 0.35 * pool(d, GOLD_FRONT, 5.0);
}
vec3 goldLit(float l, float facing) {
  vec3 colour = mix(mix(GOLD_DEEP, GOLD, smoothstep(0.0, 0.85, l)), GOLD_PALE, smoothstep(1.0, 3.5, l));
  return mix(colour, GOLD_PALE * min(l + 0.3, 1.2), pow(1.0 - facing, 5.0) * 0.5);
}
`,u=`precision highp float;
in vec2 vUv;
out vec4 fragColor;

// The profile galaxy: a clear glass orb with the person's photo inside it,
// and their fragments orbiting it, drawn in one pass, back to front. The
// fragments take one of five forms (uStyle): 0 the identity canvas's black
// liquid rocks, 1 glass tiles, 2 glass moons, 3 pieces of the orb's own
// glass, 4 pebbles. A special fragment (uKinds) is a glass tile whatever
// the form: 1 clear glass with a logo inside, 2 a partner's tile in fur.

uniform float uLens;     // tan(fov / 2)
uniform float uDistance; // the camera, this far back on z
uniform float uPixel;    // world units per canvas pixel at z = 0
uniform float uTime;     // seconds, for the liquid's swell
uniform float uFrost;    // how far a fragment's colour is taken towards white
uniform mat3 uStudio;    // the lights, in the camera's space
uniform int uStyle;
uniform int uCount;
uniform int uOrbSlot;    // the orb is drawn before this fragment (back to front)
uniform vec4 uDrops[20]; // each fragment's centre (xyz) and half its size (w), back to front
uniform vec4 uTints[20]; // its colour (rgb) and its icon's cell (a), which also seeds its shape
uniform vec3 uInks[20];  // its icon's colour
// [gradient] The release app's third change (scripts/generate-blank-galaxy.mjs):
// a tile or icon colour that is a two-stop gradient. Its first stop is
// uTints[i].rgb or uInks[i]; x is the tile's second stop as 0xRRGGBB (-1: one
// colour) and y its angle in radians, z and w the icon's.
uniform vec4 uBlends[20];
// [end gradient]
uniform mat3 uTurns[20]; // its turn, from the world into its own space
uniform float uKinds[20]; // 0 its form's, 1 clear glass, 2 fur
// [open] The release app's second change (scripts/generate-blank-galaxy.mjs):
// opening a fragment fades the rest away and the open one into its card.
uniform float uFades[20]; // each fragment's opacity, back to front
uniform float uOrbFade;   // the orb's
// [end open]
// [lock] The release app's fourth change (scripts/generate-blank-galaxy.mjs):
// a private fragment's lock badge (lockBadge()). x is its centre's offset from
// the tile's centre along both axes and y its radius, in half sizes; z how far
// it has scaled in about its centre (0: none, so not drawn); w how far from
// the tile's centre it and its shadow reach, in half sizes.
uniform vec4 uLocks[20];
// Its plane's height over the tile's middle (half sizes), the lock's box
// across the disc, and its shadow's drop and blur, of the disc's diameter.
uniform vec4 uLockShape;
uniform vec4 uLockFill; // the ground's glass, premultiplied
// The glass's white edge highlight, along the top-left to bottom-right
// diagonal, at its two ends (x) and at 20% and 80% of the way (y); the
// strength of its shadow (z).
uniform vec3 uLockEdge;
uniform vec4 uLockInk; // the lock's colour, and its stroke in Lucide's units
// [end lock]
uniform sampler2D uIcons; // the icons' signed distance, a row of cells (0.5 on a stroke's edge)
uniform float uCells;
uniform vec4 uOrb;       // the orb's centre and radius (0: no orb)
uniform sampler2D uAvatar; // the photo inside it, square
// [glint] The release app's one change (scripts/generate-blank-galaxy.mjs):
// the fragment prototype's hover glint and icon shift, on the hovered tile
// only (Design-Research/2026-10-21-fragment-prototype/source/js/fragment.js
// lines 107 and 207-209, main.js lines 392-393 and 482-484). In half sizes,
// x right and y up, as the face is read from outside it.
uniform int uHovered; // the hovered fragment's slot, back to front (-1: none)
uniform vec3 uGlint;  // its glint on the face (xy) and the glint's strength (z)
uniform vec2 uGlyph;  // its icon's shift across the face
// fragment.js's S: its tile's half width, the unit its p and uGlint are in.
const float GLINT_S = 0.44;
// [end glint]

const vec3 KEY = vec3(-0.55, 0.62, 0.56);
const vec3 RIM = vec3(0.8, 0.12, 0.6);
// A fragment's tile: a slab this deep for its width (both halves), its
// outline a rounded square, its edges rolled over in a power curve rather
// than a circle. The curve's bend starts at nothing where it meets the face,
// so the light runs on over the edge instead of stopping at a line. The roll
// reaches the full depth, so no flat strip is left on the sides, and the face
// swells a little at its middle.
const float DEPTH = 0.4;   // half the tile's depth, of half its width
const float EDGE = 0.4;    // how far in from the edge the roll reaches
const float CORNER = 0.05; // the outline's own corner inside the roll
const float DOME = 0.08;   // how far the face swells at its middle
const float CURVE = 3.0;   // the roll's power: 2 would be a circle
const float CELL = 128.0;
const float RANGE = 16.0;
const float NEAR = 2.2;   // the studio's distance, in half sizes, for flat faces
const float MOON = 0.9;   // a moon's radius, in half sizes
const float BEND = 2.1;   // the orb's shell a piece is cut from, in half sizes
const float SHELL = 0.1; // half a piece's thickness, in half sizes
const float PHOTO = 0.8;  // the photo's disc inside the orb, as a share of its radius
const float FUR = 0.34;   // a partner tile's fur, in half sizes
// The softbox the orb shows: high above and a little left, so its one small
// window sits near the rim, clear of the face.
const vec3 ORB_KEY = vec3(-0.4, 0.9, 0.15);
const float SHADOW_DROP = 1.25;
const float SHADOW_SOFT = 1.1;
const float SHADOW_DARK = 0.13;
const vec3 SHADOW = vec3(0.16, 0.12, 0.35);

float pool(vec3 s, vec3 towards, float spread) {
  return pow(max(dot(s, normalize(towards)), 0.0), spread);
}

// The studio the glass sees: white above, a soft lilac floor, four pastel
// pools and two softboxes brighter than white.
vec3 studio(vec3 d) {
  vec3 s = uStudio * d;
  vec3 colour = mix(vec3(0.8, 0.8, 0.88), vec3(1.0), smoothstep(-0.45, 0.5, s.y));
  colour *= 1.0 - 0.2 * exp(-s.y * s.y * 22.0);
  colour += vec3(0.3, 0.52, 1.0) * 0.3 * pool(s, vec3(-1.0, 0.25, 0.35), 3.0);
  colour += vec3(1.0, 0.38, 0.72) * 0.3 * pool(s, vec3(1.0, -0.1, 0.25), 3.0);
  colour += vec3(1.0, 0.76, 0.32) * 0.26 * pool(s, vec3(0.2, -1.0, 0.45), 3.0);
  colour += vec3(0.3, 0.92, 0.72) * 0.22 * pool(s, vec3(0.25, 0.55, -1.0), 3.0);
  colour += vec3(4.0) * pool(s, KEY, 110.0);
  colour += vec3(1.4) * pool(s, RIM, 26.0);
  return colour;
}

// Where a reflection from p (the fragment's centre at the origin) meets a
// studio this near, so a flat face never lights all at once.
vec3 nearStudio(vec3 p, vec3 mirror, float s) {
  float r = s * NEAR, b = dot(p, mirror);
  float t = -b + sqrt(max(b * b - dot(p, p) + r * r, 0.0));
  return normalize(p + mirror * t);
}

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

float softMin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// The identity canvas's fragment, after Drift's liquid quality: lumps and a
// bulge from its seed, three soft flat faces where it seems to have split
// off, and a slow swell.
float rockBody(vec3 dir, float seed) {
  vec3 q = dir + seed * vec3(2.3, 1.7, 3.1);
  float lobes = noise(q * 1.9 + vec3(0.0, uTime * 0.2, 0.0)) - 0.5;
  float bulge = noise(q * 0.9 + vec3(5.0, 1.0, 9.0)) - 0.5;
  float body = 1.0 + lobes * 0.24 + bulge * 0.28;
  for (int k = 0; k < 3; k++) {
    vec3 cell = vec3(seed * 7.0 + float(k) * 13.0, seed * 3.0 + float(k) * 5.0, float(k) * 11.0);
    vec3 normal = normalize(vec3(hash(cell), hash(cell + vec3(17, 0, 0)), hash(cell + vec3(0, 23, 0))) - 0.5 + 0.001);
    float facing = dot(dir, normal);
    if (facing > 0.001) body = softMin(body, (0.74 + 0.16 * hash(cell + vec3(0, 0, 29))) / facing, 0.06);
  }
  body += (noise(q * 1.3 + vec3(uTime * 0.14, uTime * 0.09, -uTime * 0.11)) - 0.5) * 0.12;
  return body;
}

// A non-negative vector's length in the CURVE-norm: never more than its
// length, so a march on it never oversteps.
float curveLength(vec2 v) {
  v = max(v, 0.0);
  float m = max(max(v.x, v.y), 1e-9);
  v /= m;
  return m * pow(pow(v.x, CURVE) + pow(v.y, CURVE), 1.0 / CURVE);
}
// [smooth] The release app's seventh change (scripts/generate-blank-galaxy.mjs):
// a tile's dome, as a share of DOME at r2 (its radius squared, in half
// sizes): (1 - r2 / 2)², smooth everywhere on the tile.
float smoothDome(float r2) {
  float u = max(1.0 - 0.5 * r2, 0.0);
  return u * u;
}
// [end smooth]

float slab(vec3 p, float s) {
  float e = s * EDGE, c = s * CORNER;
  vec2 q = abs(p.xy) - vec2(s - e - c);
  float outline = curveLength(q) + min(max(q.x, q.y), 0.0) - c;
  float dome = s * DOME * (1.0 - min(dot(p.xy, p.xy) / (s * s), 1.0));
  // [smooth] the smooth dome
  dome = s * DOME * smoothDome(dot(p.xy, p.xy) / (s * s));
  // [end smooth]
  vec2 w = vec2(outline, abs(p.z) - s * DEPTH - dome + e);
  return curveLength(w) + min(max(w.x, w.y), 0.0) - e;
}

// A piece of the orb's glass: a rounded square cut from a shell as curved
// as a sphere BEND half sizes round, its outer face towards +z.
float piece(vec3 p, float s) {
  float shell = abs(length(p - vec3(0.0, 0.0, -s * BEND)) - s * BEND) - s * SHELL;
  float r = s * 0.36;
  vec2 b = abs(p.xy) - vec2(s - r);
  float cut = length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - r;
  float e = s * 0.07;
  vec2 w = vec2(shell, cut) + e;
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - e;
}

// A pebble: a flattened stone, each one its own proportions and lumps.
float pebble(vec3 p, float s, float seed) {
  vec3 r = s * vec3(1.0, 0.8 + 0.12 * hash(vec3(seed, 1, 2)), 0.5 + 0.08 * hash(vec3(seed, 3, 4)));
  float k0 = length(p / r), k1 = length(p / (r * r));
  float d = k0 * (k0 - 1.0) / k1;
  d -= s * 0.035 * sin(p.x / s * 2.3 + seed) * sin(p.y / s * 1.9 + seed * 1.3);
  return d * 0.8;
}

// Fragment i's distance, in its own space.
float shape(vec3 p, float s, float seed, int kind) {
  if (kind != 0) return slab(p, s);
  if (uStyle == 0) {
    float r = length(p);
    return (r - s * 0.86 * rockBody(p / max(r, 1e-4), seed)) * 0.6;
  }
  if (uStyle == 1) return slab(p, s);
  if (uStyle == 2) return length(p) - s * MOON;
  if (uStyle == 3) return piece(p, s);
  return pebble(p, s, seed);
}

vec3 shapeNormal(vec3 p, float s, float seed, int kind) {
  const vec2 k = vec2(1.0, -1.0);
  float h = s * 0.003;
  return normalize(k.xyy * shape(p + k.xyy * h, s, seed, kind) + k.yyx * shape(p + k.yyx * h, s, seed, kind) +
    k.yxy * shape(p + k.yxy * h, s, seed, kind) + k.xxx * shape(p + k.xxx * h, s, seed, kind));
}

// The CURVE-norm's gradient at a non-negative vector (unnormalised), or the
// axis it is nearest when it is all negative.
vec2 curveGradient(vec2 v) {
  vec2 u = max(v, 0.0);
  float m = max(u.x, u.y);
  if (m <= 0.0) return v.x > v.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  return pow(u / m, vec2(CURVE - 1.0));
}

// The way out of a tile from a point outside it: the slab's gradient there.
vec3 slabOut(vec3 p, float s) {
  float e = s * EDGE, c = s * CORNER;
  vec2 q = abs(p.xy) - vec2(s - e - c);
  float outline = curveLength(q) + min(max(q.x, q.y), 0.0) - c;
  float r2 = dot(p.xy, p.xy) / (s * s);
  float dome = s * DOME * (1.0 - min(r2, 1.0));
  // [smooth] the smooth dome
  dome = s * DOME * smoothDome(r2);
  // [end smooth]
  vec2 g = curveGradient(vec2(outline, abs(p.z) - s * DEPTH - dome + e));
  vec2 across = sign(p.xy) * normalize(curveGradient(q)) * g.x + p.xy / s * (2.0 * DOME * step(r2, 1.0)) * g.y;
  // [smooth] the smooth dome's slope
  across = sign(p.xy) * normalize(curveGradient(q)) * g.x + p.xy / s * (2.0 * DOME * max(1.0 - 0.5 * r2, 0.0)) * g.y;
  // [end smooth]
  return normalize(vec3(across, sign(p.z) * g.y));
}

// A rounded square across a tile's face: negative inside it.
float faceSquare(vec2 xy, float size, float r) {
  vec2 b = abs(xy) - vec2(size - r);
  return length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - r;
}

// The icon's distance across a face, in world units (span: the cell's width).
float iconPlane(vec2 xy, float span, float cell) {
  vec2 uv = xy / span + 0.5;
  vec2 inside = clamp(uv, 0.0, 1.0);
  float outside = length((uv - inside) * span);
  float d = (textureLod(uIcons, vec2((cell + inside.x) / uCells, 1.0 - inside.y), 0.0).r - 0.5) * 2.0 * RANGE;
  return d * span / CELL + outside;
}

struct Hit {
  float t;
  float cover;
  vec3 p;
};

// Fragment i on the ray, marched a little way in so a clipped edge covers
// its pixel in part and every outline stays smooth.
Hit march(vec3 ro, vec3 rd, int i, float px) {
  Hit hit;
  hit.t = -1.0;
  hit.cover = 0.0;
  hit.p = vec3(0.0);
  float s = uDrops[i].w, seed = uTints[i].a;
  int kind = int(uKinds[i] + 0.5);
  vec3 o = uTurns[i] * (ro - uDrops[i].xyz), v = uTurns[i] * rd;
  float bound = s * 1.5 + px;
  float b = dot(o, v), h = b * b - dot(o, o) + bound * bound;
  if (h <= 0.0) return hit;
  h = sqrt(h);
  float t = -b - h, far = -b + h, nearest = 1e9, closest = t, at = -1.0;
  for (int k = 0; k < 56; k++) {
    float d = shape(o + v * t, s, seed, kind);
    if (d < nearest) {
      nearest = d;
      closest = t;
    }
    if (at < 0.0 && d < px * 0.25) at = t;
    if (d < -px * 0.5 || t > far) break;
    // [march] The release app's eighth change (scripts/generate-blank-galaxy.mjs):
    // leaving the surface, the ray is done; and its least step grows.
    if (nearest < px && d > nearest + px * 0.5) break;
    float least = px * ((at < 0.0 ? 0.25 : 0.5) + 0.1 * float(k));
    if (at >= 0.0 || d * 0.9 < least) {
      t += least;
      continue;
    }
    // [end march]
    t += at < 0.0 ? max(d * 0.9, px * 0.25) : px * 0.5;
  }
  hit.cover = clamp(0.5 - nearest / px, 0.0, 1.0);
  if (hit.cover <= 0.0) return hit;
  hit.t = at > 0.0 ? at : closest;
  hit.p = o + v * hit.t;
  return hit;
}

// A face's own coordinates, as read from outside it: the back face's are
// turned over, so its icon reads the right way round from behind.
vec2 faceXY(vec3 p) {
  return vec2(p.z < 0.0 ? -p.x : p.x, p.y);
}
// [gradient] A colour packed as 0xRRGGBB, back to 0 to 1 a channel. Every
// step is exact: the packed value is a whole number under 2^24, which a highp
// float holds, and each scale is by a power of two.
vec3 unpacked(float v) {
  float r = floor(v * (1.0 / 65536.0));
  float g = floor((v - r * 65536.0) * (1.0 / 256.0));
  return vec3(r, g, v - r * 65536.0 - g * 256.0) / 255.0;
}
// A gradient from one colour to a packed one, at an angle in radians (0
// towards the top, a quarter turn towards the right, as CSS's
// linear-gradient), at xy across a square span wide round the origin, as CSS
// runs one across a square box: 0 at the corner it starts from, 1 at the one
// it ends at. Mixed in sRGB, as the tiles' colours are and as CSS mixes.
vec3 gradientAt(vec3 from, float to, float angle, vec2 xy, float span) {
  vec2 d = vec2(sin(angle), cos(angle));
  float t = clamp(0.5 + dot(xy, d) / (span * (abs(d.x) + abs(d.y))), 0.0, 1.0);
  return mix(from, unpacked(to), t);
}
// [end gradient]
// [brand] The release app's fifth change (scripts/generate-blank-galaxy.mjs):
// a platform's own mark and colours (components/identity/brand-marks.ts).
// A fragment that wears one has its ink's second stop -2 (uBlends[i].z), and
// in its ink angle's place its tile's middle stop as 0xRRGGBB (-1: none).
// This is that tile's gradient, through its middle stop half way, as
// gradientAt() runs two.
vec3 brandGradientAt(vec3 from, float via, float to, float angle, vec2 xy, float span) {
  vec2 d = vec2(sin(angle), cos(angle));
  float t = clamp(0.5 + dot(xy, d) / (span * (abs(d.x) + abs(d.y))), 0.0, 1.0);
  return t < 0.5 ? mix(from, unpacked(via), t * 2.0) : mix(unpacked(via), unpacked(to), t * 2.0 - 1.0);
}
// [end brand]

// The printed icon and its soft shadow over a face's colour.
vec3 printed(vec3 colour, int i, vec2 xy, float span, float front, float soft) {
  if (front <= 0.0) return colour;
  float cell = uTints[i].a;
  float ink = clamp(0.5 - iconPlane(xy, span, cell) / soft, 0.0, 1.0) * front;
  // [brand] a platform's mark is printed as supplied: in full, and with no
  // shadow under it
  if (uBlends[i].z < -1.5) return mix(colour, uInks[i], ink);
  // [end brand]
  float under = iconPlane(xy + vec2(-0.025, 0.035) * span, span, cell);
  float shadow = (1.0 - smoothstep(-span * 0.01, span * 0.045 + soft, under)) * front;
  colour = mix(colour, colour * 0.8, shadow * 0.55 * (1.0 - ink));
  // [gradient] an icon in a gradient: its ink at the point, across its cell
  if (uBlends[i].z >= 0.0) return mix(colour, gradientAt(uInks[i], uBlends[i].z, uBlends[i].w, xy, span), ink * 0.96);
  // [end gradient]
  return mix(colour, uInks[i], ink * 0.96);
}

// Frosted pastel glass (tiles, pieces) or frosted stone (pebbles): \`gloss\`
// is how much of the studio it reflects.
vec3 frostedBody(vec3 rd, int i, vec3 p, vec3 n, float s, float gloss, vec3 body) {
  vec3 at = p * uTurns[i];
  float facing = clamp(-dot(rd, n), 0.0, 1.0);
  vec3 key = normalize(KEY) * uStudio;
  float lit = clamp(dot(n, key) * 0.5 + 0.5, 0.0, 1.0);
  vec3 colour = body * (0.56 + 0.54 * lit);
  // Frosted: the light inside the glass glows through its thin edges, on the
  // side the key lights.
  colour = mix(colour, mix(body, vec3(1.0), 0.6), pow(1.0 - facing, 2.0) * 0.45 * gloss * mix(0.2, 1.0, lit * lit));
  vec3 mirror = nearStudio(at, reflect(rd, n), s);
  float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
  colour = mix(colour, min(studio(mirror), vec3(1.15)), fresnel * 0.5 * gloss);
  colour += vec3(0.8) * pool(uStudio * mirror, KEY, 90.0) * gloss;
  colour += vec3(0.25) * pool(uStudio * mirror, RIM, 30.0) * gloss;
  return colour;
}

vec3 frosted(vec3 rd, int i, vec3 p, vec3 n, float s, float gloss) {
  // [brand] a platform's tile with a middle stop (Instagram's): its colour
  // at the point, as a gradient's is, frosted as one colour is
  if (uBlends[i].z < -1.5 && uBlends[i].w >= 0.0) {
    vec3 tint = brandGradientAt(uTints[i].rgb, uBlends[i].w, uBlends[i].x, uBlends[i].y, p.xy, s * 2.0);
    return frostedBody(rd, i, p, n, s, gloss, mix(tint, vec3(1.0), uFrost));
  }
  // [end brand]
  // [gradient] a tile in a gradient: its colour at the point, across the
  // tile's own x and y (half size s), frosted as one colour is
  if (uBlends[i].x >= 0.0) {
    vec3 tint = gradientAt(uTints[i].rgb, uBlends[i].x, uBlends[i].y, p.xy, s * 2.0);
    return frostedBody(rd, i, p, n, s, gloss, mix(tint, vec3(1.0), uFrost));
  }
  // [end gradient]
  return frostedBody(rd, i, p, n, s, gloss, mix(uTints[i].rgb, vec3(1.0), uFrost));
}

// Black liquid with a clear coat, as the identity canvas's fragments are:
// the coat's normal rippled by the liquid's slow folds.
vec3 liquid(vec3 rd, int i, vec3 p, vec3 n, float s) {
  float seed = uTints[i].a, e = 0.08;
  vec3 q = p / s * 3.2 + seed + vec3(0.0, uTime * 0.05, 0.0);
  float h0 = noise(q);
  vec3 g = (vec3(noise(q + vec3(e, 0.0, 0.0)), noise(q + vec3(0.0, e, 0.0)), noise(q + vec3(0.0, 0.0, e))) - h0) / e;
  vec3 bumped = normalize(n - 0.12 * (g * uTurns[i]));
  float facing = clamp(-dot(rd, bumped), 0.0, 1.0);
  vec3 key = normalize(KEY) * uStudio;
  vec3 colour = vec3(0.045, 0.045, 0.05) * (0.6 + 0.8 * clamp(dot(bumped, key), 0.0, 1.0));
  vec3 mirror = nearStudio(p * uTurns[i], reflect(rd, bumped), s * 1.4);
  float fresnel = 0.05 + 0.95 * pow(1.0 - facing, 4.0);
  colour += min(studio(mirror), vec3(1.4)) * fresnel * 0.55;
  colour += vec3(0.9) * pool(uStudio * mirror, KEY, 140.0);
  colour += vec3(0.3) * pool(uStudio * mirror, RIM, 40.0);
  return colour;
}

// A glass moon: clear glass in the fragment's colour, its icon floating
// inside, on a plane through its centre facing the camera, read the right
// way round from either side.
vec3 moon(vec3 rd, int i, vec3 p, vec3 n, float s, float px) {
  float facing = clamp(-dot(rd, n), 0.0, 1.0);
  vec3 tint = uTints[i].rgb;
  vec3 inside = mix(tint, vec3(1.0), 0.3) * (0.92 + 0.08 * facing);
  // Thicker glass at the rim holds more of the colour.
  inside = mix(inside, tint * 0.86, pow(1.0 - facing, 1.6) * 0.7);
  vec3 bent = refract(uTurns[i] * rd, uTurns[i] * n, 1.0 / 1.45);
  float t = -p.z / (abs(bent.z) > 1e-3 ? bent.z : -sign(p.z) * 1e-3);
  vec2 xy = faceXY(vec3(p.xy + bent.xy * t, p.z));
  float span = s * 1.0;
  float soft = px * 1.4;
  float cell = uTints[i].a;
  float ink = clamp(0.5 - iconPlane(xy, span, cell) / soft, 0.0, 1.0) * step(length(xy), s * MOON);
  vec3 colour = mix(inside, uInks[i], ink * 0.94);
  vec3 mirror = reflect(rd, n);
  float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
  colour = mix(colour, min(studio(mirror), vec3(1.2)), fresnel * 0.75);
  colour += vec3(1.0) * pool(uStudio * mirror, KEY, 150.0);
  colour += vec3(0.3) * pool(uStudio * mirror, RIM, 36.0);
  return colour;
}

// Fragment i's colour where the ray meets it.
vec3 fragment(vec3 rd, int i, Hit hit, float px) {
  float s = uDrops[i].w, seed = uTints[i].a;
  vec3 n = shapeNormal(hit.p, s, seed, 0) * uTurns[i];
  float facing = clamp(-dot(rd, n), 0.0, 1.0), soft = px / max(facing, 0.25);
  if (uStyle == 0) return liquid(rd, i, hit.p, n, s);
  if (uStyle == 2) return moon(rd, i, hit.p, n, s, px);
  if (uStyle == 1) {
    vec3 colour = frosted(rd, i, hit.p, n, s, 1.0);
    float face = smoothstep(s * DEPTH * 0.55, s * DEPTH * 0.92, abs(hit.p.z));
    // [glint] fragment.js lines 207-209: a soft glint that follows the
    // pointer across the face while the fragment is hovered, under its icon.
    // fragment.js's p is the tile's own point at a half size of S, so here the
    // point over s, times S, is its p, and the glint in half sizes, times S,
    // its uGlint: the same falloffs over the same share of the face. faceXY is
    // p.xy on the front face, which the prototype's hovered tile always shows;
    // on the back, which faces the camera when the tiles keep their turn, it
    // reads the face from outside, so the glint stays under the pointer. The
    // ray only meets the face towards the camera. main.js lines 392 and 482:
    // the icon moves a little towards the pointer.
    if (i == uHovered) {
      vec2 xy = faceXY(hit.p);
      vec2 gd = (xy / s - uGlint.xy) * GLINT_S;
      colour += uGlint.z * (0.16 * exp(-dot(gd, gd) * 7.0) + 0.05 * exp(-dot(gd, gd) * 1.6)) * face;
      return printed(colour, i, xy - uGlyph * s, s * 1.2, face, soft);
    }
    // [end glint]
    return printed(colour, i, faceXY(hit.p), s * 1.2, face, soft);
  }
  if (uStyle == 3) {
    vec3 colour = frosted(rd, i, hit.p, n, s, 1.0);
    float outer = length(hit.p - vec3(0.0, 0.0, -s * BEND)) - s * BEND;
    // The outer face and the inner one, its back.
    float face = smoothstep(0.0, s * SHELL * 0.8, abs(outer));
    return printed(colour, i, vec2(outer < 0.0 ? -hit.p.x : hit.p.x, hit.p.y), s * 1.1, face, soft);
  }
  vec3 colour = frosted(rd, i, hit.p, n, s, 0.42);
  float face = smoothstep(s * 0.22, s * 0.36, abs(hit.p.z));
  return printed(colour, i, faceXY(hit.p), s * 0.95, face, soft);
}

// Clear glass with a logo inside. What is behind shows through the flat
// faces; the bevels and sides, where the light crosses thick glass, show the
// studio darker and cooler. The logo floats on the tile's middle plane, seen
// through the near face (read the right way round from either side), a
// little deep, with a soft shadow on the far face.
// Premultiplied colour and coverage.
vec4 clearTile(vec3 rd, int i, Hit hit, float px) {
  float s = uDrops[i].w, cell = uTints[i].a;
  vec3 nl = shapeNormal(hit.p, s, 0.0, 1), n = nl * uTurns[i], v = uTurns[i] * rd;
  float facing = clamp(-dot(rd, n), 0.0, 1.0);
  float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
  vec3 mirror = nearStudio(hit.p * uTurns[i], reflect(rd, n), s);
  vec3 sky = min(studio(mirror), vec3(1.2));
  float face = smoothstep(0.86, 0.985, abs(nl.z));
  vec3 bent = refract(v, nl, 1.0 / 1.49);
  // A bevel or side bends the studio through thick glass: its colours,
  // darkened, as clear acrylic's edges are.
  vec3 through = studio(bent * uTurns[i]) * 0.72 + sky * fresnel * 0.3;
  // The flat faces: a faint cool tint, as glass takes a little of the light
  // through it, and the studio where they turn away; a bright line where
  // each meets its bevel.
  vec3 clear = mix(vec3(0.78, 0.83, 0.9), sky, fresnel);
  float a = mix(0.58, 0.1 + 0.6 * fresnel, face);
  vec4 glass = vec4(mix(through, clear, face) * a, a);
  float line = exp(-pow((abs(nl.z) - 0.95) / 0.025, 2.0)) * 0.55;
  glass = vec4(vec3(line), line) + glass * (1.0 - line);
  vec4 inner = vec4(0.0);
  if (face > 0.0 && abs(bent.z) > 1e-3) {
    float span = s * 1.15, soft = px * 1.3, side = sign(hit.p.z);
    // Through the face, a ray that bends out to a side wall instead of the
    // far face sees the wall: a darker band round the inside of the edge.
    float far = (-side * s * DEPTH - hit.p.z) / bent.z;
    float wall = smoothstep(-px, px, faceSquare(hit.p.xy + bent.xy * far, s * (1.0 - EDGE * 0.4), s * (CORNER + EDGE * 0.6))) * face;
    glass += vec4(through * 0.85, 1.0) * wall * 0.55 * (1.0 - glass.a);
    // The logo's soft shadow on the far face.
    float tb = (-side * s * DEPTH * 0.96 - hit.p.z) / bent.z;
    vec2 back = faceXY(vec3(hit.p.xy + bent.xy * tb, hit.p.z)) + vec2(0.03, -0.05) * span;
    float shade = (1.0 - smoothstep(-span * 0.02, span * 0.09, iconPlane(back, span, cell))) * 0.16 * face;
    inner = vec4(vec3(0.12, 0.13, 0.17) * shade, shade);
    // The logo, a little deep: its far edge darker, its face on top.
    for (int k = 0; k < 2; k++) {
      float z = side * s * (k == 0 ? -0.05 : 0.05);
      float t = (z - hit.p.z) / bent.z;
      float ink = clamp(0.5 - iconPlane(faceXY(vec3(hit.p.xy + bent.xy * t, hit.p.z)), span, cell) / soft, 0.0, 1.0) * face;
      vec3 c = k == 0 ? uInks[i] * 0.55 : uInks[i];
      inner = vec4(c * ink, ink) + inner * (1.0 - ink);
    }
  }
  vec4 lit = glass + inner * (1.0 - glass.a);
  // Its highlights sit on top of everything: crisp, and only where the face catches a softbox.
  float glint = pool(uStudio * mirror, KEY, 160.0) * 0.35 + pool(uStudio * mirror, RIM, 40.0) * 0.2;
  return vec4(lit.rgb + vec3(glint), min(lit.a + glint, 1.0));
}
// [lock] Lucide's lock (ISC) in its 24-unit box, y down: how far u is from
// the middle of its strokes. Its body is an 18 by 11 rectangle at (3, 11),
// its corners rounded 2; its shackle runs up from (7, 11) and (17, 11) into an
// arc of 5 round (12, 7).
float lockLine(vec2 u) {
  vec2 b = abs(u - vec2(12.0, 16.5)) - vec2(7.0, 3.5);
  float body = abs(length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - 2.0);
  vec2 q = u - vec2(12.0, 7.0);
  float shackle = q.y < 0.0 ? abs(length(q) - 5.0) : length(vec2(abs(q.x) - 5.0, max(q.y - 4.0, 0.0)));
  return min(body, shackle);
}
// Fragment i's lock badge where the ray meets it, premultiplied, and how far
// along the ray it is (at; -1 where it draws nothing). It lies on the face
// towards the camera, so a tile seen from behind shows it too, at the bottom
// right as that face is read from outside (faceXY()): the ground's glass, its
// edge highlight a pixel wide inside the rim, its soft shadow round it (never
// under it, as a CSS box-shadow is clipped to outside its box), and the lock
// on top, its stroke never under a pixel.
vec4 lockBadge(vec3 ro, vec3 rd, int i, float px, out float at) {
  at = -1.0;
  vec4 lock = uLocks[i];
  if (lock.z <= 0.0) return vec4(0.0);
  float s = uDrops[i].w;
  vec3 o = uTurns[i] * (ro - uDrops[i].xyz), v = uTurns[i] * rd;
  float side = o.z < 0.0 ? -1.0 : 1.0;
  // The ray meets its plane on the way in, in front of the camera.
  if (v.z * side > -1e-4) return vec4(0.0);
  float t = (side * uLockShape.x * s - o.z) / v.z;
  if (t <= 0.0) return vec4(0.0);
  vec3 p = o + v * t;
  // From its centre, in half sizes, x right and y up as the face is read.
  vec2 xy = vec2(side * p.x, p.y) / s - vec2(lock.x, -lock.x);
  float r = lock.y * lock.z, d = length(xy), size = 2.0 * r;
  // A pixel across its plane, in half sizes.
  float soft = px / (s * max(abs(v.z), 0.25));
  float cover = clamp(0.5 - (d - r) / soft, 0.0, 1.0);
  float blur = max(uLockShape.w * size, soft);
  float under = length(xy + vec2(0.0, uLockShape.z * size)) - r;
  float shade = uLockEdge.z * (1.0 - smoothstep(-0.75 * blur, 0.75 * blur, under)) * (1.0 - cover);
  if (cover <= 0.0 && shade <= 0.0) return vec4(0.0);
  at = t;
  vec4 colour = uLockFill * cover + vec4(0.0, 0.0, 0.0, shade);
  // The edge highlight, as CSS runs a gradient to the bottom right across a
  // square box: none from 36% to 64% of the way, then up to y at 20% and 80%
  // and x at the ends.
  float m = abs(dot(xy, vec2(0.70710678, -0.70710678))) / (size * 0.70710678);
  float edge = m < 0.6 ? uLockEdge.y * clamp((m - 0.28) / 0.32, 0.0, 1.0) : mix(uLockEdge.y, uLockEdge.x, min((m - 0.6) / 0.4, 1.0));
  float ring = clamp(0.5 + (d - r + soft) / soft, 0.0, 1.0) * cover * edge;
  colour = vec4(ring) + colour * (1.0 - ring);
  // The lock: its box uLockShape.y of the disc across.
  float unit = uLockShape.y * r / 12.0;
  float stroke = max(uLockInk.w, soft / unit);
  float ink = clamp(0.5 - (lockLine(vec2(xy.x, -xy.y) / unit + 12.0) - 0.5 * stroke) * unit / soft, 0.0, 1.0) * cover;
  return vec4(uLockInk.rgb * ink, ink) + colour * (1.0 - ink);
}
// [end lock]
// [dim] The release app's sixth change (scripts/generate-blank-galaxy.mjs):
// a search on the canvas dims the fragments it does not find. Fully dimmed
// (d = 1), a fragment keeps DIM_GREY of the way to its own grey (Rec. 709's
// weights) and DIM_KEEP of its strength, its shadow with it, so the ground
// shows through it and the fragments found stand out. Its colour is
// premultiplied.
const float DIM_GREY = 0.85;
const float DIM_KEEP = 0.3;
vec4 dimmed(vec4 colour, float d) {
  if (d <= 0.0) return colour;
  vec3 grey = vec3(dot(colour.rgb, vec3(0.2126, 0.7152, 0.0722)));
  return vec4(mix(colour.rgb, grey, DIM_GREY * d), colour.a) * mix(1.0, DIM_KEEP, d);
}
// [end dim]

// One strand of fur at a sample: the strand rooted in the root's cell, if
// it is long enough to reach this height (h, 0 at the root to 1 at the
// fur's full length) and wide enough there to cover it.
float strand(vec3 root, vec3 out_, float h, float c, float aa, float reach, vec3 shift) {
  vec3 g = root / c + shift, cell = floor(g);
  vec3 centre = cell + 0.5 + (vec3(hash(cell), hash(cell + 17.1), hash(cell + 31.7)) - 0.5) * 0.5;
  vec3 off = (g - centre) * c;
  off -= out_ * dot(off, out_);
  float len = (0.62 + 0.38 * hash(cell + 9.3)) * reach;
  if (h > len) return 0.0;
  float r = c * (0.26 + 0.14 * hash(cell + 5.1)) * (1.0 - 0.75 * h / max(len, 1e-3));
  return 1.0 - smoothstep(r - aa, r + aa, length(off));
}

// A partner's tile: frosted glass in a pale shade of its colour, the logo
// printed in the middle of both faces, and fur in its colour growing from
// its sides and round the faces, leaving the logo clear. The fur is marched as a
// volume: each sample finds the root below it, bent by gravity and a slow
// sway, and the strand there covers it if it reaches. Premultiplied colour
// and coverage.
vec4 furred(vec3 ro, vec3 rd, int i, float px) {
  float s = uDrops[i].w, L = s * FUR;
  vec3 o = uTurns[i] * (ro - uDrops[i].xyz), v = uTurns[i] * rd;
  float bound = s * 1.5 + L + px;
  float b = dot(o, v), h0 = b * b - dot(o, o) + bound * bound;
  if (h0 <= 0.0) return vec4(0.0);
  h0 = sqrt(h0);
  float t = max(-b - h0, 0.0), far = -b + h0;
  // To the fur's outer edge.
  for (int k = 0; k < 32; k++) {
    float d = slab(o + v * t, s) - L;
    if (d < px * 0.5) break;
    t += d;
    if (t > far) return vec4(0.0);
  }
  vec3 tint = uTints[i].rgb;
  vec3 keyL = uTurns[i] * (normalize(KEY) * uStudio);
  vec3 downL = uTurns[i] * vec3(0.0, -1.0, 0.0);
  float c = s * 0.07, aa = px * 0.6, dt = L / 9.0;
  t += dt * hash(vec3(gl_FragCoord.xy, 0.0));
  vec4 acc = vec4(0.0);
  for (int k = 0; k < 96; k++) {
    vec3 p = o + v * t;
    float d = slab(p, s);
    if (d < 0.0) {
      // The tile itself, found a little more exactly.
      float a0 = t - dt, a1 = t;
      for (int j = 0; j < 4; j++) {
        float m = 0.5 * (a0 + a1);
        if (slab(o + v * m, s) < 0.0) a1 = m;
        else a0 = m;
      }
      vec3 q = o + v * a1;
      vec3 nl = shapeNormal(q, s, 0.0, 2), n = nl * uTurns[i];
      float facing = clamp(-dot(rd, n), 0.0, 1.0), soft = px / max(facing, 0.25);
      vec3 colour = frostedBody(rd, i, q, n, s, 1.0, mix(tint, vec3(1.0), 0.62));
      float face = smoothstep(s * DEPTH * 0.55, s * DEPTH * 0.92, abs(q.z));
      float edge = faceSquare(q.xy, s * 0.62, s * 0.22);
      // In the fur's shade near its edge, and dark under it.
      colour *= mix(1.0, mix(0.42, 1.0, smoothstep(0.0, -s * 0.2, edge)), face);
      colour = mix(colour, tint * 0.22, (1.0 - face) * 0.85);
      colour = printed(colour, i, faceXY(q), s * 1.05, face, soft);
      acc += vec4(min(colour, vec3(1.0)), 1.0) * (1.0 - acc.a);
      break;
    }
    if (d < L) {
      float h = d / L;
      vec3 out_ = slabOut(p, s);
      vec3 sway = vec3(sin(uTime * 1.1 + p.y / s * 3.0), 0.0, cos(uTime * 0.9 + p.x / s * 3.0)) * 0.12;
      vec3 root = p - out_ * d - (downL * 0.55 + sway) * L * h * h;
      // No fur over the logo's square on either face.
      float reach = 1.0;
      if (abs(root.z) > s * DEPTH * 0.6) reach = smoothstep(-s * 0.02, s * 0.16, faceSquare(root.xy, s * 0.62, s * 0.22));
      float cover = max(strand(root, out_, h, c, aa, reach, vec3(0.0)), strand(root, out_, h, c, aa, reach, vec3(0.5, 0.31, 0.77)));
      if (cover > 0.0) {
        vec3 along = normalize(out_ + (downL * 1.1 + sway * 2.0) * h);
        float lit = sqrt(max(1.0 - pow(dot(along, keyL), 2.0), 0.0));
        float shine = pow(sqrt(max(1.0 - pow(dot(along, normalize(keyL - v)), 2.0), 0.0)), 48.0);
        vec3 colour = tint * (0.3 + 0.78 * lit) * mix(0.26, 1.0, h) + vec3(0.22 * shine * h);
        float a = cover * 0.85 * (1.0 - acc.a);
        acc += vec4(min(colour, vec3(1.0)) * a, a);
        if (acc.a > 0.985) break;
      }
    } else if (dot(p, v) > 0.0) {
      break;
    }
    t += dt;
    if (t > far) break;
  }
  return acc;
}

// The orb: clear glass with the photo inside, seen through the glass, each
// colour bending a little differently at the rim, and the studio on its skin.
vec4 orb(vec3 ro, vec3 rd) {
  float R = uOrb.w;
  if (R <= 0.0) return vec4(0.0);
  vec3 oc = ro - uOrb.xyz;
  float along = dot(oc, rd);
  float dist = length(oc - rd * along);
  float px = uPixel * (uDistance - uOrb.z) / uDistance;
  float cover = clamp((R - dist) / px + 0.5, 0.0, 1.0);
  if (cover <= 0.0) return vec4(0.0);
  float h = R * R - dist * dist;
  vec3 p = oc + rd * (-along - sqrt(max(h, 0.0)));
  p = normalize(p) * R;
  vec3 n = p / R;
  float facing = clamp(-dot(rd, n), 0.0, 1.0);
  vec3 photo = vec3(0.0);
  float disc = 0.0;
  for (int k = 0; k < 3; k++) {
    vec3 bent = refract(rd, n, 1.0 / (1.46 + 0.014 * float(k - 1)));
    float t = -p.z / min(bent.z, -1e-3);
    vec2 q = (p.xy + bent.xy * t) / (R * PHOTO);
    vec3 c = texture(uAvatar, vec2(0.5 + q.x * 0.5, 0.5 - q.y * 0.5)).rgb;
    float inDisc = 1.0 - smoothstep(0.97, 1.0, length(q));
    photo[k] = mix(0.93 + 0.02 * float(k), c[k], inDisc);
    disc += inDisc / 3.0;
  }
  // The glass is thicker at the rim: the photo dims and cools there.
  vec3 inside = photo * mix(0.78, 1.0, pow(facing, 0.5));
  inside = mix(inside, inside * vec3(0.94, 0.97, 1.03), 1.0 - facing);
  vec3 mirror = reflect(rd, n);
  float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
  // The studio shows at the rim, where glass reflects most; the face stays
  // clear, with one small crisp window near the top and a glint on the right.
  vec3 colour = mix(inside, min(studio(mirror), vec3(1.15)), fresnel * 0.85);
  colour += vec3(1.0) * pool(uStudio * mirror, ORB_KEY, 900.0) * 0.85;
  colour += vec3(0.5) * pool(uStudio * mirror, RIM, 160.0) * 0.6;
  // Light gathered by the glass, on the side away from the key.
  vec3 key = normalize(KEY) * uStudio;
  colour += vec3(1.0, 0.98, 0.95) * pow(max(dot(n, -key), 0.0), 3.0) * pow(1.0 - facing, 1.5) * 0.35;
  // A faint darker band just inside the rim, so the glass's edge shows on white.
  colour *= 1.0 - 0.14 * exp(-pow((facing - 0.16) / 0.09, 2.0));
  return vec4(min(colour, vec3(1.0)) * cover, cover);
}

void main() {
  vec3 ro = vec3(0.0, 0.0, uDistance);
  vec3 rd = normalize(vec3((vUv * 2.0 - 1.0) * uLens, -1.0));
  // The shadows first, the orb's among them.
  float shade = 0.0;
  for (int i = 0; i < 20; i++) {
    if (i >= uCount) break;
    float s = uDrops[i].w;
    vec3 off = uDrops[i].xyz + vec3(0.0, -SHADOW_DROP * s, -0.6 * s) - ro;
    float d = length(off - rd * dot(off, rd)) / (SHADOW_SOFT * s);
    // Clear glass casts a lighter shadow.
    shade += exp(-d * d) * SHADOW_DARK * (abs(uKinds[i] - 1.0) < 0.5 ? 0.45 : 1.0);
    // [open] its shadow fades with it
    shade -= (1.0 - uFades[i]) * exp(-d * d) * SHADOW_DARK * (abs(uKinds[i] - 1.0) < 0.5 ? 0.45 : 1.0);
    // [end open]
  }
  if (uOrb.w > 0.0) {
    vec3 off = uOrb.xyz + vec3(0.0, -1.15 * uOrb.w, -0.6 * uOrb.w) - ro;
    float d = length(off - rd * dot(off, rd)) / (1.05 * uOrb.w);
    shade += exp(-d * d) * 0.12;
    // [open] the orb's shadow fades with it
    shade -= (1.0 - uOrbFade) * exp(-d * d) * 0.12;
    // [end open]
  }
  shade = min(shade, 0.35);
  vec4 colour = vec4(SHADOW * shade, shade);
  bool drawn = false;
  for (int i = 0; i < 20; i++) {
    if (!drawn && i == uOrbSlot) {
      vec4 o = orb(ro, rd);
      // [open]
      o *= uOrbFade;
      // [end open]
      colour = o + colour * (1.0 - o.a);
      drawn = true;
    }
    if (i >= uCount) break;
    float px = uPixel * (uDistance - uDrops[i].z) / uDistance;
    int kind = int(uKinds[i] + 0.5);
    if (kind == 2) {
      vec4 f = furred(ro, rd, i, px);
      // [open]
      f *= uFades[i];
      // [end open]
      colour = f + colour * (1.0 - f.a);
      continue;
    }
    Hit hit = march(ro, rd, i, px);
    // [open] its cover, which both kinds of tile draw with
    hit.cover *= uFades[i];
    // [end open]
    if (hit.t <= 0.0) continue;
    if (kind == 1) {
      vec4 g = clearTile(rd, i, hit, px) * hit.cover;
      colour = g + colour * (1.0 - g.a);
      continue;
    }
    vec3 c = min(fragment(rd, i, hit, px), vec3(1.0));
    colour = vec4(c * hit.cover, hit.cover) + colour * (1.0 - hit.cover);
  }
  if (!drawn) {
    vec4 o = orb(ro, rd);
    // [open]
    o *= uOrbFade;
    // [end open]
    colour = o + colour * (1.0 - o.a);
  }
  fragColor = colour;
}
`,d=[[`uDrops`,`vec4`,`vDrop`],[`uTints`,`vec4`,`vTint`],[`uInks`,`vec3`,`vInk`],[`uBlends`,`vec4`,`vBlend`],[`uTurns`,`mat3`,`vTurn`],[`uKinds`,`float`,`vKind`],[`uFades`,`float`,`vFade`],[`uLocks`,`vec4`,`vLock`]],f=`textureLod(uIcons, vec2((cell + inside.x) / uCells, 1.0 - inside.y), 0.0)`,p=`textureLod(uIcons, vec2((mod(cell, uColumns) + inside.x) / uColumns, (floor(cell / uColumns) + 1.0 - inside.y) / uRows), 0.0)`;function m(e){let t=u;for(let[e,n,r]of d){let i=RegExp(`uniform ${n} ${e}\\[\\d+\\];`);if(!i.test(t))throw Error(`galaxy shader: no ${e}`);t=t.replace(i,`flat in ${n} ${r};`).replaceAll(`${e}[i]`,r)}if(!t.includes(`i == uHovered`))throw Error(`galaxy shader: no hover test`);if(!t.includes(f))throw Error(`galaxy shader: no icon read`);t=t.replace(f,p).replace(`uniform float uCells;`,`uniform float uCells;
uniform float uColumns;
uniform float uRows;`),t=t.replace(`i == uHovered`,`int(vSlot + 0.5) == uHovered`).replace(`in vec2 vUv;`,`in vec2 vUv;
flat in float vSlot;
flat in float vDim;`);let n=t.lastIndexOf(`void main() {`);if(n<0)throw Error(`galaxy shader: no main`);return`${t.slice(0,n)}${e}\n`}var h=`vec3 ro = vec3(0.0, 0.0, uDistance);
  vec3 rd = normalize(vec3((vUv * 2.0 - 1.0) * uLens, -1.0));`,g=m(`${`${l}vec3 goldTile(vec3 rd, Hit hit, float px) {
  float s = vDrop.w;
  vec3 nl = shapeNormal(hit.p, s, 0.0, 1);
  float face = smoothstep(0.86, 0.985, abs(nl.z));
  float span = s * 1.2, cell = vTint.a, wall = max(span * 0.022, px * 1.3);
  vec2 xy = faceXY(hit.p);
  float d = iconPlane(xy, span, cell), satin = 0.0, walls = 0.0;
  if (d < wall && face > 0.0) {
    float h = max(wall * 0.25, 1.5 * span / CELL);
    vec2 g = vec2(iconPlane(xy + vec2(h, 0.0), span, cell) - iconPlane(xy - vec2(h, 0.0), span, cell),
      iconPlane(xy + vec2(0.0, h), span, cell) - iconPlane(xy - vec2(0.0, h), span, cell)) / (2.0 * h);
    float w = clamp((d + wall) / wall, 0.0, 1.0), k = 4.8 * w * (1.0 - w) * face;
    nl = normalize(nl - vec3((hit.p.z < 0.0 ? -g.x : g.x) * k, g.y * k, 0.0));
    walls = 4.0 * w * (1.0 - w) * face;
    satin = (1.0 - smoothstep(-wall * 1.2, -wall * 0.8, d)) * face;
  }
  vec3 n = nl * vTurn;
  float facing = clamp(-dot(rd, n), 0.0, 1.0);
  vec3 mirror = nearStudio(hit.p * vTurn, reflect(rd, n), s), seen = uStudio * mirror;
  vec2 at = xy / s;
  float fine = px / s;
  float grain = 1.0 + 0.05 * (0.5 * sin(at.y * 173.1 + sin(at.x * 9.7) * 3.1) * smoothstep(0.036, 0.012, fine) +
    0.5 * sin(at.y * 411.3 + at.x * 2.3) * smoothstep(0.015, 0.005, fine));
  float l = goldWorld(seen) * grain;
  vec3 colour = goldLit(l, facing);
  if (satin > 0.0) {
    float occ = 1.0 - 0.18 * (1.0 - smoothstep(-wall * 3.0, -wall, d));
    colour = mix(colour, goldLit(0.5 + 0.3 * l, facing) * 0.64 * occ, satin);
  }
  float cycle = mod(uTime, GLINT_EVERY) / GLINT_EVERY, run = clamp(cycle / GLINT_RUN, 0.0, 1.0);
  float front = (dot(xy / span, vec2(0.6, -0.8)) - mix(-0.85, 0.85, run)) / 0.07;
  colour += GOLD_PALE * 1.4 * exp(-front * front) * sin(3.1415927 * run) * walls;
  if (int(vSlot + 0.5) == uHovered) {
    vec2 gd = (at - uGlint.xy) * GLINT_S;
    colour += GOLD_PALE * uGlint.z * (0.3 * exp(-dot(gd, gd) * 7.0) + 0.08 * exp(-dot(gd, gd) * 1.6)) * face;
  }
  return colour;
}`}
${`${t}vec4 invitedGlass(vec3 rd, int i, Hit hit, float px) {
  vec4 glass = clearTile(rd, i, hit, px);
  float s = vDrop.w;
  vec3 nl = shapeNormal(hit.p, s, 0.0, 1), n = nl * vTurn;
  float facing = clamp(-dot(rd, n), 0.0, 1.0), edges = 1.0 - smoothstep(0.86, 0.985, abs(nl.z));
  vec3 m = nl + hit.p / s * 0.6;
  vec3 w = m * 1.4 + 0.4 * sin(m.yzx * 2.7 + uTime * 0.11);
  float thickness = COAT.x + COAT.y * sin(dot(w, vec3(1.7, 1.1, -1.4)) + uTime * 0.09);
  if (int(vSlot + 0.5) == uHovered) {
    vec2 at = faceXY(hit.p) / s - uGlint.xy;
    float r = length(at);
    thickness += COAT.y * 0.7 * uGlint.z * exp(-r * r * 2.5) * sin(r * 9.0 - uTime * 2.2);
  }
  vec3 coat = film(path(thickness, FILM_INDEX, max(facing, FILM_EDGE)));
  coat = mix(vec3(dot(coat, vec3(0.3, 0.55, 0.15))), coat, FILM_SATURATION);
  vec3 sheen = mix(vec3(1.0), coat, FILM);
  float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
  glass.rgb = mix(glass.rgb, glass.rgb * sheen, mix(0.45, 1.0, fresnel) * edges);
  return glass;
}`}
void main() {
  ${h}
  int i = 0;
  float px = uPixel * (uDistance - vDrop.z) / uDistance;
  int kind = int(vKind + 0.5);
  float lockAt;
  vec4 badge = lockBadge(ro, rd, i, px, lockAt) * vFade;
  vec4 colour = vec4(0.0);
  float tileAt = -1.0;
  if (kind == 2) {
    colour = furred(ro, rd, i, px) * vFade;
  } else {
    Hit hit = march(ro, rd, i, px);
    hit.cover *= vFade;
    if (hit.t > 0.0) {
      tileAt = hit.t;
      if (kind == 1) colour = invitedGlass(rd, i, hit, px) * hit.cover;
      else if (kind == 3) colour = vec4(min(goldTile(rd, hit, px), vec3(1.0)) * hit.cover, hit.cover);
      else colour = vec4(min(fragment(rd, i, hit, px), vec3(1.0)) * hit.cover, hit.cover);
    }
  }
  colour = tileAt > 0.0 && tileAt < lockAt ? colour + badge * (1.0 - colour.a) : badge + colour * (1.0 - badge.a);
  colour = dimmed(colour, vDim);
  if (colour.a <= 0.0) discard;
  fragColor = colour;
}`),_=m(`void main() {
  ${h}
  float s = vDrop.w;
  vec3 off = vDrop.xyz + vec3(0.0, -SHADOW_DROP * s, -0.6 * s) - ro;
  float d = length(off - rd * dot(off, rd)) / (SHADOW_SOFT * s);
  float dim = mix(1.0, DIM_KEEP, vDim);
  fragColor = vec4(exp(-d * d) * SHADOW_DARK * (abs(vKind - 1.0) < 0.5 ? 0.45 : 1.0) * vFade * dim, 0.0, 0.0, 1.0);
}`),v=m(`uniform sampler2D uShade;
uniform vec2 uTarget;
void main() {
  ${h}
  float shade = texture(uShade, gl_FragCoord.xy / uTarget).r;
  if (uOrb.w > 0.0) {
    vec3 off = uOrb.xyz + vec3(0.0, -1.15 * uOrb.w, -0.6 * uOrb.w) - ro;
    float d = length(off - rd * dot(off, rd)) / (1.05 * uOrb.w);
    shade += exp(-d * d) * 0.12 * uOrbFade;
  }
  shade = min(shade, 0.35);
  fragColor = vec4(SHADOW * shade, shade);
}`),y=m(`${e}
void main() {
  ${h}
  vec4 o = livingOrb(ro, rd) * uOrbFade;
  if (o.a <= 0.0) discard;
  fragColor = o;
}`),b=`in vec2 position;
in vec4 aDrop;
in vec4 aTint;
in vec3 aInk;
in vec4 aBlend;
in vec3 aTurn0;
in vec3 aTurn1;
in vec3 aTurn2;
in float aKind;
in float aFade;
in float aSlot;
in vec4 aLock;
in float aDim;
uniform vec2 uSpan;
uniform vec2 uShift;
uniform float uLens;
uniform float uDistance;
uniform float uMargin;
uniform float uShadow;
uniform float uShadowReach;
uniform float uFur;
out vec2 vUv;
flat out vec4 vDrop;
flat out vec4 vTint;
flat out vec3 vInk;
flat out vec4 vBlend;
flat out mat3 vTurn;
flat out float vKind;
flat out float vFade;
flat out float vSlot;
flat out vec4 vLock;
flat out float vDim;
float most(float v, float r, float depth) {
  return (v + r) / (v + r > 0.0 ? depth - r : depth + r);
}
float least(float v, float r, float depth) {
  return (v - r) / (v - r < 0.0 ? depth - r : depth + r);
}
void main() {
  float s = aDrop.w;
  vDrop = aDrop;
  vTint = aTint;
  vInk = aInk;
  vBlend = aBlend;
  vTurn = mat3(aTurn0, aTurn1, aTurn2);
  vKind = aKind;
  vFade = aFade;
  vSlot = aSlot;
  vLock = aLock;
  vDim = aDim;
  // A fragment off the profile, or with nothing of it shown, covers nothing.
  if (s <= 0.0 || aFade <= 0.0) {
    vUv = vec2(0.0);
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
    return;
  }
  vec3 c = uShadow > 0.5 ? aDrop.xyz + vec3(0.0, -1.25 * s, -0.6 * s) : aDrop.xyz;
  float r = uShadow > 0.5 ? uShadowReach * s : (1.5 + (abs(aKind - 2.0) < 0.5 ? uFur : 0.0)) * s;
  if (uShadow < 0.5 && aLock.z > 0.0) r = max(r, aLock.w * s);
  float depth = uDistance - c.z;
  vec2 lo = vec2(-1e3), hi = vec2(1e3);
  if (depth - r > 1e-3) {
    lo = 0.5 + 0.5 * vec2(least(c.x, r, depth), least(c.y, r, depth)) / uLens - uMargin;
    hi = 0.5 + 0.5 * vec2(most(c.x, r, depth), most(c.y, r, depth)) / uLens + uMargin;
  }
  vUv = mix(lo, hi, position * 0.5 + 0.5);
  gl_Position = vec4((vUv - 0.5 + uShift) * 2.0 / uSpan, 0.0, 1.0);
}`,x=`in vec2 position;
uniform vec4 uBox;
uniform vec2 uSpan;
uniform vec2 uShift;
out vec2 vUv;
flat out vec4 vDrop;
flat out vec4 vTint;
flat out vec3 vInk;
flat out vec4 vBlend;
flat out mat3 vTurn;
flat out float vKind;
flat out float vFade;
flat out float vSlot;
flat out vec4 vLock;
flat out float vDim;
void main() {
  vec2 clip = mix(uBox.xy, uBox.zw, position * 0.5 + 0.5);
  vUv = clip * uSpan * 0.5 + 0.5 - uShift;
  gl_Position = vec4(clip, 0.0, 1.0);
  vDrop = vec4(0.0);
  vTint = vec4(0.0);
  vInk = vec3(0.0);
  vBlend = vec4(-1.0);
  vTurn = mat3(1.0);
  vKind = 0.0;
  vFade = 0.0;
  vSlot = -1.0;
  vLock = vec4(0.0);
  vDim = 0.0;
}`;function S(e,t){if(t<=0)return;let n=e.updateRanges[0];n?n.count=Math.max(n.count,t):e.addUpdateRange(0,t),e.needsUpdate=!0}function C(e,t,n,r,i=0,a=0,o=0){let s=t*4*n,c=!1;for(let t=0;t<n;t++){let n=e[s+t];e[s+t]=t===0?r:t===1?i:t===2?a:o,e[s+t]!==n&&(c=!0)}if(c)for(let t=1;t<4;t++)e.copyWithin(s+t*n,s,s+n);return c}var w=class{constructor(e){this.geometry=new i;let t=this.geometry;t.setAttribute(`position`,new s(new Float32Array([-1,-1,1,-1,-1,1,1,1]),2)),t.setIndex([0,1,2,2,1,3]),t.boundingSphere=new o;let l=t=>new c(new Float32Array(e*t),t).setUsage(n);this.drop=l(4),this.tint=l(4),this.ink=l(3),this.blend=l(4),this.kind=l(1),this.fade=l(1),this.slot=l(1),this.lock=l(4),this.dim=l(1),this.turns=new a(new Float32Array(e*9),9).setUsage(n),t.setAttribute(`aDrop`,this.drop),t.setAttribute(`aTint`,this.tint),t.setAttribute(`aInk`,this.ink),t.setAttribute(`aBlend`,this.blend),t.setAttribute(`aKind`,this.kind),t.setAttribute(`aFade`,this.fade),t.setAttribute(`aSlot`,this.slot),t.setAttribute(`aLock`,this.lock),t.setAttribute(`aDim`,this.dim);for(let e=0;e<3;e++)t.setAttribute(`aTurn${e}`,new r(this.turns,3,e*3));t.instanceCount=0}write(e,t,n){let r=Math.max(0,n-t),i=(e,n,i)=>{let a=e.array,o=t*i,s=r*i,c=!1;for(let e=0;e<s;e++){let t=n[o+e];a[e]!==t&&(a[e]=t,c=!0)}c&&S(e,s)};i(this.drop,e.drops,4),i(this.tint,e.tints,4),i(this.ink,e.inks,3),i(this.blend,e.blends,4),i(this.kind,e.kinds,1),i(this.fade,e.fades,1),i(this.lock,e.locks,4),i(this.dim,e.dims,1),i(this.turns,e.turns,9);let a=this.slot.array,o=!1;for(let e=0;e<r;e++)a[e]!==t+e&&(a[e]=t+e,o=!0);o&&S(this.slot,r),this.geometry.instanceCount=r}dispose(){this.geometry.dispose()}};export{y as a,_ as c,v as i,g as l,w as n,S as o,b as r,C as s,x as t,l as u};