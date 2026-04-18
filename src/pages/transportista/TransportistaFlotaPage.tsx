import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { inputClass, labelClass } from '@/lib/formStyles'

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
  const [saving, setSaving] = useState(false)

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
    setRows((data ?? []) as FlotaRow[])
  }, [sb])

  useEffect(() => {
    void load()
  }, [load])

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setMsg('')
    if (!sb) return
    const { data: s } = await sb.auth.getSession()
    const uid = s.session?.user?.id
    if (!uid) return
    const fd = new FormData(form)
    const tipo = String(fd.get('tipo_unidad') ?? '')
    const placas = String(fd.get('placas') ?? '').trim().toUpperCase()
    if (!tipo || !placas) {
      setMsg('Tipo de unidad y placas son obligatorios.')
      return
    }
    setSaving(true)
    const { error } = await sb.from('flota_unidades').insert({
      user_id: uid,
      tipo_unidad: tipo,
      placas,
      numero_economico: String(fd.get('numero_economico') ?? '').trim() || null,
    })
    setSaving(false)
    if (error) {
      setMsg(error.message)
      return
    }
    form.reset()
    await load()
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-800">Mi flota</h1>
      <p className="mb-8 text-sm text-slate-600">
        Añade las unidades que operas en la red. El equipo las verá en el panel de administración.
      </p>

      <div className="mb-10 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Agregar unidad</h2>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(ev) => void onAdd(ev)}>
          <div>
            <label className={labelClass}>Tipo de unidad</label>
            <select name="tipo_unidad" required className={inputClass}>
              <option value="">Selecciona…</option>
              <option value="caja-seca">Caja seca</option>
              <option value="plataforma">Plataforma / flatbed</option>
              <option value="refrigerado">Refrigerado</option>
              <option value="rabon">Rabón / torton</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Placas</label>
            <input name="placas" required className={`${inputClass} uppercase`} placeholder="ABC-12-34" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Número económico (opcional)</label>
            <input name="numero_economico" className={inputClass} placeholder="Eco-1024" />
          </div>
          {msg && <p className="text-sm text-red-600 sm:col-span-2">{msg}</p>}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Añadir a la flota'}
            </button>
          </div>
        </form>
      </div>

      <h2 className="mb-3 text-lg font-bold text-slate-800">Unidades registradas</h2>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Aún no añades unidades. Usa el formulario de arriba.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
