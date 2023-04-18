export default function Header() {
  return (
    <header className="max-w-auto mx-auto px-4 sm:px-6 lg:px-8 bg-white border-b border-gamma-200">
      <div className="relative z-10 flex items-end justify-between pt-8 pb-6">
        <div className="flex flex-col items-baseline">
          <h1 className="text-4xl font-extrabold tracking-tight text-gamma-900">
            Foveated Metamers Browser
          </h1>
          <p className="mt-4 text-base text-gamma-500">
            Search model metamers from{" "}
            <i>Foveated metamers of the early visual system</i>, Broderick et
            al. 2022
          </p>
        </div>
        <div className="flex items-center">
          <div className="relative inline-block text-left">
            <a
              type="button"
              href="https://osf.io/aketq/"
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              View Poster
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
