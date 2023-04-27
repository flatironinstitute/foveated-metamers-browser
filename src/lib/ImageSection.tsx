"use client";

import type {
  AppState,
  MagnifierState,
  StudyImage,
  Position,
  Dimensions,
} from "./main";
import { useEffect, useContext, useState, useRef, useMemo } from "react";
import * as d3 from "./d3";
import { AppContext, DATA_URL_BASE } from "./main";
import { Overlay, Slider, log } from "./utils";
import gamma_correction from "./gamma-correction";

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
        className="h-7 w-7 cursor-pointer"
        checked={checked}
        onChange={onChange}
      />
      <label className="text-xl cursor-pointer" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}

function GammaForm() {
  const context = useContext(AppContext);
  const gamma_enabled = context.gamma.value.active;

  return (
    <div className="flex flex-col gap-y-4 w-[300px]">
      <BigCheckbox
        id="use-gamma"
        label="Gamma Correction"
        checked={gamma_enabled}
        onChange={() =>
          context.gamma.set((d) => ({
            ...d,
            active: !d.active,
          }))
        }
      />
      <Slider
        disabled={!gamma_enabled}
        id="gamma-value"
        min={1}
        max={3}
        step={0.1}
        value={context.gamma.value.exponent}
        onChange={(e) => {
          const element = e.target as HTMLInputElement;
          context.gamma.set((d) => ({
            ...d,
            exponent: parseFloat(element.value),
          }));
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
          context.magnifier.set((d) =>
            set_magnifier_center({ ...d, active: !d.active })
          )
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
          context.magnifier.set((state) => {
            return set_magnifier_center({
              ...state,
              zoom_multiplier: parseFloat(element.value),
            });
          });
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
      <div className="flex gap-y-5 gap-x-5">
        <GammaForm />
        <ZoomForm />
      </div>
      <div className="h-5"></div>
    </>
  );
}

function useImageSrc(type: "natural" | "synthesized") {
  if (process.env.NEXT_PUBLIC_GAMMA_TEST) return "/gamma-test.png";
  const context = useContext(AppContext);
  const context_key: keyof AppState =
    type === "natural" ? "selected_natural_image" : "selected_image";
  const image = context[context_key] as StudyImage;
  if (!image) return undefined;
  const path = image?.file;
  const src = new URL(
    `${DATA_URL_BASE}/${path}`,
    window.location.href
  ).toString();
  return src;
}

function get_magnifier_size(state: MagnifierState): Dimensions | null {
  const view = state.viewport_size;
  const nat = state.natural_size;
  const mult = state.zoom_multiplier;
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
  dragged: Position = state.center
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

function get_cropped_region(
  state: MagnifierState
): (Dimensions & Position) | null {
  const size = get_magnifier_size(state);
  const { center, natural_size, viewport_size } = state;
  if (!size) return null;
  if (!center) return null;
  if (!natural_size) return null;
  if (!viewport_size) return null;
  const box_left = center.x - size.width / 2;
  const box_top = center.y - size.height / 2;
  const box_left_percent = box_left / viewport_size.width;
  const box_top_percent = box_top / viewport_size.height;
  const box_width_percent = size.width / viewport_size.width;
  const box_height_percent = size.height / viewport_size.height;
  const x = natural_size.width * box_left_percent;
  const y = natural_size.height * box_top_percent;
  const width = natural_size.width * box_width_percent;
  const height = natural_size.height * box_height_percent;
  return {
    x,
    y,
    width,
    height,
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
      // log(`on_drag`, event);
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

function CanvasImage({
  type,
  zoom,
}: {
  type: "natural" | "synthesized";
  zoom?: boolean;
}): JSX.Element {
  const context = useContext(AppContext);
  const magnifier_state = context.magnifier.value;
  const image_element = context.image_elements.value[type];
  const gamma_active = context.gamma.value.active;
  const gamma_exponent = context.gamma.value.exponent;

  const canvas_ref = useRef<HTMLCanvasElement>(null);

  const image_data = useMemo(() => {
    const { viewport_size } = magnifier_state;
    if (!viewport_size) return null;
    if (!image_element) return null;
    const hidden_canvas = new OffscreenCanvas(
      viewport_size.width,
      viewport_size.height
    );
    const context = hidden_canvas.getContext("2d");
    if (!context) return null;
    let source_x = 0;
    let source_y = 0;
    let source_width = image_element.naturalWidth;
    let source_height = image_element.naturalHeight;
    let dest_x = 0;
    let dest_y = 0;
    let dest_width = viewport_size.width;
    let dest_height = viewport_size.height;
    if (zoom) {
      const cropped = get_cropped_region(magnifier_state);
      if (cropped) {
        source_x = cropped.x;
        source_y = cropped.y;
        source_width = cropped.width;
        source_height = cropped.height;
      }
    }
    context.drawImage(
      image_element,
      source_x,
      source_y,
      source_width,
      source_height,
      dest_x,
      dest_y,
      dest_width,
      dest_height
    );
    try {
      const data = context.getImageData(
        0,
        0,
        hidden_canvas.width,
        hidden_canvas.height
      );
      return data;
    } catch {
      return null;
    }
  }, [image_element, magnifier_state, zoom]);

  useEffect(() => {
    const canvas = canvas_ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    if (!image_data) return;
    let output_data = image_data;
    if (gamma_active) {
      const modifed_data = context.createImageData(
        image_data.width,
        image_data.height
      );
      gamma_correction({
        input_data: image_data.data,
        output_data: modifed_data.data,
        gamma_exponent,
      });
      output_data = modifed_data;
    }
    context.putImageData(output_data, 0, 0);
  }, [image_data, canvas_ref.current, gamma_active, gamma_exponent]);

  return (
    <canvas
      ref={canvas_ref}
      width={magnifier_state.viewport_size?.width}
      height={magnifier_state.viewport_size?.height}
      className="block absolute top-0 left-0 h-full w-full box-border"
    />
  );
}

function ImageBox({
  type,
  measure,
}: {
  type: "natural" | "synthesized";
  measure?: boolean;
}) {
  const label = type === "natural" ? "Target Image" : "Synthesized Image";

  const context = useContext(AppContext);

  const src = useImageSrc(type);

  const [loading, set_loading] = useState(false);

  const image_ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!measure) return;
    if (!image_ref.current) return;
    const image_element = image_ref.current;
    const updateDimensions = () => {
      const rect = image_element.getBoundingClientRect();
      context.magnifier.set((state) => ({
        ...state,
        viewport_size: {
          width: rect.width,
          height: rect.height,
        },
      }));
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(() => updateDimensions());
    resizeObserver.observe(image_element);
    return () => {
      if (resizeObserver && image_element) {
        resizeObserver.unobserve(image_element);
      }
    };
  }, [image_ref, image_ref.current]);

  useEffect(() => {
    set_loading(true);
  }, [src]);

  const onLoad: React.ReactEventHandler<HTMLImageElement> = (event) => {
    set_loading(false);
    const image_element = event.target as HTMLImageElement;
    context.image_elements.set((d) => ({ ...d, [type]: image_element }));
    context.magnifier.set((state) => ({
      ...state,
      natural_size: {
        width: image_element.naturalWidth,
        height: image_element.naturalHeight,
      },
    }));
  };

  return (
    <ImageWrapper label={label} loading={loading}>
      <div className="relative">
        <CanvasImage type={type} />
        <img
          className="opacity-0"
          key={src}
          alt={label}
          src={src}
          onLoad={onLoad}
          ref={image_ref}
          crossOrigin="anonymous"
        />
        {context.magnifier.value.active && <MagnifyingGlass />}
      </div>
    </ImageWrapper>
  );
}

function ImageBoxZoomed({ type }: { type: "natural" | "synthesized" }) {
  const label =
    type === "natural" ? "Target Image (Zoomed)" : "Synthesized Image (Zoomed)";

  const context = useContext(AppContext);
  const viewport_size = context.magnifier.value.viewport_size;
  const natural_size = context.magnifier.value.natural_size;

  if (!(viewport_size && natural_size)) {
    return null;
  }

  return (
    <ImageWrapper label={label}>
      <div
        className="relative"
        style={{
          height: viewport_size.height + `px`,
          width: viewport_size.width + `px`,
        }}
      >
        <CanvasImage type={type} zoom />
      </div>
    </ImageWrapper>
  );
}

export function ImageGrid() {
  const context = useContext(AppContext);

  const selected_image_path = context.selected_image?.file;
  const magnifier_active = context.magnifier.value.active;
  const gamma_active = context.gamma.value.active;
  const gamma_exponent = context.gamma.value.exponent;

  const bg = gamma_active ? 255 * 0.5 ** (1 / gamma_exponent) : 255 / 2;
  const bg_color = `rgba(${bg}, ${bg}, ${bg}, 1)`;

  return (
    <div className="grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-6 gap-x-8 gap-y-10">
      <div
        className="rounded lg:col-span-6"
        style={{
          backgroundColor: bg_color,
        }}
      >
        <div className="max-w-max mx-auto py-4 px-10 mb-12">
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {selected_image_path && (
              <>
                <ImageBox type="natural" measure />
                <ImageBox type="synthesized" />
              </>
            )}
            {magnifier_active && (
              <>
                <ImageBoxZoomed type="natural" />
                <ImageBoxZoomed type="synthesized" />
              </>
            )}
          </div>
        </div>
      </div>
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
