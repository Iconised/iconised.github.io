import{r as e}from"./CouDcG_4.js";var t={size:.29,low:.14,high:.86,depth:2.2,lift:.07,drift:.0032,haze:.42,seed:.13},n={size:.46,low:.04,high:.8,depth:2,lift:-.06,drift:-.007,haze:.02,seed:.61},r=.3,i=e=>e.toFixed(4),a=e=>`Bank(${i(e.size)} * reach, ${i(e.low)}, ${i(e.high)}, ${i(e.depth)}, ${i(e.lift)} * reach, ${i(e.drift)}, ${i(e.haze)}, ${i(e.seed)})`,o={far:t.drift,near:n.drift};function s(e,i){let a=i/r,o=t=>(t.lift+t.size*(t.high*1.3*e+.2))*a;return Math.min(1,Math.max(o(t),o(n))+.01)}var c=`#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,l=`#version 300 es
precision highp float;
precision highp int;
out vec4 fragColor;
uniform float uSize;
uniform float uSlice;

uvec3 pcg3d(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}
vec3 hash3(ivec3 c, int per, uint seed) {
  c = ((c % per) + per) % per;
  uvec3 h = pcg3d(uvec3(c) + uvec3(seed * 747796405u, seed * 2891336453u, seed * 277803737u));
  return vec3(h) * (1.0 / 4294967295.0);
}
float worley(vec3 p, int per, uint seed) {
  p *= float(per);
  vec3 pi = floor(p), f = p - pi;
  float d = 8.0;
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec3 o = vec3(x, y, z);
    vec3 r = o + hash3(ivec3(pi) + ivec3(x, y, z), per, seed) - f;
    d = min(d, dot(r, r));
  }
  return clamp(1.0 - sqrt(d), 0.0, 1.0);
}
float perlin(vec3 p, int per, uint seed) {
  p *= float(per);
  vec3 pi = floor(p), f = p - pi;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n = 0.0;
  for (int k = 0; k < 8; k++) {
    ivec3 o = ivec3(k & 1, (k >> 1) & 1, (k >> 2) & 1);
    vec3 g = normalize(hash3(ivec3(pi) + o, per, seed) * 2.0 - 1.0 + 1e-6);
    vec3 w = mix(1.0 - u, u, vec3(o));
    n += dot(g, f - vec3(o)) * w.x * w.y * w.z;
  }
  return n;
}
float remap(float v, float a, float b, float c, float d) { return c + (v - a) / (b - a) * (d - c); }

void main() {
  vec3 p = vec3(gl_FragCoord.xy / uSize, (uSlice + 0.5) / uSize);
  float pf = 0.5 + 0.5 * (perlin(p, 4, 1u) + 0.5 * perlin(p, 8, 2u) + 0.25 * perlin(p, 16, 3u)) / 1.1;
  float w4 = worley(p, 4, 10u), w8 = worley(p, 8, 11u), w16 = worley(p, 16, 12u), w32 = worley(p, 32, 13u);
  float wf = w4 * 0.625 + w8 * 0.25 + w16 * 0.125;
  float body = clamp(remap(pf, wf - 1.0, 1.0, 0.0, 1.0), 0.0, 1.0);
  fragColor = vec4(body, w4 * 0.6 + w8 * 0.28 + w16 * 0.12, w16, w32);
}`,u=`
precision highp float;
precision highp sampler3D;
uniform vec2 uRes;       // this pass's target, px
uniform float uTime;     // seconds
uniform float uNight;    // 0 day → 1 night
uniform float uHorizon;  // how far up the screen the banks of cloud reach, 0 → 1
uniform vec4 uPlaces;    // where the sun stands by day and the moon by night: x (-1 → 1 across), y (0 → 1 up), each

vec2 worldOf(vec2 frag) { return vec2((frag.x - 0.5 * uRes.x) / uRes.y, frag.y / uRes.y); }
float halfWidth() { return 0.5 * uRes.x / uRes.y; }
float dusk() { return smoothstep(0.08, 0.5, uNight) * (1.0 - smoothstep(0.5, 0.92, uNight)); }
float night() { return smoothstep(0.45, 1.0, uNight); }
/** The sun: at its place by day (high on the left, unless the sky follows the hour), down behind the clouds by night. */
vec2 sunAt() { return vec2(uPlaces.x * halfWidth(), mix(uPlaces.y, uHorizon * 0.35, smoothstep(0.0, 0.8, uNight))); }
/** The moon: up from below the screen to its place, behind the clouds, once the sun is going. */
vec2 moonAt() { return vec2(uPlaces.z * halfWidth(), mix(-0.07, uPlaces.w, smoothstep(0.42, 1.0, uNight))); }

