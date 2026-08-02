import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import GradePage from './pages/GradePage'
import SubjectPage from './pages/SubjectPage'
import ChapterPage from './pages/ChapterPage'
import QuestionPage from './pages/QuestionPage'
import NotePage from './pages/NotePage'
import NotebookPage from './pages/NotebookPage'
import SettingsPage from './pages/SettingsPage'
import ReviewPage from './pages/ReviewPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/stage/:stage" element={<GradePage />} />
        <Route path="/stage/:stage/grade/:grade" element={<SubjectPage />} />
        <Route path="/stage/:stage/grade/:grade/subject/:subjectId/chapter" element={<ChapterPage />} />
        <Route path="/stage/:stage/grade/:grade/subject/:subjectId/ask" element={<QuestionPage />} />
        <Route path="/stage/:stage/grade/:grade/subject/:subjectId/note/:id" element={<NotePage />} />
        <Route path="/notebook" element={<NotebookPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
