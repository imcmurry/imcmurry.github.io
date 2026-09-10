import hashlib
import json
from pathlib import Path
import sys
import zipfile

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bootstrap import install_bundle


def make_bundle(tmp_path, extra_path="artifacts/head.json"):
    archive = tmp_path / "bundle.zip"
    with zipfile.ZipFile(archive, "w") as bundle:
        bundle.writestr("artifacts/manifest.json", json.dumps({"version": "9a89cc3b81b92996"}))
        bundle.writestr(extra_path, "{}")
        bundle.writestr("public-assets/examples.json", "[]")
    return archive, hashlib.sha256(archive.read_bytes()).hexdigest()


def test_installs_only_private_artifacts(tmp_path):
    archive, digest = make_bundle(tmp_path)
    install_bundle(archive, tmp_path / "artifacts", digest)
    assert (tmp_path / "artifacts/head.json").is_file()
    assert not (tmp_path / "public-assets").exists()


def test_rejects_untrusted_bundle_before_extraction(tmp_path):
    archive, _ = make_bundle(tmp_path)
    with pytest.raises(ValueError, match="checksum"):
        install_bundle(archive, tmp_path / "artifacts", "0" * 64)
    assert not (tmp_path / "artifacts").exists()


@pytest.mark.parametrize("name", ["../escape", "/absolute", "artifacts/../../escape"])
def test_rejects_unsafe_paths_atomically(tmp_path, name):
    archive, digest = make_bundle(tmp_path, name)
    with pytest.raises(ValueError, match="path"):
        install_bundle(archive, tmp_path / "artifacts", digest)
    assert not (tmp_path / "artifacts").exists()
