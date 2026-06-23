import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', backgroundColor: '#040508', color: '#f8fafc', fontFamily: 'Inter, sans-serif'
        }}>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, marginBottom: 16 }}>Something went wrong.</h1>
          <p style={{ color: '#94a3b8', marginBottom: 24, maxWidth: 400, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred in the application UI.'}
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
