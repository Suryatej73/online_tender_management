from .db_resilience import apply_db_resilience

apply_db_resilience()

try:
    from .celery import app as celery_app
    __all__ = ('celery_app', 'apply_db_resilience')
except ImportError:
    __all__ = ('apply_db_resilience',)
