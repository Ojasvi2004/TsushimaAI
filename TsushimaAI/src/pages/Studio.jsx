import axios from "axios";
import { useEffect, useRef, useState } from "react";

/* StudioPage  (route: /studio)
   (Render <NavbarAfterLogin /> globally or above this page; the page leaves room for it.)

   The front door to creating an agent. The form itself lives at /studio/new; this page gets
   people into it by the quickest route:
     1. Describe it (type or speak a sentence)         -> /studio/new?prompt=...
     2. Start from a use case                          -> /studio/new?template=...
     3. Continue a draft                               -> /agents/:id/edit
     4. Or browse ready-made agents                    -> /prebuilt
   Plus a short "how it works" and a checklist of what to have ready (so setup doesn't stall).

   Drafts come from GET {API}/api/voice-agent (agents with status "draft"), using the Bearer token
   from LoginPage. If that route is missing, one sample draft is shown with a note.
   Props (optional): drafts (skips the request).
   API base URL: VITE_API_URL or a dev proxy for "/api".  Tailwind only. */

const API = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "token";

const SERIF = "font-['Instrument_Serif',ui-serif,Georgia,serif]";
const EASE = "ease-[cubic-bezier(.22,1,.36,1)]";
const DOTS =
  "bg-[radial-gradient(circle,rgba(10,10,10,0.18)_1px,transparent_1.6px)] [background-size:14px_14px]";
const DOTS_DARK =
  "bg-[radial-gradient(circle,rgba(255,255,255,0.16)_1px,transparent_1.6px)] [background-size:14px_14px]";
const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900";

const EXAMPLES = [
  "A receptionist for my dental clinic who books appointments in Hindi and English",
  "A friendly agent that calls new leads and books a demo",
  "A calm support agent who solves problems step by step",
  "An agent that reminds customers about payments, politely",
];
const USE_CASES = [
  { id: "reception", name: "Receptionist", desc: "Answers calls, books and takes messages.", dir: "Inbound" },
  { id: "leads", name: "Lead qualifier", desc: "Calls new leads and books a demo.", dir: "Outbound" },
  { id: "support", name: "Support desk", desc: "Solves common issues, escalates the rest.", dir: "Inbound" },
  { id: "reminders", name: "Reminders", desc: "Confirms appointments and follows up.", dir: "Outbound" },
];
const STEPS = [
  { t: "Describe", d: "Say what the agent should do, in your own words." },
  { t: "Shape", d: "Choose its voice, languages, phone number and hours." },
  { t: "Test and launch", d: "Hear it, fix what's off, then switch it on." },
];
const READY = [
  ["A phone number", "A new one from us, or your own to connect."],
  ["Documents it should know", "Price lists, FAQs or service menus (PDF, Word, TXT)."],
  ["A number to transfer to", "Where urgent or tricky calls should go."],
  ["Business hours", "When it should answer, and what happens after hours."],
];

const SAMPLE_DRAFTS = [
  { id: "d1", name: "Mara", template: "Start from scratch", updatedAt: new Date(Date.now() - 3 * 3600000).toISOString() },
];

