// exportTableToExcel.ts
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

type Parsed =
  | { value: number; numFmt?: string }
  | { value: string | Date | boolean | null | undefined; numFmt?: undefined }

const isTransparent = (c: string | null) =>
  !c ||
  c === 'transparent' ||
  c === 'rgba(0, 0, 0, 0)' ||
  /^rgba\([\d\s.,]+,\s*0\)$/i.test(c) ||
  /^rgb\([\d\s.]+\s*\/\s*0\)$/i.test(c)

const toARGB = (a: number, r: number, g: number, b: number) =>
  [a, r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()

/** Suporta:
 * - #RGB, #RRGGBB, #AARRGGBB
 * - rgb(r, g, b), rgba(r, g, b, a)
 * - rgb(r g b / a)  (formato moderno)
 * - valores percentuais (ex.: rgb(100% 0% 0% / 50%))
 */
function cssColorToARGB(css: string | null): string | null {
  if (!css) return null
  const s = css.trim()

  // Hex
  if (s.startsWith('#')) {
    let hex = s.slice(1)
    if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('')
    if (hex.length === 6) return ('FF' + hex).toUpperCase()
    if (hex.length === 8) return hex.toUpperCase() // já ARGB
    return null
  }

  // Normaliza rgb(...) com espaços e/ou barra para csv
  if (/^rgba?\(/i.test(s)) {
    let inner = s.slice(s.indexOf('(') + 1, s.lastIndexOf(')')).trim()
    inner = inner.replace(/\s*\/\s*/g, ',')   // " / " -> ","
               .replace(/\s+/g, ',')          // espaços -> ","
               .replace(/,+/g, ',')           // vírgulas repetidas
               .replace(/^,|,$/g, '')         // vírgula no início/fim

    const parts = inner.split(',').map(p => p.trim())

    const toByte = (val: string, isAlpha = false) => {
      const isPct = /%$/.test(val)
      const n = parseFloat(val)
      if (Number.isNaN(n)) return isAlpha ? 255 : 0
      if (isAlpha) {
        if (isPct) return Math.round((n / 100) * 255)
        return Math.round(n * 255) // 0..1
      }
      if (isPct) return Math.round((n / 100) * 255)
      return Math.round(n) // assume 0..255
    }

    const r = toByte(parts[0] || '0')
    const g = toByte(parts[1] || '0')
    const b = toByte(parts[2] || '0')
    const a = parts[3] != null ? toByte(parts[3], true) : 255

    if (a === 0) return null // totalmente transparente -> sem fill
    return toARGB(a, r, g, b)
  }

  return null
}

function resolveEffectiveBackground(el: HTMLElement | null): string | null {
  let cur: HTMLElement | null = el
  while (cur) {
    const bg = getComputedStyle(cur).backgroundColor
    if (!isTransparent(bg)) return bg
    cur = cur.parentElement
  }
  return null
}

function parsePtNumber(text: string): Parsed {
  const raw = text.replace(/\u00A0/g, ' ').trim()
  if (!raw) return { value: '' }

  const isPercent = /%$/.test(raw)
  const only = raw.replace(/[^\d.,-]/g, '')
  if (!/[0-9]/.test(only)) return { value: text }

  const normalized = only.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  if (Number.isFinite(n)) {
    if (isPercent) return { value: n / 100, numFmt: '0.00%' }
    if (/,/.test(only)) return { value: n, numFmt: '#,##0.00' }
    return { value: n }
  }
  return { value: text }
}

export const exportTableToExcel = async (tableId: string, fileName = 'export.xlsx') => {
  const table = document.getElementById(tableId) as HTMLTableElement | null
  if (!table) throw new Error(`Tabela #${tableId} não encontrada`)

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Sheet1', {
    properties: { defaultRowHeight: 18 },
    pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const rows = Array.from(table.rows)
  const colMaxChars: number[] = []

  rows.forEach((htmlRow) => {
    const excelRow = worksheet.addRow([])

    Array.from(htmlRow.cells).forEach((cell, cIdx) => {
      const text = cell.innerText.replace(/\s+/g, ' ').trim()
      const parsed = parsePtNumber(text)
      const xcell = excelRow.getCell(cIdx + 1)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      xcell.value = parsed.value as any
      if (parsed.numFmt) xcell.numFmt = parsed.numFmt

      const cs = window.getComputedStyle(cell)
      const align = (cs.textAlign as ExcelJS.Alignment['horizontal']) || 'left'
      xcell.alignment = { horizontal: align, vertical: 'middle', wrapText: true }

      // Fonte (cor + peso)
      const fontARGB = cssColorToARGB(cs.color)
      const fw = cs.fontWeight
      const bold = fw === 'bold' || parseInt(fw, 10) >= 600
      xcell.font = {
        bold,
        color: fontARGB ? { argb: fontARGB } : undefined,
        name: 'Calibri',
        size: 11,
      }

      // Fundo efetivo subindo na árvore
      const effBg = resolveEffectiveBackground(cell)
      const bgARGB = cssColorToARGB(effBg)
      if (bgARGB) {
        xcell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgARGB } }
      }

      // Bordas (finas se houver borda no HTML)
      const bwTop = parseFloat(cs.borderTopWidth || '0')
      const bwLeft = parseFloat(cs.borderLeftWidth || '0')
      const bwRight = parseFloat(cs.borderRightWidth || '0')
      const bwBottom = parseFloat(cs.borderBottomWidth || '0')
      const hasBorder = bwTop + bwLeft + bwRight + bwBottom > 0.0001
      const borderARGB =
        cssColorToARGB(cs.borderTopColor || cs.borderColor || '') || 'FF000000'
      if (hasBorder) {
        xcell.border = {
          top: { style: bwTop > 0 ? 'thin' : undefined, color: { argb: borderARGB } },
          left: { style: bwLeft > 0 ? 'thin' : undefined, color: { argb: borderARGB } },
          bottom: { style: bwBottom > 0 ? 'thin' : undefined, color: { argb: borderARGB } },
          right: { style: bwRight > 0 ? 'thin' : undefined, color: { argb: borderARGB } },
        }
      }

      // largura de coluna
      const len = String(text || '').length
      colMaxChars[cIdx] = Math.max(colMaxChars[cIdx] ?? 10, len + 2)
    })

    // Negrito no header
    if (htmlRow.parentElement?.tagName === 'THEAD') {
      excelRow.eachCell(cell => (cell.font = { ...(cell.font || {}), bold: true }))
    }
  })

  worksheet.columns = colMaxChars.map(w => ({
    width: Math.min(Math.max(Math.ceil(w * 0.9), 10), 50),
  }))
  worksheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveAs(blob, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`)
}
