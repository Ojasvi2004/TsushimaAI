import { useEffect, useRef, useState } from "react";

/* Same fonts as Sections 1-3 (Inter + Instrument Serif, loaded in Section 1).
   Transparent on purpose: the shared <DotsBackground /> keeps floating behind it.
   Small text is dark + semibold with a white halo, matching the other sections.
   Tailwind only. */

const SERIF = "font-['Instrument_Serif',ui-serif,Georgia,serif]";
const HALO = "[text-shadow:0_0_14px_rgba(255,255,255,0.95)]";
const DELAYS = ["delay-0", "delay-150", "delay-300"];

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "What is Tsushima", href: "#about" },
      { label: "Platform", href: "#platform" },
      { label: "Watch the demo", href: "/demo" },
      { label: "Request access", href: "/request-access" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

const useReveal = (threshold = 0.2) => {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, shown];
};

const Reveal = ({ children, delay = 0, className = "" }) => {
  const [ref, shown] = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out motion-reduce:transition-none ${DELAYS[delay]} ${
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
};

const Logo = () => (
  <a href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-neutral-900">
    <span className="grid h-5 w-5 grid-cols-2 gap-[3px]" aria-hidden="true">
      <i className="rounded-full bg-neutral-900" /><i className="rounded-full bg-neutral-900/35" />
      <i className="rounded-full bg-neutral-900/35" /><i className="rounded-full bg-neutral-900" />
    </span>
    tsushima<span className="font-normal text-neutral-600">ai</span>
  </a>
);

const HomeFooter = () => {
  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <footer className="relative z-10 w-full bg-transparent font-['Inter',ui-sans-serif,sans-serif] text-neutral-900 antialiased">
      <div className="mx-auto max-w-7xl px-6 pb-10 pt-28 sm:px-10 sm:pt-40 lg:px-14">

        {/* closing call to action */}
        {/* <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <p className={`mb-8 flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-800 ${HALO}`}>
              <span className="h-px w-8 bg-neutral-900/50" /> Get started <span className="h-px w-8 bg-neutral-900/50" />
            </p>
          </Reveal>
          <Reveal delay={1}>
            <h2 className="text-[clamp(2.8rem,7vw,7rem)] font-extralight leading-[0.95] tracking-[-0.04em] text-neutral-900">
              Meet your first
              <br />
              <span className={`${SERIF} font-normal italic`}>AI human.</span>
            </h2>
          </Reveal>
          <Reveal delay={2}>
            <p className={`mx-auto mt-8 max-w-md text-lg font-medium leading-relaxed text-neutral-800 ${HALO}`}>
              Describe a person, connect your tools, and put them on a call, in an ad or in a scene.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <a
                href="/request-access"
                className="group inline-flex items-center gap-3 rounded-full bg-neutral-900 py-3.5 pl-7 pr-5 text-sm font-semibold tracking-tight text-white transition hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              >
                Request access
                <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-white/15 transition group-hover:translate-x-0.5">→</span>
              </a>
              <a
                href="/demo"
                className="text-sm font-semibold tracking-tight text-neutral-900 underline decoration-neutral-900/50 underline-offset-[6px] transition hover:decoration-neutral-900"
              >
                Watch the demo
              </a>
            </div>
          </Reveal>
        </div> */}

        {/* links */}
        <Reveal className="mt-28 sm:mt-40">
          <div className="grid gap-12 border-t border-neutral-900/20 pt-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
            <div>
              <Logo />
              <p className={`mt-5 max-w-xs text-base font-medium leading-relaxed text-neutral-800 ${HALO}`}>
                Lifelike AI humans for ads, video calls and film — from a single prompt.
              </p>
            </div>
            {COLUMNS.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <p className={`mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-700 ${HALO}`}>{c.title}</p>
                <ul className="space-y-3">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className={`text-[15px] font-medium text-neutral-900 underline decoration-transparent underline-offset-[6px] transition hover:decoration-neutral-900 ${HALO}`}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </Reveal>

        {/* base line */}
        <div className="mt-16 flex flex-col items-start justify-between gap-5 border-t border-neutral-900/20 pt-6 sm:flex-row sm:items-center">
          <p className={`text-[13px] font-medium text-neutral-700 ${HALO}`}>
            © {new Date().getFullYear()} Tsushima AI. All rights reserved.
          </p>
          <button
            type="button"
            onClick={toTop}
            className="group inline-flex items-center gap-3 rounded-full border border-neutral-900/30 bg-white/70 py-2 pl-5 pr-2 text-[13px] font-semibold tracking-tight text-neutral-900 backdrop-blur transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            Back to top
            <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-neutral-900/10 transition group-hover:-translate-y-0.5 group-hover:bg-white/20">↑</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;