import axios from "axios";
import { useEffect, useState } from "react";

/* RequestAccessPage  (the register page)
   (Render <NavbarBeforeLogin /> globally or above this page; the page leaves room for it.)
   Same split layout as LoginPage: calm form on the left, dark "what happens next" panel on the
   right (hidden on small screens).

   Backend: POST {API}/api/user/register  with { fullName, email, password, confirmPassword }
            -> 201 { success, message: "User Created" }   (errors: { success:false, message })
   The register endpoint does not return a token, so after a good sign-up the user is sent to
   /login?registered=1 (LoginPage shows "Your account is ready").

   API base URL: set VITE_API_URL (e.g. http://localhost:5002) or use a dev proxy for "/api".

   Props (all optional):
     onRegister({ fullName, email, password, confirmPassword })  async; throw Error(message) to show it.
     onGoogle()                                                   Hidden if not passed.
     onSuccess(result)                                            Default: go to redirectTo.
     redirectTo                                                   default "/login?registered=1"
   Tailwind only. */

const API = import.meta.env.VITE_SERVER || "";

const SERIF = "font-['Instrument_Serif',ui-serif,Georgia,serif]";
const EASE = "ease-[cubic-bezier(.22,1,.36,1)]";
const DOTS =
  "bg-[radial-gradient(circle,rgba(10,10,10,0.18)_1px,transparent_1.6px)] [background-size:14px_14px]";
const DOTS_DARK =
  "bg-[radial-gradient(circle,rgba(255,255,255,0.16)_1px,transparent_1.6px)] [background-size:14px_14px]";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const defaultRegister = async ({ fullName, email, password, confirmPassword }) => {
  try {
    const { data } = await axios.post(`${API}/api/user/register`, { fullName, email, password, confirmPassword });
    return data;
  } catch (err) {
    if (err?.response) throw new Error(err.response.data?.message || "We couldn't create your account. Please try again.");
    if (err?.request) throw new Error("Can't reach the server. Check your connection and try again.");
    throw err;
  }
};

const strength = (pw) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
  return s;
};
const STRENGTH_LABEL = ["Too short", "Weak", "Okay", "Good", "Strong"];

const Orb = ({ className = "" }) => (
  <span className={`relative block shrink-0 rounded-full bg-white ${className}`}>
    <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(10,10,10,0.55)_1px,transparent_1.4px)] [background-size:6px_6px]" />
  </span>
);

const Field = ({ id, label, error, hint, children }) => (
  <div>
    <div className="mb-2 flex items-baseline justify-between">
      <label htmlFor={id} className="text-sm font-semibold tracking-tight text-neutral-900">{label}</label>
      {hint}
    </div>
    {children}
    <p
      id={`${id}-error`}
      role={error ? "alert" : undefined}
      className={`overflow-hidden text-[13px] font-medium text-neutral-900 transition-all duration-300 ${error ? "mt-2 max-h-10 opacity-100" : "max-h-0 opacity-0"}`}
    >
      {error}
    </p>
  </div>
);

const inputCls = (bad) =>
  `w-full rounded-2xl border bg-white px-4 py-3.5 text-base font-medium text-neutral-900 placeholder:font-normal placeholder:text-neutral-500 transition-colors duration-300 hover:border-neutral-500 focus:border-neutral-900 focus:outline-none focus:ring-4 focus:ring-neutral-900/10 ${
    bad ? "border-neutral-900" : "border-neutral-300"
  }`;

const STEPS = [
  { t: "Create your account", d: "Your name, email and a password. It takes under a minute." },
  { t: "Sign in", d: "Use the same email and password to open your workspace." },
  { t: "Meet your humans", d: "Pick a prebuilt human or describe your own in a prompt." },
];

