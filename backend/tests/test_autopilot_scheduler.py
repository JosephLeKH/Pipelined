"""Tests that autopilot scan job is registered on the scheduler."""

from jobs.sync import create_scheduler


def test_scheduler_registers_autopilot_scan():
    scheduler = create_scheduler()
    job_ids = {job.id for job in scheduler.get_jobs()}
    assert "autopilot_scan" in job_ids
