import { useEffect, useMemo, useRef, useState } from "react";

/* PrebuiltLibraryPage  (route: /prebuilt)
   (Render <NavbarAfterLogin /> globally or above this page; the page leaves room for it.)

   A shelf of ready-made voice agents. People browse, hear a sample, read a short example call,
   and open the creation page with everything already filled in.

   Layout:
     1. Header + search.
     2. Filters: industry chips, call direction, language.
     3. Grid of agent cards (who they are, what they do, hear a sample, details, use).
     4. Details dialog with an example call, what the agent collects and can do.
     5. "Can't find yours?" panel that links to a blank agent.

   "Use this agent" goes to /studio/new?template=...&name=...&voice=...&langs=...&prompt=...
   (NewVoiceAgentPage reads all of these). /prebuilt?pick=mara opens that agent's details,
   which is how the dashboard's prebuilt cards link here.
   The catalog is a constant below: edit it, or pass your own list in the `agents` prop.
   "Hear a sample" uses the browser's built-in voices, so it only previews the style.
   Tailwind only. */

const SERIF = "font-['Instrument_Serif',ui-serif,Georgia,serif]";
const EASE = "ease-[cubic-bezier(.22,1,.36,1)]";
const DOTS =
  "bg-[radial-gradient(circle,rgba(10,10,10,0.18)_1px,transparent_1.6px)] [background-size:14px_14px]";
const DOTS_DARK =
  "bg-[radial-gradient(circle,rgba(255,255,255,0.16)_1px,transparent_1.6px)] [background-size:14px_14px]";
const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900";

const LANG_CODE = { English: "en-US", Hindi: "hi-IN", Spanish: "es-ES", French: "fr-FR" };

