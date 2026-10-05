import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* MyAgentsPage  (route: /agents)
   (Render <NavbarAfterLogin /> globally or above this page; the page leaves room for it.)

   Layout:
     1. Header: title, agent count, "New agent" button.
     2. Four numbers for the week: live agents, calls, minutes handled, success rate.
     3. Toolbar: search, status tabs with counts (All / Live / Paused / Draft), sort.
     4. A grid of agent cards. Each card shows who the agent is, its phone number, a 7-day
        call sparkline, three stats, the last call, an on/off switch and a "..." menu
        (Edit, Call logs, Duplicate, Delete with a confirm dialog).
     Empty, no-results, loading and error states are all handled.

   Backend (build these; the page already calls them with the Bearer token from LoginPage):
     GET    {API}/api/voice-agent                 -> { agents: [...] }  or just [...]
     PATCH  {API}/api/voice-agent/:id             body { status: "live" | "paused" }
     POST   {API}/api/voice-agent/:id/duplicate   -> { agent }
     DELETE {API}/api/voice-agent/:id
   Agent shape: { id, name, business, template, status: "live"|"paused"|"draft",
                  direction: "inbound"|"outbound"|"both", number, voice, languages: ["English"],
                  callsWeek, avgSeconds, successRate (0-100), calls7: [7 numbers], lastCall (ISO) }
   Until GET /api/voice-agent exists (404 or no server), the page shows SAMPLE agents with a notice
   and does the actions locally, so you can see and style it right away.

   Props (optional): agents (skips fetching), onToggle(agent, nextStatus), onDuplicate(agent),
                     onDelete(agent)  (each async; throw to show an error).
   API base URL: VITE_API_URL or a dev proxy for "/api".  Tailwind only. */

const API = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "token";

const SERIF = "font-['Instrument_Serif',ui-serif,Georgia,serif]";
const EASE = "ease-[cubic-bezier(.22,1,.36,1)]";
const DOTS =
  "bg-[radial-gradient(circle,rgba(10,10,10,0.18)_1px,transparent_1.6px)] [background-size:14px_14px]";
const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900";

const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();
const SAMPLE = [
  { id: "a1", name: "Aiko", business: "Sharma Dental Clinic", template: "Receptionist", status: "live", direction: "inbound", number: "+91 22 4567 8901", voice: "Aria", languages: ["English", "Hindi"], callsWeek: 63, avgSeconds: 148, successRate: 82, calls7: [6, 9, 11, 8, 10, 12, 7], lastCall: ago(4) },
  { id: "a2", name: "Ravi", business: "Helix Labs", template: "Lead qualifier", status: "live", direction: "outbound", number: "+91 80 4123 7788", voice: "Kabir", languages: ["English"], callsWeek: 41, avgSeconds: 96, successRate: 34, calls7: [3, 5, 6, 8, 7, 6, 6], lastCall: ago(37) },
  { id: "a3", name: "Sofia", business: "Northwind Support", template: "Support desk", status: "live", direction: "inbound", number: "+1 415 555 0134", voice: "Luna", languages: ["English", "Spanish"], callsWeek: 28, avgSeconds: 214, successRate: 71, calls7: [2, 4, 5, 3, 4, 5, 5], lastCall: ago(125) },
  { id: "a4", name: "Leo", business: "Sharma Dental Clinic", template: "Reminders", status: "paused", direction: "outbound", number: "+91 22 4567 8902", voice: "Noah", languages: ["Hindi"], callsWeek: 3, avgSeconds: 52, successRate: 66, calls7: [0, 0, 1, 2, 0, 0, 0], lastCall: ago(60 * 26) },
  { id: "a5", name: "Mara", business: "", template: "Start from scratch", status: "draft", direction: "inbound", number: "", voice: "Mei", languages: ["English"], callsWeek: 0, avgSeconds: 0, successRate: 0, calls7: [0, 0, 0, 0, 0, 0, 0], lastCall: null },
];

