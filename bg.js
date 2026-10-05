// Animated wallpaper: a diagonal lattice of light bars with water-like waves
// of light rolling across it. Bars on a wave crest glow brighter and grow.
(() => {
  const canvas = document.createElement("canvas");
  canvas.id = "bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const EDGE = 86;          // node-to-node distance in px
  const GAP = 13;           // empty space around each node
  const GROW = 0.14;        // how much a fully lit bar lengthens
  const BG = "#060b16";

  let W = 0, H = 0, bars = [];
  const ripples = [];       // pointer ripples: {x, y, t0}

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Nodes sit on a checkerboard of step d; each node sends one bar down-right
    // ("\") and one up-right ("/"), which tiles the whole diamond lattice.
    const d = EDGE / Math.SQRT2;
    const cols = Math.ceil(W / d) + 2;
    const rows = Math.ceil(H / d) + 2;
    const old = new Map(bars.map(b => [b.key, b.v]));
    bars = [];
    for (let i = -1; i < cols; i++) {
      for (let j = -1; j < rows; j++) {
        if ((i + j) & 1) continue;
        const x = i * d, y = j * d;
        for (const dir of [1, -1]) {
          const key = i + "," + j + "," + dir;
          bars.push({ key, x: x + d / 2, y: y + dir * d / 2, dir, v: old.get(key) || 0 });
        }
      }
    }
  }

  // Brightness field, 0..1. Two crossing swells plus a slowly drifting
  // radial ripple make the interference pattern read as moving water.
  function field(x, y, t) {
    const a = 0.6 + 0.4 * Math.sin(t * 0.07);                 // swell direction drifts
    const w1 = Math.sin((x * Math.cos(a) + y * Math.sin(a)) * 0.0095 - t * 1.25);
    const w2 = Math.sin((x * Math.cos(a + 2.1) + y * Math.sin(a + 2.1)) * 0.0065 - t * 0.85);
    const cx = W * (0.5 + 0.3 * Math.sin(t * 0.11));
    const cy = H * (0.5 + 0.3 * Math.cos(t * 0.083));
    const r = Math.hypot(x - cx, y - cy);
    const w3 = Math.sin(r * 0.012 - t * 1.7);
    let v = (0.4 * w1 + 0.3 * w2 + 0.3 * w3);
    v = Math.max(0, v) ** 1.8 * 2.6;                          // only crests light up

    for (const p of ripples) {
      const age = t - p.t0;
      const R = age * 340;
      const ring = Math.exp(-(((Math.hypot(x - p.x, y - p.y) - R) / 45) ** 2));
      v += ring * Math.exp(-age * 1.1);
    }
    return Math.min(1, v);
  }

  function draw(t, ease) {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.lineCap = "round";

    const half = EDGE / 2 - GAP;
    const k = half / Math.SQRT2;          // half length projected on each axis

    // Unlit lattice in one pass.
    ctx.beginPath();
    for (const b of bars) {
      b.v += (field(b.x, b.y, t) - b.v) * ease;
      ctx.moveTo(b.x - k, b.y - b.dir * k);
      ctx.lineTo(b.x + k, b.y + b.dir * k);
    }
    ctx.strokeStyle = "rgba(64, 86, 128, 0.32)";
    ctx.lineWidth = 7;
    ctx.stroke();

    // Lit bars, additive so overlapping glow blooms.
    ctx.globalCompositeOperation = "lighter";
    for (const b of bars) {
      const p = b.v;
      if (p < 0.03) continue;
      const s = k * (1 + GROW * p);
      const x0 = b.x - s, y0 = b.y - b.dir * s;
      const x1 = b.x + s, y1 = b.y + b.dir * s;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);

      ctx.strokeStyle = `rgba(60, 130, 255, ${0.16 * p})`;    // outer bloom
      ctx.lineWidth = 22 + 10 * p;
      ctx.stroke();
      ctx.strokeStyle = `rgba(110, 175, 255, ${0.35 * p})`;   // inner glow
      ctx.lineWidth = 11 + 4 * p;
      ctx.stroke();
      ctx.strokeStyle = `rgba(215, 238, 255, ${0.9 * p})`;    // white-hot core
      ctx.lineWidth = 6 + 2 * p;
      ctx.stroke();
    }

    while (ripples.length && t - ripples[0].t0 > 4) ripples.shift();
  }

  let start = performance.now();
  function frame(now) {
    draw((now - start) / 1000, 0.18);
    requestAnimationFrame(frame);
  }

  let lastRipple = 0;
  function addRipple(x, y, force) {
    const now = performance.now();
    if (!force && now - lastRipple < 450) return;
    lastRipple = now;
    ripples.push({ x, y, t0: (now - start) / 1000 });
    if (ripples.length > 8) ripples.shift();
  }

  let resizeTimer;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { build(); if (reduceMotion.matches) draw(8, 1); }, 120);
  });

  build();
  if (reduceMotion.matches) {
    draw(8, 1);                            // one still frame, no animation
  } else {
    addEventListener("pointermove", e => addRipple(e.clientX, e.clientY, false), { passive: true });
    addEventListener("pointerdown", e => addRipple(e.clientX, e.clientY, true), { passive: true });
    requestAnimationFrame(frame);
  }
})();
