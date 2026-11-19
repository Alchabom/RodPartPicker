import { NavLink } from 'react-router'
import { Container } from './Container'
import { NAV_ITEMS } from './navItems'
import { Wordmark } from './Wordmark'

export function SiteFooter() {
  return (
    <footer className="mt-auto">
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 48"
        preserveAspectRatio="none"
        className="block h-12 w-full"
      >
        <path
          className="fill-haze-4"
          d="M0 48V28C150 14 260 30 400 20S640 8 780 22S1040 10 1200 18V48Z"
        />
        <path
          className="fill-haze-5"
          d="M0 48V38C140 30 280 40 440 32S700 26 860 34S1060 28 1200 34V48Z"
        />
      </svg>
      <div className="bg-haze-5 py-8 text-stone-page">
        <Container className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Wordmark className="focus-visible:ring-stone-page" />
            <nav aria-label="Footer" className="flex gap-6">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="rounded-sm text-sm outline-none transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-stone-page"
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <p className="text-sm">
            A capstone project. Prices and links come from each brand's own site.
          </p>
        </Container>
      </div>
    </footer>
  )
}
