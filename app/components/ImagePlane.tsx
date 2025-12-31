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
  uniform float uHighlights;
  uniform float uShadows;
  uniform float uWhites;
  uniform float uBlacks;
  uniform float uVibrance;
  uniform float uTealOrange;
  uniform float uTemperature;
  uniform float uTint;
  uniform float uSkinProtectStrength;
  uniform float uGrainStrength;
  uniform float uVignette;
  
  // Advanced Effects
  uniform float uHalationStrength;
  uniform float uHalationThreshold;
  uniform float uHalationRadius;
  
  uniform float uBloomStrength;
  uniform float uBloomThreshold;
  uniform float uBloomRadius;
  
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

  // ============================================
  // PROFESSIONAL COLOR SCIENCE FUNCTIONS
  // ============================================

  // sRGB to Linear (decode gamma) - IEC 61966-2-1 standard
  float sRGBToLinear(float c) {
    return c <= 0.04045 
        ? c / 12.92 
        : pow((c + 0.055) / 1.055, 2.4);
  }
  
  vec3 sRGBToLinear3(vec3 c) {
    return vec3(sRGBToLinear(c.r), sRGBToLinear(c.g), sRGBToLinear(c.b));
  }

  // Linear to sRGB (encode gamma) - IEC 61966-2-1 standard
  float linearToSRGB(float c) {
    return c <= 0.0031308
        ? c * 12.92
        : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
  }
  
  vec3 linearToSRGB3(vec3 c) {
    return vec3(linearToSRGB(c.r), linearToSRGB(c.g), linearToSRGB(c.b));
  }

  // Rec. 709 Luminance (proper coefficients for HD video/sRGB)
  float getLuma(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }

  // Kelvin temperature to RGB multipliers (approximation of Planckian locus)
  vec3 kelvinToRGB(float kelvin) {
    float temp = kelvin / 100.0;
    vec3 rgb;
    
    // Red
    if (temp <= 66.0) {
      rgb.r = 1.0;
    } else {
      rgb.r = 1.292936 * pow(temp - 60.0, -0.1332047);
    }
    
    // Green
    if (temp <= 66.0) {
      rgb.g = 0.390082 * log(temp) - 0.631841;
    } else {
      rgb.g = 1.129890 * pow(temp - 60.0, -0.0755148);
    }
    
    // Blue
    if (temp <= 19.0) {
      rgb.b = 0.0;
    } else if (temp < 66.0) {
      rgb.b = 0.543207 * log(temp - 10.0) - 1.196254;
    } else {
      rgb.b = 1.0;
    }
    
    return clamp(rgb, 0.0, 1.0);
  }

  // White balance using Kelvin-based temperature and tint
  // Temperature: -100 to +100 maps to 2000K-50000K offset from 6500K (D65)
  // Tint: green-magenta axis
  vec3 applyWhiteBalance(vec3 color, float temperature, float tint) {
    // Map temperature to Kelvin: -100 = 2000K, 0 = 6500K, +100 = 50000K
    float kelvinOffset = temperature * 100.0; // Each unit = 100K roughly
    float kelvin = 6500.0 - kelvinOffset; // Invert because warmer = lower K
    kelvin = clamp(kelvin, 2000.0, 50000.0);
    
    // Get the color cast from this temperature
    vec3 tempColor = kelvinToRGB(kelvin);
    vec3 d65 = kelvinToRGB(6500.0); // Reference white (D65)
    
    // Apply as ratio relative to D65
    color *= d65 / tempColor;
    
    // Apply tint (green-magenta on green channel)
    color.g *= (1.0 + tint * 0.05);
    color.r *= (1.0 - tint * 0.025); // Magenta = less green, more R+B
    color.b *= (1.0 - tint * 0.025);
    
    return color;
  }

  // Exposure in EV stops (proper photographic exposure)
  vec3 applyExposure(vec3 color, float ev) {
    return color * pow(2.0, ev);
  }

  // S-curve contrast centered at mid-gray (0.18 in linear = 18% gray)
  vec3 applyContrast(vec3 color, float contrast) {
    float midGray = 0.18;
    // Contrast range: -1 to +1, where 0 = no change
    float factor = 1.0 + contrast;
    return midGray * pow(color / midGray, vec3(factor));
  }

  // Highlights recovery (soft-clip bright areas) - like Lightroom
  vec3 applyHighlights(vec3 color, float amount) {
    float luma = getLuma(color);
    float highlightMask = smoothstep(0.5, 1.0, luma);
    // Compress highlights (amount negative = recover, positive = boost)
    color += (vec3(1.0) - color) * highlightMask * amount * 0.5;
    return color;
  }

  // Shadows lift (brighten dark areas) - like Lightroom
  vec3 applyShadows(vec3 color, float amount) {
    float luma = getLuma(color);
    float shadowMask = 1.0 - smoothstep(0.0, 0.5, luma);
    // Lift shadows (amount positive = brighten shadows)
    color += color * shadowMask * amount * 0.5;
    return color;
  }

  // Whites (adjust highlight clip point)
  vec3 applyWhites(vec3 color, float amount) {
    float luma = getLuma(color);
    float whiteMask = smoothstep(0.7, 1.0, luma);
    color = mix(color, color * (1.0 + amount * 0.3), whiteMask);
    return color;
  }

  // Blacks (adjust shadow clip point)
  vec3 applyBlacks(vec3 color, float amount) {
    float luma = getLuma(color);
    float blackMask = 1.0 - smoothstep(0.0, 0.3, luma);
    // Negative amount crushes blacks, positive lifts them
    color = mix(color, color * (1.0 - amount * 0.3), blackMask);
    return clamp(color, 0.0, 1.0);
  }

  // Luminance-preserving saturation (proper algorithm)
  vec3 adjustSaturation(vec3 color, float saturation) {
    float luma = getLuma(color);
    return mix(vec3(luma), color, saturation);
  }

  // Vibrance (smart saturation - boosts less saturated colors more)
  vec3 applyVibrance(vec3 color, float vibrance) {
    float luma = getLuma(color);
    float maxC = max(color.r, max(color.g, color.b));
    float minC = min(color.r, min(color.g, color.b));
    float sat = (maxC - minC) / (maxC + 0.001);
    
    // Less saturated colors get more boost
    float vibranceWeight = 1.0 - sat;
    return mix(vec3(luma), color, 1.0 + vibrance * vibranceWeight);
  }

  // Dehaze (proper implementation)
  vec3 applyDehaze(vec3 color, float amount) {
    // Increase contrast in shadows and saturation
    float luma = getLuma(color);
    vec3 dehazed = color;
    
    // Lift blacks and increase local contrast
    dehazed = pow(dehazed, vec3(1.0 + amount * 0.3));
    dehazed = adjustSaturation(dehazed, 1.0 + amount * 0.2);
    
    return mix(color, dehazed, amount);
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
    else if (filmType == 7) { // Ilford HP5 Plus - classic B&W
      float luma = getLuma(filmColor);
      // Classic B&W with slight green sensitivity boost
      float bw = filmColor.r * 0.25 + filmColor.g * 0.65 + filmColor.b * 0.10;
      // Add slight grain texture in shadows
      bw = pow(bw, 0.95);
      // Lift shadows slightly
      bw = bw * 0.9 + 0.03;
      filmColor = vec3(bw);
    }
    else if (filmType == 8) { // Agfa Vista 400 - vintage warm tones
      float luma = getLuma(filmColor);
      // Strong warm cast
      filmColor.r *= 1.08;
      filmColor.g *= 1.02;
      filmColor.b *= 0.90;
      // Slight saturation boost
      filmColor = mix(vec3(luma), filmColor, 1.1);
      // Lifted blacks with warm tint
      filmColor = filmColor * 0.95 + vec3(0.04, 0.03, 0.01);
    }
    else if (filmType == 9) { // Lomography 800 - cross-processed look
      float luma = getLuma(filmColor);
      // Push contrast
      filmColor = pow(filmColor, vec3(1.1));
      // Cyan shadows, yellow highlights
      float shadowMask = 1.0 - smoothstep(0.0, 0.5, luma);
      float highlightMask = smoothstep(0.5, 1.0, luma);
      filmColor.r -= 0.03 * shadowMask;
      filmColor.g += 0.02 * shadowMask;
      filmColor.b += 0.04 * shadowMask;
      filmColor.r += 0.04 * highlightMask;
      filmColor.g += 0.02 * highlightMask;
      // High saturation
      filmColor = mix(vec3(luma), filmColor, 1.25);
    }
    else if (filmType == 10) { // Technicolor 3-Strip - vintage cinema
      float luma = getLuma(filmColor);
      // Boost primaries separately
      filmColor.r = pow(filmColor.r, 0.9) * 1.1;
      filmColor.g = pow(filmColor.g, 0.95) * 0.95;
      filmColor.b = pow(filmColor.b, 0.85) * 1.05;
      // S-curve for that cinema punch
      filmColor = filmColor * filmColor * (3.0 - 2.0 * filmColor);
      // Slight color bleed
      filmColor = mix(filmColor, vec3(luma), 0.05);
    }
    else if (filmType == 11) { // Bleach Bypass - desaturated, high contrast
      float luma = getLuma(filmColor);
      // Desaturate significantly
      filmColor = mix(vec3(luma), filmColor, 0.5);
      // High contrast S-curve
      filmColor = pow(filmColor, vec3(1.2));
      filmColor = filmColor * filmColor * (3.0 - 2.0 * filmColor);
      // Slight blue-gray cast
      filmColor.b += 0.02;
      filmColor = filmColor * 0.95 + 0.02;
    }
    else if (filmType == 12) { // Cross Process E-6 to C-41 - wild colors
      float luma = getLuma(filmColor);
      // Heavy contrast push
      filmColor = pow(filmColor, vec3(1.15));
      // Shift colors dramatically
      filmColor.r = pow(filmColor.r, 0.85);
      filmColor.g = pow(filmColor.g, 1.1);
      filmColor.b = pow(filmColor.b, 0.75);
      // Green-cyan in shadows, magenta in highlights
      float shadowMask = 1.0 - smoothstep(0.0, 0.4, luma);
      float highlightMask = smoothstep(0.6, 1.0, luma);
      filmColor.g += 0.05 * shadowMask;
      filmColor.r += 0.04 * highlightMask;
      filmColor.b += 0.02 * highlightMask;
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

    // ============================================
    // PROFESSIONAL COLOR GRADING PIPELINE
    // Lightroom-style processing order
    // ============================================
    
    // Step 1: Convert sRGB input to Linear
    color = sRGBToLinear3(color);
    
    // Step 2: White Balance (Temperature + Tint) - first adjustment
    color = applyWhiteBalance(color, uTemperature, uTint);
    
    // Step 3: Exposure in EV stops (like camera)
    color = applyExposure(color, uBrightness);
    
    // Step 4: S-curve Contrast (centered at mid-gray)
    color = applyContrast(color, uContrast);
    
    // Step 5: Highlights recovery (soft-clip bright areas)
    color = applyHighlights(color, uHighlights);
    
    // Step 6: Shadows lift (brighten dark areas)
    color = applyShadows(color, uShadows);
    
    // Step 7: Whites (highlight clip point)
    color = applyWhites(color, uWhites);
    
    // Step 8: Blacks (shadow clip point)
    color = applyBlacks(color, uBlacks);
    
    // Step 9: Vibrance (smart saturation)
    color = applyVibrance(color, uVibrance);
    
    // Step 10: Convert back to sRGB for remaining processing
    color = linearToSRGB3(color);
    color = clamp(color, 0.0, 1.0);
    
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

    // ============================================
    // PHYSICS-BASED HALATION & BLOOM (Single-Pass Approximation)
    // ============================================

    // 1. Halation (Film Light Bleed) - Red channel diffusion
    if (uHalationStrength > 0.0) {
        vec3 halationColor = vec3(0.0);
        float totalWeight = 0.0;
        
        // Pseudo-Gaussian Blur Loop
        float radius = uHalationRadius * 0.01; // Scale radius
        
        // Sample surrounding pixels
        for(float x = -2.0; x <= 2.0; x += 1.0) {
            for(float y = -2.0; y <= 2.0; y += 1.0) {
                 vec2 offset = vec2(x, y) * radius;
                 vec3 samp = texture2D(uTexture, vUv + offset).rgb;
                 
                 // Threshold - only bright areas cause halation
                 float brightness = max(samp.r, max(samp.g, samp.b));
                 if (brightness > uHalationThreshold) {
                      // Distance weight
                      float weight = 1.0 / (1.0 + length(vec2(x, y)));
                      halationColor += samp * weight;
                      totalWeight += weight;
                 }
            }
        }
        
        if (totalWeight > 0.0) {
            halationColor /= totalWeight;
            
            // Halation is characteristically RED/ORANGE
            // We take the red channel of the blurred highlight and bleed it
            vec3 halo = vec3(1.0, 0.4, 0.1) * halationColor.r; 
            
            // Additive blend with SCREEN for softer look
            color = max(color, color + halo * uHalationStrength);
        }
    }

    // 2. Optical Bloom - Soft glow
    if (uBloomStrength > 0.0) {
        vec3 bloomColor = vec3(0.0);
        float totalWeight = 0.0;
        float radius = uBloomRadius * 0.01;
        
        // Simplified loop for Bloom (could combine with Halation loop for perf, but keeping separate for control)
        for(float x = -2.0; x <= 2.0; x += 1.0) {
             for(float y = -2.0; y <= 2.0; y += 1.0) {
                 vec2 offset = vec2(x, y) * radius * 1.5; // Bloom is usually wider
                 vec3 samp = texture2D(uTexture, vUv + offset).rgb;
                 
                 float luma = dot(samp, vec3(0.2126, 0.7152, 0.0722));
                 if (luma > uBloomThreshold) {
                     float weight = 1.0 / (1.0 + length(vec2(x, y)));
                     bloomColor += samp * weight;
                     totalWeight += weight;
                 }
             }
        }
        
        if (totalWeight > 0.0) {
            bloomColor /= totalWeight;
            color += bloomColor * uBloomStrength;
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
  wiperPosition = 0.5,
  brushMaskData,
  brushMaskExposure = 0,
  brushMaskContrast = 0,
  brushMaskSaturation = 0,
  brushMaskTemperature = 0,
  brushMaskClarity = 0,
}: {
  imageUrl: string;
  settings: any;
  wiperPosition?: number;
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

      // Use wiperPosition prop instead of state.pointer
      if (settings.wiperActive) {
        materialRef.current.uniforms.uMouseX.value = wiperPosition;
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
          uHighlights: { value: settings.highlights || 0 },
          uShadows: { value: settings.shadows || 0 },
          uWhites: { value: settings.whites || 0 },
          uBlacks: { value: settings.blacks || 0 },
          uVibrance: { value: settings.vibrance || 0 },
          uTealOrange: { value: settings.tealOrange },
          uTemperature: { value: settings.temperature },
          uTint: { value: settings.tint },
          uSkinProtectStrength: { value: settings.skinProtect },
          uGrainStrength: { value: settings.grain },
          uVignette: { value: settings.vignette },

          uHalationStrength: { value: settings.halation || 0 },
          uHalationThreshold: { value: settings.halationThreshold || 0.7 },
          uHalationRadius: { value: settings.halationRadius || 1.0 },

          uBloomStrength: { value: settings.bloom || 0 },
          uBloomThreshold: { value: settings.bloomThreshold || 0.8 },
          uBloomRadius: { value: settings.bloomRadius || 1.0 },

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
              (settings.colorGrading?.shadows?.s || 0) > 0.01
                ? new THREE.Color().setHSL(
                    settings.colorGrading?.shadows?.h || 0,
                    settings.colorGrading?.shadows?.s || 0,
                    0.5
                  ).r
                : 0,
              (settings.colorGrading?.shadows?.s || 0) > 0.01
                ? new THREE.Color().setHSL(
                    settings.colorGrading?.shadows?.h || 0,
                    settings.colorGrading?.shadows?.s || 0,
                    0.5
                  ).g
                : 0,
              (settings.colorGrading?.shadows?.s || 0) > 0.01
                ? new THREE.Color().setHSL(
                    settings.colorGrading?.shadows?.h || 0,
                    settings.colorGrading?.shadows?.s || 0,
                    0.5
                  ).b
                : 0,
              settings.colorGrading?.shadows?.l || 0
            ),
          },
          uColorGradingMidtones: {
            value: new THREE.Vector4(
              (settings.colorGrading?.midtones?.s || 0) > 0.01
                ? new THREE.Color().setHSL(
                    settings.colorGrading?.midtones?.h || 0,
                    settings.colorGrading?.midtones?.s || 0,
                    0.5
                  ).r
                : 0,
              (settings.colorGrading?.midtones?.s || 0) > 0.01
                ? new THREE.Color().setHSL(
                    settings.colorGrading?.midtones?.h || 0,
                    settings.colorGrading?.midtones?.s || 0,
                    0.5
                  ).g
                : 0,
              (settings.colorGrading?.midtones?.s || 0) > 0.01
                ? new THREE.Color().setHSL(
                    settings.colorGrading?.midtones?.h || 0,
                    settings.colorGrading?.midtones?.s || 0,
                    0.5
                  ).b
                : 0,
              settings.colorGrading?.midtones?.l || 0
            ),
          },
          uColorGradingHighlights: {
            value: new THREE.Vector4(
              (settings.colorGrading?.highlights?.s || 0) > 0.01
                ? new THREE.Color().setHSL(
                    settings.colorGrading?.highlights?.h || 0,
                    settings.colorGrading?.highlights?.s || 0,
                    0.5
                  ).r
                : 0,
              (settings.colorGrading?.highlights?.s || 0) > 0.01
                ? new THREE.Color().setHSL(
                    settings.colorGrading?.highlights?.h || 0,
                    settings.colorGrading?.highlights?.s || 0,
                    0.5
                  ).g
                : 0,
              (settings.colorGrading?.highlights?.s || 0) > 0.01
                ? new THREE.Color().setHSL(
                    settings.colorGrading?.highlights?.h || 0,
                    settings.colorGrading?.highlights?.s || 0,
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
                          : settings.filmEmulation === "hp5"
                            ? 7
                            : settings.filmEmulation === "vista400"
                              ? 8
                              : settings.filmEmulation === "lomo800"
                                ? 9
                                : settings.filmEmulation === "technicolor"
                                  ? 10
                                  : settings.filmEmulation === "bleachbypass"
                                    ? 11
                                    : settings.filmEmulation === "crossprocess"
                                      ? 12
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
