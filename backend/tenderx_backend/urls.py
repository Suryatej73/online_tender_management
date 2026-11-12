from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def root_health(request):
    return JsonResponse({
        "status": "healthy",
        "service": "TenderX Procurement Platform Engine",
        "version": "1.0.0"
    })

urlpatterns = [
    path('', root_health, name='root_health'),
    path('admin/', admin.site.urls),
    path('api/v1/', include('core.urls')),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/', include('accounts.urls')),
    path('api/v1/', include('tenders.urls')),
    path('api/v1/', include('vendors.urls')),
    path('api/v1/', include('bids.urls')),
    path('api/v1/documents/', include('documents.urls')),
]