/** The sky with nothing in it: pale over the clouds, deeper overhead, through the day, dusk and night. */
vec3 skyColour(vec2 w) {
  float up = clamp((w.y - uHorizon * 0.62) / (1.0 - uHorizon * 0.62), 0.0, 1.0);
  // Measured down the hero (18 November 2026): it pales evenly from the top to the clouds, all but white there.
  float t = up;
  vec3 zenith = mix(mix(vec3(0.565, 0.782, 0.933), vec3(0.24, 0.27, 0.53), dusk()), vec3(0.016, 0.03, 0.085), night());
  vec3 low = mix(mix(vec3(0.935, 0.963, 0.990), vec3(0.99, 0.64, 0.44), dusk()), vec3(0.05, 0.085, 0.19), night());
  vec3 sky = mix(low, zenith, t);
  // The low sun warms the sky round it.
  float near = exp(-dot(w - sunAt(), w - sunAt()) * vec2(1.6, 5.0).x);
  return sky + vec3(1.0, 0.55, 0.22) * near * dusk() * 0.38;
}
`,d=`#version 300 es
${u}
layout(location = 0) out vec4 farOut;
layout(location = 1) out vec4 nearOut;
uniform sampler3D uNoise;
uniform int uSteps;
uniform float uCover;
uniform float uPad;      // the buffer's margin each side, px: room for a finished picture to slide

/** A bank of cumulus seen side-on, in its own units (one is \`size\` screen heights): heaps \`low\` to \`high\` tall, a
 * slab \`depth\` deep that the rays cross front to back, lifted \`lift\` screen heights, sliding \`drift\` screen heights a
 * second, taken \`haze\` of the way into the sky's colour. */
struct Bank { float size; float low; float high; float depth; float lift; float drift; float haze; float seed; };

const float SIGMA = 24.0; // extinction at full density, per unit

/** How tall the bank is over a point of its floor: broad heaps, each a cluster of domes. */
float topOf(vec2 xz, Bank b) {
  float heaps = texture(uNoise, vec3(xz.x * 0.24, b.seed, xz.y * 0.24)).r;
  float g = texture(uNoise, vec3(xz.x * 0.50, b.seed + 0.37, xz.y * 0.50)).g;
  // Worley's cells come to points; a dome is round on top.
  float domes = 1.0 - (1.0 - g) * (1.0 - g);
  float h = smoothstep(0.30, 0.70, heaps);
  return mix(b.low, b.high, h * sqrt(h)) * (0.80 + 0.20 * domes) * uCover;
}
/** Above 0 inside the cloud, about how far in. \`fine\` adds the billows' small wisps, left out towards the light. */
float fieldOf(vec3 p, Bank b, bool fine) {
  float dz = (p.z - 0.5 * b.depth) / (0.5 * b.depth);
  float f = topOf(p.xz, b) - p.y - 0.16 * dz * dz;
  if (f < -0.34) return f;
  vec4 big = texture(uNoise, p * 0.46 + vec3(0.0, 0.0, b.seed));
  float round1 = 1.0 - (1.0 - big.g) * (1.0 - big.g);
  f += (round1 - 0.62) * 0.46 + (big.r - 0.5) * 0.16;
  if (f > -0.14 && f < 0.42) {
    // The billows on the billows (owner, 18 November 2026: the hero's clouds "look actually textured and a bit more
    // structured", the lab's "too fluffy"): the knobs that make a cumulus a cauliflower, in the light's march too,
    // so each casts its shade into the crease beside it.
    vec4 mid = texture(uNoise, p * 1.15 + vec3(b.seed, 0.0, 0.31));
    float knobs = 1.0 - (1.0 - mid.g) * (1.0 - mid.g);
    f += (knobs - 0.60) * 0.20 * (1.0 - smoothstep(0.12, 0.42, f));
    if (fine && f > -0.02 && f < 0.20) {
      vec3 e = texture(uNoise, p * 3.1 + vec3(b.seed)).gba;
      f -= (1.0 - (e.x * 0.5 + e.y * 0.3 + e.z * 0.2)) * 0.075 * (1.0 - smoothstep(0.0, 0.20, f));
    }
  }
  return f;
}
float densityOf(vec3 p, Bank b, bool fine) { return smoothstep(0.0, 0.065, fieldOf(p, b, fine)); }
float jitter(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }

