import { Link, Outlet, Route, Routes } from 'react-router'
import App from '@/App'
import { NotFound } from '@components/NotFound'
import { BrandPartsPage, BuilderPage } from '@features/builder'

const navLinkClass = 'font-semibold text-tasman transition-colors duration-200 hover:text-sulu'

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* NavBar */}
      <nav className="flex items-center justify-between bg-cod-gray px-12 py-4 text-linen">
        <Link to="/" className="text-2xl font-extrabold text-sulu">RodPartPicker</Link>

        <div className="flex gap-8">
          <Link to="/builder" className={navLinkClass}>Builder</Link>
          <a href="#products" className={navLinkClass}>Products</a>
          <a href="#completed-builds" className={navLinkClass}>Completed Builds</a>
        </div>

        {/* Mock User Icon Button */}
        <button
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
