"use client";

import React from "react";
import type { EditorSettings } from "../../types/editor";
import { useEditorState } from "../hooks/useEditorState";
import { DEFAULT_SETTINGS } from "../pageTypes";
import { PLATE_NEUTRAL, isPlateParam, plateRenderSettings } from "../render/plateParams";
import { DevSlider, type DevSliderProps } from "../../ui/DevSlider";

export type DevelopKey = keyof EditorSettings;

/**
 * Develop controls edit either the whole photo or the selected local
 * adjustment, exactly like Lightroom masks reuse the same sliders.
 */
export function useDevelop() {
  const { settings, activePlateId, updateSettings, updatePlateParams } = useEditorState();
  const plate = activePlateId === "base" ? null : settings.adjustmentLayers.find((layer) => layer.id === activePlateId) ?? null;
  const values: EditorSettings = plate ? plateRenderSettings(settings, plate.params) : settings;
  const defaults: EditorSettings = plate ? { ...DEFAULT_SETTINGS, ...PLATE_NEUTRAL } : DEFAULT_SETTINGS;

  const patch = (changes: Partial<EditorSettings>, label: string) => {
    if (plate) updatePlateParams(plate.id, changes, label);
    else updateSettings(changes, label);
  };

  const isDefault = (keys: readonly DevelopKey[]) =>
    keys.every((key) => JSON.stringify(values[key]) === JSON.stringify(defaults[key]));

  const reset = (keys: readonly DevelopKey[], label: string) => {
    const changes: Partial<EditorSettings> = {};
    for (const key of keys) (changes as Record<string, unknown>)[key] = defaults[key];
    patch(changes, label);
  };

  return {
    values,
    defaults,
    local: plate !== null,
    plateName: plate?.name ?? null,
    supports: (key: DevelopKey) => !plate || isPlateParam(key),
    set: <K extends DevelopKey>(key: K, value: EditorSettings[K], label: string) => patch({ [key]: value } as Partial<EditorSettings>, label),
    patch,
    isDefault,
    reset,
  };
}

export type Develop = ReturnType<typeof useDevelop>;

type ParamProps = Omit<DevSliderProps, "value" | "onChange"> & { dev: Develop; k: DevelopKey };

/** A slider bound to one numeric develop setting. Hidden when the active local adjustment can't use it. */
export function Param({ dev, k, label, defaultValue, ...rest }: ParamProps) {
  if (!dev.supports(k)) return null;
  return (
    <DevSlider
      label={label}
      value={Number(dev.values[k] ?? 0)}
      defaultValue={defaultValue ?? Number(dev.defaults[k] ?? 0)}
      onChange={(value) => dev.set(k, value as never, label)}
      {...rest}
    />
  );
}
