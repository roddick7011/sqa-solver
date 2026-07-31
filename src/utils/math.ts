// 輕量 LaTeX → HTML 渲染器（支援子集）
// 涵蓋中學常見：分數、根號、上下標、希臘字母、運算子
// 不支援：矩陣、複雜符號 — 之後可擴充

const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', omicron: 'ο',
  pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ',
  phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
}

const SYMBOLS: Record<string, string> = {
  cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓',
  le: '≤', ge: '≥', ne: '≠', neq: '≠', approx: '≈',
  equiv: '≡', sim: '~', propto: '∝',
  in: '∈', notin: '∉', subset: '⊂', supset: '⊃',
  subseteq: '⊆', supseteq: '⊇', cup: '∪', cap: '∩',
  emptyset: '∅', therefore: '∴', because: '∵',
  forall: '∀', exists: '∃',
  rightarrow: '→', to: '→', Rightarrow: '⇒',
  leftrightarrow: '↔', Leftarrow: '⇐',
  sum: '∑', prod: '∏', int: '∫', oint: '∮',
  partial: '∂', nabla: '∇', infty: '∞',
  circ: '∘', ldots: '…', cdots: '⋯',
}

const FUNCTIONS = [
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh',
  'log', 'ln', 'lg', 'lim', 'max', 'min', 'exp',
]

function findMatchingBrace(s: string, openIdx: number): number {
  if (s[openIdx] !== '{') return -1
  let depth = 0
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue }
    if (s[i] === '{') depth++
    else if (s[i] === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function processFrac(s: string): string {
  // 用罕見 unicode 字元當佔位符，避免與內容衝突
  const OPEN = '⟪F⟫'
  const SEP = '⟪S⟫'
  const CLOSE = '⟪/F⟫'
  let result = ''
  let i = 0
  while (i < s.length) {
    if (s.startsWith('\\frac', i) && (i + 5 >= s.length || !/[a-zA-Z]/.test(s[i + 5]))) {
      let j = i + 5
      while (j < s.length && s[j] === ' ') j++
      if (s[j] !== '{') { result += s[i]; i++; continue }
      const end1 = findMatchingBrace(s, j)
      if (end1 < 0) { result += s.slice(i); break }
      let k = end1 + 1
      while (k < s.length && s[k] === ' ') k++
      if (s[k] !== '{') { result += s.slice(i, k); i = k; continue }
      const end2 = findMatchingBrace(s, k)
      if (end2 < 0) { result += s.slice(i, k); i = k; continue }
      const num = s.slice(j + 1, end1)
      const den = s.slice(k + 1, end2)
      result += OPEN + num + SEP + den + CLOSE
      i = end2 + 1
    } else {
      result += s[i]; i++
    }
  }
  // 用非貪婪 + 嚴格錨點，避免吃到下一個結構
  const re = new RegExp(OPEN + '([\\s\\S]*?)' + SEP + '([\\s\\S]*?)' + CLOSE, 'g')
  return result.replace(re,
    '<span class="math-frac"><span class="math-num">$1</span><span class="math-den">$2</span></span>'
  )
}

function processSqrt(s: string): string {
  const OPEN = '⟪Q���'
  const MID = '⟪M⟫'
  const CLOSE = '⟪/Q⟫'
  let result = ''
  let i = 0
  while (i < s.length) {
    if (s.startsWith('\\sqrt', i) && (i + 5 >= s.length || !/[a-zA-Z]/.test(s[i + 5]))) {
      let j = i + 5
      while (j < s.length && s[j] === ' ') j++
      let n: string | null = null
      if (s[j] === '[') {
        const closeIdx = s.indexOf(']', j)
        if (closeIdx > 0) {
          n = s.slice(j + 1, closeIdx)
          j = closeIdx + 1
        }
      }
      while (j < s.length && s[j] === ' ') j++
      if (s[j] !== '{') { result += s[i]; i++; continue }
      const end = findMatchingBrace(s, j)
      if (end < 0) { result += s[i]; i++; continue }
      const content = s.slice(j + 1, end)
      result += OPEN + (n ?? '') + MID + content + CLOSE
      i = end + 1
    } else {
      result += s[i]; i++
    }
  }
  const re = new RegExp(OPEN + '(.*?)' + MID + '([\\s\\S]*?)' + CLOSE, 'g')
  return result.replace(re, (_, n, content) =>
    `<span class="math-sqrt">${n ? `<span class="math-root">${n}</span>` : ''}<span class="math-radicand">${content}</span></span>`
  )
}

function processScripts(s: string): string {
  const TAG = '\x00'
  let result = ''
  let i = 0
  while (i < s.length) {
    if ((s[i] === '^' || s[i] === '_') && i + 1 < s.length) {
      const kind = s[i] === '^' ? 'sup' : 'sub'
      if (s[i + 1] === '{') {
        const end = findMatchingBrace(s, i + 1)
        if (end > 0) {
          const content = s.slice(i + 2, end)
          result += TAG + kind + ':' + content + TAG + 'E'
          i = end + 1
          continue
        }
      } else {
        // 單字元
        result += TAG + kind + ':' + s[i + 1] + TAG + 'E'
        i += 2
        continue
      }
    }
    result += s[i]; i++
  }
  return result
}

function processGreekAndSymbols(s: string): string {
  for (const [name, sym] of Object.entries(GREEK)) {
    s = s.replace(new RegExp(`\\\\${name}\\b`, 'g'), sym)
  }
  for (const [name, sym] of Object.entries(SYMBOLS)) {
    s = s.replace(new RegExp(`\\\\${name}\\b`, 'g'), sym)
  }
  for (const fn of FUNCTIONS) {
    // \sin → sin （保留字）
    s = s.replace(new RegExp(`\\\\${fn}(?!\\w)`, 'g'), fn)
  }
  return s
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 把 scripts 佔位符轉成 sup/sub HTML（要 escape 之後做，避免內容被誤 escape）
function convertScripts(s: string): string {
  s = s.replace(/\x00sup:([^\x00]+)\x00E/g, '<sup class="math-sup">$1</sup>')
  s = s.replace(/\x00sub:([^\x00]+)\x00E/g, '<sub class="math-sub">$1</sub>')
  return s
}

export function renderLatex(latex: string): string {
  if (!latex.trim()) return ''
  let s = latex

  // 處理順序：先 escape 原文（避免後續產生的 HTML 標籤被 escape）
  // 然後處理 LaTeX 指令，這些函式會插入真正的 HTML 標籤
  s = escapeHtml(s)
  s = processFrac(s)
  s = processSqrt(s)
  s = processScripts(s)
  s = processGreekAndSymbols(s)
  s = convertScripts(s)
  return s
}

// LaTeX → Unicode 純文字（給匯出/複製用）
export function latexToPlain(latex: string): string {
  if (!latex.trim()) return ''
  let s = latex
  s = processGreekAndSymbols(s)
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)')
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, '$1√($2)')
  s = s.replace(/\^\{([^{}]+)\}/g, '^$1')
  s = s.replace(/_\{([^{}]+)\}/g, '_$1')
  return s
}
