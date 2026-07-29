import { useEffect, useMemo, useState } from 'react';
import I from '../Icons';

const DEFAULT_PAGE_SIZES = [20, 50, 100, 200];

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * The one table every admin list view is built on: sorting, pagination, a
 * configurable page size, and a toolbar slot for section-specific actions
 * (bulk import, "New X", search, etc).
 *
 * Two modes:
 * - Client mode (default): pass the full `rows` array — sorting/paging happens
 *   in the browser against data already loaded.
 * - Server mode: pass a `server` prop and `rows` should be just the current
 *   page as returned by the backend. The component renders rows as given (no
 *   local sort/slice) and calls back to `server.onPageChange` /
 *   `server.onPerPageChange` / `server.onSortChange` so the caller can re-fetch
 *   from the controller. Use this when the full dataset is too large/heavy to
 *   ship to the browser in one shot.
 *
 * columns: [{ key, label, sortable?, align?, width?, sortValue?(row), render?(row) }]
 * rows: array of records (current page, in server mode)
 * getRowId: (row) => string|number, defaults to row.id
 * toolbar: ReactNode rendered above the table, left-aligned action area
 * server?: { page, perPage, total, lastPage, sort: {key,dir}|null, loading?,
 *            onPageChange(page), onPerPageChange(size), onSortChange({key,dir}|null) }
 */
export default function DataTable({
  columns,
  rows,
  getRowId = (row) => row.id,
  toolbar = null,
  defaultSort = null,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  defaultPageSize = 20,
  emptyState = null,
  onRowClick = null,
  server = null,
}) {
  const isServer = !!server;

  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(defaultPageSize);
  const [localSort, setLocalSort] = useState(defaultSort);

  const sort = isServer ? server.sort : localSort;

  const sorted = useMemo(() => {
    if (isServer || !sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const getValue = col?.sortValue || ((row) => row[sort.key]);
    const dir = sort.dir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => dir * compareValues(getValue(a), getValue(b)));
  }, [isServer, rows, sort, columns]);

  const total = isServer ? server.total : sorted.length;
  const pageSize = isServer ? server.perPage : localPageSize;
  const pageCount = isServer ? Math.max(1, server.lastPage) : Math.max(1, Math.ceil(total / pageSize));
  const page = isServer ? server.page : localPage;
  const safePage = Math.min(page, pageCount);

  // Client mode only: keep state in sync so a later render (e.g. page size change) starts from a valid page.
  useEffect(() => { if (!isServer && page !== safePage) setLocalPage(safePage); }, [isServer, safePage]);

  const start = (safePage - 1) * pageSize;
  const pageRows = isServer ? rows : sorted.slice(start, start + pageSize);

  const toggleSort = (key) => {
    const next = (() => {
      if (!sort || sort.key !== key) return { key, dir: 'asc' };
      if (sort.dir === 'asc') return { key, dir: 'desc' };
      return null;
    })();

    if (isServer) {
      server.onSortChange(next);
    } else {
      setLocalPage(1);
      setLocalSort(next);
    }
  };

  const goToPage = (p) => {
    if (isServer) server.onPageChange(p);
    else setLocalPage(p);
  };

  const setPageSizeValue = (n) => {
    if (isServer) {
      server.onPerPageChange(n);
    } else {
      setLocalPageSize(n);
      setLocalPage(1);
    }
  };

  return (
    <div className={'dtbl' + (isServer && server.loading ? ' dtbl-loading' : '')}>
      {toolbar && <div className="dtbl-toolbar">{toolbar}</div>}
      <div className="dtbl-scroll">
        <table className="dtbl-table">
          <thead>
            <tr>
              {columns.map((c) => {
                const sortable = c.sortable !== false;
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    className={sortable ? 'dtbl-sortable' : ''}
                    style={{ textAlign: c.align || 'left', width: c.width }}
                    onClick={sortable ? () => toggleSort(c.key) : undefined}
                  >
                    <span className="dtbl-th-inner">
                      {c.label}
                      {sortable && (
                        active
                          ? (sort.dir === 'asc' ? <I.sortUp /> : <I.sortDown />)
                          : <I.sortNone />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr className="dtbl-empty-row">
                <td colSpan={columns.length}>
                  {emptyState || <div className="adm-empty" style={{ padding: '32px 0' }}><p style={{ margin: 0 }}>No records.</p></div>}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={getRowId(row)}
                  className={onRowClick ? 'dtbl-clickable' : ''}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} style={{ textAlign: c.align || 'left' }}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="dtbl-foot">
          <div className="dtbl-pagesize">
            <label htmlFor="dtbl-page-size">Rows per page</label>
            <select id="dtbl-page-size" value={pageSize} onChange={(e) => setPageSizeValue(Number(e.target.value))}>
              {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="dtbl-summary">{total === 0 ? 0 : start + 1}–{Math.min(start + pageSize, total)} of {total}</div>
          <div className="dtbl-pager">
            <button type="button" className="adm-icon" disabled={safePage <= 1} onClick={() => goToPage(1)} aria-label="First page"><I.chevronsLeft /></button>
            <button type="button" className="adm-icon" disabled={safePage <= 1} onClick={() => goToPage(safePage - 1)} aria-label="Previous page"><I.chevronLeft /></button>
            <span className="dtbl-page-ind">Page {safePage} of {pageCount}</span>
            <button type="button" className="adm-icon" disabled={safePage >= pageCount} onClick={() => goToPage(safePage + 1)} aria-label="Next page"><I.chevronRight /></button>
            <button type="button" className="adm-icon" disabled={safePage >= pageCount} onClick={() => goToPage(pageCount)} aria-label="Last page"><I.chevronsRight /></button>
          </div>
        </div>
      )}
    </div>
  );
}
