import * as XLSX from 'xlsx'

function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, '').slice(0, 31) || 'Datos'
}

export function adminExportFilename(base: string): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  const slug = base.replace(/\.xlsx$/i, '').replace(/\s+/g, '-')
  return `${slug}-${stamp}.xlsx`
}

/** Exporta una tabla simple a XLSX y dispara la descarga en el navegador. */
export function downloadAdminXlsx(params: {
  fileBaseName: string
  sheetName: string
  headers: string[]
  rows: (string | number | boolean | null | undefined)[][]
}): void {
  const aoa: (string | number | boolean)[][] = [
    params.headers,
    ...params.rows.map((row) => row.map((c) => (c === null || c === undefined ? '' : c))),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(params.sheetName))
  const fname = adminExportFilename(params.fileBaseName)
  XLSX.writeFile(wb, fname)
}
