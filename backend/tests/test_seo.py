"""Tests for SEO endpoints: /robots.txt and /sitemap.xml."""

import pytest

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_robots_txt_returns_200(client):
    """GET /robots.txt returns 200 with plain text content."""
    response = await client.get("/robots.txt")

    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]


async def test_robots_txt_allows_root(client):
    """robots.txt allows all crawlers at /."""
    response = await client.get("/robots.txt")

    content = response.text
    assert "User-agent: *" in content
    assert "Allow: /" in content


async def test_robots_txt_disallows_authenticated_pages(client):
    """robots.txt disallows dashboard, settings, calendar, analytics, and activity."""
    response = await client.get("/robots.txt")

    content = response.text
    assert "Disallow: /dashboard" in content
    assert "Disallow: /settings" in content
    assert "Disallow: /calendar" in content
    assert "Disallow: /analytics" in content
    assert "Disallow: /activity" in content


async def test_robots_txt_includes_sitemap(client):
    """robots.txt includes a Sitemap directive pointing to /sitemap.xml."""
    response = await client.get("/robots.txt")

    content = response.text
    assert "Sitemap:" in content
    assert "/sitemap.xml" in content


async def test_sitemap_xml_returns_200(client):
    """GET /sitemap.xml returns 200 with XML content type."""
    response = await client.get("/sitemap.xml")

    assert response.status_code == 200
    assert "xml" in response.headers["content-type"]


async def test_sitemap_xml_is_valid_xml(client):
    """sitemap.xml has proper XML declaration and urlset root."""
    response = await client.get("/sitemap.xml")

    content = response.text
    assert content.startswith("<?xml")
    assert "<urlset" in content
    assert "</urlset>" in content


async def test_sitemap_xml_contains_required_urls(client):
    """sitemap.xml includes /, /login, /register, and /jobs URLs."""
    response = await client.get("/sitemap.xml")

    content = response.text
    assert "<loc>" in content
    assert "/login" in content
    assert "/register" in content
    assert "/jobs" in content


async def test_sitemap_xml_has_priorities(client):
    """sitemap.xml includes priority values for all entries."""
    response = await client.get("/sitemap.xml")

    content = response.text
    assert "<priority>" in content
    assert "1.0" in content
    assert "0.8" in content
    assert "0.3" in content
