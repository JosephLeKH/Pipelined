"""Tool implementations for the Interview Prep Agent."""

import httpx
import structlog
from bs4 import BeautifulSoup

logger = structlog.get_logger()

_REDDIT_HEADERS = {"User-Agent": "Pipelined/1.0 (interview prep tool; contact umikikh@gmail.com)"}
_MAX_PAGE_CHARS = 3000
_REDDIT_RESULTS = 5
_EXA_RESULTS = 5
_EXA_MAX_CHARS = 2000


async def web_search(query: str, exa_api_key: str) -> str:
    """Search the web via Exa API. Use for company news, culture, interview experiences."""
    if not exa_api_key:
        return "web_search unavailable: EXA_API_KEY not configured"

    payload = {
        "query": query,
        "numResults": _EXA_RESULTS,
        "contents": {"text": {"maxCharacters": _EXA_MAX_CHARS}},
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.exa.ai/search",
            json=payload,
            headers={"x-api-key": exa_api_key, "Content-Type": "application/json"},
        )
        resp.raise_for_status()

    results = resp.json().get("results", [])
    if not results:
        return f"No results found for: {query}"

    lines: list[str] = [f"Search results for: {query}\n"]
    for i, r in enumerate(results, 1):
        title = r.get("title", "Untitled")
        url = r.get("url", "")
        text = r.get("text", "").strip()
        lines.append(f"[{i}] {title}\nURL: {url}\n{text[:_EXA_MAX_CHARS]}\n")

    return "\n".join(lines)


async def get_levels_data(company: str, role: str, location: str, yoe: int, exa_api_key: str) -> str:
    """Get compensation data by searching Levels.fyi via Exa."""
    query = f"site:levels.fyi {company} {role} {location} salary total compensation"
    raw = await web_search(query, exa_api_key)

    header = (
        f"Levels.fyi compensation data for {company} | {role} | {location} | ~{yoe} YOE\n\n"
    )
    return header + raw


async def search_reddit(subreddit: str, query: str) -> str:
    """Search Reddit for interview experiences using the public JSON API (no credentials)."""
    params = {
        "q": query,
        "restrict_sr": "1",
        "sort": "relevance",
        "limit": str(_REDDIT_RESULTS),
        "t": "year",
    }
    url = f"https://www.reddit.com/r/{subreddit}/search.json"

    async with httpx.AsyncClient(timeout=15, headers=_REDDIT_HEADERS, follow_redirects=True) as client:
        resp = await client.get(url, params=params)

    if resp.status_code != 200:
        return f"Reddit search failed (HTTP {resp.status_code}) for r/{subreddit}: {query}"

    posts = resp.json().get("data", {}).get("children", [])
    if not posts:
        return f"No Reddit posts found in r/{subreddit} for: {query}"

    lines: list[str] = [f"Reddit r/{subreddit} results for: {query}\n"]
    for i, post in enumerate(posts, 1):
        d = post.get("data", {})
        title = d.get("title", "")
        score = d.get("score", 0)
        selftext = d.get("selftext", "").strip()
        permalink = "https://reddit.com" + d.get("permalink", "")
        lines.append(f"[{i}] {title} (score: {score})\n{permalink}\n{selftext[:800]}\n")

    return "\n".join(lines)


async def fetch_page(url: str) -> str:
    """Fetch and extract main text content from a URL."""
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        try:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            return f"Failed to fetch {url}: HTTP {e.response.status_code}"
        except httpx.RequestError as e:
            return f"Failed to fetch {url}: {e}"

    soup = BeautifulSoup(resp.text, "html.parser")

    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    main = soup.find("main") or soup.find("article") or soup.find("body")
    text = (main or soup).get_text(separator="\n", strip=True)

    lines = [line for line in text.splitlines() if line.strip()]
    return "\n".join(lines)[:_MAX_PAGE_CHARS]
