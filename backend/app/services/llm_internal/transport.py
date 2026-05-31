from typing import Any


def build_chat_request_kwargs(
    *,
    model: str,
    prompt: str,
    temperature: float,
    num_predict: int,
    num_ctx: int,
    keep_alive: str,
    force_json: bool,
) -> dict[str, Any]:
    request_kwargs: dict[str, Any] = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are a security expert. Output valid JSON only, no explanations.",
            },
            {"role": "user", "content": prompt},
        ],
        "options": {
            "temperature": temperature,
            "num_predict": num_predict,
            "num_ctx": num_ctx,
        },
        "keep_alive": keep_alive,
    }

    if force_json:
        request_kwargs["format"] = "json"

    return request_kwargs
