"""Export helpers: CSV export and PDF report generation."""

import asyncio
import csv
import io
from datetime import datetime, timezone
from typing import Any

import structlog
from bson import ObjectId

from applications.service_constants import (
    CSV_EXPORT_COLUMNS,
    EXPORT_PROJECTION,
    PDF_APP_TABLE_LIMIT,
    PDF_INTERVIEW_STAGES,
    PDF_REPORT_PROJECTION,
)
from database import get_collection

logger = structlog.get_logger()

MAX_EXPORT_ROWS = 50_000


async def export_applications(user_id: str, include_archived: bool = False) -> str:
    """Return all matching applications serialized as a CSV string."""
    uid = ObjectId(user_id)
    apps = get_collection("applications")

    mongo_filter: dict = {"user_id": uid}
    if not include_archived:
        mongo_filter["archived"] = {"$ne": True}

    docs = await apps.find(mongo_filter, projection=EXPORT_PROJECTION).to_list(length=MAX_EXPORT_ROWS)
    if len(docs) == MAX_EXPORT_ROWS:
        logger.warning("export_truncated", user_id=user_id, limit=MAX_EXPORT_ROWS)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(CSV_EXPORT_COLUMNS)
    for doc in docs:
        tags = ";".join(doc.get("tags") or [])
        applied = doc.get("date_applied")
        updated = doc.get("updated_at")
        writer.writerow([
            str(doc["_id"]),
            doc.get("role_title") or "",
            doc.get("company") or "",
            doc.get("current_stage") or "",
            doc.get("location") or "",
            doc.get("remote_status") or "",
            doc.get("compensation") or "",
            doc.get("company_type") or "",
            tags,
            applied.isoformat() if applied else "",
            updated.isoformat() if updated else "",
            doc.get("notes") or "",
        ])
    logger.info("applications_exported", user_id=user_id, count=len(docs))
    return output.getvalue()


async def _fetch_pdf_data(user_id: str) -> tuple[dict, dict, list[dict], list[dict]]:
    """Fetch user doc, stats, applications, and funnel data in parallel."""
    from applications.service_analytics import compute_stats, get_funnel  # noqa: PLC0415
    from auth.service import get_user_by_id  # noqa: PLC0415

    col = get_collection("applications")
    uid = ObjectId(user_id)
    user_doc, stats, funnel_data = await asyncio.gather(
        get_user_by_id(user_id),
        compute_stats(user_id),
        get_funnel(user_id),
    )
    apps = await col.find(
        {"user_id": uid, "deleted": {"$ne": True}, "archived": {"$ne": True}},
        projection=PDF_REPORT_PROJECTION,
    ).sort("date_applied", -1).limit(PDF_APP_TABLE_LIMIT).to_list(length=PDF_APP_TABLE_LIMIT)
    return user_doc or {}, stats, apps, funnel_data


