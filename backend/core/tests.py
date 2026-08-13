from django.test import TestCase
from django.urls import reverse
import json

try:
    from rest_framework import status
    HTTP_OK = status.HTTP_200_OK
except ImportError:
    HTTP_OK = 200


class CoreModule1Tests(TestCase):
    def test_health_check_endpoint(self):
        """Verify that health check endpoint returns 200 OK and valid project metadata."""
        url = reverse('health_check')
        response = self.client.get(url)
        self.assertEqual(response.status_code, HTTP_OK)

        data = response.json() if callable(getattr(response, 'json', None)) else json.loads(response.content)
        self.assertIn('project', data)
        self.assertIn('tenderX', data['project'])
        self.assertIn('services', data)
        self.assertEqual(data['services']['django']['status'], 'online')

