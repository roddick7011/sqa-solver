import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ProfileProvider } from './contexts/ProfileContext'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

// 08-02: Error boundary 讓手機端能看到 crash 原因
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 14, color: '#dc2626', background: '#fef2f2', minHeight: '100vh' }}>
          <h2>💥 應用程式崩潰</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{this.state.error.message}</pre>
          {this.state.error.stack && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 10, color: '#666' }}>{this.state.error.stack.slice(0, 2000)}</pre>}
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 12, padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 4 }}>
            🔄 重試
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <App />
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)