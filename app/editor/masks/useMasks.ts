"use client";

import type { AdjustmentLayer, EditorSettings, MaskLayer } from "../../types/editor";
import { useEditorState } from "../hooks/useEditorState";
import { useShell } from "../shell/useShell";
import { createMaskComponent, MASK_KIND_LABEL, type MaskKind } from "../../lib/maskGeometry";

let plateCounter = 0;

/** Mask (adjustment plate) operations. Every action is one undo step. */
export function useMasks() {
  const { settings, activePlateId, setActivePlateId, updateSettings, setBrushErasing } = useEditorState();
  const shell = useShell();
  const plates = settings.adjustmentLayers;
  const activePlate = plates.find((plate) => plate.id === activePlateId) ?? null;
  const componentsOf = (plate: AdjustmentLayer) => plate.maskIds.map((id) => settings.masks.find((mask) => mask.id === id)).filter((mask): mask is MaskLayer => Boolean(mask));
  const activeComponents = activePlate ? componentsOf(activePlate) : [];
  const selectedComponent = activeComponents.find((mask) => mask.id === shell.selectedComponentId) ?? activeComponents[0] ?? null;

  const commit = (patch: Partial<EditorSettings>, label: string) => updateSettings(patch, label);
  const setBrushToPaint = (kind: MaskKind) => { if (kind === "brush") setBrushErasing(false); };

  const createMask = (kind: MaskKind) => {
    const component = createMaskComponent(kind);
    const names = new Set(plates.map((plate) => plate.name));
    let number = 1;
    while (names.has(`Mask ${number}`)) number += 1;
    const plate: AdjustmentLayer = {
      id: `plate-${Date.now().toString(36)}-${(plateCounter++).toString(36)}`,
      name: `Mask ${number}`,
      maskIds: [component.id],
      opacity: 1,
      blendMode: "normal",
      params: {},
    };
    commit({ adjustmentLayers: [...plates, plate], masks: [...settings.masks, component] }, `New ${MASK_KIND_LABEL[kind]} Mask`);
    setActivePlateId(plate.id);
    shell.setSelectedComponentId(component.id);
    shell.setPicking(null);
    setBrushToPaint(kind);
    shell.setShowMaskOverlay(true);
  };

  const addComponent = (plateId: string, kind: MaskKind, mode: MaskLayer["blendMode"]) => {
    const component = createMaskComponent(kind, mode);
    commit({
      masks: [...settings.masks, component],
      adjustmentLayers: plates.map((plate) => plate.id === plateId ? { ...plate, maskIds: [...plate.maskIds, component.id] } : plate),
    }, `${mode === "ADD" ? "Add" : mode === "SUBTRACT" ? "Subtract" : "Intersect"} ${MASK_KIND_LABEL[kind]}`);
    setActivePlateId(plateId);
    shell.setSelectedComponentId(component.id);
    shell.setPicking(null);
    setBrushToPaint(kind);
    shell.setShowMaskOverlay(true);
  };

  const updateComponent = (id: string, update: (mask: MaskLayer) => MaskLayer, label: string) => {
    updateSettings((previous) => ({ masks: previous.masks.map((mask) => mask.id === id ? update(mask) : mask) }), label);
  };

  const removeComponent = (plateId: string, id: string) => {
    const plate = plates.find((item) => item.id === plateId);
    if (!plate) return;
    if (plate.maskIds.length <= 1) return removePlate(plateId);
    commit({
      masks: settings.masks.filter((mask) => mask.id !== id || plates.some((other) => other.id !== plateId && other.maskIds.includes(id))),
      adjustmentLayers: plates.map((item) => item.id === plateId ? { ...item, maskIds: item.maskIds.filter((maskId) => maskId !== id) } : item),
    }, "Remove Mask Part");
    if (selectedComponent?.id === id) {
      shell.setSelectedComponentId(plate.maskIds.find((maskId) => maskId !== id) ?? null);
      shell.setPicking(null);
    }
  };

  const removePlate = (plateId: string) => {
    const plate = plates.find((item) => item.id === plateId);
    if (!plate) return;
    const remaining = plates.filter((item) => item.id !== plateId);
    commit({
      adjustmentLayers: remaining,
      masks: settings.masks.filter((mask) => !plate.maskIds.includes(mask.id) || remaining.some((other) => other.maskIds.includes(mask.id))),
    }, `Delete ${plate.name}`);
    if (activePlateId === plateId) {
      const next = remaining.at(-1);
      setActivePlateId(next?.id ?? "base");
      shell.setSelectedComponentId(next?.maskIds[0] ?? null);
      shell.setPicking(null);
    }
  };

  const updatePlate = (plateId: string, patch: Partial<AdjustmentLayer>, label: string) => {
    commit({ adjustmentLayers: plates.map((plate) => plate.id === plateId ? { ...plate, ...patch } : plate) }, label);
  };

  const selectPlate = (plateId: string) => {
    if (plateId === activePlateId) return;
    setActivePlateId(plateId);
    const plate = plates.find((item) => item.id === plateId);
    shell.setSelectedComponentId(plate?.maskIds[0] ?? null);
    shell.setPicking(null);
  };

  return {
    plates,
    activePlate,
    selectedComponent,
    componentsOf,
    createMask,
    addComponent,
    updateComponent,
    removeComponent,
    removePlate,
    updatePlate,
    selectPlate,
    selectComponent: (plateId: string, id: string) => {
      setActivePlateId(plateId);
      shell.setSelectedComponentId(id);
      shell.setPicking(null);
    },
  };
}
