"use client";

import type { Context, Dispatch, SetStateAction } from "react";
import { createContext, useEffect, useContext, useState, useMemo } from "react";
import { sort } from "d3-array";
import { format as d3format } from "d3-format";

interface Metadata {
  model_name: string;
  downsampled: boolean;
  psychophysics_comparison: string;
  target_image: string;
  scaling: number;
  initialization_type: string;
  random_seed: number;
  gamma_corrected: boolean;
}

type Image = Metadata & {
  file: string;
};

type MetadataJson = {
  metamers: Image[];
  natural_images: Image[];
};

type Field = keyof Metadata;

type FilterID = keyof Omit<Metadata, "random_seed">;

type FieldMap<T> = {
  [Property in Field]: T;
};

type FilterState = {
  [Key in FilterID]: {
    [k: string]: boolean;
  };
};

type StateObject<T> = {
  value: T;
  set: Dispatch<SetStateAction<T>>;
};

interface AppState {
  metadata: StateObject<MetadataJson | null>;
  filters: StateObject<FilterState | null>;
  current_page: StateObject<number>;
  filtered_rows: Image[];
  paginated_rows: Image[];
}

const FIELD_DESCRIPTIONS: FieldMap<string> = {
  model_name: "The model used to synthesize this image.",
  downsampled: "Whether the image was downsampled before synthesis.",
  psychophysics_comparison:
    "The experimental comparison(s) this image was used in.",
  target_image:
    "The natural image whose model representation this metamer was synthesized to match.",
  scaling: "The model's scaling parameter used to synthesize this image.",
  initialization_type:
    "The image used to initialize metamer synthesis fo this image.",
  random_seed:
    "The number used to set pytorch and numpy's random number generators for synthesis.",
  gamma_corrected: "Whether this image has been gamma corrected (to 2.2?).",
};

const FIELDS: Field[] = Object.keys(FIELD_DESCRIPTIONS) as Field[];

const FILTER_IDS: FilterID[] = FIELDS.filter(
  (d): d is FilterID => d !== "random_seed"
);

const INITIAL_FILTER_STATE = Object.fromEntries(
  FILTER_IDS.map((filter_id) => [filter_id, {}])
) as FilterState;

const PAGE_SIZE = 25;

function log(...args: any[]) {
  console.log(`🖼️`, ...args);
}

function useStateObject<T>(initial_value: T): StateObject<T> {
  const [value, set] = useState<T>(initial_value);
  return { value, set };
}

const AppContext: Context<AppState> = createContext({} as AppState);

function ImageMeta() {
  return (
    <p className="leading-6 mt-4 text-base text-gamma-900 tracking-wide truncate">
      <span className="mr-1 font-semibold">Model</span>:{" "}
      <span className="mr-3" id="model_name">
        -
      </span>
      <span className="mr-1 font-semibold">Target Image</span>:{" "}
      <span className="mr-3" id="target_image">
        -
      </span>
      <span className="mr-1 font-semibold">Scaling Value</span>:{" "}
      <span className="mr-3" id="scaling">
        -
      </span>
      <span className="mr-1 font-semibold">Random Seed</span>:{" "}
      <span className="mr-3" id="random_seed">
        -
      </span>
    </p>
  );
}

function ImageTools() {
  return (
    <div className="flex items-center mb-3 whitespace-nowrap">
      {/* <div class="flex-none flex items-center ml-auto pl-4 sm:pl-6">
    <div class="group p-0.5 flex">
      <div>
        <label for="email" class="block text-sm font-medium text-gamma-700">Gamma</label>
        <div class="mt-1 slide-container">
          <input type="range" min="0.8" max="8" value="1" step="0.2" class="slider" id="gamma">
        </div>
        <p class="mt-2 text-sm text-gamma-500">Value: <span id="gamma-description"> </span></p>
      </div>
    </div>
    <div class="hidden sm:block w-px h-6 bg-gamma-200 ml-6"></div>
    <div class="relative hidden sm:block ml-2.5">
      <div style="opacity:1" :style="'opacity:1'">
        <select x-model="activeSnippet" class="bg-transparent text-gamma-900 rounded-lg border-0 form-select p-0 pl-3.5 pr-[1.875rem] h-9 w-full sm:text-sm font-medium focus:shadow-none focus-visible:ring-2 focus-visible:ring-teal-500" style="background-image:none;">
          <option selected value="1" >Zoom 1x</option>
          <option value="2">Zoom 2x</option>
          <option value="3">Zoom 3x</option>
          <option value="4">Zoom 4x</option>
        </select>
      </div>
    </div>
  </div> */}
    </div>
  );
}

