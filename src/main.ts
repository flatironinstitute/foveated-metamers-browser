import './style.css';

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

type MetadataJson = {
  metamers: Image[];
  natural_images: Image[];
};

type FieldMap<T> = {
  [Property in keyof Metadata]: T;
};

var Images: Image[];
var NaturalImages: Image[];
var Selects: FieldMap<HTMLSelectElement>;
var Tab: HTMLTableSectionElement;
var Info: HTMLTableCellElement;
var Img: HTMLImageElement;
var NatImg: HTMLImageElement;

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

const Fields: Field[] = Object.keys(Field_descriptions) as Field[];

function fieldMap<T>(g: (field: Field) => T): FieldMap<T> {
  const r: FieldMap<T> = <any>{};
  let f: Field;
  for (f of Fields)
    r[f] = g(f);
  return r;
}

function select(ev: Event) {
  populate(<Field>(<HTMLSelectElement>ev.target).name);
}

function getNaturalImage(img: Image): undefined|Image {
  return NaturalImages.find(i => {
    let f: Field;
    for (f of Fields)
      if (f in i && i[f] != img[f])
        return false;
    return true
  });
}

function setImgSrc(img: HTMLImageElement, src: undefined|Image) {
  img.src = src ? Data_root+src.file : "";
}

function viewImage(img: undefined|Image) {
  setImgSrc(Img, img);
  setImgSrc(NatImg, img && getNaturalImage(img));
}

function populate(changed: Field=undefined) {
  const filter: {
    [Property in keyof Metadata]?: Set<string>;
  } = {};
  for (let f of Fields) {
    const sel = Selects[f];
    const opts: Set<string> = new Set();
    for (let o of sel.options)
      if (o.selected)
        opts.add(o.value);
    if (opts.size)
      filter[f] = opts;
  }

  const match = Images.filter(i => {
    let f: Field;
    for (f in filter)
      if (!filter[f].has(i[f].toString()))
        return false;
    return true;
  });

  const matches = match.length;
  match.splice(20);

  Tab.innerHTML = "";
  for (let i of match) {
    const row = Tab.insertRow(-1);
    row.classList.add('border', 'border-slate-200','p-1');
    for (let f of Fields)
      row.insertCell(-1).innerText = i[f].toString();
    row.onclick = () => viewImage(i);
  }

  if (matches == 1) {
    Info.textContent = "";
    viewImage(match[0]);
  } else {
    Info.textContent = `${matches} matching images`;
    viewImage(null);
  }
}

function genericCompare(a: any, b: any) {
  return a - b || (a < b ? -1 : a > b ? 1 : 0);
}

function init(metadata: MetadataJson) {
  Images = metadata.metamers;
  NaturalImages = metadata.natural_images;
  Selects = <any>{};
  const table = <HTMLTableElement>document.getElementById("table");
  table.innerHTML = "";
  const thead = table.createTHead();
  const namerow = thead.insertRow(-1);
  namerow.classList.add('border', 'border-slate-300', 'p-1');
  const selrow = thead.insertRow(-1);
  selrow.classList.add('border', 'border-slate-300', 'p-1');
  for (let f of Fields) {
    const name = namerow.insertCell(-1);
    name.innerText = f;
    name.title = Field_descriptions[f];
    const sel = document.createElement("select");
    sel.name = f;
    sel.multiple = true;
    selrow.insertCell(-1).append(sel);
    sel.onchange = select;
    const vals = new Set();
    for (let i of Images)
      vals.add(i[f]);
    for (let v of Array.from(vals).sort(genericCompare))
      sel.options.add(new Option(v.toString(), <string>v));
    Selects[f] = sel;
  }

  Tab = table.createTBody();
  Info = table.createTFoot().insertRow(-1).insertCell(-1);
  Info.colSpan = Fields.length;
  Img = <HTMLImageElement>document.getElementById("img");
  NatImg = <HTMLImageElement>document.getElementById("natimg");

  populate();
}

function loadMetadata() {
  fetch(Data_root+"metadata.json")
    .then(res => res.json())
    .then(init);
}

(<any>window).load = loadMetadata;
