"""Prepare a private inference bundle and public coordinate-only demo assets.

Only use trusted, owned research artifacts: joblib can execute Python code.
No retraining, new label fitting, or changes to the saved classifier threshold.
"""
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import shutil

import joblib
import numpy as np
import pandas as pd
from scipy.special import expit
from sklearn.preprocessing import StandardScaler


EXAMPLES = [
    {"label": "Meeting people", "text": "We cooked together in the common kitchen and went out with the other guests every night. I arrived alone and left with new friends."},
    {"label": "A comfortable stay", "text": "The room was spotless and the bed was comfortable. The staff were helpful and the location was convenient for the bus station."},
    {"label": "Hard to connect", "text": "Nobody spoke to each other. The common room was empty every evening and it was difficult to meet anyone."},
]


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def prepare(args):
    import torch
    import umap
    from sentence_transformers import SentenceTransformer

    torch.set_num_threads(2)
    output = Path(args.output)
    public = Path(args.public)
    output.mkdir(parents=True, exist_ok=True)
    public.mkdir(parents=True, exist_ok=True)
    # A CSV called updated_5k.csv currently stores translated text as review_text.
    # Earlier versions used translated_review; an explicit override takes priority.
    df = pd.read_csv(args.reviews)
    column = args.text_column or ("translated_review" if "translated_review" in df else "review_text")
    if column not in df or "social" not in df:
        raise ValueError("CSV needs a review text column and a social label column")
    df = df.dropna(subset=[column, "social"])
    df = df.loc[df[column].str.strip().ne("")].reset_index(drop=True)
    if not df.social.isin([0, 1]).all() or df.social.nunique() != 2:
        raise ValueError("Expected both binary social labels")
    labels = df.social.to_numpy(dtype=int)
    encoder = SentenceTransformer(args.encoder, device="cpu", local_files_only=True, trust_remote_code=False)
    head = joblib.load(args.head)
    if list(head.named_steps) != ["scaler", "lr"]:
        raise ValueError("Unexpected head pipeline; inspect before changing inference")
    scaler, lr = head.named_steps["scaler"], head.named_steps["lr"]
    if scaler.with_mean or not scaler.with_std or list(lr.classes_) != [0, 1]:
        raise ValueError("Unexpected scaler or class order")
    threshold = float(json.loads(Path(args.thresholds).read_text())["social"])
    if not 0 < threshold < 1:
        raise ValueError("Invalid saved threshold")
    head_data = {"scale": scaler.scale_.tolist(), "coefficient": lr.coef_[0].tolist(), "intercept": float(lr.intercept_[0]), "threshold": threshold}
    print(f"Embedding {len(df)} labeled reviews from {column}…", flush=True)
    embeddings = encoder.encode(df[column].tolist(), batch_size=64, convert_to_numpy=True, show_progress_bar=False)
    scaled_for_head = embeddings.copy()
    scaled_for_head /= scaler.scale_
    exported = expit(scaled_for_head @ lr.coef_[0] + lr.intercept_[0])
    np.testing.assert_allclose(exported, head.predict_proba(embeddings)[:, 1], atol=1e-12, rtol=1e-10)
    map_scaler = StandardScaler().fit(embeddings)
    reducer = umap.UMAP(n_neighbors=15, min_dist=.1, metric="cosine", random_state=42, transform_seed=42, n_jobs=1)
    print("Fitting the fixed UMAP projection…", flush=True)
    points = reducer.fit_transform(map_scaler.transform(embeddings))
    shutil.copytree(args.encoder, output / "final_model", dirs_exist_ok=True)
    (output / "head.json").write_text(json.dumps(head_data, indent=2) + "\n")
    joblib.dump({"scaler": map_scaler, "umap": reducer}, output / "projection.joblib", compress=3)
    checksums = {str(p.relative_to(output)): digest(p) for p in sorted(output.rglob("*")) if p.is_file() and p.name != "manifest.json"}
    version = hashlib.sha256(json.dumps(checksums, sort_keys=True).encode()).hexdigest()[:16]
    manifest = {
        "version": version, "reference_count": len(df), "text_column": column,
        "encoder_sha256": digest(Path(args.encoder) / "model.safetensors"),
        "saved_head_sha256": digest(args.head), "reviews_sha256": digest(args.reviews),
        "checksums": checksums,
        "versions": {name: importlib.metadata.version(name) for name in ["torch", "sentence-transformers", "transformers", "scikit-learn", "numpy", "umap-learn", "numba", "joblib"]},
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    # Reproducible sample retaining the corpus's social/non-social proportions.
    rng = np.random.default_rng(42)
    count = min(900, len(df))
    selected = []
    for label in [0, 1]:
        candidates = np.flatnonzero(labels == label)
        selected.extend(rng.choice(candidates, round(count * len(candidates) / len(df)), replace=False).tolist())
    selected.sort()
    lower, upper = points.min(axis=0), points.max(axis=0)
    padding = np.maximum((upper - lower) * .15, .5)
    lower -= padding; upper += padding
    map_data = {
        "version": version, "referenceCount": len(df),
        "bounds": [float(lower[0]), float(upper[0]), float(lower[1]), float(upper[1])],
        "points": [[round(float(points[i, 0]), 4), round(float(points[i, 1]), 4), int(labels[i])] for i in selected],
    }
    (public / "hostel-demo-map.json").write_text(json.dumps(map_data, separators=(",", ":")) + "\n")
    from model import SocialModel
    service = SocialModel(output)
    examples = [{**example, "result": service.classify(example["text"])} for example in EXAMPLES]
    (public / "hostel-demo-examples.json").write_text(json.dumps({"version": version, "examples": examples}, indent=2) + "\n")
    print(json.dumps({"version": version, "reference_count": len(df), "examples": [{"label": e["label"], "score": e["result"]["probability"]} for e in examples]}, indent=2), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--encoder", required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--thresholds", required=True)
    parser.add_argument("--reviews", required=True)
    parser.add_argument("--text-column")
    parser.add_argument("--output", default="artifacts")
    parser.add_argument("--public", default="../../assets")
    prepare(parser.parse_args())
