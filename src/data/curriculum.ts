// 台灣 108 課綱：國中（7-9 年級）+ 高中（10-12 年級）的科目分類
import type { Grade, Stage, Subject } from '../types'

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
