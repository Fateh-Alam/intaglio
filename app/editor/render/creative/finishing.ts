export const finishing = {
  vignette: `
    float d=length((uv-0.5)*vec2(1.72,1.58));
    float fade=smoothstep(uSizePx/155.0,uSizePx/155.0+0.07+detail*0.5,d);
    return mix(base,uShadow,fade);
  `,
  "crt-curvature": `
    vec2 q=uv*2.0-1.0;
    vec2 curved=q*(1.0+dot(q,q)*detail*0.21);
    float frame=step(max(abs(curved.x),abs(curved.y)),1.0);
    return src(curved*0.5+0.5)*frame;
  `,
  bloom: `return base+blurDisk(width*2.1,detail*0.92)*mix(vec3(1),uLight,0.58)*0.85;`,
  "character-bloom": `
    vec3 glow=blurDisk(width*1.7,detail*0.7);
    return max(base,base*mix(vec3(1),uLight,0.38)+uLight*gray(glow)*1.38);
  `,
  "character-chroma": `
    vec2 d=rot(vec2(width,0),a);
    return max(base*0.74,vec3(gray(displaced(d)),lum*0.73,gray(displaced(-d))));
  `,
  "film-grain": `
    vec2 fr=floor(p/width)+floor(phase*81.0);
    float weight=0.08+0.15*sin(lum*PI);
    float n=(hash(fr)+hash(fr+29.0)-1.0)*weight;
    return base+mix(vec3(n),(vec3(hash(fr),hash(fr+93.0),hash(fr+180.0))-0.5)*weight,detail);
  `,
  "film-dust": `
    vec2 q=p/(width*8.0),id=floor(q),f=fract(q);
    float seed=hash(id+floor(phase*16.0));
    vec2 spot=0.1+hash2(id+floor(phase*16.0))*0.8;
    float speck=circle((f-spot)*vec2(1.0,1.3),0.012+seed*0.07)*step(1.0-detail*0.83,seed);
    vec2 lineId=vec2(floor(uv.x*52.0),floor(phase*12.0));
    float scratch=edge(abs(fract(uv.x*52.0)-0.23),0.018)*step(0.99-detail*0.10,hash(lineId));
    float stroke=scratch*smoothstep(0.12,0.43,uv.y)*smoothstep(0.0,0.25,1.0-uv.y);
    return mix(base,vec3(step(0.46,hash(id+3.0))),sat(speck*0.84+stroke*0.49));
  `,
  "digital-noise": `
    vec2 f=floor(p/width)+phase*128.0;
    vec3 n=vec3(hash(f),hash(f+31.0),hash(f+70.0)) - 0.5;
    return base+mix(vec3(n.r),n,detail)*0.46;
  `,
  pixelate: `return pixelSrc(grid(width));`,
  sharpen: `return base+(base-blurDisk(width*1.3,-1.0))*(1.1+detail*3.8);`,
  "reduce-noise": `
    vec3 acc=base*2.2;
    float normalizer=2.2;
    for(int i=0;i<8;i++){
      vec3 value=displaced(rot(vec2(width,0),float(i)*TAU/8.0));
      float weight=exp(-abs(lum-gray(value))*(1.0+detail*27.0));
      acc+=value*weight;
      normalizer+=weight;
    }
    return acc/normalizer;
  `,
  diffuse: `
    vec2 coord=floor(p/max(1.0,width*detail))+phase*54.0;
    return displaced((hash2(coord)-0.5)*width*2.5);
  `,
  threshold: `
    float softness=max(0.001,(uSizePx-1.0)/180.0);
    return tone(smoothstep(detail-softness,detail+softness,lum));
  `,
  fragment: `
    vec2 q=rot(vec2(width,0),a);
    vec3 blend=base;
    for(int i=0;i<4;i++)blend+=displaced(rot(q,float(i)*PI*0.5))*(0.3+detail);
    return blend/(1.0+4.0*(0.3+detail));
  `,
  "color-overlay": `
    vec3 tint=tone(lum);
    vec3 grade=vec3(lum)+tint-gray(tint);
    return mix(tint,grade,detail);
  `,
  "lens-flare": `
    vec2 aim=rot(vec2(0.08+detail*0.46,0),a), f=center-aim;
    float radius=0.03+uSizePx/740.0;
    float peak=exp(-dot(f,f)/(radius*radius));
    float streak=exp(-abs(rot(f,-a).y)*140.0)*exp(-length(f)*2.3)*0.42;
    float ghosts=0.0;
    for(int i=1;i<=5;i++){
      float t=float(i)*0.39;
      vec2 q=center+aim*t;
      float r=dot(q,q)/(radius*radius*(0.11+t*0.22));
      ghosts+=exp(-r)*0.22;
    }
    return base+uLight*(peak+streak)+tone(peak)*ghosts;
  `,
} as const;
