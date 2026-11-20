import { Navigate, useLocation, useParams } from 'react-router'

/** Old /builds URL: keep the filters and page in the query string. */
export function RedirectToRack() {
  const { search } = useLocation()
  return <Navigate to={`/rack${search}`} replace />
}

/** Old /builds/:id URL. */
export function RedirectToRackBuild() {
  const { id } = useParams()
  return <Navigate to={`/rack/${id}`} replace />
}

/** Old /builder/saved URL. */
export function RedirectToMyBuilds() {
  return <Navigate to="/my-builds" replace />
}
