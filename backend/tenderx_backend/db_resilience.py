"""
Database connection and startup resilience for TenderX.
Protects against transient connection drops on restricted network environments
(such as academic/guest Wi-Fi firewalls or Supavisor pooler reconnects).
"""

import time
import logging

logger = logging.getLogger(__name__)

def apply_db_resilience():
    # 1. Resilient PostgreSQL connection creation with automatic retry
    try:
        from django.db.backends.postgresql.base import DatabaseWrapper
        _original_get_new_connection = getattr(DatabaseWrapper, '_tenderx_orig_get_new_connection', None)
        if _original_get_new_connection is None:
            _original_get_new_connection = DatabaseWrapper.get_new_connection
            DatabaseWrapper._tenderx_orig_get_new_connection = _original_get_new_connection

            def resilient_get_new_connection(self, conn_params):
                max_retries = 4
                transient_indicators = (
                    "unexpected eof",
                    "closed the connection",
                    "timeout",
                    "terminated abnormally",
                    "connection reset",
                    "could not connect to server",
                )
                for attempt in range(max_retries):
                    try:
                        return _original_get_new_connection(self, conn_params)
                    except Exception as exc:
                        err_str = str(exc).lower()
                        is_transient = any(msg in err_str for msg in transient_indicators)
                        if attempt < max_retries - 1 and is_transient:
                            backoff = 0.5 * (attempt + 1)
                            logger.warning(
                                "[DB Resilience] Database connection attempt %d/%d dropped: %s. Retrying in %.1fs...",
                                attempt + 1,
                                max_retries,
                                exc,
                                backoff,
                            )
                            time.sleep(backoff)
                            continue
                        raise

            DatabaseWrapper.get_new_connection = resilient_get_new_connection
    except Exception as exc:
        logger.debug("Could not patch DatabaseWrapper.get_new_connection: %s", exc)

    # 2. Resilient check_migrations during runserver boot
    try:
        from django.core.management.base import BaseCommand
        _original_check_migrations = getattr(BaseCommand, '_tenderx_orig_check_migrations', None)
        if _original_check_migrations is None:
            _original_check_migrations = BaseCommand.check_migrations
            BaseCommand._tenderx_orig_check_migrations = _original_check_migrations

            def resilient_check_migrations(self):
                try:
                    return _original_check_migrations(self)
                except Exception as exc:
                    err_str = str(exc).lower()
                    if any(msg in err_str for msg in ("connection", "ssl", "timeout", "closed", "operationalerror")):
                        # Soft warning rather than killing the main thread
                        if hasattr(self, 'stdout'):
                            self.stdout.write(
                                self.style.WARNING(
                                    f"[DB Resilience] Startup migration check deferred due to remote database network latency: {exc}\n"
                                    "The server will continue booting; queries will automatically reconnect with retry."
                                )
                            )
                    else:
                        raise

            BaseCommand.check_migrations = resilient_check_migrations
    except Exception as exc:
        logger.debug("Could not patch BaseCommand.check_migrations: %s", exc)