function ImageGrid() {
  return (
    <div className="grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-6 gap-x-8 gap-y-10">
      <div className="bg-gamma-500 rounded lg:col-span-6">
        <div className="max-w-max mx-auto py-4 px-10 mb-12">
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            <div className="col-span-1 flex flex-col justify-center">
              <img
                className="py-2 w-600"
                id="natimg"
                alt="target image"
                src="./assets/richter2.jpg"
              />
              <h2 className="text-center text-black text-sm font-semibold uppercase tracking-wide">
                Target Image
              </h2>
            </div>
            {/* <!-- <div class="col-span-1 flex flex-col justify-center">
          <img class="py-2 w-600" id="natimg-det" alt="target image detail" src="./assets/richter3.jpg">
          <h2 class="text-center text-black text-sm font-semibold uppercase tracking-wide ">
            Target Image Detail
          </h2>
        </div> --> */}
            <div className="col-span-1 flex flex-col justify-center">
              <img
                className="py-2 w-600"
                id="img"
                alt="synethsized image"
                src="./assets/richter1.jpg"
              />
              <h2 className="text-center text-black text-sm font-semibold uppercase tracking-wide ">
                Synthesized Image
              </h2>
            </div>
            {/* <!-- <div class="col-span-1 flex flex-col justify-center">
          <img class="py-2 w-600" id="img-det" alt="synethsized image detail" src="./assets/richter3.jpg">
          <h2 class="text-center text-black text-sm font-semibold uppercase tracking-wide ">
            Synthesized Image Detail
          </h2>
        </div> --> */}
          </div>
        </div>
      </div>
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
            {filter_id}
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
  const paginated_rows = useContext(AppContext)?.paginated_rows ?? [];
  return (
    <tbody className="bg-white divide-y divide-neutral-200">
      {paginated_rows.map((row) => (
        <tr key={row.file} className="border border-neutral-200 p-4">
          {FIELDS.map((field_id: Field) => (
            <td
              key={field_id}
              className="px-4 py-2 whitespace-nowrap text-xs text-neutral-500"
            >
              {row[field_id]}
            </td>
          ))}
        </tr>
      ))}
      <tr>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gamma-900"></td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gamma-500"></td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gamma-500"></td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gamma-500"></td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <a href="#" className="text-indigo-600 hover:text-indigo-900"></a>
        </td>
      </tr>
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

function Pagination() {
  const filtered_rows = useContext(AppContext)?.filtered_rows ?? [];
  return (
    <nav className="border-t border-gamma-200 px-4 flex items-center justify-between sm:px-0">
      <div className="-mt-px w-0 flex-1 flex">
        <a
          id="previous"
          className="border-t-2 border-transparent pt-4 pr-1 inline-flex items-center font-medium text-xs text-neutral-900 uppercase hover:text-gamma-700 hover:border-indigo-700"
        >
          <SVGLeftArrow />
          Previous
        </a>
      </div>
      <div className="hidden md:-mt-px md:flex">
        <p
          id="nowshowing"
          className="font-medium text-xs text-neutral-900 uppercase pt-4 px-4 inline-flex items-center"
        >
          Showing <span className="px-2" id="start"></span> to
          <span className="px-2" id="end"></span> of
          <span className="px-2" id="total">
            {d3format(`,`)(filtered_rows.length)}
          </span>
          results
        </p>
      </div>
      <div className="-mt-px w-0 flex-1 flex justify-end">
        <a
          id="next"
          className="border-t-2 border-transparent pt-4 pl-1 inline-flex items-center font-medium text-xs text-neutral-900 uppercase hover:text-gamma-700 hover:border-indigo-700"
        >
          Next
          <SVGRightArrow />
        </a>
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
              <TableError />
              <Table />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function create_app_state(): AppState {
  const metadata = useStateObject<MetadataJson | null>(null);
  const filters = useStateObject<FilterState | null>(null);
  const current_page = useStateObject<number>(1);
  // const metadata = useSignal<MetadataJson | null>(null);
  // const filters = useSignal<FilterState | null>(null);
  // const current_page = useSignal<number>(1);

  // Fetch the metadata, and populate the initial filters state
  useEffect(() => {
    const url_base = process.env.NEXT_PUBLIC_DATA_URL;
    const url = new URL(url_base + "metadata.json");
    (async () => {
      log(`Fetching metadata from ${url}`);
      const response = await fetch(url);
      const metadata_ = (await response.json()) as MetadataJson;
      log(`Metadata:`, metadata_);

      // Populate filter options state using all values of each field
      const metamers: Image[] = metadata_.metamers;
      const next_filter_state: FilterState = INITIAL_FILTER_STATE;
      // For each filter_id, create an object with all possible values
      // and set them to true
      const entries = Object.entries(next_filter_state);
      for (const [filter_id, filter_values] of entries) {
        // Create a set of all values for this filter
        const filter_values = Array.from(
          new Set(metamers.map((image) => image[filter_id as FilterID]))
        );
        // All values start out `true`
        const active_filters: { [k: string]: true } = Object.fromEntries(
          filter_values.map((v) => [v, true])
        );
        next_filter_state[filter_id as FilterID] = active_filters;
      }

      metadata.set(metadata_);
      filters.set(next_filter_state);
    })();
  }, []);

  // Get filtered rows from current filter state
  const filtered_rows = useMemo<Image[]>(() => {
    if (!metadata.value) return [];
    if (!filters.value) return [];
    const metamers = metadata.value?.metamers ?? [];
    const filter_state = filters.value;
    const filtered_metamers = metamers.filter((image: Image) => {
      let keep = true;
      for (const filter_id of Object.keys(filter_state)) {
        if (!(filter_id in image)) {
          console.log(`Filter ${filter_id} not in image`, image);
          continue;
        }
        const image_value = image[filter_id as FilterID];
        const value_as_string = image_value.toString();
        // The current filter state for this filter_id and value
        const this_filter_state =
          filter_state?.[filter_id as FilterID]?.[value_as_string];
        if (!this_filter_state) {
          keep = false;
          break;
        }
      }
      return keep;
    });
    return filtered_metamers;
  }, [metadata.value, filters.value]);

  const paginated_rows = useMemo<Image[]>(() => {
    // Slice the rows to the current page
    const start = (current_page.value - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filtered_rows.slice(start, end);
  }, [filtered_rows, current_page]);

  return { metadata, filters, filtered_rows, paginated_rows, current_page };
}

export default function App() {
  const app_state = create_app_state();

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
            <ImageMeta />
            <ImageTools />
            <ImageGrid />
            <TableAndFilters />
          </div>
        </div>
      </section>
    </AppContext.Provider>
  );
}
