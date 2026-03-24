import { Component } from 'react'
import { BootMessage } from './BootMessage.jsx'

export class RenderErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      error: null,
    }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Chatmate render error:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <BootMessage
          title="Render error"
          message={
            this.state.error instanceof Error
              ? this.state.error.message
              : 'Unknown render error.'
          }
        />
      )
    }

    return this.props.children
  }
}