const RequestAccessPage = ({ onRegister = defaultRegister, onGoogle, onSuccess, redirectTo = "/login?registered=1" }) => {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const rise = () =>
    `transition-all duration-1000 ${EASE} motion-reduce:transition-none ${
      ready ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
    }`;

  const set = (key) => (e) => {
    setForm((s) => ({ ...s, [key]: e.target.value }));
    if (errors[key]) setErrors((s) => ({ ...s, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Enter your full name.";
    if (!form.email.trim()) next.email = "Enter your email address.";
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "That doesn't look like an email address.";
    if (!form.password) next.password = "Create a password.";
    else if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (!form.confirmPassword) next.confirmPassword = "Re-enter your password.";
    else if (form.confirmPassword !== form.password) next.confirmPassword = "The passwords don't match.";
    if (!agree) next.agree = "Accept the terms to continue.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setFormError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await onRegister({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      if (onSuccess) onSuccess(result);
      else window.location.assign(redirectTo);
    } catch (err) {
      setFormError(err?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const score = strength(form.password);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap"
      />

      <main className="grid min-h-screen w-full bg-white pt-24 sm:pt-28 font-['Inter',ui-sans-serif,sans-serif] text-neutral-900 antialiased lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ------------------------------ form side ------------------------------ */}
        <section className="relative flex min-h-[calc(100svh-7rem)] flex-col overflow-hidden px-6 pb-6 sm:px-10 lg:px-14">
          <div className={`pointer-events-none absolute -left-24 -top-24 h-[28rem] w-[28rem] ${DOTS} [mask-image:radial-gradient(circle_at_center,black_0%,transparent_65%)]`} />

          <div className="relative flex flex-1 items-center py-10">
            <div className="mx-auto w-full max-w-[26rem]">
              <div style={{ transitionDelay: "100ms" }} className={rise()}>
                <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-800">
                  <span className="h-px w-8 bg-neutral-900/50" /> Request access
                </p>
                <h1 className="text-[clamp(2.8rem,5.4vw,4.5rem)] font-extralight leading-[0.95] tracking-[-0.04em] text-neutral-900">
                  Meet your
                  <br />
                  <span className={`${SERIF} font-normal italic`}>first human.</span>
                </h1>
                <p className="mt-5 max-w-sm text-base font-medium leading-relaxed text-neutral-700">
                  Create your account to build lifelike AI humans from a single prompt.
                </p>
              </div>

              <form onSubmit={submit} noValidate style={{ transitionDelay: "220ms" }} className={`mt-10 space-y-5 ${rise()}`}>
                {formError && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-2xl border border-neutral-900/25 bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-900"
                  >
                    <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">!</span>
                    <span>
                      {formError}
                      {/exists/i.test(formError) && (
                        <>
                          {" "}
                          <a href="/login" className="font-semibold underline underline-offset-4">Sign in instead</a>
                        </>
                      )}
                    </span>
                  </div>
                )}

                <Field id="fullName" label="Full name" error={errors.fullName}>
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    autoFocus
                    value={form.fullName}
                    onChange={set("fullName")}
                    placeholder="Maya Lin"
                    aria-invalid={!!errors.fullName}
                    aria-describedby="fullName-error"
                    className={inputCls(errors.fullName)}
                  />
                </Field>

                <Field id="email" label="Email" error={errors.email}>
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="you@company.com"
                    aria-invalid={!!errors.email}
                    aria-describedby="email-error"
                    className={inputCls(errors.email)}
                  />
                </Field>

                <Field id="password" label="Password" error={errors.password}>
                  <div className="relative">
                    <input
                      id="password"
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={set("password")}
                      placeholder="At least 8 characters"
                      aria-invalid={!!errors.password}
                      aria-describedby="password-error password-strength"
                      className={`${inputCls(errors.password)} pr-20`}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      aria-pressed={show}
                      aria-label={show ? "Hide passwords" : "Show passwords"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-800 transition-colors hover:bg-neutral-900/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900"
                    >
                      {show ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div id="password-strength" className={`mt-3 flex items-center gap-3 transition-opacity duration-300 ${form.password ? "opacity-100" : "opacity-0"}`}>
                    <div className="flex flex-1 gap-1.5" aria-hidden="true">
                      {[1, 2, 3, 4].map((n) => (
                        <span key={n} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${score >= n ? "bg-neutral-900" : "bg-neutral-900/15"}`} />
                      ))}
                    </div>
                    <span className="w-16 text-right text-xs font-semibold text-neutral-700">{STRENGTH_LABEL[score]}</span>
                  </div>
                </Field>

                <Field id="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
                  <input
                    id="confirmPassword"
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    placeholder="Re-enter your password"
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby="confirmPassword-error"
                    className={inputCls(errors.confirmPassword)}
                  />
                </Field>

                <div>
                  <label className="flex cursor-pointer select-none items-start gap-3 text-sm font-medium leading-relaxed text-neutral-800">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => { setAgree(e.target.checked); if (errors.agree) setErrors((s) => ({ ...s, agree: "" })); }}
                      aria-invalid={!!errors.agree}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-neutral-400 bg-white text-transparent transition-colors duration-300 peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-neutral-900/15"
                    >
                      <svg viewBox="0 0 16 16" className="h-3 w-3 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
                    </span>
                    <span>
                      I agree to the{" "}
                      <a href="/terms" className="font-semibold text-neutral-900 underline decoration-neutral-900/40 underline-offset-[5px] hover:decoration-neutral-900">Terms</a>{" "}
                      and{" "}
                      <a href="/privacy" className="font-semibold text-neutral-900 underline decoration-neutral-900/40 underline-offset-[5px] hover:decoration-neutral-900">Privacy Policy</a>.
                    </span>
                  </label>
                  <p
                    role={errors.agree ? "alert" : undefined}
                    className={`overflow-hidden text-[13px] font-medium text-neutral-900 transition-all duration-300 ${errors.agree ? "mt-2 max-h-10 opacity-100" : "max-h-0 opacity-0"}`}
                  >
                    {errors.agree}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-between rounded-full bg-neutral-900 py-3 pl-7 pr-3 text-base font-semibold tracking-tight text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-wait disabled:bg-neutral-700"
                >
                  {loading ? "Creating your account" : "Request access"}
                  <span aria-hidden="true" className={`grid h-10 w-10 place-items-center rounded-full bg-white text-neutral-900 transition-transform duration-500 ${EASE} ${loading ? "" : "group-hover:-rotate-45"}`}>
                    {loading ? (
                      <span className="flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <span key={i} style={{ animationDelay: `${i * 120}ms` }} className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-900" />
                        ))}
                      </span>
                    ) : "→"}
                  </span>
                </button>

                {onGoogle && (
                  <>
                    <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-700">
                      <span className="h-px flex-1 bg-neutral-900/20" /> or <span className="h-px flex-1 bg-neutral-900/20" />
                    </div>
                    <button
                      type="button"
                      onClick={onGoogle}
                      className="flex w-full items-center justify-center gap-3 rounded-full border border-neutral-900/25 bg-white py-3.5 text-base font-semibold tracking-tight text-neutral-900 transition-colors hover:border-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                        <path d="M21.35 11.1H12v2.8h5.35c-.5 2.4-2.6 3.9-5.35 3.9a6 6 0 110-12c1.5 0 2.8.55 3.85 1.45l2-2A8.9 8.9 0 0012 3a9 9 0 100 18c5.2 0 8.6-3.65 8.6-8.8 0-.4-.05-.75-.1-1.1z" />
                      </svg>
                      Continue with Google
                    </button>
                  </>
                )}
              </form>

              <p style={{ transitionDelay: "340ms" }} className={`mt-8 text-sm font-medium text-neutral-800 ${rise()}`}>
                Already have an account?{" "}
                <a href="/login" className="font-semibold text-neutral-900 underline decoration-neutral-900/50 underline-offset-[6px] transition hover:decoration-neutral-900">
                  Sign in
                </a>
              </p>
            </div>
          </div>

          <footer className={`relative flex flex-wrap items-center justify-between gap-3 text-[13px] font-medium text-neutral-700 ${rise()}`}>
            <p>© {new Date().getFullYear()} Tsushima AI</p>
            <p className="flex items-center gap-5">
              <a href="/privacy" className="transition-colors hover:text-neutral-900">Privacy</a>
              <a href="/terms" className="transition-colors hover:text-neutral-900">Terms</a>
            </p>
          </footer>
        </section>

        {/* ------------------------------ visual side ------------------------------ */}
        <aside
          aria-hidden="true"
          className="relative mx-3 mb-3 mt-0 hidden overflow-hidden rounded-[32px] bg-neutral-950 text-white shadow-[0_40px_100px_-40px_rgba(0,0,0,0.5)] lg:block"
        >
          <div className={`absolute inset-0 ${DOTS_DARK} [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]`} />

          <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 rounded-full border border-white/25 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Early access
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-300">Three steps to live</span>
            </div>

            {/* orb with slow rings */}
            <div className="relative mx-auto grid place-items-center py-10">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{ animationDelay: `${i * 1000}ms`, animationDuration: "3s" }}
                  className="absolute h-40 w-40 animate-ping rounded-full border border-white/25 motion-reduce:hidden xl:h-48 xl:w-48"
                />
              ))}
              <Orb className={`h-40 w-40 transition-all duration-[1400ms] ${EASE} xl:h-48 xl:w-48 ${ready ? "scale-100 opacity-100" : "scale-75 opacity-0"}`} />
            </div>

            {/* steps */}
            <ol className="space-y-5">
              {STEPS.map((s, i) => (
                <li
                  key={s.t}
                  style={{ transitionDelay: `${600 + i * 250}ms` }}
                  className={`flex items-start gap-4 transition-all duration-700 ${ready ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/30 text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-base font-semibold tracking-tight text-white">{s.t}</p>
                    <p className="mt-0.5 text-sm font-medium text-neutral-300">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </main>
    </>
  );
};

export default RequestAccessPage;