import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";

/* NewVoiceAgentPage  (route: /studio/new, or /voice-agents/new)
   (Render <NavbarAfterLogin /> globally or above this page; the page leaves room for it.)

   Builds a phone voice agent. Six short sections and a live "call card" preview:
     1. Start        pick a use case (fills in sensible defaults) + agent and business name
     2. Brain        the prompt (reads ?template= ?prompt= ?name= ?business= ?voice= ?langs=), tone and style, what to collect,
                     what the agent may do, "never do" rules
     3. Phone        inbound / outbound / both, phone number, business hours, after-hours, transfer number
     4. Voice (TTS)  voice picker with in-browser preview, speed, pitch, optional voice clone
     5. Listening (STT) languages, fast vs accurate, noise suppression, interruptions, wait time, mic test
     6. Call rules   max length, silence hang-up, voicemail detection, recording + disclosure
     + optional knowledge documents

   Submit: multipart POST {API}/api/voice-agent with Bearer token. Fields:
     config         JSON string (everything except files)
     voiceSample    audio file for cloning     (optional)
     documents[]    knowledge files            (optional)
   Backend: routes/VoiceAgent.js (multer, UserAuth) -> controllers/VoiceAgentController.js
   (CreateVoiceAgent) -> schemas/VoiceAgent.js. It answers 201 { success, message, agent } or
   { success:false, message }, and the message is shown in the red banner at the top.
   Limits match the server: 20 MB per file, 1 voice sample, up to 10 documents.
   Map config.tts / config.stt / config.call to your TTS, STT and telephony providers.
   The voice preview and mic test use the browser's built-in speech APIs only.

   Props (optional): onSubmit(formData), onSuccess(result), redirectTo ("/agents"), voices.
   API base URL: VITE_API_URL or a dev proxy for "/api".  Tailwind only. */

const API = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "token";

const SERIF = "font-['Instrument_Serif',ui-serif,Georgia,serif]";
const EASE = "ease-[cubic-bezier(.22,1,.36,1)]";
const DOTS =
  "bg-[radial-gradient(circle,rgba(10,10,10,0.18)_1px,transparent_1.6px)] [background-size:14px_14px]";
const DOTS_DARK =
  "bg-[radial-gradient(circle,rgba(255,255,255,0.16)_1px,transparent_1.6px)] [background-size:14px_14px]";
const E164 = /^\+[1-9]\d{7,14}$/;
const MAX_DOC = 20 * 1024 * 1024;
const MAX_SAMPLE = 15 * 1024 * 1024;
const MAX_DOCS = 10; // the route accepts at most 10 documents

const DEFAULT_VOICES = [
  { id: "aria", name: "Aria", desc: "Warm and bright" },
  { id: "noah", name: "Noah", desc: "Calm and steady" },
  { id: "mei", name: "Mei", desc: "Clear and friendly" },
  { id: "kabir", name: "Kabir", desc: "Confident and rich" },
  { id: "luna", name: "Luna", desc: "Soft and thoughtful" },
  { id: "dev", name: "Dev", desc: "Upbeat and quick" },
];
const LANGS = [
  { code: "en-US", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "pt-BR", label: "Portuguese" },
  { code: "ja-JP", label: "Japanese" },
];
const COUNTRIES = [
  { c: "IN", l: "India (+91)" },
  { c: "US", l: "United States (+1)" },
  { c: "GB", l: "United Kingdom (+44)" },
  { c: "AE", l: "UAE (+971)" },
  { c: "AU", l: "Australia (+61)" },
];
const TONES = ["Warm", "Professional", "Playful", "Direct", "Calm"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FIELDS = ["Name", "Phone number", "Email", "Reason for calling", "Preferred time", "Company", "Budget"];
const ACTIONS = [
  { k: "book", l: "Book appointments", h: "Check availability and confirm a slot." },
  { k: "sms", l: "Send a text confirmation", h: "Text the caller a summary after the call." },
  { k: "message", l: "Take messages", h: "Record a message and send it to you." },
  { k: "crm", l: "Log the call in your CRM", h: "Save the transcript and collected details." },
  { k: "transfer", l: "Transfer to a person", h: "Warm-transfer urgent or complex calls." },
];
const TEMPLATES = [
  {
    id: "reception", name: "Receptionist", desc: "Answers calls, books and takes messages", direction: "inbound",
    prompt: "You answer the phone for a small business. Greet callers warmly, find out why they are calling, answer common questions from the knowledge documents, book appointments, and take a message when you can't help. Transfer urgent calls to a person.",
    collect: ["Name", "Phone number", "Reason for calling", "Preferred time"], actions: ["book", "sms", "message", "transfer"], tone: "Warm",
  },
  {
    id: "leads", name: "Lead qualifier", desc: "Calls new leads and books a demo", direction: "outbound",
    prompt: "You call people who asked for more information. Introduce yourself, confirm it's a good time to talk, ask a few short questions to understand what they need, and book a call with the sales team if they are a good fit. Be brief and never pushy.",
    collect: ["Name", "Company", "Budget", "Preferred time"], actions: ["book", "crm", "sms"], tone: "Professional",
  },
  {
    id: "support", name: "Support desk", desc: "Handles common questions, escalates the rest", direction: "inbound",
    prompt: "You are a calm support agent. Apologise once if something went wrong, ask what happened, solve the problem step by step using the knowledge documents, and transfer to a person when you can't fix it.",
    collect: ["Name", "Email", "Reason for calling"], actions: ["crm", "sms", "transfer"], tone: "Calm",
  },
  {
    id: "reminders", name: "Reminders", desc: "Confirms appointments and follows up", direction: "outbound",
    prompt: "You call to remind people about upcoming appointments or payments. Confirm you are speaking to the right person, give the reminder in one sentence, and offer to reschedule. Keep every call under two minutes.",
    collect: ["Name", "Preferred time"], actions: ["book", "sms"], tone: "Warm",
  },
  { id: "custom", name: "Start from scratch", desc: "Describe it yourself", direction: "inbound", prompt: "", collect: ["Name", "Reason for calling"], actions: ["message"], tone: "Warm" },
];

/* ------------------------------ small pieces ------------------------------ */
const labelCls = "text-sm font-semibold tracking-tight text-neutral-900";
const hintCls = "mt-1 text-[13px] font-medium text-neutral-600";
const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900";
const inputCls = (bad) =>
  `w-full rounded-2xl border bg-white px-4 py-3.5 text-base font-medium text-neutral-900 placeholder:font-normal placeholder:text-neutral-500 transition-colors duration-300 hover:border-neutral-500 focus:border-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/10 ${
    bad ? "border-neutral-900" : "border-neutral-300"
  }`;

const Orb = ({ className = "", children }) => (
  <span className={`relative grid shrink-0 place-items-center rounded-full bg-white text-neutral-900 ${className}`}>
    <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(10,10,10,0.5)_1px,transparent_1.4px)] [background-size:6px_6px]" />
    {children && <span className="relative rounded-full bg-white px-2 text-2xl font-semibold">{children}</span>}
  </span>
);

