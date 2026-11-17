export const signal = {
  crt: `
    vec2 q=uv*2.0-1.0;
    vec2 pos=q*(1.0+dot(q,q)*0.13*detail);
    vec2 at=pos*0.5+0.5;
    float frame=step(max(abs(pos.x),abs(pos.y)),1.0);
    float lines=0.72+0.28*sin(p.y/max(width,2.0)*TAU+phase*TAU);
    float mask=mod(floor(p.x),3.0);
    vec3 rgb=vec3(0.81)+0.28*vec3(float(mask==0.0),float(mask==1.0),float(mask==2.0));
    return src(at)*rgb*lines*frame*(1.15-0.28*dot(q,q));
  `,
  "pixel-sort": `return texture2D(tPattern,uv).rgb;`,
  forensics: `
    float contours=smoothstep(0.018,0.32-detail*0.20,outline(max(1.0,width*0.11)));
    float gridLines=max(line(p.x/width,0.02),line(p.y/width,0.02));
    float ticks=line(p.y/(width*4.0),0.018)*step(0.92,uv.x);
    return tone(sat(contours*0.85+gridLines*0.20+ticks*0.8+lum*0.23));
  `,
  "digital-distortion": `
    float band=floor(p.y/width);
    float gate=hash(vec2(band,floor(phase*28.0)));
    float shift=(hash(vec2(band,10.0))-0.5)*width*7.0*detail*step(0.59,gate);
    vec3 c=displaced(vec2(shift,0));
    vec3 shiftColor=vec3(displaced(vec2(shift+width*0.29,0)).r,c.g,displaced(vec2(shift-width*0.29,0)).b);
    return mix(c,shiftColor,detail*gate)+vec3(hash(p+gate)-0.5)*0.14*gate;
  `,
  datamosh: `
    vec2 cell=floor(p/width);
    float stepTime=floor(phase*13.0);
    vec2 seed=hash2(vec2(floor(cell.y*0.4),stepTime+3.0));
    float gate=step(0.72-detail*0.45,hash(cell+floor(phase*7.0)));
    vec2 jump=vec2((seed.x-0.31)*width*8.0,round((seed.y-0.5)*3.0)*width);
    vec3 c=displaced(jump*gate);
    vec3 blocks=pixelSrc(grid(width)+jump);
    return mix(c,quantize(blocks,13.0),gate*detail*0.60);
  `,
  lofi: `
    float wave=sin((uv.y*7.0-phase)*TAU)+0.38*sin((uv.y*57.0+phase)*TAU);
    vec2 offset=vec2(wave*width*detail*0.16,0);
    vec3 c=rgbShift(offset+vec2(width*0.11,0));
    float y=gray(c);
    return mix(vec3(y),c,0.55+0.25*detail)*0.93+0.075+(hash(floor(p)+floor(phase*55.0))-0.5)*0.16*detail;
  `,
  "rgb-split": `return rgbShift(rot(vec2(width,0),a));`,
  scanline: `
    float bars=smoothstep(0.16,0.70,0.5+0.5*cos(TAU*(p.y/max(width,2.0)-phase)));
    return mix(base,uShadow,bars*detail);
  `,
  thermal: `return thermal(sat((lum-0.5)*(0.6+detail*1.5)+0.5));`,
  beacon: `
    vec2 f=fract(p/width)-0.5;
    float brightness=lightAt(grid(width));
    float signalValue=brightness*(0.55+0.45*sin(TAU*(uv.y*2.0-phase)));
    float point=circle(f,0.11+0.29*signalValue);
    float rings=exp(-abs(length(f)-0.35)*42.0)*signalValue;
    return tone(sat(point*signalValue+rings*detail));
  `,
  disco: `
    vec2 q=p/width,id=floor(q),f=fract(q)-0.5;
    vec3 c=pixelSrc(grid(width)); float v=gray(c);
    float hue=hash(id)*0.62+phase+v*0.3;
    float radius=0.11+0.35*sqrt(v);
    float choice=hash(id+51.0);
    float shape=choice<0.38?circle(f,radius):choice<0.67?diamond(f,radius):box(f,vec2(radius*0.8),0.06);
    return vec3(0.035,0.029,0.061)+shape*mix(c,spectrum(hue),detail)*(0.3+0.86*v);
  `,
  anaglyph: `
    vec2 d=rot(vec2(width,0),a);
    float left=gray(displaced(d)), right=gray(displaced(-d));
    return vec3(left,right*0.91,right);
  `,
  "gradient-map": `
    float t=pow(lum,exp2((0.5-detail)*3.8));
    return tone(t*t*(3.0-2.0*t));
  `,
  prism: `
    vec2 q=rot(p,a)/width;
    float facet=fract(q.x+floor(q.y)*0.5)-0.5;
    vec2 d=rot(vec2(facet*width*2.2*detail,0),-a);
    return rgbShift(d)*0.82+spectrum(facet*0.41+lum)*abs(facet)*detail*0.36;
  `,
  dreamdust: `
    vec2 q=(p+vec2(phase*width*7.0,phase*width*3.0))/width;
    vec4 v=voronoi(q);
    float size=hash(v.xy)*0.22;
    float fleck=circle(vec2(v.z,0),size)*smoothstep(0.09,0.78,lum);
    float halo=exp(-v.z*v.z*22.0)*lum;
    return mix(base,tone(lum),0.14)+uLight*(fleck+halo*0.3)*detail*0.85;
  `,
  "light-wind": `
    vec3 blurred=blurLine(uv,rot(vec2(width*(1.5+phase),0),a));
    float ribbons=pow(sat(sin((rot(center,a).y*8.0+phase)*TAU)*0.5+0.5),4.0);
    return base+tone(gray(blurred))*smoothstep(0.49,0.92,gray(blurred))*(0.5+ribbons)*detail*0.85;
  `,
  kaleidoscope: `
    float repeats=3.0+floor(detail*16.0), wedge=TAU/repeats;
    float phi=abs(mod(atan(center.y,center.x+1e-6)+a+phase*wedge,wedge)-wedge*0.5);
    vec2 q=length(center)*vec2(cos(phi+a),sin(phi+a));
    return src(reflected(0.5+q*unit/uSize));
  `,
  warpbloom: `
    vec2 q=p/(width*3.0);
    vec2 wave=vec2(sin(q.y+phase*TAU),cos(q.x-phase*TAU));
    vec3 warp=displaced(wave*width*detail*0.62);
    vec3 glow=blurDisk(width*1.8,0.43);
    return warp+glow*tone(lum)*detail;
  `,
  duotone: `return tone(sat((lum-0.5)*(0.75+detail*1.75)+0.5));`,
  "edge-glow": `
    float edgeLight=smoothstep(0.02,0.58-detail*0.32,outline(width*0.47));
    float glow=sqrt(smoothstep(0.012,0.40,outline(width*1.3)));
    return tone(sat(edgeLight+glow*0.36+lum*0.11));
  `,
  aberration: `
    vec2 shift=center*pow(length(center)*1.85,0.4+detail*2.0)*width*2.5;
    return rgbShift(shift);
  `,
} as const;
