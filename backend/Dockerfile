# ── Stage 1: Builder ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# System dependencies needed to compile C-extension wheels (psycopg2, etc.)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Build wheels into a local directory so the runtime stage never needs a compiler.
RUN pip wheel --no-cache-dir --wheel-dir /build/wheels -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Only the runtime C library is needed — no compiler, no headers.
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/*

# Install pre-built wheels from the builder stage (no compilation here).
COPY --from=builder /build/wheels /tmp/wheels
RUN pip install --no-cache-dir /tmp/wheels/* && \
    rm -rf /tmp/wheels

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser

# Copy application code
COPY . .

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
