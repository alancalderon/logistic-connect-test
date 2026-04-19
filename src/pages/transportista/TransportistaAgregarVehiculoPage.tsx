import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabase } from '@/lib/supabase'
import { inputClass, labelClass } from '@/lib/formStyles'

export function TransportistaAgregarVehiculoPage() {
  const sb = getSupabase()
  const navigate = useNavigate()
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setMsg('')
    if (!sb) {
      setMsg('No hay conexión con el servidor.')
      return
    }
    const { data: s } = await sb.auth.getSession()
    const uid = s.session?.user?.id
    if (!uid) {
      setMsg('No hay sesión activa.')
      return
    }
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
    navigate('/panel/transportista/flota', { replace: false })
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-800">Agregar vehículo</h1>
      <p className="mb-2 text-sm text-slate-600">
        Registra una unidad de tu operación. El equipo de administración la verá al asignarte servicios y podrá elegirla
        para cada viaje.
      </p>
      <p className="mb-8 text-sm text-slate-600">
        Para ver solo tus unidades ya dadas de alta, abre{' '}
        <Link to="/panel/transportista/flota" className="font-semibold text-blue-600 underline-offset-2 hover:underline">
          Mi flota
        </Link>
        .
      </p>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar vehículo'}
            </button>
            <Link
              to="/panel/transportista/flota"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver a Mi flota
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
