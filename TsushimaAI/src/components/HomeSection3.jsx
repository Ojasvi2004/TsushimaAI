import { useEffect, useRef, useState } from "react";

/* Same fonts as Sections 1-2 (Inter + Instrument Serif, loaded in Section 1).
   Transparent background on purpose: the page owns the white background and the
   shared dots canvas keeps scattering behind this section.
   Tailwind only. Inline styles are limited to animation delays. */

const SERIF = "font-['Instrument_Serif',ui-serif,Georgia,serif]";
const DOTS_DARK =
  "bg-[radial-gradient(circle,rgba(255,255,255,0.16)_1px,transparent_1.6px)] [background-size:14px_14px]";
const DELAYS = ["delay-0", "delay-150", "delay-300"];

const TOOLS = ["CRM", "Calendar", "Helpdesk", "SMS", "WhatsApp", "Phone", "Drive", "Sheets", "Slack", "Email", "Docs", "Billing"];

const CALLS = [
  { who: "Anita Rao", note: "Booked a check-up, Thu 3:30 PM", time: "2:14", tag: "Booked" },
  { who: "+91 98•• ••21", note: "Asked about fees, left a message", time: "1:02", tag: "Message" },
  { who: "Rohan M.", note: "Urgent. Transferred to Dr. Sharma", time: "0:48", tag: "Transferred" },
];

const useReveal = (threshold = 0.25) => {
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
  const [ref, shown] = useReveal(0.15);
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

const Heading = () => {
  const [ref, shown] = useReveal(0.3);
  const words = [{ t: "Tsushima" }, { t: "adapts", i: true }, { t: "to" }, { t: "you." }];
  return (
    <h2 ref={ref} className="text-[clamp(2.8rem,7vw,7rem)] font-extralight leading-[0.95] tracking-[-0.04em] text-neutral-900">
      {words.map((w, i) => (
        <span key={i} className="mr-[0.22em] -mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-top">
          <span
            style={{ transitionDelay: `${i * 90}ms` }}
            className={`inline-block transition-transform duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${
              shown ? "translate-y-0" : "translate-y-[115%]"
            } ${w.i ? `${SERIF} font-normal italic` : ""}`}
          >
            {w.t}
          </span>
        </span>
      ))}
    </h2>
  );
};

const Orb = ({ className = "" }) => (
  <span className={`relative block shrink-0 rounded-full bg-white ${className}`}>
    <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(10,10,10,0.55)_1px,transparent_1.4px)] [background-size:5px_5px]" />
  </span>
);

/* ------------------------------ Visual cards ------------------------------ */

const Shell = ({ children }) => (
  <div className="group relative aspect-[5/4] w-full overflow-hidden rounded-[28px] bg-neutral-950 p-5 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.5)] sm:rounded-[32px] sm:p-8">
    <div className={`absolute inset-0 ${DOTS_DARK} [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]`} />
    <div className="relative h-full">{children}</div>
  </div>
);

