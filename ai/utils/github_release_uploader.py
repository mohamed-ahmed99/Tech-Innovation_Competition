from __future__ import annotations

import json
import mimetypes
from pathlib import Path
from typing import Dict, List
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError


API_BASE = "https://api.github.com"


def _request_json(method: str, url: str, token: str, payload: dict | None = None) -> dict:
    data = None
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = Request(url, data=data, method=method, headers=headers)
    with urlopen(req) as resp:
        body = resp.read().decode("utf-8")
        return json.loads(body) if body else {}


def _request_no_content(method: str, url: str, token: str) -> None:
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    req = Request(url, method=method, headers=headers)
    with urlopen(req):
        return


def ensure_release(repo: str, tag: str, token: str, name: str = "Model Artifacts") -> dict:
    get_url = f"{API_BASE}/repos/{repo}/releases/tags/{tag}"
    try:
        return _request_json("GET", get_url, token)
    except HTTPError as exc:
        if exc.code != 404:
            raise

    create_url = f"{API_BASE}/repos/{repo}/releases"
    payload = {
        "tag_name": tag,
        "name": name,
        "draft": False,
        "prerelease": False,
    }
    return _request_json("POST", create_url, token, payload)


def _delete_asset_if_exists(repo: str, release: dict, asset_name: str, token: str) -> None:
    for asset in release.get("assets", []):
        if asset.get("name") == asset_name:
            asset_id = asset.get("id")
            if asset_id:
                delete_url = f"{API_BASE}/repos/{repo}/releases/assets/{asset_id}"
                _request_no_content("DELETE", delete_url, token)
            break


def upload_asset(repo: str, release: dict, path: Path, asset_name: str, token: str) -> str:
    upload_url = release["upload_url"].split("{")[0]
    encoded_name = quote(asset_name)
    url = f"{upload_url}?name={encoded_name}"

    content_type = mimetypes.guess_type(asset_name)[0] or "application/octet-stream"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "Content-Type": content_type,
        "X-GitHub-Api-Version": "2022-11-28",
    }

    with open(path, "rb") as f:
        data = f.read()

    req = Request(url, data=data, method="POST", headers=headers)
    with urlopen(req) as resp:
        body = resp.read().decode("utf-8")
        payload = json.loads(body)
        return payload.get("browser_download_url", "")


def upload_files_to_release(
    repo: str,
    tag: str,
    token: str,
    files: List[Path],
    asset_names: List[str],
    release_name: str = "Model Artifacts",
) -> Dict[str, str]:
    release = ensure_release(repo=repo, tag=tag, token=token, name=release_name)

    result: Dict[str, str] = {}
    for path, asset_name in zip(files, asset_names):
        _delete_asset_if_exists(repo=repo, release=release, asset_name=asset_name, token=token)
        refreshed = ensure_release(repo=repo, tag=tag, token=token, name=release_name)
        result[asset_name] = upload_asset(repo=repo, release=refreshed, path=path, asset_name=asset_name, token=token)

    return result
