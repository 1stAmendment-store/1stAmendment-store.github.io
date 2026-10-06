// Animated wallpaper: a diagonal lattice of light bars with water-like waves
// of light rolling slowly across it. Bars on a wave crest glow brighter and grow.
// The same gentle animation runs for every visitor, including those who ask
// their system for reduced motion, so it is kept slow and soft on purpose.
// The canvas is fixed to the viewport, so the wallpaper stays put while the
// page content scrolls over it.
(() => {
  const canvas = document.createElement("canvas");
  canvas.id = "bg";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");

  const EDGE = 86;          // node-to-node distance in px
  const GAP = 13;           // empty space around each node
  const GROW = 0.14;        // how much a fully lit bar lengthens
  const WAVE_SPEED = 0.35;  // 1 = original pace; lower is slower
  const BG = "#060b16";
  const D = EDGE / Math.SQRT2;              // lattice step on each axis

  let W = 0, H = 0;
  const state = new Map();  // per-bar brightness, keyed by lattice position
  let frameNo = 0;

  // Match the bitmap to the canvas's CSS box (100lvh tall, see style.css). That box
  // stays the same size when a phone's address bar slides in or out, so scrolling
  // never triggers a redraw at a new size or a stretched frame.
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = canvas.getBoundingClientRect();
    const w = Math.round(box.width), h = Math.round(box.height);
    if (w === W && h === H) return;
    W = w;
    H = h;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Brightness field in screen coordinates, 0..1. Two crossing swells plus a
  // slowly drifting radial ripple make the interference read as moving water.
  function field(x, y, t) {
    const tw = t * WAVE_SPEED;
    const a = 0.6 + 0.4 * Math.sin(tw * 0.07);                // swell direction drifts
    const w1 = Math.sin((x * Math.cos(a) + y * Math.sin(a)) * 0.0095 - tw * 1.25);
    const w2 = Math.sin((x * Math.cos(a + 2.1) + y * Math.sin(a + 2.1)) * 0.0065 - tw * 0.85);
    const cx = W * (0.5 + 0.3 * Math.sin(tw * 0.11));
    const cy = H * (0.5 + 0.3 * Math.cos(tw * 0.083));
    const r = Math.hypot(x - cx, y - cy);
    const w3 = Math.sin(r * 0.012 - tw * 1.7);
    let v = (0.4 * w1 + 0.3 * w2 + 0.3 * w3);
    v = Math.max(0, v) ** 1.8 * 2.2;                          // only crests light up
    return Math.min(1, v);
  }

  function draw(t, ease) {
    frameNo++;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.lineCap = "round";

    const k = (EDGE / 2 - GAP) / Math.SQRT2;  // half bar length on each axis

    // Nodes sit on a checkerboard of
    // step D; each sends one bar down-right and one up-right.
    const j0 = -1;
    const j1 = Math.ceil(H / D) + 1;
    const cols = Math.ceil(W / D) + 1;
    const visible = [];

    ctx.beginPath();
    for (let j = j0; j <= j1; j++) {
      for (let i = -1; i <= cols; i++) {
        if ((i + j) & 1) continue;
        for (const dir of [1, -1]) {
          const px = i * D + D / 2;             // bar midpoint
          const y = j * D + dir * D / 2;
          const key = (j * 2 + (dir > 0 ? 1 : 0)) * 4096 + i + 1;
          let s = state.get(key);
          if (!s) { s = { v: 0, f: 0 }; state.set(key, s); }
          s.v += (field(px, y, t) - s.v) * ease;
          s.f = frameNo;

          ctx.moveTo(px - k, y - dir * k);
          ctx.lineTo(px + k, y + dir * k);
          if (s.v >= 0.03) visible.push(px, y, dir, s.v);
        }
      }
    }
    ctx.strokeStyle = "rgba(64, 86, 128, 0.32)";
    ctx.lineWidth = 7;
    ctx.stroke();

    // Lit bars, additive so neighbouring glows blend.
    ctx.globalCompositeOperation = "lighter";
    for (let n = 0; n < visible.length; n += 4) {
      const x = visible[n], y = visible[n + 1], dir = visible[n + 2], p = visible[n + 3];
      const s = k * (1 + GROW * p);
      ctx.beginPath();
      ctx.moveTo(x - s, y - dir * s);
      ctx.lineTo(x + s, y + dir * s);
      ctx.strokeStyle = `rgba(110, 175, 255, ${0.35 * p})`;   // glow
      ctx.lineWidth = 11 + 4 * p;
      ctx.stroke();
      ctx.strokeStyle = `rgba(215, 238, 255, ${0.9 * p})`;    // white-hot core
      ctx.lineWidth = 6 + 2 * p;
      ctx.stroke();
    }

    // Forget bars left over from a larger window size.
    if (frameNo % 120 === 0) {
      for (const [key, s] of state) if (frameNo - s.f > 120) state.delete(key);
    }
  }

  const start = performance.now();
  const now = () => (performance.now() - start) / 1000;

  function frame() {
    draw(now(), 0.18);
    requestAnimationFrame(frame);
  }

  addEventListener("resize", resize);        // immediate, so a resized box is never shown stretched

  resize();
  draw(0, 1);                                // paint immediately, before the first animation tick
  requestAnimationFrame(frame);
})();
