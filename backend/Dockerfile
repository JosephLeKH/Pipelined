# syntax=docker/dockerfile:1

# ── builder stage ──────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── runtime stage ──────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 8000

# --proxy-headers + --forwarded-allow-ips=* trusts X-Forwarded-* headers so
# FastAPI generates https:// (not http://) URLs in trailing-slash redirects
# behind DigitalOcean App Platform's TLS terminator. The `*` is safe ONLY
# because App Platform exposes this container exclusively through its own
# ingress — no public port. If you ever move to a setup where uvicorn can
# receive direct traffic (e.g. raw VM with port 8000 open), tighten this to
# the actual ingress CIDR or drop --proxy-headers entirely.
ENTRYPOINT ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
