export const print = {
  characters: `return glyphArt(0.0,false,true);`,
  "ascii-studio": `return glyphArt(detail,false,true);`,
  keycap: `return glyphArt(0.38,true,false);`,
  block: `return glyphArt(0.45,false,false);`,
  mixed: `return glyphArt(0.19,false,false);`,
  dots: `
    vec2 c=grid(width);
    return tone(circle((p-c)/width,0.45*sqrt(lightAt(c))*(0.55+detail*0.65)));
  `,
  braille: `
    vec2 q=p/(width*0.29); vec2 id=floor(q);
    vec2 inCell=mod(id,vec2(3.0,5.0));
    float gaps=step(inCell.x,1.0)*step(inCell.y,3.0);
    float on=step(0.7-detail*0.44,lightAt((id+0.5)*width*0.29));
    return tone(gaps*on*circle(fract(q)-0.5,0.32));
  `,
  "pixel-art": `return quantize(pixelSrc(grid(width)),2.0+floor(detail*27.0));`,
  mosaic: `
    vec2 q=fract(p/width)-0.5;
    vec3 c=pixelSrc(grid(width));
    return mix(c*0.22,c,box(q,vec2(0.49-detail*0.11),0.02));
  `,
  lego: `
    vec2 q=fract(p/width)-0.5;
    vec3 c=quantize(pixelSrc(grid(width)),7.0);
    float brick=box(q,vec2(0.48),0.06);
    float stud=circle(q,0.27);
    float shade=circle(q+vec2(0.045,-0.055),0.27)-circle(q-vec2(0.035,-0.045),0.27);
    return c*(0.28+brick*0.72+detail*(stud*0.16+shade*0.56)) + vec3(stud*0.035);
  `,
  voxel: `
    vec2 local=vec2(p.x+p.y*0.72,p.x-p.y*0.72)/width;
    vec2 id=floor(local), f=fract(local);
    vec2 c=(id+0.5)*width;
    c=vec2((c.x+c.y)*0.5,(c.x-c.y)/1.44);
    vec3 top=quantize(pixelSrc(c),9.0);
    vec3 left=quantize(pixelSrc(c-vec2(width*0.48,0.0)),9.0)*(1.0-detail*0.42);
    vec3 right=quantize(pixelSrc(c-vec2(0,width*0.48)),9.0)*(1.0-detail*0.19);
    float topArea=smoothstep(0.39,0.43,min(f.x,f.y));
    vec3 faces=mix(left,right,smoothstep(-0.03,0.03,f.x-f.y));
    return mix(faces,top,topArea)*mix(0.74,1.0,smoothstep(0.0,0.07,min(f.x,f.y)));
  `,
  "hex-mosaic": `
    vec2 q=p/width, h=hexCenter(q);
    return pixelSrc(h*width)*mix(0.42,1.0,edge(hexDist(q-h),0.49-detail*0.055));
  `,
  "led-matrix": `
    vec2 q=p/width; vec3 c=pixelSrc(grid(width)); float y=gray(c), r=length(fract(q)-0.5);
    vec3 bulb=mix(uLight,c,0.43);
    return uShadow+bulb*y*(edge(r,0.30)*0.87+exp(-r*r*12.0)*detail*0.76);
  `,
  dither: `return texture2D(tPattern,uv).rgb;`,
  stippling: `
    vec2 q=p/(width*0.48); vec2 i=floor(q);
    vec2 spot=0.14+0.72*hash2(i);
    float density=1.0-lightAt((i+spot)*width*0.48);
    return ink(circle(fract(q)-spot,0.44*sqrt(density)*(0.64+detail*0.7))*step(hash(i+0.5)*0.46,density));
  `,
  risograph: `
    vec2 d=vec2(1.0,-0.5)*width*detail;
    vec3 c1=pixelSrc(rotatedGrid(p+d,width,a)), c2=pixelSrc(rotatedGrid(p-d,width,a+1.0));
    float m=screenDot(p+d,a,width,(1.0-c1.g)*0.86);
    float c=screenDot(p-d,a+1.0,width,(1.0-c2.r)*0.89);
    return vec3(0.97,0.93,0.83)*mix(vec3(1),uShadow,m)*mix(vec3(1),uLight,c)+0.04*(hash(p)-0.5);
  `,
  comic: `
    vec3 flatColor=quantize(base,4.0);
    float dots=screenDot(p,0.27,width,(1.0-lightAt(grid(width)))*0.70);
    return flatColor*(1.0-0.31*dots)*(1.0-smoothstep(0.035,0.42-detail*0.27,outline(max(1.0,width*0.17))));
  `,
  sketch: `
    float pressure=smoothstep(0.025,0.32,outline(width*0.20));
    float paper=noise(p/max(1.0,width*0.16));
    return ink(sat(pressure*(0.7+detail*0.45)+(1.0-lum)*paper*detail*0.35));
  `,
  engraving: `
    vec2 q=rot(p,a); float waviness=sin(q.x/width*0.60+lum*4.0);
    float h=line(q.y/(width*0.56)+waviness*0.18,(1.0-lum)*(0.16+detail*0.27));
    return ink(h*(0.72+hash(floor(p))*0.28));
  `,
  warhol: `
    float rows=clamp(floor(68.0/uSizePx)+2.0,2.0,8.0);
    vec2 q=uv*vec2(rows);
    vec2 id=floor(q);
    float v=gray(src(fract(q)));
    vec3 c=spectrum(hash(id));
    vec3 tint=spectrum(hash(id+0.68)+0.2);
    return mix(c,tint,quant(v,2.0+floor(detail*3.0)));
  `,
  blueprint: `
    float drawing=smoothstep(0.019,0.32-detail*0.19,outline(max(1.0,width*0.11)));
    float gridLines=max(line(p.x/width,0.012),line(p.y/width,0.012));
    float subdivisions=max(line(p.x/width*5.0,0.014),line(p.y/width*5.0,0.014));
    return tone(sat(drawing+gridLines*0.24+subdivisions*0.075));
  `,
  halftone: `
    float t=1.0-lightAt(rotatedGrid(p,width,a));
    return ink(screenDot(p,a,width, t*(0.55+detail*0.71)));
  `,
  woodblock: `
    vec2 q=p/max(1.0,width);
    float fiber=fbm(vec2(q.x*0.36,q.y*5.0));
    vec3 flatColor=mix(quantize(base,5.0),tone(quant(lum,5.0)),0.32);
    return mix(flatColor,uShadow,smoothstep(0.075,0.35,outline(width*0.18))*detail)+0.16*(fiber-0.5);
  `,
  posterize: `return quantize(base,2.0+floor(detail*29.0));`,
  mezzotint: `
    vec2 q=p/max(1.0,width*0.33);
    float t=noise(q*2.4)*0.58+hash(floor(q))*0.42;
    return ink(smoothstep(lum-0.07,lum+0.10,t)*(0.75+detail*0.25));
  `,
  pointillize: `
    vec2 q=p/(width*0.62);
    vec4 v=voronoi(q); vec3 c=pixelSrc(v.xy*width*0.62);
    return mix(uLight,quantize(c,11.0),edge(v.z,0.21+(1.0-gray(c))*detail*0.40));
  `,
  crosshatch: `
    vec2 q=rot(p,a)/width;
    float v=1.0-lum;
    float m=line(q.y,0.018+v*detail*0.21)*smoothstep(0.12,0.40,v);
    m=max(m,line(q.x,0.015+v*detail*0.16)*smoothstep(0.41,0.66,v));
    m=max(m,line((q.x+q.y)*0.76,0.08)*smoothstep(0.71,0.92,v));
    return ink(m);
  `,
  "cmyk-drops": `
    vec3 c=1.0-pixelSrc(grid(width)); float k=min(c.r,min(c.g,c.b))*0.76;
    c=max(c-k,0.0)*(0.55+0.7*detail);
    float sc=screenDot(p,a+0.262,width,c.r), sm=screenDot(p,a+1.309,width,c.g);
    float sy=screenDot(p,a,width,c.b), sk=screenDot(p,a+0.785,width,k);
    return vec3(0.98,0.96,0.89) * mix(vec3(1),vec3(0.09,0.81,0.91),sc)
      * mix(vec3(1),vec3(0.90,0.10,0.53),sm) * mix(vec3(1),vec3(1,0.87,0.08),sy) * (1.0-sk*0.90);
  `,
  cyanotype: `
    float density=pow(lum,mix(0.65,2.2,detail));
    return tone(density+0.021*(noise(p*0.9)-0.5));
  `,
  "honeycomb-screen": `
    vec2 q=p/width,h=hexCenter(q);
    float density=1.0-lightAt(h*width);
    return ink(edge(hexDist(q-h),0.47*sqrt(density)*(0.60+detail*0.55)));
  `,
  "crumpled-print": `
    vec4 v=voronoi(p/(width*3.0));
    vec4 k=voronoi(rot(p,0.65)/(width*1.8));
    float crease=exp(-v.w*37.0)-exp(-k.w*41.0)*0.75;
    vec3 c=displaced((v.xy-p/(width*3.0))*width*detail*0.28);
    return c*(0.89+detail*crease*0.39)+0.09+detail*(hash(floor(p))-0.5)*0.09;
  `,
} as const;
