import { useEffect, useRef, useState } from "react";

/* Same fonts as Section 1 (Inter + Instrument Serif, loaded there).
   Transparent background on purpose: the shared dots canvas keeps
   scattering behind this section.
   Small text is dark + semibold, with a soft white halo so dots never swallow it.
   Tailwind only. Inline styles are limited to scroll-driven values and animation delays. */

const DEMO = { src: "", poster: "" }; // add your demo: { src: "/demo.mp4", poster: "/demo.jpg" }

const HALO = "[text-shadow:0_0_14px_rgba(255,255,255,0.95)]";

const LOGOS = [ // placeholders: swap for real customer logos
  { name: "Northwind", cls: "font-semibold tracking-tight" },
  { name: "LUMEN", cls: "font-medium tracking-[0.35em]" },
  { name: "atlas.", cls: "font-['Instrument_Serif',serif] text-3xl italic" },
  { name: "Fable & Co", cls: "font-['Instrument_Serif',serif] text-2xl" },
  { name: "VERTEX", cls: "font-bold tracking-[0.2em]" },
];

const DOTS =
  "bg-[radial-gradient(circle,rgba(10,10,10,0.2)_1px,transparent_1.6px)] [background-size:14px_14px]";
const DELAYS = ["delay-0", "delay-150", "delay-300", "delay-500"];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

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

const WORDS = [
  { t: "Voice", i: true }, { t: "agents", i: true }, { t: "that" },
  { t: "answer" }, { t: "every" }, { t: "call." },
];

const Heading = () => {
  const [ref, shown] = useReveal(0.3);
  return (
    <h2
      ref={ref}
      className="text-[clamp(2.6rem,6.2vw,6rem)] font-extralight leading-[0.98] tracking-[-0.04em] text-neutral-900"
    >
      {WORDS.map((w, i) => (
        <span key={i} className="mr-[0.22em] -mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-top">
          <span
            style={{ transitionDelay: `${i * 80}ms` }}
            className={`inline-block transition-transform duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${
              shown ? "translate-y-0" : "translate-y-[115%]"
            } ${w.i ? "font-['Instrument_Serif',ui-serif,Georgia,serif] font-normal italic" : ""}`}
          >
            {w.t}
          </span>
        </span>
      ))}
    </h2>
  );
};

const Card = ({ index, title, text, children, delay }) => (
  <Reveal delay={delay}>
    <article className="group rounded-[28px] border border-neutral-300 bg-neutral-50 p-3 transition-colors duration-500 hover:border-neutral-400">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-white">
        <div className={`absolute inset-0 ${DOTS} [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]`} />
        {children}
      </div>
      <div className="px-4 pb-4 pt-6 sm:px-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-600">{index}</p>
        <h3 className="text-2xl font-medium tracking-tight text-neutral-900">{title}</h3>
        <p className="mt-2 max-w-sm text-base font-medium leading-relaxed text-neutral-700">{text}</p>
      </div>
    </article>
  </Reveal>
);

const Orb = ({ className = "" }) => (
  <span className={`relative block rounded-full bg-neutral-900 ${className}`}>
    <span className={`absolute inset-0 rounded-full ${DOTS.replace("rgba(10,10,10,0.2)", "rgba(255,255,255,0.55)")} [background-size:6px_6px]`} />
  </span>
);

/* a voice waveform: bars pulse out of step with each other */
const Wave = ({ bars = 26, className = "" }) => (
  <div className={`flex items-center justify-center gap-[3px] ${className}`} aria-hidden="true">
    {Array.from({ length: bars }).map((_, i) => (
      <span
        key={i}
        style={{ height: `${10 + ((i * 37) % 30)}px`, animationDelay: `${(i % 9) * 110}ms` }}
        className="block w-[3px] animate-pulse rounded-full bg-neutral-900 motion-reduce:animate-none"
      />
    ))}
  </div>
);

