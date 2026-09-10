const DATA_URL = new URL('./armenia-yields.json', import.meta.url);
const percent = value => Number(value).toFixed(2);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

function color(value) {
  const t = Math.max(0, Math.min(1, (value - 5) / 4));
  return `rgb(${[219,232,240].map((v, i) => Math.round(v + ([23,70,99][i] - v) * t)).join(',')})`;
}

function posteriorPlot(location) {
  // Common x axis makes uncertainty and composition adjustment comparable.
  // Display the published quantiles, without inventing a density from three points.
  const x = value => 16 + (value - 3) / 9 * 248;
  const low = x(location.lower80), high = x(location.upper80), median = x(location.median);
  const raw = x(location.raw);
  return `<svg class="armenia-plot" viewBox="0 0 280 148" role="img" aria-label="${escape(location.name)}: posterior median ${percent(location.median)} percent; 80 percent credible interval ${percent(location.lower80)} to ${percent(location.upper80)} percent; raw ratio ${percent(location.raw)} percent.">
    <rect class="interval-band" x="${low}" y="20" width="${high-low}" height="55" rx="3"/>
    <text x="16" y="13">Posterior median + 80% interval</text>
    <line class="posterior" x1="${low}" x2="${high}" y1="40" y2="40" stroke-width="3"/>
    <line class="posterior" x1="${low}" x2="${low}" y1="33" y2="47"/>
    <line class="posterior" x1="${high}" x2="${high}" y1="33" y2="47"/>
    <line x1="${median}" x2="${raw}" y1="40" y2="70" stroke="var(--ink-3)" stroke-dasharray="3 3"/>
    <circle class="posterior" cx="${median}" cy="40" r="5"/>
    <circle class="raw" cx="${raw}" cy="70" r="5"/>
    <line class="axis" x1="16" x2="264" y1="94" y2="94"/>
    ${[3,6,9,12].map(t => `<line class="axis" x1="${x(t)}" x2="${x(t)}" y1="94" y2="99"/><text x="${x(t)}" y="115" text-anchor="middle">${t}%</text>`).join('')}
    <text x="140" y="138" text-anchor="middle">Annual gross rental yield</text>
  </svg>`;
}

