const resource = (name) => new URL(name, import.meta.url);
const MAX_CHARS = 1200;

async function jsonFile(name) {
  const response = await fetch(resource(name), { cache: "no-cache" });
  if (!response.ok) throw new Error("Demo assets unavailable");
  return response.json();
}

export async function mount(root) {
  if (!document.querySelector('link[data-hostel-demo]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = resource("hostel-demo.css");
    css.dataset.hostelDemo = "true";
    document.head.append(css);
  }
  root.textContent = "Loading the review explorer…";
  const [config, map, saved] = await Promise.all([
    jsonFile("hostel-demo-config.json"), jsonFile("hostel-demo-map.json"), jsonFile("hostel-demo-examples.json")
  ]);
  if (map.version !== saved.version) throw new Error("Demo asset versions differ");
  let apiBase = "";
  if (config.apiBase) {
    const url = new URL(config.apiBase);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
      throw new Error("Invalid API address");
    }
    apiBase = url.href.replace(/\/$/, "");
  }
  root.innerHTML = `
    <p class="demo-intro">Can a review reveal whether guests connect? ${apiBase ? "Try an example or write your own." : "Explore three example reviews below."}</p>
    <div class="demo-layout">
      <div>
        <form class="demo-form">
          <label for="hostel-review">Enter a hostel review</label>
          <textarea id="hostel-review" maxlength="${MAX_CHARS}" aria-describedby="review-help review-count demo-status" placeholder="The common area was packed every night and everyone went out together…" required></textarea>
          <div class="demo-meta"><span id="review-help">English · a few sentences</span><span id="review-count">0 / ${MAX_CHARS}</span></div>
          <button class="demo-submit" type="submit">Analyze review</button>
        </form>
        <div class="demo-examples"><span>Try:</span></div>
        <p id="demo-status" class="demo-status" role="status" aria-live="polite"></p>
        <section class="demo-result" aria-label="Model result" aria-live="polite" hidden>
          <div class="demo-score-row"><span>Social atmosphere signal</span><output class="demo-score"></output></div>
          <div class="demo-meter" aria-hidden="true"><div class="demo-fill"></div><span class="demo-threshold"></span></div>
          <div class="demo-scale"><span>Less social signal</span><span>More social signal</span></div>
          <p class="demo-interpretation"></p>
          <p class="demo-note demo-boundary"></p>
          <p class="demo-note">The percentage is the classifier’s social-class score. It is not a hostel rating or a calibrated likelihood of meeting people. A review can be positive without describing guest interaction.</p>
        </section>
        <p class="demo-note demo-privacy"></p>
      </div>
      <div>
        <p class="demo-map-title">Where the review sits</p>
        <svg class="demo-map" viewBox="0 0 432 320" role="img" aria-labelledby="review-map-title review-map-desc">
          <title id="review-map-title">Fine-tuned hostel review embeddings</title>
          <desc id="review-map-desc"></desc><g class="demo-points"></g><g class="demo-marker"></g>
        </svg>
        <div class="demo-legend"><span><i class="demo-key demo-key-social"></i>Social</span><span><i class="demo-key demo-key-other"></i>Non-social</span><span><i class="demo-key demo-key-review"></i>This review</span></div>
        <p class="demo-note demo-map-caption"></p>
        <p class="demo-note">Nearby dots have similar representations in this 2-D projection. Classification uses the full embedding; this map does not show a decision boundary.</p>
      </div>
    </div>`;
  const get = (s) => root.querySelector(s);
  const input = get("textarea"), submit = get(".demo-submit"), result = get(".demo-result"), status = get(".demo-status");
  const description = `${map.points.length.toLocaleString()} labeled review embeddings, with gold social points and blue non-social points.`;
  get("#review-map-desc").textContent = description;
  get(".demo-map-caption").textContent = `${map.points.length.toLocaleString()} reference dots sampled from ${map.referenceCount.toLocaleString()} human-labeled reviews. The map stays fixed as you explore.`;
  get(".demo-privacy").textContent = apiBase
    ? "When you select Analyze review, your text is sent to the demo server for scoring. Avoid entering personal information."
    : "Live text analysis is not connected yet. The examples show saved outputs from the actual model.";
  const ns = "http://www.w3.org/2000/svg";
  const svg = (tag, attributes) => {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  };
  const [x0, x1, y0, y1] = map.bounds;
  const position = ([x, y]) => [24 + (x - x0) / (x1 - x0) * 384, 296 - (y - y0) / (y1 - y0) * 272];
  const fragment = document.createDocumentFragment();
  for (const [x, y, label] of map.points) {
    const [cx, cy] = position([x, y]);
    fragment.append(svg("circle", { cx, cy, r: 2.1, class: label ? "social-point" : "other-point" }));
  }
  get(".demo-points").append(fragment);
  let requestId = 0, controller;
  function reset() {
    requestId += 1;
    controller?.abort();
    submit.disabled = !apiBase;
    submit.textContent = "Analyze review";
    root.removeAttribute("aria-busy");
    result.hidden = true;
    get(".demo-marker").replaceChildren();
    status.textContent = "";
    get("#review-count").textContent = `${input.value.length} / ${MAX_CHARS}`;
    for (const button of get(".demo-examples").querySelectorAll("button")) button.setAttribute("aria-pressed", "false");
  }
  function show(data) {
    if (data.version !== map.version || !Number.isFinite(data.probability) || data.probability < 0 || data.probability > 1 || !Number.isFinite(data.threshold) || data.threshold <= 0 || data.threshold >= 1 || !Array.isArray(data.point) || data.point.length !== 2 || !data.point.every(Number.isFinite)) {
      throw new Error("The demo was updated. Reload this page and try again.");
    }
    const score = data.probability * 100;
    get(".demo-score").textContent = score > 99.9 ? ">99.9%" : score < .1 ? "<0.1%" : `${score.toFixed(1)}%`;
    get(".demo-fill").style.width = `${score}%`;
    get(".demo-threshold").style.left = `${data.threshold * 100}%`;
    get(".demo-boundary").textContent = `The marker shows the saved classification threshold (${(data.threshold * 100).toFixed(1)}%).`;
    const above = data.probability >= data.threshold;
    get(".demo-interpretation").textContent = Math.abs(data.probability - data.threshold) < .1
      ? `Close to the threshold · classified ${above ? "social" : "non-social"}`
      : above ? "Social signal · language associated with guest interaction" : "Little social signal · guest interaction is not clearly described";
    const [cx, cy] = position(data.point);
    const marker = get(".demo-marker");
    marker.replaceChildren();
    if (cx < 10 || cx > 422 || cy < 10 || cy > 310) {
      get("#review-map-desc").textContent = `${description} This review projects outside the displayed area.`;
      status.textContent = "This review falls outside the displayed map. Its score is still shown.";
    } else {
      marker.append(svg("circle", {cx, cy, r: 10, class: "review-ring"}));
      marker.append(svg("path", { d: `M ${cx} ${cy - 6} l 6 6 -6 6 -6 -6 Z`, class: "review-point" }));
      get("#review-map-desc").textContent = `${description} The diamond marks this review, classified ${above ? "social" : "non-social"}.`;
    }
    result.hidden = false;
  }
  for (const example of saved.examples) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "demo-example";
    button.textContent = example.label;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      input.value = example.text;
      reset();
      button.setAttribute("aria-pressed", "true");
      status.textContent = "Saved model output for this example." + (apiBase ? " Edit the text to try a new review." : "");
      show(example.result);
    });
    get(".demo-examples").append(button);
  }
  input.addEventListener("input", reset);
  get("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    reset();
    const text = input.value.trim();
    if (!apiBase) { status.textContent = "Live text analysis is not connected yet. Choose a saved example below."; return; }
    if (text.length < 10 || text.length > MAX_CHARS) { status.textContent = "Enter a review of 10–1,200 characters."; return; }
    const current = requestId;
    controller = new AbortController();
    const requestController = controller;
    const timer = setTimeout(() => requestController.abort(), 90000);
    const coldStart = setTimeout(() => { if (current === requestId) status.textContent = "The model may be waking up. The first request can take a little longer…"; }, 5000);
    submit.disabled = true;
    submit.textContent = "Analyzing…";
    root.setAttribute("aria-busy", "true");
    status.textContent = "Reading the review…";
    try {
      const response = await fetch(`${apiBase}/v1/classify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }), signal: requestController.signal, credentials: "omit", cache: "no-store"
      });
      if (current !== requestId) return;
      if (response.status === 429) throw new Error("The demo is busy. Please wait a minute and try again.");
      if (response.status === 422 || response.status === 413) throw new Error("Please use a shorter review: a few sentences, up to 1,200 characters.");
      if (!response.ok) throw new Error("The model is temporarily unavailable. Please try again shortly.");
      const data = await response.json();
      if (current !== requestId) return;
      status.textContent = "Analysis complete.";
      show(data);
    } catch (error) {
      if (current !== requestId) return;
      status.textContent = error.name === "AbortError" ? "The model took too long to respond. Please try again." : error instanceof TypeError ? "Could not reach the model. Check your connection and try again." : error.message;
    } finally {
      clearTimeout(timer); clearTimeout(coldStart);
      if (current === requestId) { submit.disabled = false; submit.textContent = "Analyze review"; root.removeAttribute("aria-busy"); }
    }
  });
  reset();
}
