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
var SelectedRow: undefined|HTMLTableRowElement;

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

const errorContainer: HTMLElement = document.getElementById('errcon');
const errorMsg: HTMLElement = document.getElementById('errmsg');

function fieldMap<T>(g: (field: Field) => T): FieldMap<T> {
  const r: FieldMap<T> = <any>{};
  let f: Field;
  for (f of Fields)
    r[f] = g(f);
  return r;
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

function selectImage(row: undefined|HTMLTableRowElement, img: undefined|Image) {
  setImgSrc(Img, img);
  setImgSrc(NatImg, img && getNaturalImage(img));
  if (SelectedRow)
    SelectedRow.classList.remove("bg-teal-100");
  if (SelectedRow = row)
    row.classList.add("bg-teal-100");
}

function populate(retry: boolean=false): undefined {
  const filter: {
    [Property in keyof Metadata]?: Set<string>;
  } = {};
  let f: Field;
  for (f of Fields) {
    const sel = Selects[f];
    const opts: Set<string> = new Set();
    for (let o of sel.options)
      if (o.selected && !o.classList.contains('hidden'))
        opts.add(o.value);
    if (opts.size)
      filter[f] = opts;
  }

  const vals = fieldMap(() => new Set());
  const match = Images.filter(i => {
    for (let f of Fields) {
      const s = i[f].toString();
      vals[f].add(s);
      if (filter[f] && !filter[f].has(s))
        return false;
    }
    return true;
  });

  for (f in Selects) {
    const sel = Selects[f];
    for (let o of sel.options)
      o.classList.toggle('hidden', !vals[f].has(o.value))
  }

  const matches = match.length;
  if (matches == 0 && !retry)
    /* should only happen when leftward selections have invalidated rightward ones; retry taking into account hidden options */
    return populate(true);

  /* only show first 20 matches */
  match.splice(20);
  Tab.innerHTML = "";
  for (let i of match) {
    const row = Tab.insertRow(-1);
    row.classList.add('border', 'border-slate-200','p-4');
    for (f of Fields)
      row.insertCell(-1).innerText = i[f].toString();
    row.onclick = () => selectImage(row, i);
  }

  SelectedRow = undefined;
  selectImage(Tab.rows[0], match[0]);

  if (matches == 1) {
    Info.textContent = "";
  } else {
    Info.textContent = `${matches} matching images`;
    Info.classList.add('border', 'font-semibold', 'border-slate-200','p-4');
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
  namerow.classList.add('border', 'border-slate-300', 'p-4');
  const selrow = thead.insertRow(-1);
  selrow.classList.add('border', 'border-slate-300', 'p-4');
  for (let f of Fields) {
    const name = namerow.insertCell(-1);
    name.innerText = f;
    name.title = Field_descriptions[f];
    name.classList.add(f, 'p-4', 'font-semibold')
    const sel = document.createElement("select");
    sel.name = f;
    sel.classList.add(f, 'p-4', 'font-semibold')
    sel.multiple = true;
    selrow.insertCell(-1).append(sel);
    sel.onchange = () => populate();
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
  Info.classList.add('p-4', 'text-pink');
  Img = <HTMLImageElement>document.getElementById("img");
  NatImg = <HTMLImageElement>document.getElementById("natimg");

  populate();
}

async function loadMetadata() {
  const res = await fetch(Data_root+"metadata.json"); 
  if (res.ok) {
    const body = await res.json();
    console.table(body);
  } else {
    errorMsg.textContent = "Unable to retrieve metadata."
    errorContainer.classList.remove('hidden');
    console.error("Error retrieving metadata", res);
  }
}

document.addEventListener("DOMContentLoaded", function(event) { 
 console.log('we ready baby 🎸');
 loadMetadata();
});