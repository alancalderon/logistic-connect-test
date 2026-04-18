import { useCallback, useEffect, useState } from 'react'
import { downloadAdminXlsx } from '@/lib/adminExportXlsx'
import { getSupabase } from '@/lib/supabase'
import { formatIngreso } from '@/pages/admin/adminUi'

type FlotaRow = {
  id: string
  created_at: string
  user_id: string
  tipo_unidad: string
  placas: string
  numero_economico: string | null
  perfil_email: string | null
}

export function AdminFlotaPage() {
  const sb = getSupabase()
  const [rows, setRows] = useState<FlotaRow[]>([])
  const [loadErr, setLoadErr] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!sb) return
    const { data: flota, error: e1 } = await sb
      .from('flota_unidades')
      .select('id, created_at, user_id, tipo_unidad, placas, numero_economico')
      .order('created_at', { ascending: false })
    if (e1) {
      setLoadErr(e1.message)
      return
    }
    const list = flota ?? []
    const ids = [...new Set(list.map((f) => f.user_id).filter(Boolean))]
    let emailMap = new Map<string, string>()
    if (ids.length) {
      const { data: profs, error: e2 } = await sb.from('profiles').select('id, email').in('id', ids)
      if (!e2 && profs) {
        emailMap = new Map(profs.map((p) => [String(p.id), p.email ? String(p.email) : '']))
      }
    }
    setLoadErr('')
    setRows(
      list.map((f) => ({
        id: String(f.id),
        created_at: String(f.created_at),
        user_id: String(f.user_id),
        tipo_unidad: String(f.tipo_unidad ?? ''),
        placas: String(f.placas ?? ''),
        numero_economico: f.numero_economico != null ? String(f.numero_economico) : null,
        perfil_email: emailMap.get(String(f.user_id)) ?? null,
      })),
    )
  }, [sb])

  useEffect(() => {
    if (!sb) {
      setLoadErr('La aplicación no está configurada correctamente.')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      await load()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [sb, load])

  function exportFlotaExcel() {
    if (rows.length === 0) return
    downloadAdminXlsx({
      fileBaseName: 'translogix-flota',
      sheetName: 'Flota',
      headers: ['Alta', 'Usuario (correo)', 'User ID', 'Tipo unidad', 'Placas', 'Número económico'],
      rows: rows.map((r) => [
        formatIngreso(r.created_at),
        r.perfil_email ?? '',
        r.user_id,
        r.tipo_unidad,
        r.placas,
        r.numero_economico ?? '',
      ]),
    })
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="mb-2 text-xl font-bold text-slate-800 sm:text-2xl">Flota</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Unidades registradas por transportistas desde su panel (además de la unidad principal en expediente, si
            aplica).
          </p>
        </div>
        {!loading && !loadErr && rows.length > 0 && (
          <button
            type="button"
            onClick={() => exportFlotaExcel()}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-emerald-700/30 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 sm:self-auto"
          >
            <i className="fas fa-file-excel" aria-hidden />
            Descargar Excel
          </button>
        )}
      </div>

      {!sb && <p className="text-amber-800">{loadErr}</p>}
      {loading && sb && <p className="text-slate-500">Cargando…</p>}
      {!loading && loadErr && <p className="text-red-600">{loadErr}</p>}

      {!loading && !loadErr && rows.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Aún no hay unidades en flota.</p>
      )}

      {!loading && !loadErr && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Placas</th>
                <th className="px-4 py-3">Económico</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatIngreso(r.created_at)}</td>
                  <td className="px-4 py-3 text-slate-700">{r.perfil_email ?? r.user_id.slice(0, 8) + '…'}</td>
                  <td className="px-4 py-3">{r.tipo_unidad}</td>
                  <td className="px-4 py-3 font-mono font-medium">{r.placas}</td>
                  <td className="px-4 py-3 text-slate-600">{r.numero_economico ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