const Section = ({ n, title, desc, children }) => (
  <section className="rounded-[28px] border border-neutral-900/10 bg-white p-6 sm:p-8">
    <div className="mb-6 flex items-start gap-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-sm font-semibold text-white">{n}</span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className={hintCls}>{desc}</p>
      </div>
    </div>
    <div className="space-y-6">{children}</div>
  </section>
);

const Err = ({ children }) => (
  <p role={children ? "alert" : undefined} className={`overflow-hidden text-[13px] font-medium text-neutral-900 transition-all duration-300 ${children ? "mt-2 max-h-10 opacity-100" : "max-h-0 opacity-0"}`}>{children}</p>
);

const Seg = ({ label, value, onChange, options }) => (
  <div>
    <p className={`${labelCls} mb-2`}>{label}</p>
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col rounded-full border border-neutral-900/15 p-1">
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
          className={`rounded-full px-3 py-2 text-sm font-semibold tracking-tight transition-colors ${focusRing} ${value === o.v ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-900/[0.06]"}`}>
          {o.l}
        </button>
      ))}
    </div>
  </div>
);

const Toggle = ({ checked, onChange, label, hint }) => (
  <div className="flex items-center justify-between gap-6">
    <div>
      <p className={labelCls}>{label}</p>
      {hint && <p className={hintCls}>{hint}</p>}
    </div>
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${focusRing} ${checked ? "bg-neutral-900" : "bg-neutral-900/20"}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all duration-300 ${EASE} ${checked ? "left-6" : "left-1"}`} />
    </button>
  </div>
);

const Range = ({ label, value, onChange, min, max, step, format }) => (
  <div>
    <div className="mb-2 flex items-baseline justify-between">
      <label className={labelCls}>{label}</label>
      <span className="text-sm font-semibold text-neutral-700">{format(value)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-900/15 accent-neutral-900" />
  </div>
);

const Chip = ({ on, children, ...p }) => (
  <button type="button" aria-pressed={on}
    className={`rounded-full border px-4 py-2 text-sm font-semibold tracking-tight transition-colors ${focusRing} ${on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-900/20 text-neutral-800 hover:border-neutral-900"}`} {...p}>
    {children}
  </button>
);

const Box = ({ children }) => <div className="rounded-2xl border border-neutral-900/10 bg-neutral-900/[0.025] p-5">{children}</div>;
const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

/* ------------------------------ page ------------------------------ */
const NewVoiceAgentPage = ({ onSubmit, onSuccess, redirectTo = "/agents", voices = DEFAULT_VOICES }) => {
  const [ready, setReady] = useState(false);
  const [f, setF] = useState({
    template: "reception", name: "", business: "", prompt: TEMPLATES[0].prompt,
    tone: "Warm", formality: "balanced", length: "brief", initiative: "suggests", greeting: "", rules: "",
    collect: TEMPLATES[0].collect, actions: TEMPLATES[0].actions,
    direction: "inbound", numberMode: "new", country: "IN", ownNumber: "", transfer: "",
    hoursOn: false, days: ["Mon", "Tue", "Wed", "Thu", "Fri"], from: "09:00", to: "18:00", after: "message",
    voiceId: voices[0]?.id, speed: 1, pitch: 1, consent: false,
    langs: ["en-US"], sttMode: "fast", noise: true, autoDetect: false, interrupt: "medium", wait: 0.6, backchannel: true,
    maxMin: 10, silence: 20, voicemail: true, record: true, disclose: true,
  });
  const [sample, setSample] = useState(null);
  const [docs, setDocs] = useState([]);
  const [newField, setNewField] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [micMsg, setMicMsg] = useState("");
  const recRef = useRef(null);
  const sysVoices = useRef([]);
  const up = (k, v) => { setF((s) => ({ ...s, [k]: v })); if (errors[k]) setErrors((s) => ({ ...s, [k]: "" })); };

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    const q = new URLSearchParams(window.location.search);
    const t = TEMPLATES.find((x) => x.id === q.get("template"));
    if (t) applyTemplate(t);
    /* optional prefill from the Prebuilt Library: ?name= &business= &voice= &langs=hi-IN,en-US &prompt= */
    const extra = {};
    if (q.get("prompt")) extra.prompt = q.get("prompt");
    if (q.get("name")) extra.name = q.get("name").slice(0, 40);
    if (q.get("business")) extra.business = q.get("business").slice(0, 60);
    if (voices.some((v) => v.id === q.get("voice"))) extra.voiceId = q.get("voice");
    const ls = (q.get("langs") || "").split(",").filter((c) => LANGS.some((l) => l.code === c));
    if (ls.length) extra.langs = ls;
    if (Object.keys(extra).length) setF((s) => ({ ...s, ...extra }));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => { sysVoices.current = synth.getVoices(); };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => { synth.removeEventListener?.("voiceschanged", load); synth.cancel(); recRef.current?.abort?.(); };
  }, []);

  const rise = (d = 0) => ({
    style: { transitionDelay: `${d}ms` },
    className: `transition-all duration-1000 ${EASE} motion-reduce:transition-none ${ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`,
  });

  function applyTemplate(t) {
    setF((s) => {
      const untouched = !s.prompt.trim() || TEMPLATES.some((x) => x.prompt === s.prompt);
      return { ...s, template: t.id, direction: t.direction, collect: t.collect, actions: t.actions, tone: t.tone, prompt: untouched ? t.prompt : s.prompt };
    });
    setErrors((s) => ({ ...s, prompt: "" }));
  }

  const fieldOptions = [...FIELDS, ...f.collect.filter((c) => !FIELDS.includes(c))];
  const addField = () => {
    const v = newField.trim().slice(0, 30);
    if (v && !f.collect.includes(v)) up("collect", [...f.collect, v]);
    setNewField("");
  };

  const pickSample = (file) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) return setErrors((s) => ({ ...s, sample: "Use an audio file (MP3, WAV, M4A)." }));
    if (file.size > MAX_SAMPLE) return setErrors((s) => ({ ...s, sample: "That audio file is over 15 MB." }));
    setErrors((s) => ({ ...s, sample: "" }));
    setSample(file);
  };
  const addDocs = (files) => {
    const next = [...docs];
    let bad = "";
    for (const d of files) {
      if (next.length >= MAX_DOCS) { bad = `You can add up to ${MAX_DOCS} documents.`; break; }
      if (!/\.(pdf|docx?|txt|md|csv)$/i.test(d.name)) { bad = `${d.name} isn't a supported file.`; continue; }
      if (d.size > MAX_DOC) { bad = `${d.name} is over 20 MB.`; continue; }
      if (!next.some((x) => x.name === d.name && x.size === d.size)) next.push(d);
    }
    setDocs(next);
    setErrors((s) => ({ ...s, docs: bad }));
  };

  const greetingText =
    f.greeting.trim() ||
    (f.direction === "outbound"
      ? `Hi, this is ${f.name.trim() || "your agent"}${f.business.trim() ? ` from ${f.business.trim()}` : ""}. Do you have a minute?`
      : `Thanks for calling${f.business.trim() ? ` ${f.business.trim()}` : ""}, this is ${f.name.trim() || "your agent"}. How can I help?`);

  const previewVoice = () => {
    const synth = window.speechSynthesis;
    if (!synth) return setMicMsg("This browser can't preview voices.");
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(greetingText);
    const code = f.langs[0];
    const pool = sysVoices.current.filter((v) => v.lang?.toLowerCase().startsWith(code.slice(0, 2).toLowerCase()));
    const idx = Math.max(0, voices.findIndex((v) => v.id === f.voiceId));
    if (pool.length) u.voice = pool[idx % pool.length];
    u.lang = code; u.rate = f.speed; u.pitch = f.pitch;
    u.onend = u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  };

  const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const testMic = () => {
    if (!SR) return setMicMsg("Speech recognition isn't available in this browser. Try Chrome or Edge.");
    if (listening) { recRef.current?.stop(); return; }
    setHeard(""); setMicMsg("");
    const r = new SR();
    r.lang = f.langs[0]; r.interimResults = true; r.continuous = false;
    r.onresult = (e) => setHeard(Array.from(e.results).map((x) => x[0].transcript).join(" "));
    r.onerror = (e) => setMicMsg(e.error === "not-allowed" ? "Microphone access was blocked. Allow it in your browser settings." : "Couldn't hear anything. Try again.");
    r.onend = () => setListening(false);
    recRef.current = r; setListening(true); r.start();
  };

  const wantsTransfer = f.actions.includes("transfer") || f.after === "transfer";
  const numberOk = f.numberMode === "new" || E164.test(f.ownNumber.trim());
  const checks = useMemo(
    () => [
      { label: "Name", ok: !!f.name.trim() },
      { label: "Prompt", ok: f.prompt.trim().length >= 20 },
      { label: "Number", ok: numberOk },
      { label: "Voice", ok: !!f.voiceId },
    ],
    [f.name, f.prompt, numberOk, f.voiceId]
  );
  const pct = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = "Give your agent a name.";
    if (f.prompt.trim().length < 20) e.prompt = "Describe the job in at least a sentence (20+ characters).";
    if (f.numberMode === "own" && !E164.test(f.ownNumber.trim())) e.ownNumber = "Use international format, like +919876543210.";
    if (wantsTransfer && !E164.test(f.transfer.trim())) e.transfer = "Add the number to transfer calls to, like +919876543210.";
    if (f.hoursOn && f.days.length === 0) e.days = "Pick at least one day.";
    if (f.hoursOn && f.from >= f.to) e.hours = "Closing time must be after opening time.";
    if (sample && !f.consent) e.consent = "Confirm you have the right to clone this voice.";
    setErrors((s) => ({ ...s, ...e }));
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (loading) return;
    setFormError("");
    if (!validate()) {
      setTimeout(() => document.querySelector("[role=alert]:not(:empty)")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    const config = {
      type: "voice-agent",
      template: f.template,
      name: f.name.trim(),
      businessName: f.business.trim(),
      prompt: f.prompt.trim(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      behaviour: {
        tone: f.tone, formality: f.formality, replyLength: f.length, initiative: f.initiative,
        greeting: f.greeting.trim(), rules: f.rules.trim(), collect: f.collect,
        actions: Object.fromEntries(ACTIONS.map((a) => [a.k, f.actions.includes(a.k)])),
        backchannel: f.backchannel,
      },
      call: {
        direction: f.direction,
        number: f.numberMode === "new" ? { mode: "new", country: f.country } : { mode: "own", number: f.ownNumber.trim() },
        transferNumber: f.transfer.trim() || null,
        hours: f.hoursOn ? { days: f.days, from: f.from, to: f.to, afterHours: f.after } : null,
        maxMinutes: f.maxMin, silenceHangupSeconds: f.silence,
        voicemailDetection: f.direction !== "inbound" ? f.voicemail : false,
        recordCalls: f.record, tellCallerAboutRecording: f.record && f.disclose,
      },
      tts: { voiceId: f.voiceId, speed: f.speed, pitch: f.pitch, cloneFromSample: !!sample, cloneConsent: !!sample && f.consent },
      stt: { languages: f.langs, mode: f.sttMode, noiseSuppression: f.noise, autoDetectLanguage: f.autoDetect, interruptionSensitivity: f.interrupt, endOfSpeechWaitSeconds: f.wait },
    };
    const fd = new FormData();
    fd.append("config", JSON.stringify(config));
    if (sample) fd.append("voiceSample", sample);
    docs.forEach((d) => fd.append("documents[]", d));

    setLoading(true);
    try {
      let result;
      if (onSubmit) result = await onSubmit(fd);
      else {
        const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
        if (!token) { window.location.assign("/login"); return; }
        ({ data: result } = await axios.post(`${API}/api/voice-agent`, fd, { headers: { Authorization: `Bearer ${token}` } }));
      }
      if (onSuccess) onSuccess(result);
      else window.location.assign(redirectTo);
    } catch (err) {
      if (err?.response?.status === 401) { window.location.assign("/login"); return; }
      setFormError(err?.response?.data?.message || (err?.request ? "Can't reach the server. Check your connection and try again." : err?.message || "Something went wrong."));
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const toggleLang = (code) => up("langs", f.langs.includes(code) ? (f.langs.length > 1 ? f.langs.filter((c) => c !== code) : f.langs) : [...f.langs, code]);
  const langLabels = f.langs.map((c) => LANGS.find((l) => l.code === c)?.label).filter(Boolean);
  const voice = voices.find((v) => v.id === f.voiceId);
  const dirLabel = { inbound: "Inbound", outbound: "Outbound", both: "In & out" }[f.direction];

  const submitBtn = (light, className = "") => (
    <button type="submit" form="agent-form" disabled={loading}
      className={`group items-center justify-between rounded-full py-3 pl-7 pr-3 text-base font-semibold tracking-tight transition-colors disabled:cursor-wait disabled:opacity-70 ${focusRing} ${light ? "bg-white text-neutral-900 hover:bg-neutral-200" : "bg-neutral-900 text-white hover:bg-neutral-700"} ${className}`}>
      {loading ? "Creating agent" : "Create voice agent"}
      <span aria-hidden="true" className={`grid h-10 w-10 place-items-center rounded-full transition-transform duration-500 ${EASE} ${light ? "bg-neutral-900 text-white" : "bg-white text-neutral-900"} ${loading ? "" : "group-hover:-rotate-45"}`}>
        {loading ? (
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((i) => <span key={i} style={{ animationDelay: `${i * 120}ms` }} className={`h-1.5 w-1.5 animate-bounce rounded-full ${light ? "bg-white" : "bg-neutral-900"}`} />)}
          </span>
        ) : "→"}
      </span>
    </button>
  );

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap" />
      <style>{`@keyframes vbar{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}@media (prefers-reduced-motion:reduce){.vbar{animation:none!important}}`}</style>

      <main className="relative min-h-screen w-full overflow-x-clip bg-white px-4 pb-20 pt-28 font-['Inter',ui-sans-serif,sans-serif] text-neutral-900 antialiased sm:px-8 sm:pt-32 lg:px-12">
        <div className={`pointer-events-none absolute -left-32 -top-32 h-[34rem] w-[34rem] ${DOTS} [mask-image:radial-gradient(circle_at_center,black_0%,transparent_65%)]`} />

        <div className="relative mx-auto w-full max-w-[1180px]">
          <header {...rise(100)} className={`mb-10 ${rise(100).className}`}>
            <a href="/dashboard" className={`mb-6 inline-flex items-center gap-2 rounded-full text-sm font-semibold text-neutral-700 hover:text-neutral-900 ${focusRing}`}>
              <span aria-hidden="true">←</span> Dashboard
            </a>
            <h1 className="text-[clamp(2.6rem,5.4vw,4.5rem)] font-extralight leading-[0.95] tracking-[-0.04em]">
              Create a new
              <br />
              <span className={`${SERIF} font-normal italic`}>voice agent.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base font-medium leading-relaxed text-neutral-700">
              An agent that picks up the phone, understands the caller and gets the job done. Start from a use case, then make it yours.
            </p>
          </header>

          {formError && (
            <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-neutral-900/25 bg-neutral-100 px-4 py-3 text-sm font-medium">
              <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">!</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_370px]">
            <form id="agent-form" onSubmit={submit} noValidate {...rise(220)} className={`space-y-6 ${rise(220).className}`}>
              {/* 1 start */}
              <Section n="1" title="What will it do?" desc="Pick the closest use case. It fills in sensible defaults you can change below.">
                <div role="radiogroup" aria-label="Use case" className="grid gap-3 sm:grid-cols-2">
                  {TEMPLATES.map((t) => {
                    const on = f.template === t.id;
                    return (
                      <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => applyTemplate(t)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${focusRing} ${on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-900/15 hover:border-neutral-900"}`}>
                        <span className="block text-base font-semibold tracking-tight">{t.name}</span>
                        <span className={`block text-sm font-medium ${on ? "text-neutral-300" : "text-neutral-600"}`}>{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className={`${labelCls} mb-2 block`}>Agent name</label>
                    <input id="name" value={f.name} onChange={(e) => up("name", e.target.value)} maxLength={40} placeholder="Aiko" aria-invalid={!!errors.name} className={inputCls(errors.name)} />
                    <Err>{errors.name}</Err>
                  </div>
                  <div>
                    <label htmlFor="business" className={`${labelCls} mb-2 block`}>Business name <span className="font-medium text-neutral-500">(optional)</span></label>
                    <input id="business" value={f.business} onChange={(e) => up("business", e.target.value)} maxLength={60} placeholder="Sharma Dental Clinic" className={inputCls(false)} />
                  </div>
                </div>
              </Section>

              {/* 2 brain */}
              <Section n="2" title="How does it think?" desc="Say what the job is in plain words, then choose what it collects and what it's allowed to do.">
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <label htmlFor="prompt" className={labelCls}>Instructions</label>
                    <span className="text-xs font-semibold text-neutral-600">{f.prompt.length}/1500</span>
                  </div>
                  <textarea id="prompt" rows={6} maxLength={1500} value={f.prompt} onChange={(e) => up("prompt", e.target.value)}
                    placeholder="Who calls, what they usually want, and what a great call looks like." aria-invalid={!!errors.prompt}
                    className={`${inputCls(errors.prompt)} resize-y leading-relaxed`} />
                  <Err>{errors.prompt}</Err>
                </div>

                <div>
                  <p className={`${labelCls} mb-2`}>Tone</p>
                  <div className="flex flex-wrap gap-2">{TONES.map((t) => <Chip key={t} on={f.tone === t} onClick={() => up("tone", t)}>{t}</Chip>)}</div>
                </div>
                <div className="grid gap-5 md:grid-cols-3">
                  <Seg label="Formality" value={f.formality} onChange={(v) => up("formality", v)} options={[{ v: "casual", l: "Casual" }, { v: "balanced", l: "Balanced" }, { v: "formal", l: "Formal" }]} />
                  <Seg label="Reply length" value={f.length} onChange={(v) => up("length", v)} options={[{ v: "brief", l: "Brief" }, { v: "balanced", l: "Balanced" }, { v: "detailed", l: "Detailed" }]} />
                  <Seg label="Initiative" value={f.initiative} onChange={(v) => up("initiative", v)} options={[{ v: "waits", l: "Waits" }, { v: "suggests", l: "Suggests" }, { v: "leads", l: "Leads" }]} />
                </div>

                <div>
                  <label htmlFor="greeting" className={`${labelCls} mb-2 block`}>Opening line <span className="font-medium text-neutral-500">(optional)</span></label>
                  <input id="greeting" value={f.greeting} onChange={(e) => up("greeting", e.target.value)} maxLength={180} placeholder={greetingText} className={inputCls(false)} />
                </div>

                <div>
                  <p className={labelCls}>Details to collect</p>
                  <p className={`${hintCls} mb-3`}>The agent asks for these naturally during the call and saves them.</p>
                  <div className="flex flex-wrap gap-2">
                    {fieldOptions.map((c) => <Chip key={c} on={f.collect.includes(c)} onClick={() => up("collect", toggleIn(f.collect, c))}>{c}</Chip>)}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input value={newField} onChange={(e) => setNewField(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addField(); } }}
                      aria-label="Add your own detail to collect" placeholder="Add your own, like Policy number" className={`${inputCls(false)} !py-2.5 text-sm`} />
                    <button type="button" onClick={addField} className={`shrink-0 rounded-full border border-neutral-900/25 px-5 text-sm font-semibold hover:border-neutral-900 ${focusRing}`}>Add</button>
                  </div>
                </div>

                <div className="space-y-5 border-t border-neutral-900/10 pt-6">
                  <p className={labelCls}>What it can do</p>
                  {ACTIONS.map((a) => (
                    <Toggle key={a.k} checked={f.actions.includes(a.k)} onChange={() => up("actions", toggleIn(f.actions, a.k))} label={a.l} hint={a.h} />
                  ))}
                </div>

                <div>
                  <label htmlFor="rules" className={`${labelCls} mb-2 block`}>Never do <span className="font-medium text-neutral-500">(optional)</span></label>
                  <textarea id="rules" rows={3} value={f.rules} onChange={(e) => up("rules", e.target.value)} placeholder="Never give medical advice. Never quote a price that isn't in the price list."
                    className={`${inputCls(false)} resize-y leading-relaxed`} />
                </div>
              </Section>

              {/* 3 phone */}
              <Section n="3" title="Phone and hours" desc="Which calls it handles, the number it uses, and when it's on duty.">
                <Seg label="Call direction" value={f.direction} onChange={(v) => up("direction", v)} options={[{ v: "inbound", l: "Inbound" }, { v: "outbound", l: "Outbound" }, { v: "both", l: "Both" }]} />

                <div>
                  <Seg label="Phone number" value={f.numberMode} onChange={(v) => up("numberMode", v)} options={[{ v: "new", l: "Get a new number" }, { v: "own", l: "Use my number" }]} />
                  {f.numberMode === "new" ? (
                    <div className="mt-4">
                      <label htmlFor="country" className={`${labelCls} mb-2 block`}>Country</label>
                      <select id="country" value={f.country} onChange={(e) => up("country", e.target.value)} className={inputCls(false)}>
                        {COUNTRIES.map((c) => <option key={c.c} value={c.c}>{c.l}</option>)}
                      </select>
                      <p className={hintCls}>We'll assign a number when the agent is created.</p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <label htmlFor="own" className={`${labelCls} mb-2 block`}>Your number</label>
                      <input id="own" inputMode="tel" value={f.ownNumber} onChange={(e) => up("ownNumber", e.target.value)} placeholder="+919876543210" aria-invalid={!!errors.ownNumber} className={inputCls(errors.ownNumber)} />
                      <Err>{errors.ownNumber}</Err>
                      <p className={hintCls}>You'll connect it to your phone provider after creating the agent.</p>
                    </div>
                  )}
                </div>

                {wantsTransfer && (
                  <div>
                    <label htmlFor="transfer" className={`${labelCls} mb-2 block`}>Transfer calls to</label>
                    <input id="transfer" inputMode="tel" value={f.transfer} onChange={(e) => up("transfer", e.target.value)} placeholder="+919876543210" aria-invalid={!!errors.transfer} className={inputCls(errors.transfer)} />
                    <Err>{errors.transfer}</Err>
                  </div>
                )}

                <Toggle checked={f.hoursOn} onChange={(v) => up("hoursOn", v)} label="Only answer during business hours" hint="Off means the agent works around the clock." />
                {f.hoursOn && (
                  <Box>
                    <p className={`${labelCls} mb-2`}>Days</p>
                    <div className="flex flex-wrap gap-2">{DAYS.map((d) => <Chip key={d} on={f.days.includes(d)} onClick={() => up("days", toggleIn(f.days, d))}>{d}</Chip>)}</div>
                    <Err>{errors.days}</Err>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="from" className={`${labelCls} mb-2 block`}>Opens</label>
                        <input id="from" type="time" value={f.from} onChange={(e) => up("from", e.target.value)} className={inputCls(errors.hours)} />
                      </div>
                      <div>
                        <label htmlFor="to" className={`${labelCls} mb-2 block`}>Closes</label>
                        <input id="to" type="time" value={f.to} onChange={(e) => up("to", e.target.value)} className={inputCls(errors.hours)} />
                      </div>
                    </div>
                    <Err>{errors.hours}</Err>
                    <div className="mt-5">
                      <Seg label="After hours" value={f.after} onChange={(v) => up("after", v)} options={[{ v: "message", l: "Take a message" }, { v: "transfer", l: "Transfer" }, { v: "voicemail", l: "Voicemail" }]} />
                    </div>
                  </Box>
                )}
              </Section>

              {/* 4 voice */}
              <Section n="4" title="What does it sound like?" desc="The text-to-speech voice callers hear.">
                <div role="radiogroup" aria-label="Voice" className="grid gap-3 sm:grid-cols-2">
                  {voices.map((v) => {
                    const on = v.id === f.voiceId;
                    return (
                      <button key={v.id} type="button" role="radio" aria-checked={on} onClick={() => up("voiceId", v.id)}
                        className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${focusRing} ${on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-900/15 hover:border-neutral-900"}`}>
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${on ? "bg-white text-neutral-900" : "bg-neutral-900 text-white"}`}>{v.name[0]}</span>
                        <span className="min-w-0">
                          <span className="block text-base font-semibold tracking-tight">{v.name}</span>
                          <span className={`block truncate text-sm font-medium ${on ? "text-neutral-300" : "text-neutral-600"}`}>{v.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Range label="Speaking speed" value={f.speed} onChange={(v) => up("speed", v)} min={0.7} max={1.3} step={0.05} format={(v) => `${v.toFixed(2)}×`} />
                  <Range label="Pitch" value={f.pitch} onChange={(v) => up("pitch", v)} min={0.8} max={1.2} step={0.05} format={(v) => (v === 1 ? "Natural" : v > 1 ? `+${Math.round((v - 1) * 100)}%` : `${Math.round((v - 1) * 100)}%`)} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={previewVoice} className={`inline-flex items-center gap-2.5 rounded-full border border-neutral-900/25 py-2.5 pl-5 pr-3 text-sm font-semibold tracking-tight transition-colors hover:border-neutral-900 ${focusRing}`}>
                    {speaking ? "Stop preview" : "Hear the opening line"}
                    <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-neutral-900 text-[10px] text-white">{speaking ? "■" : "▶"}</span>
                  </button>
                  <p className="text-[13px] font-medium text-neutral-600">Preview uses your browser's voices. Callers hear the voice from your TTS service.</p>
                </div>
                <Box>
                  <p className={labelCls}>Clone a voice <span className="font-medium text-neutral-500">(optional)</span></p>
                  <p className={hintCls}>Upload 30–60 seconds of clean speech. It replaces the voice above.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="cursor-pointer rounded-full border border-neutral-900/25 px-5 py-2.5 text-sm font-semibold tracking-tight transition-colors hover:border-neutral-900 focus-within:ring-4 focus-within:ring-neutral-900/10">
                      <input type="file" accept="audio/*" className="sr-only" onChange={(e) => { pickSample(e.target.files?.[0]); e.target.value = ""; }} />
                      {sample ? "Replace audio" : "Upload audio"}
                    </label>
                    {sample && (
                      <span className="flex items-center gap-2 text-sm font-medium text-neutral-800">
                        {sample.name} · {kb(sample.size)}
                        <button type="button" aria-label="Remove voice sample" onClick={() => { setSample(null); up("consent", false); }} className={`grid h-6 w-6 place-items-center rounded-full border border-neutral-900/20 text-xs hover:border-neutral-900 ${focusRing}`}>×</button>
                      </span>
                    )}
                  </div>
                  <Err>{errors.sample}</Err>
                  {sample && (
                    <>
                      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-medium leading-relaxed text-neutral-800">
                        <input type="checkbox" checked={f.consent} onChange={(e) => up("consent", e.target.checked)} className="peer sr-only" />
                        <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-neutral-400 bg-white text-transparent transition-colors peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-neutral-900/15">
                          <svg viewBox="0 0 16 16" className="h-3 w-3 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
                        </span>
                        I own this voice or have the speaker's permission to clone it.
                      </label>
                      <Err>{errors.consent}</Err>
                    </>
                  )}
                </Box>
              </Section>

              {/* 5 listening */}
              <Section n="5" title="How does it listen?" desc="Speech-to-text and turn-taking, so conversations feel natural on a phone line.">
                <div>
                  <p className={`${labelCls} mb-2`}>Languages callers speak</p>
                  <div className="flex flex-wrap gap-2">{LANGS.map((l) => <Chip key={l.code} on={f.langs.includes(l.code)} onClick={() => toggleLang(l.code)}>{l.label}{f.langs[0] === l.code ? " · main" : ""}</Chip>)}</div>
                  <p className={hintCls}>The first language you pick is the main one.</p>
                </div>
                <Seg label="Recognition" value={f.sttMode} onChange={(v) => up("sttMode", v)} options={[{ v: "fast", l: "Fast (lower delay)" }, { v: "accurate", l: "Accurate" }]} />
                <Seg label="Caller can interrupt" value={f.interrupt} onChange={(v) => up("interrupt", v)} options={[{ v: "off", l: "Never" }, { v: "low", l: "Rarely" }, { v: "medium", l: "Normally" }, { v: "high", l: "Instantly" }]} />
                <Range label="Wait before replying" value={f.wait} onChange={(v) => up("wait", v)} min={0.3} max={1.5} step={0.1} format={(v) => `${v.toFixed(1)} s`} />
                <div className="space-y-5">
                  <Toggle checked={f.backchannel} onChange={(v) => up("backchannel", v)} label="Say “mm-hm” while listening" hint="Small acknowledgements make the agent feel attentive." />
                  <Toggle checked={f.noise} onChange={(v) => up("noise", v)} label="Noise suppression" hint="Filters traffic, wind and background chatter." />
                  <Toggle checked={f.autoDetect} onChange={(v) => up("autoDetect", v)} label="Auto-detect language" hint="Switch language if the caller does." />
                </div>
                <Box>
                  <p className={labelCls}>Test your microphone</p>
                  <p className={hintCls}>Say a sentence in {langLabels[0] || "English"} and see what the recogniser hears.</p>
                  <button type="button" onClick={testMic} className={`mt-3 inline-flex items-center gap-2.5 rounded-full border border-neutral-900/25 py-2.5 pl-5 pr-3 text-sm font-semibold tracking-tight transition-colors hover:border-neutral-900 ${focusRing}`}>
                    {listening ? "Listening… tap to stop" : "Start test"}
                    <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${listening ? "animate-pulse bg-rose-500" : "bg-neutral-900"}`} />
                  </button>
                  <p aria-live="polite" className={`mt-3 min-h-6 text-sm font-medium ${heard ? "text-neutral-900" : "text-neutral-600"}`}>{heard ? `“${heard}”` : micMsg}</p>
                </Box>
              </Section>

              {/* 6 call rules + knowledge */}
              <Section n="6" title="Call rules and knowledge" desc="Limits, recording and the documents it answers from.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Range label="Longest call" value={f.maxMin} onChange={(v) => up("maxMin", v)} min={2} max={30} step={1} format={(v) => `${v} min`} />
                  <Range label="Hang up after silence" value={f.silence} onChange={(v) => up("silence", v)} min={8} max={60} step={2} format={(v) => `${v} s`} />
                </div>
                <div className="space-y-5">
                  {f.direction !== "inbound" && (
                    <Toggle checked={f.voicemail} onChange={(v) => up("voicemail", v)} label="Detect voicemail" hint="Leave a short message, or hang up, instead of talking to a machine." />
                  )}
                  <Toggle checked={f.record} onChange={(v) => up("record", v)} label="Record calls" hint="Saves audio and a transcript for every call." />
                  {f.record && (
                    <Toggle checked={f.disclose} onChange={(v) => up("disclose", v)} label="Tell callers the call is recorded" hint="Many places require this. We recommend leaving it on." />
                  )}
                </div>

                <div>
                  <p className={labelCls}>Knowledge documents <span className="font-medium text-neutral-500">(optional)</span></p>
                  <p className={`${hintCls} mb-3`}>Price lists, FAQs, service menus. The agent answers from these.</p>
                  <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addDocs(Array.from(e.dataTransfer.files)); }}
                    className="block cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 p-6 text-center transition-colors hover:border-neutral-900 focus-within:ring-4 focus-within:ring-neutral-900/10">
                    <input type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.csv" className="sr-only" onChange={(e) => { addDocs(Array.from(e.target.files || [])); e.target.value = ""; }} />
                    <span className="block text-sm font-semibold">Add documents</span>
                    <span className="mt-0.5 block text-xs font-medium text-neutral-600">PDF, Word, TXT, Markdown, CSV · up to 20 MB each</span>
                  </label>
                  <Err>{errors.docs}</Err>
                  {docs.length > 0 && (
                    <ul className="mt-3 divide-y divide-neutral-900/10 rounded-2xl border border-neutral-900/10">
                      {docs.map((d, i) => (
                        <li key={`${d.name}-${i}`} className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="min-w-0 truncate text-sm font-semibold">{d.name}</span>
                          <span className="flex shrink-0 items-center gap-3 text-[13px] font-medium text-neutral-600">
                            {kb(d.size)}
                            <button type="button" aria-label={`Remove ${d.name}`} onClick={() => setDocs((x) => x.filter((_, j) => j !== i))} className={`grid h-6 w-6 place-items-center rounded-full border border-neutral-900/20 text-xs text-neutral-900 hover:border-neutral-900 ${focusRing}`}>×</button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Section>

              {submitBtn(false, "flex w-full lg:hidden")}
            </form>

            {/* ============================ live call card ============================ */}
            <aside {...rise(340)} className={`lg:sticky lg:top-28 ${rise(340).className}`} aria-label="Live preview">
              <div className="relative overflow-hidden rounded-[32px] bg-neutral-950 p-7 text-white shadow-[0_40px_100px_-40px_rgba(0,0,0,0.5)]">
                <div className={`absolute inset-0 ${DOTS_DARK} [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]`} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 rounded-full border border-white/25 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> {dirLabel} call
                    </span>
                    <span className="text-xs font-semibold text-neutral-300">{pct}% ready</span>
                  </div>

                  <div className="mt-8 flex flex-col items-center text-center">
                    <Orb className="h-28 w-28">{(f.name.trim()[0] || "?").toUpperCase()}</Orb>
                    <p className="mt-5 text-3xl">
                      {f.name.trim() ? <span className={`${SERIF} italic`}>{f.name.trim()}</span> : <span className="text-2xl font-light text-neutral-400">Unnamed</span>}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-neutral-300">
                      {f.business.trim() || "Your business"} · {f.numberMode === "own" && f.ownNumber ? f.ownNumber : "New number"}
                    </p>
                  </div>

                  <div className="mt-6 flex h-10 items-center justify-center gap-[3px]" aria-hidden="true">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <span key={i} className="vbar block w-[3px] origin-center rounded-full bg-white/80"
                        style={{ height: `${14 + ((i * 37) % 26)}px`, animation: "vbar 1.1s ease-in-out infinite", animationDelay: `${(i % 9) * 90}ms`, animationPlayState: speaking || listening ? "running" : "paused", transform: "scaleY(.25)", opacity: speaking || listening ? 1 : 0.4 }} />
                    ))}
                  </div>

                  <p className="mt-5 rounded-2xl rounded-bl-md bg-white/15 px-4 py-3 text-sm font-medium leading-relaxed">{greetingText}</p>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                    {[f.tone, voice?.name && `${voice.name} voice`, langLabels.length > 1 ? `${langLabels[0]} +${langLabels.length - 1}` : langLabels[0], f.hoursOn ? `${f.from}–${f.to}` : "24/7", f.collect.length ? `${f.collect.length} details` : null]
                      .filter(Boolean).map((t) => <span key={t} className="rounded-full border border-white/25 px-3 py-1 text-neutral-100">{t}</span>)}
                  </div>

                  <div className="mt-7 border-t border-white/15 pt-5">
                    <div className="h-1 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Agent completeness">
                      <div style={{ width: `${pct}%` }} className={`h-full rounded-full bg-white transition-all duration-700 ${EASE}`} />
                    </div>
                    <ul className="mt-4 grid grid-cols-2 gap-2 text-sm font-medium">
                      {checks.map((c) => (
                        <li key={c.label} className={`flex items-center gap-2 ${c.ok ? "text-white" : "text-neutral-400"}`}>
                          <span aria-hidden="true" className={`grid h-4 w-4 place-items-center rounded-full text-[9px] ${c.ok ? "bg-white text-neutral-900" : "border border-white/30"}`}>{c.ok ? "✓" : ""}</span>
                          {c.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {submitBtn(true, "mt-7 hidden w-full lg:flex")}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
};

export default NewVoiceAgentPage;