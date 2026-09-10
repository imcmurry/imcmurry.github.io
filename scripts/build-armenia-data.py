"""Build the static map from the research paper, its SQLite data, and geoBoundaries.

Usage: python3 scripts/build-armenia-data.py --paper paper.tex --database rental_yields.db
       --boundaries geoBoundaries-ARM-ADM1.geojson --output assets/armenia-yields.json

No listing records or model draws are included in the output. The paper's reported
quantiles remain authoritative; a smooth density cannot be recovered from them.
"""
import argparse
import json
import math
import re
import sqlite3
import statistics
from pathlib import Path


def project(point):
    lon, lat = point[:2]
    return (lon * math.cos(math.radians(40)), -lat)


def rings(geometry):
    polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
    return [ring for polygon in polygons for ring in polygon]


def centroid(ring):
    twice_area = xsum = ysum = 0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        cross = x1*y2 - x2*y1
        twice_area += cross
        xsum += (x1+x2)*cross
        ysum += (y1+y2)*cross
    return xsum/(3*twice_area), ysum/(3*twice_area)


def build(paper, database, boundaries):
    text = Path(paper).read_text().split('Location & Median & 10')[1]
    published = re.findall(r'\n([A-Za-z -]+) & ([\d.]+) & ([\d.]+) & ([\d.]+)', text)
    assert len(published) == 36, 'Expected the paper’s 36-location posterior table'
    with sqlite3.connect(database) as connection:
        records = connection.execute('''SELECT listing_type, region, district, area_sqm, rooms, price_usd,
          json_extract(attributes_json, '$.specs.Renovation'),
          json_extract(attributes_json, '$.specs.Furniture') FROM listings''').fetchall()
    groups = {}
    for side, region, location, area, rooms_count, price, reno, furniture in records:
        if None in (side, region, location, area, rooms_count, price, reno, furniture):
            continue
        if not (20 <= area <= 300 and 1 <= rooms_count <= 5):
            continue
        if not ((side == 'rent' and 100 <= price <= 6000) or
                (side == 'sale' and 10000 <= price <= 2000000)):
            continue
        if reno not in ['Major', 'Designer', 'Euro', 'Cosmetic', 'None', 'Old', 'Partial']:
            continue
        if furniture not in ['With', 'Without', 'Partial', 'By Agreement']:
            continue
        group = groups.setdefault(location, {'region': region, 'rent': [], 'sale': []})
        assert group['region'] == region
        group[side].append(price)
    groups = {name: group for name, group in groups.items()
              if min(len(group['rent']), len(group['sale'])) >= 5}
    assert len(groups) == 36
    assert sum(len(g['rent']) + len(g['sale']) for g in groups.values()) == 8863
    locations = []
    for name, median, low, high in published:
        g = groups[name]
        locations.append(dict(name=name, region=g['region'], median=float(median), lower80=float(low),
                              upper80=float(high), raw=round(1200*statistics.median(g['rent']) /
                              statistics.median(g['sale']), 6), rentCount=len(g['rent']), saleCount=len(g['sale'])))
    geo = json.loads(Path(boundaries).read_text())
    all_points = [project(p) for f in geo['features'] for ring in rings(f['geometry']) for p in ring]
    xmin, xmax = min(x for x,y in all_points), max(x for x,y in all_points)
    ymin, ymax = min(y for x,y in all_points), max(y for x,y in all_points)
    scale = min(445/(xmax-xmin), 470/(ymax-ymin))
    def screen(point):
        x,y = project(point)
        return [round(56+(445-(xmax-xmin)*scale)/2 + (x-xmin)*scale, 1), round(48+(y-ymin)*scale, 1)]
    regions = []
    for feature in geo['features']:
        name = feature['properties']['shapeName']
        region_id = name.lower().replace(' ', '_')
        local = [l for l in locations if l['region'] == region_id]
        assert local, name
        projected_rings = [[screen(p) for p in ring] for ring in rings(feature['geometry'])]
        path = ''
        for ring in projected_rings:
            # Drop adjacent vertices rounded to the same screen pixel fraction.
            points = [p for i,p in enumerate(ring) if i == 0 or p != ring[i-1]]
            path += 'M' + 'L'.join(f'{x},{y}' for x,y in points) + 'Z'
        label = [round(v,1) for v in centroid(max(projected_rings, key=len))]
        regions.append(dict(id=region_id, name=name, path=path, label=label,
                            overviewMedian=round(statistics.median(l['median'] for l in local),3),
                            locationCount=len(local)))
    # Label callouts preserve the actual geographic shape while keeping small regions legible.
    yerevan = next(r for r in regions if r['id'] == 'yerevan')
    x,y = yerevan['label']
    yerevan['callout'] = f'M{x},{y}L{x-48},{y+40}L{x-88},{y+40}'
    yerevan['label'] = [round(x-84,1),round(y+56,1)]
    return dict(schemaVersion=1, sample=dict(rent=3844,sale=5019,total=8863,locations=36,period='May 2026'),
                profile=dict(sqm=60,rooms=2,renovation='Major',furniture='With'),
                posteriorSource='Working paper, Appendix C: published posterior median and 10th/90th percentiles',
                posteriorDensityAvailable=False,
                overviewDefinition='Unweighted median of published location posterior medians within each region; not a region-level posterior',
                boundarySource=dict(provider='geoBoundaries / Government of Armenia / OCHA ROCCA',
                  year=2005, license='CC BY 3.0 IGO', boundaryId='ARM-ADM1-6114869',
                  url='https://www.geoboundaries.org/api/current/gbOpen/ARM/ADM1/',
                  modifications='Equirectangular projection, rounded to 0.1 display unit; no analytical spatial interpolation'),
                regions=sorted(regions,key=lambda r:r['name']), locations=locations)


