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
          d="M0 48V30l90-12 110 10 130-22 140 24 150-20 120 16 140-24 120 20 100-8v34z"
        />
        <path
          className="fill-haze-5"
          d="M0 48V38l120-8 140 8 160-14 150 14 140-10 170 12 130-10 190 8v20z"
        />
      </svg>
      <div className="bg-haze-5 py-8 text-stone-page">
        <Container className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Wordmark />
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
