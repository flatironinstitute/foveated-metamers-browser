import "./style.css";

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
}

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

let Images: Image[];
let NaturalImages: Image[];
let Selects: FieldMap<HTMLSelectElement>;
let Input: HTMLInputElement;
let Label: HTMLLabelElement;
let Tab: HTMLTableSectionElement;
let Img: HTMLImageElement;
let NatImg: HTMLImageElement;
let SelectedRow: undefined | HTMLTableRowElement;
let FootCel: HTMLTableCellElement;

const Field_descriptions: FieldMap<string> = {
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

const Fields: Field[] = Object.keys(Field_descriptions) as Field[];

const errorContainer: HTMLElement = document.getElementById("errcon");
const errorMsg: HTMLElement = document.getElementById("errmsg");

function fieldMap<T>(g: (field: Field) => T): FieldMap<T> {
  const r: FieldMap<T> = <any>{};
  let f: Field;
  for (f of Fields) r[f] = g(f);
  return r;
}

function getNaturalImage(img: Image): undefined | Image {
  return NaturalImages.find((i) => {
    let f: Field;
    for (f of Fields) if (f in i && i[f] != img[f]) return false;
    return true;
  });
}

function setImgSrc(img: HTMLImageElement, src: undefined | Image) {
  img.src = src ? Data_root + src.file : "";
}

function selectImage(
  row: undefined | HTMLTableRowElement,
  img: undefined | Image
) {
  setImgSrc(Img, img);
  setImgSrc(NatImg, img && getNaturalImage(img));
  if (SelectedRow) {
    SelectedRow.classList.remove("bg-teal-100");
  }
  if (SelectedRow == row) {
    row.classList.add("bg-teal-100");
  }
}

function populateTable(retry = false): undefined {
  const filter: {
    [Property in keyof Metadata]?: Set<string>;
  } = {};
  let f: Field;
  for (f of Fields) {
    const sel = Selects[f];
    const opts: Set<string> = new Set();
    for (const o of sel.options)
      if (o.selected && !o.classList.contains("hidden")) opts.add(o.value);
    if (opts.size) filter[f] = opts;
  }

  const vals = fieldMap(() => new Set());
  const match = Images.filter((i) => {
    for (const f of Fields) {
      const s = i[f].toString();
      vals[f].add(s);
      if (filter[f] && !filter[f].has(s)) return false;
    }
    return true;
  });

  for (f in Selects) {
    const sel = Selects[f];
    for (const o of sel.options) {
      o.classList.toggle("hidden", !vals[f].has(o.value));
    }
  }

  const matches = match.length;
  if (matches == 0 && !retry) {
    /* should only happen when leftward selections have invalidated rightward ones;
        retry taking into account hidden options */
    return populateTable(true);
  }

  /* only show first 20 matches */
  // TODO: Add paginate?
  match.splice(20);
  Tab.innerHTML = "";
  for (const i of match) {
    const row = Tab.insertRow(-1);
    row.classList.add("border", "border-gray-200", "p-4");
    for (f of Fields) {
      const td = row.insertCell(-1);
      td.innerText = i[f].toString();
      td.classList.add(
        "px-4",
        "py-2",
        "whitespace-nowrap",
        "text-sm",
        "text-gray-500"
      );
    }
    row.onclick = () => selectImage(row, i);
  }

  SelectedRow = undefined;
  selectImage(Tab.rows[0], match[0]);

  if (matches == 1) {
    FootCel.textContent = "";
  } else {
    FootCel.textContent = `${matches} matching images`;
    FootCel.classList.add("border", "font-semibold", "border-gray-200", "p-4");
  }
}

function genericCompare(a: any, b: any) {
  return a - b || (a < b ? -1 : a > b ? 1 : 0);
}

function buildTable() {
  const table = <HTMLTableElement>document.getElementById("table");
  table.innerHTML = "";
  const thead = table.createTHead();
  thead.classList.add("bg-gray-50");
  const namerow = thead.insertRow(-1);
  const selrow = thead.insertRow(-1);
  selrow.classList.add("border", "p-4");
  // Build Filter Form
  const filterform = <HTMLTableElement>document.getElementById("filterform");
  filterform.innerHTML = "";

  let i = 0;
  for (const f of Fields) {
    // Title row
    const name = namerow.insertCell(-1);
    name.innerText = f.replace("_", " ");
    name.title = Field_descriptions[f];
    name.classList.add(
      f,
      "px-4",
      "py-2",
      "text-left",
      "text-xs",
      "font-bold",
      "text-gray-900",
      "uppercase",
      "tracking-wider"
    );


    // Build Filter
    const vals = new Set();
    for (const i of Images) vals.add(i[f]);
    console.log(vals);
    // Start with pb-6 class then add py-6 class
    if (f !=='random_seed') {
      const filtDiv = document.createElement("div");
      filtDiv.id = f;
      const padding = i > 0 ? 'py-6' : 'pb-6';
      filtDiv.classList.add(
        "border-b",
        "border-gray-200",
        padding
      );
      const displayName = f.replace("_", "&nbsp;")
      filtDiv.innerHTML = `<h3 class="-my-3 flow-root">
        <button type="button" class="py-3 bg-white w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-500"
        name="plusminus">
          <span class="font-medium text-xs text-gray-900 uppercase">${f.replace("_", "&nbsp;")}</span>
          <span class="ml-6 flex items-center">
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            <svg class="h-5 w-5 hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clip-rule="evenodd" />
            </svg>
          </span>
        </button>
      </h3>`;
      const optionsContainer = document.createElement("div");
      optionsContainer.id = "filter-section-" + i;
      //  TODO Fix this default for wonky closing on selection
      optionsContainer.classList.add('pt-6');
      const options = document.createElement('div');
      options.classList.add("space-y-4");

       Array.from(vals).sort(genericCompare).forEach((v, i) => {
        console.log(v, i);
        const optFlex = document.createElement('div');
        optFlex.classList.add('flex', 'items-center');
        const labelfor = `filter-${f.toString()}-${i}`;
        const inpt = document.createElement('input');
        inpt.id = labelfor;
        inpt.setAttribute("type", "checkbox");
        inpt.classList.add(
          'h-4', 'w-4', 'border-gray-300', 'rounded', 'text-indigo-600', 'focus:ring-indigo-500'
        );
        const lbl = document.createElement('Label');
        lbl.setAttribute('for', labelfor);
        lbl.classList.add('ml-3', 'text-sm', 'text-gray-600');
        lbl.innerHTML = v.toString();
        optFlex.appendChild(inpt);
        optFlex.appendChild(lbl);
        options.appendChild(optFlex);
      });

      optionsContainer.appendChild(options);
      filtDiv.appendChild(optionsContainer);
      filterform.appendChild(filtDiv);
    }

    // Selection Row
    const sel = document.createElement("select");
    sel.name = f;
    sel.classList.add(
      f,
      "px-4",
      "py-2",
      "text-left",
      "text-xs",
      "text-gray-900",
      "uppercase",
      "tracking-wider"
    );
    sel.multiple = true;
    selrow.insertCell(-1).append(sel);
    sel.onchange = () => populateTable();
    // const vals = new Set();
    // for (const i of Images) vals.add(i[f]);
    for (const v of Array.from(vals).sort(genericCompare))
      sel.options.add(new Option(v.toString(), <string>v));
    Selects[f] = sel;
    i++;
  }

  // Create Table Body
  Tab = table.createTBody();
  Tab.classList.add("bg-white", "divide-y", "divide-gray-200");

  // Add Footer
  const foot = table.createTFoot();
  const footrow = foot.insertRow(-1);
  footrow.classList.add("border-b", "border-gray-200", "bg-gray-50");
  FootCel = footrow.insertCell(-1);
  FootCel.classList.add(
    "px-4",
    "py-2",
    "text-left",
    "text-xs",
    "font-bold",
    "text-gray-900",
    "uppercase",
    "tracking-wider"
  );
  FootCel.colSpan = Fields.length;

  populateTable();
}

function init(metadata: MetadataJson) {
  Images = metadata.metamers;
  NaturalImages = metadata.natural_images;
  Selects = <any>{};
  Input = <HTMLInputElement>document.createElement('input');
  Label = <HTMLLabelElement>document.createElement('label');
  Img = <HTMLImageElement>document.getElementById("img");
  NatImg = <HTMLImageElement>document.getElementById("natimg");

  buildTable();
}

async function loadMetadata() {
  const res = await fetch(Data_root + "metadata.json");
  if (res.ok) {
    const body: MetadataJson = await res.json();
    init(body);
  } else {
    errorMsg.textContent = "Unable to retrieve metadata.";
    errorContainer.classList.remove("hidden");
    console.error("Error retrieving metadata", res);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  console.log("we ready baby 🎸 🎸");
  loadMetadata();

  const buttons = Array.from(document.getElementsByName('plusminus'))

  buttons.forEach((b,i) => {
    b.addEventListener('click', () => {
      const svgs = Array.from(b.lastElementChild.children);
      svgs.forEach(sv => sv.classList.toggle('hidden'));
      const fdropdown = document.getElementById(`filter-section-${i}`);
      fdropdown.classList.toggle('hidden');
    });
  })
});