/** One bank where this pixel looks: its light gathered front to back (rgb, already times its cover) and its cover. */
vec4 bankAt(vec2 w, Bank b, vec3 light, vec3 lightCol, vec3 ambHi, vec3 ambLo, vec3 bounce, vec3 hazeCol) {
  vec2 at = vec2((w.x + uTime * b.drift) / b.size, (w.y - b.lift) / b.size);
  // Nothing of it is this high.
  if (at.y > b.high * 1.3 * uCover + 0.2) return vec4(0.0);
  float n = float(uSteps), ds = b.depth / n, j = jitter(gl_FragCoord.xy + b.seed * 91.0);
  float T = 1.0;
  vec3 C = vec3(0.0);
  for (int i = 0; i < 64; i++) {
    if (i >= uSteps) break;
    float z = (float(i) + j) * ds;
    vec3 p = vec3(at, z);
    float d = densityOf(p, b, true);
    if (d < 0.003) continue;
    // Towards the light: four samples, each further on than the last.
    float od = 0.0, stride = 0.05, reach = 0.0;
    for (int k = 0; k < 4; k++) {
      od += densityOf(p + light * (reach + 0.5 * stride), b, false) * stride;
      reach += stride; stride *= 1.9;
    }
    float lit = exp(-od * SIGMA * 0.85) + 0.12 * exp(-od * SIGMA * 0.10);
    float open = smoothstep(0.0, b.high * 0.8, at.y);
    vec3 L = mix(ambLo, ambHi, open) + lightCol * lit + bounce * (1.0 - smoothstep(0.0, b.high * 0.34, at.y));
    L = mix(L, hazeCol, clamp(b.haze + 0.22 * z / b.depth, 0.0, 1.0));
    float a = 1.0 - exp(-d * SIGMA * ds);
    C += T * a * L;
    T *= 1.0 - a;
    if (T < 0.02) break;
  }
  return vec4(C, 1.0 - T);
}

void main() {
  vec2 w = worldOf(gl_FragCoord.xy - vec2(uPad, 0.0));
  // The banks stand a little taller on a tall screen, which shows less of their width.
  float reach = uHorizon / ${i(r)};
  Bank far = ${a(t)};
  Bank near = ${a(n)};

  float nightness = night(), duskness = dusk();
  // One light at a time: the sun from above and behind the left shoulder, low and ahead as it sets; then the moon.
  float sunUp = 1.0 - smoothstep(0.42, 0.72, uNight);
  vec3 sunDir = normalize(mix(vec3(-0.50, 0.74, -0.42), vec3(-0.62, 0.10, 0.55), smoothstep(0.05, 0.6, uNight)));
  vec3 light = normalize(mix(vec3(0.46, 0.74, -0.30), sunDir, sunUp));
  vec3 lightCol = mix(vec3(0.34, 0.42, 0.66) * smoothstep(0.55, 1.0, uNight),
                      mix(vec3(0.40, 0.295, 0.125), vec3(0.90, 0.45, 0.21), duskness), sunUp);
  vec3 ambHi = mix(mix(vec3(0.770, 0.832, 0.915), vec3(0.56, 0.44, 0.56), duskness), vec3(0.13, 0.17, 0.30), nightness);
  vec3 ambLo = mix(mix(vec3(0.715, 0.785, 0.890), vec3(0.34, 0.28, 0.43), duskness), vec3(0.05, 0.07, 0.14), nightness);
  vec3 bounce = mix(mix(vec3(0.12, 0.09, 0.05), vec3(0.20, 0.13, 0.10), duskness), vec3(0.01, 0.014, 0.03), nightness);
  vec3 hazeCol = skyColour(vec2(w.x, uHorizon * 0.55));

  // Each to its own texture: they slide at their own speeds.
  farOut = bankAt(w, far, light, lightCol, ambHi, ambLo, bounce, hazeCol);
  nearOut = bankAt(w, near, light, lightCol, ambHi, ambLo, bounce, hazeCol);
}`,f=`#version 300 es
precision highp float;
layout(location = 0) out vec4 farOut;
layout(location = 1) out vec4 nearOut;
uniform sampler2D uFar;
uniform sampler2D uNear;

