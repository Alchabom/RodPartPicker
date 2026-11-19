import { Outlet, Route, Routes } from 'react-router'
import { NotFound } from '@components/NotFound'
import { SiteFooter, SiteHeader } from '@components/shop'
import { AccountPage, DisplayNamePage, LoginPage, RequireAuth, UserMenu } from '@features/auth'
import { HomePage } from '@features/home'
import { PublishedBuildPage, PublishedListPage } from '@features/catalog'
import { BrandPartsPage, BuilderLayout, BuilderPage, LocalBuildProvider, MyBuildsPage, SavedBuildProvider } from '@features/builder'

function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader account={<UserMenu />} />
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
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
        <Route path="builds" element={<PublishedListPage />} />
        <Route path="builds/:id" element={<PublishedBuildPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route
          path="welcome"
          element={
            <RequireAuth>
              <DisplayNamePage />
            </RequireAuth>
          }
        />
        <Route
          path="account"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
