from django.urls import path
from .views import HealthCheckView, TriggerTaskView

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health_check'),
    path('tasks/trigger/', TriggerTaskView.as_view(), name='trigger_task'),
]