export async function mount(container) {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error('Yield data could not be loaded');
  const data = await response.json();
  if (data.locations.length !== 36 || data.regions.length !== 11) throw new Error('Incomplete yield data');
  const regionById = new Map(data.regions.map(r => [r.id, r]));
  const locationByName = new Map(data.locations.map(l => [l.name, l]));
  let selectedRegion = 'vayots_dzor';
  let lastTrigger = null;
  const lastLocation = new Map();
  // Keep the original figure intact until the complete replacement is ready.
  const figure = document.createElement('figure');
  figure.className = 'fig';
  figure.innerHTML = `<div class="armenia-explorer" aria-label="Armenia rental yield explorer">
    <div class="armenia-top"><div><h4>Rental yields across Armenia</h4><p>Select a region to explore its locations.</p></div>
      <label class="armenia-region-picker">Region<select aria-label="Select a region">${data.regions.map(r => `<option value="${escape(r.id)}">${escape(r.name)}</option>`).join('')}</select></label>
    </div>
    <div class="armenia-stage">
      <svg class="armenia-geography" viewBox="0 0 560 570" role="group" aria-label="Map of Armenia. Select a region for local rental yield estimates.">
        <text class="armenia-country-label" x="160" y="26">GEORGIA</text>
        <text class="armenia-country-label" x="25" y="340" transform="rotate(-65 25 340)">TURKEY</text>
        ${data.regions.map(r => `<path class="armenia-region" data-region="${escape(r.id)}" d="${r.path}" fill="${color(r.overviewMedian)}" fill-rule="evenodd" tabindex="0" role="button" aria-pressed="false" aria-label="${escape(r.name)}: ${r.locationCount} modeled ${r.locationCount === 1 ? 'location' : 'locations'}; overview ${percent(r.overviewMedian)} percent"><title>${escape(r.name)} · ${percent(r.overviewMedian)}% · ${r.locationCount} modeled ${r.locationCount === 1 ? 'location' : 'locations'}</title></path>`).join('')}
        ${data.regions.map(r => `${r.callout ? `<path class="armenia-callout" d="${r.callout}"/>` : ''}<text class="armenia-map-label${r.id === 'yerevan' ? ' small' : ''}" x="${r.label[0]}" y="${r.label[1]}">${escape(r.name)}</text>`).join('')}
      </svg>
      <p class="armenia-empty" hidden>Select a region to see how its locations compare after adjusting for the housing mix.</p>
      <section class="armenia-card" aria-label="Selected location details">
        <button class="armenia-card-close" type="button" aria-label="Close location details">×</button>
        <p class="armenia-card-region"></p><h5></h5>
        <label class="armenia-location-picker"><span>Location</span><select aria-label="Select a location in this region"></select></label>
        <div class="armenia-result"></div>
      </section>
    </div>
    <div class="armenia-bottom"><div class="armenia-legend"><div class="armenia-legend-label">Modeled yield · regional overview</div><div class="armenia-legend-bar"></div><div class="armenia-legend-values"><span>5%</span><span>7%</span><span>9%</span></div></div>
      <p class="armenia-map-note">Region colors summarize the median of modeled location estimates, not a province-wide posterior. Cards show individual towns or Yerevan districts. Boundaries: <a href="https://www.geoboundaries.org/" target="_blank" rel="noopener noreferrer">geoBoundaries</a> / Government of Armenia, OCHA ROCCA (<a href="https://creativecommons.org/licenses/by/3.0/igo/" target="_blank" rel="noopener noreferrer">CC BY 3.0 IGO</a>); simplified 2020 boundaries.</p>
    </div><p class="armenia-sr-only" role="status" aria-live="polite"></p>
  </div><figcaption><strong>Same apartment, different markets.</strong> Published posterior medians and 80% credible intervals for a 60 m², two-room apartment with major renovation and furniture. Raw ratios compare median advertised rents and sale prices without composition adjustment. May 2026 listings; gross yields before expenses.</figcaption>`;
  const explorer = figure.querySelector('.armenia-explorer');
  const regionPicker = figure.querySelector('.armenia-region-picker select');
  const locationPicker = figure.querySelector('.armenia-location-picker select');
  const card = figure.querySelector('.armenia-card');
  const result = figure.querySelector('.armenia-result');
  const status = figure.querySelector('[role="status"]');

  function showLocation(name, announce = true) {
    const location = locationByName.get(name);
    if (!location || location.region !== selectedRegion) return;
    lastLocation.set(selectedRegion, name);
    const region = regionById.get(selectedRegion);
    figure.querySelector('.armenia-card-region').textContent = region.name + (selectedRegion === 'yerevan' ? ' · administrative district' : ' · modeled location');
    figure.querySelector('.armenia-card h5').textContent = name;
    locationPicker.value = name;
    const difference = location.median - location.raw;
    result.innerHTML = `<p class="armenia-number">${percent(location.median)}<small>%</small></p>
      <p class="armenia-number-label">Posterior median · annual gross yield</p>
      <p class="armenia-interval"><strong>${percent(location.lower80)}–${percent(location.upper80)}%</strong> · 80% credible interval</p>
      ${posteriorPlot(location)}
      <div class="armenia-plot-key"><span>Model estimate</span><span>Raw ratio</span></div>
      <p class="armenia-comparison">Raw ratio <strong>${percent(location.raw)}%</strong><br>After adjustment: <strong>${difference >= 0 ? '+' : '−'}${percent(Math.abs(difference))} percentage points</strong></p>
      <dl class="armenia-counts"><div><dt>Rent listings</dt><dd>${location.rentCount.toLocaleString('en-US')}</dd></div><div><dt>Sale listings</dt><dd>${location.saleCount.toLocaleString('en-US')}</dd></div></dl>`;
    if (announce) status.textContent = `${name}: ${percent(location.median)} percent; 80 percent credible interval ${percent(location.lower80)} to ${percent(location.upper80)} percent.`;
  }

  function showRegion(id, trigger, announce = true) {
    if (!regionById.has(id)) return;
    selectedRegion = id;
    lastTrigger = trigger || regionPicker;
    regionPicker.value = id;
    figure.querySelectorAll('[data-region]').forEach(path => path.setAttribute('aria-pressed', String(path.dataset.region === id)));
    const locations = data.locations.filter(l => l.region === id).sort((a, b) => a.name.localeCompare(b.name));
    locationPicker.innerHTML = locations.map(l => `<option value="${escape(l.name)}">${escape(l.name)}</option>`).join('');
    figure.querySelector('.armenia-location-picker').hidden = locations.length === 1;
    card.hidden = false;
    figure.querySelector('.armenia-empty').hidden = true;
    const initial = lastLocation.get(id) || (id === 'yerevan' ? 'Kentron' : locations[0].name);
    showLocation(initial, announce);
    if (announce && card.isConnected && window.matchMedia('(max-width: 800px)').matches) {
      card.scrollIntoView({block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    }
  }

  function closeCard() {
    card.hidden = true;
    figure.querySelector('.armenia-empty').hidden = false;
    figure.querySelectorAll('[data-region]').forEach(path => path.setAttribute('aria-pressed', 'false'));
    status.textContent = 'Location details closed.';
    if (lastTrigger) lastTrigger.focus();
  }

  figure.querySelectorAll('[data-region]').forEach(path => {
    path.addEventListener('click', () => showRegion(path.dataset.region, path));
    path.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); showRegion(path.dataset.region, path);
      }
    });
  });
  regionPicker.addEventListener('change', () => showRegion(regionPicker.value, regionPicker));
  locationPicker.addEventListener('change', () => showLocation(locationPicker.value));
  figure.querySelector('.armenia-card-close').addEventListener('click', closeCard);
  explorer.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !card.hidden) { event.preventDefault(); closeCard(); }
  });
  showRegion(selectedRegion, null, false);
  container.replaceChildren(figure);
}
