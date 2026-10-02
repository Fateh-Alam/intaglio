import React from "react";
import { EditorSettings, AdjustmentLayer, MaskLayer } from "../../types/editor";
import { createLocalId } from "../pageTypes";
import { IconPlus, IconTrash, IconLayersIntersect, IconBrush, IconFocusCentered, IconLineDashed, IconSettings } from "@tabler/icons-react";

interface PlateStackPanelProps {
  settings: EditorSettings;
  updateSetting: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
  activePlateId: string | "base";
  setActivePlateId: (id: string | "base") => void;
}

export default function PlateStackPanel({
  settings,
  updateSetting,
  activePlateId,
  setActivePlateId,
}: PlateStackPanelProps) {
  const adjustmentLayers = settings.adjustmentLayers || [];
  const masks = settings.masks || [];

  const addAdjustmentPlate = () => {
    const newPlate: AdjustmentLayer = {
      id: createLocalId(),
      name: `Plate ${adjustmentLayers.length + 1}`,
      maskIds: [],
      opacity: 1,
      blendMode: "normal",
      params: {
        brightness: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        whites: 0,
        blacks: 0,
        temperature: 0,
        tint: 0,
        vibrance: 0,
        dehaze: 0,
        structure: 0,
        sharpness: 0,
        // We leave curvePoints and colorGrading undefined to fallback to flat/neutral if not set
      }
    };
    updateSetting("adjustmentLayers", [...adjustmentLayers, newPlate]);
    setActivePlateId(newPlate.id);
  };

  const removePlate = (id: string) => {
    const layer = adjustmentLayers.find(l => l.id === id);
    if (!layer) return;
    
    const newMasks = masks.filter(m => !layer.maskIds.includes(m.id));
    const newLayers = adjustmentLayers.filter(l => l.id !== id);
    
    updateSetting("masks", newMasks);
    updateSetting("adjustmentLayers", newLayers);
    if (activePlateId === id) setActivePlateId("base");
  };

  const addMaskToPlate = (layerId: string, type: MaskLayer["type"]) => {
    const newMaskId = createLocalId();
    let newMask: MaskLayer;

    switch (type) {
      case "radial":
        newMask = {
          id: newMaskId, name: "Radial Mask", type: "radial", blendMode: "ADD", opacity: 1,
          params: { center: { x: 0.5, y: 0.5 }, radius: 0.5, feather: 0.3, invert: false }
        };
        break;
      case "linear":
        newMask = {
          id: newMaskId, name: "Linear Mask", type: "linear", blendMode: "ADD", opacity: 1,
          params: { position: 0.5, angle: 0, feather: 0.3, invert: false }
        };
        break;
      case "luminosity":
        newMask = {
          id: newMaskId, name: "Luma Mask", type: "luminosity", blendMode: "ADD", opacity: 1,
          params: { target: 0.5, range: 0.2, feather: 0.1 }
        };
        break;
      case "brush":
        newMask = {
          id: newMaskId, name: "Brush Mask", type: "brush", blendMode: "ADD", opacity: 1,
          params: { strokes: [] }
        };
        break;
      case "colorRange":
        newMask = {
          id: newMaskId, name: "Color Range", type: "colorRange", blendMode: "ADD", opacity: 1,
          params: { targetHue: 0, hueWidth: 0.1, targetChroma: 0, chromaRange: 0.1 }
        };
        break;
    }

    const layer = adjustmentLayers.find(l => l.id === layerId);
    if (!layer) return;

    const updatedLayer = { ...layer, maskIds: [...layer.maskIds, newMaskId] };
    const newLayers = adjustmentLayers.map(l => l.id === layerId ? updatedLayer : l);

    updateSetting("masks", [...masks, newMask]);
    updateSetting("adjustmentLayers", newLayers);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-widest text-white uppercase flex items-center">
            <IconLayersIntersect className="w-4 h-4 mr-2 opacity-70" />
            Plate Stack
          </h3>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Nondestructive Pipeline</p>
        </div>
        <button
          onClick={addAdjustmentPlate}
          className="p-1.5 rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
          title="Add Adjustment Plate"
        >
          <IconPlus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2 relative">
        {/* Adjusment Plates (Rendered top-down in UI, meaning they sit ON TOP of Base) */}
        {[...adjustmentLayers].reverse().map((layer) => {
          const isActive = activePlateId === layer.id;
          const layerMasks = masks.filter(m => layer.maskIds.includes(m.id));

          return (
            <div
              key={layer.id}
              className={`rounded border transition-all ${
                isActive 
                  ? "border-[#D6A848] bg-[#D6A848]/5" 
                  : "border-white/10 bg-black/20 hover:border-white/20"
              }`}
            >
              <div 
                className="p-3 flex items-center gap-3 cursor-pointer"
                onClick={() => setActivePlateId(layer.id)}
              >
                <div className="flex-1">
                  <div className={`text-xs font-medium tracking-wide ${isActive ? "text-[#D6A848]" : "text-white"}`}>
                    {layer.name}
                  </div>
                  <div className="text-[10px] text-white/40 tracking-wider mt-0.5 flex gap-2">
                    <span>Opacity: {Math.round(layer.opacity * 100)}%</span>
                    {layerMasks.length > 0 && <span>• {layerMasks.length} Mask(s)</span>}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: isActive ? 1 : undefined }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removePlate(layer.id); }}
                    className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-red-400"
                    title="Delete Plate"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded Area for active plate */}
              {isActive && (
                <div className="p-3 pt-0 border-t border-white/5 mt-2 space-y-3">
                  <div className="flex gap-2">
                    <button onClick={() => addMaskToPlate(layer.id, "radial")} className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] flex justify-center text-white/70" title="Radial Mask"><IconFocusCentered className="w-3.5 h-3.5"/></button>
                    <button onClick={() => addMaskToPlate(layer.id, "linear")} className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] flex justify-center text-white/70" title="Linear Mask"><IconLineDashed className="w-3.5 h-3.5"/></button>
                    <button onClick={() => addMaskToPlate(layer.id, "brush")} className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] flex justify-center text-white/70" title="Brush Mask"><IconBrush className="w-3.5 h-3.5"/></button>
                  </div>
                  
                  {layerMasks.map(mask => (
                    <div key={mask.id} className="text-[10px] text-white/50 flex items-center gap-2 bg-black/40 p-1.5 rounded">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
                      {mask.name}
                    </div>
                  ))}
                  
                  <div className="text-[10px] text-amber-500/70 text-center uppercase tracking-widest pt-2">
                    Edit via Development Tab
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Base Plate */}
        <div
          onClick={() => setActivePlateId("base")}
          className={`rounded border p-3 flex items-center gap-3 cursor-pointer transition-all ${
            activePlateId === "base" 
              ? "border-[#D6A848] bg-[#D6A848]/5" 
              : "border-white/10 bg-[#1c1c1e] hover:border-white/20"
          }`}
        >
          <div className="w-8 h-8 rounded bg-gradient-to-br from-gray-700 to-black border border-white/10 flex items-center justify-center shrink-0">
             <IconSettings className={`w-4 h-4 ${activePlateId === "base" ? "text-[#D6A848]" : "text-white/50"}`} />
          </div>
          <div>
            <div className={`text-xs font-medium tracking-wide ${activePlateId === "base" ? "text-[#D6A848]" : "text-white"}`}>
              Base Emulsion
            </div>
            <div className="text-[10px] text-white/40 tracking-wider mt-0.5">
              Global Process & Film Stock
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
