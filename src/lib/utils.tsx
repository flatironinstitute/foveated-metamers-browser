import type { ChangeEventHandler, SyntheticEvent } from "react";

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
  debug
}: {
  disabled?: boolean;
  id: string;
  min: number;
  max: number;
  step: HTMLInputElement["step"];
  value?: number;
  onChange?: ChangeEventHandler<HTMLInputElement>
  format: (d: number) => string;
  debug?: boolean;
}) {
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
        {Number.isFinite(value) && format(value!)}
      </label>
    </div>
  );
}