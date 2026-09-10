# Armenia yield explorer

The map replaces the static Armenia figure after it loads successfully. The
original figure remains a fallback if the module or JSON cannot be fetched.
The browser makes no server inference, user submission, model refit, or external map request.

## Research data

- Posterior medians, equal-tailed 80%/95% intervals and smoothed density curves
  come from the 2026-09-10 Colab refit of the original Model 2 using the original
  analytic sample. Each location has 4,000 paired MCMC draws (four chains).
- Appendix C values from `files/McMurry_2026_Rental_Yields_Armenia.pdf` are
  preserved separately as `publishedReference`; they are not substituted into
  the new curves. The maximum median difference from the paper is 0.031
  percentage points.
- The standardized profile is 60 m², two rooms, Major renovation, With furniture.
- Raw ratios and counts are calculated from the original research SQLite
  database using the notebook's exact cleaning rules. The resulting counts match
  the paper: 3,844 rentals + 5,019 sales = 8,863 listings in 36 locations.
- Raw yield (%) = 1,200 × median(monthly advertised rent) / median(advertised sale price).
- No listing records, listing identifiers, addresses, or private source files are
  included. The public JSON contains only aggregate results and map geometry.
- Densities are Gaussian KDEs fitted to log-yield draws and transformed back
  with the 1/x Jacobian. Quantiles come directly from the draws. Every curve
  integrates to approximately one; axes adapt to each location.
- The initial version used published quantiles alone. The retained interval
  renderer supports that older data format, and the original figure is the
  loading-error fallback.

## Geographic interpretation

The model's locations are towns and Yerevan administrative districts; they are
not province-level model estimates. The region choropleth is a navigation and
overview layer. Its color is the **unweighted median of the refitted posterior
medians of modeled locations in that region**. It is not a province posterior,
a population-weighted regional yield, or a spatial extrapolation. Each region's
card opens the actual location-level estimates and lets readers choose other
modeled locations within the region. This distinction is stated beneath the map.

## Boundaries and license

- Provider: geoBoundaries, Government of Armenia, OCHA ROCCA.
- Metadata: https://www.geoboundaries.org/api/current/gbOpen/ARM/ADM1/
- Boundary ID: ARM-ADM1-6114869; year represented: 2005.
- Data: https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/ARM/ADM1/geoBoundaries-ARM-ADM1.geojson
- License: Creative Commons Attribution 3.0 Intergovernmental Organisations
  (CC BY 3.0 IGO), https://creativecommons.org/licenses/by/3.0/igo/
- Modifications: projected to an equirectangular display centered at 40°N;
  coordinates rounded to 0.1 display unit. Attribution remains visible in the UI.

## Regeneration

Run `build-armenia-data.py` with the original paper TeX, research database, and
downloaded boundaries. The script validates the original sample size before
writing the static asset. With `--posterior`, it validates the exported locations,
profile, raw benchmarks, counts and density integrals before merging the new fit.
Keep those source files outside the website repository.

```sh
python3 scripts/build-armenia-data.py \
  --paper /path/to/armenia_rental_yields.tex \
  --database /path/to/rental_yields.db \
  --boundaries /path/to/geoBoundaries-ARM-ADM1.geojson \
  --posterior /path/to/armenia-posterior-curves.json \
  --output assets/armenia-yields.json
```

## Diagnostic review of the 2026-09-10 export

The automatic **review** flag is preserved in `posteriorExport.diagnostics`.
It was triggered by two population-level log-price means: `mu_alpha[rent]`
(R-hat 1.0328, bulk ESS 205.4) and `mu_alpha[price]` (R-hat 1.0311).
The full parameter posterior should not be described as having passed all
convergence screens. Longer sampling remains appropriate before treating this
refit as a new final inferential analysis.

The specific quantities displayed by this visualization have stronger diagnostics:

- Zero divergent transitions in 4,000 retained draws.
- Maximum location-yield R-hat: 1.00234.
- Minimum location-yield bulk ESS: 2,148.7; minimum tail ESS: 2,421.6.
- Largest range of the four chain medians for any location: 0.0405 percentage points.
- Largest chain-median range as a fraction of that location's 80% interval width: 5.7%.
- All displayed medians and intervals verified against the saved paired MCMC draws;
  source database SHA-256 also matches the original database.

These checks support the limited use of the location-yield curves as a research
visualization. They do not establish convergence of the full joint posterior or
turn a passing univariate diagnostic into a guarantee of unbiased inference.
See https://mc-stan.org/learn-stan/diagnostics-warnings.html for diagnostic guidance.
