// 把 AI 解答裡的 LaTeX 標記轉成可讀的 Unicode / 文字
// 注意：prompt 也會要求 AI 不要用 LaTeX，這層只是保險

export function formatAnswer(s: string): string {
  return s
    // 移除 display math 與 inline math 的標記（保留內容，內容會再被下面的轉換處理）
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^\n$]+?)\$/g, '$1')
    // 分數 \frac{a}{b} → a/b
    .replace(/\\dfrac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2')
    .replace(/\\tfrac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2')
    // 根號 \sqrt{x} → √(x)；\sqrt[n]{x} → ⁿ√(x)
    .replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, '$1√($2)')
    .replace(/\\sqrt\{([^{}]+)\}/g, '√($1)')
    // 上下標 ^{x} _{x}
    .replace(/\^\{([^{}]+)\}/g, (_m, x: string) => superscript(x))
    .replace(/_\{([^{}]+)\}/g, (_m, x: string) => subscript(x))
    .replace(/\^([0-9])/g, (_m, d: string) => superscript(d))
    .replace(/_([0-9])/g, (_m, d: string) => subscript(d))
    // 希臘字母 / 運算子
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\ast/g, '✱')
    .replace(/\\pm/g, '±')
    .replace(/\\mp/g, '∓')
    .replace(/\\leq\b/g, '≤')
    .replace(/\\le\b/g, '≤')
    .replace(/\\geq\b/g, '≥')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\ne\b/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\equiv/g, '≡')
    .replace(/\\sim\b/g, '~')
    .replace(/\\propto/g, '∝')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\delta\b/g, 'δ')
    .replace(/\\epsilon\b/g, 'ε')
    .replace(/\\lambda\b/g, 'λ')
    .replace(/\\mu\b/g, 'μ')
    .replace(/\\sigma\b/g, 'σ')
    .replace(/\\omega\b/g, 'ω')
    .replace(/\\infty/g, '∞')
    // 求和 / 積分 / 邏輯
    .replace(/\\sum\b/g, '∑')
    .replace(/\\prod\b/g, '∏')
    .replace(/\\int\b/g, '∫')
    .replace(/\\oint\b/g, '∮')
    .replace(/\\partial/g, '∂')
    .replace(/\\nabla/g, '∇')
    // 箭頭
    .replace(/\\rightarrow\b/g, '→')
    .replace(/\\to\b/g, '→')
    .replace(/\\Rightarrow\b/g, '⇒')
    .replace(/\\leftarrow\b/g, '←')
    .replace(/\\Leftarrow\b/g, '⇐')
    .replace(/\\leftrightarrow\b/g, '↔')
    // 集合
    .replace(/\\in\b/g, '∈')
    .replace(/\\notin\b/g, '∉')
    .replace(/\\subset\b/g, '⊂')
    .replace(/\\subseteq\b/g, '⊆')
    .replace(/\\supset\b/g, '⊃')
    .replace(/\\supseteq\b/g, '⊇')
    .replace(/\\cup\b/g, '∪')
    .replace(/\\cap\b/g, '∩')
    .replace(/\\emptyset/g, '∅')
    .replace(/\\varnothing/g, '∅')
    // 邏輯
    .replace(/\\therefore/g, '∴')
    .replace(/\\because/g, '∵')
    .replace(/\\forall/g, '∀')
    .replace(/\\exists/g, '∃')
    // 文字指令
    .replace(/\\text\{([^{}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^{}]+)\}/g, '$1')
    .replace(/\\,|\\;|\\:|\\!/g, ' ')
    // 行內 \\ 換行 → 一般換行
    .replace(/\\\\/g, '\n')
    // 殘留的 \{ \} \_
    .replace(/\\{|\\}|\\%/g, '')
    .trim()
}

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ',
}
const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
}

function superscript(s: string): string {
  return s.split('').map(c => SUPERSCRIPT_MAP[c] ?? c).join('')
}

function subscript(s: string): string {
  return s.split('').map(c => SUBSCRIPT_MAP[c] ?? c).join('')
}
