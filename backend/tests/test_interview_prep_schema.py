"""Unit tests for the interview_prep finish-tool schema helpers.

These tests are MongoDB-free and exercise the schema inliner and the
validation-error feedback formatter that the agent loop relies on.
"""

from typing import Any

import pytest
from pydantic import BaseModel, Field, ValidationError

from applications.interview_prep._finish_schema import (
    BRIEFING_SCHEMA,
    _inline_refs,
    build_briefing_schema,
    format_validation_errors,
)


class _Inner(BaseModel):
    label: str
    score: int


class _Outer(BaseModel):
    name: str = Field(description="display name")
    inner: _Inner
    extras: list[_Inner]


def _has_refs_or_defs(node: Any) -> bool:
    if isinstance(node, dict):
        if "$ref" in node or "$defs" in node:
            return True
        return any(_has_refs_or_defs(v) for v in node.values())
    if isinstance(node, list):
        return any(_has_refs_or_defs(item) for item in node)
    return False


def test_inline_refs_resolves_nested_object_ref():
    raw = _Outer.model_json_schema()

    assert _has_refs_or_defs(raw), "fixture sanity: raw schema should contain $refs/$defs"

    inlined = _inline_refs(raw)

    assert not _has_refs_or_defs(inlined)
    assert inlined["properties"]["inner"]["properties"]["label"]["type"] == "string"
    assert inlined["properties"]["inner"]["required"] == ["label", "score"]


def test_inline_refs_resolves_refs_inside_array_items():
    raw = _Outer.model_json_schema()

    inlined = _inline_refs(raw)

    items = inlined["properties"]["extras"]["items"]
    assert items["type"] == "object"
    assert items["required"] == ["label", "score"]
    assert "$ref" not in items


def test_inline_refs_passthrough_when_no_defs():
    schema = {"type": "object", "properties": {"name": {"type": "string"}}}

    inlined = _inline_refs(schema)

    assert inlined == schema


def test_build_briefing_schema_strips_auto_fields():
    schema = build_briefing_schema()

    for auto_field in ("company", "role", "generated_at", "next_action"):
        assert auto_field not in schema["properties"], f"{auto_field} should be stripped"
        assert auto_field not in schema.get("required", [])


def test_build_briefing_schema_keeps_required_sections():
    schema = build_briefing_schema()

    required = set(schema["required"])
    assert required == {"compensation", "interview_process", "company_intel", "personalized"}


def test_briefing_schema_is_fully_inlined():
    """Critical: providers that don't dereference $ref must see literal fields."""
    assert not _has_refs_or_defs(BRIEFING_SCHEMA)


def test_briefing_schema_exposes_compensation_required_fields():
    """The model needs the exact required field names visible at the leaf level."""
    compensation = BRIEFING_SCHEMA["properties"]["compensation"]

    assert compensation["type"] == "object"
    assert set(compensation["required"]) == {
        "p25_total_comp",
        "median_total_comp",
        "p75_total_comp",
        "base_range",
        "notes",
        "sources",
    }


def test_briefing_schema_exposes_interview_round_shape():
    """`rounds` must be an array of typed objects — string rounds were a prior bug."""
    rounds = BRIEFING_SCHEMA["properties"]["interview_process"]["properties"]["rounds"]

    assert rounds["type"] == "array"
    items = rounds["items"]
    assert items["type"] == "object"
    assert set(items["required"]) == {"name", "description", "what_to_expect"}


def test_briefing_schema_additional_properties_false():
    """Disallow extra keys so the model can't slip in invented fields."""
    assert BRIEFING_SCHEMA["additionalProperties"] is False


def test_format_validation_errors_includes_field_path_and_kind():
    class _Demo(BaseModel):
        name: str
        count: int

    with pytest.raises(ValidationError) as exc_info:
        _Demo.model_validate({"count": "not-an-int"})

    rendered = format_validation_errors(exc_info.value)

    assert "name" in rendered
    assert "count" in rendered
    assert "missing" in rendered or "type" in rendered


def test_format_validation_errors_truncates_long_lists():
    class _Demo(BaseModel):
        a: int
        b: int
        c: int
        d: int

    with pytest.raises(ValidationError) as exc_info:
        _Demo.model_validate({})

    rendered = format_validation_errors(exc_info.value, limit=2)

    assert "...and 2 more errors" in rendered
