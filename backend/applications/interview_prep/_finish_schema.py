"""Schema-building helpers for the Interview Prep agent's `finish` tool.

Kept separate from `agent.py` so the agent file stays under the 300-line
project limit. Also makes the inliner unit-testable in isolation.
"""

from typing import Any

from pydantic import ValidationError

from .schemas import InterviewBriefing

# Fields the agent does NOT fill — the loop populates them post-hoc.
AUTO_BRIEFING_FIELDS = ("company", "role", "generated_at", "next_action")


def _inline_refs(schema: dict[str, Any]) -> dict[str, Any]:
    """Inline every `$ref` against `$defs` and drop the `$defs` key.

    Why: some OpenAI-compatible providers (OpenRouter Gemini, certain DO models)
    do not dereference `$ref` inside tool parameter schemas — they treat the ref
    as opaque and let the model invent field names from the description, which
    is what was producing the 23 validation errors. Inlining produces a
    self-contained schema that any tool-calling model can follow literally.
    """
    defs = schema.get("$defs", {})

    def _resolve(node: Any) -> Any:
        if isinstance(node, dict):
            ref = node.get("$ref")
            if isinstance(ref, str) and ref.startswith("#/$defs/"):
                target = defs.get(ref.split("/")[-1], {})
                return _resolve(target)
            return {k: _resolve(v) for k, v in node.items() if k != "$defs"}
        if isinstance(node, list):
            return [_resolve(item) for item in node]
        return node

    resolved = _resolve(schema)
    if isinstance(resolved, dict):
        resolved.pop("$defs", None)
    return resolved


def build_briefing_schema() -> dict[str, Any]:
    """Pydantic schema for InterviewBriefing minus fields the loop fills itself."""
    schema = InterviewBriefing.model_json_schema()
    props = schema.get("properties", {})
    for field in AUTO_BRIEFING_FIELDS:
        props.pop(field, None)
    schema["required"] = [
        r for r in schema.get("required", []) if r not in AUTO_BRIEFING_FIELDS
    ]
    schema["additionalProperties"] = False
    return _inline_refs(schema)


def format_validation_errors(exc: ValidationError, limit: int = 12) -> str:
    """Compact list of Pydantic errors the model can act on directly."""
    errors = exc.errors()
    lines: list[str] = []
    for err in errors[:limit]:
        loc = ".".join(str(x) for x in err.get("loc", ())) or "<root>"
        msg = err.get("msg", "")
        kind = err.get("type", "")
        lines.append(f"- `{loc}`: {msg} (type: {kind})")
    if len(errors) > limit:
        lines.append(f"- ...and {len(errors) - limit} more errors")
    return "\n".join(lines)


BRIEFING_SCHEMA = build_briefing_schema()
