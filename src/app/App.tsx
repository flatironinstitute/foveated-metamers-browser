"use client";

import { Context, forwardRef, useRef } from "react";
import type { FilterID, Field, Image } from "./types";
import type { AppState } from "./app_state";
import type { Dimensions } from "./useResizeObserver";
import { createContext, useEffect, useContext, useState } from "react";
import { sort } from "d3-array";
import { format as d3format } from "d3-format";
import useResizeObserver from "./useResizeObserver";
import create_app_state, {
  DATA_URL_BASE,
  FILTER_IDS,
  FIELDS,
  FIELD_DESCRIPTIONS,
  log,
} from "./app_state";

const GAMMA_FILTER_ID = `gamma-adjustment`;

const format_commas = d3format(`,`);

const AppContext: Context<AppState> = createContext({} as AppState);

function ImageMeta() {
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
      <div className="flex gap-x-4">
        <input
          disabled={gamma_enabled ? false : true}
          className="block"
          id="gamma-value"
          type="range"
          min="0.8"
          max="8"
          step="0.2"
          value={context.gamma_exponent.value}
          onChange={(e) => {
            context.gamma_exponent.set(parseFloat(e.target.value));
          }}
        />
        <label
          htmlFor="gamma-value"
          className={`text-xl ${gamma_enabled ? `` : `opacity-20`}`}
        >
          {d3format(`.1f`)(context.gamma_exponent.value)}
        </label>
      </div>
    </div>
  );
}

function ZoomForm() {
  const context = useContext(AppContext);
  const zoom_enabled = context.use_zoom.value;

  return (
    <div className="flex flex-col gap-y-4 w-[300px]">
      <BigCheckbox
        id="use-zoom"
        label="Zoom"
        checked={zoom_enabled}
        onChange={() => context.use_zoom.set((d) => !d)}
      />
    </div>
  );
}

function ImageTools() {
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
  const image = context[context_key] as Image;
  if (!image) return undefined;
  const path = image?.file;
  const src = `${DATA_URL_BASE}${path}`;
  return src;
}

function Minimap() {
  const context = useContext(AppContext);

  const use_zoom = context.use_zoom.value;

  const minimap_size = (() => {
    const view = context.image_viewport_size.value;
    if (!view) return null;
    const nat = context.current_image_natural_size.value;
    if (!nat) return null;
    return {
      width: (view.width / nat.width) * view.width,
      height: (view.height / nat.height) * view.height,
    };
  })();

  return use_zoom && minimap_size ? (
    <div
      className="absolute outline outline-2 outline-red-500"
      style={{
        top: 0,
        left: 0,
        width: minimap_size.width,
        height: minimap_size.height,
      }}
    ></div>
  ) : null;
}

function ImageGridImage({
  label,
  type,
  measure,
}: {
  path?: string;
  label: string;
  type: "natural" | "synthesized";
  measure?: boolean;
}) {
  const context = useContext(AppContext);

  const src = useImageSrc(type);

  const base_class = `col-span-1 flex flex-col justify-center relative`;
  const className = `${base_class} ${src ? `` : `hidden`}`;

  // Get the image viewport size, maybe
  const image_ref = useRef<HTMLImageElement>(null);
  const image_size = useResizeObserver(measure ? image_ref : undefined);
  useEffect(() => {
    if (!image_size) return;
    log("Image viewport size:", image_size);
    context.image_viewport_size.set(image_size);
  }, [image_size]);

  // Apply gamma correction filter
  const use_gamma = useContext(AppContext).use_gamma.value;
  const style = {
    filter: use_gamma ? `url(#${GAMMA_FILTER_ID})` : undefined,
  };

  // Show loading overlay
  const [loading, set_loading] = useState(true);
  useEffect(() => {
    set_loading(true);
  }, [src]);
  const overlay = <Overlay>Loading...</Overlay>;
  const onLoad = () => {
    set_loading(false);
    if (measure && image_ref?.current) {
      context.current_image_natural_size.set({
        width: image_ref.current.naturalWidth,
        height: image_ref.current.naturalHeight,
      });
    }
  };

  return (
    <div className={className}>
      <h2 className="text-center text-black text-sm font-semibold uppercase tracking-wide">
        {label}
      </h2>
      <div className="h-4"></div>
      <div className="relative">
        <img
          key={src}
          alt={label}
          src={src}
          onLoad={onLoad}
          style={style}
          ref={image_ref}
        />
        <Minimap />
      </div>
      {loading && overlay}
    </div>
  );
}

