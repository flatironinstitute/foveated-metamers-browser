"use client";

import type { Context, Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState, createContext, useRef } from "react";
import * as d3 from "./d3";
import { log } from "./utils";

export interface Metadata {
  model_name: string;
  downsampled: boolean;
  psychophysics_comparison: string;
  target_image: string;
  scaling: number;
  initialization_type: string;
  random_seed: number;
  gamma_corrected: boolean;
}

export type StudyImage = Metadata & {
  file: string;
  __hash?: string;
};

export type MetadataJson = {
  metamers: StudyImage[];
  natural_images: StudyImage[];
};

export type Field = keyof Metadata;

export type FieldMap<T> = {
  [Property in Field]: T;
};

export type FilterState = {
  [filter_id: string]: {
    [filter_value: string]: boolean;
  };
};

export type StateObject<T> = {
  value: T;
  set: Dispatch<SetStateAction<T>>;
};

export interface Dimensions {
  height: number;
  width: number;
}

export interface Position {
  x: number;
  y: number;
}

export type MagnifierState = {
  active: boolean;
  zoom_multiplier: number;
  center: Position;
  natural_size: Dimensions | null;
  viewport_size: Dimensions | null;
};

type GammaState = {
  active: boolean;
  exponent: number;
};

type ImageElementState = {
  natural: HTMLImageElement | null;
  synthesized: HTMLImageElement | null;
};

type TableState = {
  sort_by: Field;
  sort_direction: "ascending" | "descending";
  current_page: number;
};

export type AppState = {
  metadata: StateObject<MetadataJson | null>;
  filters: StateObject<FilterState | null>;
  result_set: StateObject<string | null>;
  selected_image_key: StateObject<string | null>;
  sorted_rows: StudyImage[];
  paginated_rows: StudyImage[];
  selected_image: StudyImage | undefined;
  selected_natural_image: StudyImage | undefined;
  gamma: StateObject<GammaState>;
  magnifier: StateObject<MagnifierState>;
  table: StateObject<TableState>;
  image_elements: StateObject<ImageElementState>;
  page_start: number;
  page_end: number;
};

export const DATA_URL_BASE = process.env.NEXT_PUBLIC_DATA_URL;

log(`Data URL:`, DATA_URL_BASE);

