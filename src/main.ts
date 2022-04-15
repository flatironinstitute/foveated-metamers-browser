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
let Checks: FieldMap<Array<HTMLInputElement>>;
let Inputs: FieldMap<HTMLInputElement>;
let Tab: HTMLTableSectionElement;
let Img: HTMLImageElement;
let NatImg: HTMLImageElement;
let SelectedRow: undefined | HTMLTableRowElement;
let FootLeft: HTMLTableCellElement;
let FootRight: HTMLTableCellElement;
let Page: number | 0;

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

function paginate(matches:typeof Images) {
  const start = Page * 24;
  return matches.slice(start, start + 24);
}

function setImgDetail(Img: HTMLImageElement, NatImg: HTMLImageElement) {
  // Options for canvas_image_detail objects.
  const options = {
    panel_width_factor: 0.4,
    screen_min: 400,
  }
  // Create the detail image views using the canvas_image_detail jQueryUI plugin.
  console.log(options, Img, NatImg);
  // const top_detail = top_display.canvas_image_detail(options);
  // const bottom_detail = bottom_display.canvas_image_detail(options);

  // // Load the image URL into the image detail views.
  // top_detail.load_image_url(url);
  // bottom_detail.load_image_url(url);

  // // Synchronize zoom and pan.
  // top_detail.sync_with(bottom_detail);
  // bottom_detail.sync_with(top_detail);
}

function setFilename(src: undefined | Image) {
  const fileprops : Array<keyof Image> = ['file', 'target_image', 'scaling'];
  fileprops.forEach((prop: keyof Image) => {
    const p = <HTMLElement>document.getElementById(prop);
    p.innerHTML = "";
    if (src && src[prop]) {
      p.innerText = src[prop].toString();
    } else {
      p.innerText = "File data not found";
    }
  })
}

function selectImage(
  row: undefined | HTMLTableRowElement,
  img: undefined | Image
) {
  setImgSrc(Img, img);
  setImgSrc(NatImg, img && getNaturalImage(img));
  setImgDetail(Img, NatImg);
  setFilename(img);
  if (SelectedRow) {
    SelectedRow.classList.remove("bg-indigo-100");
  } else {
    SelectedRow = row;
    row.classList.add("bg-indigo-100");
  }
}

function populateTable(retry = false): undefined {
  const filter: {
    [Property in keyof Metadata]?: Set<string>;
  } = {};
  let f: Field;
  for (f of Fields) {
    const sel = Checks[f];
    const opts: Set<string> = new Set();
    if (sel) {
      sel.forEach((o) => {
        if (o.checked && !o.classList.contains("hidden")) {
          opts.add(o.value);
        }
      });
    } else {
      console.log('no f', f);
    }

    if (opts.size) {
      filter[f] = opts;
    }
  }

  const vals = fieldMap(() => new Set());
  const match = Images.filter((i) => {
    for (const f of Fields) {
      const s = i[f].toString();
      vals[f].add(s);
      if (filter[f] && !filter[f].has(s)) {
        return false;
      }
    }
    return true;
  });

  if (match.length == 0 && !retry) {
    /* should only happen when leftward selections have invalidated rightward ones;
        retry taking into account hidden options */
    return populateTable(true);
  }

  const matches = paginate(match);
  Tab.innerHTML = "";
  for (const i of matches) {
    const row = Tab.insertRow(-1);
    row.classList.add("border", "border-neutral-200", "p-4");
    for (f of Fields) {
      const td = row.insertCell(-1);
      td.innerText = i[f].toString();
      td.classList.add(
        "px-4",
        "py-2",
        "whitespace-nowrap",
        "text-xs",
        "text-neutral-500"
      );
    }
    row.onclick = () => selectImage(row, i);
  }

  SelectedRow = undefined;
  selectImage(Tab.rows[0], matches[0]);

  const chunks:number = Math.ceil(match.length / 24);
  const chunk:number = Page * 24;

  if (chunks <= 1) {
    FootLeft.textContent = "";
  } else {
    FootLeft.textContent = `Showing ${chunk > 0 ? chunk - 24 : 1} to ${chunk > 0 ? chunk : 24} of ${match.length} results`;
    FootRight.innerHTML = `<div class="flex-1 flex justify-between sm:justify-end">
      <a href="#" class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"> Previous </a>
      <a href="#" class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"> Next </a>
      </div>`
  }

  // Set Filter Toggles
  setFilterListeners();
}

function genericCompare(a: any, b: any) {
  return a - b || (a < b ? -1 : a > b ? 1 : 0);
}