function ImageGridZoomBox({
  label,
  type,
}: {
  label: string;
  type: "natural" | "synthesized";
}) {
  const context = useContext(AppContext);
  const viewport_size = context.image_viewport_size.value ?? {
    width: 0,
    height: 0,
  };
  const { width, height } = viewport_size;

  const className = `col-span-1 flex flex-col justify-center relative`;
  const use_gamma = useContext(AppContext).use_gamma.value;

  const src = useImageSrc(type);

  return (
    <div className={className}>
      <h2 className="text-center text-black text-sm font-semibold uppercase tracking-wide">
        {label}
      </h2>
      <div className="h-4"></div>
      <div
        className="overflow-hidden outline outline-2 outline-red-500"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <img
          key={src}
          src={src}
          className="object-none"
          alt={label}
          style={{
            filter: use_gamma ? `url(#${GAMMA_FILTER_ID})` : undefined,
            objectPosition: `top 0px left 0px`,
          }}
        />
      </div>
    </div>
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

function ImageGrid() {
  const context = useContext(AppContext);
  const { selected_image, selected_natural_image, use_zoom } = context;

  const natural_image_ref = useRef<HTMLImageElement>(null);
  const synthesized_image_ref = useRef<HTMLImageElement>(null);

  const image_size = useResizeObserver(natural_image_ref);

  useEffect(() => {
    context.image_viewport_size.set(image_size);
  }, [image_size]);

  useEffect(() => {
    if (!synthesized_image_ref.current) return;
    console.log("SETTING NAT", synthesized_image_ref.current);
    context.current_image_natural_size.set({
      width: synthesized_image_ref.current.naturalWidth,
      height: synthesized_image_ref.current.naturalHeight,
    });
  }, [synthesized_image_ref.current]);

  return (
    <div className="grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-6 gap-x-8 gap-y-10">
      <div className="bg-gamma-500 rounded lg:col-span-6">
        <div className="max-w-max mx-auto py-4 px-10 mb-12">
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            <ImageGridImage
              type="natural"
              path={selected_natural_image?.file}
              label="Target Image"
              measure
            />
            <ImageGridImage
              type="synthesized"
              path={selected_image?.file}
              label="Synthesized Image"
            />
            {use_zoom.value && (
              <>
                <ImageGridZoomBox
                  type="natural"
                  label="Target Image (Zoomed)"
                />
                <ImageGridZoomBox
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

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute w-full h-full top-0 left-0 grid items-center justify-center bg-neutral-100/80 text-6xl rounded">
      {children}
    </div>
  );
}

function ImageSection({ children }: { children: React.ReactNode }) {
  const context = useContext(AppContext);
  const selected_image = context.selected_image;
  const overlay = <Overlay>Select an Image</Overlay>;
  return (
    <div className="relative">
      {children}
      {!selected_image && overlay}
    </div>
  );
}

function SVGPlus() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SVGMinus() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

type FilterOptionProps = {
  id: string;
  filter_id: FilterID;
  value: string;
};

function FilterOption({ id, filter_id, value }: FilterOptionProps) {
  const filters = useContext(AppContext).filters;
  const filter_state = filters.value?.[filter_id] ?? {};
  const filter_is_checked = filter_state[value];

  return (
    <div className="flex items-center">
      <input
        id={id}
        value={value}
        type="checkbox"
        checked={filter_is_checked}
        className="h-4 w-4 border-gamma-300 rounded text-indigo-600 focus:ring-indigo-500"
        onChange={(event) => {
          filters.set((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              [filter_id]: {
                ...(prev[filter_id] ?? {}),
                [value]: event.target.checked,
              },
            };
          });
        }}
      />
      <label htmlFor={id} className="ml-3 text-sm text-gamma-600">
        {value?.toString()}
      </label>
    </div>
  );
}

function genericCompare(a: any, b: any) {
  return a - b || (a < b ? -1 : a > b ? 1 : 0);
}

function Filter({ id: filter_id }: { id: FilterID }) {
  const [hidden, set_hidden] = useState(true);

  const filter_state = useContext(AppContext).filters.value?.[filter_id] ?? {};

  const filter_values_sorted: string[] = sort(
    Object.keys(filter_state),
    genericCompare
  );

  const filter_options: Array<FilterOptionProps> = filter_values_sorted.map(
    (value, index) => {
      return {
        id: `filter-${filter_id}-${index}`,
        filter_id,
        value,
      };
    }
  );

  return (
    <div className="border-b border-gamma-200 pb-6">
      <h3 className="-my-3 flow-root">
        <button
          type="button"
          data-filter={filter_id}
          className="py-3 bg-white w-full flex items-center justify-between text-sm text-neutral-400 hover:text-neutral-500"
          name="plusminus"
          onClick={() => set_hidden((h) => !h)}
        >
          <span className="font-medium text-xs text-neutral-900 uppercase text-left">
            {filter_id.replaceAll("_", " ")}
          </span>
          <span className="ml-6 flex items-center">
            {hidden ? <SVGPlus /> : <SVGMinus />}
          </span>
        </button>
      </h3>
      <div
        className={`pt-6 ${hidden && `hidden`}`}
        id={`filter-options-${filter_id}`}
      >
        <div className="space-y-4">
          {filter_options.map((option) => (
            <FilterOption
              key={option.id}
              id={option.id}
              filter_id={option.filter_id}
              value={option.value}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Filters() {
  return (
    <form className="lg:block" id="filterform">
      {FILTER_IDS.map((filter_id) => (
        <Filter id={filter_id} key={filter_id} />
      ))}
    </form>
  );
}

function TableError() {
  return (
    <div
      id="errcon"
      className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8"
    >
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              <b>Error</b>
              <span id="errmsg" className="px-2">
                Unknown error.
              </span>
              <a
                href="mailto:scicomp@flatironinstitute.org"
                className="font-medium underline text-red-700 hover:text-red-600"
              >
                {" "}
                Contact the site administrator
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableHead() {
  return (
    <thead className="bg-neutral-50">
      <tr>
        {FIELDS.map((field) => (
          <th
            key={field}
            scope="col"
            className="target_image px-4 py-2 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider"
            title={FIELD_DESCRIPTIONS[field]}
          >
            {field.replaceAll("_", " ")}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TableBody() {
  const context = useContext(AppContext);
  const paginated_rows = context?.paginated_rows ?? [];
  return (
    <tbody className="bg-white divide-y divide-neutral-200">
      {paginated_rows.map((row) => {
        const selected = context?.selected_image_key.value === row.__hash;
        return (
          <tr
            key={row.__hash}
            className={`cursor-pointer border border-neutral-200 p-4 ${
              selected ? `bg-indigo-100` : ``
            }`}
            onClick={() => {
              if (typeof row.__hash === "undefined") {
                console.error(`Row has no hash: ${JSON.stringify(row)}`);
              } else {
                context?.selected_image_key.set(row.__hash);
              }
            }}
          >
            {FIELDS.map((field_id: Field) => (
              <td
                key={field_id}
                className="px-4 py-2 whitespace-nowrap text-xs text-neutral-500"
              >
                {row[field_id].toString()}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}

function SVGLeftArrow() {
  return (
    <svg
      className="mr-3 h-5 w-5 text-gamma-400"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SVGRightArrow() {
  return (
    <svg
      className="ml-3 h-5 w-5 text-gamma-400"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PrevNext({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const className =
    "border-t-2 border-transparent pt-4 pr-1 inline-flex items-center font-medium text-xs text-neutral-900 uppercase";
  return (
    <a
      className={`${className} ${
        disabled
          ? "opacity-10"
          : "cursor-pointer hover:text-gamma-700 hover:border-indigo-700"
      }`}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </a>
  );
}

function Pagination() {
  const context = useContext(AppContext);
  const filtered_rows = context?.filtered_rows ?? [];
  const page_start = context?.page_start ?? 0;
  const page_end = context?.page_end ?? 0;
  return (
    <nav className="border-t border-gamma-200 px-4 flex items-center justify-between sm:px-0">
      <div className="-mt-px w-0 flex-1 flex">
        <PrevNext
          disabled={page_start <= 0}
          onClick={() => {
            context?.current_page.set((p) => p - 1);
          }}
        >
          <SVGLeftArrow />
          Previous
        </PrevNext>
      </div>
      <div className="hidden md:-mt-px md:flex">
        <p
          id="nowshowing"
          className="font-medium text-xs text-neutral-900 uppercase pt-4 px-4 inline-flex items-center"
        >
          Showing
          <span className="px-2" id="start">
            {format_commas(page_start + 1)}
          </span>
          to
          <span className="px-2" id="end">
            {format_commas(page_end)}
          </span>{" "}
          of
          <span className="px-2" id="total">
            {format_commas(filtered_rows.length)}
          </span>
          results
        </p>
      </div>
      <div className="-mt-px w-0 flex-1 flex justify-end">
        <PrevNext
          disabled={page_end >= filtered_rows.length}
          onClick={() => {
            context?.current_page.set((p) => p + 1);
          }}
        >
          Next
          <SVGRightArrow />
        </PrevNext>
      </div>
    </nav>
  );
}

function Table() {
  return (
    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8 rounded">
      <div className="overflow-hidden rounded">
        <table
          id="table"
          className="min-w-full divide-y divide-gamma-200 border border-gamma-200 rounded"
        >
          <TableHead />
          <TableBody />
        </table>
        <Pagination />
      </div>
    </div>
  );
}

function TableAndFilters() {
  return (
    <section
      aria-labelledby="data-table"
      className="max-w-auto mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 bg-white"
    >
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-x-8 gap-y-10 pt-6">
        <Filters />
        <div className="lg:col-span-5">
          <div className="flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              {/* <TableError /> */}
              <Table />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const app_state = create_app_state();

  const overlay = <Overlay>Loading...</Overlay>;

  return (
    <AppContext.Provider value={app_state}>
      <section
        aria-labelledby="image-display"
        className="pt-6 pb-12 max-w-auto mx-auto px-4 sm:px-6 lg:px-8 bg-white"
      >
        <div className="relative z-10 mb-8 md:mb-2 md:px-6">
          <div className="text-base max-w-prose lg:max-w-none">
            <p className="mt-2 mb-3 text-3xl leading-8 font-extrabold tracking-tight text-gamma-900 sm:text-4xl">
              Images
            </p>
            <ImageSection>
              <ImageMeta />
              <ImageTools />
              <ImageGrid />
            </ImageSection>
            <TableAndFilters />
          </div>
          {app_state.metadata.value ? null : overlay}
        </div>
      </section>
    </AppContext.Provider>
  );
}
