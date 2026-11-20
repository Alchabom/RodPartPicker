import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { RequireAuth } from '@features/auth'
import { useAuth } from '@hooks/auth'
import { RedirectToMyBuilds, RedirectToRack, RedirectToRackBuild } from './redirects'

vi.mock('@hooks/auth', () => ({ useAuth: vi.fn() }))

function Probe() {
  const location = useLocation()
  const navType = useNavigationType()
  return (
    <>
      <p data-testid="location">{location.pathname + location.search}</p>
      <p data-testid="nav-type">{navType}</p>
    </>
  )
}

function renderAt(path: string, guarded = false) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="builds" element={<RedirectToRack />} />
        <Route path="builds/:id" element={<RedirectToRackBuild />} />
        <Route path="builder/saved" element={<RedirectToMyBuilds />} />
        <Route path="rack" element={<Probe />} />
        <Route path="rack/:id" element={<Probe />} />
        <Route
          path="my-builds"
          element={guarded ? <RequireAuth><Probe /></RequireAuth> : <Probe />}
        />
        <Route path="login" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('legacy redirects', () => {
  it.each([
    ['/builds', '/rack'],
    ['/builds?weight=5&page=2', '/rack?weight=5&page=2'],
    ['/builds/7', '/rack/7'],
    ['/builder/saved', '/my-builds'],
  ])('redirects %s to %s with replace', (from, to) => {
    renderAt(from)
    expect(screen.getByTestId('location')).toHaveTextContent(to)
    expect(screen.getByTestId('nav-type')).toHaveTextContent('REPLACE')
  })

  it('sends a signed-out visitor of /builder/saved on to login, then back to /my-builds', () => {
    vi.mocked(useAuth).mockReturnValue({ status: 'anonymous', user: null } as unknown as ReturnType<typeof useAuth>)
    renderAt('/builder/saved', true)
    expect(screen.getByTestId('location').textContent).toBe('/login?next=%2Fmy-builds')
  })
})
