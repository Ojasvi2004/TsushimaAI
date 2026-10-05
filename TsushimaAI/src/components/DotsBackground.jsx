import { useEffect, useRef } from "react";

/* One fixed, page-level canvas that owns the whole point-cloud animation.
   It sits BEHIND every section (z-0), and its progress is driven by how far
   you have scrolled through the WHOLE page (containerRef), not just Section 1.
   So the figure forms in the hero, scatters while you scroll, and keeps
   streaming past behind Sections 2 and 3 until the end of the page.

   Keep tsushima-points.json in /public.
   FINISH = fraction of the page's scroll distance at which the dots are fully gone. */

/* Two palettes. In the figure the dots are dark so the lady reads crisply;
   the moment you scroll they fade to light gray (LIGHT_AT = how fast) so text stays readable. */
const LIGHT_AT = 12; // lightness = scroll progress * this. Higher = lightens sooner
const INK_D = "#0a0a0a", INK_L = "#c3c3cb";
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixC = (a, b, t) => {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};
/* dark-gray ramp for the dots, far -> near (q = depth bucket 0..3) */
const DARK = ["#2c2c30", "#1e1e22", "#141416", "#0a0a0a"];
const LIGHT = ["#dadae0", "#cdcdd4", "#c0c0c8", "#b3b3bc"];
const DZ = 1600; // camera distance, in point-cloud units
const FINISH = 0.85; // 1 = dots finish exactly at the bottom of the page
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (i) => {
  let x = Math.imul(i + 1, 2654435761) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
};

