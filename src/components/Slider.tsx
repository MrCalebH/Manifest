'use client';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  icon?: string;
}

export default function Slider({ label, value, onChange, min, max, step, icon }: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-purple-200 flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {label}
        </label>
        <span className="text-sm text-purple-300">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-purple-500 bg-purple-900/50"
      />
    </div>
  );
} 