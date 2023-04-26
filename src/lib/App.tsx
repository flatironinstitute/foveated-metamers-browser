"use client";

import create_app_state, { AppContext } from "./app_state";
import ImageSection from "./ImageSection";
import TableAndFilters from "./Table";
import { Overlay, log } from "./utils";

log(`Build Date:`, process.env.NEXT_PUBLIC_BUILD_DATE);

export default function App() {
  const app_state = create_app_state();

  const overlay = <Overlay>Loading...</Overlay>;

  return (
    <AppContext.Provider value={app_state}>
      <section
        aria-labelledby="image-display"
        className="pt-6 pb-12 max-w-auto mx-auto px-4 sm:px-6 lg:px-8 bg-white"
      >
        <div className="relative z-10 mb-8 md:mb-2 md:px-6">
          <div className="text-base max-w-prose lg:max-w-none">
            <ImageSection />
            <TableAndFilters />
          </div>
          {app_state.metadata.value ? null : overlay}
        </div>
      </section>
    </AppContext.Provider>
  );
}