const DotsBackground = ({ containerRef }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false, stop = () => {};

    fetch(`${import.meta.env.BASE_URL}tsushima-points.json`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) stop = start(data); })
      .catch((e) => console.error("Could not load tsushima-points.json", e));

    function start(data) {
      const n = data.n;
      const X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n);
      const S = new Float32Array(n), K = new Uint8Array(n);
      const DL = new Float32Array(n), DL2 = new Float32Array(n), DIR = new Float32Array(n), SW = new Float32Array(n);
      const SX = new Float32Array(n), SY = new Float32Array(n), SZ = new Float32Array(n);
      const NX = new Float32Array(n), NY = new Float32Array(n), NZ = new Float32Array(n), DROP = new Uint8Array(n);
      const ox = data.w / 2, oy = data.h / 2;
      data.d.forEach((p, i) => {
        [X[i], Y[i], Z[i], S[i], K[i]] = p;
        DL[i] = hash(i) * 0.8;
        SX[i] = (hash(i + 7) - 0.5) * 900; SY[i] = (hash(i + 13) - 0.5) * 900; SZ[i] = (hash(i + 29) - 0.5) * 700;
        const rr = clamp(Math.hypot(X[i] - ox, Y[i] - oy * 0.8) / 420);
        DL2[i] = hash(i + 3) * 0.35 + rr * 0.25;
        DIR[i] = hash(i + 41) < 0.62 ? 1 : -0.9;
        SW[i] = (hash(i + 5) - 0.5) * 3.4;
        NX[i] = hash(i + 61) * 2 - 1;                      // resting spot, as a fraction of the viewport
        NY[i] = hash(i + 67) * 2 - 1;
        NZ[i] = (hash(i + 71) - 0.5) * 600;                // resting depth
        DROP[i] = hash(i + 97) < 0.45 ? 1 : 0;             // these shrink away so the final field is not overcrowded
      });
      const px = new Float32Array(n), py = new Float32Array(n), pr = new Float32Array(n), pq = new Int8Array(n);
      const tx = new Float32Array(n), ty = new Float32Array(n), sk = new Uint8Array(n);
      const flares = new Int32Array(400);

      let W = 0, H = 0, dpr = 1;
      const fit = () => {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = cv.clientWidth; H = cv.clientHeight;
        cv.width = W * dpr; cv.height = H * dpr;
      };
      fit();
      window.addEventListener("resize", fit);

      const m = { x: -9999, y: -9999, tx: 0, ty: 0, yaw: 0, pitch: 0, t: 0, st: 0, clr: false };
      const onMove = (e) => {
        const r = cv.getBoundingClientRect();
        m.x = (e.clientX - r.left) * dpr; m.y = (e.clientY - r.top) * dpr;
        m.tx = (e.clientX / window.innerWidth) * 2 - 1; m.ty = (e.clientY / window.innerHeight) * 2 - 1;
      };
      const onLeave = () => { m.x = m.y = -9999; m.tx = m.ty = 0; };

      /* progress of the WHOLE page: 0 at the top, 1 when FINISH of the page has scrolled by */
      const onScroll = () => {
        const host = containerRef?.current;
        const vh = window.innerHeight;
        let scrolled, range;
        if (host) {
          const r = host.getBoundingClientRect();
          scrolled = -r.top; range = r.height - vh;
        } else {
          scrolled = window.scrollY; range = document.documentElement.scrollHeight - vh;
        }
        m.t = clamp(scrolled / Math.max(1, range * FINISH));
      };
      onScroll();
      window.addEventListener("pointermove", onMove);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      document.addEventListener("pointerleave", onLeave);

      let cY, sY, cX, sX, cx, cy, kk, halfW, halfH;
      const tmp = { x: 0, y: 0, z: 0, per: 1 };
      /* loc 0 = in the figure, loc 1 = resting at its random spot in the background.
         In between the dot swirls and surges toward the camera (b peaks mid-way),
         then settles. Because it is a pure function of loc, scrolling back up
         replays it in reverse and the dots re-form the figure. */
      const proj = (i, loc, q) => {
        const E = loc * loc * (3 - 2 * loc);
        const b = Math.sin(Math.PI * E);
        let x = lerp(X[i] - ox + SX[i] * q, NX[i] * halfW, E);
        let y = lerp(Y[i] - oy + SY[i] * q, NY[i] * halfH, E);
        let z = lerp(Z[i] - 60 + SZ[i] * q, NZ[i], E);
        if (E > 0) {
          const a = b * SW[i], ca = Math.cos(a), sa = Math.sin(a);
          const xr = x * ca - y * sa, yr = x * sa + y * ca;
          x = xr; y = yr; z += DIR[i] * b * 900;
        }
        const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
        const y2 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
        const per = DZ / (DZ - z2);
        tmp.x = cx + x1 * per * kk; tmp.y = cy + y2 * per * kk; tmp.z = z2; tmp.per = per;
      };

      const t0 = performance.now();
      let raf;
      const frame = (now) => {
        const t = reduce ? 99 : (now - t0) / 1000;
        m.st = lerp(m.st, m.t, 0.1);
        const pt = m.st;
        m.yaw = lerp(m.yaw, m.tx * 0.35 + (reduce ? 0 : Math.sin(t * 0.5) * 0.08), 0.05);
        m.pitch = lerp(m.pitch, m.ty * 0.12, 0.05);
        cY = Math.cos(m.yaw); sY = Math.sin(m.yaw); cX = Math.cos(m.pitch); sX = Math.sin(m.pitch);

        kk = (H * dpr) / data.h; // fixed scale: the final field must not zoom or drift off-screen
        cx = (W * dpr) / 2; cy = (H * dpr) / 2;
        halfW = (cx / kk) * 1.05; halfH = (cy / kk) * 1.05; // viewport size in cloud units
        const step = W < 700 ? 2 : 1;
        const fade = clamp(t / 1.2);
        const gA = 1; // the black dots never fade out: they stay as the final scattered field
        const lite = clamp(pt * LIGHT_AT); // 0 = figure (dark), 1 = scattered (light)
        const yw = data.h + 60 - ((Math.max(0, t - 2.6) * 150) % (data.h + 120));
        const R = 110 * dpr, push = 26 * dpr;
        let nf = 0;

        for (let i = 0; i < n; i += step) {
          const tt = clamp((t - DL[i]) / 1.5), e = 1 - Math.pow(1 - tt, 3), q = 1 - e;
          const loc = clamp((pt * 1.45 - DL2[i]) / 0.55), E = loc * loc * (3 - 2 * loc);
          proj(i, loc, q);
          if (tmp.per > 3) { pq[i] = -1; sk[i] = 0; continue; }
          let X2 = tmp.x, Y2 = tmp.y;
          const per = tmp.per, z2 = tmp.z;
          if (!reduce && push > 0.5) {
            const dx = X2 - m.x, dy = Y2 - m.y, d2 = dx * dx + dy * dy;
            if (d2 < R * R) {
              const d = Math.sqrt(d2) || 1, kq = (1 - d / R) ** 2 * push;
              X2 += (dx / d) * kq; Y2 += (dy / d) * kq;
            }
          }
          if (E > 0) { // settled dots keep a slow, tiny float so the field feels alive
            X2 += Math.sin(t * 0.35 + i * 1.3) * 7 * dpr * E;
            Y2 += Math.cos(t * 0.3 + i * 0.9) * 7 * dpr * E;
          }
          px[i] = X2; py[i] = Y2;
          if (loc > 0.02 && loc < 0.985 && (i & 1) === 0) { // trails only while a dot is travelling
            const lt = Math.max(0, loc - 0.11 * clamp((1 - loc) / 0.2));
            proj(i, lt, q);
            tx[i] = tmp.x; ty[i] = tmp.y; sk[i] = 1;
          } else sk[i] = 0;

          const band = Math.exp(-(((Y[i] - yw) / 26) ** 2)) * (1 - clamp(pt * 10));
          if (K[i] === 0) {
            const keep = DROP[i] ? 1 - clamp((loc - 0.55) / 0.4) : 1;
            pr[i] = Math.max(0.45 * dpr, (0.35 + (1.2 * S[i]) / 100) * kk * per * 1.1 * (1 + 0.7 * band)) * keep;
            pq[i] = keep < 0.05 ? -1 : clamp(((z2 + 90) / 200) * 4, 0, 3.99) | 0;
          } else {
            const b = S[i] / 100;
            const tw = 0.5 + 0.5 * Math.sin(t * (1.4 + hash(i) * 2.2) + i * 1.7);
            const a = (0.35 + 0.65 * b) * (0.3 + 0.7 * tw) * e * (1 - clamp((loc - 0.4) / 0.4)) + band * 0.5;
            pr[i] = (0.8 + 1.1 * b) * kk * per * (0.85 + 0.45 * tw) * (1 + band);
            pq[i] = a < 0.08 ? -1 : 10 + Math.min(2, (a * 3) | 0);
            if (b > 0.8 && tw > 0.75 && E < 0.2 && nf < 400) flares[nf++] = i;
          }
        }

        ctx.clearRect(0, 0, cv.width, cv.height);

        /* streaks (the time-travel trails) */
        if (pt > 0.01) {
          ctx.lineCap = "round";
          ctx.lineWidth = 0.9 * dpr;
          for (let pass = 0; pass < 2; pass++) {
            ctx.globalAlpha = (pass === 0 ? 0.3 : 0.45) * gA;
            ctx.strokeStyle = pass === 0 ? mixC(INK_D, INK_L, lite) : mixC("#8d8d96", "#d2d2d9", lite);
            ctx.beginPath();
            for (let i = 0; i < n; i += step) {
              if (!sk[i] || pq[i] === -1 || (K[i] === 0) !== (pass === 0)) continue;
              ctx.moveTo(tx[i], ty[i]); ctx.lineTo(px[i], py[i]);
            }
            ctx.stroke();
          }
        }

        for (let q = 0; q < 4; q++) {
          ctx.fillStyle = mixC(DARK[q], LIGHT[q], lite);
          ctx.globalAlpha = lerp(0.55 + 0.15 * q, 0.75 + 0.08 * q, lite) * fade * gA;
          ctx.beginPath();
          for (let i = 0; i < n; i += step) {
            if (K[i] !== 0 || pq[i] !== q) continue;
            ctx.moveTo(px[i] + pr[i], py[i]);
            ctx.arc(px[i], py[i], pr[i], 0, 6.2832);
          }
          ctx.fill();
        }
        for (let lv = 0; lv < 3; lv++) {
          ctx.globalAlpha = (0.45 + 0.27 * lv) * fade * gA;
          ctx.fillStyle = mixC("#8d8d96", "#cfcfd6", lite);
          ctx.beginPath();
          for (let i = 0; i < n; i += step) {
            if (K[i] !== 1 || pq[i] !== 10 + lv) continue;
            ctx.moveTo(px[i] + pr[i] + dpr * 0.8, py[i]);
            ctx.arc(px[i], py[i], pr[i] + dpr * 0.8, 0, 6.2832);
          }
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          for (let i = 0; i < n; i += step) {
            if (K[i] !== 1 || pq[i] !== 10 + lv) continue;
            ctx.moveTo(px[i] + pr[i], py[i]);
            ctx.arc(px[i], py[i], pr[i], 0, 6.2832);
          }
          ctx.fill();
        }
        if (nf) {
          ctx.globalAlpha = 0.5 * fade * gA;
          ctx.strokeStyle = mixC("#3a3a44", "#b8b8c1", lite);
          ctx.lineWidth = 0.7 * dpr;
          ctx.beginPath();
          for (let j = 0; j < nf; j++) {
            const i = flares[j], L = pr[i] * 5;
            ctx.moveTo(px[i] - L, py[i]); ctx.lineTo(px[i] + L, py[i]);
            ctx.moveTo(px[i], py[i] - L); ctx.lineTo(px[i], py[i] + L);
          }
          ctx.stroke();
        }

        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", fit);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        document.removeEventListener("pointerleave", onLeave);
      };
    }

    return () => { cancelled = true; stop(); };
  }, [containerRef]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="A human figure made of black dots and glitter"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
};

export default DotsBackground;