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

        {/* Mock User Icon Button */}
        <button 
          className="user-icon-btn" 
          aria-label="User Profile"
          onClick={() => alert('User profile clicked!')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="hero-section">
        <h1>Pick Parts. Build Your Rod. Catch em all.</h1>
        <p>We provide part selection, pricing, and compatibility guidance for do-it-yourself rod builders.</p>
        
        <button className="start-build-btn">
          Start Your Build
        </button>

        {/* Placeholder for the table / picture */}
        <div className="hero-image-placeholder">
          Placeholder image
        </div>
      </main>
    </div>
  )
}

export default App