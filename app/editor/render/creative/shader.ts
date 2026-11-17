export const fullScreenVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export function effectFragment(body: string) {
  return `
uniform sampler2D tInput;
uniform sampler2D tPattern;
uniform vec2 uSize;
uniform float uOpacity, uSizePx, uDetail, uAngle, uPhase, uGlyphCount;
uniform vec3 uShadow, uLight;
uniform bool uInvert;
varying vec2 vUv;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec2 uv, p, center;
float unit, width, detail, a, phase, lum, aa;
vec3 base;

float sat(float x) { return clamp(x, 0.0, 1.0); }
float gray(vec3 c) { return dot(c, LUMA); }
vec2 rot(vec2 q, float theta) {
  float c = cos(theta), s = sin(theta);
  return vec2(c*q.x-s*q.y, s*q.x+c*q.y);
}
float hash(vec2 v) {
  vec3 q = fract(vec3(v.xyx) * vec3(0.1031, 0.1137, 0.1379));
  q += dot(q, q.yzx + 19.19);
  return fract((q.x + q.y) * q.z);
}
vec2 hash2(vec2 q) { return vec2(hash(q), hash(q + vec2(19.1, 73.6))); }
float noise(vec2 q) {
  vec2 cell = floor(q), f = fract(q);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(cell),hash(cell+vec2(1,0)),f.x),mix(hash(cell+vec2(0,1)),hash(cell+1.0),f.x),f.y);
}
float fbm(vec2 q) {
  return 0.55*noise(q) + 0.28*noise(rot(q,0.8)*2.07) + 0.12*noise(q*4.2) + 0.05*noise(q*9.1);
}
vec3 spectrum(float t) {
  return 0.5 + 0.5*cos(TAU*(t + vec3(0.0, 0.67, 0.33)));
}
vec2 reflected(vec2 q) { return 1.0 - abs(mod(q,2.0)-1.0); }
vec3 src(vec2 q) { return texture2D(tInput, q).rgb; }
vec3 pixelSrc(vec2 q) { return src(q/uSize); }
float lightAt(vec2 q) { return gray(pixelSrc(q)); }
vec3 displaced(vec2 offset) { return src(reflected(uv + offset/uSize)); }
vec3 tone(float t) { return mix(uShadow, uLight, sat(t)); }
vec3 ink(float coverage) { return tone(1.0-coverage); }
float quant(float x, float n) { return floor(x*n+0.5)/n; }
vec3 quantize(vec3 c, float n) { return floor(c*n+0.5)/n; }
float edge(float d, float threshold) { return 1.0-smoothstep(threshold-aa,threshold+aa,d); }
float line(float x, float thickness) { return edge(abs(fract(x+0.5)-0.5),thickness); }
float circle(vec2 q, float radius) { return edge(length(q),radius); }
float box(vec2 q, vec2 halfSize, float rounding) {
  vec2 d = abs(q) - halfSize + rounding;
  return 1.0-smoothstep(-aa,aa,length(max(d,0.0))+min(max(d.x,d.y),0.0)-rounding);
}
float diamond(vec2 q, float radius) { return edge(abs(q.x)+abs(q.y),radius); }
float rim(vec2 q, vec2 halfSize, float border) {
  return box(q,halfSize,0.0)-box(q,halfSize-border,0.0);
}
vec2 grid(float scale) { return (floor(p/scale)+0.5)*scale; }
vec2 rotatedGrid(vec2 coord, float scale, float theta) {
  return rot((floor(rot(coord,theta)/scale)+0.5)*scale,-theta);
}
vec2 hexCenter(vec2 q) {
  vec2 period=vec2(1.7320508,1.0);
  vec2 ca=(floor(q/period)+0.5)*period;
  vec2 cb=(floor((q-period*0.5)/period)+1.0)*period;
  vec2 da=q-ca, db=q-cb;
  return dot(da,da)<dot(db,db) ? ca : cb;
}
float hexDist(vec2 q) {
  q=abs(q);
  return max(q.y,dot(q,vec2(0.8660254,0.5)));
}
// The closest two procedural seed points define colored cells and ridges.
vec4 voronoi(vec2 q) {
  vec2 cell=floor(q), f=fract(q), nearest=vec2(0);
  float d1=9.0,d2=9.0;
  for (int y=-1;y<=1;y++) {
    for (int x=-1;x<=1;x++) {
      vec2 offset=vec2(float(x),float(y));
      vec2 point=offset+0.16+0.68*hash2(cell+offset);
      vec2 delta=f-point;
      float dist=dot(delta,delta);
      if(dist<d1){d2=d1;d1=dist;nearest=point+cell;}
      else if(dist<d2){d2=dist;}
    }
  }
  return vec4(nearest,sqrt(d1),sqrt(d2)-sqrt(d1));
}
vec2 gradient(vec2 q,float distance) {
  vec2 dx=vec2(distance,0),dy=dx.yx;
  return vec2(lightAt(q+dx)-lightAt(q-dx),lightAt(q+dy)-lightAt(q-dy));
}
float outline(float radius) { return length(gradient(p,radius)); }
float screenDot(vec2 point, float theta, float spacing, float density) {
  vec2 q=rot(point,theta)/spacing;
  return circle(fract(q)-0.5,0.54*sqrt(sat(density))) * step(0.001,density);
}
vec3 blurLine(vec2 at,vec2 displacement) {
  vec3 acc=vec3(0);
  float total=0.0;
  for (int i=-6;i<=6;i++) {
    float t=float(i)/6.0;
    float w=exp(-2.8*t*t);
    acc+=src(at+t*displacement/uSize)*w;
    total+=w;
  }
  return acc/total;
}
vec3 blurDisk(float radius, float cutoff) {
  vec3 original=base;
  vec3 sum=original*smoothstep(cutoff,min(cutoff+0.24,1.001),lum)*2.0;
  float weight=2.0;
  for(int ring=1;ring<=3;ring++){
    float r=float(ring)/3.0;
    float w=exp(-2.2*r*r);
    for(int i=0;i<8;i++){
      vec2 q=p+rot(vec2(r*radius,0),float(i)*PI/4.0+float(ring)*1.3);
      vec3 c=pixelSrc(q);
      sum+=c*smoothstep(cutoff,min(cutoff+0.24,1.001),gray(c))*w;
      weight+=w;
    }
  }
  return sum/weight;
}
vec3 rgbShift(vec2 shift) {
  return vec3(displaced(shift).r,base.g,displaced(-shift).b);
}
vec3 thermal(float t) {
  t=sat(t);
  vec3 c=vec3(0.025,0.015,0.055);
  c=mix(c,vec3(0.19,0.10,0.57),smoothstep(0.0,0.28,t));
  c=mix(c,vec3(0.89,0.06,0.31),smoothstep(0.23,0.57,t));
  c=mix(c,vec3(1,0.65,0.06),smoothstep(0.48,0.80,t));
  return mix(c,vec3(1,1,0.85),smoothstep(0.78,1.0,t));
}
vec3 metal(float t) {
  return vec3(0.14,0.18,0.24) + 0.78*pow(vec3(0.5+0.5*sin(14.0*t+0.6)),vec3(2.1,1.8,1.5));
}
float glyph(vec2 local, float brightness) {
  if (local.x<0.0 || local.x>=1.0 || local.y<0.0 || local.y>=1.0) return 0.0;
  float i=floor(sat(brightness)*(uGlyphCount-1.0)+0.5);
  return texture2D(tPattern,vec2((i+local.x*0.964+0.018)/uGlyphCount,local.y)).r;
}
vec3 glyphArt(float colorMix, bool keycaps, bool pulse) {
  vec2 cellSize=vec2(width*0.68,width);
  vec2 q=p/cellSize;
  vec2 i=floor(q);
  vec2 local=fract(q);
  vec3 original=pixelSrc((i+0.5)*cellSize);
  float value=sat((gray(original)-0.5)*(0.9+1.6*detail)+0.5);
  if (uInvert) value=1.0-value;
  if (pulse) value=sat(value+0.16*sin(i.y*0.18+i.x*0.12-TAU*phase)*step(0.001,phase));
  float text=glyph(local,value)*smoothstep(0.01,0.23,value);
  vec3 mark=mix(uLight,mix(uLight,original,0.73),colorMix);
  vec3 ground=uShadow;
  if (keycaps) {
    vec2 f=local-0.5;
    float cap=box(f,vec2(0.45),0.12);
    float bevel=box(f+vec2(0,0.035),vec2(0.4),0.10);
    ground=mix(ground,original*0.49,cap);
    ground=mix(ground,original*(0.62+0.24*detail)+0.055,bevel);
    mark=mix(uLight,uShadow,smoothstep(0.43,0.72,gray(original)));
  }
  return mix(ground,mark,text);
}
vec3 glassSample(vec2 displacement, float ridge, float facet, float dispersion) {
  vec2 offset=displacement*width*detail;
  return clamp(rgbShift(offset*0.19*dispersion)*0.13+
    vec3(displaced(offset*(1.0+dispersion*0.08)).r,displaced(offset).g,displaced(offset*(1.0-dispersion*0.08)).b)*0.87
    + facet*detail*0.2 + ridge*0.27,0.0,1.0);
}

vec3 renderEffect() {
  ${body}
}
void main(){
  uv=vUv;
  p=uv*uSize;
  unit=min(uSize.x,uSize.y);
  // The control is measured relative to a 720px short edge, for the same
  // pattern density in a small preview and a high-resolution export.
  width=max(1.0,uSizePx*unit/720.0);
  center=(p-0.5*uSize)/unit;
  aa=clamp(0.65/width,0.001,0.22);
  a=uAngle;
  phase=uPhase;
  detail=uDetail;
  vec4 original=texture2D(tInput,uv);
  base=original.rgb;
  lum=gray(base);
  vec3 result=clamp(renderEffect(),0.0,1.0);
  gl_FragColor=vec4(mix(base,result,uOpacity),original.a);
}
`;
}
