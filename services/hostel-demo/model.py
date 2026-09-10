"""Inference against a prepared, local-only research artifact bundle."""
import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
from scipy.special import expit


class ReviewTooLong(ValueError):
    pass


class SocialModel:
    def __init__(self, artifact_dir):
        import torch
        from sentence_transformers import SentenceTransformer

        torch.set_num_threads(2)
        root = Path(artifact_dir)
        self.manifest = json.loads((root / "manifest.json").read_text())
        # Check generated bundle integrity before loading executable joblib data.
        for name, expected in self.manifest["checksums"].items():
            path = (root / name).resolve()
            if not path.is_relative_to(root.resolve()):
                raise ValueError("Invalid artifact path")
            if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                raise ValueError(f"Artifact checksum mismatch: {name}")
        self.version = self.manifest["version"]
        self.head = json.loads((root / "head.json").read_text())
        self.threshold = self.head["threshold"]
        self.encoder = SentenceTransformer(str(root / "final_model"), device="cpu", local_files_only=True, trust_remote_code=False)
        self.projection = joblib.load(root / "projection.joblib")
        if self.encoder.get_sentence_embedding_dimension() != len(self.head["coefficient"]):
            raise ValueError("The encoder and scoring head have different dimensions")

    def classify(self, text):
        tokens = self.encoder.tokenizer(text, truncation=False, add_special_tokens=True, verbose=False)["input_ids"]
        if len(tokens) > self.encoder.max_seq_length:
            raise ReviewTooLong("Use a shorter review")
        embedding = self.encoder.encode([text], convert_to_numpy=True, show_progress_bar=False)
        # Preserve the saved StandardScaler(with_mean=False) + LogisticRegression.
        scaled = embedding.copy()
        scaled /= np.asarray(self.head["scale"])
        probability = float(expit(scaled @ np.asarray(self.head["coefficient"]) + self.head["intercept"])[0])
        point = self.projection["umap"].transform(self.projection["scaler"].transform(embedding))[0]
        if not np.isfinite(point).all() or not np.isfinite(probability):
            raise ValueError("Non-finite model output")
        return {
            "version": self.version,
            "probability": probability,
            "threshold": self.threshold,
            "label": "social" if probability >= self.threshold else "non-social",
            "point": [float(point[0]), float(point[1])],
        }
