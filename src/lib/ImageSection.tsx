"use client";

import type { SyntheticEvent } from "react";
import type { StudyImage, Position, Dimensions } from "./types";
import type { AppState, MagnifierState } from "./app_state";
import { useEffect, useContext, useState, useRef } from "react";
import * as d3 from "./d3";
import { AppContext, DATA_URL_BASE, log } from "./app_state";
import { Overlay } from "./utils";

const GAMMA_FILTER_ID = `gamma-adjustment`;

export function ImageMeta() {
  const context = useContext(AppContext);
  const selected_image = context.selected_image;
  return (
    <ul className="leading-6 mt-4 text-base text-gamma-900 tracking-wide truncate">
      <li>
        <span className="mr-1 font-semibold">Model:</span>
        <span className="mr-3" id="model_name">
          {selected_image?.model_name ?? "-"}
        </span>
      </li>
      <li>
        <span className="mr-1 font-semibold">Target Image:</span>
        <span className="mr-3" id="target_image">
          {selected_image?.target_image ?? "-"}
        </span>
      </li>
      <li>
        <span className="mr-1 font-semibold">Scaling Value</span>
        <span className="mr-3" id="scaling">
          {selected_image?.scaling ?? "-"}
        </span>
      </li>
      <li>
        <span className="mr-1 font-semibold">File Path</span>
        <span className="mr-3" id="scaling">
          {selected_image?.file ?? "-"}
        </span>
      </li>
    </ul>
  );
}

function BigCheckbox({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  id: string;
  label: string;
}) {
  return (
    <div className="flex gap-x-2">
      <input
        type="checkbox"
        id={id}
        className="h-7 w-7"
        checked={checked}
        onChange={onChange}
      />
      <label className="text-xl" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}

function Slider({
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
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (e: SyntheticEvent<HTMLInputElement>) => void;
  format: (d: number) => string;
}) {
  return (
    <div className="flex gap-x-4">
      <input
        className="block"
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
        {format(value)}
      </label>
    </div>
  );
}

function GammaForm() {
  const context = useContext(AppContext);
  const gamma_enabled = context.use_gamma.value;

  return (
    <div className="flex flex-col gap-y-4 w-[300px]">
      <BigCheckbox
        id="use-gamma"
        label="Gamma Correction"
        checked={gamma_enabled}
        onChange={() => context.use_gamma.set((d) => !d)}
      />
      <Slider
        disabled={!gamma_enabled}
        id="gamma-value"
        min={0.1}
        max={10}
        step={0.1}
        value={context.gamma_exponent.value}
        onChange={(e) => {
          const element = e.target as HTMLInputElement;
          context.gamma_exponent.set(parseFloat(element.value));
        }}
        format={d3.format(`.1f`)}
      />
    </div>
  );
}

function ZoomForm() {
  const context = useContext(AppContext);
  const zoom_enabled = context.magnifier.value.active;

  return (
    <div className="flex flex-col gap-y-4 w-[300px]">
      <BigCheckbox
        id="use-zoom"
        label="Zoom"
        checked={zoom_enabled}
        onChange={() =>
          context.magnifier.set((d) => ({ ...d, active: !d.active }))
        }
      />
      <Slider
        disabled={!zoom_enabled}
        id="zoom-multiplier"
        min={1}
        max={4}
        step={1}
        value={context.magnifier.value.zoom_multiplier}
        onChange={(e) => {
          const element = e.target as HTMLInputElement;
          context.magnifier.set((state) => ({
            ...state,
            zoom_multiplier: parseFloat(element.value),
          }));
        }}
        format={d3.format(`.0f`)}
      />
    </div>
  );
}

export function ImageTools() {
  return (
    <>
      <div className="h-5"></div>
      <div className="flex flex-col gap-y-5">
        <GammaForm />
        <ZoomForm />
      </div>
      <div className="h-5"></div>
    </>
  );
}

function useImageSrc(type: "natural" | "synthesized") {
  const context = useContext(AppContext);
  const context_key: keyof AppState =
    type === "natural" ? "selected_natural_image" : "selected_image";
  const image = context[context_key] as StudyImage;
  if (!image) return undefined;
  const path = image?.file;
  const src = `${DATA_URL_BASE}${path}`;
  return src;
}

function get_magnifier_size(state: MagnifierState): Dimensions | null {
  const view = state.viewport_size;
  const nat = state.natural_size;
  const mult = state.zoom_multiplier;
  // log(`MagnifyingGlass`, { view, nat, mult });
  if (!view) return null;
  if (!nat) return null;
  return {
    width: ((view.width / nat.width) * view.width) / mult,
    height: ((view.height / nat.height) * view.height) / mult,
  };
}

function clamp(x: number, min: number, max: number) {
  return Math.min(Math.max(x, min), max);
}

function set_magnifier_center(
  state: MagnifierState,
  dragged: Position
): MagnifierState {
  const { viewport_size } = state;
  const size = get_magnifier_size(state);
  if (!viewport_size) return state;
  if (!size) return state;
  const new_center = {
    x: dragged.x,
    y: dragged.y,
  };
  const new_center_x = clamp(
    new_center.x,
    size.width / 2,
    viewport_size.width - size.width / 2
  );
  const new_center_y = clamp(
    new_center.y,
    size.height / 2,
    viewport_size.height - size.height / 2
  );
  return {
    ...state,
    center: { x: new_center_x, y: new_center_y },
  };
}

function MagnifyingGlass() {
  const context = useContext(AppContext);

  const magnifier_state = context.magnifier.value;

  const size = get_magnifier_size(magnifier_state);
  const center = magnifier_state.center;

  const ref = useRef<HTMLDivElement>(null);

  // We need to keep track of the center position in a ref, because
  // the center position is updated in the drag handler, and we
  // don't want to trigger a re-render when the center position
  // changes.
  const center_ref = useRef<Position>(magnifier_state.center);
  useEffect(() => {
    center_ref.current = magnifier_state.center;
  }, [magnifier_state.center]);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current as Element;

    function on_drag(event: any) {
      log(`onDrag`, event);
      context.magnifier.set((d) =>
        set_magnifier_center(d, { x: event.x, y: event.y })
      );
    }

    const drag = d3
      .drag()
      .subject(() => center_ref.current)
      .on("drag", on_drag);

    const selection = d3.select(element);
    drag(selection);
    return () => {};
  }, [ref, ref.current]);

  if (!size) return null;

  return (
    <div
      ref={ref}
      className="absolute outline outline-2 outline-red-500 cursor-move"
      style={{
        top: center.y - size.height / 2,
        left: center.x - size.width / 2,
        width: size.width,
        height: size.height,
      }}
    ></div>
  );
}

