"""Priority scoring for morning brief items as ranked missions."""

import re
from dataclasses import dataclass
from urllib.parse import parse_qs, urlparse

SECTION_BASE_SCORE: dict[str, float] = {
    "follow_ups": 1000.0,
    "ghosts": 950.0,
    "interviews": 800.0,
    "high_matches": 500.0,
    "pending_approvals": 400.0,
    "watchlist_finds": 450.0,
}

SECTION_ORDER = ("follow_ups", "ghosts", "interviews", "high_matches", "watchlist_finds", "pending_approvals")

SCORE_PATTERN = re.compile(r"(?:Match|Fit) score (\d+)")
GHOST_DAYS_PATTERN = re.compile(r"(\d+) days waiting")
GHOST_MEDIAN_PATTERN = re.compile(r"median (\d+) days")


@dataclass(frozen=True)
class ScoredMission:
    id: str
    section: str
    title: str
    body: str
    action_url: str
    priority: int
    score: float
    reason: str
    prep_ready: bool = False


def _parse_score(body: str) -> int | None:
    if not body:
        return None
    match = SCORE_PATTERN.search(body)
    return int(match.group(1)) if match else None


def _app_id_from_action_url(action_url: str) -> str | None:
    parsed = urlparse(action_url)
    selected = parse_qs(parsed.query).get("selected", [])
    return selected[0] if selected else None


def _mission_id(section: str, item: dict) -> str:
    entity_id = item.get("entity_id")
    if entity_id:
        return str(entity_id)
    app_id = _app_id_from_action_url(item.get("action_url", ""))
    if app_id:
        return app_id
    return f"{section}:aggregate"


def _score_item(section: str, item: dict, index: int) -> tuple[float, str]:
    base = SECTION_BASE_SCORE.get(section, 100.0)
    body = item.get("body", "")

    if section == "follow_ups":
        return base - index, "Follow-up is overdue — respond today"

    if section == "ghosts":
        days_match = GHOST_DAYS_PATTERN.search(body)
        median_match = GHOST_MEDIAN_PATTERN.search(body)
        days = int(days_match.group(1)) if days_match else 0
        median = int(median_match.group(1)) if median_match else 14
        from review.ghost_detection import ghost_mission_reason  # noqa: PLC0415
        return base + days - index, ghost_mission_reason(days, median)

    if section == "interviews":
        prep_ready = bool(item.get("prep_ready"))
        reason = (
            "Interview coming up — prep briefing ready"
            if prep_ready
            else "Interview coming up — review details"
        )
        proximity_bonus = 50.0 if index == 0 else 0.0
        return base - index + proximity_bonus, reason

    if section == "high_matches":
        fit = _parse_score(body) or 80
        return base + fit - index, f"Strong fit ({fit}%) — worth applying"

    if section == "watchlist_finds":
        count_match = re.search(r"(\d+) new", body)
        count = int(count_match.group(1)) if count_match else 1
        return base + count * 5 - index, f"Watchlist find ({count}) awaiting review"

    if section == "pending_approvals":
        match_score = _parse_score(body) or 70
        return base + match_score - index, f"Autopilot match ({match_score}%) awaiting review"

    return base - index, "Action recommended"


def score_missions(sections: dict) -> list[ScoredMission]:
    """Score and rank brief section items as prioritized missions."""
    candidates: list[tuple[float, str, str, int, dict]] = []
    for section in SECTION_ORDER:
        for index, item in enumerate(sections.get(section, [])):
            score, reason = _score_item(section, item, index)
            candidates.append((score, reason, section, index, item))

    candidates.sort(key=lambda row: row[0], reverse=True)

    missions: list[ScoredMission] = []
    for rank, (score, reason, section, index, item) in enumerate(candidates, start=1):
        missions.append(ScoredMission(
            id=_mission_id(section, item),
            section=section,
            title=item.get("title", ""),
            body=item.get("body", ""),
            action_url=item.get("action_url", ""),
            priority=rank,
            score=score,
            reason=reason,
            prep_ready=bool(item.get("prep_ready")),
        ))
    return missions


def missions_to_dicts(missions: list[ScoredMission]) -> list[dict]:
    """Serialize scored missions for API responses."""
    return [
        {
            "id": mission.id,
            "section": mission.section,
            "title": mission.title,
            "body": mission.body,
            "action_url": mission.action_url,
            "priority": mission.priority,
            "reason": mission.reason,
            "prep_ready": mission.prep_ready,
        }
        for mission in missions
    ]
