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
  uniform vec3 uGodLightColor;
  uniform float uGodLightSpecular;
  uniform float uGodLightRim;
  uniform float uGodLightFalloff;
  uniform sampler2D uLutTexture;
  uniform float uLutStrength;
  uniform float uLutSize;
  
  uniform sampler2D uToneCurve;
  uniform float uToneCurveEnabled;

  // Masking uniforms
  uniform float uRadialMaskEnabled;
  uniform vec2 uRadialMaskCenter;
  uniform float uRadialMaskRadius;
  uniform float uRadialMaskFeather;
  uniform float uRadialMaskInvert;
  uniform float uRadialMaskExposure;
  uniform float uRadialMaskContrast;
  uniform float uRadialMaskSaturation;

  uniform float uLinearMaskEnabled;
  uniform float uLinearMaskAngle;
  uniform float uLinearMaskPosition;
  uniform float uLinearMaskFeather;
  uniform float uLinearMaskExposure;
  uniform float uLinearMaskContrast;

  uniform float uLuminosityMaskEnabled;
  uniform float uLuminosityMaskTarget;
  uniform float uLuminosityMaskRange;
  uniform float uLuminosityMaskExposure;
  uniform float uLuminosityMaskSaturation;

  // Brush Mask uniforms
  uniform sampler2D uBrushMask;
  uniform float uBrushMaskEnabled;
  uniform float uBrushMaskExposure;
  uniform float uBrushMaskContrast;
  uniform float uBrushMaskSaturation;
  uniform float uBrushMaskTemperature;
  uniform float uBrushMaskClarity;

  // HSL Panel - 8 color channels (x=hue, y=sat, z=lum)
  uniform vec3 uHSLRed;
  uniform vec3 uHSLOrange;
  uniform vec3 uHSLYellow;
  uniform vec3 uHSLGreen;
  uniform vec3 uHSLAqua;
  uniform vec3 uHSLBlue;
  uniform vec3 uHSLPurple;
  uniform vec3 uHSLMagenta;

  // Color Grading (vec4: rgb=tint, a=luminance corection)
  uniform vec4 uColorGradingShadows;
  uniform vec4 uColorGradingMidtones;
  uniform vec4 uColorGradingHighlights;
  uniform float uColorGradingBalance;
  uniform float uColorGradingGlobalExposure; // Global Offset
  uniform float uColorGradingGlobalContrast; // Global Gamma?

  // A/B Comparison
  uniform sampler2D uCompareTexture;
  uniform float uCompareEnabled;
  uniform float uCompareSplit;

  // Film Emulation
  uniform int uFilmEmulation;
  uniform float uFilmEmulationStrength;

  // Lens Corrections
  uniform float uLensDistortion;      // Barrel/Pincushion distortion
  uniform float uKeystoneH;           // Horizontal perspective correction
  uniform float uKeystoneV;           // Vertical perspective correction
  uniform float uTiltShiftAmount;     // Tilt-shift blur amount
  uniform float uTiltShiftPosition;   // Position of focus band (0-1)
  uniform float uTiltShiftAngle;      // Angle of focus band

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

  // HSL Color Channel Weight - how much a hue belongs to a color channel
  float getColorChannelWeight(float hue, float targetHue, float range) {
    float diff = abs(hue - targetHue);
    diff = min(diff, 1.0 - diff); // Wrap around for hue
    return 1.0 - smoothstep(0.0, range, diff);
  }

  // Apply HSL adjustments per color channel
  vec3 applyHSLChannels(vec3 color) {
    vec3 hsl = rgb2hsl(color);
    float range = 0.12; // Color channel width
    
    // Color channel target hues (0-1 range)
    // Red=0.0, Orange=0.083, Yellow=0.167, Green=0.333, Aqua=0.5, Blue=0.667, Purple=0.75, Magenta=0.917
    
    float weightRed = getColorChannelWeight(hsl.x, 0.0, range);
    float weightOrange = getColorChannelWeight(hsl.x, 0.083, range);
    float weightYellow = getColorChannelWeight(hsl.x, 0.167, range);
    float weightGreen = getColorChannelWeight(hsl.x, 0.333, range);
    float weightAqua = getColorChannelWeight(hsl.x, 0.5, range);
    float weightBlue = getColorChannelWeight(hsl.x, 0.667, range);
    float weightPurple = getColorChannelWeight(hsl.x, 0.75, range);
    float weightMagenta = getColorChannelWeight(hsl.x, 0.917, range);
    
    // Apply hue shifts
    hsl.x += uHSLRed.x * weightRed * 0.1;
    hsl.x += uHSLOrange.x * weightOrange * 0.1;
    hsl.x += uHSLYellow.x * weightYellow * 0.1;
    hsl.x += uHSLGreen.x * weightGreen * 0.1;
    hsl.x += uHSLAqua.x * weightAqua * 0.1;
    hsl.x += uHSLBlue.x * weightBlue * 0.1;
    hsl.x += uHSLPurple.x * weightPurple * 0.1;
    hsl.x += uHSLMagenta.x * weightMagenta * 0.1;
    
    // Apply saturation adjustments
    float satMod = 0.0;
    satMod += uHSLRed.y * weightRed;
    satMod += uHSLOrange.y * weightOrange;
    satMod += uHSLYellow.y * weightYellow;
    satMod += uHSLGreen.y * weightGreen;
    satMod += uHSLAqua.y * weightAqua;
    satMod += uHSLBlue.y * weightBlue;
    satMod += uHSLPurple.y * weightPurple;
    satMod += uHSLMagenta.y * weightMagenta;
    hsl.y = clamp(hsl.y + satMod * 0.5, 0.0, 1.0);
    
    // Apply luminance adjustments
    float lumMod = 0.0;
    lumMod += uHSLRed.z * weightRed;
    lumMod += uHSLOrange.z * weightOrange;
    lumMod += uHSLYellow.z * weightYellow;
    lumMod += uHSLGreen.z * weightGreen;
    lumMod += uHSLAqua.z * weightAqua;
    lumMod += uHSLBlue.z * weightBlue;
    lumMod += uHSLPurple.z * weightPurple;
    lumMod += uHSLMagenta.z * weightMagenta;
    hsl.z = clamp(hsl.z + lumMod * 0.3, 0.0, 1.0);
    
    // Wrap hue
    hsl.x = fract(hsl.x);
    
    return hsl2rgb(hsl);
  }

  // Film Emulation - authentic film stock simulation
  vec3 applyFilmEmulation(vec3 color, int filmType, float strength) {
    if (filmType == 0) return color; // None
    
    vec3 filmColor = color;
    
    if (filmType == 1) { // Kodak Portra 400 - warm skin tones, pastel highlights
      // Lift shadows, soften contrast
      filmColor = pow(filmColor, vec3(0.95));
      // Warm highlight bias
      filmColor.r += 0.02 * filmColor.r;
      filmColor.g += 0.01 * filmColor.g;
      // Reduce saturation in shadows
      float luma = getLuma(filmColor);
      float shadowMask = 1.0 - smoothstep(0.0, 0.4, luma);
      filmColor = mix(filmColor, mix(vec3(luma), filmColor, 0.7), shadowMask * 0.3);
      // Pastel highlight rolloff
      float highlightMask = smoothstep(0.6, 1.0, luma);
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, highlightMask);
    }
    else if (filmType == 2) { // Kodak Ektar 100 - vivid, punchy
      // Increase saturation
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.15);
      // S-curve contrast
      filmColor = filmColor * filmColor * (3.0 - 2.0 * filmColor);
      // Warm cast
      filmColor.r *= 1.03;
      filmColor.b *= 0.97;
    }
    else if (filmType == 3) { // Fuji Velvia 50 - hyper-saturated, deep shadows
      // Crush blacks
      filmColor = max(filmColor - 0.03, 0.0) * 1.03;
      // Boost saturation heavily
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.3);
      // Push greens and blues
      filmColor.g *= 1.02;
      filmColor.b *= 1.04;
    }
    else if (filmType == 4) { // Fuji Pro 400H - soft pastels, lifted shadows
      // Lift shadows significantly
      filmColor = mix(filmColor, sqrt(filmColor), 0.15);
      // Reduce saturation overall
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 0.85);
      // Cool highlight bias
      filmColor.b += 0.015 * smoothstep(0.5, 1.0, luma);
    }
    else if (filmType == 5) { // Cinestill 800T - tungsten, halation glow
      // Tungsten white balance (cool shadows, warm highlights)
      float luma = getLuma(filmColor);
      filmColor.r += 0.03 * smoothstep(0.5, 1.0, luma);
      filmColor.b += 0.04 * (1.0 - luma);
      // Teal shadows
      float shadowMask = 1.0 - smoothstep(0.0, 0.3, luma);
      filmColor.r -= 0.02 * shadowMask;
      filmColor.g += 0.01 * shadowMask;
      filmColor.b += 0.03 * shadowMask;
      // Halation effect on highlights
      float highlightMask = smoothstep(0.7, 1.0, luma);
      filmColor.r += 0.05 * highlightMask;
    }
    else if (filmType == 6) { // Kodak Vision3 500T - cinema tungsten
      // Orange-teal split
      float luma = getLuma(filmColor);
      filmColor.r += 0.025 * smoothstep(0.4, 0.9, luma);
      filmColor.b += 0.035 * (1.0 - smoothstep(0.3, 0.7, luma));
      // Deep shadows
      filmColor = max(filmColor - 0.02, 0.0) * 1.02;
      // Cinema contrast curve
      filmColor = pow(filmColor, vec3(0.98, 1.0, 1.02));
    }
    
    return mix(color, clamp(filmColor, 0.0, 1.0), strength);
  }

  void main() {
    vec2 uv = vUv;
    
    // Lens Distortion (Barrel/Pincushion)
    if (uLensDistortion != 0.0) {
        vec2 d = uv - 0.5;
        float r2 = dot(d, d);
        float f = 1.0 + r2 * uLensDistortion;
        // Zoom slightly to hide edges when distorting
        float zoomComp = 1.0 / (1.0 + uLensDistortion * 0.2); 
        uv = d * f * zoomComp + 0.5;
    }

    // Perspective Correction (Keystone)
    if (uKeystoneH != 0.0 || uKeystoneV != 0.0) {
        vec2 d = uv - 0.5;
        // Horizontal keystone (trapezoid shape)
        if (uKeystoneH != 0.0) {
            float amount = uKeystoneH * d.y * 2.0; 
            // Simple expansion/contraction based on Y
            d.x *= (1.0 + amount);
        }
        // Vertical keystone
        if (uKeystoneV != 0.0) {
            float amount = uKeystoneV * d.x * 2.0;
            d.y *= (1.0 + amount);
        }
        uv = d + 0.5;
    }
    
    // Anamorphic Distortion (existing)
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

    // Tilt-Shift Blur
    if (uTiltShiftAmount > 0.0) {
        // Calculate distance from focus band
        vec2 center = vec2(0.5);
        vec2 d = uv - center;
        // Rotate coords by angle
        float s = sin(uTiltShiftAngle);
        float c = cos(uTiltShiftAngle);
        vec2 rotated = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
        
        // Vertical distance from line defines blur amount
        float blurAmt = abs(rotated.y + (uTiltShiftPosition - 0.5));
        blurAmt = smoothstep(0.05, 0.4, blurAmt); // Focus area width
        
        if (blurAmt > 0.01) {
            vec3 blur = vec3(0.0);
            float total = 0.0;
            float radius = uTiltShiftAmount * blurAmt * 0.01;
            
            // Simple box blur
            for (float x = -2.0; x <= 2.0; x += 1.0) {
                for (float y = -2.0; y <= 2.0; y += 1.0) {
                    vec2 offset = vec2(x, y) * radius;
                    blur += texture2D(uTexture, uv + offset).rgb;
                    total += 1.0;
                }
            }
            color = mix(color, blur / total, blurAmt);
        }
    }
    
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
    
    // Tone Curve Application
    if (uToneCurveEnabled > 0.5) {
        vec3 c = clamp(color, 0.0, 1.0);
        // Apply RGB Curves (stored in R, G, B channels)
        float r = texture2D(uToneCurve, vec2(c.r, 0.5)).r;
        float g = texture2D(uToneCurve, vec2(c.g, 0.5)).g;
        float b = texture2D(uToneCurve, vec2(c.b, 0.5)).b;
        
        // Apply Master Curve (stored in Alpha channel)
        r = texture2D(uToneCurve, vec2(r, 0.5)).a;
        g = texture2D(uToneCurve, vec2(g, 0.5)).a;
        b = texture2D(uToneCurve, vec2(b, 0.5)).a;
        
        color = vec3(r, g, b);
    }

    // Color Grading (Shadows/Midtones/Highlights)
    {
        float luma = getLuma(color);
        // Balance shifts the midpoint
        float shadowEdge = 0.33 + uColorGradingBalance * 0.2;
        float highlightEdge = 0.66 + uColorGradingBalance * 0.2;
        
        float shadowFactor = 1.0 - smoothstep(0.0, shadowEdge, luma);
        float highlightFactor = smoothstep(highlightEdge, 1.0, luma);
        float midtoneFactor = 1.0 - shadowFactor - highlightFactor;
        
        // Apply Tints (Additive)
        vec3 tint = uColorGradingShadows.rgb * shadowFactor +
                    uColorGradingMidtones.rgb * midtoneFactor +
                    uColorGradingHighlights.rgb * highlightFactor;
        
        // Soft overlay of tint
        color += tint * 0.5; // Scale down for subtlety
        
        // Apply Luminance (Exposure per range)
        float lumaAdj = uColorGradingShadows.a * shadowFactor +
                        uColorGradingMidtones.a * midtoneFactor +
                        uColorGradingHighlights.a * highlightFactor;
                        
        // Simple exposure adjustment
        color *= (1.0 + lumaAdj * 0.5);
    }

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

    // HSL Panel - per-channel color adjustments
    color = applyHSLChannels(color);
    
    // Film Emulation - authentic film stock simulation
    color = applyFilmEmulation(color, uFilmEmulation, uFilmEmulationStrength);

    // Advanced God Light (3D Relighting with specular, rim, color)
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
        
        // Distance falloff
        float dist = length(uGodLightPos - vUv);
        float falloff = 1.0 / (1.0 + dist * dist * uGodLightFalloff * 5.0);
        
        // Diffuse lighting with color
        float diffuse = max(dot(normal, lightDir), 0.0);
        vec3 diffuseLight = uGodLightColor * diffuse * uGodLightStrength * falloff;
        
        // Specular highlights
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        vec3 specularLight = uGodLightColor * spec * uGodLightSpecular * falloff;
        
        // Rim lighting (backlit effect)
        float rim = 1.0 - max(dot(viewDir, normal), 0.0);
        rim = pow(rim, 3.0);
        vec3 rimLight = uGodLightColor * rim * uGodLightRim;
        
        color += color * diffuseLight * 0.5;
        color += specularLight * 0.3;
        color += rimLight * 0.2;
    }

    // Radial Gradient Mask
    if (uRadialMaskEnabled > 0.5) {
        float dist = length(vUv - uRadialMaskCenter);
        float mask = smoothstep(uRadialMaskRadius - uRadialMaskFeather, uRadialMaskRadius + uRadialMaskFeather, dist);
        if (uRadialMaskInvert > 0.5) mask = 1.0 - mask;
        
        // Apply adjustments within mask
        vec3 maskedColor = color;
        maskedColor *= (1.0 + uRadialMaskExposure * mask);
        maskedColor = (maskedColor - 0.5) * (1.0 + uRadialMaskContrast * mask) + 0.5;
        float grey = getLuma(maskedColor);
        maskedColor = mix(vec3(grey), maskedColor, 1.0 + uRadialMaskSaturation * mask);
        color = maskedColor;
    }

    // Linear Gradient Mask
    if (uLinearMaskEnabled > 0.5) {
        float angle = uLinearMaskAngle * 3.14159 * 2.0;
        vec2 dir = vec2(cos(angle), sin(angle));
        float proj = dot(vUv - 0.5, dir) + 0.5;
        float mask = smoothstep(uLinearMaskPosition - uLinearMaskFeather, uLinearMaskPosition + uLinearMaskFeather, proj);
        
        vec3 maskedColor = color;
        maskedColor *= (1.0 + uLinearMaskExposure * mask);
        maskedColor = (maskedColor - 0.5) * (1.0 + uLinearMaskContrast * mask) + 0.5;
        color = maskedColor;
    }

    // Luminosity Mask
    if (uLuminosityMaskEnabled > 0.5) {
        float luma = getLuma(color);
        float diff = abs(luma - uLuminosityMaskTarget);
        float mask = 1.0 - smoothstep(0.0, uLuminosityMaskRange, diff);
        
        vec3 maskedColor = color;
        maskedColor *= (1.0 + uLuminosityMaskExposure * mask);
        float grey = getLuma(maskedColor);
        maskedColor = mix(vec3(grey), maskedColor, 1.0 + uLuminosityMaskSaturation * mask);
        color = maskedColor;
    }

    // Brush Mask (painted mask from canvas)
    if (uBrushMaskEnabled > 0.5) {
        // Sample the brush mask texture - red channel contains mask intensity
        vec4 brushSample = texture2D(uBrushMask, vUv);
        float brushMask = brushSample.r; // Mask is stored in red channel
        
        if (brushMask > 0.01) {
            vec3 brushMaskedColor = color;
            
            // Exposure adjustment
            brushMaskedColor *= (1.0 + uBrushMaskExposure * brushMask * 2.0);
            
            // Contrast adjustment
            brushMaskedColor = (brushMaskedColor - 0.5) * (1.0 + uBrushMaskContrast * brushMask) + 0.5;
            
            // Saturation adjustment
            float brushGrey = getLuma(brushMaskedColor);
            brushMaskedColor = mix(vec3(brushGrey), brushMaskedColor, 1.0 + uBrushMaskSaturation * brushMask * 2.0);
            
            // Temperature adjustment (warm/cool shift)
            brushMaskedColor.r += uBrushMaskTemperature * brushMask * 0.15;
            brushMaskedColor.b -= uBrushMaskTemperature * brushMask * 0.15;
            
            // Clarity (local contrast enhancement)
            if (uBrushMaskClarity > 0.0) {
                vec2 clarityStep = 1.0 / uResolution * 3.0;
                vec3 clarityBlur = vec3(0.0);
                clarityBlur += texture2D(uTexture, vUv + vec2(clarityStep.x, 0.0)).rgb;
                clarityBlur += texture2D(uTexture, vUv - vec2(clarityStep.x, 0.0)).rgb;
                clarityBlur += texture2D(uTexture, vUv + vec2(0.0, clarityStep.y)).rgb;
                clarityBlur += texture2D(uTexture, vUv - vec2(0.0, clarityStep.y)).rgb;
                clarityBlur /= 4.0;
                vec3 clarityDetail = brushMaskedColor - clarityBlur;
                brushMaskedColor += clarityDetail * uBrushMaskClarity * brushMask * 0.5;
            }
            
            color = brushMaskedColor;
        }
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
       
       vec3 source = originalPixel.rgb;
       if (uCompareEnabled > 0.5) {
           source = texture2D(uCompareTexture, vUv).rgb;
       }
       
       vec3 final = mix(source, color, wiper);
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
  brushMaskData,
  brushMaskExposure = 0,
  brushMaskContrast = 0,
  brushMaskSaturation = 0,
  brushMaskTemperature = 0,
  brushMaskClarity = 0,
}: {
  imageUrl: string;
  settings: any;
  brushMaskData?: string;
  brushMaskExposure?: number;
  brushMaskContrast?: number;
  brushMaskSaturation?: number;
  brushMaskTemperature?: number;
  brushMaskClarity?: number;
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
    return (
      JSON.stringify(settings) +
      (brushMaskData ? brushMaskData.slice(0, 100) : "")
    );
  }, [settings, brushMaskData]);

  // Create brush mask texture from data URL
  const brushMaskTexture = useMemo(() => {
    if (!brushMaskData) {
      // Return a 1x1 transparent texture when no brush mask
      const data = new Uint8Array([0, 0, 0, 0]);
      const fallbackTexture = new THREE.DataTexture(
        data,
        1,
        1,
        THREE.RGBAFormat
      );
      fallbackTexture.needsUpdate = true;
      return fallbackTexture;
    }

    // Create texture from canvas data URL
    const loader = new THREE.TextureLoader();
    const tex = loader.load(brushMaskData);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [brushMaskData]);

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
          uGodLightColor: {
            value: new THREE.Vector3(
              settings.godLightColorR || 1.0,
              settings.godLightColorG || 0.95,
              settings.godLightColorB || 0.9
            ),
          },
          uGodLightSpecular: { value: settings.godLightSpecular || 0 },
          uGodLightRim: { value: settings.godLightRim || 0 },
          uGodLightFalloff: { value: settings.godLightFalloff || 1.0 },
          uLutTexture: { value: settings.lutTexture || null },
          uLutStrength: { value: settings.lutStrength || 0 },
          uLutSize: { value: (settings.lutTexture as any)?.lutSize || 0 },
          uToneCurve: { value: settings.toneCurveTexture || null },
          uToneCurveEnabled: { value: settings.toneCurveTexture ? 1.0 : 0.0 },
          uTargetHue: { value: settings.targetHue },
          uHueShift: { value: settings.hueShift },
          uRotate: { value: settings.rotate },
          uZoom: { value: settings.zoom },
          // Radial Mask
          uRadialMaskEnabled: { value: settings.radialMaskEnabled ? 1.0 : 0.0 },
          uRadialMaskCenter: {
            value: new THREE.Vector2(
              settings.radialMaskX || 0.5,
              settings.radialMaskY || 0.5
            ),
          },
          uRadialMaskRadius: { value: settings.radialMaskRadius || 0.5 },
          uRadialMaskFeather: { value: settings.radialMaskFeather || 0.3 },
          uRadialMaskInvert: { value: settings.radialMaskInvert ? 1.0 : 0.0 },
          uRadialMaskExposure: { value: settings.radialMaskExposure || 0 },
          uRadialMaskContrast: { value: settings.radialMaskContrast || 0 },
          uRadialMaskSaturation: { value: settings.radialMaskSaturation || 0 },
          // Linear Mask
          uLinearMaskEnabled: { value: settings.linearMaskEnabled ? 1.0 : 0.0 },
          uLinearMaskAngle: { value: settings.linearMaskAngle || 0 },
          uLinearMaskPosition: { value: settings.linearMaskPosition || 0.5 },
          uLinearMaskFeather: { value: settings.linearMaskFeather || 0.3 },
          uLinearMaskExposure: { value: settings.linearMaskExposure || 0 },
          uLinearMaskContrast: { value: settings.linearMaskContrast || 0 },
          // Luminosity Mask
          uLuminosityMaskEnabled: {
            value: settings.luminosityMaskEnabled ? 1.0 : 0.0,
          },
          uLuminosityMaskTarget: {
            value: settings.luminosityMaskTarget || 0.5,
          },
          uLuminosityMaskRange: { value: settings.luminosityMaskRange || 0.3 },
          uLuminosityMaskExposure: {
            value: settings.luminosityMaskExposure || 0,
          },
          uLuminosityMaskSaturation: {
            value: settings.luminosityMaskSaturation || 0,
          },
          // Brush Mask
          uBrushMask: { value: brushMaskTexture },
          uBrushMaskEnabled: { value: brushMaskData ? 1.0 : 0.0 },
          uBrushMaskExposure: { value: brushMaskExposure },
          uBrushMaskContrast: { value: brushMaskContrast },
          uBrushMaskSaturation: { value: brushMaskSaturation },
          uBrushMaskTemperature: { value: brushMaskTemperature },
          uBrushMaskClarity: { value: brushMaskClarity },
          // HSL Panel - 8 color channels
          uHSLRed: {
            value: new THREE.Vector3(
              settings.hslRedHue || 0,
              settings.hslRedSat || 0,
              settings.hslRedLum || 0
            ),
          },
          uHSLOrange: {
            value: new THREE.Vector3(
              settings.hslOrangeHue || 0,
              settings.hslOrangeSat || 0,
              settings.hslOrangeLum || 0
            ),
          },
          uHSLYellow: {
            value: new THREE.Vector3(
              settings.hslYellowHue || 0,
              settings.hslYellowSat || 0,
              settings.hslYellowLum || 0
            ),
          },
          uHSLGreen: {
            value: new THREE.Vector3(
              settings.hslGreenHue || 0,
              settings.hslGreenSat || 0,
              settings.hslGreenLum || 0
            ),
          },
          uHSLAqua: {
            value: new THREE.Vector3(
              settings.hslAquaHue || 0,
              settings.hslAquaSat || 0,
              settings.hslAquaLum || 0
            ),
          },
          uHSLBlue: {
            value: new THREE.Vector3(
              settings.hslBlueHue || 0,
              settings.hslBlueSat || 0,
              settings.hslBlueLum || 0
            ),
          },
          uHSLPurple: {
            value: new THREE.Vector3(
              settings.hslPurpleHue || 0,
              settings.hslPurpleSat || 0,
              settings.hslPurpleLum || 0
            ),
          },
          uHSLMagenta: {
            value: new THREE.Vector3(
              settings.hslMagentaHue || 0,
              settings.hslMagentaSat || 0,
              settings.hslMagentaLum || 0
            ),
          },
          // Color Grading
          uColorGradingShadows: {
            value: new THREE.Vector4(
              settings.colorGrading?.shadows?.h !== undefined
                ? new THREE.Color().setHSL(
                    settings.colorGrading.shadows.h,
                    settings.colorGrading.shadows.s,
                    0.5
                  ).r
                : 0,
              settings.colorGrading?.shadows?.h !== undefined
                ? new THREE.Color().setHSL(
                    settings.colorGrading.shadows.h,
                    settings.colorGrading.shadows.s,
                    0.5
                  ).g
                : 0,
              settings.colorGrading?.shadows?.h !== undefined
                ? new THREE.Color().setHSL(
                    settings.colorGrading.shadows.h,
                    settings.colorGrading.shadows.s,
                    0.5
                  ).b
                : 0,
              settings.colorGrading?.shadows?.l || 0
            ),
          },
          uColorGradingMidtones: {
            value: new THREE.Vector4(
              settings.colorGrading?.midtones?.h !== undefined
                ? new THREE.Color().setHSL(
                    settings.colorGrading.midtones.h,
                    settings.colorGrading.midtones.s,
                    0.5
                  ).r
                : 0,
              settings.colorGrading?.midtones?.h !== undefined
                ? new THREE.Color().setHSL(
                    settings.colorGrading.midtones.h,
                    settings.colorGrading.midtones.s,
                    0.5
                  ).g
                : 0,
              settings.colorGrading?.midtones?.h !== undefined
                ? new THREE.Color().setHSL(
                    settings.colorGrading.midtones.h,
                    settings.colorGrading.midtones.s,
                    0.5
                  ).b
                : 0,
              settings.colorGrading?.midtones?.l || 0
            ),
          },
          uColorGradingHighlights: {
            value: new THREE.Vector4(
              settings.colorGrading?.highlights?.h !== undefined
                ? new THREE.Color().setHSL(
                    settings.colorGrading.highlights.h,
                    settings.colorGrading.highlights.s,
                    0.5
                  ).r
                : 0,
              settings.colorGrading?.highlights?.h !== undefined
                ? new THREE.Color().setHSL(
                    settings.colorGrading.highlights.h,
                    settings.colorGrading.highlights.s,
                    0.5
                  ).g
                : 0,
              settings.colorGrading?.highlights?.h !== undefined
                ? new THREE.Color().setHSL(
                    settings.colorGrading.highlights.h,
                    settings.colorGrading.highlights.s,
                    0.5
                  ).b
                : 0,
              settings.colorGrading?.highlights?.l || 0
            ),
          },
          uColorGradingBalance: { value: settings.colorGrading?.balance || 0 },

          // A/B Comparison
          uCompareTexture: { value: settings.compareTexture || null },
          uCompareEnabled: { value: settings.compareEnabled ? 1.0 : 0.0 },
          uCompareSplit: { value: settings.compareSplit || 0.5 },

          // Film Emulation
          uFilmEmulation: {
            value:
              settings.filmEmulation === "portra400"
                ? 1
                : settings.filmEmulation === "ektar100"
                  ? 2
                  : settings.filmEmulation === "velvia50"
                    ? 3
                    : settings.filmEmulation === "pro400h"
                      ? 4
                      : settings.filmEmulation === "cinestill800t"
                        ? 5
                        : settings.filmEmulation === "vision3500t"
                          ? 6
                          : 0,
          },
          uFilmEmulationStrength: {
            value: settings.filmEmulationStrength || 1.0,
          },
          // Lens Corrections
          uLensDistortion: { value: settings.lensDistortion || 0 },
          uKeystoneH: { value: settings.keystoneH || 0 },
          uKeystoneV: { value: settings.keystoneV || 0 },
          uTiltShiftAmount: { value: settings.tiltShiftAmount || 0 },
          uTiltShiftPosition: { value: settings.tiltShiftPosition || 0.5 },
          uTiltShiftAngle: { value: settings.tiltShiftAngle || 0 },
        }}
      />
    </mesh>
  );
}
