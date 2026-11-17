export const geometric = {
  cross: `
    vec2 q=rot(p,a)/width, f=abs(fract(q)-0.5);
    float value=lightAt(rotatedGrid(p,width,a));
    float arm=edge(max(f.x,f.y),0.44*sqrt(value))*edge(min(f.x,f.y),0.04+0.14*detail);
    return tone(arm);
  `,
  diamond: `
    vec2 q=fract(rot(p,a)/width)-0.5;
    float v=lightAt(rotatedGrid(p,width,a));
    return tone(diamond(q,0.53*sqrt(v)*(0.55+0.65*detail)));
  `,
  lines: `
    float v=lightAt(rotatedGrid(p,width,a));
    return tone(line(rot(p,a).y/width,0.47*v*(0.58+0.65*detail)));
  `,
  diagonal: `
    vec2 q=rot(p,a)/width;
    float v=lightAt(rotatedGrid(p,width,a));
    return tone(line(q.y+floor(q.x)*0.5,0.48*v*(0.58+0.65*detail)));
  `,
  specimen: `
    vec2 q=p/width, f=fract(q)-0.5;
    vec3 c=pixelSrc(grid(width));
    float mark=rim(f,vec2(0.44),0.018)+box(f,vec2(0.23,0.009),0.0)+box(f,vec2(0.009,0.23),0.0);
    return mix(c*0.75+vec3(0.10),mix(c,vec3(0.91,0.93,0.85),0.72),sat(mark*(0.5+detail)));
  `,
  "low-poly": `
    vec2 q=p/width, id=floor(q), f=fract(q);
    float flip=step(0.5,hash(id));
    f.x=mix(f.x,1.0-f.x,flip);
    float face=step(1.0,f.x+f.y);
    vec2 c=mix(vec2(0.32),vec2(0.68),face);
    c.x=mix(c.x,1.0-c.x,flip);
    return pixelSrc((id+c)*width)*(0.92+detail*0.18*hash(id+face));
  `,
  droste: `
    vec2 q=uv-0.5;
    float hole=mix(0.16,0.68,uSizePx/120.0);
    for(int ring=0;ring<9;ring++){
      if(max(abs(q.x),abs(q.y))>hole*0.5) break;
      q=rot(q/hole,a*detail);
    }
    return src(clamp(q+0.5,0.0,1.0));
  `,
  truchet: `
    vec2 q=rot(p,a)/width,id=floor(q),f=fract(q);
    float v=lightAt(rotatedGrid(p,width,a));
    if(hash(id)>0.5)f.x=1.0-f.x;
    float arc=min(abs(length(f)-0.5),abs(length(1.0-f)-0.5));
    return tone(edge(arc,0.015+0.26*v*detail));
  `,
  "iso-extrude": `
    vec2 q=p/width;
    q.x+=mod(floor(q.y),2.0)*0.5;
    vec2 id=floor(q), f=fract(q);
    vec2 pos=(id+0.5-vec2(mod(id.y,2.0)*0.5,0))*width;
    vec3 c=pixelSrc(pos);
    float height=gray(c)*detail*0.58;
    float top=diamond(vec2(f.x-0.5,(f.y-0.28-height)*1.65),0.48);
    float sides=box(f-vec2(0.5,0.20+height*0.5),vec2(0.46,0.20+height*0.5),0.01);
    return mix(c*0.17,mix(c*(0.42+0.28*step(0.5,f.x)),c*1.16,top),max(top,sides));
  `,
  "flow-field": `
    vec2 q=p/width;
    vec2 g=gradient(grid(width),width*0.6);
    float theta=atan(g.y,g.x+0.00001)+a+0.38*sin(lum*25.0);
    vec2 f=rot(fract(q)-0.5,theta);
    float stroke=box(f,vec2(0.49,0.035+0.11*detail),0.015);
    return tone(stroke*smoothstep(0.05,0.63,lightAt(grid(width))));
  `,
  lattice: `
    vec2 f=fract(p/width)-0.5;
    vec3 c=pixelSrc(grid(width));
    float strand=(0.09+0.24*detail)*sqrt(gray(c));
    float v=edge(abs(f.x),strand), h=edge(abs(f.y),strand);
    float twist=step(0.5,fract(dot(floor(p/width),vec2(0.5))));
    return c*(0.18+0.88*max(h,v)+0.24*h*v*mix(sin(f.x*10.0),sin(f.y*10.0),twist));
  `,
  topography: `
    float softened=(lum*2.0+lightAt(p+vec2(2,1))+lightAt(p-vec2(2,1)))*0.25;
    float bands=6.0+detail*34.0;
    return mix(tone(softened*0.35),uLight,line(softened*bands,0.012+uSizePx*0.004));
  `,
  forms: `
    vec2 q=rot(p,a)/width,id=floor(q),f=fract(q)-0.5;
    vec3 c=pixelSrc(rotatedGrid(p,width,a));
    float r=0.50*sqrt(gray(c))*(0.62+0.54*detail);
    float choice=hash(id);
    float shape=choice<0.33?circle(f,r):choice<0.66?diamond(f,r):box(rot(f,0.31),vec2(r*0.78),0.035);
    return mix(vec3(0.05,0.06,0.08),c*1.18,shape);
  `,
  schematic: `
    vec2 q=p/width, f=fract(q)-0.5;
    float v=lightAt(grid(width));
    float pins=circle(f,0.075+0.09*v);
    float trace=max(line(q.x,0.014+detail*0.036),line(q.y,0.014+detail*0.036));
    float contours=smoothstep(0.075,0.4,outline(width*0.13));
    return tone(sat(pins*v+trace*step(0.45,v)*0.5+contours*0.8));
  `,
  "neon-grid": `
    vec2 f=fract(p/width)-0.5;
    float wire=exp(-abs(abs(f.x)-0.45)*34.0)+exp(-abs(abs(f.y)-0.45)*34.0);
    vec3 c=pixelSrc(grid(width));
    return uShadow+c*0.19+(mix(uLight,c,0.48)*wire*gray(c)*(0.6+detail));
  `,
  smudge: `
    vec2 q=rot(p,a);
    float streak=fbm(vec2(q.x/(width*5.0),q.y/max(width*0.18,1.0)));
    return blurLine(uv+rot(vec2((streak-0.5)*detail*width*5.0,0),-a)/uSize,rot(vec2(width*0.9,0),-a));
  `,
  pinch: `
    float r=length(center),radius=0.18+uSizePx/190.0;
    float scale=1.0+detail*2.0*pow(max(0.0,1.0-r/radius),2.0);
    return src(center*scale*unit/uSize+0.5);
  `,
  spherize: `
    float r=length(center),radius=0.18+uSizePx/200.0;
    float t=sat(r/radius);
    float factor=mix(1.0,sqrt(max(0.0,1.0-t*t)),detail);
    factor=mix(factor,1.0,smoothstep(0.84,1.0,t));
    return src(center*factor*unit/uSize+0.5);
  `,
  twirl: `
    float t=sat(1.0-length(center)/(0.17+uSizePx/190.0));
    return src(rot(center,a*detail*5.4*t*t)*unit/uSize+0.5);
  `,
  zigzag: `
    float r=length(center);
    vec2 direction=center/max(r,0.001);
    float wave=(1.0-4.0*abs(fract(r*13.0-phase)-0.5))*smoothstep(0.01,0.12,r);
    return displaced(direction*wave*width*detail*0.62);
  `,
  ripple: `
    float r=length(center);
    float wave=sin(TAU*(r*unit/(width*1.8)-phase));
    return displaced(center/max(r,0.001)*wave*width*detail*0.57);
  `,
  polar: `
    float phi=atan(center.y,center.x+0.000001);
    return src(vec2(fract((phi+a)/TAU+0.5),sat(1.0-length(center)*mix(1.0,3.4,detail))));
  `,
  shear: `
    vec2 q=rot(p-0.5*uSize,a);
    float slope=q.y*detail*0.43+sin(q.y/(width*1.6))*width*detail;
    return displaced(rot(vec2(slope,0),-a));
  `,
  "motion-blur": `return blurLine(uv,rot(vec2(width*(0.65+detail),0),a));`,
  "tilt-shift": `
    float height=abs(rot(center,a).y);
    float b=smoothstep(detail*0.33,detail*0.33+0.21,height);
    return mix(base,blurDisk(width*b,-1.0),b);
  `,
  "gaussian-blur": `return blurDisk(width,-1.0);`,
  "radial-blur": `
    vec2 q=center-rot(vec2(0.12,0),a);
    vec3 sum=vec3(0); float weight=0.0;
    for(int i=-8;i<=8;i++){
      float t=float(i)/8.0, w=1.0-abs(t)*0.55;
      vec2 d=mix(q*t,rot(q,t)-q,detail)*width*2.6;
      sum+=displaced(d)*w;
      weight+=w;
    }
    return sum/weight;
  `,
} as const;
