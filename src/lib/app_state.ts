"use client";

import type { Context } from "react";
import type {
  MetadataJson,
  StudyImage,
  Field,
  FilterState,
  StateObject,
  FieldMap,
  Dimensions,
  Position,
} from "./types";
import { useEffect, useMemo, useState, createContext } from "react";
import * as d3 from "./d3";
import { log } from "./utils";

export const AppContext: Context<AppState> = createContext({} as AppState);

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

export const FILTER_IDS: Field[] = FIELDS.filter(
  (d) => d !== "random_seed" && d !== "gamma_corrected"
);

export const TABLE_COLUMNS: Field[] = FIELDS.filter(
  (d: Field) => d !== "gamma_corrected"
);

export const PAGE_SIZE = 25;

const INITIAL_FILTER_STATE = Object.fromEntries(
  FILTER_IDS.map((filter_id) => [filter_id, {}])
) as FilterState;

function get_image_hash(image: StudyImage) {
  let string = ``;
  const keys = Object.keys(image).filter((d) => d !== "__hash");
  for (const key of d3.sort(keys, d3.ascending)) {
    const value = image[key as keyof StudyImage];
    string += value?.toString() + "_";
  }
  return string;
}

function useStateObject<T>(initial_value: T): StateObject<T> {
  const [value, set] = useState<T>(initial_value);
  return { value, set };
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
  target: HTMLImageElement | null;
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
  selected_image_key: StateObject<string | null>;
  filtered_rows: StudyImage[];
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

export default function create_app_state(): AppState {
  const metadata = useStateObject<MetadataJson | null>(null);
  const filters = useStateObject<FilterState | null>(null);
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
    target: null,
    synthesized: null,
  });
  const sort_by = useStateObject<Field>("model_name");
  const sort_direction = useStateObject<"ascending" | "descending">(
    "ascending"
  );

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
      const next_filter_state: FilterState = INITIAL_FILTER_STATE;
      // For each filter_id, create an object with all possible values
      // and set them to true
      const entries = Object.entries(next_filter_state);
      for (const [filter_id, filter_values] of entries) {
        // Create a set of all values for this filter
        const filter_values = Array.from(
          new Set(metamers.map((image) => image[filter_id as Field]))
        );
        // All values start out `true`
        const active_filters: { [k: string]: true } = Object.fromEntries(
          filter_values.map((v) => [v, true])
        );
        next_filter_state[filter_id as Field] = active_filters;
      }

      metadata.set(metadata_);
      filters.set(next_filter_state);
    })();
  }, []);

  // Get filtered rows from current filter state
  const filtered_rows = useMemo<StudyImage[]>(() => {
    if (!metadata.value) return [];
    if (!filters.value) return [];
    const metamers_unsorted = metadata.value?.metamers ?? [];
    const sort_func =
      sort_direction.value === "ascending" ? d3.ascending : d3.descending;
    const metamers_sorted = d3.sort(metamers_unsorted, (a, b) =>
      sort_func(a[sort_by.value], b[sort_by.value])
    );
    const filter_state = filters.value;
    const filtered_metamers = metamers_sorted.filter((image: StudyImage) => {
      let keep = true;
      for (const filter_id of Object.keys(filter_state)) {
        if (!(filter_id in image)) {
          console.log(`Filter ${filter_id} not in image`, image);
          continue;
        }
        const image_value = image[filter_id as Field];
        const value_as_string = image_value.toString();
        // The current filter state for this filter_id and value
        const this_filter_state =
          filter_state?.[filter_id as Field]?.[value_as_string];
        if (!this_filter_state) {
          keep = false;
          break;
        }
      }
      return keep;
    });

    return filtered_metamers;
  }, [metadata.value, filters.value, sort_by.value, sort_direction.value]);

  const page_start = (table.value.current_page - 1) * PAGE_SIZE;
  const page_end = page_start + PAGE_SIZE;

  const paginated_rows = useMemo<StudyImage[]>(() => {
    // Slice the rows to the current page
    return filtered_rows.slice(page_start, page_end);
  }, [filtered_rows, page_start, page_end]);

  // If our filters update, reset the current page to 1
  useEffect(() => {
    table.set((d) => ({ ...d, current_page: 1 }));
  }, [filters.value]);

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

  return {
    metadata,
    filters,
    filtered_rows,
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