/* template: the base use case on the creation page (reception | leads | support | reminders | custom) */
const CATALOG = [
  {
    id: "aiko", name: "Aiko", role: "Clinic receptionist", category: "Healthcare", template: "reception", direction: "inbound",
    languages: ["English", "Hindi"], voice: "aria", minutes: 5,
    desc: "Answers calls for a clinic, books and moves appointments, and passes urgent cases to a person.",
    tasks: ["Books and reschedules appointments", "Answers hours, fees and directions", "Transfers urgent calls"],
    collects: ["Name", "Phone number", "Reason for calling", "Preferred time"], actions: ["Book appointments", "Send a text confirmation", "Transfer to a person"],
    prompt: "You are the receptionist for a medical clinic. Greet callers warmly, find out why they are calling, book or reschedule appointments, and answer questions about hours, fees and directions from the knowledge documents. Never give medical advice. Transfer urgent or emergency calls to a person straight away.",
    sample: "Thanks for calling the clinic, this is Aiko. How can I help?",
    call: [["caller", "Hi, I need to see the doctor this week."], ["agent", "Of course. Is it for a check-up or something that's bothering you?"], ["caller", "A check-up. Thursday afternoon if possible."], ["agent", "I have 3:30 on Thursday. Shall I book that for you?"]],
  },
  {
    id: "leo", name: "Leo", role: "Appointment reminders", category: "Healthcare", template: "reminders", direction: "outbound",
    languages: ["Hindi", "English"], voice: "noah", minutes: 4,
    desc: "Calls patients before their visit, confirms they're coming, and reschedules on the spot.",
    tasks: ["Confirms tomorrow's appointments", "Reschedules in the same call", "Texts the new time"],
    collects: ["Name", "Preferred time"], actions: ["Book appointments", "Send a text confirmation"],
    prompt: "You call patients to remind them about an upcoming appointment. Confirm you are speaking to the right person, give the reminder in one sentence, and offer to reschedule if they can't make it. Keep every call under two minutes.",
    sample: "Hello, this is Leo calling about your appointment tomorrow. Is now a good time?",
    call: [["agent", "Hello, this is Leo from the clinic. Am I speaking with Mr. Gupta?"], ["caller", "Yes, speaking."], ["agent", "I'm calling to confirm your appointment tomorrow at 11. Will you be able to come?"], ["caller", "Actually, can we move it to the afternoon?"]],
  },
  {
    id: "priya", name: "Priya", role: "Property enquiry agent", category: "Real estate", template: "leads", direction: "inbound",
    languages: ["English", "Hindi"], voice: "aria", minutes: 6,
    desc: "Picks up enquiry calls, learns what the buyer wants, and books a site visit with an agent.",
    tasks: ["Asks budget, area and timeline", "Matches listings from your documents", "Books site visits"],
    collects: ["Name", "Phone number", "Budget", "Preferred time"], actions: ["Book appointments", "Log the call in your CRM", "Send a text confirmation"],
    prompt: "You answer property enquiry calls. Find out what the caller is looking for: area, budget, size and timeline. Suggest suitable listings from the knowledge documents, then book a site visit with a human agent. Never promise prices that are not in the documents.",
    sample: "Hi, thanks for calling about the property. What kind of home are you looking for?",
    call: [["caller", "I saw your flat in Powai online."], ["agent", "Lovely choice. Are you looking to buy, and roughly what budget did you have in mind?"], ["caller", "Around one point two crore."], ["agent", "That fits. Would Saturday morning work for a visit?"]],
  },
  {
    id: "ravi", name: "Ravi", role: "Demo booker", category: "Sales", template: "leads", direction: "outbound",
    languages: ["English"], voice: "kabir", minutes: 5,
    desc: "Calls new leads within minutes, asks a few short questions, and books a demo with your team.",
    tasks: ["Qualifies by need and timeline", "Books a call on your calendar", "Logs the outcome in your CRM"],
    collects: ["Name", "Company", "Budget", "Preferred time"], actions: ["Book appointments", "Log the call in your CRM", "Send a text confirmation"],
    prompt: "You call people who asked for more information. Introduce yourself, confirm it's a good time to talk, ask a few short questions to understand what they need, and book a call with the sales team if they are a good fit. Be brief and never pushy.",
    sample: "Hi, it's Ravi. You asked about our product earlier. Do you have a minute?",
    call: [["agent", "Hi Anita, it's Ravi. You asked about our platform this morning. Is now okay?"], ["caller", "Sure, two minutes."], ["agent", "Great. What are you hoping it will fix for your team?"], ["caller", "Too many missed calls after six."]],
  },
  {
    id: "arjun", name: "Arjun", role: "Payment reminders", category: "Finance", template: "reminders", direction: "outbound",
    languages: ["Hindi", "English"], voice: "kabir", minutes: 5,
    desc: "Politely reminds customers about due payments, shares the payment link by text, and notes promises to pay.",
    tasks: ["Confirms the right person first", "Texts a payment link", "Records the promised date"],
    collects: ["Name", "Preferred time"], actions: ["Send a text confirmation", "Log the call in your CRM", "Transfer to a person"],
    prompt: "You call customers about a payment that is due. Confirm you are speaking to the right person before sharing any details. Be calm and respectful, never threaten, offer to text a payment link, and note the date they promise to pay. Transfer to a person if they dispute the amount.",
    sample: "Hello, this is Arjun calling about an upcoming payment. May I speak with the account holder?",
    call: [["agent", "Hello, may I speak with Mr. Verma? This is Arjun from the finance team."], ["caller", "Yes, that's me."], ["agent", "Thank you. Your instalment is due on Friday. Shall I text you the payment link?"], ["caller", "Yes please, I'll pay tomorrow."]],
  },
  {
    id: "sofia", name: "Sofia", role: "Support desk", category: "Support", template: "support", direction: "inbound",
    languages: ["English", "Spanish"], voice: "luna", minutes: 6,
    desc: "Handles common questions step by step, logs every call, and hands tricky cases to your team.",
    tasks: ["Solves common issues from your documents", "Creates a ticket for the rest", "Transfers when stuck"],
    collects: ["Name", "Email", "Reason for calling"], actions: ["Log the call in your CRM", "Send a text confirmation", "Transfer to a person"],
    prompt: "You are a calm support agent. Apologise once if something went wrong, ask what happened, solve the problem step by step using the knowledge documents, and transfer to a person when you can't fix it.",
    sample: "Thanks for calling support, this is Sofia. What's going on?",
    call: [["caller", "My order never arrived."], ["agent", "I'm sorry about that. Could I have your order number?"], ["caller", "It's 48213."], ["agent", "Thanks. I can see it shipped on Monday. Let me check where it is."]],
  },
  {
    id: "nina", name: "Nina", role: "Order status line", category: "E-commerce", template: "support", direction: "inbound",
    languages: ["English"], voice: "mei", minutes: 4,
    desc: "Tells customers where their order is, handles return questions, and texts tracking links.",
    tasks: ["Looks up order status", "Explains the returns policy", "Texts the tracking link"],
    collects: ["Name", "Phone number", "Reason for calling"], actions: ["Send a text confirmation", "Log the call in your CRM", "Take messages"],
    prompt: "You answer calls about orders. Ask for the order number, tell the customer where the order is, explain the returns policy from the knowledge documents, and text the tracking link. Take a message for anything you cannot answer.",
    sample: "Hi, this is Nina. Do you have your order number handy?",
    call: [["caller", "Where's my parcel?"], ["agent", "Happy to check. Could you read me your order number?"], ["caller", "Sure, it's 77102."], ["agent", "It's out for delivery today. I'll text you the tracking link."]],
  },
  {
    id: "elise", name: "Elise", role: "Concierge", category: "Hospitality", template: "reception", direction: "inbound",
    languages: ["English", "French"], voice: "luna", minutes: 5,
    desc: "Answers guest calls for a hotel, handles requests and bookings, and knows the neighbourhood.",
    tasks: ["Takes room and service requests", "Recommends local spots", "Escalates complaints"],
    collects: ["Name", "Reason for calling", "Preferred time"], actions: ["Take messages", "Send a text confirmation", "Transfer to a person"],
    prompt: "You are the concierge for a boutique hotel. Greet guests warmly, take requests for room service, late checkout or transport, recommend nearby places from the knowledge documents, and transfer complaints to the duty manager.",
    sample: "Good evening, this is Elise at the front desk. How may I help you?",
    call: [["caller", "Could we get a late checkout tomorrow?"], ["agent", "Certainly. What time would you like to leave?"], ["caller", "Around two."], ["agent", "I've noted two o'clock. I'll confirm by text shortly."]],
  },
  {
    id: "tomas", name: "Tomas", role: "Restaurant bookings", category: "Hospitality", template: "reception", direction: "inbound",
    languages: ["English", "Spanish"], voice: "noah", minutes: 4,
    desc: "Takes table reservations by phone, checks availability, and answers menu questions.",
    tasks: ["Books and changes tables", "Answers menu and allergy questions", "Texts a confirmation"],
    collects: ["Name", "Phone number", "Preferred time"], actions: ["Book appointments", "Send a text confirmation", "Take messages"],
    prompt: "You take table reservations for a restaurant. Ask for the date, time, party size and name, check availability, and confirm by text. Answer menu questions from the knowledge documents and flag allergies to the kitchen.",
    sample: "Thanks for calling, this is Tomas. Are you looking to book a table?",
    call: [["caller", "A table for four on Friday night."], ["agent", "Lovely. What time would you like?"], ["caller", "Eight o'clock."], ["agent", "I have a table at eight. Can I take a name for the booking?"]],
  },
  {
    id: "kiran", name: "Kiran", role: "Admissions counsellor", category: "Education", template: "leads", direction: "both",
    languages: ["English", "Hindi"], voice: "dev", minutes: 6,
    desc: "Answers parent and student enquiries, explains courses and fees, and books counselling sessions.",
    tasks: ["Explains courses, fees and dates", "Collects student details", "Books a counselling call"],
    collects: ["Name", "Phone number", "Email", "Preferred time"], actions: ["Book appointments", "Log the call in your CRM", "Send a text confirmation"],
    prompt: "You handle admissions enquiries. Explain courses, fees and deadlines from the knowledge documents, ask about the student's interests, and book a counselling session with a human counsellor. Be encouraging and never pressure anyone.",
    sample: "Hello, this is Kiran from admissions. Which course are you interested in?",
    call: [["caller", "What are the fees for the data course?"], ["agent", "It's a six-month programme. Are you applying for yourself or for someone else?"], ["caller", "For my son, he's in twelfth grade."], ["agent", "Great. I can set up a call with a counsellor. When suits you?"]],
  },
  {
    id: "mara", name: "Mara", role: "Executive assistant", category: "Operations", template: "reception", direction: "inbound",
    languages: ["English"], voice: "mei", minutes: 5,
    desc: "Screens calls for a busy founder, takes clear messages, and puts important callers through.",
    tasks: ["Screens and prioritises calls", "Takes detailed messages", "Puts VIPs through"],
    collects: ["Name", "Company", "Phone number", "Reason for calling"], actions: ["Take messages", "Transfer to a person", "Send a text confirmation"],
    prompt: "You are an executive assistant answering calls for a busy founder. Find out who is calling and why, put important callers through to the transfer number, and take a clear message for everyone else. Be polite and efficient.",
    sample: "Good afternoon, this is Mara. Who may I say is calling?",
    call: [["caller", "Is Rohan available?"], ["agent", "May I ask who's calling, and what it's about?"], ["caller", "It's Priya from Northwind about the contract."], ["agent", "Thank you, Priya. Let me see if I can put you through."]],
  },
  {
    id: "jun", name: "Jun", role: "Technical interviewer", category: "Hiring", template: "custom", direction: "outbound",
    languages: ["English"], voice: "dev", minutes: 7,
    desc: "Runs a short first-round phone screen, asks the same questions of every candidate, and writes up the answers.",
    tasks: ["Asks a fixed set of questions", "Keeps every call under 20 minutes", "Writes a summary for your team"],
    collects: ["Name", "Email", "Preferred time"], actions: ["Log the call in your CRM", "Send a text confirmation"],
    prompt: "You run first-round phone screens for engineering candidates. Introduce yourself, explain how the call works, ask the same set of questions in order, and thank the candidate. Do not discuss pay or make hiring decisions. Keep each call under 20 minutes.",
    sample: "Hi, this is Jun. I'll be doing your first-round screen today. Is now still a good time?",
    call: [["agent", "Hi Sam, this is Jun, calling for your screening call. Is now still good?"], ["caller", "Yes, ready."], ["agent", "Great. To start, tell me about a project you're proud of."], ["caller", "Sure, I built a payments service last year."]],
  },
];