function buildFilters(f: Field, first: boolean, filterform: HTMLFormElement){
  // Build Filter
  const vals = new Set();
  for (const im of Images) {
    vals.add(im[f]);
  }

  // TODO: Add tag to indicate hidden table attributes
  const filtDiv = document.createElement("div");
  filtDiv.id = f;
  // Start with pb-6 class then add py-6 class
  const padding = first ?  'pb-6' : 'py-6';
  filtDiv.classList.add(
    "border-b",
    "border-neutral-200",
    padding
  );
  const filtName = f == 'psychophysics_comparison' ? 'psychophysics<br/>comparison' : f.replace("_", "&nbsp;");
  filtDiv.innerHTML = `<h3 class="-my-3 flow-root">
    <button type="button" data-filter=${f} class="py-3 bg-white w-full flex items-center justify-between text-sm text-neutral-400 hover:text-neutral-500"
    name="plusminus">
      <span class="font-medium text-xs text-neutral-900 uppercase text-left">${filtName}</span>
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
  optionsContainer.id = "filter-section-" + f;
  //  TODO: Fix this default for wonky closing on selection
  optionsContainer.classList.add('pt-6', 'hidden');
  const options = document.createElement('div');
  options.classList.add("space-y-4");

  const checkboxes = Array.from(vals).sort(genericCompare).map((v, c) => {
    // Container flexbox
    const optFlex = document.createElement('div');
    optFlex.classList.add('flex', 'items-center');
    const labelfor = `filter-${f.toString()}-${c}`;
    // Checkbox
    const inpt = document.createElement('input');
    inpt.id = labelfor;
    inpt.setAttribute("type", "checkbox");
    inpt.value = v.toString();
    inpt.checked = true;
    inpt.classList.add(
      'h-4', 'w-4', 'border-neutral-300', 'rounded', 'text-indigo-600', 'focus:ring-indigo-500'
    );
    inpt.onchange = () => populateTable();
    // Label
    const lbl = document.createElement('label');
    lbl.setAttribute('for', labelfor);
    lbl.classList.add('ml-2', 'text-xs', 'text-neutral-600');
    lbl.innerHTML = v.toString();
    optFlex.appendChild(inpt);
    optFlex.appendChild(lbl);
    options.appendChild(optFlex);

    return inpt;
  })
  Checks[f] = checkboxes;

  optionsContainer.appendChild(options);
  filtDiv.appendChild(optionsContainer);
  filterform.appendChild(filtDiv);

}

function buildTable() {
  const table = <HTMLTableElement>document.getElementById("table");
  table.innerHTML = "";
  const thead = table.createTHead();
  thead.classList.add("bg-neutral-50");
  const namerow = thead.insertRow(-1);
  const selrow = thead.insertRow(-1);
  selrow.classList.add("border", "p-4");

  // Build Filter Form
  const filterform = <HTMLFormElement>document.getElementById("filterform");
  filterform.innerHTML = "";

  Fields.forEach((f, i) => {
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
      "text-neutral-900",
      "uppercase",
      "tracking-wider"
    );

    if (f !== 'random_seed') {
      buildFilters(f, i < 1, filterform);
    }

  });

  // Create Table Body
  Tab = table.createTBody();
  Tab.classList.add("bg-white", "divide-y", "divide-neutral-200");

  // Add Footer
  const foot = table.createTFoot();
  const footrow = foot.insertRow(-1);
  footrow.classList.add("border-b", "border-neutral-200", "bg-neutral-50");
  FootLeft = footrow.insertCell(0);
  FootLeft.classList.add(
    "px-4",
    "py-3",
    "flex",
    "items-center",
    "justify-between",
    "text-neutral-900",
    "text-xs",
    "sm:px-6",
    "hidden",
    "sm:block",
    "uppercase"
  );
  FootLeft.colSpan = Fields.length / 2;
  FootRight = footrow.insertCell(0);

  populateTable();
}

function initPage(metadata: MetadataJson) {
  Images = metadata.metamers;
  NaturalImages = metadata.natural_images;
  Page = <number>0;
  Checks = <any>{};
  Img = <HTMLImageElement>document.getElementById("img");
  NatImg = <HTMLImageElement>document.getElementById("natimg");

  buildTable();
}

async function loadMetadata() {
  const res = await fetch(Data_root + "metadata.json");
  console.log(Data_root + "metadata.json");
  if (res.ok) {
    const body: MetadataJson = await res.json();
    initPage(body);
  } else {
    errorMsg.textContent = "Unable to retrieve metadata.";
    errorContainer.classList.remove("hidden");
    console.error("Error retrieving metadata", res);
  }
}

function setFilterListeners(){
  const buttons = Array.from(document.getElementsByName('plusminus'));
  buttons.forEach(b => {
    b.addEventListener('click', () => {
      const svgs = Array.from(b.lastElementChild.children);
      svgs.forEach(sv => sv.classList.toggle('hidden'));
      const fdropdown = document.getElementById(`filter-section-${b.dataset.filter}`);
      fdropdown.classList.toggle('hidden');
    });
  })
}

function jumpToPageMatch(page: number){
  console.log(page);
}

function setZoom(){
  const zoomselect = <HTMLSelectElement>document.getElementById('zoom');
  zoomselect.addEventListener('change', function(e) {
    const selected = zoomselect.options[zoomselect.selectedIndex].value;
    const zoom = parseInt(selected);
    console.log("Set Zoom to: ", zoom);
    // TODO: Set Zoom
    // set_position(last_position);
});
}

function setSlider(){
  const slider = <HTMLFormElement>document.getElementById("gamma");
  const output = <HTMLSpanElement>document.getElementById("gamma-description");
  output.innerHTML = slider.value; // Display the default slider value

  // Update the current slider value (each time you drag the slider handle)
  slider.addEventListener('change', function(e){
    output.innerHTML = slider.value;
  });

}

document.addEventListener("DOMContentLoaded", function () {
  loadMetadata();
  setSlider();
  setZoom();
});
