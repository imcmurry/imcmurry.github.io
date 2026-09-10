# Hostel review demo

An expandable, lazy-loaded demo below the existing hostel UMAP figure. The
browser sends review text to a small model service; the transformer never
downloads to the browser. The demo includes actual example outputs and a
fixed reference map, published with the owner's approval.
Custom text becomes available when `apiBase` in
`assets/hostel-demo-config.json` points to the deployed service.

The public website stays on GitHub Pages. The API is deployed separately on Railway.

## Railway deployment

The `hostel-review-demo` Railway project uses the existing repository, branch
`main`, root directory `/services/hostel-demo`, and `Dockerfile.railway`.
Only changes beneath that service directory trigger API rebuilds. It uses one
replica, sleeping when idle, and a private 1 GB volume mounted at `/data`.
The domain routes to port 8080; `/healthz` reports `ready` and the model version
after initialization. Cold starts include model loading and a UMAP warm-up.

The initial volume is provisioned through `bootstrap.py`. A random secret
`MODEL_UPLOAD_TOKEN` in Railway authenticates a single upload of the exact
prepared ZIP to `POST /bootstrap/artifacts`. The bootstrap verifies the pinned
SHA-256 before extraction, rejects unsafe paths, and atomically installs only
`artifacts/`. Its temporary health response is `awaiting_artifacts`, not `ready`.
After installation it replaces itself with the inference API, removing the
upload route and token from the running process. Subsequent starts load the
persistent files directly. Model files and the token are never committed to git.
If the volume is replaced, repeat provisioning with a fresh token before
directing visitors to the service. No expiring download links are required.

Required service variables: `PORT=8080`, `ARTIFACT_DIR=/data/artifacts`,
`ALLOWED_ORIGINS=https://imcmurry.github.io`. `MODEL_UPLOAD_TOKEN` is needed only
for initial provisioning. Keep model files and any deployment secrets private.

## What the score means

The saved `biencoder_social_out/final_model` generates a normalized 384-dimensional
embedding. `biencoder_linear_head/linear_head.joblib` contains
`StandardScaler(with_mean=False)` followed by binary logistic regression. The
positive class is `1`. The head's own `thresholds.json` specifies
**0.5405342781281611**, which is used unchanged.

The encoder folder's **0.817334771156311** threshold belongs to its separate
training/evaluation procedure and must not be applied to the logistic head.
The demo shows the head's raw social-class score, not a calibrated probability
of social interaction or a hostel rating. It uses the saved artifacts as supplied;
their metrics differ from the published table, so this demo makes no claim of
reproducing the paper's exact held-out evaluation.

The head is exported as numeric JSON, with parity checked against the original
pipeline on all reference embeddings. It is not refit. Input division preserves
float32 behavior from the original scikit-learn scaler.

## Map

`updated_5k.csv` currently has 4,994 reviews and stores translated review text in
`review_text`; the earlier plotting code used `translated_review`. Preparation
supports both names and an explicit `--text-column` override. Punctuation, case,
and the original text are preserved. The reference fit uses all nonempty labeled
reviews, a **separate** standard scaler, and the supplied UMAP settings:
15 neighbors, minimum distance 0.1, cosine metric, seed 42.

The public map contains 900 sampled coordinates and binary labels, preserving
the reference class proportions. It contains no review text, reviewer names,
hostel identifiers, or corpus rows. New reviews use the saved scaler and
`UMAP.transform`; the map is never refit per request. This creates a new fixed
projection, not a pixel-exact reconstruction of the original figure. UMAP's
neighborhoods are illustrative; decisions use the full embedding, and no 2-D
decision boundary is drawn.

The three example texts were written for this demo. Their saved probabilities
and positions come from the real service implementation and are explicitly
labeled as saved outputs in the UI. Editing a review clears its old result and
cancels an in-flight request, preventing stale results from attaching to new text.

## Alternative: deploy on Cloud Run

Use the prepared `hostel-demo-artifacts.zip` supplied privately with this change. Its
`artifacts/` directory belongs here, next to the Dockerfile. `public-assets/`
contains the coordinate map and saved example outputs, which are already checked
into the root `assets/` directory with the owner's approval. Model weights,
projection objects, and source CSV files must stay out of the public repository.

From Google Cloud Shell (with the target project selected and billing enabled):

```bash
git clone --branch codex/hostel-review-demo https://github.com/imcmurry/imcmurry.github.io.git
cd imcmurry.github.io/services/hostel-demo
unzip /path/to/hostel-demo-artifacts.zip
bash deploy.sh YOUR_PROJECT_ID YOUR_REGION
```

The script builds a CPU service, verifies its model version through `/healthz`,
and writes its actual URL into `assets/hostel-demo-config.json`. Commit that
configuration and the matching map/example assets, then merge the feature branch
to publish through the site's existing GitHub Pages setup. Do not mix bundles
and map versions: the frontend rejects mismatched results.

The script creates an Artifact Registry repository if needed and enables the
required Cloud APIs. Cloud Build needs the project's normal build permissions;
it does not create service-account keys. The service uses 2 CPUs, 4 GiB RAM,
zero minimum instances and one maximum instance. The first request after idling
can be slower because the transformer and UMAP transform must initialize.

## Rebuild artifacts from Drive

Only run preparation with trusted, owned joblib files. Runtime inference loads
only the private prepared bundle and does not access Google Drive or Hugging Face.
Use Python 3.12 and the pinned dependency versions, including CPU PyTorch:

```bash
python -m venv .venv
source .venv/bin/activate
pip install torch==2.14.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements-dev.txt
python prepare_assets.py \
  --encoder /path/to/biencoder_social_out/final_model \
  --head /path/to/biencoder_linear_head/linear_head.joblib \
  --thresholds /path/to/biencoder_linear_head/thresholds.json \
  --reviews /path/to/updated_5k.csv \
  --text-column review_text
```

Preparation writes private `artifacts/` and the public map/example JSON files in
`../../assets/`. The manifest records source checksums and dependency versions;
all bundle files are verified before the projection is loaded. The manifest is
an integrity check, not a substitute for trusting the bundle's source.

## Local verification

```bash
pytest -q
ALLOWED_ORIGINS=http://localhost:8000 uvicorn app:app --port 8080 --no-access-log
```

For local frontend use, serve the repository root over HTTP and temporarily set
`apiBase` to `http://localhost:8080`. Restore the deployment URL before committing.
Do not use `file://` to open the page: the lazy module and JSON assets use fetch.

## Request handling

- 10–1,200 characters, at most the encoder's 256 tokens including special tokens.
  Oversize reviews are rejected, not silently truncated.
- 8 KiB streamed body limit, a 10-second body-read timeout, and strict JSON shape.
- Explicit allowed browser origins. CORS is not authentication; non-browser
  clients can still call this public demo.
- One active scoring request and 30 accepted attempts per minute **per process**.
  Busy requests get 429 with Retry-After. These are local best-effort limits that
  reset on restarts; they are not a distributed quota or a billing cap.
- No app-level review storage, analytics, or request-body logging; access logging
  is disabled in Uvicorn. Cloud Run still retains its normal request metadata.
- Generic API errors, no response caching, and no credentials in browser requests.

For stronger abuse controls at higher traffic, put a managed rate limiter in
front of the service; do not put an API secret in this public frontend.

Implementation references: [SentenceTransformer local loading](https://sbert.net/docs/package_reference/sentence_transformer/model.html),
[UMAP transforming new data](https://umap-learn.readthedocs.io/en/latest/transform.html),
[Cloud Run memory configuration](https://docs.cloud.google.com/run/docs/configuring/services/memory-limits).
