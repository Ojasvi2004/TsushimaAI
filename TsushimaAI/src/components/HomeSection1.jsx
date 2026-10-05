import { useEffect, useRef } from "react";

/* Hero copy only. The dot animation lives in <DotsBackground /> / <DasBoardAnimation2 />
   (rendered once in HomePage) so it can keep animating behind Sections 2 and 3.
   This section is transparent so the dots show through. */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

const HomePageSection1 = () => {
  const sectionRef = useRef(null);
  const introRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let target = 0, sp = 0, raf;

    const onScroll = () => {
      const r = section.getBoundingClientRect();
      target = clamp(-r.top / Math.max(1, r.height - window.innerHeight)); // pinned range
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const frame = () => {
      sp = lerp(sp, target, 0.1);
      const p = sp;
      const intro = introRef.current, end = endRef.current;
      if (intro) {
        intro.style.opacity = String(1 - clamp(p * 4));
        intro.style.transform = `translateY(${-p * 90}px)`;
      }
      if (end) {
        const o = clamp((p - 0.5) / 0.2) * (1 - clamp((p - 0.93) / 0.07));
        end.style.opacity = String(o);
        end.style.transform = `translateY(${(1 - clamp((p - 0.5) / 0.25)) * 40}px) scale(${0.96 + 0.04 * clamp((p - 0.5) / 0.25)})`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500&display=swap"
      />

      {/* z-10 puts the whole section above the shared canvas; no background so dots show */}
      <section ref={sectionRef} className="relative z-10 h-[280vh] w-full bg-transparent font-['Inter',ui-sans-serif,sans-serif] text-neutral-900 antialiased">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_50%_42%,rgba(0,0,0,0.045),transparent_70%)]" />

          {/* hero copy */}
          <div ref={introRef} className="absolute inset-0 z-20 will-change-transform">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-white via-white/85 to-transparent md:hidden" />
            <div className="absolute bottom-0 left-0 w-full px-6 pb-12 sm:px-10 sm:pb-16 lg:px-14 lg:pb-20 md:max-w-[min(34vw,32rem)]">
              <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-800 [text-shadow:0_0_14px_rgba(255,255,255,0.95)]">
                <span className="h-px w-8 bg-neutral-900/40" /> Meet Tsushima
              </p>
              <p className="text-[clamp(1.1rem,1.9vw,1.6rem)] font-normal leading-none tracking-tight text-neutral-700 [text-shadow:0_0_14px_rgba(255,255,255,0.95)]">Introducing</p>
              <h1 className="mt-1 font-['Instrument_Serif',ui-serif,Georgia,serif] text-[clamp(4rem,7.4vw,8.5rem)] font-normal italic leading-[0.88] tracking-[-0.03em] text-neutral-900">
                Tsushima.
              </h1>
              <p className="mt-6 max-w-[19rem] text-[15px] font-medium leading-relaxed text-neutral-800 sm:text-base [text-shadow:0_0_14px_rgba(255,255,255,0.95)]">
                Voice agents that answer your calls, book appointments and speak your customers&apos; language, from a single prompt.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a
                  href="/request-access"
                  className="group inline-flex items-center gap-3 rounded-full bg-neutral-900 py-3 pl-6 pr-4 text-sm font-semibold tracking-tight text-white transition hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                >
                  Request access
                  <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-white/15 transition group-hover:translate-x-0.5">→</span>
                </a>
                <a href="/demo" className="text-sm font-semibold tracking-tight text-neutral-900 underline decoration-neutral-900/50 underline-offset-[6px] transition hover:decoration-neutral-900">
                  Hear a demo call
                </a>
              </div>
            </div>

            <div className="absolute bottom-12 right-6 hidden flex-col items-end gap-4 sm:flex sm:right-10 lg:bottom-20 lg:right-14">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-800 [text-shadow:0_0_14px_rgba(255,255,255,0.95)]">Scroll to listen in</span>
              <span className="relative h-14 w-px overflow-hidden bg-neutral-900/15">
                <span className="absolute inset-x-0 top-0 h-1/2 animate-pulse bg-neutral-900" />
              </span>
            </div>
          </div>

          {/* closing line, appears as the dots scatter */}
          <div ref={endRef} className="pointer-events-none absolute inset-0 z-20 grid place-items-center px-6 text-center opacity-0 will-change-transform">
            <div>
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-800 [text-shadow:0_0_14px_rgba(255,255,255,0.95)]">Always on</p>
              <p className="text-[clamp(2.6rem,7.5vw,7.5rem)] font-extralight leading-[0.95] tracking-[-0.04em]">
                Never miss
                <br />
                <span className="font-['Instrument_Serif',ui-serif,Georgia,serif] font-normal italic">a call.</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePageSection1;