vec4 soft(sampler2D from, vec2 uv, vec2 px) {
  return texture(from, uv) * 0.36
       + (texture(from, uv + px * vec2(0.6, 0.27)) + texture(from, uv + px * vec2(-0.27, 0.6))
        + texture(from, uv + px * vec2(-0.6, -0.27)) + texture(from, uv + px * vec2(0.27, -0.6))) * 0.16;
}
void main() {
  vec2 px = 1.0 / vec2(textureSize(uFar, 0)), uv = gl_FragCoord.xy * px;
  farOut = soft(uFar, uv, px);
  nearOut = soft(uNear, uv, px);
}`,p=`#version 300 es
${u}
out vec4 fragColor;
uniform sampler3D uNoise;
uniform sampler2D uFarA;   // the banks as last shown…
uniform sampler2D uNearA;
uniform sampler2D uFarB;   // …and as drawn since: uFade of the way from the one to the other
uniform sampler2D uNearB;
uniform float uFade;
uniform vec4 uShift;       // how far each has drifted since it was drawn (far A, near A, far B, near B), buffer px
uniform vec3 uBuffer;      // the cloud buffer: the screen's width and height in its px, and its margin each side
uniform vec2 uSink;        // how far the far bank and the near one have sunk below the screen, screen heights
uniform float uFoot;     // 0 → 1: how far the bottom of the screen goes to the cloud's white foot

float hash2(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }

/** Stars: one, sometimes, in each cell of a grid on the sky, twinkling. */
float stars(vec2 w) {
  vec2 g = w * 46.0, cell = floor(g), f = fract(g);
  float h = hash2(cell);
  if (h < 0.78) return 0.0;
  vec2 at = vec2(hash2(cell + 7.1), hash2(cell + 3.7)) * 0.7 + 0.15;
  float size = mix(0.05, 0.13, pow(hash2(cell + 1.3), 6.0));
  float twinkle = 0.72 + 0.28 * sin(uTime * (1.0 + 2.5 * hash2(cell + 9.9)) + h * 40.0);
  return smoothstep(size, 0.0, length(f - at)) * twinkle * mix(0.45, 1.0, hash2(cell + 5.5));
}

/** A star cluster, by night (owner, 19 November 2026: "the odd shooting star or star clusters in night mode"; of a
 * first cut with three, "Too many mini-galaxies"): one place in the sky, well clear of the moon, where many small
 * faint stars gather round a soft glow, each twinkling. */
float clusters(vec2 w) {
  float light = 0.0, hw = halfWidth();
  for (int k = 0; k < 1; k++) {
    vec2 c = k == 0 ? vec2(-0.60 * hw, 0.70) : k == 1 ? vec2(0.02 * hw, 0.90) : vec2(-0.16 * hw, 0.56);
    float r = k == 0 ? 0.105 : k == 1 ? 0.075 : 0.06;
    vec2 off = (w - c) / r;
    // Longer one way than the other, and leaning.
    off = vec2(off.x * 0.8 + off.y * 0.35, off.y * 1.15 - off.x * 0.2);
    float d = dot(off, off);
    if (d > 3.2) continue;
    float dense = exp(-d * 1.5);
    vec2 g = w * 170.0 + float(k) * 31.7, cell = floor(g), f = fract(g);
    float h = hash2(cell);
    if (h > 1.0 - 0.62 * dense) {
      vec2 at = vec2(hash2(cell + 7.1), hash2(cell + 3.7)) * 0.6 + 0.2;
      float twinkle = 0.7 + 0.3 * sin(uTime * (1.2 + 2.0 * hash2(cell + 9.9)) + h * 50.0);
      light += smoothstep(mix(0.16, 0.30, pow(hash2(cell + 1.3), 5.0)), 0.0, length(f - at)) * twinkle
               * mix(0.30, 1.0, hash2(cell + 5.5));
    }
    light += dense * 0.045;
  }
  return light;
}

/** A shooting star, by night, now and then: a slot every 19 seconds, most of them empty; in one that is not, a point
 * of light crosses a stretch of the upper sky in under a second, slowing, a thin tail behind it, and is gone. Where
 * and which way is the slot's own. Returns its light at this pixel. */
float meteor(vec2 w) {
  float slot = uTime / 19.0, pass = floor(slot), life = fract(slot) * 19.0 / 0.85;
  if (life > 1.0 || hash2(vec2(pass, 2.3)) < 0.5) return 0.0;
  float way = hash2(vec2(pass, 6.1)) < 0.5 ? -1.0 : 1.0, fall = mix(0.18, 0.55, hash2(vec2(pass, 1.9)));
  vec2 dir = normalize(vec2(way, -fall));
  vec2 from = vec2(mix(-0.75, 0.75, hash2(vec2(pass, 5.1))) * halfWidth(), mix(0.66, 0.96, hash2(vec2(pass, 8.7))));
  float reach = mix(0.20, 0.36, hash2(vec2(pass, 4.4)));
  vec2 head = from + dir * reach * (1.0 - (1.0 - life) * (1.0 - life));
  vec2 p = w - head;
  float back = dot(p, -dir), tail = 0.11 * sin(3.14159 * life) + 0.004;
  float px = 1.0 / uRes.y;
  float shine = sqrt(sin(3.14159 * life));
  float glow = exp(-dot(p, p) / (px * px * 9.0)) * 1.4;
  if (back < 0.0 || back > tail) return glow * shine;
  float thin = 1.0 - back / tail;
  return (smoothstep(px * (0.7 + 1.1 * thin), 0.0, length(p + dir * back)) * thin * thin + glow) * shine;
}

