# Armenia yield explorer

The map replaces the static Armenia figure after it loads successfully. The
original figure remains a fallback if the module or JSON cannot be fetched.
There is no server, user submission, model refit, or external map request.

## Research data

- Posterior medians and equal-tailed 80% credible intervals are transcribed from
  Appendix C of the working paper already linked on this website:
  `files/McMurry_2026_Rental_Yields_Armenia.pdf`.
- The standardized profile is 60 m², two rooms, Major renovation, With furniture.
- Raw ratios and counts are calculated from the original research SQLite
  database using the notebook's exact cleaning rules. The resulting counts match
  the paper: 3,844 rentals + 5,019 sales = 8,863 listings in 36 locations.
- Raw yield (%) = 1,200 × median(monthly advertised rent) / median(advertised sale price).
- No listing records, listing identifiers, addresses, or private source files are
  included. The public JSON contains only aggregate results and map geometry.
- The saved notebook contained code but no posterior draws or executed outputs.
  The plot therefore displays the published median and credible interval. It
  deliberately does not infer or fabricate a smooth posterior density.

## Geographic interpretation

The model's locations are towns and Yerevan administrative districts; they are
not province-level model estimates. The region choropleth is a navigation and
overview layer. Its color is the **unweighted median of the published posterior
medians of modeled locations in that region**. It is not a province posterior,
a population-weighted regional yield, or a spatial extrapolation. Each region's
card opens the actual location-level estimates and lets readers choose other
modeled locations within the region. This distinction is stated beneath the map.

## Boundaries and license

- Provider: geoBoundaries, Government of Armenia, OCHA ROCCA.
- Metadata: https://www.geoboundaries.org/api/current/gbOpen/ARM/ADM1/
- Boundary ID: ARM-ADM1-6114869; year represented: 2020.
- Data: https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/ARM/ADM1/geoBoundaries-ARM-ADM1.geojson
- License: Creative Commons Attribution 3.0 Intergovernmental Organisations
  (CC BY 3.0 IGO), https://creativecommons.org/licenses/by/3.0/igo/
- Modifications: projected to an equirectangular display centered at 40°N;
  coordinates rounded to 0.1 display unit. Attribution remains visible in the UI.

## Regeneration

Run `build-armenia-data.py` with the original paper TeX, research database, and
downloaded boundaries. The script validates the original sample size before
writing the static asset. Keep those source files outside the website repository.

```sh
python3 scripts/build-armenia-data.py \
  --paper /path/to/armenia_rental_yields.tex \
  --database /path/to/rental_yields.db \
  --boundaries /path/to/geoBoundaries-ARM-ADM1.geojson \
  --output assets/armenia-yields.json
```
