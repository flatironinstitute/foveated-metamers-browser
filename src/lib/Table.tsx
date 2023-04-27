"use client";

import type { Field } from "./main";
import { useContext, useState, useEffect } from "react";
import * as d3 from "./d3";
import {
  AppContext,
  FILTER_IDS,
  FIELD_DESCRIPTIONS,
  PAGE_SIZE,
  TABLE_COLUMNS,
  RESULT_SETS,
} from "./main";
import { Slider } from "./utils";

type CheckboxChipProps = {
  filter_id: Field;
  filter_key: string;
};

function CheckboxChip({ filter_id, filter_key }: CheckboxChipProps) {
  const context = useContext(AppContext);
  const filter_is_checked = context.get_filter_value(filter_id, filter_key);

  const id = `filter-${filter_id}-${filter_key}`;

  return (
    <div className="flex items-center cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={filter_is_checked}
        className="hidden"
        onChange={(event) => {
          context.set_filter_value(filter_id, filter_key, event.target.checked);
        }}
      />
      <label
        aria-checked={filter_is_checked}
        htmlFor={id}
        className="text-sm cursor-pointer rounded-xl bg-slate-200 opacity-40 px-2 aria-checked:opacity-100"
      >
        {filter_key?.toString()}
      </label>
    </div>
  );
}

function CheckBoxes({ id: filter_id }: { id: Field }): JSX.Element {
  const context = useContext(AppContext);
  const filter_state = context.get_filter_values(filter_id);

  const filter_values_sorted: string[] = d3.sort(
    Object.keys(filter_state),
    d3.ascending
  );

  const filter_options: Array<CheckboxChipProps> = filter_values_sorted.map(
    (filter_key) => {
      return {
        filter_id,
        filter_key,
      };
    }
  );

  return (
    <div
      className="flex flex-wrap gap-x-2 gap-y-2 items-center"
      data-filter={filter_id}
      id={`filter-options-${filter_id}`}
    >
      {filter_options.map((option) => (
        <CheckboxChip
          key={`filter-${option.filter_id}-${option.filter_key}`}
          filter_id={option.filter_id}
          filter_key={option.filter_key}
        />
      ))}
    </div>
  );
}

function RangeSlider({ id: filter_id }: { id: Field }): JSX.Element | null {
  const context = useContext(AppContext);
  const filter_state = context.get_filter_values(filter_id);

  const filter_keys_sorted: number[] = d3.sort<number>(
    Object.keys(filter_state).map((d) => +d)
  );

  const min = +(d3.min(filter_keys_sorted, (d) => +d)?.toFixed(1) ?? 0);
  const max = +(d3.max(filter_keys_sorted, (d) => +d)?.toFixed(1) ?? 1.5);

  const current_true_keys = filter_keys_sorted.filter(
    (key) => filter_state[key]
  );

  // Get the minimum key of filter_state with a value of `true`
  const from = d3.min(current_true_keys) ?? min;
  const to = d3.max(current_true_keys) ?? max;

  const handle_change = (value_internal: number, type: "from" | "to") => {
    const index = d3.bisectLeft(filter_keys_sorted, value_internal);
    const target_value = filter_keys_sorted[index];
    let from_value = type === "from" ? target_value : from;
    let to_value = type === "to" ? target_value : to;
    if (type === "from" && from_value > to_value) to_value = from_value;
    if (type === "to" && to_value < from_value) from_value = to_value;
    const new_filter_state: { [k: string]: boolean } = { ...filter_state };
    for (const key of filter_keys_sorted) {
      if (+key >= from_value && +key <= to_value) {
        new_filter_state[key.toString()] = true;
      } else {
        new_filter_state[key.toString()] = false;
      }
    }
    context.set_filter_values(filter_id, new_filter_state);
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: `8ch 1fr` }}>
      <div>From:</div>
      <Slider
        id={`${filter_id}-from`}
        min={min}
        max={max}
        step="0.001"
        format={d3.format(`.3f`)}
        value={+from}
        onChange={(evt) => {
          const value = evt.target.valueAsNumber;
          handle_change(value, "from");
        }}
      />
      <div>To:</div>
      <Slider
        id={`${filter_id}-to`}
        min={min}
        max={max}
        step="0.001"
        format={d3.format(`.3f`)}
        value={+to}
        onChange={(evt) => {
          const value = evt.target.valueAsNumber;
          handle_change(value, "to");
        }}
      />
    </div>
  );
}

function Filter({ id: filter_id }: { id: Field }): JSX.Element {
  const context = useContext(AppContext);

  const all_none = [true, false].map((value) => {
    return (
      <div
        key={value.toString()}
        className="cursor-pointer text-xs uppercase text-blue-500 underline"
        onClick={() => {
          context.toggle_all_filters(filter_id, value);
        }}
      >
        {value ? "all" : "none"}
      </div>
    );
  });

  const use_slider = filter_id === "scaling";

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex gap-x-2">
        <h3 className="font-bold text-xs text-neutral-900 uppercase text-left whitespace-nowrap">
          {filter_id.replaceAll("_", " ")}
        </h3>
        {use_slider ? null : all_none}
      </div>

      {use_slider ? (
        <RangeSlider id={filter_id} />
      ) : (
        <CheckBoxes id={filter_id} />
      )}
    </div>
  );
}

