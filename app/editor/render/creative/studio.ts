export const studio = {
  relief: `
    vec2 derivative=gradient(p,width*0.29);
    vec3 normal=normalize(vec3(-derivative*detail*6.0,1.0));
    vec3 lightDirection=normalize(vec3(rot(vec2(0.8,0.35),a),0.52));
    vec3 reflectedLight=reflect(-lightDirection,normal);
    float incidence=max(0.0,dot(lightDirection,normal));
    float glint=pow(sat(reflectedLight.z),27.0)*0.40;
    float grain=fbm(p/max(1.0,width*0.46))-0.5;
    return tone(sat(lum*0.42+incidence*0.54+glint+grain*0.22));
  `,
  weave: `
    vec2 q=rot(p,a)/width;
    vec2 f=fract(q)-0.5;
    float over=mod(floor(q.x)+floor(q.y),2.0);
    float warp=cos(f.x*TAU)*0.5+0.5;
    float weft=cos(f.y*TAU)*0.5+0.5;
    float lighting=mix(warp,weft,over);
    float fiber=0.5+0.5*sin(mix(q.x,q.y,over)*72.0+noise(q*4.0)*2.0);
    vec3 thread=mix(mix(base,tone(lum),0.46),pixelSrc(grid(width)),0.24);
    return thread*(0.61+lighting*0.48)+vec3((fiber-0.5)*detail*0.21);
  `,
  woodgrain: `
    vec2 q=rot(center,a);
    float rib=length(q*vec2(0.19,1.0)+vec2(0.09,0.41));
    float fibers=sin(rib*unit/width*9.4+fbm(q*12.0)*7.5+lum*2.6);
    float pores=fbm(vec2(q.x*18.0,q.y*140.0));
    float grooves=smoothstep(0.41,0.98,fibers);
    return tone(sat(lum*0.74+0.18-detail*(grooves*0.38+pores*0.17)));
  `,
  "layered-paper": `
    float levels=3.0+floor(detail*10.0);
    float mask=floor(lum*levels);
    vec2 offset=rot(vec2(width,0),a);
    float outer=floor(lightAt(p-offset)*levels);
    float inner=floor(lightAt(p+offset*0.26)*levels);
    float visibleShadow=sat((outer-mask)/levels);
    float ridge=sat((mask-inner)/levels);
    float fiber=(hash(floor(p))-0.5)*0.04;
    return mix(tone(mask/levels),quantize(base,levels),0.38)*(1.0-visibleShadow*0.85)+ridge*0.29+fiber;
  `,
  "studio-frame": `
    vec2 pos=rot(uv-0.5,a)+0.5;
    float margin=0.015+uSizePx/600.0;
    float matt=margin*(detail>0.66?2.4:1.2);
    float edgeX=step(margin,pos.x)*step(pos.x,1.0-margin);
    float edgeY=step(margin+matt,pos.y)*step(pos.y,1.0-margin);
    vec2 at=(pos-vec2(margin,margin+matt))/vec2(1.0-2.0*margin,1.0-2.0*margin-matt);
    vec3 photograph=src(at);
    float fiber=(hash(floor(p))-0.5)*0.028;
    float thickness=max(0.002,0.7/unit);
    float rule=(step(margin-thickness,pos.x)*step(pos.x,1.0-margin+thickness)-edgeX)*edgeY;
    rule+=edgeX*(step(margin+matt-thickness,pos.y)*step(pos.y,1.0-margin+thickness)-edgeY);
    float location=detail<0.32?0.025:detail>0.66?0.20:margin;
    vec2 textPos=(pos-vec2(location,margin*0.57))/vec2(0.5,max(0.028,matt*0.55));
    if(detail<0.22)textPos.y=(pos.y-(1.0-margin*0.83))/max(0.025,margin*0.70);
    float index=floor(textPos.x*uGlyphCount);
    float lettering=step(0.0,textPos.x)*step(textPos.x,1.0)*glyph(vec2(fract(textPos.x*uGlyphCount),textPos.y),index/max(1.0,uGlyphCount-1.0));
    float perforation=0.0;
    if(detail>0.83) {
      vec2 hole=vec2(fract(pos.y*30.0)-0.5,min(pos.x,1.0-pos.x)/margin-0.32);
      perforation=box(hole,vec2(0.23,0.16),0.04);
    }
    vec3 paper=mix(uLight+fiber,uShadow,sat(rule+lettering*0.90+perforation));
    return mix(paper,photograph,edgeX*edgeY);
  `,
  "signal-grid": `
    float ring=length(center);
    float sweep=fract((atan(center.y,center.x+1e-6)/TAU)+0.5-phase);
    float radar=exp(-sweep*15.0)*detail;
    float scale=unit/width;
    float grids=max(line(p.x/width,0.016),line(p.y/width,0.016));
    float circles=line(ring*scale*0.55,0.018);
    float edgeTrace=smoothstep(0.03,0.28,outline(max(1.0,width*0.07)));
    float crossHair=max(box(center,vec2(0.07,0.0015),0.0),box(center,vec2(0.0015,0.07),0.0));
    return tone(sat(lum*0.60+edgeTrace*0.26+radar*0.29+max(grids*0.18,circles*0.24)+crossHair*0.61));
  `,
  negative: `return mix(1.0-base,vec3(1.0-lum)*0.52+tone(1.0-lum)*0.64,detail);`,
  "scan-slice": `
    vec2 c=rot(center,a);
    float radius=0.14+uSizePx/250.0;
    float falloff=1.0-smoothstep(radius*0.75,radius,length(c*vec2(1.0,0.85)));
    float soft=gray(blurLine(uv,rot(vec2(width*0.12,0),a)));
    float density=abs(lum-soft);
    float layers=line((soft+length(c)*0.21)*(7.0+detail*19.0),0.095);
    float ruler=step(0.44,abs(c.x))*line(c.y*31.0,0.042);
    return tone(sat((soft*0.67+density*2.6+layers*0.16)*falloff+ruler*0.35));
  `,
  infrared: `
    float foliage=smoothstep(-0.08,0.16,base.g-max(base.r,base.b));
    float cool=smoothstep(0.0,0.23,base.b-base.r);
    vec3 c=mix(base,mix(uShadow,uLight,cool),sat(foliage*0.88+cool*0.64)*detail);
    return c*(0.69+0.62*lum);
  `,
  "neon-tube": `
    float broad=outline(width*2.2);
    float narrow=outline(max(1.0,width*0.32));
    float wire=smoothstep(0.07,0.42,narrow);
    float halo=sqrt(smoothstep(0.012,0.69,broad))*detail;
    float brick=line(p.y/(width*3.4),0.022)+line((p.x/width+mod(floor(p.y/(width*3.4)),2.0)*4.0)/8.0,0.019);
    return uShadow*(1.05-brick*0.19)+uLight*(halo*0.49+wire*0.86)+vec3(wire*0.37);
  `,
  "slit-scan": `
    vec2 q=rot(center,a);
    float delay=noise(vec2(floor(q.y*unit/max(width*0.4,1.0)),phase*8.0));
    float x=q.x*(1.0-detail*0.48)+(delay-0.5)*detail*width/unit*3.2;
    vec2 pos=rot(vec2(x,q.y),-a);
    return src(reflected(0.5+pos*unit/uSize));
  `,
  separation: `
    vec2 q=rot(center,a);
    float count=4.0+floor(detail*6.0);
    float band=floor((q.y+0.50)*count);
    float margin=0.055+detail*0.08;
    float placed=1.0-step(1.0-margin,fract((q.y+0.50)*count));
    vec2 pos=rot(q-vec2((band-count*0.5)*width*0.4/unit,0),-a);
    float wire=line(q.x*13.0,0.012)*0.27;
    return mix(tone(wire),src(reflected(0.5+pos*unit/uSize)),placed);
  `,
  "stamp-ink": `
    vec2 q=rot(center,a);
    float r=length(q)/(0.12+uSizePx/410.0);
    float d=abs(r-0.95);
    float ring=edge(d,0.024)+edge(abs(r-0.79),0.018);
    float stars=line(atan(q.y,q.x+1e-6)*5.5,0.098)*edge(abs(r-0.86),0.038);
    vec2 textPos=(q+vec2(0.18,0.025))/vec2(0.36,0.063);
    float index=floor(textPos.x*uGlyphCount);
    float typing=step(0.0,textPos.x)*step(textPos.x,1.0)*glyph(vec2(fract(textPos.x*uGlyphCount),textPos.y),index/max(1.0,uGlyphCount-1.0));
    float defects=step(detail*0.62,hash(floor(p*0.81)));
    return mix(base,mix(uShadow,base,0.17),sat(stars*0.9+ring+typing)*defects*0.92);
  `,
  inlay: `
    vec2 q=rot(p,a)/width;
    vec4 v=voronoi(q);
    float facet=hash(v.xy);
    float order=dot(q-v.xy,vec2(0.59,0.81));
    float flash=pow(sat(0.5+0.5*sin(facet*TAU+order*8.0+phase*TAU)),5.0);
    vec3 reflectedLight=mix(tone(lum),spectrum(facet*0.54+phase+lum)*0.80,detail*0.72);
    return reflectedLight*(0.55+lum*0.62+flash*0.67)+exp(-v.w*65.0)*uLight*0.23;
  `,
} as const;
