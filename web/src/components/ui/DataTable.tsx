import React from "react";

interface Column {
  key: string;
  header: string;
  mono?: boolean;
  align?: "left" | "right";
}

interface DataTableProps {
  columns: Column[];
  rows: Record<string, React.ReactNode>[];
  rowKey: (row: Record<string, React.ReactNode>, i: number) => string;
  caption?: string;
  onRowClick?: (row: Record<string, React.ReactNode>) => void;
}

/** Dense ops table shell: sticky header, mono cells, row hover. */
export default function DataTable({ columns, rows, rowKey, caption, onRowClick }: DataTableProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0D1326] overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-xs min-w-[640px]">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0">
            <tr className="bg-[#0F162E] border-b border-slate-800 text-left">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium whitespace-nowrap ${
                    c.align === "right" ? "text-right" : ""
                  }`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-slate-800/60 last:border-0 transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-violet-950/30" : "hover:bg-slate-800/20"
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 text-slate-300 whitespace-nowrap ${
                      c.mono ? "font-mono text-[11px]" : ""
                    } ${c.align === "right" ? "text-right" : ""}`}
                  >
                    {row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
