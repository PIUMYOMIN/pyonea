import React from "react";
import { ChevronUpDownIcon, CubeIcon } from "@heroicons/react/24/outline";

const ProductManagementTable = ({
  products = [],
  columns = [],
  sortKey = null,
  onSort,
  emptyState,
}) => {
  const sortable = typeof onSort === "function";

  return (
    <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${column.align === "right" ? "text-right" : "text-left"} px-6 py-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider ${column.sortable && sortable ? "cursor-pointer" : ""}`}
                  onClick={() => column.sortable && sortable ? onSort(column.sortKey || column.key) : undefined}
                >
                  <div className={`flex items-center ${column.align === "right" ? "justify-end" : ""}`}>
                    {column.header}
                    {column.sortable && (
                      <ChevronUpDownIcon className={`ml-1 h-4 w-4 ${sortKey === (column.sortKey || column.key) ? "text-green-600 dark:text-green-400" : ""}`} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {products.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-slate-400">
                  {emptyState || (
                    <div className="flex flex-col items-center">
                      <CubeIcon className="h-16 w-16 text-gray-400 dark:text-slate-600 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No products found</h3>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  {columns.map((column) => (
                    <td
                      key={`${product.id}-${column.key}`}
                      className={`${column.align === "right" ? "text-right" : "text-left"} px-6 py-4 text-sm text-gray-600 dark:text-slate-300 ${column.nowrap === false ? "" : "whitespace-nowrap"}`}
                    >
                      {column.render(product)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductManagementTable;