const HomePageSection2 = () => {
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onScroll = () => {
      const el = frameRef.current;
      if (!el || reduce) return;
      const r = el.getBoundingClientRect();
      const p = clamp((window.innerHeight - r.top) / (window.innerHeight * 0.75));
      el.style.transform = `scale(${0.9 + 0.1 * p})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const play = () => {
    if (!DEMO.src) return;
    setPlaying(true);
    requestAnimationFrame(() => videoRef.current?.play());
  };

  return (
    <section id="about" className="relative z-10 w-full bg-transparent font-['Inter',ui-sans-serif,sans-serif] text-neutral-900 antialiased">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-28 sm:px-10 sm:pt-40 lg:px-14">

        {/* intro */}
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <p className={`mb-8 flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-800 ${HALO}`}>
              <span className="h-px w-8 bg-neutral-900/50" /> 01 · What is Tsushima <span className="h-px w-8 bg-neutral-900/50" />
            </p>
          </Reveal>
          <Heading />
          <Reveal delay={2}>
            <p className={`mx-auto mt-8 max-w-xl text-lg font-medium leading-relaxed text-neutral-800 sm:text-xl ${HALO}`}>
              Tsushima turns a prompt into a voice agent that picks up your phone, answers questions, books appointments
              and hands tricky calls to your team, day and night.
            </p>
          </Reveal>
        </div>

        {/* demo */}
        <div className="mt-16 sm:mt-24">
          <div
            ref={frameRef}
            className="relative aspect-video w-full origin-center overflow-hidden rounded-[28px] border border-neutral-300 bg-neutral-100 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.25)] will-change-transform sm:rounded-[36px]"
          >
            {playing ? (
              <video ref={videoRef} src={DEMO.src} poster={DEMO.poster} controls playsInline className="h-full w-full object-cover" />
            ) : (
              <>
                {DEMO.poster ? (
                  <img src={DEMO.poster} alt="Tsushima demo call" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-neutral-100 to-neutral-300" />
                    <div className={`absolute inset-0 ${DOTS} [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]`} />
                    <Wave bars={44} className="absolute inset-x-0 top-[22%] opacity-40" />
                  </>
                )}
                <button
                  type="button"
                  onClick={play}
                  aria-label="Play the Tsushima demo call"
                  className="group absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4 rounded-full bg-neutral-900 py-3 pl-3 pr-7 text-white shadow-2xl transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-neutral-900">
                    <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>
                  </span>
                  <span className="text-sm font-semibold tracking-tight">Hear a real call</span>
                </button>
                <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-neutral-700 sm:bottom-7 sm:left-9 sm:right-9">
                  <span>{DEMO.src ? "Product demo" : "Demo call goes here"}</span>
                  <span>1:48</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* trusted by */}
        <Reveal className="mt-24 sm:mt-32">
          <p className={`mb-10 text-center text-xs font-semibold uppercase tracking-[0.24em] text-neutral-800 ${HALO}`}>
            Trusted by teams at
          </p>
          <ul className={`flex flex-wrap items-center justify-center gap-x-14 gap-y-8 text-xl text-neutral-700 ${HALO}`}>
            {LOGOS.map((l) => (
              <li key={l.name} className={`transition-colors duration-300 hover:text-neutral-900 ${l.cls}`}>{l.name}</li>
            ))}
          </ul>
        </Reveal>

        {/* feature cards */}
        <div className="mt-28 grid gap-6 sm:mt-40 md:grid-cols-2">
          <Card
            index="01 — Create"
            title="Describe the job. Get an agent."
            text="Role, voice, languages and opening hours, written in plain words and live on a phone number in minutes."
            delay={0}
          >
            <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 sm:inset-x-8">
              <div className="flex items-center gap-3 rounded-full border border-neutral-300 bg-white py-2.5 pl-5 pr-2.5 shadow-sm transition duration-500 group-hover:shadow-lg">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-700">
                  A receptionist for my clinic. Books visits in Hindi and English…
                </p>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-white" aria-hidden="true">↑</span>
              </div>
              <div className="mt-5 flex items-center justify-center gap-3">
                {["Voice", "Languages", "Hours"].map((c, i) => (
                  <span key={c} className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-800 backdrop-blur">
                    <Orb className={i === 0 ? "h-3.5 w-3.5" : "h-3.5 w-3.5 opacity-40"} /> {c}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <Card
            index="02 — Answer"
            title="Pick up every call, day and night."
            text="Inbound or outbound, they listen, respond and book, then pass the tricky calls to your team."
            delay={1}
          >
            <div className="absolute inset-x-5 inset-y-6 flex flex-col gap-3 sm:inset-x-8">
              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-neutral-300 bg-neutral-50">
                <div className={`absolute inset-0 ${DOTS} opacity-60`} />
                <Wave bars={22} className="relative transition duration-700 group-hover:scale-110" />
                <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live call
                </span>
                <span className="absolute right-3 top-3 text-[11px] font-semibold tracking-[0.14em] text-neutral-700">0:42</span>
              </div>
              <div className="flex flex-col gap-2 text-[13px] font-medium">
                <p className="max-w-[75%] self-start rounded-2xl rounded-bl-md bg-neutral-200 px-4 py-2 text-neutral-900">
                  Can I book a check-up for Thursday?
                </p>
                <p className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-neutral-900 px-4 py-2 text-white">
                  Yes, I have 3:30. Shall I book it?
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HomePageSection2;