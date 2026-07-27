import React, { useState } from "react";
import { EditorSettings, AdjustmentLayer, MaskLayer } from "../../types/editor";
import { createLocalId } from "../pageTypes";
import Slider from "../../components/Slider";
import ControlGroup from "../../components/ControlGroup";
import { IconPlus, IconTrash, IconEye, IconEyeOff, IconChevronDown, IconChevronRight, IconBrush, IconFocusCentered, IconLineDashed, IconSun } from "@tabler/icons-react";

interface AdjustmentLayersPanelProps {
  settings: EditorSettings;
  updateSetting: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
  setBrushMaskActive: (active: boolean) => void;
  setBrushErasing: (erasing: boolean) => void;
  brushMaskActive: boolean;
  brushErasing: boolean;
  brushSize: number;
  setBrushSize: (v: number) => void;
  brushFeather: number;
  setBrushFeather: (v: number) => void;
  activeMaskId: string | null;
  setActiveMaskId: (id: string | null) => void;
}

export default function AdjustmentLayersPanel({
  settings,
  updateSetting,
  setBrushMaskActive,
  setBrushErasing,
  brushMaskActive,
  brushErasing,
  brushSize,
  setBrushSize,
  brushFeather,
  setBrushFeather,
  activeMaskId,
  setActiveMaskId,
}: AdjustmentLayersPanelProps) {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const adjustmentLayers = settings.adjustmentLayers || [];
  const masks = settings.masks || [];

  const addAdjustmentLayer = () => {
    const newLayer: AdjustmentLayer = {
      id: createLocalId(),
      name: `Adjustment ${adjustmentLayers.length + 1}`,
      maskIds: [],
      opacity: 1,
      blendMode: "normal",
      params: {
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        temperature: 0,
        tint: 0,
        saturation: 0,
        clarity: 0,
      }
    };
    updateSetting("adjustmentLayers", [...adjustmentLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const removeAdjustmentLayer = (id: string) => {
    const layer = adjustmentLayers.find(l => l.id === id);
    if (!layer) return;
    
    // Remove layer's masks
    const newMasks = masks.filter(m => !layer.maskIds.includes(m.id));
    const newLayers = adjustmentLayers.filter(l => l.id !== id);
    
    updateSetting("masks", newMasks);
    updateSetting("adjustmentLayers", newLayers);
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const updateLayerParams = (layerId: string, param: keyof AdjustmentLayer["params"], value: number) => {
    const newLayers = adjustmentLayers.map(l => {
      if (l.id === layerId) {
        return { ...l, params: { ...l.params, [param]: value } };
      }
      return l;
    });
    updateSetting("adjustmentLayers", newLayers);
  };

  const addMaskToLayer = (layerId: string, type: MaskLayer["type"]) => {
    const newMaskId = createLocalId();
    let newMask: MaskLayer = {
      id: newMaskId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Mask`,
      type,
      blendMode: "ADD",
      opacity: 1,
      params: {} as any
    };

    switch (type) {
      case "radial":
        newMask.params = { center: { x: 0.5, y: 0.5 }, radius: 0.5, feather: 0.3, invert: false };
        break;
      case "linear":
        newMask.params = { angle: 0, position: 0.5, feather: 0.3, invert: false };
        break;
      case "luminosity":
        newMask.params = { target: 0.5, range: 0.3, feather: 0.1 };
        break;
      case "colorRange":
        newMask.params = { targetHue: 0, hueWidth: 0.1, targetChroma: 0.5, chromaRange: 0.2 };
        break;
      case "brush":
        newMask.params = { strokes: [] };
        break;
    }

    const newMasks = [...masks, newMask];
    const newLayers = adjustmentLayers.map(l => {
      if (l.id === layerId) {
        return { ...l, maskIds: [...l.maskIds, newMaskId] };
      }
      return l;
    });

    updateSetting("masks", newMasks);
    updateSetting("adjustmentLayers", newLayers);
    setActiveMaskId(newMaskId);
    if (type === "brush") {
      setBrushMaskActive(true);
      setBrushErasing(false);
    }
  };

  const updateMaskParams = (maskId: string, params: any) => {
    const newMasks = masks.map(m => {
      if (m.id === maskId) {
        return { ...m, params: { ...m.params, ...params } };
      }
      return m;
    });
    updateSetting("masks", newMasks);
  };

  const removeMask = (layerId: string, maskId: string) => {
    const newMasks = masks.filter(m => m.id !== maskId);
    const newLayers = adjustmentLayers.map(l => {
      if (l.id === layerId) {
        return { ...l, maskIds: l.maskIds.filter(id => id !== maskId) };
      }
      return l;
    });
    updateSetting("masks", newMasks);
    updateSetting("adjustmentLayers", newLayers);
    if (activeMaskId === maskId) setActiveMaskId(null);
  };

  const selectedLayer = adjustmentLayers.find(l => l.id === selectedLayerId);

  return (
    <div className="space-y-4">
      {/* Layers List */}
      <ControlGroup title="Adjustment Layers">
        <div className="space-y-2 mb-4">
          {adjustmentLayers.map(layer => (
            <div key={layer.id} className="flex flex-col border border-white/10 rounded overflow-hidden">
              <div 
                className={`flex items-center justify-between p-2 cursor-pointer transition ${selectedLayerId === layer.id ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}
                onClick={() => setSelectedLayerId(layer.id)}
              >
                <span className="text-xs font-medium">{layer.name}</span>
                <IconTrash className="intaglio-icon opacity-50 hover:opacity-100 hover:text-red-400 cursor-pointer transition" onClick={(e) => { e.stopPropagation(); removeAdjustmentLayer(layer.id); }}
                />
              </div>
            </div>
          ))}
          {adjustmentLayers.length === 0 && (
            <div className="text-center py-4 text-white/30 text-xs italic">
              No adjustment layers
            </div>
          )}
        </div>
        <button 
          onClick={addAdjustmentLayer}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium bg-white/10 hover:bg-white/15 rounded transition text-white/80"
        >
          <IconPlus className="intaglio-icon"/> Add New Layer
        </button>
      </ControlGroup>

      {/* Selected Layer Details */}
      {selectedLayer && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
          <ControlGroup title={`${selectedLayer.name} - Masks`}>
            {/* Masks List */}
            <div className="space-y-2 mb-4">
              {selectedLayer.maskIds.map(maskId => {
                const mask = masks.find(m => m.id === maskId);
                if (!mask) return null;
                const isActive = activeMaskId === maskId;
                
                return (
                  <div key={maskId} className="border border-white/10 rounded overflow-hidden">
                    <div 
                      className={`flex items-center justify-between p-2 cursor-pointer transition ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-black/20 text-white/60 hover:bg-white/5'}`}
                      onClick={() => setActiveMaskId(isActive ? null : maskId)}
                    >
                      <div className="flex items-center gap-2">
                        {mask.type === "brush" && <IconBrush className="intaglio-icon"/>}
                        {mask.type === "radial" && <IconFocusCentered className="intaglio-icon"/>}
                        {mask.type === "linear" && <IconLineDashed className="intaglio-icon"/>}
                        {mask.type === "luminosity" && <IconSun className="intaglio-icon"/>}
                        <span className="text-[11px]">{mask.name}</span>
                      </div>
                      <IconTrash className="intaglio-icon opacity-50 hover:opacity-100 hover:text-red-400 cursor-pointer transition" onClick={(e) => { e.stopPropagation(); removeMask(selectedLayer.id, maskId); }}
                      />
                    </div>
                    
                    {/* Mask Specific Controls */}
                    {isActive && (
                      <div className="p-3 bg-black/40 border-t border-white/5 space-y-3">
                        {mask.type === "radial" && (
                          <>
                            <Slider icon={<IconSun className="intaglio-icon"/>} label="Center X" value={mask.params.center.x} min={0} max={1} onChange={v => updateMaskParams(maskId, { center: { ...mask.params.center, x: v } })} />
                            <Slider icon={<IconSun className="intaglio-icon"/>} label="Center Y" value={mask.params.center.y} min={0} max={1} onChange={v => updateMaskParams(maskId, { center: { ...mask.params.center, y: v } })} />
                            <Slider icon={<IconSun className="intaglio-icon"/>} label="Radius" value={mask.params.radius} min={0} max={1} onChange={v => updateMaskParams(maskId, { radius: v })} />
                            <Slider icon={<IconSun className="intaglio-icon"/>} label="Feather" value={mask.params.feather} min={0} max={1} onChange={v => updateMaskParams(maskId, { feather: v })} />
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] font-mono tracking-widest text-white/60">Invert</span>
                              <input type="checkbox" checked={mask.params.invert} onChange={e => updateMaskParams(maskId, { invert: e.target.checked })} />
                            </div>
                          </>
                        )}
                        {mask.type === "linear" && (
                          <>
                            <Slider icon={<IconSun className="intaglio-icon"/>} label="Angle" value={mask.params.angle} min={0} max={1} onChange={v => updateMaskParams(maskId, { angle: v })} />
                            <Slider icon={<IconSun className="intaglio-icon"/>} label="Position" value={mask.params.position} min={0} max={1} onChange={v => updateMaskParams(maskId, { position: v })} />
                            <Slider icon={<IconSun className="intaglio-icon"/>} label="Feather" value={mask.params.feather} min={0} max={1} onChange={v => updateMaskParams(maskId, { feather: v })} />
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] font-mono tracking-widest text-white/60">Invert</span>
                              <input type="checkbox" checked={mask.params.invert} onChange={e => updateMaskParams(maskId, { invert: e.target.checked })} />
                            </div>
                          </>
                        )}
                        {mask.type === "luminosity" && (
                          <>
                            <Slider icon={<IconSun className="intaglio-icon"/>} label="Target" value={mask.params.target} min={0} max={1} onChange={v => updateMaskParams(maskId, { target: v })} />
                            <Slider icon={<IconSun className="intaglio-icon"/>} label="Range" value={mask.params.range} min={0} max={1} onChange={v => updateMaskParams(maskId, { range: v })} />
                            <Slider icon={<IconSun className="intaglio-icon"/>} label="Feather" value={mask.params.feather} min={0} max={1} onChange={v => updateMaskParams(maskId, { feather: v })} />
                          </>
                        )}
                        {mask.type === "brush" && (
                          <>
                            <div className="flex gap-2 mb-2">
                              <button 
                                className={`flex-1 py-1.5 text-[10px] rounded ${!brushErasing ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/10 text-white/50'}`}
                                onClick={() => { setBrushErasing(false); setBrushMaskActive(true); }}
                              >Paint</button>
                              <button 
                                className={`flex-1 py-1.5 text-[10px] rounded ${brushErasing ? 'bg-red-500/30 text-red-300' : 'bg-white/10 text-white/50'}`}
                                onClick={() => { setBrushErasing(true); setBrushMaskActive(true); }}
                              >Erase</button>
                            </div>
                            <Slider icon={<IconSun className="intaglio-icon"/>} label="Size" value={brushSize} min={0.1} max={1} onChange={setBrushSize} />
                            <Slider icon={<IconSun className="intaglio-icon"/>} label="Feather" value={brushFeather} min={0} max={1} onChange={setBrushFeather} />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Add Mask Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addMaskToLayer(selectedLayer.id, "radial")} className="py-1.5 text-[10px] bg-white/5 hover:bg-white/10 rounded text-white/70 transition">+ Radial</button>
              <button onClick={() => addMaskToLayer(selectedLayer.id, "linear")} className="py-1.5 text-[10px] bg-white/5 hover:bg-white/10 rounded text-white/70 transition">+ Linear</button>
              <button onClick={() => addMaskToLayer(selectedLayer.id, "luminosity")} className="py-1.5 text-[10px] bg-white/5 hover:bg-white/10 rounded text-white/70 transition">+ Luma</button>
              <button onClick={() => addMaskToLayer(selectedLayer.id, "brush")} className="py-1.5 text-[10px] bg-white/5 hover:bg-white/10 rounded text-white/70 transition">+ Brush</button>
            </div>
          </ControlGroup>

          <ControlGroup title={`${selectedLayer.name} - Adjustments`}>
            <Slider icon={<IconSun className="intaglio-icon"/>} label="Exposure" value={selectedLayer.params.exposure} min={-2} max={2} onChange={v => updateLayerParams(selectedLayer.id, "exposure", v)} />
            <Slider icon={<IconSun className="intaglio-icon"/>} label="Contrast" value={selectedLayer.params.contrast} min={-1} max={1} onChange={v => updateLayerParams(selectedLayer.id, "contrast", v)} />
            <Slider icon={<IconSun className="intaglio-icon"/>} label="Highlights" value={selectedLayer.params.highlights} min={-1} max={1} onChange={v => updateLayerParams(selectedLayer.id, "highlights", v)} />
            <Slider icon={<IconSun className="intaglio-icon"/>} label="Shadows" value={selectedLayer.params.shadows} min={-1} max={1} onChange={v => updateLayerParams(selectedLayer.id, "shadows", v)} />
            <Slider icon={<IconSun className="intaglio-icon"/>} label="Temperature" value={selectedLayer.params.temperature} min={-1} max={1} onChange={v => updateLayerParams(selectedLayer.id, "temperature", v)} />
            <Slider icon={<IconSun className="intaglio-icon"/>} label="Tint" value={selectedLayer.params.tint} min={-1} max={1} onChange={v => updateLayerParams(selectedLayer.id, "tint", v)} />
            <Slider icon={<IconSun className="intaglio-icon"/>} label="Saturation" value={selectedLayer.params.saturation} min={-1} max={1} onChange={v => updateLayerParams(selectedLayer.id, "saturation", v)} />
            <Slider icon={<IconSun className="intaglio-icon"/>} label="Clarity" value={selectedLayer.params.clarity} min={-1} max={1} onChange={v => updateLayerParams(selectedLayer.id, "clarity", v)} />
          </ControlGroup>
        </div>
      )}
    </div>
  );
}
