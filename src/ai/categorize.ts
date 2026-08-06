// AI 題目自動分類
// AI 只回傳「科目名稱 + 年級 + 章節提示」，本地解析成實際 ID
// （不讓 AI 記 ID，避免 hallucination 記錯）
import { getChapters, getSubjects, STAGE_GRADES, STAGE_LABELS } from '../data/curriculum'
import type { Grade, Stage } from '../types'
import { loadAIConfig } from './solver'

export interface CategorizeResult {
  stage: Stage
  grade: Grade
  subjectId: string
  chapterId?: string
}

function buildPrompt(text: string): string {
  // 依年級列出科目名稱，讓 AI 選
  const lines: string[] = []
  for (const [stage, grades] of Object.entries(STAGE_GRADES)) {
    for (const g of grades) {
      const names = getSubjects(stage as Stage, g).map(s => s.name).join('、')
      lines.push(`${g}年級（${STAGE_LABELS[stage as Stage]}）：${names}`)
    }
  }

  return `你是台灣國高中的「題目分類器」。根據題目內容判斷它屬於哪個學制、年級、科目。

題目文字：
${text.slice(0, 2000) || '（無文字，請依圖片判斷）'}

科目清單（依年級）：
${lines.join('\n')}

回傳 JSON（不要用 markdown code block 包，直接給 JSON）：
{"stage":"junior|senior","grade":7,"subject_name":"科目名稱","chapter_hint":"最可能的章節名稱或關鍵字，不確定就空字串"}

規則：
- stage 只能是 junior 或 senior
- grade 只能是 7~12 的整數
- subject_name 必須從上方清單中選最接近的
- 若是國文/英文閱讀理解或作文，subject_name 填國文/英文
- chapter_hint 例如「一元二次方程式」「光合作用」，不確定可留空字串
- 無法判斷時選最合理的，不要回傳空白`
}

// fuzzy match：AI 的章節 hint 對應到本地章節
function matchChapter(grade: Grade, subjectId: string, hint: string): string | undefined {
  if (!hint) return undefined
  const chapters = getChapters(grade, subjectId)
  // 先找完全包含
  const exact = chapters.find(ch => ch.name === hint)
  if (exact) return exact.id
  // 再找 hint 包含章節名 或 章節名包含 hint
  const fuzzy = chapters.find(ch => ch.name.includes(hint) || hint.includes(ch.name))
  return fuzzy?.id
}

export async function categorizeQuestion(
  questionText: string,
  questionImage?: string,
): Promise<CategorizeResult> {
  const cfg = loadAIConfig()
  const baseUrl = cfg.customBaseUrl || ''
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const model = cfg.customModel || 'gpt-4o'

  // 組 user content（文字 + 可選圖片）
  const content: any[] = [{ type: 'text', text: buildPrompt(questionText) }]
  const m = questionImage?.match(/^data:(image\/\w+);base64,(.+)$/)
  if (m) {
    content.unshift({
      type: 'image_url',
      image_url: { url: `data:${m[1]};base64,${m[2]}` },
    })
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (cfg.apiKey) headers['authorization'] = `Bearer ${cfg.apiKey}`

  // 重試 2 次（5xx）
  let res: Response | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content }],
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    })
    if (res.ok) break
    if (res.status >= 500 && attempt === 0) {
      await new Promise(r => setTimeout(r, 1500))
      continue
    }
    throw new Error(`AI 分類失敗 ${res.status}`)
  }

  if (!res?.ok) throw new Error('AI 分類失敗')
  const data = await res.json()
  let text = data.choices?.[0]?.message?.content ?? ''
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 分類回應無法解析')
  const parsed = JSON.parse(jsonMatch[0])

  // 驗證 stage / grade
  const stage: Stage = parsed.stage === 'senior' ? 'senior' : 'junior'
  const gradeNum = parseInt(parsed.grade, 10)
  if (isNaN(gradeNum) || gradeNum < 7 || gradeNum > 12) {
    throw new Error('AI 分類的年級無效')
  }
  const grade = gradeNum as Grade

  // subject_name → subjectId（找該年級科目中名稱最接近的）
  const subjectName: string = String(parsed.subject_name ?? '').trim()
  const subjects = getSubjects(stage, grade)
  const sub = subjects.find(s => s.name === subjectName)
    || subjects.find(s => s.name.includes(subjectName) || subjectName.includes(s.name))
  if (!sub) throw new Error(`找不到科目：${subjectName}`)

  return {
    stage,
    grade,
    subjectId: sub.id,
    chapterId: matchChapter(grade, sub.id, String(parsed.chapter_hint ?? '').trim()),
  }
}