export const FIELD_DESCRIPTIONS: FieldMap<string> = {
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

export const FIELDS: Field[] = Object.keys(FIELD_DESCRIPTIONS) as Field[];

export const FILTER_IDS: Field[] = [
  "scaling",
  "target_image",
  "initialization_type",
];

export const TABLE_COLUMNS: Field[] = [
  "model_name",
  "psychophysics_comparison",
  "downsampled",
  "scaling",
  "target_image",
  "initialization_type",
  "random_seed",
];

export const PAGE_SIZE = 24;

export const RESULT_SETS: Array<{
  label: string;
  filters: FilterState;
}> = (
  [
    ["Luminance model", "Original vs. Synth: white noise", false],
    ["Luminance model", "Synth vs. Synth: white noise", false],
    ["Energy model", "Original vs. Synth: white noise", false],
    ["Energy model", "Synth vs. Synth: white noise", false],
    ["Energy model", "Original vs. Synth: natural image", false],
    ["Energy model", "Synth vs. Synth: natural image", false],
    ["Energy model", "Original vs. Synth: white noise", true],
  ] as [string, string, boolean][]
).map(([model_name, psychophysics_comparison, downsampled]) => {
  return {
    label: `${model_name}: ${psychophysics_comparison}${
      downsampled ? " (downsampled)" : ""
    }`,
    filters: {
      model_name: {
        [model_name]: true,
      },
      psychophysics_comparison: {
        [psychophysics_comparison]: true,
      },
      downsampled: {
        [downsampled.toString()]: true,
      },
    },
  };
});

function get_image_hash(image: StudyImage) {
  let string = ``;
  const keys = Object.keys(image).filter((d) => d !== "__hash");
  for (const key of d3.sort(keys, d3.ascending)) {
    const value = image[key as keyof StudyImage];
    string += value?.toString() + "_";
  }
  return string;
}

function turn_on_all_filters(filters: FilterState) {
  const out: FilterState = {};
  for (const filter_id of FILTER_IDS) {
    out[filter_id] = {};
    const filter_values = filters[filter_id];
    for (const filter_value of Object.keys(filter_values)) {
      out[filter_id][filter_value] = true;
    }
  }
  return out;
}

function filter_metamers(metamers: StudyImage[], filters: FilterState) {
  const filtered_metamers: StudyImage[] = metamers.filter(
    (image: StudyImage) => {
      let keep = true;
      for (const filter_id of Object.keys(filters)) {
        if (!(filter_id in image)) {
          console.log(`Filter ${filter_id} not in image`, image);
          continue;
        }
        const image_value = image[filter_id as Field];
        const value_as_string = image_value.toString();
        // The current filter state for this filter_id and value
        const this_filter_state =
          filters?.[filter_id as Field]?.[value_as_string];
        if (!this_filter_state) {
          keep = false;
          break;
        }
      }
      return keep;
    }
  );
  return filtered_metamers;
}

function useStateObject<T>(initial_value: T): StateObject<T> {
  const [value, set] = useState<T>(initial_value);
  return { value, set };
}

export const AppContext: Context<AppState> = createContext({} as AppState);

export default function create_app_state(): AppState {
  const metadata = useStateObject<MetadataJson | null>(null);
  const filters = useStateObject<FilterState | null>(null);
  const result_set = useStateObject<string | null>(null);
  const selected_image_key = useStateObject<string | null>(null);
  const gamma = useStateObject<GammaState>({
    active: false,
    exponent: 1.0,
  });
  const magnifier = useStateObject<MagnifierState>({
    active: false,
    zoom_multiplier: 1.0,
    center: { x: 200, y: 200 },
    natural_size: null,
    viewport_size: null,
  });
  const table = useStateObject<TableState>({
    sort_by: "model_name",
    sort_direction: "ascending",
    current_page: 1,
  });
  const image_elements = useStateObject<ImageElementState>({
    natural: null,
    synthesized: null,
  });

  // Fetch the metadata, and populate the initial filters state
  useEffect(() => {
    const url = new URL(`${DATA_URL_BASE}/metadata.json`, window.location.href);
    (async () => {
      log(`Fetching metadata from ${url}`);
      const response = await fetch(url);
      const metadata_ = (await response.json()) as MetadataJson;
      log(`Metadata:`, metadata_);

      // Filter out all metamers with gamma correction
      metadata_.metamers = metadata_.metamers.filter(
        (image) => !image.gamma_corrected
      );

      const metamers: StudyImage[] = metadata_.metamers;

      // Hash all the images
      for (const image of metamers) {
        image.__hash = get_image_hash(image);
      }

      // Populate filter options state using all values of each field
      const initial_filter_state: FilterState = {};
      // For each filter_id, create an object with all possible values
      // and set them to true
      for (const filter_id of FILTER_IDS) {
        // Create a set of all values for this filter
        const filter_values = Array.from(
          new Set(metamers.map((image) => image[filter_id as Field]))
        );
        // All values start out `true`
        const active_filters: { [k: string]: true } = Object.fromEntries(
          filter_values.map((v) => [v, true])
        );
        initial_filter_state[filter_id as Field] = active_filters;
      }

      metadata.set(metadata_);
      filters.set(initial_filter_state);
    })();
  }, []);

  // If our filters update, reset the current page to 1
  useEffect(() => {
    table.set((d) => ({ ...d, current_page: 1 }));
  }, [filters.value]);

  // When the result set changes, update the filters based on filtered data
  useEffect(() => {
    if (!result_set.value) return;
    if (!filters.value) return;
    const metamers = metadata.value?.metamers ?? [];
    const selected = RESULT_SETS.find((d) => d.label === result_set.value);
    if (!selected) return;
    log(`Selected result set:`, selected.label);
    const new_filter_state = {
      ...turn_on_all_filters(filters.value),
      ...selected.filters,
    };
    // Filter all the metamers by the selected result set
    const filtered_metamers: StudyImage[] = filter_metamers(
      metamers,
      selected.filters
    );
    // Update selected filters based on available values
    for (const filter_id of [
      "scaling",
      "target_image",
      "initialization_type",
    ]) {
      const available_values = new Set(
        filtered_metamers.map((image) => image[filter_id as Field].toString())
      );
      log(`Available values for ${filter_id}`, available_values);
      for (const filter_value of Object.keys(new_filter_state[filter_id])) {
        new_filter_state[filter_id][filter_value] =
          available_values.has(filter_value);
      }
    }
    log(`New filter state:`, new_filter_state);
    filters.set(new_filter_state);
  }, [result_set.value]);

  // Get filtered rows from current filter state
  const filtered_rows = useMemo<StudyImage[]>(() => {
    if (!metadata.value) return [];
    if (!filters.value) return [];
    const metamers = metadata.value?.metamers ?? [];
    const filtered_metamers: StudyImage[] = filter_metamers(
      metamers,
      filters.value
    );
    return filtered_metamers;
  }, [metadata.value, filters.value]);

  const sorted_rows = useMemo<StudyImage[]>(() => {
    const { sort_direction, sort_by } = table.value;
    const sort_func =
      sort_direction === "ascending" ? d3.ascending : d3.descending;
    return d3.sort(filtered_rows, (a, b) => sort_func(a[sort_by], b[sort_by]));
  }, [filtered_rows, table.value]);

  const page_start = (table.value.current_page - 1) * PAGE_SIZE;

  const page_end = page_start + PAGE_SIZE;

  const paginated_rows = useMemo<StudyImage[]>(() => {
    // Slice the rows to the current page
    return sorted_rows.slice(page_start, page_end);
  }, [sorted_rows, page_start, page_end]);

  const selected_image = useMemo<StudyImage | undefined>(() => {
    const metamers = metadata.value?.metamers ?? [];
    return metamers.find(
      (image: StudyImage) => image.__hash === selected_image_key.value
    );
  }, [selected_image_key.value, metadata.value]);

  const selected_natural_image = useMemo<StudyImage | undefined>(() => {
    const natural_images: StudyImage[] = metadata.value?.natural_images ?? [];
    return natural_images.find(
      (d) => d.target_image === selected_image?.target_image
    );
  }, [selected_image?.target_image, metadata.value]);

  useEffect(() => {
    log(`Filters`, filters.value);
  }, [filters.value]);

  return {
    metadata,
    filters,
    result_set,
    sorted_rows,
    selected_image_key,
    page_start,
    page_end,
    paginated_rows,
    selected_image,
    selected_natural_image,
    gamma,
    magnifier,
    table,
    image_elements,
  };
}
