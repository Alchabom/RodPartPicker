import { Link, Outlet, Route, Routes } from 'react-router'
import App from '@/App'
import { NotFound } from '@components/NotFound'
import { DisplayNamePage, LoginPage, RequireAuth, UserMenu } from '@features/auth'
import { BrandPartsPage, BuilderLayout, BuilderPage, LocalBuildProvider, MyBuildsPage, SavedBuildProvider } from '@features/builder'

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

        <UserMenu />
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
        <Route path="builder" element={<BuilderLayout />}>
          <Route element={<LocalBuildProvider />}>
            <Route index element={<BuilderPage />} />
            <Route path=":component/:brand" element={<BrandPartsPage />} />
          </Route>
          <Route
            path="saved"
            element={
              <RequireAuth>
                <MyBuildsPage />
              </RequireAuth>
            }
          />
          <Route
            path=":buildId"
            element={
              <RequireAuth>
                <SavedBuildProvider />
              </RequireAuth>
            }
          >
            <Route index element={<BuilderPage />} />
            <Route path=":component/:brand" element={<BrandPartsPage />} />
          </Route>
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route
          path="welcome"
          element={
            <RequireAuth>
              <DisplayNamePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