/** Birds, by day (owner: the day sky has "clouds, sun, birds"): now and then a small flock crosses high up, far off,
 * each bird two wings in a shallow stroke that beat, with a glide between, the flock a loose skein behind its leader.
 * One flock at a time, and not every time: a pass every 52 seconds, some of them sat out, each with its own height,
 * way across, size and number. Where it is depends on the clock alone, so a page that loads finds it where it was. Returns how much of this pixel is bird. */
float birds(vec2 w) {
  float ink = 0.0, px = 1.0 / uRes.y;
  for (int k = 0; k < 1; k++) {
    float fk = float(k);
    float t = uTime / 52.0;
    float pass = floor(t), along = fract(t) / 0.55;
    // It crosses in a little over half its time and sits some passes out, so the sky is often empty.
    if (along > 1.0 || hash2(vec2(pass + 5.0, fk * 3.1)) < 0.4) continue;
    float dir = hash2(vec2(pass + 3.0, fk)) < 0.5 ? -1.0 : 1.0;
    float reach = halfWidth() + 0.3;
    float s = mix(0.008, 0.014, hash2(vec2(pass, fk + 1.7)));
    vec2 lead = vec2(dir * mix(-reach, reach, along),
                     mix(uHorizon + 0.22, 0.88, hash2(vec2(pass, fk * 7.3))) + 0.015 * sin(uTime * 0.21 + fk));
    // Nowhere near the flock: nothing to draw.
    vec2 off = w - lead;
    if (abs(off.y) > s * 9.0 || off.x * dir > s * 2.0 || off.x * dir < -s * 16.0) continue;
    int count = 3 + int(hash2(vec2(pass + 9.0, fk)) * 5.0);
    for (int i = 0; i < 7; i++) {
      if (i >= count) break;
      float fi = float(i), side = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0, row = ceil(fi * 0.5);
      float r = hash2(vec2(fi + pass, fk + 4.1));
      vec2 c = lead + vec2(-dir * row * s * (2.6 + r), side * row * s * (1.3 + 0.9 * r))
                    + vec2(0.0, s * 0.45 * sin(uTime * 1.3 + fi * 2.1));
      vec2 p = (w - c) / s;
      float ax = abs(p.x);
      if (ax > 1.1 || abs(p.y) > 1.0) continue;
      // The wings beat, and now and then are held out in a glide.
      float beat = sin(uTime * (5.2 + 1.6 * r) + fi * 1.9);
      float glide = smoothstep(0.5, 0.8, sin(uTime * 0.45 + fi * 3.0 + fk * 1.7));
      float lift = mix(beat * 0.62 + 0.10, 0.22, glide);
      float wing = lift * (ax - 0.42 * ax * ax);
      // Thicker at the body, to a point at the tips; never thinner than the screen can draw.
      float thick = max(mix(0.17, 0.05, ax), 0.8 * px / s);
      ink = max(ink, smoothstep(thick, thick * 0.35, abs(p.y - wing)) * smoothstep(1.05, 0.85, ax));
    }
  }
  return ink;
}

