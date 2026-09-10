#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: ./deploy.sh GOOGLE_CLOUD_PROJECT REGION" >&2
  exit 1
fi
PROJECT_ID="$1"
REGION="$2"
SERVICE_NAME="hostel-review-demo"
ARTIFACT_REPOSITORY="hostel-demo"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
test -f artifacts/manifest.json || { echo "Extract the prepared bundle into artifacts/ first." >&2; exit 1; }
command -v gcloud >/dev/null || { echo "Run this from Google Cloud Shell, or install the Google Cloud CLI." >&2; exit 1; }

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project "$PROJECT_ID"
if ! gcloud artifacts repositories describe "$ARTIFACT_REPOSITORY" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$ARTIFACT_REPOSITORY" --repository-format docker --location "$REGION" --project "$PROJECT_ID"
fi
VERSION="$(python3 -c 'import json; print(json.load(open("artifacts/manifest.json"))["version"])')"
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$ARTIFACT_REPOSITORY/$SERVICE_NAME:$VERSION"
gcloud builds submit . --tag "$IMAGE" --project "$PROJECT_ID"
gcloud run deploy "$SERVICE_NAME" --image "$IMAGE" --region "$REGION" --project "$PROJECT_ID" \
  --allow-unauthenticated --memory 4Gi --cpu 2 --concurrency 2 --timeout 120 \
  --min-instances 0 --max-instances 1 --set-env-vars ALLOWED_ORIGINS=https://imcmurry.github.io
API_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)')"
python3 - "$API_URL" <<'PY'
import json, pathlib, sys, urllib.request
url = sys.argv[1]
with urllib.request.urlopen(url + '/healthz', timeout=120) as response:
    health = json.load(response)
expected = json.loads(pathlib.Path('artifacts/manifest.json').read_text())['version']
if health.get('version') != expected:
    raise SystemExit('The deployed model version does not match the prepared bundle.')
path = pathlib.Path('../../assets/hostel-demo-config.json')
path.write_text(json.dumps({'apiBase': url}, indent=2) + '\n')
print('Service is ready. Commit assets/hostel-demo-config.json with the matching map and examples.')
print(url)
PY