def add_posterior(data, export_path):
    """Attach an inspected export; keep its sampler review flag and provenance."""
    posterior = json.loads(Path(export_path).read_text())
    old = {r['name']: r for r in data['locations']}
    new = {r['name']: r for r in posterior['locations']}
    assert len(new) == len(posterior['locations']) == 36 and set(new) == set(old)
    assert posterior['profile'] == data['profile']
    for name, row in new.items():
        original = old[name]
        assert all(row[k] == original[k] for k in ['region', 'rentCount', 'saleCount'])
        assert abs(row['raw'] - original['raw']) < 0.00001
        assert row['lower95'] < row['lower80'] < row['median'] < row['upper80'] < row['upper95']
        xs, ys = row['density']['x'], row['density']['y']
        assert len(xs) == len(ys) >= 100
        assert all(math.isfinite(v) for v in xs+ys)
        assert all(a < b for a,b in zip(xs,xs[1:])) and min(xs) > 0 and min(ys) >= 0
        area = sum((b-a)*(c+d)/2 for a,b,c,d in zip(xs,xs[1:],ys,ys[1:]))
        assert 0.99 < area < 1.01
    data['publishedReference'] = [{k:r[k] for k in ['name','median','lower80','upper80']} for r in data['locations']]
    data['locations'] = posterior['locations']
    data['posteriorDensityAvailable'] = True
    data['posteriorSource'] = '2026-09-10 refit of original Model 2, same May 2026 analytic sample'
    data['posteriorExport'] = {k:posterior[k] for k in ['generatedUtc','drawsPerLocation','diagnostics','sourceDatabaseSha256','modelCodeSha256','intervalType','densityUnits']}
    data['overviewDefinition'] = 'Unweighted median of refitted location posterior medians within each region; not a region-level posterior'
    for region in data['regions']:
        region['overviewMedian'] = round(statistics.median(r['median'] for r in data['locations'] if r['region'] == region['id']),3)
    return data


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    for option in ['paper','database','boundaries','output']:
        parser.add_argument('--'+option, required=True)
    parser.add_argument('--posterior', help='Optional reviewed Colab posterior curve export')
    args = parser.parse_args()
    data = build(args.paper,args.database,args.boundaries)
    if args.posterior:
        data = add_posterior(data, args.posterior)
    Path(args.output).write_text(json.dumps(data,separators=(',',':'))+'\n')
    print(f"Built {len(data['regions'])} regions and {len(data['locations'])} locations; {Path(args.output).stat().st_size:,} bytes")
