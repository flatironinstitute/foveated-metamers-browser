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
  [key: string]: boolean;
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
  get_filter_value: (filter_id: Field, filter_value: string) => boolean;
  get_filter_values: (filter_id: Field) => { [filter_value: string]: boolean };
  set_filter_value: (
    filter_id: Field,
    filter_value: string,
    value: boolean
  ) => void;
  set_filter_values: (
    filter_id: Field,
    filter_values: { [filter_value: string]: boolean }
  ) => void;
  toggle_all_filters: (filter_id: Field, value: boolean) => void;
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
      [create_filter_key("model_name", model_name)]: true,
      [create_filter_key("psychophysics_comparison", psychophysics_comparison)]:
        true,
      [create_filter_key("downsampled", downsampled.toString())]: true,
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

function filter_metamers(
  metamers: StudyImage[],
  filters: { [key: string]: boolean }
) {
  const filter_ids = Object.keys(filters).map(
    (k) => unpack_filter_key(k).filter_id
  );
  const filtered_metamers: StudyImage[] = metamers.filter(
    (image: StudyImage) => {
      let keep = true;
      for (const filter_id of filter_ids) {
        if (!(filter_id in image)) {
          console.log(`Filter ${filter_id} not in image`, image);
          continue;
        }
        const image_value = image[filter_id as Field];
        const value_as_string = image_value.toString();
        const key = create_filter_key(filter_id as Field, value_as_string);
        if (!filters[key]) {
          keep = false;
          break;
        }
      }
      return keep;
    }
  );
  return filtered_metamers;
}

function create_filter_key(filter_id: Field, filter_key: string) {
  return `${filter_id}____${filter_key}`;
}

function unpack_filter_key(key: string): {
  filter_id: string;
  filter_key: string;
} {
  const [filter_id, filter_key] = key.split("____");
  return { filter_id, filter_key };
}

function useStateObject<T>(initial_value: T): StateObject<T> {
  const [value, set] = useState<T>(initial_value);
  return { value, set };
}

export const AppContext: Context<AppState> = createContext({} as AppState);

export default function create_app_state(): AppState {
  const metadata = useStateObject<MetadataJson | null>(null);
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

  const filters = useStateObject<{ [filter_id: string]: boolean }>({});
  const filters_available = useRef<Set<string>>(new Set());

  const get_filter_value = (filter_id: Field, filter_key: string): boolean => {
    return filters.value?.[create_filter_key(filter_id, filter_key)] ?? false;
  };

  const get_filter_values = (
    filter_id: Field
  ): { [filter_key: string]: boolean } => {
    const out: { [filter_key: string]: boolean } = {};
    for (const [key, value] of Object.entries(filters.value)) {
      const { filter_id: this_filter_id, filter_key } = unpack_filter_key(key);
      if (this_filter_id !== filter_id) continue;
      out[filter_key] = value;
    }
    return out;
  };

  const set_filter_value = (
    filter_id: Field,
    filter_key: string,
    value: boolean
  ) => {
    filters.set((prev) => ({
      ...prev,
      [create_filter_key(filter_id, filter_key)]: value,
    }));
  };

  const set_filter_values = (
    filter_id: Field,
    filter_values: { [filter_key: string]: boolean }
  ) => {
    filters.set((prev) => {
      const out = { ...prev };
      for (const filter_key of Object.keys(filter_values)) {
        out[create_filter_key(filter_id, filter_key)] =
          filter_values[filter_key];
      }
      return out;
    });
  };

  const toggle_all_filters = (filter_id: Field, value: boolean) => {
    filters.set((prev) => {
      const out = { ...prev };
      for (const key of Object.keys(prev)) {
        const { filter_id: this_filter_id } = unpack_filter_key(key);
        if (this_filter_id !== filter_id) continue;
        out[key] = value;
      }
      return out;
    });
  };

  const get_initial_filters = (): FilterState => {
    const all_filter_keys = Array.from(filters_available.current.values());
    const initial_filters = Object.fromEntries(
      all_filter_keys.map((v) => [v, true])
    );
    return initial_filters;
  };

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
      for (const filter_id of FILTER_IDS) {
        // Create a set of all values for this filter
        const filter_values = Array.from(
          new Set(metamers.map((image) => image[filter_id as Field]))
        );
        filter_values.forEach((filter_key) => {
          filters_available.current.add(
            create_filter_key(filter_id, filter_key.toString())
          );
        });
      }

      // Set initial filters
      filters.set(get_initial_filters());

      metadata.set(metadata_);
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
    log(`Selected filters:`, selected.filters);
    // Filter all the metamers by the selected result set
    const filtered_metamers: StudyImage[] = filter_metamers(
      metamers,
      selected.filters
    );
    // log(`Filtered metamers:`, filtered_metamers.length);
    const new_filter_state = {
      ...get_initial_filters(),
      ...selected.filters,
    };
    // Update selected filters based on available values
    for (const filter_id of [
      "scaling",
      "target_image",
      "initialization_type",
    ]) {
      const available_values = new Set(
        filtered_metamers.map((image) => image[filter_id as Field].toString())
      );
      // log(`Available values for ${filter_id}`, available_values);
      for (const key of Object.keys(new_filter_state)) {
        const unpacked = unpack_filter_key(key);
        if (unpacked.filter_id !== filter_id) continue;
        new_filter_state[key] = available_values.has(unpacked.filter_key);
      }
    }
    // log(`New filter state:`, new_filter_state);
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
    get_filter_value,
    get_filter_values,
    set_filter_value,
    set_filter_values,
    toggle_all_filters,
  };
}
