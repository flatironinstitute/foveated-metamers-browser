"use client";

import type { FilterID, Field } from "./types";
import { useContext, useState } from "react";
import * as d3 from "./d3";
import {
  AppContext,
  FILTER_IDS,
  FIELDS,
  FIELD_DESCRIPTIONS,
} from "./app_state";

function SVGPlus() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SVGMinus() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

type FilterOptionProps = {
  id: string;
  filter_id: FilterID;
  value: string;
};

function FilterOption({ id, filter_id, value }: FilterOptionProps) {
  const filters = useContext(AppContext).filters;
  const filter_state = filters.value?.[filter_id] ?? {};
  const filter_is_checked = filter_state[value];

  return (
    <div className="flex items-center">
      <input
        id={id}
        value={value}
        type="checkbox"
        checked={filter_is_checked}
        className="h-4 w-4 border-gamma-300 rounded text-indigo-600 focus:ring-indigo-500"
        onChange={(event) => {
          filters.set((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              [filter_id]: {
                ...(prev[filter_id] ?? {}),
                [value]: event.target.checked,
              },
            };
          });
        }}
      />
      <label htmlFor={id} className="ml-3 text-sm text-gamma-600">
        {value?.toString()}
      </label>
    </div>
  );
}

function genericCompare(a: any, b: any) {
  return a - b || (a < b ? -1 : a > b ? 1 : 0);
}

function Filter({ id: filter_id }: { id: FilterID }) {
  const [hidden, set_hidden] = useState(true);

  const filter_state = useContext(AppContext).filters.value?.[filter_id] ?? {};

  const filter_values_sorted: string[] = d3.sort(
    Object.keys(filter_state),
    genericCompare
  );

  const filter_options: Array<FilterOptionProps> = filter_values_sorted.map(
    (value, index) => {
      return {
        id: `filter-${filter_id}-${index}`,
        filter_id,
        value,
      };
    }
  );

  return (
    <div className="border-b border-gamma-200 pb-6">
      <h3 className="-my-3 flow-root">
        <button
          type="button"
          data-filter={filter_id}
          className="py-3 bg-white w-full flex items-center justify-between text-sm text-neutral-400 hover:text-neutral-500"
          name="plusminus"
          onClick={() => set_hidden((h) => !h)}
        >
          <span className="font-medium text-xs text-neutral-900 uppercase text-left">
            {filter_id.replaceAll("_", " ")}
          </span>
          <span className="ml-6 flex items-center">
            {hidden ? <SVGPlus /> : <SVGMinus />}
          </span>
        </button>
      </h3>
      <div
        className={`pt-6 ${hidden && `hidden`}`}
        id={`filter-options-${filter_id}`}
      >
        <div className="space-y-4">
          {filter_options.map((option) => (
            <FilterOption
              key={option.id}
              id={option.id}
              filter_id={option.filter_id}
              value={option.value}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Filters() {
  return (
    <form className="block" id="filterform">
      {FILTER_IDS.map((filter_id) => (
        <Filter id={filter_id} key={filter_id} />
      ))}
    </form>
  );
}

function TableHead() {
  return (
    <thead className="bg-neutral-50">
      <tr>
        {FIELDS.map((field) => (
          <th
            key={field}
            scope="col"
            className="target_image px-4 py-2 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider"
            title={FIELD_DESCRIPTIONS[field]}
          >
            {field.replaceAll("_", " ")}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function TableBody() {
  const context = useContext(AppContext);
  const paginated_rows = context?.paginated_rows ?? [];
  return (
    <tbody className="bg-white divide-y divide-neutral-200">
      {paginated_rows.map((row) => {
        const selected = context?.selected_image_key.value === row.__hash;
        return (
          <tr
            key={row.__hash}
            className={`cursor-pointer border border-neutral-200 p-4 ${
              selected ? `bg-indigo-100` : ``
            }`}
            onClick={() => {
              if (typeof row.__hash === "undefined") {
                console.error(`Row has no hash: ${JSON.stringify(row)}`);
              } else {
                context?.selected_image_key.set(row.__hash);
              }
            }}
          >
            {FIELDS.map((field_id: Field) => (
              <td
                key={field_id}
                className="px-4 py-2 whitespace-nowrap text-xs text-neutral-500"
              >
                {row[field_id].toString()}
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
  const filtered_rows = context?.filtered_rows ?? [];
  const page_start = context?.page_start ?? 0;
  const page_end = context?.page_end ?? 0;
  const format_commas = d3.format(`,`);
  return (
    <nav className="border-t border-gamma-200 px-4 flex items-center justify-between sm:px-0">
      <div className="-mt-px w-0 flex-1 flex">
        <PrevNext
          disabled={page_start <= 0}
          onClick={() => {
            context?.current_page.set((p) => p - 1);
          }}
        >
          <SVGLeftArrow />
          Previous
        </PrevNext>
      </div>
      <div className="hidden md:-mt-px md:flex">
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
            context?.current_page.set((p) => p + 1);
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
    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8 rounded">
      <div className="overflow-hidden rounded">
        <table
          id="table"
          className="min-w-full divide-y divide-gamma-200 border border-gamma-200 rounded"
        >
          <TableHead />
          <TableBody />
        </table>
        <Pagination />
      </div>
    </div>
  );
}

export default function TableAndFilters() {
  return (
    <section
      aria-labelledby="data-table"
      className="max-w-auto mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 bg-white"
    >
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-x-8 gap-y-10 pt-6">
        <Filters />
        <div className="lg:col-span-5">
          <div className="flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <Table />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
