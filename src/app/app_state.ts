"use client";

import type {
  MetadataJson,
  Image,
  Field,
  FilterState,
  FilterID,
  StateObject,
  FieldMap,
} from "./types";
import type { Dimensions } from "./useResizeObserver";
import { useEffect, useMemo, useState } from "react";
import { sort, ascending } from "d3-array";

export const DATA_URL_BASE = process.env.NEXT_PUBLIC_DATA_URL;

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

export const FILTER_IDS: FilterID[] = FIELDS.filter(
  (d): d is FilterID => d !== "random_seed"
);

export const PAGE_SIZE = 25;

const INITIAL_FILTER_STATE = Object.fromEntries(
  FILTER_IDS.map((filter_id) => [filter_id, {}])
) as FilterState;

export function log(...args: any[]) {
  console.log(`🖼️`, ...args);
}

function get_image_hash(image: Image) {
  let string = ``;
  const keys = Object.keys(image).filter((d) => d !== "__hash");
  for (const key of sort(keys, ascending)) {
    const value = image[key as keyof Image];
    string += value?.toString() + "_";
  }
  return string;
}

function useStateObject<T>(initial_value: T): StateObject<T> {
  const [value, set] = useState<T>(initial_value);
  return { value, set };
}

export interface AppState {
  metadata: StateObject<MetadataJson | null>;
  filters: StateObject<FilterState | null>;
  current_page: StateObject<number>;
  selected_image_key: StateObject<string | null>;
  page_start: number;
  page_end: number;
  filtered_rows: Image[];
  paginated_rows: Image[];
  selected_image: Image | undefined;
  selected_natural_image: Image | undefined;
  use_gamma: StateObject<boolean>;
  gamma_exponent: StateObject<number>;
  current_image_natural_size: StateObject<{
    width: number;
    height: number;
  } | null>;
  image_viewport_size: StateObject<Dimensions | null>;
  use_zoom: StateObject<boolean>;
}

export default function create_app_state(): AppState {
  const metadata = useStateObject<MetadataJson | null>(null);
  const filters = useStateObject<FilterState | null>(null);
  const current_page = useStateObject<number>(1);
  const selected_image_key = useStateObject<string | null>(null);
  const use_gamma = useStateObject<boolean>(false);
  const gamma_exponent = useStateObject<number>(1.0);
  const current_image_natural_size = useStateObject<{
    width: number;
    height: number;
  } | null>(null);
  const image_viewport_size = useStateObject<Dimensions | null>(null);
  const use_zoom = useStateObject<boolean>(false);

  // Fetch the metadata, and populate the initial filters state
  useEffect(() => {
    const url = new URL(DATA_URL_BASE + "metadata.json");
    (async () => {
      log(`Fetching metadata from ${url}`);
      const response = await fetch(url);
      const metadata_ = (await response.json()) as MetadataJson;
      log(`Metadata:`, metadata_);

      const metamers: Image[] = metadata_.metamers;

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

  const page_start = (current_page.value - 1) * PAGE_SIZE;
  const page_end = page_start + PAGE_SIZE;

  const paginated_rows = useMemo<Image[]>(() => {
    // Slice the rows to the current page
    return filtered_rows.slice(page_start, page_end);
  }, [filtered_rows, page_start, page_end]);

  // If our filters update, reset the current page to 1
  useEffect(() => {
    current_page.set(1);
  }, [filters.value]);

  const selected_image = useMemo<Image | undefined>(() => {
    const metamers = metadata.value?.metamers ?? [];
    return metamers.find(
      (image: Image) => image.__hash === selected_image_key.value
    );
  }, [selected_image_key.value, metadata.value]);

  const selected_natural_image = useMemo<Image | undefined>(() => {
    const natural_images: Image[] = metadata.value?.natural_images ?? [];
    return natural_images.find(
      (d) => d.target_image === selected_image?.target_image
    );
  }, [selected_image?.target_image, metadata.value]);

  return {
    metadata,
    filters,
    filtered_rows,
    current_page,
    selected_image_key,
    page_start,
    page_end,
    paginated_rows,
    selected_image,
    selected_natural_image,
    use_gamma,
    gamma_exponent,
    current_image_natural_size,
    image_viewport_size,
    use_zoom,
  };
}