void main() {
  vec2 w = worldOf(gl_FragCoord.xy);
  vec3 col = skyColour(w);
  float nightness = night(), duskness = dusk();

  // High wisps (owner, 18 November 2026: "the natural beautiful blue -> white/grey but with a few long wispies"):
  // a clean sky, and here and there a long thin streak across it, a little off the level, drifting. The last noise leaves
  // most of the sky without any.
  vec2 lie = vec2(w.x, w.y + w.x * 0.035);
  float streak = texture(uNoise, vec3(lie.x * 0.20 + uTime * 0.0020, lie.y * 3.4, 0.71)).r;
  float thread = texture(uNoise, vec3(lie.x * 0.55 + uTime * 0.0032, lie.y * 9.0, 0.13)).r;
  float few = texture(uNoise, vec3(w.x * 0.11 + uTime * 0.0012, w.y * 0.85 + 0.2, 0.37)).r;
  float high = smoothstep(uHorizon + 0.14, uHorizon + 0.30, w.y);
  float wisp = smoothstep(0.655, 0.84, streak * 0.80 + thread * 0.20) * smoothstep(0.57, 0.57 + 0.16, few) * high;
  col = mix(col, mix(mix(vec3(1.0, 0.995, 0.99), vec3(1.0, 0.72, 0.56), duskness), vec3(0.10, 0.13, 0.24), nightness), wisp * 0.58);

  // The sun: a soft disc and its glow.
  vec2 toSun = w - sunAt();
  float sd = length(toSun);
  float sunUp = 1.0 - smoothstep(0.5, 0.8, uNight);
  vec3 sunCol = mix(vec3(1.0, 0.985, 0.94), vec3(1.0, 0.70, 0.40), duskness);
  if (sunUp > 0.0) col += sunCol * (smoothstep(0.027, 0.023, sd) * 0.85 + exp(-sd * sd * 900.0) * 0.30 + exp(-sd * sd * 70.0) * 0.10 + exp(-sd * sd * 6.0) * 0.045) * sunUp;

  // The stars, then the moon over them: a lit disc with soft seas, and a halo.
  if (nightness > 0.0)
    col += (vec3(0.90, 0.93, 1.0) * (stars(w) * 1.6 + meteor(w) * 1.5) + vec3(0.78, 0.84, 1.0) * clusters(w))
           * nightness * smoothstep(uHorizon * 0.6, uHorizon + 0.1, w.y);
  // The moon is whole before any of it shows (owner, 18 November 2026: it "doesn't really look like it starts from
  // behind the clouds"; "still coming up ... full size"): it comes up from behind them as the sun went down, small
  // and amber while it is low, and grows to the sun's own size, its halo with it, as the sky darkens.
  float moonUp = smoothstep(0.40, 0.48, uNight);
  if (moonUp > 0.0) {
    vec2 toMoon = w - moonAt();
    float md = length(toMoon);
    float size = mix(0.014, 0.027, smoothstep(0.50, 1.0, uNight));
    float disc = smoothstep(size, size * 0.92, md);
    vec2 face = toMoon / size;
    // The halo keeps to the disc's scale.
    md *= 0.034 / size;
    float seas = 1.0 - 0.13 * smoothstep(0.55, 0.1, length(face - vec2(-0.22, 0.2)))
                     - 0.09 * smoothstep(0.4, 0.05, length(face - vec2(0.3, -0.12)))
                     - 0.07 * smoothstep(0.3, 0.05, length(face - vec2(0.05, -0.45)));
    vec3 moonCol = mix(vec3(0.99, 0.84, 0.66), vec3(0.93, 0.94, 0.98), smoothstep(0.60, 0.95, uNight));
    float halo = smoothstep(0.55, 1.0, uNight);
    col = mix(col, moonCol * seas, disc * moonUp);
    col += vec3(0.50, 0.60, 0.85) * (exp(-md * md * 420.0) * 0.30 + exp(-md * md * 26.0) * 0.10) * halo * (1.0 - disc);
  }

  // The birds, far off against the sky and behind the clouds: a soft slate by day, darker against the sunset, home
  // by night. They pass in front of the sun (owner, 19 November 2026: "The birds fly behind the sun lol"): its light
  // is brighter than white there, which washed them out, so against it they are a firmer silhouette on the disc
  // itself.
  float flying = 1.0 - smoothstep(0.45, 0.72, uNight);
  if (flying > 0.0) {
    float bird = birds(w) * flying;
    if (bird > 0.0) {
      float glare = smoothstep(0.10, 0.02, sd) * sunUp;
      col = mix(min(col, vec3(1.0)), mix(vec3(0.30, 0.36, 0.45), vec3(0.20, 0.13, 0.15), max(duskness, glare * 0.6)),
                bird * mix(0.62, 0.92, glare));
    }
  }

  // The clouds: the banks' pictures, each slid to where it has drifted, the near bank over the far one (both
  // already times their cover).
  vec2 size = vec2(textureSize(uFarB, 0));
  vec2 at = vec2(uBuffer.z + 0.5 * uBuffer.x + w.x * uBuffer.y, w.y * uBuffer.y);
  if (at.y < size.y) {
    // A bank that has sunk is read from higher up its picture, whose top rows are clear sky.
    vec2 sunk = uSink * uBuffer.y;
    vec4 far = texture(uFarB, (at + vec2(uShift.z, sunk.x)) / size);
    vec4 near = texture(uNearB, (at + vec2(uShift.w, sunk.y)) / size);
    if (uFade < 1.0) {
      far = mix(texture(uFarA, (at + vec2(uShift.x, sunk.x)) / size), far, uFade);
      near = mix(texture(uNearA, (at + vec2(uShift.y, sunk.y)) / size), near, uFade);
    }
    col = (col * (1.0 - far.a) + far.rgb) * (1.0 - near.a) + near.rgb;
  }

  // The foot of the sky: white by day, as the hero's clouds end, deep blue by night.
  float foot = uFoot * (1.0 - smoothstep(0.0, uHorizon * 0.42, w.y + uSink.y));
  col = mix(col, mix(mix(vec3(1.0), vec3(0.93, 0.78, 0.74), duskness), vec3(0.05, 0.07, 0.15), nightness), foot);
  // A little grain: the gradient never bands.
  col += (hash2(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  fragColor = vec4(col, 1.0);
}`,m=64,h=4,g=24,_=Math.max(Math.abs(o.far),Math.abs(o.near));function v(e,t){let n=(t,n)=>{let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS))throw Error(e.getShaderInfoLog(r)??`shader`);return r},r=e.createProgram();if(e.attachShader(r,n(e.VERTEX_SHADER,c)),e.attachShader(r,n(e.FRAGMENT_SHADER,t)),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS))throw Error(e.getProgramInfoLog(r)??`program`);let i=new Map;return{made:r,uniform:t=>i.get(t)??(i.set(t,e.getUniformLocation(r,t)),i.get(t))}}function y(t){let n=t.getContext(`webgl2`,{alpha:!1,antialias:!1,powerPreference:`high-performance`});if(!n)return null;let r=v(n,l),i=v(n,d),a=v(n,f),c=v(n,p),u=n.createVertexArray();n.bindVertexArray(u);let y=n.createTexture();n.bindTexture(n.TEXTURE_3D,y),n.texStorage3D(n.TEXTURE_3D,1,n.RGBA8,m,m,m);for(let[e,t]of[[n.TEXTURE_MIN_FILTER,n.LINEAR],[n.TEXTURE_MAG_FILTER,n.LINEAR],[n.TEXTURE_WRAP_S,n.REPEAT],[n.TEXTURE_WRAP_T,n.REPEAT],[n.TEXTURE_WRAP_R,n.REPEAT]])n.texParameteri(n.TEXTURE_3D,e,t);let b=n.createFramebuffer();n.bindFramebuffer(n.FRAMEBUFFER,b),n.viewport(0,0,m,m),n.useProgram(r.made),n.uniform1f(r.uniform(`uSize`),m);for(let e=0;e<m;e++)n.framebufferTextureLayer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,y,0,e),n.uniform1f(r.uniform(`uSlice`),e),n.drawArrays(n.TRIANGLES,0,3);n.deleteFramebuffer(b);let x={key:``,width:0,height:0,wide:0,full:0,pad:0},S=[],C=()=>{for(let e of S)n.deleteTexture(e.far),n.deleteTexture(e.near),n.deleteFramebuffer(e.target);S=[]},w=(e,t)=>{let r=n.createTexture();return n.bindTexture(n.TEXTURE_2D,r),n.texStorage2D(n.TEXTURE_2D,1,n.RGBA8,e,t),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),r},T=e=>{let r=Math.max(2,Math.round(t.width*e.scale)),i=Math.max(2,Math.round(t.height*e.scale)),a=Math.ceil(_*i*(h+2*e.cycle+1.5))+2,o=r+2*a,c=Math.min(i,Math.ceil(s(e.cover,e.horizon)*i)),l=`${o}x${c}:${r}x${i}`;if(l===x.key)return!1;x={key:l,width:o,height:c,wide:r,full:i,pad:a},C();for(let e=0;e<3;e++){let e={far:w(o,c),near:w(o,c),target:n.createFramebuffer(),at:0};n.bindFramebuffer(n.FRAMEBUFFER,e.target),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,e.far,0),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT1,n.TEXTURE_2D,e.near,0),n.drawBuffers([n.COLOR_ATTACHMENT0,n.COLOR_ATTACHMENT1]),S.push(e)}return!0},E=1,D=null,O=``,k=null,A=null,j=e=>`${e.night.toFixed(4)}|${e.steps}|${e.cover}|${e.horizon}`,M=(t,r,a)=>{a<=r||(n.bindFramebuffer(n.FRAMEBUFFER,S[2].target),n.viewport(0,0,x.width,x.height),n.enable(n.SCISSOR_TEST),n.scissor(r,0,a-r,x.height),n.useProgram(i.made),n.uniform2f(i.uniform(`uRes`),x.wide,x.full),n.uniform1f(i.uniform(`uPad`),x.pad),n.uniform1f(i.uniform(`uTime`),t.time),n.uniform1f(i.uniform(`uNight`),t.night),n.uniform1f(i.uniform(`uHorizon`),t.horizon),n.uniform4fv(i.uniform(`uPlaces`),t.places??e),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_3D,y),n.uniform1i(i.uniform(`uNoise`),0),n.uniform1i(i.uniform(`uSteps`),t.steps),n.uniform1f(i.uniform(`uCover`),t.cover),n.drawArrays(n.TRIANGLES,0,3),n.disable(n.SCISSOR_TEST))},N=(e,t)=>{n.bindFramebuffer(n.FRAMEBUFFER,e.target),n.viewport(0,0,x.width,x.height),n.useProgram(a.made),n.activeTexture(n.TEXTURE1),n.bindTexture(n.TEXTURE_2D,S[2].far),n.uniform1i(a.uniform(`uFar`),1),n.activeTexture(n.TEXTURE2),n.bindTexture(n.TEXTURE_2D,S[2].near),n.uniform1i(a.uniform(`uNear`),2),n.drawArrays(n.TRIANGLES,0,3),e.at=t},P=r=>{let i=t.width,a=t.height;if(i<2||a<2)return;n.bindVertexArray(u);let s=T(r),l=k?r.time-k.time:0;if(s||!k||r.cycle<=0||l<0||l>1)A=null,M(r,0,x.width),N(S[0],r.time),N(S[1],r.time),E=1,D=null,O=j(r);else{let e=l/r.cycle;if(E=Math.min(1,E+e),!D&&(j(r)!==O||r.time-S[1].at>h)){let e=l>0?(r.night-k.night)/l:0,t=Math.min(1,Math.max(0,r.night+e*2*r.cycle));D={look:{...r,night:t},done:0},O=j(r)}if(D){let t=Math.min(1,D.done+e);M(D.look,Math.round(D.done*x.width),Math.round(t*x.width)),D.done=t,t>=1&&E>=1&&(N(S[0],D.look.time),S=[S[1],S[0],S[2]],E=0,D=null)}}k={time:r.time,night:r.night},n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,i,a),n.useProgram(c.made),n.uniform2f(c.uniform(`uRes`),i,a),n.uniform1f(c.uniform(`uTime`),r.time),n.uniform1f(c.uniform(`uNight`),r.night),n.uniform1f(c.uniform(`uHorizon`),r.horizon),n.uniform4fv(c.uniform(`uPlaces`),r.places??e),n.uniform1f(c.uniform(`uFoot`),r.foot),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_3D,y),n.uniform1i(c.uniform(`uNoise`),0);let[d,f]=S;for(let[e,t,r]of[[1,`uFarA`,d.far],[2,`uNearA`,d.near],[3,`uFarB`,f.far],[4,`uNearB`,f.near]])n.activeTexture(n.TEXTURE0+e),n.bindTexture(n.TEXTURE_2D,r),n.uniform1i(c.uniform(t),e);n.uniform1f(c.uniform(`uFade`),E);let p=(e,t)=>(r.time-e.at)*t*x.full;n.uniform4f(c.uniform(`uShift`),p(d,o.far),p(d,o.near),p(f,o.far),p(f,o.near)),n.uniform3f(c.uniform(`uBuffer`),x.wide,x.full,x.pad),n.uniform2f(c.uniform(`uSink`),(r.sink??0)*.55,r.sink??0),n.drawArrays(n.TRIANGLES,0,3)},F=n.getExtension(`WEBGL_debug_renderer_info`);return{render:P,warm(e){if(t.width<2||t.height<2)return!1;if(n.bindVertexArray(u),T(e)&&(A=0),A===null)return!0;let r=Math.min(1,A+1/g);return M(e,Math.round(A*x.width),Math.round(r*x.width)),A=r,r<1?!1:(N(S[0],e.time),N(S[1],e.time),E=1,D=null,O=j(e),k={time:e.time,night:e.night},A=null,!0)},bench(e,t,r=1/60,i=!1){let a=new Uint8Array(4),o=()=>n.readPixels(0,0,1,1,n.RGBA,n.UNSIGNED_BYTE,a);k=null,P(e),o();let s=performance.now();for(let a=1;a<=t;a++)P({...e,time:e.time+a*r,night:i?a/t:e.night}),n.flush();return o(),k=null,(performance.now()-s)/t},renderer:String(F?n.getParameter(F.UNMASKED_RENDERER_WEBGL):n.getParameter(n.RENDERER)),dispose(){n.deleteTexture(y),C(),n.deleteVertexArray(u);for(let e of[r,i,a,c])n.deleteProgram(e.made)}}}export{y as t};