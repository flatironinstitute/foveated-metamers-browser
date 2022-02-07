const Data_root = "data/";

const Field_descriptions = {
  model_name: "The model used to synthesize this image.",
  downsampled: "Whether the image was downsampled before synthesis.",
  psychophysics_comparison: "The experimental comparison(s) this image was used in.",
  target_image: "The natural image whose model representation this metamer was synthesized to match.",
  scaling: "The model's scaling parameter used to synthesize this image.",
  initialization_type: "The image used to initialize metamer synthesis fo this image.",
  random_seed: "The number used to set pytorch and numpy's random number generators for synthesis.",
  gamma_corrected: "Whether this image has been gamma corrected (to 2.2?)."
};

interface Metadata {
  model_name: string;
  downsampled: boolean;
  psychophysics_comparison: string;
  target_image: string;
  scaling: number;
  initialization_type: string;
  random_seed: number;
  gamma_corrected: boolean;
};

type Field = keyof Metadata;

type Image = Metadata & {
  file: string;
};

var Images: Image[];

function init(images: Image[]) {
  Images = images;
  let f: Field;
  for (f in Field_descriptions) {
    const vals = new Set();
    for (let r of Images)
      vals.add(r[f]);
    const sel = <HTMLSelectElement>document.getElementsByName(f)[0];
    sel.options.add(new Option("", "", true, true));
    for (let v of vals)
      sel.options.add(new Option(String(v)));
  }
}

function loadMetadata() {
  fetch(Data_root+"metadata.json")
    .then(res => res.json())
    .then(init);
}

loadMetadata();
