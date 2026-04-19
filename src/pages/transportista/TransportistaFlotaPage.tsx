import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSupabase } from '@/lib/supabase'

type FlotaRow = {
  id: string
  created_at: string
  tipo_unidad: string
  placas: string
  numero_economico: string | null
}

export function TransportistaFlotaPage() {
  const sb = getSupabase()
  const [rows, setRows] = useState<FlotaRow[]>([])
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    if (!sb) return
    const { data, error } = await sb
      .from('flota_unidades')
      .select('id, created_at, tipo_unidad, placas, numero_economico')
      .order('created_at', { ascending: false })
    if (error) {
      setMsg(error.message)
      return
    }
    setMsg('')
    setRows((data ?? []) as FlotaRow[])
  }, [sb])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-slate-800">Mi flota</h1>
          <p className="max-w-xl text-sm text-slate-600">
            Listado de las unidades que tienes registradas. Operaciones las usa al asignarte servicios; en{' '}
            <Link to="/panel/transportista/viajes" className="font-semibold text-blue-600 underline-offset-2 hover:underline">
              Mis viajes
            </Link>{' '}
            verás con qué unidad te asignaron cada entrega.
          </p>
        </div>
        <Link
          to="/panel/transportista/agregar-vehiculo"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
        >
          Agregar vehículo
        </Link>
      </div>

      {msg && <p className="mb-4 text-sm text-red-600">{msg}</p>}

      <h2 className="mb-3 text-lg font-bold text-slate-800">Unidades registradas</h2>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          <p className="mb-3">Aún no tienes vehículos en tu flota.</p>
          <Link
            to="/panel/transportista/agregar-vehiculo"
            className="font-semibold text-blue-600 underline-offset-2 hover:underline"
          >
            Agregar tu primer vehículo
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Placas</th>
                <th className="px-4 py-3">Económico</th>
                <th className="px-4 py-3">Alta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{r.tipo_unidad}</td>
                  <td className="px-4 py-3 font-medium">{r.placas}</td>
                  <td className="px-4 py-3 text-slate-600">{r.numero_economico ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {new Date(r.created_at).toLocaleDateString('es-MX')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
