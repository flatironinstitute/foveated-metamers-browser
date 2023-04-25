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
  [Key in Field]: {
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