/* ------------------------------ helpers ------------------------------ */
const relTime = (iso) => {
  if (!iso) return "No calls yet";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)} h ago`;
  if (m < 60 * 48) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const dur = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "–");
const DIR = { inbound: "Inbound", outbound: "Outbound", both: "In & out" };

const Orb = ({ className = "", children }) => (
  <span className={`relative grid shrink-0 place-items-center rounded-full bg-neutral-900 text-white ${className}`}>
    <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.5)_1px,transparent_1.4px)] [background-size:6px_6px]" />
    {children && <span className="relative rounded-full bg-neutral-900 px-1.5 text-lg font-semibold">{children}</span>}
  </span>
);

const Spark = ({ data }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden="true">
      {data.map((v, i) => (
        <span key={i} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} className={`w-1.5 rounded-full ${i === data.length - 1 ? "bg-neutral-900" : "bg-neutral-900/20"}`} />
      ))}
    </div>
  );
};

const StatusPill = ({ status }) => {
  const map = {
    live: { l: "Live", dot: "animate-pulse bg-emerald-500", b: "border-neutral-900/20 text-neutral-900" },
    paused: { l: "Paused", dot: "bg-neutral-400", b: "border-neutral-900/10 text-neutral-600" },
    draft: { l: "Draft", dot: "border border-neutral-500", b: "border-dashed border-neutral-900/25 text-neutral-600" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map.b}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${map.dot}`} />
      {map.l}
    </span>
  );
};

const Switch = ({ checked, onChange, label, disabled }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange}
    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 disabled:cursor-wait disabled:opacity-60 ${focusRing} ${checked ? "bg-neutral-900" : "bg-neutral-900/20"}`}>
    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 ${EASE} ${checked ? "left-6" : "left-1"}`} />
  </button>
);

const Stat = ({ label, value, note }) => (
  <div className="rounded-[28px] border border-neutral-900/10 bg-white p-5 sm:p-6">
    <p className="text-sm font-semibold text-neutral-700">{label}</p>
    <p className="mt-5 text-4xl font-extralight tracking-[-0.04em] sm:text-5xl">{value}</p>
    <p className="mt-1 text-[13px] font-medium text-neutral-600">{note}</p>
  </div>
);

