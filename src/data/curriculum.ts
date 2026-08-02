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
// 108 課綱章節資料（翰林版國中數學 + 其他科簡化版）
// 資料來源：go100.com.tw 翰林版本對照表
// ============================================================

const HL_CHAPTERS: Chapter[] = [
  // ═══ 數學 ═══
  // 七上
  { id: 'math-7a-1', name: '數與數線',             grade: 7, subjectId: 'math' },
  { id: 'math-7a-2', name: '標準分解式與分數運算', grade: 7, subjectId: 'math' },
  { id: 'math-7a-3', name: '一元一次方程式',       grade: 7, subjectId: 'math' },
  { id: 'math-7a-4', name: '線對稱與三視圖',       grade: 7, subjectId: 'math' },
  // 七下
  { id: 'math-7b-1', name: '二元一次聯立方程式',               grade: 7, subjectId: 'math' },
  { id: 'math-7b-2', name: '直角坐標與二元一次方程式的圖形',    grade: 7, subjectId: 'math' },
  { id: 'math-7b-3', name: '比例',                              grade: 7, subjectId: 'math' },
  { id: 'math-7b-4', name: '一元一次不等式',                    grade: 7, subjectId: 'math' },
  { id: 'math-7b-5', name: '統計圖表與統計數據',                grade: 7, subjectId: 'math' },
  // 八上
  { id: 'math-8a-1', name: '乘法公式與多項式',     grade: 8, subjectId: 'math' },
  { id: 'math-8a-2', name: '二次方根與畢氏定理',   grade: 8, subjectId: 'math' },
  { id: 'math-8a-3', name: '因式分解',             grade: 8, subjectId: 'math' },
  { id: 'math-8a-4', name: '一元二次方程式',       grade: 8, subjectId: 'math' },
  { id: 'math-8a-5', name: '統計資料處理',         grade: 8, subjectId: 'math' },
  // 八下
  { id: 'math-8b-1', name: '等差數列與級數',       grade: 8, subjectId: 'math' },
  { id: 'math-8b-2', name: '幾何圖形與尺規作圖',   grade: 8, subjectId: 'math' },
  { id: 'math-8b-3', name: '三角形的基本性質',     grade: 8, subjectId: 'math' },
  { id: 'math-8b-4', name: '平行與四邊形',         grade: 8, subjectId: 'math' },
  // 九上
  { id: 'math-9a-1', name: '相似形',               grade: 9, subjectId: 'math' },
  { id: 'math-9a-2', name: '圓的性質',             grade: 9, subjectId: 'math' },
  { id: 'math-9a-3', name: '幾何證明與推理',       grade: 9, subjectId: 'math' },
  { id: 'math-9a-4', name: '二次函數',             grade: 9, subjectId: 'math' },
  { id: 'math-9a-5', name: '資料整理與分析',       grade: 9, subjectId: 'math' },
  // 九下
  { id: 'math-9b-1', name: '空間中的立體圖形',     grade: 9, subjectId: 'math' },
  { id: 'math-9b-2', name: '統計與機率',           grade: 9, subjectId: 'math' },

  // ═══ 國文 ═══（翰林版課次制，108 課綱）
  // 七上
  { id: 'chi-7a-1', name: '第一課 夏夜', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-2', name: '第二課 無心的錯誤', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-3', name: '第三課 母親的教誨', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-c1', name: '語文常識(一) 標點符號使用法', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-4', name: '第四課 論語選', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-5', name: '第五課 背影', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-6', name: '第六課 心囚', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-c2', name: '語文常識(二) 閱讀導航', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-7', name: '第七課 兒時記趣', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-8', name: '第八課 朋友相交', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-9', name: '第九課 音樂家與職籃巨星', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-10', name: '第十課 玫瑰淚', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-s1', name: '自學課一 神話與寓言選', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-s2', name: '自學課二 賣柑者的言', grade: 7, subjectId: 'chi' },
  { id: 'chi-7a-s3', name: '自學課三 行動的水滴才能匯流大河', grade: 7, subjectId: 'chi' },
  // 七下
  { id: 'chi-7b-1', name: '第一課 小詩選', grade: 7, subjectId: 'chi' },
  { id: 'chi-7b-2', name: '第二課 石虎是我們的龍貓', grade: 7, subjectId: 'chi' },
  { id: 'chi-7b-3', name: '第三課 聲音鐘', grade: 7, subjectId: 'chi' },
  { id: 'chi-7b-c1', name: '語文常識(一) 漢字的結構', grade: 7, subjectId: 'chi' },
  { id: 'chi-7b-4', name: '第四課 森林最優美的一天', grade: 7, subjectId: 'chi' },
  { id: 'chi-7b-5', name: '第五課 近體詩選', grade: 7, subjectId: 'chi' },
  { id: 'chi-7b-6', name: '第六課 紙船印象', grade: 7, subjectId: 'chi' },
  { id: 'chi-7b-c2', name: '語文常識(二) 漢字的流變與書法欣賞', grade: 7, subjectId: 'chi' },
  { id: 'chi-7b-7', name: '第七課 孩子的鐘塔', grade: 7, subjectId: 'chi' },
  { id: 'chi-7b-8', name: '第八課 五柳先生傳', grade: 7, subjectId: 'chi' },
  { id: 'chi-7b-9', name: '第九課 謝天', grade: 7, subjectId: 'chi' },
  { id: 'chi-7b-10', name: '第十課 貓的天堂', grade: 7, subjectId: 'chi' },
  // 八上
  { id: 'chi-8a-1', name: '第一課 田園之秋選', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-2', name: '第二課 古詩選', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-3', name: '第三課 飛魚', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-4', name: '第四課 賣油翁', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-c1', name: '語文常識(一) 語法(上)詞類', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-5', name: '第五課 愛蓮說', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-6', name: '第六課 聲音鐘', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-7', name: '第七課 世說新語選', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-8', name: '第八課 麥帥為子祈禱文', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-9', name: '第九課 張釋之執法', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-10', name: '第十課 鳥', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-11', name: '第十一課 夸父', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-12', name: '第十二課 柳毅傳書結奇緣', grade: 8, subjectId: 'chi' },
  { id: 'chi-8a-c2', name: '語文常識(二) 語法(下)句子', grade: 8, subjectId: 'chi' },
  // 八下
  { id: 'chi-8b-1', name: '第一課 一棵開花的樹', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-2', name: '第二課 陋室銘', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-3', name: '第三課 我所知道的康橋', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-4', name: '第四課 幽夢影選', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-c1', name: '語文常識(一) 應用文——書信、便條', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-5', name: '第五課 木蘭詩', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-6', name: '第六課 森林最優美的一天', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-7', name: '第七課 定伯賣鬼', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-8', name: '第八課 人生需求愈少，負擔愈輕', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-c2', name: '語文常識(二) 應用文——題辭、柬帖', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-9', name: '第九課 為學一首示子姪', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-10', name: '第十課 來到部落的文明', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-11', name: '第十一課 空城計', grade: 8, subjectId: 'chi' },
  { id: 'chi-8b-12', name: '第十二課 科幻極短篇選', grade: 8, subjectId: 'chi' },
  // 九上
  { id: 'chi-9a-1', name: '第一課 故鄉的桂花雨', grade: 9, subjectId: 'chi' },
  { id: 'chi-9a-2', name: '第二課 生於憂患死於安樂', grade: 9, subjectId: 'chi' },
  { id: 'chi-9a-3', name: '第三課 詞選', grade: 9, subjectId: 'chi' },
  { id: 'chi-9a-4', name: '第四課 土', grade: 9, subjectId: 'chi' },
  { id: 'chi-9a-c1', name: '語文常識 應用文——對聯', grade: 9, subjectId: 'chi' },
  { id: 'chi-9a-5', name: '第五課 良馬對', grade: 9, subjectId: 'chi' },
  { id: 'chi-9a-6', name: '第六課 大明湖', grade: 9, subjectId: 'chi' },
  { id: 'chi-9a-7', name: '第七課 習慣說', grade: 9, subjectId: 'chi' },
  { id: 'chi-9a-8', name: '第八課 青鳥就在身邊', grade: 9, subjectId: 'chi' },
  { id: 'chi-9a-9', name: '第九課 與宋元思書', grade: 9, subjectId: 'chi' },
  { id: 'chi-9a-10', name: '第十課 豬血糕', grade: 9, subjectId: 'chi' },
  { id: 'chi-9a-11', name: '第十一課 寄弟墨書', grade: 9, subjectId: 'chi' },
  { id: 'chi-9a-12', name: '第十二課 射鵰英雄傳—智鬥書生', grade: 9, subjectId: 'chi' },

  // ═══ 英文 ═══
  { id: 'eng-7a-1', name: 'Unit 1-3：基礎單字與句型',    grade: 7, subjectId: 'eng' },
  { id: 'eng-7a-2', name: 'Unit 4-6：現在式',            grade: 7, subjectId: 'eng' },
  { id: 'eng-7b-1', name: 'Unit 1-3：現在進行式',        grade: 7, subjectId: 'eng' },
  { id: 'eng-7b-2', name: 'Unit 4-6：Wh- 問句',          grade: 7, subjectId: 'eng' },
  { id: 'eng-8a-1', name: 'Unit 1-3：過去式',            grade: 8, subjectId: 'eng' },
  { id: 'eng-8a-2', name: 'Unit 4-6：未來式',            grade: 8, subjectId: 'eng' },
  { id: 'eng-8b-1', name: 'Unit 1-3：比較級與最高級',    grade: 8, subjectId: 'eng' },
  { id: 'eng-8b-2', name: 'Unit 4-6：被動語態',          grade: 8, subjectId: 'eng' },
  { id: 'eng-9a-1', name: 'Unit 1-3：現在完成式',        grade: 9, subjectId: 'eng' },
  { id: 'eng-9b-1', name: 'Unit 4-6：關係子句',          grade: 9, subjectId: 'eng' },

  // ═══ 自然科學 ═══
  { id: 'sci-7a-1', name: '生物：生命世界',              grade: 7, subjectId: 'sci' },
  { id: 'sci-7a-2', name: '生物：細胞與個體',            grade: 7, subjectId: 'sci' },
  { id: 'sci-7b-1', name: '生物：遺傳與演化',            grade: 7, subjectId: 'sci' },
  { id: 'sci-8a-1', name: '理化：基本測量與物質',        grade: 8, subjectId: 'sci' },
  { id: 'sci-8a-2', name: '理化：波動與聲音',            grade: 8, subjectId: 'sci' },
  { id: 'sci-8b-1', name: '理化：化學反應',              grade: 8, subjectId: 'sci' },
  { id: 'sci-8b-2', name: '理化：力與壓力',              grade: 8, subjectId: 'sci' },
  { id: 'sci-9a-1', name: '理化：直線運動',              grade: 9, subjectId: 'sci' },
  { id: 'sci-9a-2', name: '理化：力與運動',              grade: 9, subjectId: 'sci' },
  { id: 'sci-9a-3', name: '理化：電與磁',                grade: 9, subjectId: 'sci' },
  { id: 'sci-9b-1', name: '地科：天文與宇宙',            grade: 9, subjectId: 'sci' },
  { id: 'sci-9b-2', name: '地科：大氣與氣候',            grade: 9, subjectId: 'sci' },

  // ═══ 社會 ═══（翰林版歷史/地理/公民��
  { id: 'soc-7a-1', name: '歷史：台灣史（史前-清領）',  grade: 7, subjectId: 'soc' },
  { id: 'soc-7a-2', name: '地理：台灣地理（自然環境）',  grade: 7, subjectId: 'soc' },
  { id: 'soc-7b-1', name: '公民：個人與社會',            grade: 7, subjectId: 'soc' },
  { id: 'soc-8a-1', name: '歷史：中國史（先秦-宋元）',  grade: 8, subjectId: 'soc' },
  { id: 'soc-8a-2', name: '地理：中國地理',              grade: 8, subjectId: 'soc' },
  { id: 'soc-8b-1', name: '公民：權利與義務',            grade: 8, subjectId: 'soc' },
  { id: 'soc-9a-1', name: '歷史：世界史（近代-現代）',  grade: 9, subjectId: 'soc' },
  { id: 'soc-9a-2', name: '地理：世界地理',              grade: 9, subjectId: 'soc' },
  { id: 'soc-9b-1', name: '公民：民主與法治',            grade: 9, subjectId: 'soc' },
]

// 章節查詢
export function getChapters(grade: Grade, subjectId: string): Chapter[] {
  return HL_CHAPTERS.filter(c => c.grade === grade && c.subjectId === subjectId)
}

export function getChapter(grade: Grade, subjectId: string, chapterId: string): Chapter | undefined {
  return HL_CHAPTERS.find(c => c.grade === grade && c.subjectId === subjectId && c.id === chapterId)
}
