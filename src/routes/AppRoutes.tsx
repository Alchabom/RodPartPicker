import { Outlet, Route, Routes } from 'react-router'
import { useAuth } from '@hooks/auth'
import { NotFound } from '@components/NotFound'
import { SiteFooter, SiteHeader } from '@components/shop'
import { AccountPage, DisplayNamePage, LoginPage, RequireAuth, UserMenu } from '@features/auth'
import { HomePage } from '@features/home'
import { PublishedBuildPage, PublishedListPage } from '@features/catalog'
import {
  BuilderIndex,
  BuilderLayout,
  LocalBuildProvider,
  MyBuildsPage,
  SavedBuildProvider,
  STEP_ORDER,
  StepPage,
  StepRedirect,
} from '@features/builder'
import { RedirectToMyBuilds, RedirectToRack, RedirectToRackBuild } from './redirects'

function Layout() {
  const { status } = useAuth()
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader account={<UserMenu />} signedIn={status === 'authenticated'} />
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <SiteFooter signedIn={status === 'authenticated'} />
    </div>
  )
}

// The guided builder, the same under a draft (/builder) and a saved build
// (/builder/:buildId): the summary at the index, one static path per step (so
// a step never reads as a build id), and old brand-first links redirected
const builderSteps = (
  <>
    <Route index element={<BuilderIndex />} />
    {STEP_ORDER.map((type) => (
      <Route key={type} path={type} element={<StepPage type={type} />} />
    ))}
    <Route path=":component/:brand" element={<StepRedirect />} />
  </>
)

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="builder/saved" element={<RedirectToMyBuilds />} />
        <Route path="builder" element={<BuilderLayout />}>
          <Route element={<LocalBuildProvider />}>{builderSteps}</Route>
          <Route
            path=":buildId"
            element={
              <RequireAuth>
                <SavedBuildProvider />
              </RequireAuth>
            }
          >
            {builderSteps}
          </Route>
        </Route>
        <Route path="rack" element={<PublishedListPage />} />
        <Route path="rack/:id" element={<PublishedBuildPage />} />
        <Route path="builds" element={<RedirectToRack />} />
        <Route path="builds/:id" element={<RedirectToRackBuild />} />
        <Route element={<BuilderLayout />}>
          <Route
            path="my-builds"
            element={
              <RequireAuth>
                <MyBuildsPage />
              </RequireAuth>
            }
          />
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
