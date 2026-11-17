export const materials = {
  "frosted-glass": `
    vec2 f=p/(width*0.35);
    vec2 d=vec2(fbm(f),fbm(f+37.0))-0.5;
    vec3 c=glassSample(rot(d*2.7,a),0.0,0.0,0.5);
    return mix(c,blurDisk(width*0.28,-1.0),0.31)+0.15*detail;
  `,
  "tinted-glass": `
    vec4 v=voronoi(rot(p,a)/width);
    vec3 c=pixelSrc(rot(v.xy*width,-a));
    float bevel=smoothstep(0.035,0.13,v.w);
    return mix(uShadow*0.42,mix(c,tone(gray(c)),detail*0.58)+vec3((1.0-bevel)*0.11),bevel);
  `,
  shatter: `
    vec2 q=rot(p,a)/(width*2.0);
    vec4 v=voronoi(q);
    float slope=hash(v.xy)-0.5;
    return glassSample(rot((v.xy-q)*slope*3.5,-a),exp(-v.w*90.0),slope,1.1);
  `,
  vitrine: `
    vec2 q=rot(p,a)/width, f=fract(q)-0.5;
    float frame=min(abs(abs(f.x)-0.46),abs(abs(f.y)-0.46));
    float glint=pow(sat(0.5+0.5*sin((q.x+q.y*0.86)*2.0)),8.0);
    return glassSample(rot(f*abs(f)*2.8,-a),exp(-frame*58.0)*0.4+glint*0.42,0.24-f.y,0.62);
  `,
  "glass-orb": `
    float r=length(center), radius=0.17+uSizePx/210.0;
    float t=sat(r/radius), z=sqrt(max(0.0,1.0-t*t));
    vec2 bend=center*(1.0-detail*(1.0+z*0.45))*unit/uSize;
    vec3 interior=src(0.5+bend);
    float rimLight=pow(t,9.0)*0.49;
    float reflection=exp(-dot(center-vec2(-0.30,0.41)*radius,center-vec2(-0.30,0.41)*radius)/(radius*radius*0.054));
    return mix(base*0.74,interior+vec3(rimLight+reflection*0.5),1.0-smoothstep(radius-1.0/unit,radius+1.0/unit,r));
  `,
  "fluted-glass": `
    vec2 q=rot(p,a)/width;
    float wave=sin(q.x*TAU);
    return glassSample(rot(vec2(wave*1.2,0),-a),pow(sat(wave),15.0)*0.41,cos(q.x*TAU),0.9);
  `,
  "cross-reeded": `
    vec2 q=rot(p,a)/width, w=sin(TAU*q);
    float ridge=(pow(sat(w.x),18.0)+pow(sat(w.y),18.0))*0.51;
    return glassSample(rot(w*0.84,-a),ridge,cos(TAU*q.x)*cos(TAU*q.y),1.01);
  `,
  hammered: `
    vec2 q=rot(p,a)/width; vec4 v=voronoi(q);
    vec2 n=q-v.xy;
    float dome=sqrt(max(0.0,1.0-v.z*v.z*1.75));
    return glassSample(rot(n*2.9*dome,-a),pow(sat(1.0-v.w*6.0),7.0)*0.34,n.x-n.y,0.75);
  `,
  "diamond-glass": `
    vec2 q=rot(p,a+PI*0.25)/width;
    vec2 f=fract(q)-0.5;
    float g=dot(abs(f),vec2(1));
    return glassSample(rot(sign(f)*g*1.28,-a-PI*0.25),pow(sat(g),7.0),f.x-f.y,1.1);
  `,
  "hex-glass": `
    vec2 q=rot(p,a)/width,h=hexCenter(q);
    vec2 local=q-h;
    float rimLight=exp(-35.0*abs(hexDist(local)-0.5));
    return glassSample(rot(local*2.4,-a),rimLight*0.54,dot(local,vec2(0.65,0.48)),0.77);
  `,
  "glass-ripple": `
    float d=length(center)*unit/width;
    float w=sin(TAU*(d*0.54-phase));
    vec2 n=center/max(length(center),0.001);
    return glassSample(n*w*1.14,pow(sat(w),17.0)*0.39,w*0.28,0.65);
  `,
  "ice-crackle": `
    vec2 q=rot(p,a)/(width*0.89);
    vec4 v=voronoi(q), v2=voronoi(q*2.61);
    float ridge=max(exp(-v.w*58.0)*0.81,exp(-v2.w*51.0)*0.25);
    vec3 refracted=glassSample(rot((q-v.xy)*1.04,-a),ridge,0.2,1.12);
    return mix(refracted,vec3(0.70,0.90,1.0),ridge*0.31+detail*0.15);
  `,
  "chevron-prism": `
    vec2 q=rot(p,a)/width;
    float zig=abs(fract(q.y*0.62)-0.5);
    float x=fract(q.x+zig)-0.5;
    return glassSample(rot(vec2(x*2.0,sign(fract(q.y*0.62)-0.5)*x*0.65),-a),exp(-abs(x)*39.0)*0.5,x*0.78,1.6);
  `,
  "seedy-bubbles": `
    vec2 q=rot(p,a)/width;
    vec2 id=floor(q), h=hash2(id);
    vec2 f=fract(q)-(0.2+h*0.6);
    float r=0.10+0.22*hash(id+9.0);
    float shape=circle(f,r);
    float rimLight=exp(-abs(length(f)-r)*40.0);
    vec3 bubble=glassSample(rot(-f*3.2,-a),rimLight*0.46,dot(f,vec2(-1,1)),0.83);
    return mix(base,bubble,sat(shape+rimLight*0.34));
  `,
  "glass-pixel": `
    vec2 q=rot(p,a)/width, f=fract(q)-0.5;
    vec2 c=rot((floor(q)+0.5)*width,-a);
    float rimLight=exp(-abs(max(abs(f.x),abs(f.y))-0.42)*37.0);
    vec3 pixel=pixelSrc(c+rot(f,-a)*width*(1.0-detail));
    return pixel*(0.81+0.21*detail)+vec3(rimLight*(0.10+0.14*detail)+(f.y-f.x)*0.075);
  `,
  jello: `
    vec2 q=rot(p,a)/width;
    q+=vec2(sin(q.y*0.56+phase*TAU),cos(q.x*0.49-phase*TAU))*0.67;
    vec4 v=voronoi(q);
    float dome=exp(-v.z*v.z*2.7);
    vec2 d=q-v.xy;
    return glassSample(rot(d*dome*2.5,-a),pow(dome,16.0)*0.45,dome*0.85-0.37,1.1);
  `,
  waves: `
    vec2 q=rot(p,a)/width;
    float w=sin(q.x*1.4+q.y*0.7+phase*TAU)+0.38*sin(q.x*3.3-phase*TAU);
    vec3 c=displaced(rot(vec2(0,w*width*detail*0.9),-a));
    return c*(1.0+w*detail*0.21);
  `,
  "oil-paint": `
    vec2 g=gradient(p,max(1.0,width*0.24));
    float aStroke=atan(g.y,g.x+1e-6)+PI*0.5;
    vec2 direction=vec2(cos(aStroke),sin(aStroke));
    vec3 c=blurLine(uv,direction*width*0.86);
    vec2 q=rot(p,aStroke)/width;
    float brush=fbm(q*vec2(0.8,14.0));
    float shade=(brush-0.5)*detail*0.31;
    return mix(c,quantize(c,9.0),0.62)+shade;
  `,
  watercolor: `
    vec2 q=p/(width*1.6);
    vec2 bend=vec2(fbm(q),fbm(q+79.0))-0.5;
    vec3 washed=blurLine(uv+bend*width/uSize,vec2(width*0.61,width*0.32));
    float paper=hash(floor(p))*0.5 + noise(p*0.57)*0.5;
    float pigment=pow(sat(1.0-gray(washed)),1.18);
    return mix(vec3(0.98,0.95,0.87),quantize(washed,9.0),0.61+pigment*0.35)-(paper-0.41)*0.14*detail;
  `,
  chrome: `
    vec2 g=gradient(p,max(1.0,width*0.25));
    float reflectance=lum+dot(g,vec2(-0.84,0.68))*detail*1.3;
    vec3 steel=metal(reflectance);
    return mix(steel,steel*(0.57+base*0.68),0.45*detail);
  `,
  "thin-film": `
    float coat=lum*1.63+fbm(p/(width*3.0))*0.84+phase+dot(gradient(p,width*0.35),vec2(0.5,0.65));
    vec3 film=spectrum(coat)*0.77+0.23;
    return mix(base,base*0.42+film*(0.34+lum*0.55),detail);
  `,
  marble: `
    vec2 q=p/(width*2.0);
    float vein=pow(abs(sin(q.x*0.75+q.y*0.37+fbm(q*1.8)*8.0)),10.0);
    float smaller=pow(abs(sin(q.x*1.7-q.y*0.42+fbm(q*2.5)*13.0)),18.0);
    return tone(sat(lum*0.77+0.24-detail*(vein*0.61+smaller*0.27)))*0.94+0.06*base;
  `,
  "molten-metal": `
    vec2 q=p/(width*2.4);
    float liquid=fbm(q+vec2(phase*1.9,0));
    vec3 warped=displaced(vec2(liquid-0.5,fbm(q+12.0)-0.5)*width*detail*2.1);
    float density=sin((gray(warped)+liquid*0.68)*16.0);
    return mix(metal(gray(warped)+liquid*0.36),tone(sat(density*0.48+0.52)),0.65);
  `,
  crystallize: `
    vec2 q=p/width;
    vec4 v=voronoi(q);
    vec3 c=pixelSrc(v.xy*width);
    float facet=hash(v.xy);
    return c*(0.77+facet*detail*0.44)+vec3(exp(-v.w*40.0)*(0.14-facet*0.27)*detail);
  `,
  emboss: `
    vec2 offset=rot(vec2(width,0),a);
    float relief=0.51+(lightAt(p+offset)-lightAt(p-offset))*detail*1.49;
    return tone(relief);
  `,
  "petrol-sheen": `
    vec2 q=p/(width*3.0);
    float t=fbm(q+phase*0.66)+0.64*fbm(q*2.3+lum)+lum*0.7;
    vec3 film=spectrum(t*2.1);
    return mix(base,base*0.37+film*pow(lum,0.63)*0.94,detail*0.85);
  `,
  "heat-tint": `
    float t=lum+0.26*gradient(p,width).x+0.12*noise(p/(width*2.0))+phase*0.25;
    vec3 oxide=mix(vec3(0.55,0.26,0.09),vec3(0.12,0.51,0.95),smoothstep(0.18,0.53,t));
    oxide=mix(oxide,vec3(0.80,0.56,0.31),smoothstep(0.67,0.95,t));
    return mix(base,metal(t)*oxide*1.25,detail);
  `,
} as const;
