import type { ChangeEventHandler, SyntheticEvent } from "react";
import React from "react";

export function log(...args: any[]) {
  console.log(`🖼️`, ...args);
}

export function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute w-full h-full top-0 left-0 grid items-center justify-center bg-neutral-100/80 text-6xl rounded">
      {children}
    </div>
  );
}

export function Slider({
  disabled,
  id,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  disabled?: boolean;
  id: string;
  format: (d: number) => string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex gap-x-4">
      <input
        className="block enabled:cursor-pointer"
        type="range"
        disabled={disabled}
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
      />
      <label htmlFor={id} className={`text-xl ${disabled ? `opacity-20` : ``}`}>
        {Number.isFinite(value) && format(+value!)}
      </label>
    </div>
  );
}