/* ------------------------------ card ------------------------------ */
const AgentCard = ({ a, menuOpen, setMenuOpen, busy, onToggle, onDuplicate, askDelete }) => {
  const draft = a.status === "draft";
  const live = a.status === "live";
  return (
    <article className="relative flex flex-col rounded-[28px] border border-neutral-900/10 bg-white p-5 transition-colors hover:border-neutral-900/40 sm:p-6">
      <div className="flex items-start gap-4">
        <Orb className="h-12 w-12">{(a.name[0] || "?").toUpperCase()}</Orb>
        <div className="min-w-0 flex-1">
          <a href={`/agents/${a.id}`} className={`block truncate rounded text-lg font-semibold tracking-tight hover:underline hover:underline-offset-4 ${focusRing}`}>{a.name}</a>
          <p className="truncate text-sm font-medium text-neutral-600">{a.template}{a.business ? ` · ${a.business}` : ""}</p>
        </div>

        <div className="relative">
          <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`Actions for ${a.name}`}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen ? null : a.id); }}
            className={`grid h-9 w-9 place-items-center rounded-full border border-neutral-900/15 text-lg leading-none transition-colors hover:border-neutral-900 ${focusRing}`}>
            <span aria-hidden="true" className="-mt-1">…</span>
          </button>
          {menuOpen && (
            <div role="menu" onClick={(e) => e.stopPropagation()} className="absolute right-0 z-20 mt-2 w-52 rounded-3xl border border-neutral-900/10 bg-white/95 p-2 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.2)] backdrop-blur-xl">
              {[
                { l: "Edit", href: `/agents/${a.id}/edit` },
                { l: "Call logs", href: `/agents/${a.id}/calls` },
              ].map((i) => (
                <a key={i.l} role="menuitem" href={i.href} className="block rounded-full px-3.5 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-900/[0.07]">{i.l}</a>
              ))}
              <button role="menuitem" type="button" onClick={() => { setMenuOpen(null); onDuplicate(a); }} className="block w-full rounded-full px-3.5 py-2 text-left text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-900/[0.07]">Duplicate</button>
              <div className="my-1 border-t border-neutral-900/10" />
              <button role="menuitem" type="button" onClick={() => { setMenuOpen(null); askDelete(a); }} className="block w-full rounded-full px-3.5 py-2 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50">Delete</button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusPill status={a.status} />
        <span className="rounded-full border border-neutral-900/10 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">{DIR[a.direction] || a.direction}</span>
        {a.languages?.[0] && <span className="rounded-full border border-neutral-900/10 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">{a.languages.length > 1 ? `${a.languages[0]} +${a.languages.length - 1}` : a.languages[0]}</span>}
      </div>
      <p className="mt-3 truncate text-sm font-medium text-neutral-700">{a.number || "No number yet"}{a.voice ? ` · ${a.voice} voice` : ""}</p>

      {draft ? (
        <div className="mt-6 flex flex-1 items-end">
          <p className="text-sm font-medium text-neutral-600">Setup isn't finished. Add the missing details to take calls.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-4 border-t border-neutral-900/10 pt-5">
          <dl className="grid grid-cols-3 gap-3">
            <div><dt className="text-xs font-semibold text-neutral-600">Calls</dt><dd className="text-xl font-light tracking-tight">{a.callsWeek}</dd></div>
            <div><dt className="text-xs font-semibold text-neutral-600">Avg. call</dt><dd className="text-xl font-light tracking-tight">{dur(a.avgSeconds)}</dd></div>
            <div><dt className="text-xs font-semibold text-neutral-600">Success</dt><dd className="text-xl font-light tracking-tight">{a.successRate}%</dd></div>
          </dl>
          <Spark data={a.calls7 || [0, 0, 0, 0, 0, 0, 0]} />
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-neutral-900/10 pt-4">
        <p className="min-w-0 truncate text-[13px] font-medium text-neutral-600">{draft ? "Not live yet" : `Last call: ${relTime(a.lastCall)}`}</p>
        {draft ? (
          <a href={`/agents/${a.id}/edit`} className={`group inline-flex shrink-0 items-center gap-2 rounded-full bg-neutral-900 py-1.5 pl-4 pr-1.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 ${focusRing}`}>
            Finish setup
            <span aria-hidden="true" className={`grid h-6 w-6 place-items-center rounded-full bg-white text-neutral-900 transition-transform duration-500 ${EASE} group-hover:-rotate-45`}>→</span>
          </a>
        ) : (
          <label className="flex shrink-0 cursor-pointer items-center gap-2.5 text-sm font-semibold text-neutral-800">
            {live ? "On" : "Off"}
            <Switch checked={live} disabled={busy} label={`${live ? "Pause" : "Resume"} ${a.name}`} onChange={() => onToggle(a)} />
          </label>
        )}
      </div>
    </article>
  );
};

/* ------------------------------ page ------------------------------ */
const MyAgentsPage = ({ agents: agentsProp, onToggle, onDuplicate, onDelete }) => {
  const [ready, setReady] = useState(false);
  const [agents, setAgents] = useState(agentsProp || []);
  const [loading, setLoading] = useState(!agentsProp);
  const [error, setError] = useState("");
  const [sample, setSample] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("recent");
  const [menu, setMenu] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState("");
  const cancelRef = useRef(null);
  const toastTimer = useRef(null);

  const token = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  const authed = () => ({ headers: { Authorization: `Bearer ${token()}` } });
  const toLogin = () => { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); window.location.assign("/login"); };
  const say = (m) => { setToast(m); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 3200); };

  useEffect(() => { const id = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(id); }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const load = useCallback(async () => {
    if (!token()) { window.location.assign("/login"); return; }
    setLoading(true); setError("");
    try {
      const { data } = await axios.get(`${API}/api/voice-agent`, authed());
      setAgents(Array.isArray(data) ? data : data.agents || []);
      setSample(false);
    } catch (err) {
      if (err?.response?.status === 401) return toLogin();
      if (err?.response?.status === 404 || (err?.request && !err.response)) { setAgents(SAMPLE); setSample(true); }
      else setError(err?.response?.data?.message || "We couldn't load your agents. Please try again.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (agentsProp) { setAgents(agentsProp); setLoading(false); } else load(); }, [agentsProp, load]);

  /* close the "..." menu on outside click / Escape; Escape also closes the dialog */
  useEffect(() => {
    const click = () => setMenu(null);
    const key = (e) => { if (e.key === "Escape") { setMenu(null); setConfirm(null); } };
    document.addEventListener("click", click);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("click", click); document.removeEventListener("keydown", key); };
  }, []);
  useEffect(() => { if (confirm) cancelRef.current?.focus(); }, [confirm]);

  const fail = (err, fallback) => {
    if (err?.response?.status === 401) return toLogin();
    say(err?.response?.data?.message || err?.message || fallback);
  };

  const toggle = async (a) => {
    const next = a.status === "live" ? "paused" : "live";
    const prev = agents;
    setBusyId(a.id);
    setAgents((l) => l.map((x) => (x.id === a.id ? { ...x, status: next } : x)));
    try {
      if (onToggle) await onToggle(a, next);
      else if (!sample) await axios.patch(`${API}/api/voice-agent/${a.id}`, { status: next }, authed());
      say(`${a.name} is now ${next === "live" ? "live" : "paused"}.`);
    } catch (err) { setAgents(prev); fail(err, "Couldn't update that agent."); }
    finally { setBusyId(null); }
  };

  const duplicate = async (a) => {
    try {
      let copy;
      if (onDuplicate) copy = await onDuplicate(a);
      else if (!sample) copy = (await axios.post(`${API}/api/voice-agent/${a.id}/duplicate`, null, authed())).data?.agent;
      copy = copy || { ...a, id: `${a.id}-copy-${Date.now()}`, name: `${a.name} copy`, status: "draft", number: "", callsWeek: 0, calls7: [0, 0, 0, 0, 0, 0, 0], lastCall: null, successRate: 0, avgSeconds: 0 };
      setAgents((l) => [copy, ...l]);
      say(`Duplicated ${a.name}. The copy is a draft.`);
    } catch (err) { fail(err, "Couldn't duplicate that agent."); }
  };

  const remove = async () => {
    const a = confirm;
    setConfirm(null);
    const prev = agents;
    setAgents((l) => l.filter((x) => x.id !== a.id));
    try {
      if (onDelete) await onDelete(a);
      else if (!sample) await axios.delete(`${API}/api/voice-agent/${a.id}`, authed());
      say(`${a.name} was deleted.`);
    } catch (err) { setAgents(prev); fail(err, "Couldn't delete that agent."); }
  };

  const counts = useMemo(() => ({
    all: agents.length,
    live: agents.filter((a) => a.status === "live").length,
    paused: agents.filter((a) => a.status === "paused").length,
    draft: agents.filter((a) => a.status === "draft").length,
  }), [agents]);

  const totals = useMemo(() => {
    const calls = agents.reduce((s, a) => s + (a.callsWeek || 0), 0);
    const mins = agents.reduce((s, a) => s + ((a.callsWeek || 0) * (a.avgSeconds || 0)) / 60, 0);
    const withCalls = agents.filter((a) => a.callsWeek > 0);
    const rate = calls ? Math.round(withCalls.reduce((s, a) => s + a.successRate * a.callsWeek, 0) / calls) : 0;
    return { calls, mins: Math.round(mins), rate };
  }, [agents]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = agents.filter((a) =>
      (tab === "all" || a.status === tab) &&
      (!term || [a.name, a.business, a.number, a.template].some((v) => v?.toLowerCase().includes(term))));
    const by = {
      recent: (x, y) => (new Date(y.lastCall || 0) - new Date(x.lastCall || 0)),
      calls: (x, y) => (y.callsWeek || 0) - (x.callsWeek || 0),
      name: (x, y) => x.name.localeCompare(y.name),
    }[sort];
    return [...list].sort(by);
  }, [agents, q, tab, sort]);

  const rise = (d = 0) => ({
    style: { transitionDelay: `${d}ms` },
    className: `transition-all duration-1000 ${EASE} motion-reduce:transition-none ${ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`,
  });

  const tabs = [["all", "All"], ["live", "Live"], ["paused", "Paused"], ["draft", "Drafts"]];

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap" />

      <main className="relative min-h-screen w-full overflow-x-clip bg-white px-4 pb-20 pt-28 font-['Inter',ui-sans-serif,sans-serif] text-neutral-900 antialiased sm:px-8 sm:pt-32 lg:px-12">
        <div className={`pointer-events-none absolute -right-32 -top-32 h-[34rem] w-[34rem] ${DOTS} [mask-image:radial-gradient(circle_at_center,black_0%,transparent_65%)]`} />

        <div className="relative mx-auto w-full max-w-[1180px]">
          {/* 1 header */}
          <header {...rise(100)} className={`flex flex-wrap items-end justify-between gap-6 ${rise(100).className}`}>
            <div>
              <h1 className="text-[clamp(2.6rem,5.4vw,4.5rem)] font-extralight leading-[0.95] tracking-[-0.04em]">
                My <span className={`${SERIF} font-normal italic`}>agents.</span>
              </h1>
              <p className="mt-5 max-w-md text-base font-medium leading-relaxed text-neutral-700">
                {loading ? "Loading your agents…" : agents.length === 0 ? "You haven't created an agent yet." : `${counts.live} of ${counts.all} ${counts.all === 1 ? "agent is" : "agents are"} taking calls right now.`}
              </p>
            </div>
            <a href="/studio/new" className={`group inline-flex items-center gap-3 rounded-full bg-neutral-900 py-2 pl-6 pr-2 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-neutral-700 ${focusRing}`}>
              New agent
              <span aria-hidden="true" className={`grid h-9 w-9 place-items-center rounded-full bg-white text-neutral-900 transition-transform duration-500 ${EASE} group-hover:rotate-90`}>+</span>
            </a>
          </header>

          {sample && (
            <p role="status" className="mt-8 rounded-2xl border border-neutral-900/15 bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-800">
              Showing sample agents because <code className="font-semibold">GET /api/voice-agent</code> isn't available yet. Changes here aren't saved.
            </p>
          )}

          {error ? (
            <div role="alert" className="mt-12 rounded-[28px] border border-neutral-900/10 p-10 text-center">
              <p className="text-lg font-semibold tracking-tight">{error}</p>
              <button type="button" onClick={load} className={`mt-5 rounded-full border border-neutral-900/25 px-6 py-2.5 text-sm font-semibold hover:border-neutral-900 ${focusRing}`}>Try again</button>
            </div>
          ) : loading ? (
            <div aria-busy="true" className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-[28px] border border-neutral-900/10 bg-neutral-900/[0.03]" />)}
            </div>
          ) : agents.length === 0 ? (
            <div {...rise(220)} className={`relative mt-12 overflow-hidden rounded-[32px] bg-neutral-950 px-6 py-16 text-center text-white ${rise(220).className}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.16)_1px,transparent_1.6px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]" />
              <div className="relative">
                <span className="mx-auto mb-6 block h-24 w-24 rounded-full bg-white bg-[radial-gradient(circle,rgba(10,10,10,0.55)_1px,transparent_1.4px)] [background-size:6px_6px]" />
                <h2 className="text-3xl font-extralight tracking-[-0.03em]">No agents <span className={`${SERIF} font-normal italic`}>yet.</span></h2>
                <p className="mx-auto mt-3 max-w-sm text-base font-medium text-neutral-300">Create a receptionist, a lead qualifier or a support agent. It takes a few minutes.</p>
                <a href="/studio/new" className={`group mt-8 inline-flex items-center gap-3 rounded-full bg-white py-2 pl-6 pr-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-200 ${focusRing}`}>
                  Create your first agent
                  <span aria-hidden="true" className={`grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-white transition-transform duration-500 ${EASE} group-hover:-rotate-45`}>→</span>
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* 2 numbers */}
              <section aria-label="This week" {...rise(220)} className={`mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4 ${rise(220).className}`}>
                <Stat label="Agents live" value={counts.live} note={`of ${counts.all} total`} />
                <Stat label="Calls this week" value={totals.calls} note="across all agents" />
                <Stat label="Minutes handled" value={totals.mins} note="this week" />
                <Stat label="Success rate" value={`${totals.rate}%`} note="goal reached on the call" />
              </section>

              {/* 3 toolbar */}
              <div {...rise(300)} className={`mt-10 flex flex-wrap items-center justify-between gap-4 ${rise(300).className}`}>
                <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
                  {tabs.map(([k, l]) => (
                    <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold tracking-tight transition-colors ${focusRing} ${tab === k ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-900/20 text-neutral-800 hover:border-neutral-900"}`}>
                      {l} <span className={tab === k ? "text-neutral-300" : "text-neutral-500"}>{counts[k]}</span>
                    </button>
                  ))}
                </div>
                <div className="flex w-full flex-wrap gap-3 sm:w-auto">
                  <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents" aria-label="Search agents"
                    className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium placeholder:font-normal placeholder:text-neutral-500 transition-colors hover:border-neutral-500 focus:border-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/10 sm:w-56 sm:flex-none" />
                  <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort agents"
                    className="rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:border-neutral-500 focus:border-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/10">
                    <option value="recent">Recently active</option>
                    <option value="calls">Most calls</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </div>
              </div>

              {/* 4 grid */}
              {shown.length === 0 ? (
                <div className="mt-8 rounded-[28px] border border-dashed border-neutral-900/20 p-12 text-center">
                  <p className="text-lg font-semibold tracking-tight">No agents match that.</p>
                  <button type="button" onClick={() => { setQ(""); setTab("all"); }} className={`mt-4 rounded-full text-sm font-semibold underline underline-offset-4 ${focusRing}`}>Clear filters</button>
                </div>
              ) : (
                <section aria-label="Agents" {...rise(380)} className={`mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${rise(380).className}`}>
                  {shown.map((a) => (
                    <AgentCard key={a.id} a={a} menuOpen={menu === a.id} setMenuOpen={setMenu} busy={busyId === a.id}
                      onToggle={toggle} onDuplicate={duplicate} askDelete={setConfirm} />
                  ))}
                </section>
              )}
            </>
          )}
        </div>

        {/* delete dialog */}
        {confirm && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-neutral-950/50 px-4 backdrop-blur-sm" onClick={() => setConfirm(null)}>
            <div role="dialog" aria-modal="true" aria-labelledby="del-title" onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[28px] border border-neutral-900/10 bg-white p-7 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)]">
              <h2 id="del-title" className="text-2xl font-light tracking-[-0.03em]">Delete <span className={`${SERIF} text-3xl italic`}>{confirm.name}?</span></h2>
              <p className="mt-3 text-base font-medium leading-relaxed text-neutral-700">
                The agent stops taking calls{confirm.number ? ` on ${confirm.number}` : ""}. Its call logs may be removed too. This can't be undone.
              </p>
              <div className="mt-7 flex justify-end gap-3">
                <button ref={cancelRef} type="button" onClick={() => setConfirm(null)} className={`rounded-full border border-neutral-900/25 px-6 py-3 text-sm font-semibold hover:border-neutral-900 ${focusRing}`}>Cancel</button>
                <button type="button" onClick={remove} className={`rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 ${focusRing}`}>Delete agent</button>
              </div>
            </div>
          </div>
        )}

        {/* toast */}
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4">
          <p className={`rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_40px_-14px_rgba(0,0,0,0.4)] transition-all duration-500 ${EASE} ${toast ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>{toast}</p>
        </div>
      </main>
    </>
  );
};

export default MyAgentsPage;