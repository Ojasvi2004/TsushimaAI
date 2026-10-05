import { useCallback, useEffect, useRef, useState } from "react";

/* NavbarAfterLogin
   Same look as NavbarBeforeLogin:
   - Always a fixed, floating rounded glass pill at the top (no full-width state, no auto-hide).
   - Slides in once on load, sliding hover highlight, dot under the current page.
   - Hairline scroll-progress at the very top of the screen.
   - Mobile: the two-line button morphs to an X and opens a full-screen dot-grid menu.
   Logged-in content: Dashboard / My Agents / Prebuilt Library, "New Persona" CTA,
   workspace chip and a profile dropdown.
   Fonts: Inter + Instrument Serif. Tailwind only. Put it OUTSIDE the page sections. */

const SERIF = "font-['Instrument_Serif',ui-serif,Georgia,serif]";
const EASE = "ease-[cubic-bezier(.22,1,.36,1)]";
const DOTS =
  "bg-[radial-gradient(circle,rgba(10,10,10,0.16)_1px,transparent_1.6px)] [background-size:14px_14px]";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Agents", href: "/agents", badge: "4" },
  { label: "Prebuilt Library", href: "/prebuilt" },
];

const Logo = ({ onClick }) => (
  <a
    href="/dashboard"
    onClick={onClick}
    aria-label="Tsushima AI, workspace"
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

export const NavbarAfterLogin = ({
  activePath = "/agents",
  user = {
    name: "Maya Lin",
    email: "maya@acme.inc",
    role: "Production Lead",
    avatar: null, // falls back to initials
    workspace: "Acme Studios",
  },
  onSignOut = () => console.log("Sign out triggered"),
}) => {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [ind, setInd] = useState({ x: 0, w: 0, show: false });

  const linkRefs = useRef([]);
  const progressRef = useRef(null);
  const profileMenuRef = useRef(null);

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

  /* close profile dropdown on outside click */
  useEffect(() => {
    const onDown = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  /* mobile menu: lock scroll, Escape closes, close when the screen grows */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); setProfileOpen(false); }
    };
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

  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

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
        <div className="pointer-events-auto mx-auto mt-3 grid w-full max-w-[1040px] grid-cols-[1fr_auto] items-center rounded-full border border-neutral-900/10 bg-white/75 py-2 pl-5 pr-2 shadow-[0_12px_40px_-14px_rgba(0,0,0,0.22)] backdrop-blur-xl md:grid-cols-[1fr_auto_1fr] sm:mt-4">
          {/* logo + workspace */}
          <div className="flex items-center gap-3 justify-self-start">
            <Logo onClick={() => setOpen(false)} />
            <span className="hidden h-3.5 w-px bg-neutral-900/15 lg:inline-block" />
            <div className="hidden items-center gap-1.5 rounded-full border border-neutral-900/10 bg-neutral-900/[0.03] px-2.5 py-0.5 text-[11px] font-medium tracking-tight text-neutral-600 lg:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span>{user.workspace}</span>
            </div>
          </div>

          {/* desktop links */}
          <nav aria-label="Application" className="hidden md:block">
            <ul className="relative flex items-center gap-1" onMouseLeave={hideInd}>
              <span
                aria-hidden="true"
                style={{ transform: `translateX(${ind.x}px)`, width: ind.w }}
                className={`pointer-events-none absolute inset-y-0 left-0 rounded-full bg-neutral-900/[0.07] transition-[transform,width,opacity] duration-500 ${EASE} ${
                  ind.show ? "opacity-100" : "opacity-0"
                }`}
              />
              {NAV_ITEMS.map((item, i) => {
                const on = activePath.startsWith(item.href);
                return (
                  <li key={item.label}>
                    <a
                      ref={(el) => (linkRefs.current[i] = el)}
                      href={item.href}
                      onMouseEnter={() => moveTo(i)}
                      onFocus={() => moveTo(i)}
                      onBlur={hideInd}
                      aria-current={on ? "page" : undefined}
                      className="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold tracking-tight text-neutral-800 transition-colors hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900"
                    >
                      {item.label}
                      {item.badge && (
                        <span className="grid h-4 min-w-4 place-items-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold leading-none text-white">
                          {item.badge}
                        </span>
                      )}
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
              href="/studio/new"
              className="group hidden items-center gap-2.5 rounded-full bg-neutral-900 py-2 pl-5 pr-2 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 sm:inline-flex"
            >
              New Persona
              <span
                aria-hidden="true"
                className={`grid h-7 w-7 place-items-center rounded-full bg-white text-neutral-900 transition-transform duration-500 ${EASE} group-hover:rotate-90`}
              >
                +
              </span>
            </a>

            {/* profile dropdown */}
            <div className="relative hidden md:block" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-label="User account menu"
                className="flex items-center gap-2 rounded-full border border-neutral-900/15 bg-white/70 p-1 transition-colors hover:border-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-neutral-900 text-[11px] font-semibold tracking-wider text-white">
                    {initials}
                  </span>
                )}
                <svg
                  className={`mr-1.5 hidden h-3 w-3 text-neutral-500 transition-transform duration-300 lg:inline-block ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  className="absolute right-0 mt-3 w-64 origin-top-right rounded-3xl border border-neutral-900/10 bg-white/90 p-2 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.2)] backdrop-blur-xl"
                >
                  <div className="border-b border-neutral-900/10 px-3 py-2.5">
                    <p className="text-xs font-semibold text-neutral-900">{user.name}</p>
                    <p className="truncate text-[11px] text-neutral-500">{user.email}</p>
                    <span className="mt-1.5 inline-block rounded-full bg-neutral-900/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-neutral-700">
                      {user.role}
                    </span>
                  </div>

                  <div className="border-b border-neutral-900/10 px-3 py-2 text-[11px] text-neutral-500">
                    <div className="flex items-center justify-between font-medium">
                      <span>Stack connected</span>
                      <span className="font-semibold text-neutral-800">CRM • Meet • Chat</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <a
                      href="/settings/memory"
                      role="menuitem"
                      className="flex items-center justify-between rounded-full px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-900/[0.07] hover:text-neutral-900"
                    >
                      <span>Brain & Memory Rules</span>
                      <span className="text-[10px] font-medium text-neutral-400">14 scripts</span>
                    </a>
                    <a
                      href="/settings/stack"
                      role="menuitem"
                      className="flex items-center rounded-full px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-900/[0.07] hover:text-neutral-900"
                    >
                      Connected Tools & APIs
                    </a>
                    <a
                      href="/settings/billing"
                      role="menuitem"
                      className="flex items-center rounded-full px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-900/[0.07] hover:text-neutral-900"
                    >
                      Billing & Usage
                    </a>
                  </div>

                  <div className="border-t border-neutral-900/10 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={onSignOut}
                      className="flex w-full items-center justify-between rounded-full px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <span>Log out</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

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
          <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-neutral-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{user.workspace}</span>
          </div>

          <ul className="flex flex-1 flex-col justify-center gap-2">
            {NAV_ITEMS.map((item, i) => (
              <li key={item.label} className="overflow-hidden">
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  tabIndex={open ? 0 : -1}
                  style={{ transitionDelay: open ? `${120 + i * 70}ms` : "0ms" }}
                  className={`group flex items-baseline justify-between border-b border-neutral-900/15 py-4 text-[clamp(2.2rem,10vw,3.6rem)] font-light leading-none tracking-[-0.035em] text-neutral-900 transition-transform duration-700 ${EASE} ${
                    open ? "translate-y-0" : "translate-y-full"
                  }`}
                >
                  <span>
                    {item.label.split(" ")[0]}
                    {item.label.split(" ")[1] && (
                      <span className={`${SERIF} font-normal italic`}> {item.label.split(" ").slice(1).join(" ")}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    {item.badge && (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                    <span aria-hidden="true" className="text-xl text-neutral-600 transition-transform duration-500 group-hover:translate-x-1">↗</span>
                  </span>
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
              href="/studio/new"
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="group inline-flex items-center justify-between rounded-full bg-neutral-900 py-3 pl-7 pr-3 text-base font-semibold tracking-tight text-white transition-colors hover:bg-neutral-700"
            >
              New Persona
              <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-white text-neutral-900 transition-transform duration-500 group-hover:rotate-90">+</span>
            </a>

            <div className="flex items-center justify-between rounded-full border border-neutral-900/20 py-2 pl-5 pr-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-neutral-900">{user.name}</p>
                <p className="truncate text-xs text-neutral-600">{user.email}</p>
              </div>
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                onClick={() => { setOpen(false); onSignOut(); }}
                className="rounded-full border border-neutral-900/20 px-4 py-2 text-sm font-semibold tracking-tight text-rose-600 transition-colors hover:border-rose-600"
              >
                Log out
              </button>
            </div>

            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-700">
              Lifelike AI humans, from a single prompt
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default NavbarAfterLogin;