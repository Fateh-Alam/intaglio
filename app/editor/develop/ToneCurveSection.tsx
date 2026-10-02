"use client";

import React, { useState } from "react";
import type { CurvePoints } from "../../types/editor";
import { Section } from "../../ui/Section";
import { Segmented } from "../../ui/Controls";
import { CurveCanvas } from "../../ui/CurveCanvas";
import { useEditorState } from "../hooks/useEditorState";
import type { Develop } from "./useDevelop";

type Channel = keyof CurvePoints;

const CHANNELS: ReadonlyArray<{ id: Channel; label: React.ReactNode; color: string; fill: string; hint: string }> = [
  { id: "master", label: "RGB", color: "#f2f2f4", fill: "rgba(255,255,255,0.07)", hint: "Brightness curve for all colors" },
  { id: "red", label: <Dot color="#ff5f57" />, color: "#ff6b63", fill: "rgba(255,95,87,0.12)", hint: "Red channel: up adds red, down adds cyan" },
  { id: "green", label: <Dot color="#3ddc84" />, color: "#45d987", fill: "rgba(61,220,132,0.1)", hint: "Green channel: up adds green, down adds magenta" },
  { id: "blue", label: <Dot color="#5b9bff" />, color: "#6aa5ff", fill: "rgba(91,155,255,0.12)", hint: "Blue channel: up adds blue, down adds yellow" },
];

function Dot({ color }: { color: string }) {
  return <span className="block h-2 w-2 rounded-full" style={{ background: color }} />;
}

interface SectionProps {
  dev: Develop;
  open: boolean;
  onToggle: (solo: boolean) => void;
}

export function ToneCurveSection({ dev, open, onToggle }: SectionProps) {
  const { histogram } = useEditorState();
  const [channel, setChannel] = useState<Channel>("master");
  if (!dev.supports("curvePoints")) return null;
  const curves = dev.values.curvePoints;
  const active = CHANNELS.find((item) => item.id === channel) ?? CHANNELS[0];
  const backdrop = !histogram ? undefined : channel === "master" ? histogram.luma : histogram.rgb[["red", "green", "blue"].indexOf(channel)];

  return (
    <Section title="Tone Curve" open={open} onToggle={onToggle} modified={!dev.isDefault(["curvePoints"])} onReset={() => dev.reset(["curvePoints"], "Reset Tone Curve")}>
      <Segmented value={channel} onChange={setChannel} options={CHANNELS.map(({ id, label, hint }) => ({ id, label, hint }))} className="mb-3" />
      <CurveCanvas
        points={curves[channel]}
        color={active.color}
        histogram={backdrop}
        histogramColor={active.fill}
        onChange={(points) => dev.set("curvePoints", { ...curves, [channel]: points }, "Tone Curve")}
      />
    </Section>
  );
}
