import React, { useState } from 'react';
import { EditorSettings, EditorSettingKey } from '../../types/editor';
import Slider from '../../components/Slider';
import ControlGroup from '../../components/ControlGroup';
import { IconPalette, IconSun, IconCircleFilled } from '@tabler/icons-react';

interface ColorMixerUIProps {
  settings: EditorSettings;
  updateSetting: (key: EditorSettingKey, value: any) => void;
}

const CHANNELS = [
  { id: 'Red', color: 'text-red-500', hex: '#ef4444' },
  { id: 'Orange', color: 'text-orange-500', hex: '#f97316' },
  { id: 'Yellow', color: 'text-yellow-500', hex: '#eab308' },
  { id: 'Green', color: 'text-green-500', hex: '#22c55e' },
  { id: 'Aqua', color: 'text-teal-400', hex: '#2dd4bf' },
  { id: 'Blue', color: 'text-blue-500', hex: '#3b82f6' },
  { id: 'Purple', color: 'text-purple-500', hex: '#a855f7' },
  { id: 'Magenta', color: 'text-pink-500', hex: '#ec4899' },
] as const;

export default function ColorMixerUI({ settings, updateSetting }: ColorMixerUIProps) {
  const [activeChannel, setActiveChannel] = useState<typeof CHANNELS[number]['id']>('Red');

  const activeColor = CHANNELS.find((c) => c.id === activeChannel);

  // Generate the state keys for the active channel (e.g., hslRedHue)
  const hueKey = `hsl${activeChannel}Hue` as EditorSettingKey;
  const satKey = `hsl${activeChannel}Sat` as EditorSettingKey;
  const lumKey = `hsl${activeChannel}Lum` as EditorSettingKey;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col items-center space-y-4">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
          Select Channel
        </p>
        <div className="flex space-x-2 bg-black/40 p-2 rounded-2xl border border-white/5 shadow-inner backdrop-blur-md">
          {CHANNELS.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 outline-none
                ${activeChannel === channel.id ? 'scale-110 shadow-lg ring-2 ring-white/20 z-10' : 'hover:scale-105 opacity-60 hover:opacity-100'}
              `}
              style={{ backgroundColor: channel.hex }}
              title={channel.id}
            >
              {activeChannel === channel.id && (
                <div className="absolute inset-0 rounded-full border-2 border-white mix-blend-overlay"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      <ControlGroup
        title={`${activeChannel} Adjustments`}
        icon={<IconCircleFilled className={`intaglio-icon ${activeColor?.color}`} />}
      >
        <div className="space-y-4 mt-2">
          <Slider
            label="Hue"
            value={(settings[hueKey] as number) || 0}
            min={-1}
            max={1}
            onChange={(v) => updateSetting(hueKey, v)}
            icon={<IconPalette className="intaglio-icon" />}
            accentColor="accent-white"
          />
          <Slider
            label="Saturation"
            value={(settings[satKey] as number) || 0}
            min={-1}
            max={1}
            onChange={(v) => updateSetting(satKey, v)}
            icon={<IconPalette className="intaglio-icon" />}
            accentColor="accent-white"
          />
          <Slider
            label="Luminance"
            value={(settings[lumKey] as number) || 0}
            min={-1}
            max={1}
            onChange={(v) => updateSetting(lumKey, v)}
            icon={<IconSun className="intaglio-icon" />}
            accentColor="accent-white"
          />
        </div>
      </ControlGroup>
      
      <div className="mt-6 pt-4 border-t border-white/5">
         <Slider
            label="Skin Protection"
            value={settings.skinProtect || 0}
            min={0}
            max={1}
            onChange={(v) => updateSetting("skinProtect", v)}
            icon={<IconCircleFilled className="intaglio-icon text-[#ffb6a3]" />}
            accentColor="accent-[#ffb6a3]"
         />
         <p className="text-[10px] text-gray-500 mt-2 text-center">Protects skin tones from hue/saturation shifts.</p>
      </div>
    </div>
  );
}
