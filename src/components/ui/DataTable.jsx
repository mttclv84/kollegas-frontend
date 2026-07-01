import { useState, useMemo } from 'react'
import './DataTable.css'

export default function DataTable({ columns, data, actions, searchable = true, pageSize = 20 }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(row =>
      columns.some(col => {
        const val = col.accessor ? col.accessor(row) : row[col.key]
        return String(val ?? '').toLowerCase().includes(q)
      })
    )
  }, [data, search, columns])

  const sorted = useMemo(() => {
    if (!sortCol) return filtered
    return [...filtered].sort((a, b) => {
      const col = columns.find(c => c.key === sortCol)
      const va = col?.accessor ? col.accessor(a) : a[sortCol]
      const vb = col?.accessor ? col.accessor(b) : b[sortCol]
      const cmp = String(va ?? '').localeCompare(String(vb ?? ''), 'it')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortCol, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key) => {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(key); setSortDir('asc') }
    setPage(1)
  }

  return (
    <div className="datatable">
      {searchable && (
        <div className="datatable-toolbar">
          <input
            className="form-control datatable-search"
            placeholder="Cerca..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <span className="datatable-count">{filtered.length} risultati</span>
        </div>
      )}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                  className={col.sortable !== false ? 'sortable' : ''}
                >
                  {col.label}
                  {sortCol === col.key && <span className="sort-indicator">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>}
                </th>
              ))}
              {actions && <th style={{ width: 1 }}>Azioni</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="empty-cell">Nessun risultato</td></tr>
            ) : paginated.map((row, i) => (
              <tr key={row.id ?? i}>
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : (col.accessor ? col.accessor(row) : row[col.key])}
                  </td>
                ))}
                {actions && <td className="actions-cell">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="datatable-pagination">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
          <span className="page-info">Pagina {page} / {totalPages}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}
    </div>
  )
}
