import os
from typing import Any, Dict

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS  # type: ignore

load_dotenv()

app = Flask(__name__)
CORS(app)


class CallDetailsError(Exception):
    """Raised when the VAPI call details endpoint responds with an error."""


def fetch_call_details(call_id: str) -> Dict[str, Any]:
    """Fetch call details from VAPI, ensuring we surface HTTP errors clearly."""
    url = f"https://api.vapi.ai/call/{call_id}"
    headers = {"Authorization": f"Bearer {os.getenv('VAPI_API_KEY')}"}
    try:
        response = requests.get(url, headers=headers, timeout=20)
        response.raise_for_status()
    except requests.exceptions.HTTPError as err:
        detail = err.response.text if err.response is not None else str(err)
        raise CallDetailsError(f"VAPI responded with an error: {detail}") from err
    except requests.exceptions.RequestException as err:
        raise CallDetailsError(f"Unable to reach VAPI: {err}") from err

    return response.json()


def _pick_first(*candidates: Any) -> Any:
    for candidate in candidates:
        if candidate not in (None, "", []):
            return candidate
    return None


@app.route("/call-details", methods=["GET"])
def get_call_details():
    call_id = request.args.get("call_id")
    if not call_id:
        return jsonify({"error": "Call ID is required"}), 400

    try:
        payload = fetch_call_details(call_id)
    except CallDetailsError as err:
        return jsonify({"error": str(err)}), 502

    analysis = payload.get("analysis") or {}
    structured_data = (
        payload.get("structuredData")
        or analysis.get("structuredData")
        or analysis.get("structured_data")
        or {}
    )

    call_metadata = {
        "id": _pick_first(payload.get("id"), call_id),
        "assistantId": _pick_first(payload.get("assistantId"), payload.get("assistant_id")),
        "startedAt": _pick_first(payload.get("startedAt"), payload.get("createdAt")),
        "endedAt": _pick_first(payload.get("endedAt"), payload.get("completedAt")),
        "duration": _pick_first(
            payload.get("duration"),
            payload.get("callDurationSeconds"),
            payload.get("call_duration_seconds"),
        ),
    }

    response_body = {
        "summary": _pick_first(payload.get("summary"), analysis.get("summary")),
        "analysis": analysis,
        "structuredData": structured_data,
        "insights": _pick_first(payload.get("insights"), analysis.get("insights")),
        "transcript": _pick_first(
            payload.get("transcript"),
            payload.get("callTranscription"),
            payload.get("call_transcription"),
        ),
        "call": {k: v for k, v in call_metadata.items() if v is not None},
    }

    return jsonify(response_body), 200


if __name__ == "__main__":
    app.run(debug=True)