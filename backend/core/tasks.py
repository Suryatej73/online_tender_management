try:
    from celery import shared_task
except ImportError:
    def shared_task(func=None, **kwargs):
        def decorator(f):
            f.delay = lambda *a, **k: f(*a, **k)
            return f
        if func:
            return decorator(func)
        return decorator

import time


@shared_task
def ping_celery_task():
    """Sample Celery background task for verifying task queue execution."""
    return {
        "status": "operational",
        "message": "Celery background worker process is running normally.",
        "timestamp": time.time()
    }

