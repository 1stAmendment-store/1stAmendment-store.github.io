// Screenshot viewer for the app cards. Each Preview button lists its images in
// data-images (comma-separated paths) and their captions in data-captions
// ("|"-separated). Images load only when a preview is opened.
(() => {
  const buttons = document.querySelectorAll("[data-images]");
  if (!buttons.length) return;

  const dlg = document.createElement("dialog");
  dlg.className = "viewer";
  dlg.setAttribute("aria-label", "App screenshots");
  dlg.innerHTML = `
    <div class="viewer-top">
      <span class="viewer-title"></span>
      <span class="viewer-count"></span>
      <button class="viewer-close" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="viewer-stage">
      <button class="viewer-nav prev" type="button" aria-label="Previous screenshot">&#8249;</button>
      <img class="viewer-img" alt="">
      <button class="viewer-nav next" type="button" aria-label="Next screenshot">&#8250;</button>
    </div>
    <p class="viewer-caption"></p>
    <div class="viewer-dots"></div>`;
  document.body.append(dlg);

  const img = dlg.querySelector(".viewer-img");
  const title = dlg.querySelector(".viewer-title");
  const count = dlg.querySelector(".viewer-count");
  const caption = dlg.querySelector(".viewer-caption");
  const dots = dlg.querySelector(".viewer-dots");
  let shots = [], captions = [], index = 0;

  function show(i) {
    index = (i + shots.length) % shots.length;
    img.src = shots[index];
    img.alt = captions[index] || title.textContent + " screenshot " + (index + 1);
    caption.textContent = captions[index] || "";
    count.textContent = (index + 1) + " / " + shots.length;
    [...dots.children].forEach((d, n) => d.setAttribute("aria-current", n === index));
    // Warm the next image so stepping through feels instant.
    new Image().src = shots[(index + 1) % shots.length];
  }

  function open(btn) {
    shots = btn.dataset.images.split(",").map(s => s.trim());
    captions = (btn.dataset.captions || "").split("|").map(s => s.trim());
    title.textContent = btn.dataset.title || "";
    dots.innerHTML = "";
    shots.forEach((_, n) => {
      const d = document.createElement("button");
      d.type = "button";
      d.setAttribute("aria-label", "Screenshot " + (n + 1));
      d.addEventListener("click", () => show(n));
      dots.append(d);
    });
    const single = shots.length < 2;
    dlg.querySelectorAll(".viewer-nav").forEach(b => b.hidden = single);
    dots.hidden = single;
    show(0);
    if (!dlg.open) dlg.showModal();
  }

  buttons.forEach(b => b.addEventListener("click", () => open(b)));
  dlg.querySelector(".viewer-close").addEventListener("click", () => dlg.close());
  dlg.querySelector(".prev").addEventListener("click", () => show(index - 1));
  dlg.querySelector(".next").addEventListener("click", () => show(index + 1));

  // Click on the dark backdrop (outside the content) closes it.
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

  dlg.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
  });

  // Swipe left / right on touch screens.
  let x0 = null;
  img.addEventListener("pointerdown", e => { x0 = e.clientX; });
  img.addEventListener("pointerup", e => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
  });
  img.addEventListener("dragstart", e => e.preventDefault());
})();
