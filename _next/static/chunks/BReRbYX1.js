import{d as e}from"./CQ5ApvO_.js";import{k as t}from"./Ceg0oLf2.js";import{jt as n,k as r,q as i}from"./wDoPzj63.js";import{u as a}from"./26xdbPUb.js";import{C as o,T as s,h as c,i as l,l as u,n as d,s as f,w as p}from"./d6zlMmBg.js";var m={delay:.25,seconds:1.8},h={delay:.2,seconds:1.3},g=`const vec3 MARK_BOX = vec3(${e.founder.box.map(e=>e.toFixed(3)).join(`, `)});
float cutOrder(vec2 xy, float span) {
  vec2 at = vec2((xy.x / span + 0.5) * MARK_BOX.z + MARK_BOX.x, (0.5 - xy.y / span) * MARK_BOX.z + MARK_BOX.y);
  vec2 orb = at - vec2(6.0, 9.473), piece = at - vec2(13.085, 2.386);
  if (length(piece) - 2.4 < length(orb) - 6.0)
    return 0.8 + 0.2 * clamp((dot(piece, vec2(0.7071, -0.7071)) + 2.63) / 5.26, 0.0, 1.0);
  return 0.8 * fract(atan(orb.x, -orb.y) / 6.2831853 + 1.0);
}
`,_=`uniform float uTime;
uniform float uCut; // how far the engraving is cut (0 to 1)
uniform float uFilm; // how far in from the edges the glass's film has flowed over its faces (0 to 1)
uniform vec3 uPointer; // the pointer on the face, in the card's units (xy), and how far it is over the card (z)
float faceSquare(vec2 xy, float size, float r) {
  vec2 b = abs(xy) - vec2(size - r);
  return length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - r;
}
vec2 faceXY(vec3 p) {
  return vec2(p.z < 0.0 ? -p.x : p.x, p.y);
}
`,v=`${t}${_}const float VEIL = 0.1;
void main() {
  vec3 p = vObj;
  mat3 toView = mat3(vN0, vN1, vN2);
  vec3 nl = slabNormal(p, S), n = normalize(toView * nl), rd = normalize(vView);
  vec3 v = normalize(vec3(dot(vN0, rd), dot(vN1, rd), dot(vN2, rd)));
  float facing = clamp(-dot(rd, n), 0.0, 1.0);
  float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
  vec3 mirror = nearStudio(vAt, reflect(rd, n), S);
  vec3 sky = min(studio(mirror), vec3(1.2));
  float face = smoothstep(0.86, 0.985, abs(nl.z));
  vec3 bent = refract(v, nl, 1.0 / 1.49);
  vec3 through = studio(normalize(toView * bent)) * 0.72 + sky * fresnel * 0.3;
  vec3 clear = mix(vec3(0.78, 0.83, 0.9), sky, fresnel);
  float a = mix(0.58, 0.1 + 0.6 * fresnel, face);
  vec4 glass = vec4(mix(through, clear, face) * a, a);
  float lineAt = (abs(nl.z) - 0.95) / 0.025;
  float line = exp(-lineAt * lineAt) * 0.55;
  glass = vec4(vec3(line), line) + glass * (1.0 - line);
  vec4 inner = vec4(0.0);
  vec3 ink = toDisplay(uInk);
  if (face > 0.0 && abs(bent.z) > 1e-3 && uIconMode > 0.5) {
    float span = S * 2.0 * ICON, soft = max(length(fwidth(p.xy)) * 1.3, 1e-5), side = sign(p.z);
    float far = (-side * S * DEPTH - p.z) / bent.z;
    float wall = smoothstep(-soft, soft, faceSquare(p.xy + bent.xy * far, S * (1.0 - EDGE * 0.4), S * (CORNER + EDGE * 0.6))) * face;
    glass += vec4(through * 0.85, 1.0) * wall * 0.55 * (1.0 - glass.a);
    float tb = (-side * S * DEPTH * 0.96 - p.z) / bent.z;
    vec2 back = faceXY(vec3(p.xy + bent.xy * tb, p.z)) + vec2(0.03, -0.05) * span;
    float shade = (1.0 - smoothstep(-span * 0.02, span * 0.09, iconPlane(back, span))) * 0.16 * face;
    inner = vec4(vec3(0.12, 0.13, 0.17) * shade, shade);
    for (int k = 0; k < 2; k++) {
      float z = side * S * (k == 0 ? -0.05 : 0.05);
      float t = (z - p.z) / bent.z;
      float m = clamp(0.5 - iconPlane(faceXY(vec3(p.xy + bent.xy * t, p.z)), span) / soft, 0.0, 1.0) * face;
      vec3 c = k == 0 ? ink * 0.55 : ink;
      inner = vec4(c * m, m) + inner * (1.0 - m);
    }
  }
  vec4 lit = glass + inner * (1.0 - glass.a);
  float glint = pool(mirror, KEY, 160.0) * 0.35 + pool(mirror, RIM, 40.0) * 0.2;
  vec4 colour = vec4(lit.rgb + vec3(glint), min(lit.a + glint, 1.0));
  vec3 swirl = nl + p / S * 0.6;
  vec3 w = swirl * 1.4 + 0.4 * sin(swirl.yzx * 2.7 + uTime * 0.11);
  float thickness = COAT.x + COAT.y * sin(dot(w, vec3(1.7, 1.1, -1.4)) + uTime * 0.09);
  float r = length(faceXY(p) - uPointer.xy) / S;
  thickness += COAT.y * 0.7 * uPointer.z * exp(-r * r * 2.5) * sin(r * 9.0 - uTime * 2.2);
  vec3 coat = film(path(thickness, FILM_INDEX, max(facing, FILM_EDGE)));
  coat = mix(vec3(dot(coat, vec3(0.3, 0.55, 0.15))), coat, FILM_SATURATION);
  vec3 sheen = mix(vec3(1.0), coat, FILM);
  float inward = clamp(1.0 - max(abs(p.x), abs(p.y)) / (S * (1.0 - EDGE)), 0.0, 1.0), reach = uFilm * 1.15;
  float covered = max(1.0 - face, 1.0 - smoothstep(reach - 0.12, reach, inward));
  colour.rgb = mix(colour.rgb, colour.rgb * sheen, mix(0.45, 1.0, fresnel) * covered);
  float lead = (inward - reach) / 0.05;
  colour += vec4(sheen * 0.95, 1.0) * (VEIL * covered * face + 0.25 * exp(-lead * lead) * face * step(uFilm, 0.999)) * (1.0 - colour.a);
  gl_FragColor = vec4(toLinear(clamp(colour.rgb / max(colour.a, 1e-4), 0.0, 1.0)), colour.a);
}`,y=`${a}${_}${g}float sparkle(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
  vec3 p = vObj;
  mat3 toView = mat3(vN0, vN1, vN2);
  vec3 nl = slabNormal(p, S), rd = normalize(vView);
  float face = smoothstep(S * DEPTH * 0.55, S * DEPTH * 0.92, abs(p.z));
  vec2 xy = faceXY(p);
  float span = S * 2.0 * ICON, wall = max(span * 0.022, length(fwidth(xy)) * 1.3);
  float d = uIconMode > 0.5 ? iconPlane(xy, span) : 1e3, satin = 0.0, walls = 0.0;
  float order = cutOrder(xy, span), carved = clamp((uCut - order) / 0.04, 0.0, 1.0);
  if (d < wall && face > 0.0 && carved > 0.0) {
    float h = max(wall * 0.25, 1.5 * span / CELL);
    vec2 g = vec2(iconPlane(xy + vec2(h, 0.0), span) - iconPlane(xy - vec2(h, 0.0), span),
      iconPlane(xy + vec2(0.0, h), span) - iconPlane(xy - vec2(0.0, h), span)) / (2.0 * h);
    float w = clamp((d + wall) / wall, 0.0, 1.0), k = 4.8 * w * (1.0 - w) * face * carved;
    nl = normalize(nl - vec3((p.z < 0.0 ? -g.x : g.x) * k, g.y * k, 0.0));
    walls = 4.0 * w * (1.0 - w) * face * carved;
    satin = (1.0 - smoothstep(-wall * 1.2, -wall * 0.8, d)) * face * carved;
  }
  vec3 n = normalize(toView * nl);
  float facing = clamp(-dot(rd, n), 0.0, 1.0);
  vec3 seen = nearStudio(vAt, reflect(rd, n), S);
  vec2 at = xy / S;
  float fine = length(fwidth(xy)) / S;
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
  colour += GOLD_PALE * 1.4 * exp(-front * front) * sin(3.1415927 * run) * walls * step(1.0, uCut);
  if (uCut > 0.0 && uCut < 1.0 && d < wall * 2.0) {
    float tip = (uCut - order) / 0.035;
    float spark = step(0.82, sparkle(floor(xy / span * 90.0) + floor(uTime * 24.0)));
    colour += vec3(1.0, 0.85, 0.55) * exp(-tip * tip) * (0.6 + 1.6 * spark) * face;
  }
  vec2 gd = (at - uPointer.xy / S) * 0.44;
  colour += GOLD_PALE * uPointer.z * (0.3 * exp(-dot(gd, gd) * 7.0) + 0.08 * exp(-dot(gd, gd) * 1.6)) * face;
  gl_FragColor = vec4(toLinear(clamp(colour, 0.0, 1.0)), 1.0);
}`;async function b(e,t){let a=new d,g=new n,_={value:t===`gold`?0:1},b={value:t===`glass`?0:1};a.fragmentShader=l+(t===`glass`?v:y),Object.assign(a.uniforms,{uTime:p.time,uCut:_,uFilm:b,uPointer:{value:g}}),a.transparent=t===`glass`,o(a,e.pal),c(e.icon).then(e=>{a.icon=e,a.uniforms.uIcon.value=e,a.uniforms.uIconMode.value=2},()=>{});let x=new i(s(),a);x.userData.noCast=!0;let S=new r;return S.add(x),{group:S,tick(e,t,n){let r=n.over&&!n.spinning,i=1-Math.exp(-t*6);g.x+=((r?f(n.x,-1.5,1.5)/3:g.x)-g.x)*i,g.y+=((r?f(n.y,-1.5,1.5)/3:g.y)-g.y)*i,g.z+=(+!!r-g.z)*i},intro(e){t===`gold`?_.value=f((e-m.delay)/m.seconds,0,1):b.value=u(f((e-h.delay)/h.seconds,0,1))},recolor(e){o(a,e)}}}export{b as t};