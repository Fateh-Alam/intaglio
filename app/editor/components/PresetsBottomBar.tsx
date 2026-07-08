import React, { useState, useMemo } from 'react';
import { useEditorState } from '../hooks/useEditorState';
import { PRESETS, Preset } from '../../lib/presets';
import { IconX } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to simulate the preset's color grading math on a neutral gradient
function generatePresetGradient(preset: Preset) {
  const settings = preset.settings as Record<string, any>;
  
  const brightness = (settings.brightness || 0) as number;
  const contrast = (settings.contrast || 0) as number;
  const temperature = (settings.temperature || 0) as number;
  const tint = (settings.tint || 0) as number;
  const tealOrange = (settings.tealOrange || 0) as number;
  
  const isBW = preset.tags?.includes("B&W") || preset.tags?.includes("Monochrome") || preset.name.includes("Noir");
  
  // Start with a colorful base so color grades are highly visible
  let c1 = [230, 190, 150]; // Warm highlight (like skin or sunset)
  let c2 = [30, 60, 100]; // Cool shadow (like sky or water)

  const applyAdjustments = (c: number[], isHighlight: boolean) => {
    // 1. False Color Simulation
    if (settings.falseColor) {
      const lum = (c[0] + c[1] + c[2]) / 3;
      c[0] = lum > 120 ? 255 : 50;
      c[1] = lum > 80 && lum < 180 ? 255 : 50;
      c[2] = lum < 120 ? 255 : 50;
    }

    // 2. Brightness (Exaggerated)
    c[0] += brightness * 350;
    c[1] += brightness * 350;
    c[2] += brightness * 350;

    // 3. Contrast (Exaggerated)
    const factor = 1 + contrast * 3;
    c[0] = (c[0] - 128) * factor + 128;
    c[1] = (c[1] - 128) * factor + 128;
    c[2] = (c[2] - 128) * factor + 128;

    // 4. Temperature (Exaggerated)
    c[0] += temperature * 150;
    c[1] += temperature * 60;
    c[2] -= temperature * 150;

    // 5. Tint (Exaggerated)
    c[1] -= tint * 150;
    c[0] += tint * 80;
    c[2] += tint * 80;

    // 6. Teal/Orange
    if (tealOrange > 0) {
      const targetColor = isHighlight ? [255, 170, 80] : [10, 100, 150];
      c[0] = c[0] * (1 - tealOrange) + targetColor[0] * tealOrange;
      c[1] = c[1] * (1 - tealOrange) + targetColor[1] * tealOrange;
      c[2] = c[2] * (1 - tealOrange) + targetColor[2] * tealOrange;
    }

    // 7. Hue Shift Simulation (simple color rotation)
    if (settings.hueShift) {
       const shift = settings.hueShift * 255;
       const r = c[0], g = c[1], b = c[2];
       c[0] = r + shift;
       c[1] = g - shift;
       c[2] = b + shift;
    }

    // 8. B&W
    if (isBW) {
      const luminance = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
      c[0] = luminance;
      c[1] = luminance;
      c[2] = luminance;
    }

    // Clamp
    c[0] = Math.max(0, Math.min(255, Math.round(c[0])));
    c[1] = Math.max(0, Math.min(255, Math.round(c[1])));
    c[2] = Math.max(0, Math.min(255, Math.round(c[2])));
    
    return c;
  };

  c1 = applyAdjustments(c1, true);
  c2 = applyAdjustments(c2, false);

  return `linear-gradient(135deg, rgb(${c1.join(",")}) 0%, rgb(${c2.join(",")}) 100%)`;
}

// Extract specs from settings
function getPresetSpecs(settings: Record<string, any>) {
  const specs = [];
  if (settings.contrast) specs.push(`Cont: ${settings.contrast > 0 ? '+' : ''}${(settings.contrast * 100).toFixed(0)}`);
  if (settings.temperature) specs.push(`Temp: ${settings.temperature > 0 ? '+' : ''}${(settings.temperature * 100).toFixed(0)}`);
  if (settings.grain) specs.push(`Grain: ${(settings.grain * 100).toFixed(0)}`);
  if (settings.tealOrange) specs.push(`T/O: ${(settings.tealOrange * 100).toFixed(0)}`);
  return specs.slice(0, 3); // Max 3 specs
}