const ConnectCard = () => {
  const [ref, shown] = useReveal(0.35);
  return (
    <Shell>
      <div ref={ref} className="grid h-full grid-cols-4 grid-rows-3 gap-2.5 sm:gap-3.5">
        {TOOLS.map((t, i) => (
          <div
            key={t}
            style={{ transitionDelay: `${i * 70}ms` }}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-700 hover:border-white/40 hover:bg-white/10 motion-reduce:transition-none ${
              shown ? "scale-100 opacity-100" : "scale-75 opacity-0"
            }`}
          >
            <span className={`${SERIF} text-2xl italic leading-none text-white sm:text-3xl`}>{t[0]}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-200 sm:text-[11px]">{t}</span>
            <span
              style={{ animationDelay: `${i * 260}ms` }}
              className="absolute right-2.5 top-2.5 h-1.5 w-1.5 animate-pulse rounded-full bg-white"
            />
          </div>
        ))}
      </div>
    </Shell>
  );
};

const LearnCard = () => {
  const [ref, shown] = useReveal(0.35);
  const pop = (d) => `transition-all duration-700 motion-reduce:transition-none ${d} ${shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`;
  return (
    <Shell>
      <div ref={ref} className="flex h-full flex-col justify-center gap-3 text-sm font-medium sm:gap-4 sm:text-[15px]">
        <p className={`max-w-[80%] self-end rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-neutral-900 ${pop("delay-100")}`}>
          Keep the tone warm. Never pushy.
        </p>
        <div className={`flex max-w-[88%] items-end gap-3 ${pop("delay-500")}`}>
          <Orb className="h-7 w-7" />
          <p className="rounded-2xl rounded-bl-md bg-white/15 px-4 py-2.5 text-white">
            Noted. I&apos;ve updated the tone across 14 scripts and will use it on every call.
          </p>
        </div>
        <div className={`flex flex-wrap gap-2 pl-10 ${pop("delay-[900ms]")}`}>
          {["Memory updated", "Tone: warm", "14 scripts"].map((c) => (
            <span key={c} className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
              {c}
            </span>
          ))}
        </div>
        <div className={`flex items-center gap-3 pl-10 ${pop("delay-[1200ms]")}`} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ animationDelay: `${i * 150}ms` }} className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60" />
          ))}
        </div>
      </div>
    </Shell>
  );
};

const CallLogCard = () => {
  const [ref, shown] = useReveal(0.35);
  const pop = (d) => `transition-all duration-700 motion-reduce:transition-none ${d} ${shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`;
  return (
    <Shell>
      <div ref={ref} className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/80 backdrop-blur">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <span className="text-xs font-semibold tracking-tight text-neutral-200">Calls · Today</span>
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live now · Aiko
          </span>
        </div>
        <ul className="flex flex-1 flex-col justify-center divide-y divide-white/10 text-[13px] font-medium sm:text-sm">
          {CALLS.map((c, i) => (
            <li key={c.who} style={{ transitionDelay: `${150 + i * 300}ms` }} className={`flex items-center gap-3 px-4 py-3.5 transition-all duration-700 motion-reduce:transition-none sm:px-5 ${shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
              <Orb className="h-7 w-7" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{c.who}</p>
                <p className="truncate text-xs text-neutral-300">{c.note}</p>
              </div>
              <span className="hidden text-xs text-neutral-300 sm:block">{c.time}</span>
              <span className="rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">{c.tag}</span>
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
};

/* --------------------------------- Layout --------------------------------- */

const ROWS = [
  {
    n: "01",
    label: "Connected",
    title: ["Connected to", "your stack."],
    text: "Plug Tsushima into your CRM, calendar, helpdesk and messaging. Your agent works with the data you already have.",
    Visual: ConnectCard,
  },
  {
    n: "02",
    label: "Learns",
    title: ["Learns how", "you work."],
    text: "Tell it once. Tone, rules and what to never say stick across every call.",
    Visual: LearnCard,
  },
  {
    n: "03",
    label: "On your number",
    title: ["Answers on", "your number."],
    text: "Get a new number or connect your own. Every call comes with a transcript, an outcome and a clean hand-off to your team.",
    Visual: CallLogCard,
  },
];

const HomePageSection3 = () => (
  /* relative z-10 = above the shared dot canvas; bg-transparent = dots show through */
  <section id="platform" className="relative z-10 w-full bg-transparent font-['Inter',ui-sans-serif,sans-serif] text-neutral-900 antialiased">
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-28 sm:px-10 sm:pb-36 sm:pt-40 lg:px-14">
      <Reveal>
        <p className="mb-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-800 [text-shadow:0_0_14px_rgba(255,255,255,0.95)]">
          <span className="h-px w-8 bg-neutral-900/30" /> 02 · Platform
        </p>
      </Reveal>
      <Heading />

      <div className="mt-20 flex flex-col gap-24 sm:mt-32 sm:gap-40">
        {ROWS.map(({ n, label, title, text, Visual }, i) => (
          <div key={n} className="grid items-center gap-10 md:grid-cols-2 md:gap-16 lg:gap-24">
            <Reveal className={i % 2 === 1 ? "md:order-2" : ""}>
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-700 [text-shadow:0_0_14px_rgba(255,255,255,0.95)]">{n} — {label}</p>
              <h3 className="text-[clamp(2rem,3.8vw,3.5rem)] font-light leading-[1.02] tracking-[-0.035em]">
                {title[0]}
                <br />
                <span className={`${SERIF} font-normal italic`}>{title[1]}</span>
              </h3>
              <p className="mt-6 max-w-sm text-base font-medium leading-relaxed text-neutral-800 sm:text-[17px] [text-shadow:0_0_14px_rgba(255,255,255,0.95)]">{text}</p>
            </Reveal>
            <Reveal delay={1} className={i % 2 === 1 ? "md:order-1" : ""}>
              <Visual />
            </Reveal>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HomePageSection3;