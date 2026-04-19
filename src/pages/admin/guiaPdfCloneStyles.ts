/**
 * html2canvas (usado por html2pdf.js) no interpreta colores modernos tipo oklab()/oklch() que Tailwind v4 inyecta.
 * En onclone quitamos hojas de estilo del documento clonado, borramos clases Tailwind y aplicamos solo este CSS (hex/rgb).
 */
export const GUIA_PDF_CLONE_CSS = `
#guia-pdf-root {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #334155;
  background-color: #ffffff;
  padding: 16px;
  box-sizing: border-box;
  max-width: 100%;
}
#guia-pdf-root * { box-sizing: border-box; }
[data-guia-header] { margin-bottom: 20px; }
[data-guia-header] h1 {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
  line-height: 1.25;
}
[data-guia-header] p {
  font-size: 12px;
  color: #475569;
  margin: 0;
  line-height: 1.45;
}
[data-guia-nota] {
  border: 1px solid #fcd34d;
  background-color: #fffbeb;
  color: #422006;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.45;
  margin-bottom: 24px;
}
[data-guia-flujo] {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 24px;
  background-color: #ffffff;
}
[data-guia-flujo] h2 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px 0;
}
[data-guia-flujo] ol {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 12px;
  line-height: 1.5;
  color: #334155;
}
[data-guia-flujo] li { margin-bottom: 6px; }
[data-guia-roles] { display: flex; flex-direction: column; gap: 20px; }
[data-guia-bloque] {
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 16px;
  background-color: #f8fafc;
}
[data-guia-bloque] > h2:first-of-type {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  background-color: #e2e8f0;
  color: #1e293b;
  margin: 0 0 12px 0;
}
[data-guia-bloque] > div {
  font-size: 12px;
  line-height: 1.5;
  color: #475569;
}
[data-guia-seccion] { margin-top: 12px; }
[data-guia-seccion] > h3 {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
}
[data-guia-item] {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background-color: #ffffff;
}
[data-guia-item] > p:first-of-type {
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 6px 0;
  font-size: 13px;
}
[data-guia-item] > div {
  font-size: 12px;
  line-height: 1.45;
  color: #475569;
}
[data-guia-item] ul {
  margin: 8px 0 0 0;
  padding-left: 1.1rem;
}
[data-guia-item] li { margin-bottom: 4px; }
#guia-pdf-root strong { color: #0f172a; font-weight: 600; }
[data-guia-footer] {
  text-align: center;
  font-size: 10px;
  color: #64748b;
  margin-top: 28px;
  line-height: 1.4;
}
`.trim()

export function sanitizeGuiaCloneForHtml2Canvas(clonedDoc: Document): void {
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((n) => n.parentNode?.removeChild(n))
  clonedDoc.querySelectorAll('style').forEach((n) => n.parentNode?.removeChild(n))

  const root = clonedDoc.getElementById('guia-pdf-root')
  root?.querySelectorAll('*').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.removeAttribute('class')
    }
  })

  const st = clonedDoc.createElement('style')
  st.setAttribute('data-guia-pdf-injected', '1')
  st.textContent = GUIA_PDF_CLONE_CSS
  clonedDoc.head.appendChild(st)
}
