import type { Dispatch, SetStateAction } from "react";

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

export type Image = Metadata & {
  file: string;
  __hash?: string;
};

export type MetadataJson = {
  metamers: Image[];
  natural_images: Image[];
};

export type Field = keyof Metadata;

export type FilterID = keyof Omit<Metadata, "random_seed">;

export type FieldMap<T> = {
  [Property in Field]: T;
};

export type FilterState = {
  [Key in FilterID]: {
    [k: string]: boolean;
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