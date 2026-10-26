import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Loader2,
} from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchKey?: keyof T | ((row: T) => string);
  defaultPageSize?: number;
  exportFileName?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchPlaceholder = 'Search...',
  searchKey,
  defaultPageSize = 10,
  exportFileName = 'export.csv',
  emptyMessage = 'No records found.',
  onRowClick,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // 1. Filter data by search
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();

    return data.filter((row) => {
      if (typeof searchKey === 'function') {
        return searchKey(row).toLowerCase().includes(term);
      }
      if (searchKey && row[searchKey] !== undefined) {
        return String(row[searchKey]).toLowerCase().includes(term);
      }
      // Fallback: search across all string fields
      return Object.values(row).some((val) =>
        typeof val === 'string' || typeof val === 'number'
          ? String(val).toLowerCase().includes(term)
          : false
      );
    });
  }, [data, searchTerm, searchKey]);

  // 2. Sort data
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
      if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortOrder]);

  // 3. Paginate data
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Handle Sort Click
  const handleSort = (key: string) => {
    if (sortField === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortField(null);
        setSortOrder('asc');
      }
    } else {
      setSortField(key);
      setSortOrder('asc');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (sortedData.length === 0) return;

    // Collect headers from columns that have accessorKey
    const exportCols = columns.filter((c) => c.accessorKey);
    const headers = exportCols.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');

    const rows = sortedData.map((row) =>
      exportCols
        .map((c) => {
          const val = row[c.accessorKey as string];
          if (val === null || val === undefined) return '""';
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', exportFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-500 text-light-text dark:text-dark-text"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleExportCSV}
            disabled={sortedData.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-light-border dark:border-dark-border bg-white dark:bg-dark-card hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-dark-card/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-light-border dark:border-dark-border">
              <tr>
                {columns.map((col, idx) => {
                  const key = String(col.accessorKey || idx);
                  const isSorted = sortField === key;
                  return (
                    <th
                      key={key}
                      onClick={() => col.sortable && col.accessorKey && handleSort(String(col.accessorKey))}
                      className={`py-3 px-4 ${col.sortable ? 'cursor-pointer select-none hover:text-brand-600' : ''} ${col.className || ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-slate-400">
                            {isSorted ? (
                              sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-brand-600" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-brand-600" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-60" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-600 mx-auto mb-2" />
                    <span className="text-xs">Loading data...</span>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400 text-xs">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rIdx) => (
                  <tr
                    key={row.id || row.uid || rIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                      onRowClick ? 'cursor-pointer' : ''
                    }`}
                  >
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className={`py-3 px-4 ${col.className || ''}`}>
                        {col.cell
                          ? col.cell(row)
                          : col.accessorKey
                          ? String(row[col.accessorKey] ?? '')
                          : null}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && sortedData.length > 0 && (
          <div className="p-3 border-t border-light-border dark:border-dark-border bg-slate-50/50 dark:bg-dark-card/30 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, sortedData.length)}</span> of{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{sortedData.length}</span> entries
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataTable;