function ResultSetPicker(): JSX.Element {
  const context = useContext(AppContext);

  const selected_key = context.result_set.value;

  return (
    <div>
      <div className="text-3xl">Result set</div>
      <div className="h-4"></div>
      <div className="flex flex-col gap-y-2">
        {RESULT_SETS.map((option) => (
          <label
            key={option.label}
            className="flex gap-x-2 items-center cursor-pointer text-xl"
          >
            <input
              className="cursor-pointer"
              type="radio"
              name="result-set"
              value={option.label}
              checked={selected_key === option.label}
              onChange={() => context.result_set.set(option.label)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function Filters() {
  return (
    <form className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-y-6">
      <div>
        <ResultSetPicker />
      </div>
      <div>
        <div className="text-3xl">Filters</div>
        <div className="h-4"></div>
        <div className="grid gap-y-8 gap-x-12">
          {FILTER_IDS.map((filter_id) => (
            <Filter id={filter_id} key={filter_id} />
          ))}
        </div>
      </div>
    </form>
  );
}

function TableHead() {
  const context = useContext(AppContext);
  const sort_by = context.table.value.sort_by;
  const sort_direction = context.table.value.sort_direction;

  return (
    <thead className="bg-neutral-50">
      <tr>
        {TABLE_COLUMNS.map((field_id: Field) => {
          const sort_this_field = sort_by === field_id;
          return (
            <th
              key={field_id}
              scope="col"
              className="cursor-pointer px-4 py-2 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider whitespace-nowrap"
              title={FIELD_DESCRIPTIONS[field_id]}
              onClick={() => {
                if (sort_this_field) {
                  context.table.set((d) => ({
                    ...d,
                    sort_direction:
                      d.sort_direction === "ascending"
                        ? "descending"
                        : "ascending",
                  }));
                } else {
                  context.table.set((d) => ({
                    ...d,
                    sort_by: field_id,
                  }));
                }
              }}
            >
              <span>{field_id.replaceAll("_", " ")}</span>
              <span className={sort_this_field ? `` : `invisible`}>
                &ensp;{sort_direction === "ascending" ? "▲" : "▼"}
              </span>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

function TableBody() {
  const context = useContext(AppContext);
  const paginated_rows = context?.paginated_rows ?? [];
  const indices = d3.range(PAGE_SIZE);
  return (
    <tbody className="bg-white divide-y divide-neutral-200">
      {indices.map((index: number) => {
        const row = paginated_rows[index];
        const selected = context?.selected_image_key.value === row?.__hash;
        return (
          <tr
            key={row?.__hash ?? index}
            className={`cursor-pointer border border-neutral-200 p-4 ${
              selected ? `bg-indigo-100` : ``
            }`}
            onClick={() => {
              if (typeof row?.__hash === "undefined") {
                console.error(`Row has no hash: ${JSON.stringify(row)}`);
              } else {
                context?.selected_image_key.set(row?.__hash);
              }
            }}
          >
            {TABLE_COLUMNS.map((field_id: Field) => (
              <td
                key={field_id}
                className="px-4 py-2 whitespace-nowrap text-xs text-neutral-500"
              >
                {row?.[field_id]?.toString() ?? <pre>&nbsp;</pre>}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  );
}

function SVGLeftArrow() {
  return (
    <svg
      className="mr-3 h-5 w-5 text-gamma-400"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SVGRightArrow() {
  return (
    <svg
      className="ml-3 h-5 w-5 text-gamma-400"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PrevNext({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const className =
    "border-t-2 border-transparent pt-4 pr-1 inline-flex items-center font-medium text-xs text-neutral-900 uppercase";
  return (
    <a
      className={`${className} ${
        disabled
          ? "opacity-10"
          : "cursor-pointer hover:text-gamma-700 hover:border-indigo-700"
      }`}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </a>
  );
}

function Pagination() {
  const context = useContext(AppContext);
  const filtered_rows = context?.sorted_rows ?? [];
  const page_start = context?.page_start ?? 0;
  const page_end = context?.page_end ?? 0;
  const format_commas = d3.format(`,`);
  return (
    <nav className="border-t border-gamma-200 px-4 flex items-center justify-between sm:px-0">
      <div className="-mt-px w-0 flex-1 flex">
        <PrevNext
          disabled={page_start <= 0}
          onClick={() => {
            context.table.set((p) => ({
              ...p,
              current_page: p.current_page - 1,
            }));
          }}
        >
          <SVGLeftArrow />
          Previous
        </PrevNext>
      </div>
      <div className="hidden md:flex">
        <p
          id="nowshowing"
          className="font-medium text-xs text-neutral-900 uppercase pt-4 px-4 inline-flex items-center"
        >
          Showing
          <span className="px-2" id="start">
            {format_commas(page_start + 1)}
          </span>
          to
          <span className="px-2" id="end">
            {format_commas(page_end)}
          </span>{" "}
          of
          <span className="px-2" id="total">
            {format_commas(filtered_rows.length)}
          </span>
          results
        </p>
      </div>
      <div className="-mt-px w-0 flex-1 flex justify-end">
        <PrevNext
          disabled={page_end >= filtered_rows.length}
          onClick={() => {
            context.table.set((p) => ({
              ...p,
              current_page: p.current_page + 1,
            }));
          }}
        >
          Next
          <SVGRightArrow />
        </PrevNext>
      </div>
    </nav>
  );
}

function Table() {
  return (
    <>
      <div className="py-2 align-middle inline-block min-w-full rounded">
        <div className="overflow-x-auto rounded">
          <table
            id="table"
            className="min-w-full divide-y divide-gamma-200 border border-gamma-200 rounded"
          >
            <TableHead />
            <TableBody />
          </table>
        </div>
        <Pagination />
      </div>
    </>
  );
}

export default function TableAndFilters() {
  return (
    <section
      aria-labelledby="data-table"
      className="max-w-auto mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 bg-white"
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 pt-6">
        <Filters />
        <Table />
      </div>
    </section>
  );
}
