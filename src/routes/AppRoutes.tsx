import { Link, Outlet, Route, Routes } from 'react-router'
import App from '@/App'
import { NotFound } from '@components/NotFound'
import { BuilderPage } from '@features/builder'
import '@styles/App.css'

function Layout() {
  return (
    <div className="app-container">
      {/* NavBar */}
      <nav className="navbar">
        <Link to="/" className="nav-brand">RodPartPicker</Link>

        <div className="nav-links">
          <Link to="/builder">Builder</Link>
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

      <Outlet />
    </div>
  )
}

// Placeholder until the brand parts page lands
function BrandPartsPage() {
  return <div className="p-8">Brand parts</div>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<App />} />
        <Route path="builder" element={<BuilderPage />} />
        <Route path="builder/:component/:brand" element={<BrandPartsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
