import { EditorSettings } from "../types/editor";
import { IntaglioRecipe } from "../types/recipe";
import { DEFAULT_SETTINGS } from "../editor/pageTypes";

export const RECIPE_LIMITS: Partial<Record<keyof EditorSettings, [number, number]>> = {
  brightness: [-0.75, 0.75],
  contrast: [-0.45, 0.65],
  temperature: [-0.45, 0.45],
  tint: [-0.45, 0.45],
  halation: [0, 0.65],
  aberration: [0, 0.02],
  vignette: [0, 0.55],
};

/**
 * Applies a layered recipe to the current EditorSettings.
 * Automatically scales all quantitative parameters by the provided intensity,
 * bounded by RECIPE_LIMITS for safety.
 */
export const applyRecipe = (
  currentSettings: EditorSettings,
  recipe: IntaglioRecipe,
  intensity: number
): EditorSettings => {
  const newSettings = { ...currentSettings };
  
  // Track active recipe and intensity
  newSettings.appliedRecipeId = recipe.id;
  newSettings.recipeIntensity = intensity;
  
  // Helper to apply and clamp a scalar value
  const applyValue = (key: keyof EditorSettings, recipeVal: number | undefined) => {
    if (recipeVal === undefined) return;
    
    const neutral = DEFAULT_SETTINGS[key] as number;
    let finalVal = neutral + (recipeVal - neutral) * intensity;
    
    // Clamp if limits exist for this parameter
    const limits = RECIPE_LIMITS[key];
    if (limits) {
      finalVal = Math.max(limits[0], Math.min(limits[1], finalVal));
    }
    
    Object.assign(newSettings, { [key]: finalVal });
  };

  // Helper to apply a boolean value based on intensity threshold
  const applyBoolean = (key: keyof EditorSettings, recipeVal: boolean | undefined, threshold = 0.5) => {
      if (recipeVal === undefined) return;
      Object.assign(newSettings, { [key]: intensity > threshold ? recipeVal : DEFAULT_SETTINGS[key] });
  };
  
  // 1. Base Development
  if (recipe.settings.base) {
    applyValue('brightness', recipe.settings.base.brightness);
    applyValue('contrast', recipe.settings.base.contrast);
    applyValue('highlights', recipe.settings.base.highlights);
    applyValue('shadows', recipe.settings.base.shadows);
    applyValue('whites', recipe.settings.base.whites);
    applyValue('blacks', recipe.settings.base.blacks);
    applyValue('vibrance', recipe.settings.base.vibrance);
    applyValue('saturation', recipe.settings.base.saturation);
    applyValue('temperature', recipe.settings.base.temperature);
    applyValue('tint', recipe.settings.base.tint);
  }
  
  // 2. Color / OKLCH Mixer (only apply supported keys so legacy files stay loadable)
  if (recipe.settings.color) {
    for (const [key, value] of Object.entries(recipe.settings.color)) {
      if (key in DEFAULT_SETTINGS && typeof value === 'number') {
        applyValue(key as keyof EditorSettings, value);
      }
    }
  }
  
  // 3. Optics & Lens
  if (recipe.settings.optics) {
    applyValue('halation', recipe.settings.optics.halation);
    applyValue('bloom', recipe.settings.optics.bloom);
    applyValue('vignette', recipe.settings.optics.vignette);
    applyValue('aberration', recipe.settings.optics.aberration);
    applyValue('anamorphicDistortion', recipe.settings.optics.anamorphicDistortion);
    applyValue('anamorphicStreaks', recipe.settings.optics.anamorphicStreaks);
    applyValue('godLightStrength', recipe.settings.optics.godLightStrength);
    applyValue('godLightX', recipe.settings.optics.godLightX);
    applyValue('godLightY', recipe.settings.optics.godLightY);
  }
  
  // 4. Texture / Grain
  if (recipe.settings.texture) {
    applyValue('grain', recipe.settings.texture.grain);
  }
  
  // 5. Finishing & Structure
  if (recipe.settings.finishing) {
    applyValue('sharpness', recipe.settings.finishing.sharpness);
    applyValue('structure', recipe.settings.finishing.structure);
    applyValue('dehaze', recipe.settings.finishing.dehaze);
    applyValue('skinProtect', recipe.settings.finishing.skinProtect);
  }
  
  // 6. Film
  if (recipe.settings.film) {
    if (recipe.settings.film.filmEmulation !== undefined) {
      newSettings.filmEmulation = intensity > 0.5 ? recipe.settings.film.filmEmulation : DEFAULT_SETTINGS.filmEmulation;
    }
    applyValue('filmEmulationStrength', recipe.settings.film.filmEmulationStrength);
    applyBoolean('filmBorder', recipe.settings.film.filmBorder);
  }
  
  // 7. Raw Fallback for properties that haven't been structured yet
  if (recipe.settings.raw) {
    for (const [key, value] of Object.entries(recipe.settings.raw)) {
       if (!(key in DEFAULT_SETTINGS)) continue;
       if (typeof value === 'number') {
           applyValue(key as keyof EditorSettings, value);
       } else if (typeof value === 'boolean') {
           applyBoolean(key as keyof EditorSettings, value);
       } else {
           Object.assign(newSettings, { [key]: value });
       }
    }
  }

  // 8. Dynamic Adjustment Layers 
  // We scope the IDs to the recipe and scale their opacity by the master intensity.
  const nonRecipeLayers = newSettings.adjustmentLayers.filter(l => !l.id.startsWith('recipe-'));
  
  if (recipe.settings.adjustmentLayers && recipe.settings.adjustmentLayers.length > 0 && intensity > 0) {
     const recipeLayers = recipe.settings.adjustmentLayers.map(l => ({
        ...l,
        id: `recipe-${recipe.id}-${l.id}`, 
        opacity: l.opacity * intensity 
     }));
     
     newSettings.adjustmentLayers = [...nonRecipeLayers, ...recipeLayers];
  } else {
     // Ensure cleanup of previous recipe layers
     newSettings.adjustmentLayers = nonRecipeLayers;
  }

  return newSettings;
};

/**
 * Removes the current recipe from settings, returning them to neutral 
 * (except for whatever manual edits were applied on top, though in this engine, 
 * changing intensity to 0 effectively removes the recipe's base offsets).
 */
export const removeRecipe = (currentSettings: EditorSettings): EditorSettings => {
  if (!currentSettings.appliedRecipeId) return currentSettings;
  
  // Real implementation will require the UI to apply the original recipe with intensity 0,
  // or store manual overrides cleanly.
  return currentSettings;
};
