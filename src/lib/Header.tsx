import Markdown from "react-markdown";

export default function Header() {
  const title = `Foveated Metamers Browser`;
  const description = `Search model metamers from _Foveated metamers of the early visual system_, Broderick et al. 2023`;
  const button_text = `View Preprint`;
  const button_link = `https://www.biorxiv.org/content/early/2023/05/22/2023.05.18.541306`;
  return (
    <header className="max-w-auto mx-auto px-4 sm:px-6 lg:px-8 bg-white border-b border-gamma-200">
      <div className="relative z-10 flex items-end justify-between pt-8 pb-6">
        <div className="flex flex-col items-baseline">
          <h1 className="text-4xl font-extrabold tracking-tight text-gamma-900">
            {title}
          </h1>
          <p className="mt-4 text-base text-gamma-500">
            <Markdown>
              {description}
            </Markdown>
          </p>
        </div>
        <div className="flex items-center">
          <div className="relative inline-block text-left">
            <a
              type="button"
              href={button_link}
              target="_blank"
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {button_text}
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
