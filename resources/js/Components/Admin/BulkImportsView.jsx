import { useState } from 'react';
import { router } from '@inertiajs/react';
import I from '../Icons';
import DataTable from './DataTable';
import { bulkResultMessage, useServerTable } from './AdminShared';

export default function BulkImportsView({ batches }) {
  const [active, setActive] = useState(null);
  const { server } = useServerTable('bulk_imports', 'bulkImports');

  const columns = [
    { key: 'filename', label: 'Upload', render: (b) => b.filename || `import-${b.id}` },
    { key: 'type', label: 'Section', render: (b) => <span className="adm-tag cat">{b.type}</span> },
    { key: 'created_at', label: 'When', render: (b) => <span style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(b.created_at).toLocaleString()}</span> },
    {
      key: 'status', label: 'Status',
      render: (b) => b.status === 'processing'
        ? <span className="adm-tag yours">Processing…</span>
        : b.status === 'failed'
          ? <span style={{ color: '#c0392b', fontWeight: 700, fontSize: 12.5 }}>Failed</span>
          : <span className="adm-link-ok"><I.check width="13" height="13" /> Completed</span>,
    },
    {
      key: 'result', label: 'Result', sortable: false,
      render: (b) => <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{b.status === 'processing' ? '—' : bulkResultMessage(b)}</span>,
    },
  ];

  return (
    <>
      <div className="adm-head">
        <div><h1>Bulk Uploads</h1><p>History of CSV bulk imports from every section.</p></div>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={() => router.reload({ only: ['bulkImports'] })}><I.upload /> Refresh</button>
      </div>

      {batches.total === 0 ? (
        <div className="adm-panel">
          <div className="adm-empty">
            <I.upload width="42" height="42" />
            <h3>No bulk uploads yet</h3>
            <p>CSV imports from Products, Looks, Videos, Journal, or Occasions will show up here.</p>
          </div>
        </div>
      ) : (
        <div className="adm-panel">
          <DataTable columns={columns} rows={batches.data} getRowId={(b) => b.id} onRowClick={setActive} server={server(batches)} />
        </div>
      )}

      {active && (
        <div className="adm-overlay" onMouseDown={() => setActive(null)}>
          <div className="adm-modal" style={{ width: 'min(760px,98vw)' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>{active.filename || `Import #${active.id}`}</h2>
              <button className="adm-close" onClick={() => setActive(null)}><I.close /></button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0 }}>
                {active.type} · {new Date(active.created_at).toLocaleString()}
              </p>
              {active.status === 'processing' ? (
                <div className="adm-empty" style={{ padding: '30px 20px' }}>
                  <p>Still processing — check back shortly.</p>
                  <button type="button" className="adm-btn adm-btn-ghost sm" onClick={() => router.reload({ only: ['bulkImports'] })}>Refresh</button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13.5 }}>
                    {active.status === 'failed' ? 'This import crashed before it could finish.' : bulkResultMessage(active)}
                  </p>
                  {(active.errors || []).length > 0 && (
                    <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
                      <table className="adm-table">
                        <thead><tr><th>Row</th><th>Item</th><th>Reason</th></tr></thead>
                        <tbody>
                          {active.errors.map((e, i) => (
                            <tr key={i}>
                              <td>{e.row != null ? e.row + 1 : '—'}</td>
                              <td>{e.summary || '—'}</td>
                              <td style={{ color: '#c0392b' }}>{e.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
