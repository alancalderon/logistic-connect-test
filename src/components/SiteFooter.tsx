export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-900 px-4 py-12 text-slate-500 sm:px-6 sm:py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 text-center md:flex-row md:gap-0 md:text-left">
        <div className="md:mb-0">
          <span className="text-xl font-bold tracking-tight text-white">
            Trans<span className="text-blue-500">Logix</span>
          </span>
          <p className="mt-2 text-sm">La red logística de Baja California.</p>
        </div>
        <div className="flex items-center justify-center gap-4 text-xl sm:gap-6 md:justify-end">
          <a href="#" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition hover:bg-slate-800 hover:text-white" aria-label="Facebook">
            <i className="fab fa-facebook" />
          </a>
          <a href="#" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition hover:bg-slate-800 hover:text-white" aria-label="LinkedIn">
            <i className="fab fa-linkedin" />
          </a>
          <a href="#" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition hover:bg-slate-800 hover:text-white" aria-label="WhatsApp">
            <i className="fab fa-whatsapp" />
          </a>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl border-t border-slate-800 pt-8 text-center text-xs">
        © {new Date().getFullYear()} TransLogix. Todos los derechos reservados.
      </div>
    </footer>
  )
}
