import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('Unhandled UI error:', error, errorInfo)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleSafeNavigation = () => {
    window.location.assign('/welcome')
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="min-h-screen bg-dark-primary bg-cyber-pattern flex items-center justify-center px-4">
        <div className="card-dark p-8 max-w-lg w-full text-center border border-risk-critical/30">
          <h1 className="text-2xl font-bold font-display text-text-primary mb-3">
            Something went wrong
          </h1>
          <p className="text-text-secondary mb-6">
            The app hit an unexpected error. You can reload the page or return to a safe route.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button type="button" onClick={this.handleReload} className="btn-cyber w-full sm:w-auto">
              Reload Page
            </button>
            <button
              type="button"
              onClick={this.handleSafeNavigation}
              className="btn-secondary w-full sm:w-auto"
            >
              Go to Welcome
            </button>
          </div>
        </div>
      </div>
    )
  }
}
