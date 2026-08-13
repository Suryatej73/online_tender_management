import datetime
from django.db import connection
from django.core.cache import cache
from .tasks import ping_celery_task

try:
    from rest_framework.views import APIView
    from rest_framework.response import Response
    from rest_framework import status
except ImportError:
    from django.views import View
    from django.http import JsonResponse

    class APIView(View):
        def dispatch(self, request, *args, **kwargs):
            handler = getattr(self, request.method.lower(), None)
            if handler:
                res = handler(request, *args, **kwargs)
                return res
            return JsonResponse({'error': 'Method not allowed'}, status=405)

    def Response(data, status=200):
        return JsonResponse(data, status=status)

    class status:
        HTTP_200_OK = 200
        HTTP_202_ACCEPTED = 202
        HTTP_500_INTERNAL_SERVER_ERROR = 500



class HealthCheckView(APIView):
    """
    API endpoint for checking system health across Database, Redis, Celery, and Django.
    """
    def get(self, request):
        db_ok = False
        db_message = "Disconnected"
        try:
            connection.ensure_connection()
            db_ok = True
            db_message = "Connected to Database"
        except Exception as e:
            db_message = f"DB Status: {str(e)}"

        redis_ok = False
        redis_message = "Disconnected"
        try:
            cache.set('health_ping', 'pong', timeout=10)
            val = cache.get('health_ping')
            if val == 'pong':
                redis_ok = True
                redis_message = "Connected to Redis Cache"
        except Exception as e:
            redis_message = f"Redis Status: {str(e)}"

        celery_ok = False
        celery_message = "Task queue initialized"
        try:
            res = ping_celery_task.delay()
            celery_ok = True
            celery_message = f"Celery task dispatched (Task ID: {res.id})"
        except Exception as e:
            celery_message = f"Celery Status: {str(e)}"

        all_operational = db_ok and redis_ok and celery_ok

        return Response({
            "project": "tenderX - Online Tender Management System",
            "module": "M1 - Project Setup (Docker, Git, CI/CD, Django + React)",
            "system_status": "OPERATIONAL" if all_operational else "PARTIAL / DEV_READY",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "services": {
                "django": {"status": "online", "details": "Django 4.2 REST API Server"},
                "postgresql": {"status": "online" if db_ok else "offline", "details": db_message},
                "redis": {"status": "online" if redis_ok else "offline", "details": redis_message},
                "celery": {"status": "online" if celery_ok else "offline", "details": celery_message},
            }
        }, status=status.HTTP_200_OK)


class TriggerTaskView(APIView):
    """
    API endpoint to trigger a sample background Celery task.
    """
    def post(self, request):
        try:
            task = ping_celery_task.delay()
            return Response({
                "message": "Celery background task dispatched!",
                "task_id": task.id
            }, status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
