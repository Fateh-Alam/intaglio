import React from "react";
import { IntaglioRecipe } from "../../types/recipe";
import { PRESETS } from "../../lib/presets";
import { IconWand, IconSettings } from "@tabler/icons-react";

interface ProcessEnginePanelProps {
  onApplyProcess: (recipe: IntaglioRecipe) => void;
  activeProcessId?: string;
}

export default function ProcessEnginePanel({
  onApplyProcess,
  activeProcessId,
}: ProcessEnginePanelProps) {
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-widest text-white uppercase mb-2 flex items-center">
          <IconWand className="w-4 h-4 mr-2 opacity-70" />
          Photographic Processes
        </h3>
        <p className="text-xs text-gray-400">
          Load a complete darkroom sequence (Development, Negative, Colour Head, Print, Optics, and Texture).
        </p>
      </div>

      <div className="space-y-3">
        {PRESETS.map((process) => {
          const isActive = activeProcessId === process.id;
          return (
            <div
              key={process.id}
              onClick={() => onApplyProcess(process)}
              className={`group cursor-pointer rounded-lg border p-4 transition-all duration-200 ${
                isActive
                  ? "border-[#D6A848] bg-[#D6A848]/10"
                  : "border-white/10 bg-[#1c1c1e] hover:border-white/30 hover:bg-[#2c2c2e]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4
                  className={`text-sm font-medium ${
                    isActive ? "text-[#D6A848]" : "text-white group-hover:text-white"
                  }`}
                >
                  {process.name}
                </h4>
                {isActive && <IconSettings className="w-4 h-4 text-[#D6A848]" />}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {process.description}
              </p>
              
              {/* Stages Summary */}
              <div className="mt-3 flex flex-wrap gap-2">
                {process.settings.film?.filmEmulation && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 bg-white/5 rounded text-gray-300">
                    Film: {process.settings.film.filmEmulation.replace(/_/g, " ")}
                  </span>
                )}
                {process.settings.optics?.halation && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 bg-white/5 rounded text-gray-300">
                    Halation
                  </span>
                )}
                {process.settings.texture?.grain && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 bg-white/5 rounded text-gray-300">
                    Grain
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
