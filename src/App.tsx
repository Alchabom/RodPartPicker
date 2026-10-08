import { Link } from 'react-router'

function App() {
  return (
    <main className="flex flex-1 flex-col items-center px-8 py-16 text-center">
      <h1 className="mt-8 mb-2 text-5xl/tight font-bold text-te-papa-green">
        Pick Parts. Build Your Rod. Catch em all.
      </h1>
      <p className="mt-5 mb-10 max-w-[600px] text-xl text-plantation">
        We provide part selection, pricing, and compatibility guidance for do-it-yourself rod builders.
      </p>

      <Link
        to="/builder"
        className="inline-block rounded-md bg-spectra px-10 py-4 text-[1.2rem] font-bold text-linen shadow-md transition-colors duration-200 hover:bg-te-papa-green"
      >
        Start Your Build
      </Link>

      {/* Placeholder for the table / picture */}
      <div className="mt-16 flex h-[400px] w-full max-w-[900px] items-center justify-center rounded-lg border-2 border-dashed border-twine bg-bone text-2xl font-bold text-spectra">
        Placeholder image
      </div>
    </main>
  )
}

export default App
