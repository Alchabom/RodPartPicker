import '@styles/App.css'

function App() {
  return (
    <div className="app-container">
      {/* NavBar */}
      <nav className="navbar">
        <div className="nav-brand">RodPartPicker</div>
        <div className="nav-links">
          <a href="#builder">Builder</a>
          <a href="#products">Products</a>
          <a href="#completed-builds">Completed Builds</a>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="hero-section">
        <h1>Questionnaire thing and some text</h1>
        <p>Pick Parts. Build Your PC. Compare and Share.</p>
        
        <button className="start-build-btn">
          Start Your Build
        </button>

        {/* Placeholder for the table / picture */}
        <div className="hero-image-placeholder">
          Some picture (Part list will go here)
        </div>
      </main>
    </div>
  )
}

export default App