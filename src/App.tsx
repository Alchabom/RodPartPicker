import { Link } from 'react-router'
import '@styles/App.css'

function App() {
  return (
    <main className="hero-section">
      <h1>Pick Parts. Build Your Rod. Catch em all.</h1>
      <p>We provide part selection, pricing, and compatibility guidance for do-it-yourself rod builders.</p>

      <Link to="/builder" className="start-build-btn">
        Start Your Build
      </Link>

      {/* Placeholder for the table / picture */}
      <div className="hero-image-placeholder">
        Placeholder image
      </div>
    </main>
  )
}

export default App
