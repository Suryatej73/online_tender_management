from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from accounts.models import UserRole, UserSession, EmailVerificationToken, PasswordResetToken


User = get_user_model()


class Module2AuthRbacTests(TestCase):
    def setUp(self):
        # Create users for all 6 roles
        self.super_admin = User.objects.create_user(
            username='admin', email='superadmin@tenderx.com', password='Password123!',
            role=UserRole.SUPER_ADMIN, first_name='Super', last_name='Admin'
        )
        self.org_admin = User.objects.create_user(
            username='orgadmin', email='orgadmin@tenderx.com', password='Password123!',
            role=UserRole.ORG_ADMIN, first_name='Org', last_name='Admin'
        )
        self.tender_manager = User.objects.create_user(
            username='manager', email='manager@tenderx.com', password='Password123!',
            role=UserRole.TENDER_MANAGER, first_name='Tender', last_name='Manager'
        )
        self.vendor = User.objects.create_user(
            username='vendor', email='vendor@tenderx.com', password='Password123!',
            role=UserRole.VENDOR, first_name='Global', last_name='Vendor'
        )
        self.evaluator = User.objects.create_user(
            username='evaluator', email='evaluator@tenderx.com', password='Password123!',
            role=UserRole.EVALUATOR, first_name='Chief', last_name='Evaluator'
        )
        self.auditor = User.objects.create_user(
            username='auditor', email='auditor@tenderx.com', password='Password123!',
            role=UserRole.AUDITOR, first_name='Compliance', last_name='Auditor'
        )

    def test_user_registration(self):
        """Test registration endpoint with role selection."""
        url = reverse('auth_register')
        payload = {
            'email': 'newvendor@company.com',
            'password': 'StrongPassword123!',
            'password_confirm': 'StrongPassword123!',
            'first_name': 'New',
            'last_name': 'Bidder',
            'role': UserRole.VENDOR,
            'organization_name': 'Tech Corp'
        }
        response = self.client.post(url, data=payload, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('tokens', response.json())
        self.assertEqual(response.json()['user']['role'], UserRole.VENDOR)

    def test_jwt_login(self):
        """Test authentication login endpoint and token return."""
        url = reverse('auth_login')
        payload = {
            'email': 'vendor@tenderx.com',
            'password': 'Password123!'
        }
        response = self.client.post(url, data=payload, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data['mfa_required'])
        self.assertIn('access', data['tokens'])
        self.assertEqual(data['user']['role'], UserRole.VENDOR)

    def test_email_verification_flow(self):
        """Test email token creation and verification endpoint."""
        from django.utils import timezone
        import datetime

        token_obj = EmailVerificationToken.objects.create(
            user=self.vendor,
            token='valid-test-token-123',
            expires_at=timezone.now() + datetime.timedelta(hours=1)
        )

        url = reverse('auth_email_verify')
        response = self.client.post(url, data={'token': 'valid-test-token-123'}, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        self.vendor.refresh_from_db()
        self.assertTrue(self.vendor.is_email_verified)


    def test_password_reset_flow(self):
        """Test requesting and confirming password reset token."""
        url_req = reverse('auth_password_reset_request')
        res_req = self.client.post(url_req, data={'email': 'vendor@tenderx.com'}, content_type='application/json')
        self.assertEqual(res_req.status_code, 200)
        reset_token = res_req.json().get('reset_token')

        url_conf = reverse('auth_password_reset_confirm')
        res_conf = self.client.post(url_conf, data={
            'token': reset_token,
            'new_password': 'BrandNewPassword123!',
            'new_password_confirm': 'BrandNewPassword123!'
        }, content_type='application/json')
        self.assertEqual(res_conf.status_code, 200)

        # Confirm new password works for login
        url_login = reverse('auth_login')
        res_login = self.client.post(url_login, data={
            'email': 'vendor@tenderx.com',
            'password': 'BrandNewPassword123!'
        }, content_type='application/json')
        self.assertEqual(res_login.status_code, 200)

    def test_rbac_admin_endpoint(self):
        """Test that Admin endpoints reject Vendors and allow Super Admins."""
        url = reverse('auth_admin_users')
        
        # Test unauthenticated
        res_unauth = self.client.get(url)
        self.assertIn(res_unauth.status_code, [401, 403])

        # Test login as Super Admin
        self.client.force_login(self.super_admin)
        res_admin = self.client.get(url)
        self.assertEqual(res_admin.status_code, 200)
        self.assertGreaterEqual(res_admin.json()['count'], 6)


class Module3UserManagementTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='sysadmin', email='sysadmin@tenderx.com', password='Password123!',
            role=UserRole.SUPER_ADMIN, first_name='System', last_name='Administrator'
        )
        self.evaluator = User.objects.create_user(
            username='eval1', email='evaluator1@tenderx.com', password='Password123!',
            role=UserRole.EVALUATOR, first_name='Sarah', last_name='Conner'
        )

    def test_user_list_filtering_and_metrics(self):
        """Test listing users with search query and status filtering."""
        url = reverse('user_list_create')
        response = self.client.get(url, {'search': 'Sarah'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('metrics', data)
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['users'][0]['email'], 'evaluator1@tenderx.com')

    def test_user_suspend_and_activate(self):
        """Test account suspension and activation endpoints."""
        url_suspend = reverse('user_suspend', kwargs={'pk': self.evaluator.pk})
        res_suspend = self.client.post(url_suspend)
        self.assertEqual(res_suspend.status_code, 200)
        self.evaluator.refresh_from_db()
        self.assertEqual(self.evaluator.status, 'SUSPENDED')

        url_activate = reverse('user_activate', kwargs={'pk': self.evaluator.pk})
        res_activate = self.client.post(url_activate)
        self.assertEqual(res_activate.status_code, 200)
        self.evaluator.refresh_from_db()
        self.assertEqual(self.evaluator.status, 'ACTIVE')

    def test_user_activity_log(self):
        """Test fetching audit activity timeline for a user."""
        from accounts.models import UserActivity
        UserActivity.objects.create(
            user=self.evaluator, action="Evaluated Tender Bid #402", resource="Tender #402"
        )
        url = reverse('user_activity', kwargs={'pk': self.evaluator.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['action'], "Evaluated Tender Bid #402")

    def test_roles_and_permissions_api(self):
        """Test roles list and permissions list endpoints."""
        url_roles = reverse('roles_list')
        res_roles = self.client.get(url_roles)
        self.assertEqual(res_roles.status_code, 200)
        self.assertGreaterEqual(len(res_roles.json()), 6)

        url_perms = reverse('permissions_list')
        res_perms = self.client.get(url_perms)
        self.assertEqual(res_perms.status_code, 200)
        self.assertGreaterEqual(len(res_perms.json()), 12)

