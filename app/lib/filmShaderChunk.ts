// Auto-generated film emulation shader logic
export const FILM_EMULATION_SHADER_CHUNK = `
  vec3 applyFilmEmulation(vec3 color, int filmType, float strength) {
    if (filmType == 0) return color; // None
    
    vec3 filmColor = color;
    
    else if (filmType == 1) { // Fujicolor 100
      filmColor.b *= 1.05; filmColor.r *= 0.95;
    }
    else if (filmType == 2) { // Fujicolor 200
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 3) { // Fujicolor 400
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 4) { // Fujicolor C200
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 5) { // Fujicolor Industrial 100
      filmColor.b *= 1.05; filmColor.r *= 0.95;
    }
    else if (filmType == 6) { // Fujicolor Superia 100
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 7) { // Fujicolor Superia 200
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 8) { // Fujicolor Superia 400
      filmColor.b *= 1.05; filmColor.r *= 0.95;
    }
    else if (filmType == 9) { // Fujicolor Superia 800
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 10) { // Fujicolor Superia 1600
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 11) { // Fujicolor Superia X-TRA 400 (Superia X-TRA)
      filmColor.b *= 1.05; filmColor.r *= 0.95;
    }
    else if (filmType == 12) { // Fujicolor Superia Reala 100
      filmColor.b *= 1.05; filmColor.r *= 0.95;
    }
    else if (filmType == 13) { // Fujifilm Superia Premium 400
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 14) { // Fujifilm Pro 160 NS (NPS, NPH predecessors)
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 0.8);
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 15) { // Fujifilm Pro 160 NPS (Natural Portrait Standard)
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 16) { // Fujifilm Pro 160 NPH (Natural Portrait High Speed)
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 17) { // Fujifilm Pro 400H
      filmColor.b *= 1.05; filmColor.r *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 0.8);
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 18) { // Fujifilm Pro 800Z
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 19) { // Fujifilm NPC 160
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 20) { // Fujifilm NPZ 800
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 21) { // Fujifilm Velvia 50 (RVP 50)
      filmColor.b *= 1.05; filmColor.r *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
      filmColor = filmColor * filmColor * (3.0 - 2.0 * filmColor);
    }
    else if (filmType == 22) { // Fujifilm Velvia 100 (RVP 100)
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 23) { // Fujifilm Velvia 100F (RVP-F)
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 24) { // Fujifilm Provia 100F (RDPIII)
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 25) { // Fujifilm Provia 400X (RXP)
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 26) { // Fujifilm Sensia 100
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 27) { // Fujifilm Astia 100F (RAP-F)
      filmColor.b *= 1.05; filmColor.r *= 0.95;
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 28) { // Fujifilm MS 100/1000 (Super HG)
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 29) { // Fujifilm Neopan 100 Acros (Acros II now available)
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 30) { // Fujifilm Neopan 400 (CN)
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 31) { // Fujifilm Neopan 1600
      float luma = getLuma(filmColor);
      filmColor = vec3(smoothstep(0.1, 0.9, luma));
    }
    else if (filmType == 32) { // Fujifilm Neopan 400 Professional
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 33) { // Kodak Gold 100
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 34) { // Kodak Gold 200
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 35) { // Kodak Gold 400
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 36) { // Kodak UltraMax 400
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 37) { // Kodak ColorPlus 200
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 38) { // Kodak Funtime / Kodak Max
    }
    else if (filmType == 39) { // Kodak Advantix
    }
    else if (filmType == 40) { // Kodak Portra 160 (NC and VC variants + current)
    }
    else if (filmType == 41) { // Kodak Portra 400 (NC and VC variants + current)
    }
    else if (filmType == 42) { // Kodak Portra 800
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 43) { // Kodak Ektar 100
      filmColor.b *= 1.05; filmColor.r *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 44) { // Kodak Ektar 25 (Technical Pan)
    }
    else if (filmType == 45) { // Kodak Ektacolor / Vericolor Series
    }
    else if (filmType == 46) { // Kodak Royal Gold 100 / 200 / 400 / 1000
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 47) { // Kodak Supra 100 / 400 / 800
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 48) { // Kodak Pro Image 100
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 49) { // Kodak Ektachrome E100 (current)
      filmColor.b *= 1.05; filmColor.r *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 50) { // Kodak Ektachrome 100 VS (Vivid Saturation)
    }
    else if (filmType == 51) { // Kodak Ektachrome 100 SW / GX / Plus
    }
    else if (filmType == 52) { // Kodak Ektachrome 200
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 53) { // Kodak Ektachrome 400X
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 54) { // Kodak Kodachrome 25
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 55) { // Kodak Kodachrome 64
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 56) { // Kodak Kodachrome 200
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 57) { // Kodak Elite Chrome Series
    }
    else if (filmType == 58) { // Kodak Tri-X 400 (TX)
      float luma = getLuma(filmColor);
      filmColor = vec3(smoothstep(0.1, 0.9, luma));
    }
    else if (filmType == 59) { // Kodak T-MAX 100 (TMX)
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 60) { // Kodak T-MAX 400 (TMY-2)
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 61) { // Kodak T-MAX P3200 (TMZ)
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 62) { // Kodak Panatomic-X
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 63) { // Kodak Plus-X 125 (PX)
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 64) { // Kodak Royal Pan 400
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 65) { // Kodak Technical Pan (TP 2415)
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 66) { // Kodak High Speed Infrared (HIE)
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 67) { // Agfa Vista 100 / 200 / 400
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 68) { // Agfaphoto Vista Plus 200 / 400
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 69) { // Agfa Optima 100 / 200 / 400
    }
    else if (filmType == 70) { // Agfa HDC Plus 200 / 400
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 71) { // Agfa Portrait XPS 160
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 72) { // Agfa Ultra 50
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 73) { // Agfa RSX II 50 / 100 / 200 (slide film)
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 74) { // Agfa CT Precisa 100 / 200
    }
    else if (filmType == 75) { // Agfa Scala 200x (B&W Slide)
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 76) { // Agfapan APX 25
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 77) { // Agfapan APX 100
      float luma = getLuma(filmColor);
      filmColor = vec3(smoothstep(0.1, 0.9, luma));
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 78) { // Agfapan APX 400
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 79) { // Ilford Pan F Plus 50
      float luma = getLuma(filmColor);
      filmColor = vec3(smoothstep(0.1, 0.9, luma));
    }
    else if (filmType == 80) { // Ilford FP4 Plus 125
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 81) { // Ilford HP5 Plus 400
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 82) { // Ilford Delta 100
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 83) { // Ilford Delta 400
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 84) { // Ilford Delta 3200
      float luma = getLuma(filmColor);
      filmColor = vec3(smoothstep(0.1, 0.9, luma));
    }
    else if (filmType == 85) { // Ilford SFX 200 (Extended Red Sensitivity)
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 86) { // Ilford XP2 Super 400
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 87) { // Ilford Ortho Plus 80
      filmColor.b *= 1.05; filmColor.r *= 0.95;
    }
    else if (filmType == 88) { // Ilford Multigrade IV RC / FB (Darkroom Paper — not film, for reference)
    }
    else if (filmType == 89) { // Lomography Color Negative 100
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 90) { // Lomography Color Negative 200
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 91) { // Lomography Color Negative 400
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 92) { // Lomography Lady Grey 400 (B&W)
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 93) { // Lomography Earl Grey 100 (B&W)
    }
    else if (filmType == 94) { // Lomography LomoChrome Purple XR 100–400
      filmColor.b *= 1.05; filmColor.r *= 0.95;
    }
    else if (filmType == 95) { // Lomography LomoChrome Metropolis 100–400
      filmColor.b *= 1.05; filmColor.r *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 96) { // Lomography LomoChrome Turquoise 100–400
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 97) { // Lomography Redscale XR 50–200
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      filmColor = filmColor * filmColor * (3.0 - 2.0 * filmColor);
    }
    else if (filmType == 98) { // Lomography Fantome Kino B&W 8
    }
    else if (filmType == 99) { // Lomography Berlin Kino B&W 400
      filmColor = filmColor * filmColor * (3.0 - 2.0 * filmColor);
    }
    else if (filmType == 100) { // Lomography X-Pro Chrome 100 (slide for cross-processing)
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
      filmColor = filmColor * filmColor * (3.0 - 2.0 * filmColor);
    }
    else if (filmType == 101) { // Lomography 110 Film (multiple types)
    }
    else if (filmType == 102) { // CineStill 50D (Daylight)
      float luma = getLuma(filmColor);
      filmColor.r += 0.05 * smoothstep(0.5, 1.0, luma);
      filmColor.b += 0.04 * (1.0 - luma);
    }
    else if (filmType == 103) { // CineStill 800T (Tungsten)
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      float luma = getLuma(filmColor);
      filmColor.r += 0.05 * smoothstep(0.5, 1.0, luma);
      filmColor.b += 0.04 * (1.0 - luma);
    }
    else if (filmType == 104) { // CineStill 400D (Daylight)
      float luma = getLuma(filmColor);
      filmColor.r += 0.05 * smoothstep(0.5, 1.0, luma);
      filmColor.b += 0.04 * (1.0 - luma);
    }
    else if (filmType == 105) { // CineStill BwXX (Monochrome)
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      filmColor = filmColor * filmColor * (3.0 - 2.0 * filmColor);
    }
    else if (filmType == 106) { // Polaroid 600 Color
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 107) { // Polaroid i-Type Color
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 108) { // Polaroid SX-70 Color Film
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 109) { // Polaroid Black & White 600 / i-Type
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 110) { // Fujifilm FP-100C (Peel-Apart)
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 111) { // Fujifilm FP-3000B (Peel-Apart B&W)
      float luma = getLuma(filmColor);
      filmColor = vec3(smoothstep(0.1, 0.9, luma));
    }
    else if (filmType == 112) { // Fujifilm Instax Mini (various)
    }
    else if (filmType == 113) { // Fujifilm Instax Wide
    }
    else if (filmType == 114) { // Fujifilm Instax Square
    }
    else if (filmType == 115) { // Impossible Project / Polaroid Originals Films
    }
    else if (filmType == 116) { // Fomapan 100 Classic
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 117) { // Fomapan 200 Creative
    }
    else if (filmType == 118) { // Fomapan 400 Action
    }
    else if (filmType == 119) { // Fomapan R 100 (Reversal B&W)
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 120) { // Fomapan Retropan 320 Soft
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 121) { // Fomapan Infrared 820
    }
    else if (filmType == 122) { // Rollei Superpan 200
    }
    else if (filmType == 123) { // Rollei Infrared 400
    }
    else if (filmType == 124) { // Rollei RPX 25
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 125) { // Rollei RPX 100
    }
    else if (filmType == 126) { // Rollei RPX 400
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 127) { // Rollei Retro 80S
    }
    else if (filmType == 128) { // Rollei Retro 400S
    }
    else if (filmType == 129) { // Rollei CN 200 (Color Negative C-41)
    }
    else if (filmType == 130) { // Rollei Digibase CR 200 Pro (Slide E-6)
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 131) { // Washi "S" 25 (Sound Recording Film)
    }
    else if (filmType == 132) { // Washi "A" 50 (Aerial Film)
    }
    else if (filmType == 133) { // Washi "V" 100 (Varnished Paper Base)
    }
    else if (filmType == 134) { // Washi "Z" 50 (Non-Curl Film)
    }
    else if (filmType == 135) { // Washi "D" 100 (X-Ray Film)
    }
    else if (filmType == 136) { // Washi "F" (Super 8 Film)
    }
    else if (filmType == 137) { // Kentmere 100
    }
    else if (filmType == 138) { // Kentmere 400
    }
    else if (filmType == 139) { // Bergger Pancro 400
    }
    else if (filmType == 140) { // Bergger Procyon OrthoPan 400 IR
    }
    else if (filmType == 141) { // Svema FN 64
    }
    else if (filmType == 142) { // Svema Color 125 CN
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 143) { // Svema Foto 100 / 200 / 400
    }
    else if (filmType == 144) { // Tasma FT-41 / FT-51
    }
    else if (filmType == 145) { // Svema KB-3 (Color Reversal)
    }
    else if (filmType == 146) { // Shanghai GP3 100
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      filmColor = filmColor * filmColor * (3.0 - 2.0 * filmColor);
    }
    else if (filmType == 147) { // Shanghai GP3 400
    }
    else if (filmType == 148) { // ORWO UN 54
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 149) { // ORWO N 74 Plus
      float luma = getLuma(filmColor);
      filmColor = vec3(luma);
    }
    else if (filmType == 150) { // ORWO NP 15 (Panchromatic)
    }
    else if (filmType == 151) { // ORWO DP 31 (Orthopan)
    }
    else if (filmType == 152) { // ORWO Color NP 20 / NP 27 (Color Negative)
    }
    else if (filmType == 153) { // Adox CMS 20 II
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 154) { // Adox CHS 100 II
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 155) { // Adox HR-50 (High Resolution)
    }
    else if (filmType == 156) { // Adox Silvermax 100
    }
    else if (filmType == 157) { // Adox Color Mission 200
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 158) { // Ferrania P30 Alpha
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 159) { // Ferrania Solaris 200 (historical)
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 160) { // Ferrania Globus / Orwo (historical)
    }
    else if (filmType == 161) { // Recipe: Fujifilm Pro 400H Simulation (Pastel Film)
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 0.8);
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 162) { // Recipe: Kodak Portra 400 Simulation
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 163) { // Recipe: Kodak Gold 200 Simulation
      filmColor.r *= 1.05; filmColor.b *= 0.95;
    }
    else if (filmType == 164) { // Recipe: Fuji Velvia 50 Simulation (Max Saturation)
      filmColor.b *= 1.05; filmColor.r *= 0.95;
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 1.2);
    }
    else if (filmType == 165) { // Recipe: Fuji Provia 100F Simulation (Neutral)
    }
    else if (filmType == 166) { // Recipe: Kodak Tri-X 400 Simulation (B&W)
      filmColor = filmColor * filmColor * (3.0 - 2.0 * filmColor);
    }
    else if (filmType == 167) { // Recipe: Ilford HP5 Plus Simulation (B&W)
    }
    else if (filmType == 168) { // Recipe: CineStill 800T Simulation (Night Film)
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      float luma = getLuma(filmColor);
      filmColor.r += 0.05 * smoothstep(0.5, 1.0, luma);
      filmColor.b += 0.04 * (1.0 - luma);
    }
    else if (filmType == 169) { // Recipe: Classic Neg "Film" Look (Faded / Vintage)
    }
    else if (filmType == 170) { // Recipe: "Summer Fade" / Expired Film Look
      filmColor.r *= 1.05; filmColor.b *= 0.95;
      filmColor = pow(filmColor, vec3(0.9));
      filmColor = mix(filmColor, filmColor * 0.95 + 0.05, smoothstep(0.6, 1.0, getLuma(filmColor)));
    }
    else if (filmType == 171) { // Recipe: Acros + Green Filter (Landscape B&W)
    }
    else if (filmType == 172) { // Recipe: Eterna Cinema "Movie Look"
      float luma = getLuma(filmColor);
      filmColor = mix(vec3(luma), filmColor, 0.8);
    }
    else if (filmType == 173) { // Recipe: Reala Ace Simulation (Fuji X-T5 / X-H2 era)
    }
    else if (filmType == 174) { // Recipe: Kodak Portra 400 (Lightroom / Editing)
    }
    else if (filmType == 175) { // Recipe: Fujifilm Pro 400H (Lightroom / Editing)
    }
    else if (filmType == 176) { // Recipe: Kodak Gold 200 (Lightroom / Editing)
    }
    else if (filmType == 177) { // Recipe: Ilford HP5 (B&W — Lightroom)
    }
    else if (filmType == 178) { // Recipe: Kodak Tri-X 400 (B&W — Lightroom)
    }
    else if (filmType == 179) { // Recipe: CineStill 800T (Night / Urban — Lightroom)
      float luma = getLuma(filmColor);
      filmColor.r += 0.05 * smoothstep(0.5, 1.0, luma);
      filmColor.b += 0.04 * (1.0 - luma);
    }
    else if (filmType == 180) { // Recipe: Lomography LomoChrome Purple (Color Shift)
    }
    else if (filmType == 181) { // Recipe: VSCO Film 01 "Kodak Film Pack"
    }
    else if (filmType == 182) { // Recipe: VSCO Film 02 "Fuji Film Pack"
    }
    
    // Mix with original based on strength
    return mix(color, clamp(filmColor, 0.0, 1.0), strength);
  }
`;