def _pdf_cover_elements(styles: Any, user_name: str, export_date: str, stats: dict, interview_rate: float) -> list:
    """Return flowables for the cover page (title, stats summary)."""
    from reportlab.platypus import Paragraph, Spacer, Table, TableStyle  # noqa: PLC0415
    from reportlab.lib import colors  # noqa: PLC0415
    from reportlab.lib.units import inch  # noqa: PLC0415

    elements = [
        Paragraph("Pipeline Report", styles["Title"]),
        Paragraph(user_name, styles["Heading2"]),
        Paragraph(f"Exported: {export_date}", styles["Normal"]),
        Spacer(1, 0.3 * inch),
        Paragraph("Summary", styles["Heading2"]),
    ]
    summary_data = [
        ["Metric", "Value"],
        ["Total Applications", str(stats.get("total_applied", 0))],
        ["Response Rate", f"{stats.get('response_rate', 0.0) * 100:.0f}%"],
        ["Interview Rate", f"{interview_rate * 100:.0f}%"],
        ["Applied This Week", str(stats.get("applied_this_week", 0))],
    ]
    tbl = Table(summary_data, colWidths=[3 * inch, 2 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366F1")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(tbl)
    return elements


def _pdf_apps_elements(styles: Any, apps: list[dict]) -> list:
    """Return flowables for the applications table."""
    from reportlab.platypus import Paragraph, Spacer, Table, TableStyle  # noqa: PLC0415
    from reportlab.lib import colors  # noqa: PLC0415
    from reportlab.lib.units import inch  # noqa: PLC0415

    elements: list = [Spacer(1, 0.4 * inch), Paragraph("Applications", styles["Heading2"])]
    rows = [["Company", "Role", "Stage", "Applied", "Fit"]]
    for app in apps:
        applied = app.get("date_applied")
        applied_str = applied.strftime("%Y-%m-%d") if isinstance(applied, datetime) else str(applied or "")[:10]
        fit = app.get("ai_analysis", {}).get("fit_score")
        rows.append([
            app.get("company") or "—",
            (app.get("role_title") or "—")[:40],
            app.get("current_stage") or "—",
            applied_str,
            str(fit) if fit is not None else "—",
        ])
    tbl = Table(rows, colWidths=[1.6 * inch, 2.2 * inch, 1.2 * inch, 1.0 * inch, 0.5 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366F1")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(tbl)
    return elements


def _pdf_funnel_elements(styles: Any, funnel_data: list[dict]) -> list:
    """Return flowables for the funnel summary table."""
    from reportlab.platypus import Paragraph, Spacer, Table, TableStyle  # noqa: PLC0415
    from reportlab.lib import colors  # noqa: PLC0415
    from reportlab.lib.units import inch  # noqa: PLC0415

    elements: list = [Spacer(1, 0.4 * inch), Paragraph("Stage Funnel", styles["Heading2"])]
    rows = [["Stage", "Entered", "Converted", "Rate", "Avg Days"]]
    for s in funnel_data:
        rows.append([
            s.get("stage", ""),
            str(s.get("entered_count", 0)),
            str(s.get("exited_to_next_count", 0)),
            f"{s.get('conversion_rate', 0.0) * 100:.0f}%",
            str(s.get("avg_days_in_stage") or "—"),
        ])
    tbl = Table(rows, colWidths=[1.8 * inch, 1.1 * inch, 1.1 * inch, 1.0 * inch, 1.0 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366F1")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(tbl)
    return elements


def _pdf_goal_elements(styles: Any, applied_this_week: int, weekly_goal: int) -> list:
    """Return flowables for the weekly goal progress section."""
    from reportlab.platypus import Paragraph, Spacer  # noqa: PLC0415
    from reportlab.lib.units import inch  # noqa: PLC0415

    pct = min(100, round(applied_this_week / weekly_goal * 100)) if weekly_goal > 0 else 0
    return [
        Spacer(1, 0.4 * inch),
        Paragraph("Weekly Goal Progress", styles["Heading2"]),
        Paragraph(
            f"{applied_this_week} / {weekly_goal} applications this week ({pct}% of goal)",
            styles["Normal"],
        ),
    ]


def _build_pdf_bytes(
    user_doc: dict, stats: dict, apps: list[dict], funnel_data: list[dict]
) -> bytes:
    """Assemble all sections into a PDF and return raw bytes."""
    from io import BytesIO  # noqa: PLC0415
    from reportlab.lib.pagesizes import letter  # noqa: PLC0415
    from reportlab.lib.styles import getSampleStyleSheet  # noqa: PLC0415
    from reportlab.platypus import SimpleDocTemplate  # noqa: PLC0415

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.75 * 72, bottomMargin=0.75 * 72)
    styles = getSampleStyleSheet()
    export_date = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    user_name = user_doc.get("display_name") or user_doc.get("email") or "User"
    entered_by_stage = {s["stage"]: s["entered_count"] for s in funnel_data}
    total = stats.get("total_applied", 0)
    interview_entered = sum(entered_by_stage.get(st, 0) for st in PDF_INTERVIEW_STAGES)
    interview_rate = round(interview_entered / total, 2) if total > 0 else 0.0
    weekly_goal: int = user_doc.get("weekly_goal", 0)
    elements: list = []
    elements.extend(_pdf_cover_elements(styles, user_name, export_date, stats, interview_rate))
    elements.extend(_pdf_apps_elements(styles, apps))
    elements.extend(_pdf_funnel_elements(styles, funnel_data))
    if weekly_goal > 0:
        elements.extend(_pdf_goal_elements(styles, stats.get("applied_this_week", 0), weekly_goal))
    doc.build(elements)
    return buf.getvalue()


async def generate_pdf_report(user_id: str) -> bytes:
    """Fetch pipeline data and return a formatted PDF as bytes."""
    user_doc, stats, apps, funnel_data = await _fetch_pdf_data(user_id)
    return _build_pdf_bytes(user_doc, stats, apps, funnel_data)
