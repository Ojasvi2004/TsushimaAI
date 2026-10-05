import axios from "axios";
import { useEffect, useState } from "react";

/* DashboardPage
   (Render <NavbarAfterLogin /> globally or above this page; the page leaves room for it.)

   Layout, top to bottom:
     1. Greeting + two actions (the first thing a returning user wants: "what's going on, and make something").
     2. Four headline numbers, each with a tiny 7-day bar chart.
     3. Two columns: your agents (wide) | next calls + recent activity (narrow).
     4. A dark "describe a human" panel, the same black card as the login page's side panel,
        so creating a new persona is one typed sentence away.
     5. Prebuilt humans to start from.

   Data:
     - The user comes from GET {API}/api/user/getUserData (Bearer token saved by LoginPage).
       No token or a 401 sends the visitor to /login. Pass a `user` prop to skip the request.
     - Your backend has no agents / calls / stats endpoints yet, so those arrive as props and
       default to sample data. Replace them with real data when the endpoints exist.

   API base URL: VITE_API_URL (e.g. http://localhost:5002) or a dev proxy for "/api".
   Tailwind only. */

const API = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "token";

const SERIF = "font-['Instrument_Serif',ui-serif,Georgia,serif]";
const EASE = "ease-[cubic-bezier(.22,1,.36,1)]";
const DOTS =
  "bg-[radial-gradient(circle,rgba(10,10,10,0.18)_1px,transparent_1.6px)] [background-size:14px_14px]";
const DOTS_DARK =
  "bg-[radial-gradient(circle,rgba(255,255,255,0.16)_1px,transparent_1.6px)] [background-size:14px_14px]";

/* ----------------------------- sample data (replace with real) ----------------------------- */
const SAMPLE_STATS = [
  { label: "Agents live", value: "3", note: "of 4 deployed", spark: [2, 3, 3, 2, 3, 3, 3] },
  { label: "Calls this week", value: "47", note: "+12 vs last week", spark: [4, 7, 5, 9, 8, 6, 8] },
  { label: "Hours hosted", value: "18.5", note: "across all agents", spark: [2, 3, 2, 4, 3, 2, 3] },
  { label: "Avg. reply time", value: "0.8s", note: "faster than last week", spark: [5, 4, 5, 3, 4, 3, 3] },
];
const SAMPLE_AGENTS = [
  { id: 1, name: "Aiko", role: "Customer success host", status: "live", calls: 21, last: "On a call now" },
  { id: 2, name: "Ravi", role: "Sales demo presenter", status: "live", calls: 14, last: "Finished 12 min ago" },
  { id: 3, name: "Sofia", role: "Onboarding guide", status: "live", calls: 9, last: "Finished 2 h ago" },
  { id: 4, name: "Leo", role: "Support triage", status: "paused", calls: 3, last: "Paused yesterday" },
];
const SAMPLE_CALLS = [
  { id: 1, time: "3:00 PM", title: "Customer call with Northwind", agent: "Aiko" },
  { id: 2, time: "4:30 PM", title: "Product demo for Helix Labs", agent: "Ravi" },
  { id: 3, time: "Tomorrow, 10:00", title: "New hire onboarding", agent: "Sofia" },
];
const SAMPLE_ACTIVITY = [
  "Ravi finished the Helix Labs demo and filed notes in your CRM.",
  "Aiko answered 6 pricing questions from the FAQ.",
  "You added 2 scripts to Sofia's memory.",
  "Leo was paused by you.",
];
const PREBUILT = [
  { name: "Mara", role: "Executive assistant" },
  { name: "Jun", role: "Technical interviewer" },
  { name: "Elise", role: "Concierge" },
];
const IDEAS = ["A friendly SaaS demo host", "A calm support agent who speaks Spanish", "A recruiter who screens candidates"];

/* ----------------------------- bits ----------------------------- */
const Orb = ({ className = "", dark = true }) => (
  <span className={`relative block shrink-0 rounded-full ${dark ? "bg-white" : "bg-neutral-900"} ${className}`}>
    <span
      className={`absolute inset-0 rounded-full [background-size:6px_6px] ${
        dark
          ? "bg-[radial-gradient(circle,rgba(10,10,10,0.55)_1px,transparent_1.4px)]"
          : "bg-[radial-gradient(circle,rgba(255,255,255,0.5)_1px,transparent_1.4px)]"
      }`}
    />
  </span>
);

const Spark = ({ data }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden="true">
      {data.map((v, i) => (
        <span
          key={i}
          style={{ height: `${Math.max(12, (v / max) * 100)}%` }}
          className={`w-1.5 rounded-full ${i === data.length - 1 ? "bg-neutral-900" : "bg-neutral-900/20"}`}
        />
      ))}
    </div>
  );
};

const StatusPill = ({ status }) => {
  const live = status === "live";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        live ? "border-neutral-900/20 text-neutral-900" : "border-neutral-900/10 text-neutral-600"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-emerald-500" : "bg-neutral-400"}`} />
      {live ? "Live" : "Paused"}
    </span>
  );
};

