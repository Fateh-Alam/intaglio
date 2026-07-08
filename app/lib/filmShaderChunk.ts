export const FILM_EMULATION_SHADER_CHUNK = `
  vec3 applyFilmChunk_0(vec3 color, int filmType, float strength) {
    vec3 filmColor = color;
    float luma = getLuma(filmColor);

    if (filmType == 1) { // Kodak Portra 400
        filmColor.r *= 1.05; 
        filmColor.g += 0.02 * (1.0 - luma); 
        filmColor.b *= 0.95;
        filmColor = mix(filmColor, pow(filmColor, vec3(0.95)), 0.8);
        return mix(color, filmColor, strength);
    }
    if (filmType == 2) { // Fujifilm Velvia 50
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y = clamp(hsl.y * 1.3, 0.0, 1.0); 
        filmColor = hsl2rgb(hsl);
        filmColor = smoothstep(0.05, 0.95, filmColor);
        filmColor.r += 0.02 * luma;
        filmColor.b += 0.02 * luma;
        return mix(color, filmColor, strength);
    }
    if (filmType == 3) { // Kodak Tri-X 400
        filmColor = vec3(luma);
        filmColor = smoothstep(0.1, 0.9, filmColor);
        return mix(color, filmColor, strength);
    }
    if (filmType == 4) { // CineStill 800T
        filmColor.b += 0.06 * (1.0 - luma);
        filmColor.g += 0.03 * (1.0 - luma);
        filmColor.r += 0.08 * smoothstep(0.5, 1.0, luma);
        filmColor = pow(filmColor, vec3(1.1));
        return mix(color, filmColor, strength);
    }
    if (filmType == 5) { // Ilford HP5 Plus
        filmColor = vec3(luma);
        filmColor = mix(filmColor, vec3(0.5), 0.15); 
        return mix(color, filmColor, strength);
    }
    if (filmType == 6) { // Fujifilm Pro 400H
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y *= 0.85; 
        filmColor = hsl2rgb(hsl);
        filmColor.g += 0.04 * (1.0 - luma); 
        filmColor.b += 0.03 * (1.0 - luma);
        filmColor.r += 0.03 * luma; 
        filmColor.b += 0.02 * luma;
        filmColor = pow(filmColor, vec3(0.9));
        return mix(color, filmColor, strength);
    }
    if (filmType == 7) { // Kodak Ektar 100
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y = clamp(hsl.y * 1.2, 0.0, 1.0);
        filmColor = hsl2rgb(hsl);
        filmColor.r *= 1.1;
        filmColor = smoothstep(0.02, 0.98, filmColor);
        return mix(color, filmColor, strength);
    }
    if (filmType == 8) { // Wes Anderson (Pastel)
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y *= 0.9;
        filmColor = hsl2rgb(hsl);
        filmColor.r += 0.08;
        filmColor.g += 0.06;
        filmColor.b -= 0.04;
        filmColor = mix(filmColor, vec3(0.5), 0.1); 
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    return color;
  }

  vec3 applyFilmChunk_1(vec3 color, int filmType, float strength) {
    vec3 filmColor = color;
    float luma = getLuma(filmColor);

    if (filmType == 9) { // Teal & Orange
        filmColor.b += 0.08 * (1.0 - luma);
        filmColor.g += 0.04 * (1.0 - luma);
        filmColor.r += 0.1 * luma;
        filmColor.g += 0.05 * luma;
        filmColor.b -= 0.05 * luma;
        filmColor = smoothstep(0.05, 0.95, filmColor);
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 10) { // Cyberpunk Neon
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y = clamp(hsl.y * 1.4, 0.0, 1.0);
        filmColor = hsl2rgb(hsl);
        filmColor.r += 0.1 * luma; 
        filmColor.b += 0.1 * luma;
        filmColor.g += 0.1 * (1.0 - luma); 
        filmColor.b += 0.1 * (1.0 - luma);
        filmColor = smoothstep(0.1, 1.0, filmColor); 
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 11) { // The Matrix
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y *= 0.7; 
        filmColor = hsl2rgb(hsl);
        filmColor.g += 0.1 * (1.0 - luma); 
        filmColor.r *= 0.8;
        filmColor.b *= 0.8;
        filmColor = pow(filmColor, vec3(1.1)); 
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 12) { // Bleach Bypass
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y *= 0.3; 
        filmColor = hsl2rgb(hsl);
        filmColor = smoothstep(0.15, 0.85, filmColor); 
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 13) { // Vintage 70s Fade
        filmColor.r += 0.05;
        filmColor.g += 0.05;
        filmColor.b -= 0.05;
        filmColor = mix(filmColor, vec3(1.0), 0.05); 
        filmColor = mix(filmColor, vec3(0.1, 0.1, 0.05), (1.0 - luma) * 0.2); 
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 14) { // Polaroid Dream
        filmColor.r += 0.04;
        filmColor.b += 0.04;
        filmColor = mix(filmColor, vec3(0.5), 0.2); 
        filmColor = mix(filmColor, vec3(0.15, 0.1, 0.15), (1.0 - luma) * 0.3); 
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 15) { // Cinematic Noir
        filmColor = vec3(luma);
        filmColor = smoothstep(0.2, 0.8, filmColor);
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    return color;
  }

  vec3 applyFilmChunk_2(vec3 color, int filmType, float strength) {
    vec3 filmColor = color;
    float luma = getLuma(filmColor);

    if (filmType == 16) { // Agfa APX 100
        filmColor = vec3(luma);
        filmColor = smoothstep(0.05, 0.95, filmColor);
        filmColor += vec3(0.02, 0.01, 0.0) * luma;
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 17) { // Kodachrome 64
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y = clamp(hsl.y * 1.25, 0.0, 1.0);
        filmColor = hsl2rgb(hsl);
        filmColor.r *= 1.12;
        filmColor.b *= 1.08;
        filmColor = smoothstep(0.04, 0.96, filmColor);
        filmColor.r += 0.04 * luma;
        filmColor.g += 0.02 * luma;
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 18) { // Fuji Superia 400
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y *= 0.9;
        filmColor = hsl2rgb(hsl);
        filmColor.g += 0.05 * (1.0 - luma);
        filmColor = mix(filmColor, vec3(0.08, 0.09, 0.07), (1.0 - luma) * 0.15);
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 19) { // Ilford Pan F Plus 50
        filmColor = vec3(luma);
        filmColor = smoothstep(0.02, 0.98, filmColor);
        filmColor = pow(filmColor, vec3(0.95));
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 20) { // Kodak Gold 200
        filmColor.r += 0.06 * luma;
        filmColor.g += 0.04 * luma;
        filmColor = mix(filmColor, vec3(0.12, 0.10, 0.06), (1.0 - luma) * 0.15);
        filmColor = pow(filmColor, vec3(0.92));
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 21) { // Lomography CN 800
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y = clamp(hsl.y * 1.5, 0.0, 1.0);
        filmColor = hsl2rgb(hsl);
        filmColor.b += 0.08 * (1.0 - luma);
        filmColor.r += 0.06 * luma;
        filmColor.g -= 0.03 * luma;
        filmColor = smoothstep(0.08, 0.92, filmColor);
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 22) { // Fomapan 400
        filmColor = vec3(luma);
        filmColor = smoothstep(0.15, 0.85, filmColor);
        filmColor = pow(filmColor, vec3(1.15));
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 23) { // CineStill 50D
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y = clamp(hsl.y * 1.15, 0.0, 1.0);
        filmColor = hsl2rgb(hsl);
        filmColor.r += 0.02 * luma;
        filmColor.g += 0.01 * luma;
        filmColor = smoothstep(0.03, 0.97, filmColor);
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 24) { // Kodak Vision3 500T
        filmColor.b += 0.08 * (1.0 - luma);
        filmColor.g += 0.04 * (1.0 - luma);
        filmColor.r += 0.06 * smoothstep(0.6, 1.0, luma);
        filmColor = pow(filmColor, vec3(1.08));
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 25) { // Fuji Provia 100F
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y = clamp(hsl.y * 1.1, 0.0, 1.0);
        filmColor = hsl2rgb(hsl);
        filmColor = smoothstep(0.03, 0.97, filmColor);
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    return color;
  }

  vec3 applyFilmChunk_3(vec3 color, int filmType, float strength) {
    vec3 filmColor = color;
    float luma = getLuma(filmColor);

    if (filmType == 26) { // Amber Plate
        filmColor = vec3(luma);
        vec3 amber = vec3(luma * 1.1, luma * 0.85, luma * 0.55);
        filmColor = mix(filmColor, amber, 0.85);
        filmColor = smoothstep(0.12, 0.88, filmColor);
        filmColor += vec3(0.04, 0.02, 0.0) * smoothstep(0.7, 1.0, luma);
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 27) { // Prussian Ink
        filmColor = vec3(luma);
        vec3 shadow = vec3(0.08, 0.12, 0.28);
        vec3 highlight = vec3(0.95, 0.93, 0.88);
        filmColor = mix(shadow, highlight, smoothstep(0.1, 0.9, filmColor));
        filmColor = pow(filmColor, vec3(0.9, 0.95, 1.1));
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 28) { // Celadon
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y *= 0.85;
        filmColor = hsl2rgb(hsl);
        float mid = smoothstep(0.2, 0.5, luma) * smoothstep(0.8, 0.5, luma);
        filmColor.g += 0.06 * mid;
        filmColor.b -= 0.02 * mid;
        filmColor.r += 0.04 * smoothstep(0.6, 1.0, luma);
        filmColor.g += 0.03 * smoothstep(0.6, 1.0, luma);
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 29) { // Carta
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y *= 0.6;
        filmColor = hsl2rgb(hsl);
        filmColor = clamp(filmColor, 0.06, 0.92);
        filmColor = mix(filmColor, vec3(0.45, 0.38, 0.28), 0.2);
        filmColor.r += 0.03 * luma;
        filmColor.g += 0.02 * luma;
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 30) { // Verdigris
        filmColor.g += 0.06 * (1.0 - luma);
        filmColor.b += 0.05 * (1.0 - luma);
        filmColor.r += 0.05 * smoothstep(0.5, 1.0, luma);
        filmColor.g += 0.04 * smoothstep(0.5, 1.0, luma);
        vec3 hsl = rgb2hsl(filmColor);
        hsl.y *= 0.9;
        filmColor = hsl2rgb(hsl);
        filmColor = pow(filmColor, vec3(0.95));
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    if (filmType == 31) { // Obsidian
        filmColor = vec3(luma);
        filmColor = smoothstep(0.25, 0.75, filmColor);
        filmColor = smoothstep(0.1, 0.9, filmColor);
        filmColor = pow(filmColor, vec3(1.2));
        return mix(color, clamp(filmColor, 0.0, 1.0), strength);
    }
    return color;
  }

  vec3 applyFilmEmulation(vec3 color, int filmType, float strength) {
    if (filmType == 0) return color;
    if (filmType <= 8) return applyFilmChunk_0(color, filmType, strength);
    if (filmType <= 15) return applyFilmChunk_1(color, filmType, strength);
    if (filmType <= 25) return applyFilmChunk_2(color, filmType, strength);
    if (filmType <= 31) return applyFilmChunk_3(color, filmType, strength);
    return color;
  }
`;