export function PresetsBottomBar() {
  const { isPresetsBarOpen, setIsPresetsBarOpen, setSettings, addToHistory, settings } = useEditorState();
  const [activeTab, setActiveTab] = useState<string>("All");

  const tabs = ["All", "Nyvarra Signatures", "B&W", "Vintage", "Utility"];

  const filteredPresets = useMemo(() => {
    if (activeTab === "All") return PRESETS;
    return PRESETS.filter(p => p.tags.includes(activeTab));
  }, [activeTab]);

  return (
    <AnimatePresence>
      {isPresetsBarOpen && (
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          {/* Dark overlay backdrop to focus attention */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm -z-10 h-screen -translate-y-[calc(100vh-100%)]"
            onClick={() => setIsPresetsBarOpen(false)}
          />

          <div className="bg-[#1c1c1e] border-t border-white/10 w-full relative">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[#161618]">
              <div className="flex items-center gap-6">
                <h3 className="text-xs font-semibold text-white/90">
                  Nyvarra Presets
                </h3>
                <div className="flex items-center gap-2">
                  {tabs.map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
                        activeTab === tab 
                          ? "bg-white/10 text-white" 
                          : "text-white/40 hover:text-white/70 hover:bg-white/5"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setIsPresetsBarOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <IconX size={16} />
              </button>
            </div>

            {/* Horizontal scroll container for presets */}
            <div className="flex overflow-x-auto gap-4 p-6 custom-scrollbar scroll-smooth">
              <AnimatePresence mode="popLayout">
                {filteredPresets.map((preset, i) => {
                  const isSignature = preset.tags.includes("Nyvarra Signatures");
                  const gradient = generatePresetGradient(preset);
                  const specs = getPresetSpecs(preset.settings as any);

                  return (
                    <motion.button
                      layout
                      initial={{ opacity: 0, scale: 0.9, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", damping: 20, stiffness: 200, delay: i * 0.03 }}
                      key={preset.id}
                      onClick={() => {
                        const newSettings = { ...settings, ...(preset.settings as any) };
                        setSettings(newSettings);
                        if (addToHistory) {
                          addToHistory(newSettings, `Preset: ${preset.name}`);
                        }
                      }}
                      className={`group flex-none w-[220px] flex flex-col text-left transition-all duration-300 border rounded-xl overflow-hidden bg-[#242426] hover:-translate-y-1 ${
                        isSignature 
                          ? "border-blue-500/30 hover:border-blue-500/80 hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]" 
                          : "border-white/5 hover:border-white/20 hover:shadow-lg"
                      }`}
                    >
                      {/* Gradient Preview Area */}
                      <div className="h-24 w-full relative flex flex-col justify-end p-3" style={{ background: gradient }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <h4 className="relative z-10 text-sm font-semibold text-white truncate">
                          {preset.name}
                        </h4>
                      </div>

                      <div className="p-3 flex-1 flex flex-col">
                        <p className="text-[10px] leading-relaxed line-clamp-2 mb-3 text-white/50 font-medium">
                          {preset.description}
                        </p>
                        
                        {/* Specs Section */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {specs.map(spec => (
                            <span key={spec} className="px-1.5 py-0.5 bg-black/30 rounded text-[9px] font-mono text-white/60">
                              {spec}
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-1 mt-auto">
                          {preset.tags.slice(0, 2).map(tag => (
                            <span 
                              key={tag} 
                              className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-medium tracking-wide ${
                                tag === "Nyvarra Signatures" 
                                  ? "bg-blue-500/20 text-blue-300" 
                                  : "bg-white/5 text-white/40"
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
