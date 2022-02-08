const Data_root = "data/";

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

type FieldMap<T> = {
  [Property in keyof Metadata]: T;
};

var Images: Image[];
var Selects: FieldMap<HTMLSelectElement>;
var Img: HTMLImageElement;
var Info: HTMLSpanElement;

const Field_descriptions: FieldMap<string> = {
  model_name: "The model used to synthesize this image.",
  downsampled: "Whether the image was downsampled before synthesis.",
  psychophysics_comparison: "The experimental comparison(s) this image was used in.",
  target_image: "The natural image whose model representation this metamer was synthesized to match.",
  scaling: "The model's scaling parameter used to synthesize this image.",
  initialization_type: "The image used to initialize metamer synthesis fo this image.",
  random_seed: "The number used to set pytorch and numpy's random number generators for synthesis.",
  gamma_corrected: "Whether this image has been gamma corrected (to 2.2?)."
};

function fieldMap<T>(g: (field: Field) => T): FieldMap<T> {
  const r: FieldMap<T> = <any>{};
  let f: Field;
  for (f in Field_descriptions)
    r[f] = g(f);
  return r;
}

function select(ev: Event) {
  populate(<Field>(<HTMLSelectElement>ev.target).name);
}

function populate(changed: undefined|Field) {
  const filter = fieldMap(f => {
    const sel = Selects[f];
    const opts = new Set();
    for (let o of sel.options)
      if (o.selected)
        opts.add(o.value);
    return opts.size ? opts : undefined;
  });

  const match = Images.filter(i => {
    let f: Field;
    for (f in filter)
      if (filter[f] && !filter[f].has(i[f].toString()))
        return false;
    return true;
  });
  if (match.length == 1) {
    Info.textContent = "";
    Img.src = Data_root+match[0].file;
  } else {
    Info.textContent = `${match.length} matching images`;
    Img.src = "";
  }
}

function genericCompare(a: any, b: any) {
  return a - b || (a < b ? -1 : a > b ? 1 : 0);
}

function init(images: Image[]) {
  Images = images;
  let f: Field;
  Selects = <any>{};
  const seldiv = document.getElementById("filter");
  var html = "";
  for (f in Field_descriptions) {
    html += `
      <span id="filter-${f}">
        <label title="${Field_descriptions[f]}">
          ${f}
          <select name="${f}" multiple></select>
        </label>
      </span>
    `;
  }
  seldiv.innerHTML = html;

  for (f in Field_descriptions) {
    const sel = <HTMLSelectElement>document.getElementsByName(f)[0];
    Selects[f] = sel;
    sel.onchange = select;

    const vals = new Set();
    for (let i of Images)
      vals.add(i[f]);
    for (let v of Array.from(vals).sort(genericCompare))
      sel.options.add(new Option(v.toString(), <string>v));
  }

  Img = <HTMLImageElement>document.getElementById("img");
  Info = <HTMLSpanElement>document.getElementById("info");
}

function loadMetadata() {
  fetch(Data_root+"metadata.json")
    .then(res => res.json())
    .then(init);
}

(<any>window).load = loadMetadata;
