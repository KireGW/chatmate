import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BootMessage } from './components/BootMessage.jsx'
import { RenderErrorBoundary } from './components/RenderErrorBoundary.jsx'

const root = createRoot(document.getElementById('root'))

root.render(
  <StrictMode>
    <BootMessage title="Starting app..." message="Loading Chatmate." />
  </StrictMode>,
)

import('./App.jsx')
  .then((module) => {
    const App = module.default

    root.render(
      <StrictMode>
        <RenderErrorBoundary>
          <App />
        </RenderErrorBoundary>
      </StrictMode>,
    )
  })
  .catch((error) => {
    root.render(
      <StrictMode>
        <BootMessage
          title="App failed to load"
          message={error instanceof Error ? error.message : 'Unknown startup error.'}
        />
      </StrictMode>,
    )
  })
