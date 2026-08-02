// 台灣 108 課綱：國中（7-9 年級）+ 高中（10-12 年級）的科目分類
import type { Grade, Stage, Subject } from '../types'
import type { Chapter } from '../types'

export const STAGE_LABELS: Record<Stage, string> = {
  junior: '國中',
  senior: '高中',
}

export const GRADE_LABELS: Record<Grade, string> = {
  7: '七年級',
  8: '八年級',
  9: '九年級',
  10: '高一',
  11: '高二',
  12: '高三',
}

export const STAGE_GRADES: Record<Stage, Grade[]> = {
  junior: [7, 8, 9],
  senior: [10, 11, 12],
}

// 國中（108 課綱）
const JUNIOR_SUBJECTS: Subject[] = [
  { id: 'chi',  name: '國文',       emoji: '📖', color: 'rose'    },
  { id: 'eng',  name: '英文',       emoji: '🔤', color: 'sky'     },
  { id: 'math', name: '數學',       emoji: '➗', color: 'indigo'  },
  { id: 'sci',  name: '自然科學',   emoji: '🔬', color: 'emerald' },
  { id: 'soc',  name: '社會',       emoji: '🌍', color: 'amber'   },
  { id: 'art',  name: '藝術',       emoji: '🎨', color: 'pink'    },
  { id: 'tech', name: '科技',       emoji: '💻', color: 'cyan'    },
  { id: 'pe',   name: '健康與體育', emoji: '🏃', color: 'lime'    },
  { id: 'comp', name: '綜合活動',   emoji: '🌱', color: 'teal'    },
]

// 高中（108 課綱）— 高一共同科目 + 高二三選修分流
const SENIOR_COMMON: Subject[] = [
  { id: 'chi',   name: '國文',         emoji: '📖', color: 'rose'    },
  { id: 'eng',   name: '英文',         emoji: '🔤', color: 'sky'     },
  { id: 'math',  name: '數學',         emoji: '➗', color: 'indigo'  },
  { id: 'hist',  name: '歷史',         emoji: '📜', color: 'amber'   },
  { id: 'geo',   name: '地理',         emoji: '🗺️', color: 'orange'  },
  { id: 'civ',   name: '公民與社會',   emoji: '⚖️', color: 'yellow'  },
  { id: 'phys',  name: '物理',         emoji: '⚛️', color: 'violet'  },
  { id: 'chem',  name: '化學',         emoji: '🧪', color: 'fuchsia' },
  { id: 'bio',   name: '生物',         emoji: '🧬', color: 'emerald' },
  { id: 'earth', name: '地球科學',     emoji: '🌐', color: 'cyan'    },
  { id: 'info',  name: '資訊科技',     emoji: '💻', color: 'blue'    },
]

// 高三加深加廣選修（簡列）
const SENIOR_ADVANCED: Subject[] = [
  { id: 'math-a',  name: '數學甲',         emoji: '➗', color: 'indigo'  },
  { id: 'math-b',  name: '數學乙',         emoji: '➕', color: 'indigo'  },
  { id: 'phys-adv',name: '物理（探究）',   emoji: '⚛️', color: 'violet'  },
  { id: 'chem-adv',name: '化學（探究）',   emoji: '🧪', color: 'fuchsia' },
  { id: 'bio-adv', name: '生物（探究）',   emoji: '🧬', color: 'emerald' },
]

const SUBJECTS_BY_GRADE: Record<Grade, Subject[]> = {
  7: JUNIOR_SUBJECTS,
  8: JUNIOR_SUBJECTS,
  9: JUNIOR_SUBJECTS,
  10: SENIOR_COMMON,
  11: SENIOR_COMMON,
  12: [...SENIOR_COMMON, ...SENIOR_ADVANCED],
}

export function getSubjects(stage: Stage, grade: Grade): Subject[] {
  return SUBJECTS_BY_GRADE[grade] ?? []
}

export function getSubject(stage: Stage, grade: Grade, subjectId: string): Subject | undefined {
  return getSubjects(stage, grade).find(s => s.id === subjectId)
}

// ============================================================
// 108 課綱章節資料（國中為主，高中簡化）
// ============================================================
// 章節跨年級通用（例如「數與量」在七年級、八年級、九年級都有）

