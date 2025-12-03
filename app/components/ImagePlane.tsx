"use client";

import React, { useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  uniform float uRotate;
  uniform float uZoom;

  void main() {
    vUv = uv;
    
    float s = sin(uRotate);
    float c = cos(uRotate);
    mat2 rotMat = mat2(c, -s, s, c);
    
    vec2 centered = uv - 0.5;
    vec2 rotated = rotMat * centered;
    vec2 zoomed = rotated / uZoom;
    vUv = zoomed + 0.5;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uMouseX;

  uniform float uContrast;
  uniform float uBrightness;
  uniform float uTealOrange;
  uniform float uTemperature;
  uniform float uTint;
  uniform float uSkinProtectStrength;
  uniform float uGrainStrength;
  uniform float uVignette;
  uniform float uHalationStrength;
  uniform float uSharpness;
  uniform float uDehaze;
  uniform float uTargetHue;
  uniform float uHueShift;
  uniform float uAberration;
  uniform float uStructure;
  uniform float uFilmBorder;
  uniform float uAnamorphicDistortion;
  uniform float uAnamorphicStreaks;
  uniform float uGodLightStrength;
  uniform vec2 uGodLightPos;
  uniform sampler2D uLutTexture;
  uniform float uLutStrength;
  uniform float uLutSize;

  varying vec2 vUv;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }
  
  float getLuma(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
  }

  vec3 rgb2hsl(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }

  vec3 hsl2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  vec3 applyWhiteBalance(vec3 color) {
    vec3 corrected = color;
    corrected.r *= (1.0 + uTemperature);
    corrected.b *= (1.0 - uTemperature);
    corrected.g *= (1.0 + uTint);
    return corrected;
  }

  vec3 adjustSaturation(vec3 color, float saturation) {
    float grey = getLuma(color);
    return mix(vec3(grey), color, saturation);
  }

  float getSkinMask(vec3 color) {
    vec3 hsl = rgb2hsl(color);
    float skinHue = 0.08; 
    float hueDist = abs(hsl.x - skinHue);
    if (hueDist > 0.5) hueDist = 1.0 - hueDist;
    float mask = 1.0 - smoothstep(0.0, 0.15, hueDist);
    mask *= smoothstep(0.1, 0.6, hsl.y);
    mask *= smoothstep(0.2, 0.8, hsl.z);
    return mask;
  }

  void main() {
    vec2 uv = vUv;
    
    if (uAnamorphicDistortion > 0.0) {
        vec2 d = uv - 0.5;
        float r2 = dot(d, d);
        float f = 1.0 + r2 * (uAnamorphicDistortion * 0.5);
        uv = d * f + 0.5;
    }
  
    float r = texture2D(uTexture, uv + vec2(uAberration, 0.0)).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - vec2(uAberration, 0.0)).b;
    vec4 originalPixel = vec4(r, g, b, 1.0);
    
    vec3 color = originalPixel.rgb;
    
    if (uAnamorphicStreaks > 0.0) {
        vec3 streak = vec3(0.0);
        float threshold = 0.7;
        for(float i = -0.1; i < 0.1; i += 0.005) {
            vec3 s = texture2D(uTexture, uv + vec2(i, 0.0)).rgb;
            float brightness = max(s.r, max(s.g, s.b));
            if(brightness > threshold) {
                streak += s * (1.0 - abs(i * 10.0));
            }
        }
        streak /= 20.0;
        streak *= vec3(0.5, 0.8, 1.0); 
        color += streak * uAnamorphicStreaks;
    }
    
    if (uStructure > 0.0) {
        vec3 blur = texture2D(uTexture, uv + vec2(0.005, 0.0)).rgb;
        blur += texture2D(uTexture, uv + vec2(-0.005, 0.0)).rgb;
        blur += texture2D(uTexture, uv + vec2(0.0, 0.005)).rgb;
        blur += texture2D(uTexture, uv + vec2(0.0, -0.005)).rgb;
        blur /= 4.0;
        vec3 detail = color - blur;
        color += detail * uStructure * 2.0;
    }
    
    vec3 originalColor = color;
    color = applyWhiteBalance(color);
    color += uBrightness;
    color = (color - 0.5) * (uContrast + 1.0) + 0.5;
    
    if (uDehaze > 0.0) {
        vec3 dehazed = pow(color, vec3(1.0 + uDehaze * 0.5));
        dehazed = adjustSaturation(dehazed, 1.0 + uDehaze * 0.2);
        color = mix(color, dehazed, uDehaze);
    }

    // Apply LUT (both Palette Stealer 1D and .CUBE 3D)
    if (uLutStrength > 0.0) {
        vec3 lookup = clamp(color, 0.0, 1.0);
        
        // Check type: uLutSize = 0 for 1D LUT, > 0 for 3D LUT
        if (uLutSize < 1.0) {
            // 1D LUT (Palette Stealer) - sample per channel
            float r = texture2D(uLutTexture, vec2(0.5, lookup.r)).r;
            float g = texture2D(uLutTexture, vec2(0.5, lookup.g)).g;
            float b = texture2D(uLutTexture, vec2(0.5, lookup.b)).b;
            vec3 lutColor = vec3(r, g, b);
            color = mix(color, lutColor, uLutStrength);
        } else {
            // 3D LUT (.CUBE) - packaged as 2D horizontal strips
            float lutSize = uLutSize;
            float texWidth = lutSize * lutSize;
            float texHeight = lutSize;
            
            // Scale input to LUT space
            vec3 scaled = lookup * (lutSize - 1.0);
            vec3 base = floor(scaled);
            vec3 frac = scaled - base;
            
            // Calculate 2D coordinates for the 8 corners of the cube
            float z0 = base.z;
            float z1 = min(base.z + 1.0, lutSize - 1.0);
            
            vec2 uv000 = vec2((base.x + z0 * lutSize + 0.5) / texWidth, (base.y + 0.5) / texHeight);
            vec2 uv100 = vec2((base.x + 1.0 + z0 * lutSize + 0.5) / texWidth, (base.y + 0.5) / texHeight);
            vec2 uv010 = vec2((base.x + z0 * lutSize + 0.5) / texWidth, (base.y + 1.0 + 0.5) / texHeight);
            vec2 uv110 = vec2((base.x + 1.0 + z0 * lutSize + 0.5) / texWidth, (base.y + 1.0 + 0.5) / texHeight);
            
            vec2 uv001 = vec2((base.x + z1 * lutSize + 0.5) / texWidth, (base.y + 0.5) / texHeight);
            vec2 uv101 = vec2((base.x + 1.0 + z1 * lutSize + 0.5) / texWidth, (base.y + 0.5) / texHeight);
            vec2 uv011 = vec2((base.x + z1 * lutSize + 0.5) / texWidth, (base.y + 1.0 + 0.5) / texHeight);
            vec2 uv111 = vec2((base.x + 1.0 + z1 * lutSize + 0.5) / texWidth, (base.y + 1.0 + 0.5) / texHeight);
            
            // Trilinear interpolation
            vec3 c000 = texture2D(uLutTexture, uv000).rgb;
            vec3 c100 = texture2D(uLutTexture, uv100).rgb;
            vec3 c010 = texture2D(uLutTexture, uv010).rgb;
            vec3 c110 = texture2D(uLutTexture, uv110).rgb;
            vec3 c001 = texture2D(uLutTexture, uv001).rgb;
            vec3 c101 = texture2D(uLutTexture, uv101).rgb;
            vec3 c011 = texture2D(uLutTexture, uv011).rgb;
            vec3 c111 = texture2D(uLutTexture, uv111).rgb;
            
            vec3 c00 = mix(c000, c100, frac.x);
            vec3 c01 = mix(c001, c101, frac.x);
            vec3 c10 = mix(c010, c110, frac.x);
            vec3 c11 = mix(c011, c111, frac.x);
            
            vec3 c0 = mix(c00, c10, frac.y);
            vec3 c1 = mix(c01, c11, frac.y);
            
            vec3 lutColor = mix(c0, c1, frac.z);
            color = mix(color, lutColor, uLutStrength);
        }
    }

    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 teal = vec3(0.0, 0.3, 0.4);
    vec3 orange = vec3(1.0, 0.9, 0.6);
    vec3 grade = mix(teal, orange, luminance);
    vec3 gradedColor = mix(color, grade, uTealOrange * 0.5);
    
    float skinFactor = getSkinMask(originalColor);
    color = mix(gradedColor, color, skinFactor * uSkinProtectStrength);

    // God Light (3D Relighting effect)
    if (uGodLightStrength > 0.0) {
        vec2 step = 1.0 / uResolution;
        float t = getLuma(texture2D(uTexture, vUv + vec2(0.0, step.y)).rgb);
        float b = getLuma(texture2D(uTexture, vUv + vec2(0.0, -step.y)).rgb);
        float l = getLuma(texture2D(uTexture, vUv + vec2(-step.x, 0.0)).rgb);
        float r = getLuma(texture2D(uTexture, vUv + vec2(step.x, 0.0)).rgb);
        
        float dx = (r - l) * 5.0;
        float dy = (t - b) * 5.0;
        vec3 normal = normalize(vec3(dx, dy, 1.0));
        
        vec3 lightDir = normalize(vec3(uGodLightPos - vUv, 0.5));
        float diffuse = max(dot(normal, lightDir), 0.0);
        
        color += color * diffuse * uGodLightStrength * 0.5;
    }

    if (uHueShift != 0.0) {
        vec3 hsl = rgb2hsl(color);
        float range = 0.1; 
        float difference = abs(hsl.x - uTargetHue);
        float mask = 1.0 - smoothstep(0.0, range, difference);
        hsl.x += uHueShift * mask; 
        color = hsl2rgb(hsl);
    }
    
    if (uSharpness > 0.0) {
        vec2 step = 1.0 / uResolution;
        vec4 top = texture2D(uTexture, vUv + vec2(0.0, step.y));
        vec4 bottom = texture2D(uTexture, vUv + vec2(0.0, -step.y));
        vec4 left = texture2D(uTexture, vUv + vec2(-step.x, 0.0));
        vec4 right = texture2D(uTexture, vUv + vec2(step.x, 0.0));
        vec3 highPass = originalPixel.rgb * 4.0 - (top.rgb + bottom.rgb + left.rgb + right.rgb);
        color += highPass * uSharpness * 0.5;
    }

    if (uHalationStrength > 0.0) {
        vec4 glow = vec4(0.0);
        float offset = 0.004; 
        glow += texture2D(uTexture, vUv + vec2(offset, 0.0));
        glow += texture2D(uTexture, vUv + vec2(-offset, 0.0));
        glow += texture2D(uTexture, vUv + vec2(0.0, offset));
        glow += texture2D(uTexture, vUv + vec2(0.0, -offset));
        glow /= 4.0;
        float brightness = dot(color, vec3(0.33));
        if(brightness > 0.7) {
            color += glow.rgb * uHalationStrength;
        }
    }

    if (uGrainStrength > 0.0) {
        float noise = random(vUv * uResolution + uTime);
        color += (noise - 0.5) * uGrainStrength;
    }

    if (uVignette > 0.0) {
        vec2 dist = vUv - 0.5;
        float vignette = smoothstep(0.8, 0.25 * (1.0 - uVignette), length(dist));
        color *= vignette;
    }

    if (uFilmBorder > 0.5) {
        vec2 border = step(vec2(0.02), vUv) * step(vUv, vec2(0.98));
        float box = border.x * border.y;
        color *= box;
    }

    if (uMouseX < 1.0) {
       float wiper = step(vUv.x, uMouseX);
       vec3 final = mix(originalPixel.rgb, color, wiper);
       float line = step(abs(vUv.x - uMouseX), 0.002);
       final = mix(final, vec3(1.0), line);
       gl_FragColor = vec4(final, 1.0);
    } else {
       gl_FragColor = vec4(color, 1.0);
    }
  }
