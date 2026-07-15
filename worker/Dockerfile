# Stage 1: Build dependency wheels
FROM python:3.11-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache gcc musl-dev libffi-dev

COPY requirements.txt .

RUN pip wheel --no-cache-dir --no-deps --wheel-dir /usr/src/app/wheels -r requirements.txt

# Stage 2: Final runner image
FROM python:3.11-alpine AS runner

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/wheels /wheels
COPY --from=builder /usr/src/app/requirements.txt .

RUN pip install --no-cache /wheels/*

# Create a non-root user
RUN addgroup -S workergroup && adduser -S workeruser -G workergroup

COPY main.py .

# Give ownership of /usr/src/app to workeruser
RUN chown -R workeruser:workergroup /usr/src/app

USER workeruser

# Expose local liveness/health port
EXPOSE 8000

CMD ["python", "-u", "main.py"]
