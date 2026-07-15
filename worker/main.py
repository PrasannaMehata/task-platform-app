import os
import sys
import time
import json
import logging
import signal
import threading
from datetime import datetime
from urllib.parse import urlparse
from http.server import BaseHTTPRequestHandler, HTTPServer
import redis
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv

# Load local environment variables if present
load_dotenv()

# Setup structured JSON logging
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "level": record.levelname,
            "time": datetime.utcnow().isoformat() + "Z",
            "pid": os.getpid(),
            "hostname": os.environ.get("HOSTNAME", "local-worker"),
            "msg": record.getMessage()
        }
        if record.exc_info:
            log_record["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

logger = logging.getLogger("worker")
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Configuration from env vars
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://127.0.0.1:27017/task_platform")
REDIS_URL = os.environ.get("REDIS_URL", "redis://127.0.0.1:6379")
CONSUMER_GROUP = "workers"
STREAM_NAME = "tasks"
CONSUMER_NAME = os.environ.get("HOSTNAME", "local-worker")

# Shared clients
mongo_client = None
db = None
redis_client = None

# Graceful shutdown state
shutdown_event = threading.Event()
active_processing = False
active_processing_lock = threading.Lock()

def get_db():
    global mongo_client, db
    if not mongo_client:
        logger.info(f"Connecting to MongoDB with URI: {MONGO_URI}")
        mongo_client = MongoClient(MONGO_URI)
        # Parse DB name from URI or default to task_platform
        parsed = urlparse(MONGO_URI)
        db_name = parsed.path.strip('/')
        if not db_name:
            db_name = "task_platform"
        db = mongo_client[db_name]
    return db

def get_redis():
    global redis_client
    if not redis_client:
        logger.info(f"Connecting to Redis with URL: {REDIS_URL}")
        redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    return redis_client

# Health Check HTTP Server
class HealthRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/healthz":
            mongo_ok = False
            redis_ok = False
            try:
                # Ping Mongo
                get_db().command("ping")
                mongo_ok = True
            except Exception as e:
                logger.error(f"Health check MongoDB ping failed: {str(e)}")

            try:
                # Ping Redis
                get_redis().ping()
                redis_ok = True
            except Exception as e:
                logger.error(f"Health check Redis ping failed: {str(e)}")

            if mongo_ok and redis_ok:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                response = {"status": "healthy", "mongodb": "connected", "redis": "connected"}
                self.wfile.write(json.dumps(response).encode("utf-8"))
            else:
                self.send_response(503)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                response = {
                    "status": "unhealthy",
                    "mongodb": "connected" if mongo_ok else "disconnected",
                    "redis": "connected" if redis_ok else "disconnected"
                }
                self.wfile.write(json.dumps(response).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Override to suppress standard HTTP logging to stdout
        pass

def run_health_server():
    server_address = ("", 8000)
    httpd = HTTPServer(server_address, HealthRequestHandler)
    logger.info("Health server listening on port 8000")
    
    # Handle shutdown of health server cleanly
    def check_shutdown():
        while not shutdown_event.is_set():
            time.sleep(0.5)
        httpd.shutdown()
        logger.info("Health server thread shutting down")

    t = threading.Thread(target=check_shutdown, daemon=True)
    t.start()
    
    httpd.serve_forever()

# Task processing runner
def execute_operation(operation, input_text):
    if operation == "uppercase":
        return input_text.upper()
    elif operation == "lowercase":
        return input_text.lower()
    elif operation == "reverse_string":
        return input_text[::-1]
    elif operation == "word_count":
        return str(len(input_text.split()))
    else:
        raise ValueError(f"Unknown operation: {operation}")

def process_message(message_id, fields):
    global active_processing
    task_id_str = fields.get("taskId")
    if not task_id_str:
        logger.warn(f"Message {message_id} does not contain taskId. Acknowledging and skipping.")
        get_redis().xack(STREAM_NAME, CONSUMER_GROUP, message_id)
        return

    # Track in-flight state for graceful shutdown
    with active_processing_lock:
        active_processing = True

    try:
        task_id = ObjectId(task_id_str)
        database = get_db()
        task = database.tasks.find_one({"_id": task_id})

        if not task:
            logger.warn(f"Task {task_id_str} not found in database. Acknowledging message.")
            get_redis().xack(STREAM_NAME, CONSUMER_GROUP, message_id)
            return

        # Idempotency check: if already running or completed, skip processing
        status = task.get("status", "pending")
        if status in ["success", "failed"]:
            logger.info(f"Task {task_id_str} already in terminal state '{status}'. Acknowledging message.")
            get_redis().xack(STREAM_NAME, CONSUMER_GROUP, message_id)
            return
        
        # If status is running, check if we need to skip (meaning another worker took it)
        # However, if we reclaimed it, status might be running. We check retryCount
        retry_count = task.get("retryCount", 0)

        # Transition status to running (with log)
        logger.info(f"Processing task {task_id_str} (operation: {task.get('operationType')})")
        database.tasks.update_one(
            {"_id": task_id},
            {
                "$set": {"status": "running", "updatedAt": datetime.utcnow()},
                "$push": {
                    "logs": {
                        "timestamp": datetime.utcnow(),
                        "message": f"Task processing started by worker {CONSUMER_NAME} (Attempt {retry_count + 1})"
                    }
                }
            }
        )

        try:
            # Perform computation
            result = execute_operation(task.get("operationType"), task.get("inputText"))
            
            # Save successful output
            database.tasks.update_one(
                {"_id": task_id},
                {
                    "$set": {
                        "status": "success",
                        "result": result,
                        "updatedAt": datetime.utcnow()
                    },
                    "$push": {
                        "logs": {
                            "timestamp": datetime.utcnow(),
                            "message": f"Task completed successfully by worker {CONSUMER_NAME}."
                        }
                    }
                }
            )
            logger.info(f"Task {task_id_str} processed successfully")
            get_redis().xack(STREAM_NAME, CONSUMER_GROUP, message_id)

        except Exception as op_err:
            logger.error(f"Error executing operation on task {task_id_str}: {str(op_err)}")
            
            # Increment retry count and retry with backoff or mark as failed
            next_retry = retry_count + 1
            if next_retry < 3:
                # Save incremental retry state
                database.tasks.update_one(
                    {"_id": task_id},
                    {
                        "$set": {"retryCount": next_retry, "updatedAt": datetime.utcnow()},
                        "$push": {
                            "logs": {
                                "timestamp": datetime.utcnow(),
                                "message": f"Execution failed: {str(op_err)}. Retrying task (Attempt {next_retry + 1}/3)..."
                            }
                        }
                    }
                )
                # Exponential backoff
                backoff_time = 2 ** next_retry
                logger.info(f"Backing off for {backoff_time}s before releasing task {task_id_str}")
                time.sleep(backoff_time)
                # We do NOT XACK here, so it remains in PEL for the main loop or reclaim thread to pick up
            else:
                # Mark as permanently failed after 3 attempts
                database.tasks.update_one(
                    {"_id": task_id},
                    {
                        "$set": {
                            "status": "failed",
                            "error": str(op_err),
                            "updatedAt": datetime.utcnow()
                        },
                        "$push": {
                            "logs": {
                                "timestamp": datetime.utcnow(),
                                "message": f"Task execution failed after 3 attempts. Final error: {str(op_err)}"
                            }
                        }
                    }
                )
                logger.error(f"Task {task_id_str} marked as FAILED after exceeding retries")
                get_redis().xack(STREAM_NAME, CONSUMER_GROUP, message_id)

    except Exception as e:
        logger.error(f"Error processing message {message_id}: {str(e)}")
    finally:
        with active_processing_lock:
            active_processing = False

# Background Reclaim Loop
def run_reclaim_loop():
    logger.info("Background reclaim loop started")
    r = get_redis()
    
    while not shutdown_event.is_set():
        try:
            # Query XPENDING for messages pending for workers
            # We fetch up to 20 pending entries
            pending_info = r.xpending_range(STREAM_NAME, CONSUMER_GROUP, "-", "+", 20)
            
            now_ms = time.time() * 1000
            for entry in pending_info:
                message_id = entry["message_id"]
                consumer = entry["consumer"]
                idle_time_ms = entry["time_since_delivered"]
                delivery_count = entry["times_delivered"]
                
                # If idle for more than 60 seconds and not owned by us (or owned by us but crashed previously)
                # We reclaim it to our consumer name
                if idle_time_ms > 60000:
                    logger.info(f"Pending message {message_id} delivered to {consumer} is idle for {idle_time_ms/1000:.1f}s. Reclaiming...")
                    
                    # XCLAIM stream, group, consumer, min-idle-time, message_ids
                    # We reclaim it and reset the idle clock
                    reclaimed = r.xclaim(STREAM_NAME, CONSUMER_GROUP, CONSUMER_NAME, min_idle_time=60000, message_ids=[message_id])
                    if reclaimed:
                        logger.info(f"Successfully reclaimed pending message {message_id} to consumer {CONSUMER_NAME}")
                        # Reclaimed messages will be picked up by our main loop reading from '0'
                        
        except Exception as e:
            # XPENDING/XCLAIM might fail if stream doesn't exist yet, which is fine on fresh startup
            pass
            
        # Run reclaim check every 30 seconds
        shutdown_event.wait(timeout=30)
        
    logger.info("Background reclaim loop thread shutting down")

# Main Consumer Loop
def run_consumer_loop():
    r = get_redis()
    
    # Ensure consumer group exists
    try:
        r.xgroup_create(STREAM_NAME, CONSUMER_GROUP, id="0", mkstream=True)
        logger.info(f"Created Redis Stream consumer group '{CONSUMER_GROUP}' on stream '{STREAM_NAME}'")
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" in str(e):
            logger.info(f"Redis Stream consumer group '{CONSUMER_GROUP}' already exists")
        else:
            logger.fatal(f"Error creating Redis Stream consumer group: {str(e)}")
            sys.exit(1)

    logger.info(f"Worker daemon starting consumer loop (Group: {CONSUMER_GROUP}, Consumer: {CONSUMER_NAME})")
    
    while not shutdown_event.is_set():
        try:
            logger.info("Main loop: checking pending messages (ID=0)...")
            pending_messages = r.xreadgroup(CONSUMER_GROUP, CONSUMER_NAME, {STREAM_NAME: "0"}, count=1)
            logger.info(f"Main loop: pending check returned {len(pending_messages) if pending_messages else 0} streams")
            
            if pending_messages:
                stream, messages = pending_messages[0]
                if messages:
                    logger.info(f"Main loop: found {len(messages)} pending messages")
                    for message_id, fields in messages:
                        logger.info(f"Processing pending/reclaimed message: {message_id}")
                        process_message(message_id, fields)
                    continue

            logger.info("Main loop: blocking on new messages (ID=>) for 5s...")
            new_messages = r.xreadgroup(CONSUMER_GROUP, CONSUMER_NAME, {STREAM_NAME: ">"}, count=1, block=5000)
            logger.info(f"Main loop: new messages check returned {len(new_messages) if new_messages else 0} streams")
            
            if new_messages:
                stream, messages = new_messages[0]
                logger.info(f"Main loop: found {len(messages)} new messages")
                for message_id, fields in messages:
                    process_message(message_id, fields)
                    
        except (redis.exceptions.TimeoutError, redis.exceptions.ConnectionError) as ce:
            if "Timeout reading from socket" in str(ce):
                # Expected timeout when blocking read receives no new messages
                pass
            else:
                logger.error(f"Connection error in main consumer loop: {str(ce)}")
                time.sleep(2)
        except Exception as e:
            logger.error(f"Error in main consumer loop: {str(e)}")
            time.sleep(2)

# Graceful shutdown signal handler
def handle_shutdown(signum, frame):
    logger.info(f"Received signal {signum}. Initiating graceful shutdown...")
    shutdown_event.set()
    
    # Wait for active processing to finish (up to 10 seconds)
    wait_start = time.time()
    while active_processing and (time.time() - wait_start) < 10:
        logger.info("Waiting for active task to complete before exit...")
        time.sleep(0.5)
        
    # Close connections
    global mongo_client, redis_client
    if mongo_client:
        mongo_client.close()
        logger.info("MongoDB connection closed cleanly")
    if redis_client:
        redis_client.close()
        logger.info("Redis connection closed cleanly")
        
    logger.info("Worker gracefully stopped. Exiting.")
    sys.exit(0)

if __name__ == "__main__":
    # Register SIGTERM and SIGINT signal handlers
    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)

    # Initialize connection clients on startup
    try:
        get_db()
        get_redis()
    except Exception as init_err:
        logger.fatal(f"Error connecting to dependencies on startup: {str(init_err)}")
        sys.exit(1)

    # Start health HTTP server in a daemon thread
    health_thread = threading.Thread(target=run_health_server, daemon=True)
    health_thread.start()

    # Start background task reclaim loop in a daemon thread
    reclaim_thread = threading.Thread(target=run_reclaim_loop, daemon=True)
    reclaim_thread.start()

    # Start consumer loop (blocking, main thread)
    run_consumer_loop()
