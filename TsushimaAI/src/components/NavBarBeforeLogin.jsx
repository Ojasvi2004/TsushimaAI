import { useCallback, useEffect, useRef, useState } from "react";

/* NavbarBeforeLogin
   - Always a fixed, floating rounded glass pill at the top of the screen. It is
     visible on every scroll position (no full-width state, no auto-hide).
   - Sliding hover highlight + a dot that marks the section you are reading.
   - Hairline scroll-progress at the very top of the screen.
   - Mobile: the two-line button morphs to an X and opens a full-screen dot-grid menu.
   Fonts: Inter + Instrument Serif (same as the page sections). Tailwind only; the few inline
   styles are measured/animated values (indicator position, stagger delays, progress).
   Put it OUTSIDE the page sections, e.g. above <HomePage /> or at the top of <main>.
   Section ids it tracks: #about and #platform (already on your Section 2 and 3). */

const SERIF = "font-['Instrument_Serif',ui-serif,Georgia,serif]";
const EASE = "ease-[cubic-bezier(.22,1,.36,1)]";
const DOTS =
  "bg-[radial-gradient(circle,rgba(10,10,10,0.16)_1px,transparent_1.6px)] [background-size:14px_14px]";

const LINKS = [
  { label: "Product", href: "/#about", id: "about" },
  { label: "Platform", href: "/#platform", id: "platform" },
  // { label: "Demo", href: "/demo" },
  // { label: "Careers", href: "/careers" },
];

const Logo = ({ onClick }) => (
  <a
    href="/"
    onClick={onClick}
    aria-label="Tsushima AI, home"
    className="group flex items-center gap-2.5 rounded-full text-[15px] font-semibold tracking-tight text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900"
  >
    <span
      className={`grid h-5 w-5 grid-cols-2 gap-[3px] transition-transform duration-700 ${EASE} group-hover:rotate-180`}
      aria-hidden="true"
    >
      <i className="rounded-full bg-neutral-900" />
      <i className="rounded-full bg-neutral-900/35 transition-colors duration-500 group-hover:bg-neutral-900" />
      <i className="rounded-full bg-neutral-900/35 transition-colors duration-500 group-hover:bg-neutral-900" />
      <i className="rounded-full bg-neutral-900" />
    </span>
    <span>
      tsushima<span className="font-normal text-neutral-600">ai</span>
    </span>
  </a>
);