const Card = ({ className = "", children }) => (
  <div className={`rounded-[28px] border border-neutral-900/10 bg-white ${className}`}>{children}</div>
);

const SectionHead = ({ title, href, cta }) => (
  <div className="mb-4 flex items-baseline justify-between px-1">
    <h2 className="text-lg font-semibold tracking-tight text-neutral-900">{title}</h2>
    {href && (
      <a href={href} className="text-sm font-semibold text-neutral-800 underline decoration-neutral-900/40 underline-offset-[5px] transition hover:decoration-neutral-900">
        {cta}
      </a>
    )}
  </div>
);

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/* ----------------------------- page ----------------------------- */
const DashboardPage = ({
  user: userProp,
  stats = SAMPLE_STATS,
  agents = SAMPLE_AGENTS,
  calls = SAMPLE_CALLS,
  activity = SAMPLE_ACTIVITY,
  onCreate,
}) => {
  const [user, setUser] = useState(userProp || null);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* load the signed-in user */
  useEffect(() => {
    if (userProp) return;
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    if (!token) { window.location.assign("/login"); return; }
    let cancelled = false;
    axios
      .get(`${API}/api/user/getUserData`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => { if (!cancelled) setUser(data.user); })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          sessionStorage.removeItem(TOKEN_KEY);
          window.location.assign("/login");
        } else setError("We couldn't load your account details. Refresh to try again.");
      });
    return () => { cancelled = true; };
  }, [userProp]);

  const rise = (d = 0) => ({
    style: { transitionDelay: `${d}ms` },
    className: `transition-all duration-1000 ${EASE} motion-reduce:transition-none ${
      ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
    }`,
  });

  const firstName = user?.name?.split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const create = (e) => {
    e.preventDefault();
    const text = prompt.trim();
    if (onCreate) onCreate(text);
    else window.location.assign(`/studio/new${text ? `?prompt=${encodeURIComponent(text)}` : ""}`);
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap"
      />

      <main className="relative min-h-screen w-full overflow-hidden bg-white px-4 pb-16 pt-28 font-['Inter',ui-sans-serif,sans-serif] text-neutral-900 antialiased sm:px-8 sm:pt-32 lg:px-12">
        <div className={`pointer-events-none absolute -right-32 -top-32 h-[34rem] w-[34rem] ${DOTS} [mask-image:radial-gradient(circle_at_center,black_0%,transparent_65%)]`} />

        <div className="relative mx-auto w-full max-w-[1180px]">
          {/* 1 ------------------------------ greeting ------------------------------ */}
          <header {...rise(100)} className={`flex flex-wrap items-end justify-between gap-6 ${rise(100).className}`}>
            <div>
              <p className="mb-4 text-sm font-semibold text-neutral-700">{today}</p>
              <h1 className="text-[clamp(2.6rem,5.4vw,4.5rem)] font-extralight leading-[0.95] tracking-[-0.04em]">
                {greeting()},
                <br />
                {firstName ? (
                  <span className={`${SERIF} font-normal italic`}>{firstName}.</span>
                ) : (
                  <span aria-hidden="true" className="mt-2 inline-block h-[0.8em] w-48 animate-pulse rounded-full bg-neutral-900/10 align-middle" />
                )}
              </h1>
              <p className="mt-5 max-w-md text-base font-medium leading-relaxed text-neutral-700">
                {error || "Two calls are coming up today. Your agents are ready for both."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/prebuilt"
                className="rounded-full border border-neutral-900/25 px-6 py-3 text-sm font-semibold tracking-tight text-neutral-900 transition-colors hover:border-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              >
                Browse library
              </a>
              <a
                href="/studio/new"
                className="group inline-flex items-center gap-3 rounded-full bg-neutral-900 py-2 pl-6 pr-2 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              >
                New persona
                <span aria-hidden="true" className={`grid h-9 w-9 place-items-center rounded-full bg-white text-neutral-900 transition-transform duration-500 ${EASE} group-hover:rotate-90`}>+</span>
              </a>
            </div>
          </header>

          {/* 2 ------------------------------ numbers ------------------------------ */}
          <section aria-label="This week at a glance" {...rise(220)} className={`mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4 ${rise(220).className}`}>
            {stats.map((s) => (
              <Card key={s.label} className="flex flex-col justify-between p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-700">{s.label}</p>
                  <Spark data={s.spark} />
                </div>
                <div className="mt-6">
                  <p className="text-4xl font-extralight tracking-[-0.04em] sm:text-5xl">{s.value}</p>
                  <p className="mt-1 text-[13px] font-medium text-neutral-600">{s.note}</p>
                </div>
              </Card>
            ))}
          </section>

          {/* 3 ------------------------------ agents + schedule ------------------------------ */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <section {...rise(340)} className={rise(340).className}>
              <SectionHead title="Your agents" href="/agents" cta="Manage all" />
              <Card className="divide-y divide-neutral-900/10 p-2">
                {agents.map((a) => (
                  <a
                    key={a.id}
                    href={`/agents/${a.id}`}
                    className="group flex items-center gap-4 rounded-[22px] px-3 py-3.5 transition-colors hover:bg-neutral-900/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900 sm:px-4"
                  >
                    <Orb dark={false} className="h-11 w-11" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold tracking-tight">{a.name}</p>
                      <p className="truncate text-sm font-medium text-neutral-600">{a.role}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-semibold">{a.calls} calls</p>
                      <p className="text-[13px] font-medium text-neutral-600">{a.last}</p>
                    </div>
                    <StatusPill status={a.status} />
                    <span aria-hidden="true" className="text-lg text-neutral-500 transition-transform duration-500 group-hover:translate-x-1">→</span>
                  </a>
                ))}
              </Card>
            </section>

            <div className="space-y-8">
              <section {...rise(420)} className={rise(420).className}>
                <SectionHead title="Up next" />
                <Card className="p-5">
                  <ol className="relative space-y-5 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-neutral-900/15">
                    {calls.map((c, i) => (
                      <li key={c.id} className="relative pl-7">
                        <span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-white ${i === 0 ? "bg-neutral-900" : "bg-neutral-400"}`} />
                        <p className="text-[13px] font-semibold text-neutral-600">{c.time}</p>
                        <p className="text-sm font-semibold leading-snug tracking-tight">{c.title}</p>
                        <p className="text-[13px] font-medium text-neutral-600">Hosted by {c.agent}</p>
                      </li>
                    ))}
                  </ol>
                </Card>
              </section>

              <section {...rise(500)} className={rise(500).className}>
                <SectionHead title="Recent activity" />
                <Card className="p-5">
                  <ul className="space-y-3.5">
                    {activity.map((t, i) => (
                      <li key={i} className="flex gap-3 text-sm font-medium leading-relaxed text-neutral-800">
                        <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neutral-900" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            </div>
          </div>

          {/* 4 ------------------------------ describe a human ------------------------------ */}
          <section
            {...rise(580)}
            className={`relative mt-12 overflow-hidden rounded-[32px] bg-neutral-950 text-white shadow-[0_40px_100px_-40px_rgba(0,0,0,0.5)] ${rise(580).className}`}
          >
            <div className={`absolute inset-0 ${DOTS_DARK} [mask-image:radial-gradient(ellipse_at_80%_20%,black_10%,transparent_75%)]`} />
            <div className="relative grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-[minmax(0,1.3fr)_auto]">
              <div>
                <h2 className="text-[clamp(1.9rem,3.6vw,3rem)] font-extralight leading-[1] tracking-[-0.035em]">
                  Describe a human,
                  <br />
                  <span className={`${SERIF} font-normal italic`}>and meet them.</span>
                </h2>
                <form onSubmit={create} className="mt-8 max-w-xl">
                  <label htmlFor="persona-prompt" className="sr-only">Describe your new persona</label>
                  <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.06] py-2 pl-6 pr-2 transition-colors focus-within:border-white/70">
                    <input
                      id="persona-prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="A warm onboarding guide who explains things simply"
                      className="min-w-0 flex-1 bg-transparent text-base font-medium text-white placeholder:font-normal placeholder:text-neutral-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-white py-2.5 pl-5 pr-2.5 text-sm font-semibold tracking-tight text-neutral-900 transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      Create
                      <span aria-hidden="true" className={`grid h-7 w-7 place-items-center rounded-full bg-neutral-900 text-white transition-transform duration-500 ${EASE} group-hover:-rotate-45`}>→</span>
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {IDEAS.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => setPrompt(idea)}
                        className="rounded-full border border-white/20 px-3.5 py-1.5 text-[13px] font-semibold text-neutral-200 transition-colors hover:border-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </form>
              </div>

              <div aria-hidden="true" className="relative mx-auto hidden place-items-center lg:grid">
                {[0, 1].map((i) => (
                  <span
                    key={i}
                    style={{ animationDelay: `${i * 1500}ms`, animationDuration: "3s" }}
                    className="absolute h-36 w-36 animate-ping rounded-full border border-white/25 motion-reduce:hidden"
                  />
                ))}
                <Orb className="h-36 w-36" />
              </div>
            </div>
          </section>

          {/* 5 ------------------------------ prebuilt ------------------------------ */}
          <section {...rise(660)} className={`mt-12 ${rise(660).className}`}>
            <SectionHead title="Start from a prebuilt human" href="/prebuilt" cta="See the library" />
            <div className="grid gap-3 sm:grid-cols-3">
              {PREBUILT.map((p) => (
                <a
                  key={p.name}
                  href={`/prebuilt?pick=${p.name.toLowerCase()}`}
                  className="group flex items-center gap-4 rounded-[28px] border border-neutral-900/10 bg-white p-4 transition-colors hover:border-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                >
                  <Orb dark={false} className="h-14 w-14" />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold tracking-tight">{p.name}</p>
                    <p className="truncate text-sm font-medium text-neutral-600">{p.role}</p>
                  </div>
                  <span aria-hidden="true" className={`grid h-9 w-9 place-items-center rounded-full border border-neutral-900/20 text-neutral-900 transition-transform duration-500 ${EASE} group-hover:-rotate-45 group-hover:border-neutral-900`}>→</span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default DashboardPage;