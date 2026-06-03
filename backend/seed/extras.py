"""Per-company extras (source_url, job_description) for seeded demo apps.

Single source of truth so build_demo_applications and the idempotent
backfill in demo_data both stay in sync. Adding a new field here makes
it land in fresh seeds and existing accounts on next startup.
"""


JOB_EXTRAS: dict[str, dict[str, str]] = {
    "Google": {
        "source_url": "https://careers.google.com/jobs/results/123456789-senior-software-engineer-ml-infrastructure/",
        "job_description": (
            "Google's ML Infrastructure team builds the distributed systems that "
            "power large-scale training and serving across the company, from "
            "Search ranking to Gemini.\n\n"
            "Responsibilities:\n"
            "- Design and operate distributed training pipelines on TPU pods "
            "(thousands of accelerators per job).\n"
            "- Improve scheduling, checkpointing, and fault tolerance for "
            "multi-week training runs.\n"
            "- Partner with research scientists to translate model architectures "
            "into efficient production systems.\n\n"
            "Minimum qualifications:\n"
            "- 5+ years of software engineering experience.\n"
            "- Strong Python and one systems language (C++, Go, or Rust).\n"
            "- Experience with distributed systems and high-performance computing.\n\n"
            "Preferred:\n"
            "- Experience with JAX, PyTorch, or TensorFlow internals.\n"
            "- Familiarity with TPUs, GPUs, or other accelerators."
        ),
    },
    "Stripe": {
        "source_url": "https://stripe.com/jobs/listing/backend-engineer-payments-platform/5478912",
        "job_description": (
            "Stripe's Payments Platform team owns the systems that move money "
            "for millions of businesses worldwide. We process tens of billions "
            "of dollars per year with five-nines availability requirements.\n\n"
            "What you'll do:\n"
            "- Build idempotent, event-driven services in Go and Ruby that "
            "process card, bank, and wallet payments at scale.\n"
            "- Design APIs that thousands of merchants integrate against; "
            "weigh backward compatibility against velocity.\n"
            "- Own production reliability for payment authorization and capture "
            "flows; participate in oncall.\n\n"
            "What we're looking for:\n"
            "- 4+ years building backend services in production.\n"
            "- Deep familiarity with event-driven architectures, idempotency, "
            "and exactly-once semantics.\n"
            "- Strong opinions about API design and developer experience.\n\n"
            "Remote (US) or any Stripe hub."
        ),
    },
    "Anthropic": {
        "source_url": "https://www.anthropic.com/jobs/4923847-member-of-technical-staff",
        "job_description": (
            "Anthropic is an AI safety company. Members of Technical Staff work "
            "directly on training, evaluating, and deploying Claude.\n\n"
            "About the role:\n"
            "- Contribute to large-scale model training infrastructure, "
            "including data pipelines, RLHF tooling, and evals.\n"
            "- Build product surfaces that put frontier models in users' hands "
            "safely (Claude.ai, Claude Code, the API).\n"
            "- Collaborate across research, product, and policy teams.\n\n"
            "We're looking for:\n"
            "- Strong engineering fundamentals across systems and applied ML.\n"
            "- Comfort working at the intersection of research code and "
            "production reliability.\n"
            "- Genuine interest in AI safety as a technical problem.\n\n"
            "Hybrid in SF (3 days/week). Compensation includes a competitive "
            "base, meaningful equity, and benefits."
        ),
    },
    "OpenAI": {
        "source_url": "https://openai.com/careers/member-of-technical-staff-applied-research-engineering/",
        "job_description": (
            "OpenAI's Applied Research Engineering teams turn frontier research "
            "into products used by hundreds of millions of people every week.\n\n"
            "What you'll do:\n"
            "- Train, fine-tune, and evaluate models for ChatGPT and the API.\n"
            "- Build tooling for human feedback, evaluations, and safety "
            "testing at scale.\n"
            "- Ship features end-to-end, from research prototype to production "
            "serving.\n\n"
            "You might be a fit if you:\n"
            "- Have shipped production ML systems or research code at scale.\n"
            "- Are equally comfortable reading a paper and debugging a CUDA "
            "kernel.\n"
            "- Want to work in person with a small, dense team.\n\n"
            "San Francisco, 3+ days/week onsite. Comp: competitive base + "
            "meaningful PPUs (4-year vest, 1-year cliff)."
        ),
    },
    "Linear": {
        "source_url": "https://linear.app/careers/software-engineer",
        "job_description": (
            "Linear is the project planning tool top engineering teams use to "
            "build software. We're a small, fully remote team building "
            "thoughtful, fast software.\n\n"
            "What you'll do:\n"
            "- Ship features end-to-end across our TypeScript/React frontend "
            "and Node.js + Postgres backend.\n"
            "- Own user-facing problems from spec to launch; we don't have PMs.\n"
            "- Care deeply about performance, design quality, and craft.\n\n"
            "About you:\n"
            "- 4+ years building consumer or prosumer SaaS.\n"
            "- Strong product sensibility — you can tell when a UI feels right "
            "and when it doesn't.\n"
            "- Comfort with ambiguity and a high bar for what you ship.\n\n"
            "Fully remote (Americas + EU timezones)."
        ),
    },
    "Notion": {
        "source_url": "https://www.notion.so/careers/product-engineer-growth",
        "job_description": (
            "Notion's Growth team owns the user journey from first visit "
            "through activation and expansion across teams and workspaces.\n\n"
            "Responsibilities:\n"
            "- Design and run A/B experiments on onboarding, invitations, and "
            "template discovery.\n"
            "- Build features that increase activation rate and team adoption.\n"
            "- Instrument funnels; partner closely with data and design.\n\n"
            "You should have:\n"
            "- 3+ years of full-stack experience (TypeScript, React, Node).\n"
            "- Demonstrated ownership of growth metrics — not just shipping "
            "features but moving numbers.\n"
            "- Strong product instincts and an experimentation mindset.\n\n"
            "Hybrid in SF (2 days/week)."
        ),
    },
    "Vercel": {
        "source_url": "https://vercel.com/careers/developer-experience-engineer-9482",
        "job_description": (
            "Vercel's Developer Experience team builds the tools and surfaces "
            "millions of frontend developers use every day — the Next.js "
            "framework, the Vercel CLI, and our dashboard.\n\n"
            "What you'll work on:\n"
            "- Contribute to Next.js and adjacent OSS projects.\n"
            "- Improve the local dev loop: faster builds, better errors, "
            "richer logs.\n"
            "- Talk to developers, write docs, and turn pain points into "
            "shipped fixes.\n\n"
            "You should bring:\n"
            "- Deep Next.js / React experience.\n"
            "- A track record of open-source contributions.\n"
            "- Strong writing skills — you'll author docs and changelogs that "
            "developers actually read.\n\n"
            "Fully remote (Americas + EU)."
        ),
    },
    "Airbnb": {
        "source_url": "https://careers.airbnb.com/positions/software-engineer-new-grad-2026/",
        "job_description": (
            "Airbnb is hiring new-grad Software Engineers across our Trips, "
            "Listings, Search, and Payments orgs. Team matching happens after "
            "offer.\n\n"
            "What you'll do:\n"
            "- Ship code to production within your first few weeks via our "
            "structured onboarding (RAMP) program.\n"
            "- Work across the stack — Kotlin / Java services, React frontend, "
            "MySQL / Spark data — depending on team assignment.\n"
            "- Pair with senior engineers and a dedicated mentor during ramp.\n\n"
            "Requirements:\n"
            "- BS or MS in Computer Science or equivalent (graduating "
            "Dec 2025 – June 2026).\n"
            "- Coursework or internship experience in data structures, "
            "algorithms, and at least one full-stack project.\n"
            "- Strong problem-solving and communication skills.\n\n"
            "Hybrid in San Francisco (3 days/week)."
        ),
    },
}


def extras_for(company: str) -> dict[str, str]:
    """Return source_url + job_description for a seeded company, or empty dict."""
    return JOB_EXTRAS.get(company, {})