const relTime = (iso) => {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)} h ago`;
  if (m < 60 * 48) return "yesterday";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const Orb = ({ className = "", dark = true, children }) => (
  <span className={`relative grid shrink-0 place-items-center rounded-full ${dark ? "bg-white text-neutral-900" : "bg-neutral-900 text-white"} ${className}`}>
    <span className={`absolute inset-0 rounded-full [background-size:6px_6px] ${dark ? "bg-[radial-gradient(circle,rgba(10,10,10,0.55)_1px,transparent_1.4px)]" : "bg-[radial-gradient(circle,rgba(255,255,255,0.5)_1px,transparent_1.4px)]"}`} />
    {children && <span className={`relative rounded-full px-1.5 text-lg font-semibold ${dark ? "bg-white" : "bg-neutral-900"}`}>{children}</span>}
  </span>
);

const SectionHead = ({ title, href, cta }) => (
  <div className="mb-4 flex items-baseline justify-between px-1">
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    {href && <a href={href} className={`rounded text-sm font-semibold text-neutral-800 underline decoration-neutral-900/40 underline-offset-[5px] transition hover:decoration-neutral-900 ${focusRing}`}>{cta}</a>}
  </div>
);

const StudioPage = ({ drafts: draftsProp }) => {
  const [ready, setReady] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [ph, setPh] = useState(0);
  const [drafts, setDrafts] = useState(draftsProp || []);
  const [sample, setSample] = useState(false);
  const [listening, setListening] = useState(false);
  const [micMsg, setMicMsg] = useState("");
  const recRef = useRef(null);

  useEffect(() => { const id = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(id); }, []);

  /* rotate the placeholder (not for reduced motion, and not while typing) */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setPh((n) => (n + 1) % EXAMPLES.length), 3800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => recRef.current?.abort?.(), []);

  /* drafts */
  useEffect(() => {
    if (draftsProp) { setDrafts(draftsProp); return; }
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    if (!token) { window.location.assign("/login"); return; }
    let cancelled = false;
    axios.get(`${API}/api/voice-agent`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data.agents || [];
        setDrafts(list.filter((a) => a.status === "draft").map((a) => ({ id: a.id, name: a.name, template: a.template, updatedAt: a.updatedAt || a.lastCall })));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 401) { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); window.location.assign("/login"); }
        else if (err?.response?.status === 404 || (err?.request && !err.response)) { setDrafts(SAMPLE_DRAFTS); setSample(true); }
      });
    return () => { cancelled = true; };
  }, [draftsProp]);

  const go = (e) => {
    e.preventDefault();
    const text = prompt.trim();
    window.location.assign(`/studio/new${text ? `?prompt=${encodeURIComponent(text)}` : ""}`);
  };

  const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const speak = () => {
    if (!SR) return setMicMsg("Speaking isn't supported in this browser. Try Chrome or Edge.");
    if (listening) { recRef.current?.stop(); return; }
    setMicMsg("");
    const r = new SR();
    r.lang = "en-US"; r.interimResults = true; r.continuous = false;
    r.onresult = (e) => setPrompt(Array.from(e.results).map((x) => x[0].transcript).join(" "));
    r.onerror = (e) => setMicMsg(e.error === "not-allowed" ? "Microphone access was blocked. Allow it in your browser settings." : "Couldn't hear anything. Try again.");
    r.onend = () => setListening(false);
    recRef.current = r; setListening(true); r.start();
  };

  const rise = (d = 0) => ({
    style: { transitionDelay: `${d}ms` },
    className: `transition-all duration-1000 ${EASE} motion-reduce:transition-none ${ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`,
  });

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap" />

      <main className="relative min-h-screen w-full overflow-x-clip bg-white px-4 pb-20 pt-28 font-['Inter',ui-sans-serif,sans-serif] text-neutral-900 antialiased sm:px-8 sm:pt-32 lg:px-12">
        <div className={`pointer-events-none absolute -left-32 -top-32 h-[34rem] w-[34rem] ${DOTS} [mask-image:radial-gradient(circle_at_center,black_0%,transparent_65%)]`} />

        <div className="relative mx-auto w-full max-w-[1180px]">
          <header {...rise(100)} className={rise(100).className}>
            <h1 className="text-[clamp(2.6rem,5.4vw,4.5rem)] font-extralight leading-[0.95] tracking-[-0.04em]">
              The <span className={`${SERIF} font-normal italic`}>studio.</span>
            </h1>
            <p className="mt-5 max-w-md text-base font-medium leading-relaxed text-neutral-700">
              Make a voice agent that answers your phone. Start with a sentence, a use case, or a draft.
            </p>
          </header>

          {/* 1 describe */}
          <section {...rise(220)} className={`relative mt-10 overflow-hidden rounded-[32px] bg-neutral-950 text-white shadow-[0_40px_100px_-40px_rgba(0,0,0,0.5)] ${rise(220).className}`}>
            <div className={`absolute inset-0 ${DOTS_DARK} [mask-image:radial-gradient(ellipse_at_80%_20%,black_10%,transparent_75%)]`} />
            <div className="relative grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-[minmax(0,1.5fr)_auto]">
              <div>
                <h2 className="text-[clamp(1.9rem,3.6vw,3rem)] font-extralight leading-[1] tracking-[-0.035em]">
                  Describe it,
                  <br />
                  <span className={`${SERIF} font-normal italic`}>and meet your agent.</span>
                </h2>
                <form onSubmit={go} className="mt-8 max-w-2xl">
                  <label htmlFor="studio-prompt" className="sr-only">Describe your voice agent</label>
                  <div className="flex items-center gap-2 rounded-[28px] border border-white/25 bg-white/[0.06] py-2 pl-6 pr-2 transition-colors focus-within:border-white/70">
                    <input id="studio-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={EXAMPLES[ph]}
                      className="min-w-0 flex-1 bg-transparent py-2 text-base font-medium text-white placeholder:font-normal placeholder:text-neutral-400 focus:outline-none" />
                    <button type="button" onClick={speak} aria-pressed={listening} aria-label={listening ? "Stop listening" : "Describe it by speaking"}
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${listening ? "border-rose-400 bg-rose-500/20" : "border-white/25 hover:border-white/70"}`}>
                      <span aria-hidden="true" className={`h-3 w-3 rounded-full ${listening ? "animate-pulse bg-rose-400" : "bg-white"}`} />
                    </button>
                    <button type="submit" className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-white py-2.5 pl-5 pr-2.5 text-sm font-semibold tracking-tight text-neutral-900 transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                      Create
                      <span aria-hidden="true" className={`grid h-7 w-7 place-items-center rounded-full bg-neutral-900 text-white transition-transform duration-500 ${EASE} group-hover:-rotate-45`}>→</span>
                    </button>
                  </div>
                  <p aria-live="polite" className="mt-3 min-h-5 text-[13px] font-medium text-neutral-300">{listening ? "Listening… describe your agent." : micMsg}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {EXAMPLES.slice(0, 3).map((x) => (
                      <button key={x} type="button" onClick={() => setPrompt(x)} className="max-w-full truncate rounded-full border border-white/20 px-3.5 py-1.5 text-[13px] font-semibold text-neutral-200 transition-colors hover:border-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">{x}</button>
                    ))}
                  </div>
                </form>
              </div>
              <div aria-hidden="true" className="relative mx-auto hidden place-items-center lg:grid">
                {[0, 1].map((i) => <span key={i} style={{ animationDelay: `${i * 1500}ms`, animationDuration: "3s" }} className="absolute h-36 w-36 animate-ping rounded-full border border-white/25 motion-reduce:hidden" />)}
                <Orb className="h-36 w-36" />
              </div>
            </div>
          </section>

          {/* 2 use cases */}
          <section {...rise(340)} className={`mt-12 ${rise(340).className}`}>
            <SectionHead title="Or start from a use case" href="/prebuilt" cta="Browse ready-made agents" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {USE_CASES.map((u) => (
                <a key={u.id} href={`/studio/new?template=${u.id}`} className={`group flex flex-col rounded-[28px] border border-neutral-900/10 bg-white p-5 transition-colors hover:border-neutral-900 sm:p-6 ${focusRing}`}>
                  <span className="mb-6 w-fit rounded-full border border-neutral-900/10 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">{u.dir}</span>
                  <span className="text-lg font-semibold tracking-tight">{u.name}</span>
                  <span className="mt-1 flex-1 text-sm font-medium text-neutral-600">{u.desc}</span>
                  <span aria-hidden="true" className={`mt-6 grid h-9 w-9 place-items-center rounded-full border border-neutral-900/20 transition-transform duration-500 ${EASE} group-hover:-rotate-45 group-hover:border-neutral-900`}>→</span>
                </a>
              ))}
            </div>
            <a href="/studio/new?template=custom" className={`mt-3 inline-flex rounded-full px-1 text-sm font-semibold text-neutral-800 underline decoration-neutral-900/40 underline-offset-[5px] hover:decoration-neutral-900 ${focusRing}`}>Start with a blank agent</a>
          </section>

          {/* 3 drafts */}
          {drafts.length > 0 && (
            <section {...rise(420)} className={`mt-12 ${rise(420).className}`}>
              <SectionHead title="Continue where you left off" />
              <div className="divide-y divide-neutral-900/10 rounded-[28px] border border-neutral-900/10 bg-white p-2">
                {drafts.map((d) => (
                  <a key={d.id} href={`/agents/${d.id}/edit`} className={`group flex items-center gap-4 rounded-[22px] px-3 py-3.5 transition-colors hover:bg-neutral-900/[0.04] sm:px-4 ${focusRing}`}>
                    <Orb dark={false} className="h-11 w-11">{(d.name?.[0] || "?").toUpperCase()}</Orb>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold tracking-tight">{d.name || "Untitled agent"}</p>
                      <p className="truncate text-sm font-medium text-neutral-600">{d.template || "Draft"}{d.updatedAt ? ` · edited ${relTime(d.updatedAt)}` : ""}</p>
                    </div>
                    <span className="rounded-full border border-dashed border-neutral-900/25 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">Draft</span>
                    <span aria-hidden="true" className="text-lg text-neutral-500 transition-transform duration-500 group-hover:translate-x-1">→</span>
                  </a>
                ))}
              </div>
              {sample && <p role="status" className="mt-3 px-1 text-[13px] font-medium text-neutral-600">Sample draft shown, because <code className="font-semibold">GET /api/voice-agent</code> isn't available yet.</p>}
            </section>
          )}

          {/* 4 how it works + have ready */}
          <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <section {...rise(500)} className={rise(500).className}>
              <SectionHead title="How it works" />
              <ol className="space-y-3">
                {STEPS.map((s, i) => (
                  <li key={s.t} className="flex items-start gap-4 rounded-[28px] border border-neutral-900/10 bg-white p-5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-sm font-semibold text-white">{i + 1}</span>
                    <div>
                      <p className="text-base font-semibold tracking-tight">{s.t}</p>
                      <p className="mt-0.5 text-sm font-medium text-neutral-600">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section {...rise(580)} className={rise(580).className}>
              <SectionHead title="Have these ready" />
              <div className="rounded-[28px] border border-neutral-900/10 bg-white p-5 sm:p-6">
                <ul className="space-y-4">
                  {READY.map(([t, d]) => (
                    <li key={t} className="flex gap-3">
                      <span aria-hidden="true" className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-neutral-900/40" />
                      <div>
                        <p className="text-sm font-semibold tracking-tight">{t}</p>
                        <p className="text-[13px] font-medium text-neutral-600">{d}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-neutral-900/10 pt-4 text-[13px] font-medium text-neutral-600">None of these are required to start. You can add them after the agent is created.</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
};

export default StudioPage;