`;

export default function ImagePlane({
  imageUrl,
  settings,
}: {
  imageUrl: string;
  settings: any;
}) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  const { size, viewport } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const aspect = useMemo(() => {
    if (!texture.image) return 1;
    return texture.image.width / texture.image.height;
  }, [texture]);

  const scale = useMemo(() => {
    const maxWidth = viewport.width * 0.9;
    const maxHeight = viewport.height * 0.9;
    let w = maxWidth;
    let h = w / aspect;
    if (h > maxHeight) {
      h = maxHeight;
      w = h * aspect;
    }
    return new THREE.Vector3(w, h, 1);
  }, [viewport, aspect]);

  // Create a key that changes when settings change to force material remount
  const materialKey = useMemo(() => {
    return JSON.stringify(settings);
  }, [settings]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uResolution.value.set(
        size.width,
        size.height
      );

      if (settings.wiperActive) {
        materialRef.current.uniforms.uMouseX.value = (state.pointer.x + 1) / 2;
      } else {
        materialRef.current.uniforms.uMouseX.value = 1.0;
      }
    }
  });

  return (
    <mesh scale={scale}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        key={materialKey}
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTexture: { value: texture },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uTime: { value: 0 },
          uMouseX: { value: 1.0 },
          uContrast: { value: settings.contrast },
          uBrightness: { value: settings.brightness },
          uTealOrange: { value: settings.tealOrange },
          uTemperature: { value: settings.temperature },
          uTint: { value: settings.tint },
          uSkinProtectStrength: { value: settings.skinProtect },
          uGrainStrength: { value: settings.grain },
          uVignette: { value: settings.vignette },
          uHalationStrength: { value: settings.halation },
          uSharpness: { value: settings.sharpness },
          uDehaze: { value: settings.dehaze },
          uAberration: { value: settings.aberration },
          uStructure: { value: settings.structure },
          uFilmBorder: { value: settings.filmBorder ? 1.0 : 0.0 },
          uAnamorphicDistortion: { value: settings.anamorphicDistortion },
          uAnamorphicStreaks: { value: settings.anamorphicStreaks },
          uGodLightStrength: { value: settings.godLightStrength },
          uGodLightPos: {
            value: new THREE.Vector2(settings.godLightX, settings.godLightY),
          },
          uLutTexture: { value: settings.lutTexture || null },
          uLutStrength: { value: settings.lutStrength || 0 },
          uLutSize: { value: (settings.lutTexture as any)?.lutSize || 0 },
          uTargetHue: { value: settings.targetHue },
          uHueShift: { value: settings.hueShift },
          uRotate: { value: settings.rotate },
          uZoom: { value: settings.zoom },
        }}
      />
    </mesh>
  );
}