const NavbarBeforeLogin = () => {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [ind, setInd] = useState({ x: 0, w: 0, show: false });

  const linkRefs = useRef([]);
  const progressRef = useRef(null);

  /* slide the pill in once on load */
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* scroll-progress hairline */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* which section is in the middle of the screen */
  useEffect(() => {
    const els = LINKS.filter((l) => l.id).map((l) => document.getElementById(l.id)).filter(Boolean);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: "-45% 0px -45% 0px" }
    );
    els.forEach((el) => io.observe(el));
    const onTop = () => { if (window.scrollY < 200) setActive(null); };
    window.addEventListener("scroll", onTop, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", onTop); };
  }, []);

  /* mobile menu: lock scroll, Escape closes, close when the screen grows */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const moveTo = useCallback((i) => {
    const el = linkRefs.current[i];
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth, show: true });
  }, []);
  const hideInd = useCallback(() => setInd((s) => ({ ...s, show: false })), []);

  /* anchors scroll smoothly when the section is on this page; otherwise they navigate normally */
  const go = (e, href) => {
    setOpen(false);
    if (!href.startsWith("/#")) return;
    const el = document.getElementById(href.slice(2));
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap"
      />

      {/* scroll progress */}
      <div
        ref={progressRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[60] h-[2px] w-full origin-left scale-x-0 bg-neutral-900 motion-reduce:hidden"
      />

      {/* fixed floating pill */}
      <header
        className={`pointer-events-none fixed inset-x-0 top-0 z-50 px-3 font-['Inter',ui-sans-serif,sans-serif] antialiased transition-all duration-700 ${EASE} sm:px-5 ${
          mounted ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
        }`}
      >
        <div className="pointer-events-auto mx-auto mt-3 grid w-full max-w-[960px] grid-cols-[1fr_auto] items-center rounded-full border border-neutral-900/10 bg-white/75 py-2 pl-5 pr-2 shadow-[0_12px_40px_-14px_rgba(0,0,0,0.22)] backdrop-blur-xl md:grid-cols-[1fr_auto_1fr] sm:mt-4">
          <div className="justify-self-start">
            <Logo onClick={(e) => go(e, "/")} />
          </div>

          {/* desktop links */}
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="relative flex items-center gap-1" onMouseLeave={hideInd}>
              <span
                aria-hidden="true"
                style={{ transform: `translateX(${ind.x}px)`, width: ind.w }}
                className={`pointer-events-none absolute inset-y-0 left-0 rounded-full bg-neutral-900/[0.07] transition-[transform,width,opacity] duration-500 ${EASE} ${
                  ind.show ? "opacity-100" : "opacity-0"
                }`}
              />
              {LINKS.map((l, i) => {
                const on = l.id && active === l.id;
                return (
                  <li key={l.label}>
                    <a
                      ref={(el) => (linkRefs.current[i] = el)}
                      href={l.href}
                      onClick={(e) => go(e, l.href)}
                      onMouseEnter={() => moveTo(i)}
                      onFocus={() => moveTo(i)}
                      onBlur={hideInd}
                      aria-current={on ? "true" : undefined}
                      className="relative block rounded-full px-4 py-2 text-sm font-semibold tracking-tight text-neutral-800 transition-colors hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900"
                    >
                      {l.label}
                      <span
                        aria-hidden="true"
                        className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-neutral-900 transition-all duration-500 ${EASE} ${
                          on ? "scale-100 opacity-100" : "scale-0 opacity-0"
                        }`}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* actions */}
          <div className="flex items-center justify-self-end gap-1 sm:gap-2">
            <a
              href="/login"
              className="relative hidden rounded-full px-4 py-2 text-sm font-semibold tracking-tight text-neutral-800 transition-colors hover:bg-neutral-900/[0.07] hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900 lg:block"
            >
              Sign in
            </a>
            <a
              href="/request-access"
              className="group hidden items-center gap-2.5 rounded-full bg-neutral-900 py-2 pl-5 pr-2 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 sm:inline-flex"
            >
              Request access
              <span
                aria-hidden="true"
                className={`grid h-7 w-7 place-items-center rounded-full bg-white text-neutral-900 transition-transform duration-500 ${EASE} group-hover:translate-x-0.5 group-hover:-rotate-45`}
              >
                →
              </span>
            </a>

            {/* mobile toggle */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-neutral-900/15 bg-white/70 transition-colors hover:border-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 md:hidden"
            >
              <span
                className={`absolute h-[1.5px] w-4 bg-neutral-900 transition-transform duration-500 ${EASE} ${
                  open ? "rotate-45" : "-translate-y-[3px]"
                }`}
              />
              <span
                className={`absolute h-[1.5px] w-4 bg-neutral-900 transition-transform duration-500 ${EASE} ${
                  open ? "-rotate-45" : "translate-y-[3px]"
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* mobile menu */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        className={`fixed inset-0 z-40 overflow-y-auto bg-white/95 font-['Inter',ui-sans-serif,sans-serif] antialiased backdrop-blur-2xl transition-all duration-500 md:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className={`pointer-events-none absolute inset-0 ${DOTS} [mask-image:radial-gradient(ellipse_at_80%_20%,black_0%,transparent_70%)]`} />
        <div className="relative flex min-h-full flex-col px-6 pb-10 pt-28">
          <ul className="flex flex-1 flex-col justify-center gap-2">
            {LINKS.map((l, i) => (
              <li key={l.label} className="overflow-hidden">
                <a
                  href={l.href}
                  onClick={(e) => go(e, l.href)}
                  tabIndex={open ? 0 : -1}
                  style={{ transitionDelay: open ? `${120 + i * 70}ms` : "0ms" }}
                  className={`group flex items-baseline justify-between border-b border-neutral-900/15 py-4 text-[clamp(2.4rem,11vw,4rem)] font-light leading-none tracking-[-0.035em] text-neutral-900 transition-transform duration-700 ${EASE} ${
                    open ? "translate-y-0" : "translate-y-full"
                  }`}
                >
                  <span>
                    {l.label.split(" ")[0]}
                    {l.label.split(" ")[1] && (
                      <span className={`${SERIF} font-normal italic`}> {l.label.split(" ").slice(1).join(" ")}</span>
                    )}
                  </span>
                  <span aria-hidden="true" className="text-xl text-neutral-600 transition-transform duration-500 group-hover:translate-x-1">↗</span>
                </a>
              </li>
            ))}
          </ul>

          <div
            style={{ transitionDelay: open ? "420ms" : "0ms" }}
            className={`mt-10 flex flex-col gap-4 transition-all duration-700 ${EASE} ${
              open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <a
              href="/request-access"
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="group inline-flex items-center justify-between rounded-full bg-neutral-900 py-3 pl-7 pr-3 text-base font-semibold tracking-tight text-white transition-colors hover:bg-neutral-700"
            >
              Request access
              <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-white text-neutral-900 transition-transform duration-500 group-hover:-rotate-45">→</span>
            </a>
            <a
              href="/login"
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="rounded-full border border-neutral-900/20 py-3.5 text-center text-base font-semibold tracking-tight text-neutral-900 transition-colors hover:border-neutral-900"
            >
              Sign in
            </a>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-700">
              Lifelike AI humans, from a single prompt
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default NavbarBeforeLogin;