function useSizeReporter({
  measure,
  image_ref,
}: {
  measure?: boolean;
  image_ref: React.RefObject<HTMLImageElement>;
}) {
  const context = useContext(AppContext);
  // Get the image viewport size, maybe
  useEffect(() => {
    log(`useSizeReporter`, {
      measure,
      image_ref,
      current: image_ref.current,
    });
    if (!measure) return;
    if (!image_ref.current) return;
    const element = image_ref.current;
    const updateDimensions = () => {
      const rect = element.getBoundingClientRect();
      context.magnifier.set((state) => ({
        ...state,
        viewport_size: {
          width: rect.width,
          height: rect.height,
        },
      }));
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(element);
    return () => {
      if (resizeObserver && element) {
        resizeObserver.unobserve(element);
      }
    };
  }, [measure, image_ref, image_ref.current]);
}

function ImageWrapper({
  label,
  loading,
  children,
}: {
  label: string;
  loading?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  const overlay = <Overlay>Loading...</Overlay>;
  return (
    <div className="col-span-1 flex flex-col justify-center relative">
      <h2 className="text-center text-black text-sm font-semibold uppercase tracking-wide">
        {label}
      </h2>
      <div className="h-4"></div>
      {children}
      {loading && overlay}
    </div>
  );
}

function ImageBox({
  label,
  type,
  measure,
}: {
  label: string;
  type: "natural" | "synthesized";
  measure?: boolean;
}) {
  const context = useContext(AppContext);

  const src = useImageSrc(type);

  // Get the rendered image size
  const image_ref = useRef<HTMLImageElement>(null);
  useSizeReporter({ measure, image_ref });

  // Apply gamma correction filter
  const use_gamma = useContext(AppContext).use_gamma.value;
  const style = {
    filter: use_gamma ? `url(#${GAMMA_FILTER_ID})` : undefined,
  };

  // Show loading overlay, set image natural size
  const [loading, set_loading] = useState(true);
  useEffect(() => {
    set_loading(true);
  }, [src]);
  const onLoad = (evt: SyntheticEvent<HTMLImageElement, Event>) => {
    const image_element = evt.target as HTMLImageElement;
    log(`Loaded image:`, image_element);
    set_loading(false);
    // Get natural size of image
    if (measure && image_element) {
      context.magnifier.set((state) => ({
        ...state,
        natural_size: {
          width: image_element.naturalWidth,
          height: image_element.naturalHeight,
        },
      }));
    }
  };

  return (
    <ImageWrapper label={label} loading={loading}>
      <div className="relative">
        <img
          key={src}
          alt={label}
          src={src}
          onLoad={onLoad}
          style={style}
          ref={image_ref}
        />
        {context.magnifier.value.active && <MagnifyingGlass />}
      </div>
    </ImageWrapper>
  );
}

function ImageBoxZoomed({
  label,
  type,
}: {
  label: string;
  type: "natural" | "synthesized";
}) {
  const context = useContext(AppContext);
  const center = context.magnifier.value.center;
  const zoom_multiplier = context.magnifier.value.zoom_multiplier;
  const viewport_size = context.magnifier.value.viewport_size;
  const natural_size = context.magnifier.value.natural_size;
  const use_gamma = context.use_gamma.value;

  const src = useImageSrc(type);

  if (!(viewport_size && natural_size)) {
    return null;
  }

  const image_size = {
    width: natural_size.width * zoom_multiplier,
    height: natural_size.height * zoom_multiplier,
  };

  const center_percent = {
    x: center.x / viewport_size.width,
    y: center.y / viewport_size.height,
  };

  const image_center = {
    x: image_size.width * center_percent.x,
    y: image_size.height * center_percent.y,
  };

  const image_position = {
    x: -image_center.x + viewport_size.width / 2,
    y: -image_center.y + viewport_size.height / 2,
  };

  // Show loading overlay, set image natural size
  const [loading, set_loading] = useState(true);
  useEffect(() => {
    set_loading(true);
  }, [src]);
  const onLoad = (evt: SyntheticEvent<HTMLImageElement, Event>) => {
    const image_element = evt.target as HTMLImageElement;
    log(`Loaded image:`, image_element);
    set_loading(false);
  };

  return (
    <ImageWrapper label={label} loading={loading}>
      <div
        className="relative overflow-hidden"
        style={{
          width: `${viewport_size.width}px`,
          height: `${viewport_size.height}px`,
        }}
      >
        <img
          key={src}
          src={src}
          className="absolute max-w-none"
          alt={label}
          onLoad={onLoad}
          style={{
            filter: use_gamma ? `url(#${GAMMA_FILTER_ID})` : undefined,
            width: `${image_size.width}px`,
            height: `${image_size.height}px`,
            top: `${image_position.y}px`,
            left: `${image_position.x}px`,
          }}
        />
      </div>
    </ImageWrapper>
  );
}

function GammaFilter() {
  const context = useContext(AppContext);
  const gamma_exponent = context.gamma_exponent.value;
  const inverse = 1 / gamma_exponent;
  const props = {
    type: "gamma",
    amplitude: "1",
    exponent: inverse.toString(),
    offset: "0",
  };
  return (
    <svg width="0" height="0">
      <defs>
        <filter id={GAMMA_FILTER_ID}>
          <feComponentTransfer>
            <feFuncR {...props}></feFuncR>
            <feFuncG {...props}></feFuncG>
            <feFuncB {...props}></feFuncB>
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}

export function ImageGrid() {
  const context = useContext(AppContext);

  const selected_image_path = context.selected_image?.file;
  const magnifier_active = context.magnifier.value.active;

  return (
    <div className="grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-6 gap-x-8 gap-y-10">
      <div className="bg-gamma-500 rounded lg:col-span-6">
        <div className="max-w-max mx-auto py-4 px-10 mb-12">
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {selected_image_path && (
              <>
                <ImageBox type="natural" label="Target Image" measure />
                <ImageBox type="synthesized" label="Synthesized Image" />
              </>
            )}
            {magnifier_active && (
              <>
                <ImageBoxZoomed type="natural" label="Target Image (Zoomed)" />
                <ImageBoxZoomed
                  type="synthesized"
                  label="Synthesized Image (Zoomed)"
                />
              </>
            )}
          </div>
        </div>
      </div>
      <GammaFilter />
    </div>
  );
}



export default function ImageSection() {
  const context = useContext(AppContext);
  const selected_image = context.selected_image;
  const overlay = <Overlay>Select an Image</Overlay>;
  return (
    <>
      <p className="mt-2 mb-3 text-3xl leading-8 font-extrabold tracking-tight text-gamma-900 sm:text-4xl">
        Images
      </p>

      <div className="relative">
        <ImageMeta />
        <ImageTools />
        <ImageGrid />
        {!selected_image && overlay}
      </div>
    </>
  );
}