const JUNIOR_CHAPTERS: Chapter[] = [
  // ── 國文 ──
  { id: 'chi-1', name: '課文閱讀與理解',    grade: 7, subjectId: 'chi' },
  { id: 'chi-2', name: '字音字形',          grade: 7, subjectId: 'chi' },
  { id: 'chi-3', name: '修辭與文法',        grade: 7, subjectId: 'chi' },
  { id: 'chi-4', name: '文言文閱讀',        grade: 7, subjectId: 'chi' },
  { id: 'chi-5', name: '作文與表達',        grade: 7, subjectId: 'chi' },
  { id: 'chi-6', name: '課文閱讀與理解',    grade: 8, subjectId: 'chi' },
  { id: 'chi-7', name: '字音字形',          grade: 8, subjectId: 'chi' },
  { id: 'chi-8', name: '修辭與文法',        grade: 8, subjectId: 'chi' },
  { id: 'chi-9', name: '文言文閱讀',        grade: 8, subjectId: 'chi' },
  { id: 'chi-10', name: '作文與表達',       grade: 8, subjectId: 'chi' },
  { id: 'chi-11', name: '課文閱讀與理解',   grade: 9, subjectId: 'chi' },
  { id: 'chi-12', name: '字音字形',         grade: 9, subjectId: 'chi' },
  { id: 'chi-13', name: '修辭與文法',       grade: 9, subjectId: 'chi' },
  { id: 'chi-14', name: '文言文閱讀',       grade: 9, subjectId: 'chi' },
  { id: 'chi-15', name: '作文與表達',       grade: 9, subjectId: 'chi' },

  // ── 英文 ──
  { id: 'eng-1', name: '單字與片語',        grade: 7, subjectId: 'eng' },
  { id: 'eng-2', name: '文法句型',          grade: 7, subjectId: 'eng' },
  { id: 'eng-3', name: '閱讀測驗',          grade: 7, subjectId: 'eng' },
  { id: 'eng-4', name: '聽力',              grade: 7, subjectId: 'eng' },
  { id: 'eng-5', name: '寫作',              grade: 7, subjectId: 'eng' },
  { id: 'eng-6', name: '單字與片語',        grade: 8, subjectId: 'eng' },
  { id: 'eng-7', name: '文法句型',          grade: 8, subjectId: 'eng' },
  { id: 'eng-8', name: '閱讀測驗',          grade: 8, subjectId: 'eng' },
  { id: 'eng-9', name: '聽力',              grade: 8, subjectId: 'eng' },
  { id: 'eng-10', name: '寫作',             grade: 8, subjectId: 'eng' },
  { id: 'eng-11', name: '單字與片語',       grade: 9, subjectId: 'eng' },
  { id: 'eng-12', name: '文法句型',         grade: 9, subjectId: 'eng' },
  { id: 'eng-13', name: '閱讀測驗',         grade: 9, subjectId: 'eng' },
  { id: 'eng-14', name: '聽力',             grade: 9, subjectId: 'eng' },
  { id: 'eng-15', name: '寫作',             grade: 9, subjectId: 'eng' },

  // ── 數學 ──
  { id: 'math-1', name: '數與量',           grade: 7, subjectId: 'math' },
  { id: 'math-2', name: '代數',             grade: 7, subjectId: 'math' },
  { id: 'math-3', name: '幾何',             grade: 7, subjectId: 'math' },
  { id: 'math-4', name: '統計與機率',       grade: 7, subjectId: 'math' },
  { id: 'math-5', name: '數與量',           grade: 8, subjectId: 'math' },
  { id: 'math-6', name: '代數',             grade: 8, subjectId: 'math' },
  { id: 'math-7', name: '幾何',             grade: 8, subjectId: 'math' },
  { id: 'math-8', name: '統計與機率',       grade: 8, subjectId: 'math' },
  { id: 'math-9', name: '數與量',           grade: 9, subjectId: 'math' },
  { id: 'math-10', name: '代數',            grade: 9, subjectId: 'math' },
  { id: 'math-11', name: '幾何',            grade: 9, subjectId: 'math' },
  { id: 'math-12', name: '統計與機率',      grade: 9, subjectId: 'math' },
  { id: 'math-13', name: '函數',            grade: 9, subjectId: 'math' },

  // ── 自然科學 ──
  { id: 'sci-1', name: '生物：生命世界',        grade: 7, subjectId: 'sci' },
  { id: 'sci-2', name: '生物：細胞與個體',      grade: 7, subjectId: 'sci' },
  { id: 'sci-3', name: '生物：遺傳與演化',      grade: 7, subjectId: 'sci' },
  { id: 'sci-4', name: '理化：物質與變化',      grade: 8, subjectId: 'sci' },
  { id: 'sci-5', name: '理化：力與運動',        grade: 8, subjectId: 'sci' },
  { id: 'sci-6', name: '理化：電與磁',          grade: 8, subjectId: 'sci' },
  { id: 'sci-7', name: '理化：熱與能量',        grade: 9, subjectId: 'sci' },
  { id: 'sci-8', name: '理化：化學反應',        grade: 9, subjectId: 'sci' },
  { id: 'sci-9', name: '地科：天文與宇宙',      grade: 9, subjectId: 'sci' },
  { id: 'sci-10', name: '地科：大氣與氣候',     grade: 9, subjectId: 'sci' },
  { id: 'sci-11', name: '地科：地質與板塊',     grade: 9, subjectId: 'sci' },

  // ── 社會 ──
  { id: 'soc-1', name: '歷史：台灣史',          grade: 7, subjectId: 'soc' },
  { id: 'soc-2', name: '地理：台灣地理',        grade: 7, subjectId: 'soc' },
  { id: 'soc-3', name: '公民：個人與社會',      grade: 7, subjectId: 'soc' },
  { id: 'soc-4', name: '歷史：中國史',          grade: 8, subjectId: 'soc' },
  { id: 'soc-5', name: '地理：中國地理',        grade: 8, subjectId: 'soc' },
  { id: 'soc-6', name: '公民：權利與義務',      grade: 8, subjectId: 'soc' },
  { id: 'soc-7', name: '歷史：世界史',          grade: 9, subjectId: 'soc' },
  { id: 'soc-8', name: '地理：世界地理',        grade: 9, subjectId: 'soc' },
  { id: 'soc-9', name: '公民：民主與法治',      grade: 9, subjectId: 'soc' },
]

// 章節查詢
export function getChapters(grade: Grade, subjectId: string): Chapter[] {
  return JUNIOR_CHAPTERS.filter(c => c.grade === grade && c.subjectId === subjectId)
}

export function getChapter(grade: Grade, subjectId: string, chapterId: string): Chapter | undefined {
  return JUNIOR_CHAPTERS.find(c => c.grade === grade && c.subjectId === subjectId && c.id === chapterId)
}