const DIRS = [["all", "Any call"], ["inbound", "Inbound"], ["outbound", "Outbound"]];
const DIR_LABEL = { inbound: "Inbound", outbound: "Outbound", both: "In & out" };

const buildHref = (a) => {
  const p = new URLSearchParams({
    template: a.template,
    name: a.name,
    voice: a.voice,
    langs: a.languages.map((l) => LANG_CODE[l]).filter(Boolean).join(","),
    prompt: a.prompt,
  });
  return `/studio/new?${p.toString()}`;
};

const Orb = ({ className = "", children }) => (
  <span className={`relative grid shrink-0 place-items-center rounded-full bg-neutral-900 text-white ${className}`}>
    <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.5)_1px,transparent_1.4px)] [background-size:6px_6px]" />
    {children && <span className="relative rounded-full bg-neutral-900 px-1.5 text-lg font-semibold">{children}</span>}
  </span>
);

const Tag = ({ children }) => <span className="rounded-full border border-neutral-900/10 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">{children}</span>;

/* ------------------------------ page ------------------------------ */
const PrebuiltLibraryPage = ({ agents = CATALOG }) => {
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [dir, setDir] = useState("all");
  const [lang, setLang] = useState("all");
  const [open, setOpen] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const sysVoices = useRef([]);
  const closeRef = useRef(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    const pick = new URLSearchParams(window.location.search).get("pick");
    const found = agents.find((a) => a.id === pick || a.name.toLowerCase() === pick?.toLowerCase());
    if (found) setOpen(found);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => { sysVoices.current = synth.getVoices(); };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => { synth.removeEventListener?.("voiceschanged", load); synth.cancel(); };
  }, []);

  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (open) closeRef.current?.focus();
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const play = (a) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speakingId === a.id) { synth.cancel(); setSpeakingId(null); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(a.sample);
    const code = LANG_CODE[a.languages[0]] || "en-US";
    const pool = sysVoices.current.filter((v) => v.lang?.toLowerCase().startsWith(code.slice(0, 2).toLowerCase()));
    const idx = ["aria", "noah", "mei", "kabir", "luna", "dev"].indexOf(a.voice);
    if (pool.length) u.voice = pool[Math.max(0, idx) % pool.length];
    u.lang = code;
    u.onend = u.onerror = () => setSpeakingId(null);
    setSpeakingId(a.id);
    synth.speak(u);
  };

  const categories = useMemo(() => ["All", ...Array.from(new Set(agents.map((a) => a.category)))], [agents]);
  const languages = useMemo(() => Array.from(new Set(agents.flatMap((a) => a.languages))), [agents]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return agents.filter((a) =>
      (cat === "All" || a.category === cat) &&
      (dir === "all" || a.direction === dir || a.direction === "both") &&
      (lang === "all" || a.languages.includes(lang)) &&
      (!term || [a.name, a.role, a.category, a.desc].some((v) => v.toLowerCase().includes(term))));
  }, [agents, q, cat, dir, lang]);

  const rise = (d = 0) => ({
    style: { transitionDelay: `${d}ms` },
    className: `transition-all duration-1000 ${EASE} motion-reduce:transition-none ${ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`,
  });

  const chip = (on) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold tracking-tight transition-colors ${focusRing} ${on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-900/20 text-neutral-800 hover:border-neutral-900"}`;

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
                Prebuilt
                <br />
                <span className={`${SERIF} font-normal italic`}>library.</span>
              </h1>
              <p className="mt-5 max-w-md text-base font-medium leading-relaxed text-neutral-700">
                Ready-made voice agents for common jobs. Hear one, pick one, and tweak it before it takes a single call.
              </p>
            </div>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents or industries" aria-label="Search the library"
              className="w-full rounded-full border border-neutral-300 bg-white px-5 py-3 text-base font-medium placeholder:font-normal placeholder:text-neutral-500 transition-colors hover:border-neutral-500 focus:border-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/10 sm:w-80" />
          </header>

          {/* 2 filters */}
          <div {...rise(220)} className={`mt-10 space-y-4 ${rise(220).className}`}>
            <div role="group" aria-label="Industry" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {categories.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>)}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div role="group" aria-label="Call direction" className="flex rounded-full border border-neutral-900/15 p-1">
                {DIRS.map(([k, l]) => (
                  <button key={k} type="button" aria-pressed={dir === k} onClick={() => setDir(k)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-tight transition-colors ${focusRing} ${dir === k ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-900/[0.06]"}`}>{l}</button>
                ))}
              </div>
              <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language"
                className="rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:border-neutral-500 focus:border-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/10">
                <option value="all">Any language</option>
                {languages.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <p aria-live="polite" className="ml-auto text-sm font-semibold text-neutral-600">{shown.length} {shown.length === 1 ? "agent" : "agents"}</p>
            </div>
          </div>

          {/* 3 grid */}
          {shown.length === 0 ? (
            <div className="mt-8 rounded-[28px] border border-dashed border-neutral-900/20 p-12 text-center">
              <p className="text-lg font-semibold tracking-tight">Nothing matches those filters.</p>
              <button type="button" onClick={() => { setQ(""); setCat("All"); setDir("all"); setLang("all"); }} className={`mt-4 rounded-full text-sm font-semibold underline underline-offset-4 ${focusRing}`}>Clear filters</button>
            </div>
          ) : (
            <section aria-label="Prebuilt agents" {...rise(320)} className={`mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${rise(320).className}`}>
              {shown.map((a) => (
                <article key={a.id} className="flex flex-col rounded-[28px] border border-neutral-900/10 bg-white p-5 transition-colors hover:border-neutral-900/40 sm:p-6">
                  <div className="flex items-start gap-4">
                    <Orb className="h-12 w-12">{a.name[0]}</Orb>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold tracking-tight">{a.name}</h2>
                      <p className="truncate text-sm font-medium text-neutral-600">{a.role}</p>
                    </div>
                    <Tag>{a.category}</Tag>
                  </div>

                  <p className="mt-4 text-sm font-medium leading-relaxed text-neutral-700">{a.desc}</p>

                  <ul className="mt-4 space-y-2">
                    {a.tasks.map((t) => (
                      <li key={t} className="flex gap-3 text-sm font-medium text-neutral-800">
                        <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neutral-900" />{t}
                      </li>
                    ))}
                  </ul>

                  <div className="mb-6 mt-5 flex flex-wrap gap-2">
                    <Tag>{DIR_LABEL[a.direction]}</Tag>
                    <Tag>{a.languages.join(" · ")}</Tag>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-neutral-900/10 pt-5">
                    <button type="button" onClick={() => play(a)} aria-label={`${speakingId === a.id ? "Stop" : "Hear"} a sample from ${a.name}`}
                      className={`inline-flex items-center gap-2 rounded-full border border-neutral-900/25 py-2 pl-4 pr-2 text-sm font-semibold tracking-tight transition-colors hover:border-neutral-900 ${focusRing}`}>
                      {speakingId === a.id ? "Stop" : "Hear"}
                      <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-neutral-900 text-[10px] text-white">{speakingId === a.id ? "■" : "▶"}</span>
                    </button>
                    <button type="button" onClick={() => setOpen(a)} className={`rounded-full px-3 py-2 text-sm font-semibold text-neutral-800 underline decoration-neutral-900/40 underline-offset-[5px] hover:decoration-neutral-900 ${focusRing}`}>Details</button>
                    <a href={buildHref(a)} className={`group ml-auto inline-flex items-center gap-2 rounded-full bg-neutral-900 py-2 pl-4 pr-2 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-neutral-700 ${focusRing}`}>
                      Use
                      <span aria-hidden="true" className={`grid h-6 w-6 place-items-center rounded-full bg-white text-neutral-900 transition-transform duration-500 ${EASE} group-hover:-rotate-45`}>→</span>
                    </a>
                  </div>
                </article>
              ))}
            </section>
          )}

          {/* 5 blank */}
          <section {...rise(420)} className={`relative mt-12 overflow-hidden rounded-[32px] bg-neutral-950 text-white shadow-[0_40px_100px_-40px_rgba(0,0,0,0.5)] ${rise(420).className}`}>
            <div className={`absolute inset-0 ${DOTS_DARK} [mask-image:radial-gradient(ellipse_at_80%_20%,black_10%,transparent_75%)]`} />
            <div className="relative flex flex-wrap items-center justify-between gap-6 p-8 sm:p-12">
              <h2 className="text-[clamp(1.9rem,3.6vw,3rem)] font-extralight leading-[1] tracking-[-0.035em]">
                Can't find yours?
                <br />
                <span className={`${SERIF} font-normal italic`}>Describe it instead.</span>
              </h2>
              <a href="/studio/new?template=custom" className={`group inline-flex items-center gap-3 rounded-full bg-white py-2 pl-6 pr-2 text-sm font-semibold tracking-tight text-neutral-900 transition-colors hover:bg-neutral-200 ${focusRing}`}>
                Start from scratch
                <span aria-hidden="true" className={`grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-white transition-transform duration-500 ${EASE} group-hover:-rotate-45`}>→</span>
              </a>
            </div>
          </section>
        </div>

        {/* 4 details dialog */}
        {open && (
          <div className="fixed inset-0 z-[70] grid place-items-end bg-neutral-950/50 backdrop-blur-sm sm:place-items-center sm:px-4" onClick={() => setOpen(null)}>
            <div role="dialog" aria-modal="true" aria-labelledby="agent-title" onClick={(e) => e.stopPropagation()}
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] border border-neutral-900/10 bg-white p-6 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)] sm:rounded-[28px] sm:p-8">
              <div className="flex items-start gap-4">
                <Orb className="h-14 w-14">{open.name[0]}</Orb>
                <div className="min-w-0 flex-1">
                  <h2 id="agent-title" className="text-3xl font-light tracking-[-0.03em]"><span className={`${SERIF} text-4xl italic`}>{open.name}</span></h2>
                  <p className="text-sm font-medium text-neutral-600">{open.role} · {open.category}</p>
                </div>
                <button ref={closeRef} type="button" onClick={() => setOpen(null)} aria-label="Close details" className={`grid h-9 w-9 place-items-center rounded-full border border-neutral-900/20 text-lg hover:border-neutral-900 ${focusRing}`}>×</button>
              </div>

              <p className="mt-5 text-base font-medium leading-relaxed text-neutral-700">{open.desc}</p>

              <h3 className="mb-3 mt-7 text-sm font-semibold tracking-tight">Example call</h3>
              <div className="space-y-2.5 rounded-2xl bg-neutral-900/[0.03] p-4 text-sm font-medium">
                {open.call.map(([who, text], i) => (
                  <p key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed ${who === "agent" ? "rounded-bl-md bg-neutral-900 text-white" : "ml-auto rounded-br-md border border-neutral-900/15 bg-white text-neutral-900"}`}>{text}</p>
                ))}
              </div>

              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold tracking-tight">Collects</h3>
                  <div className="flex flex-wrap gap-2">{open.collects.map((c) => <Tag key={c}>{c}</Tag>)}</div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold tracking-tight">Can do</h3>
                  <div className="flex flex-wrap gap-2">{open.actions.map((c) => <Tag key={c}>{c}</Tag>)}</div>
                </div>
              </div>

              {open.direction !== "inbound" && (
                <p className="mt-6 rounded-2xl border border-neutral-900/10 px-4 py-3 text-[13px] font-medium leading-relaxed text-neutral-700">
                  Outbound calls are covered by calling rules that differ by country, including consent and do-not-call lists. Check them before you go live.
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-neutral-900/10 pt-6">
                <button type="button" onClick={() => play(open)} className={`inline-flex items-center gap-2 rounded-full border border-neutral-900/25 py-2.5 pl-5 pr-3 text-sm font-semibold tracking-tight transition-colors hover:border-neutral-900 ${focusRing}`}>
                  {speakingId === open.id ? "Stop sample" : "Hear a sample"}
                  <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-neutral-900 text-[10px] text-white">{speakingId === open.id ? "■" : "▶"}</span>
                </button>
                <p className="text-[13px] font-medium text-neutral-600">About {open.minutes} minutes to set up</p>
                <a href={buildHref(open)} className={`group ml-auto inline-flex items-center gap-3 rounded-full bg-neutral-900 py-2 pl-6 pr-2 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-neutral-700 ${focusRing}`}>
                  Use this agent
                  <span aria-hidden="true" className={`grid h-9 w-9 place-items-center rounded-full bg-white text-neutral-900 transition-transform duration-500 ${EASE} group-hover:-rotate-45`}>→</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default PrebuiltLibraryPage;