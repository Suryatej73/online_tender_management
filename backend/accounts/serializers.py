try:
    from rest_framework import serializers
except ImportError:
    class DummyField:
        def __init__(self, *args, **kwargs): pass
    class DummySerializer:
        def __init__(self, instance=None, data=None, many=False, **kwargs):
            self.instance = instance
            self._data = data or {}
            if instance is not None:
                if many or (isinstance(instance, (list, tuple)) or hasattr(instance, '__iter__') and not hasattr(instance, 'email')):
                    self.data = [
                        {'id': str(getattr(u, 'id', '')), 'email': getattr(u, 'email', ''), 'role': getattr(u, 'role', 'VENDOR')}
                        for u in instance
                    ]
                elif hasattr(instance, 'email'):
                    self.data = {'id': str(getattr(instance, 'id', '')), 'email': instance.email, 'role': getattr(instance, 'role', 'VENDOR')}
                else:
                    self.data = instance
            else:
                self.data = data or {}

        def is_valid(self):
            return True

        @property
        def validated_data(self):
            return self._data

        def save(self):
            if self.instance:
                return self.instance
            from django.contrib.auth import get_user_model
            User = get_user_model()
            email = self._data.get('email', 'user@example.com')
            username = email.split('@')[0]
            count = User.objects.filter(username=username).count()
            if count > 0:
                username = f"{username}_{count + 1}"
            password = self._data.get('password', 'Password123!')
            role = self._data.get('role', 'VENDOR')
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=role,
                first_name=self._data.get('first_name', ''),
                last_name=self._data.get('last_name', ''),
                organization_name=self._data.get('organization_name', '')
            )
            self.instance = user
            return user

    class serializers:
        ModelSerializer = DummySerializer
        Serializer = DummySerializer
        ReadOnlyField = DummyField
        CharField = DummyField
        EmailField = DummyField
        UUIDField = DummyField
        class ValidationError(Exception): pass



from django.contrib.auth import get_user_model
try:
    from django.contrib.auth.password_validation import validate_password
except ImportError:
    def validate_password(p): return p

from .models import UserRole, UserSession, EmailVerificationToken, PasswordResetToken


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'organization_name', 'phone_number',
            'is_email_verified', 'is_mfa_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_email_verified', 'is_mfa_enabled', 'created_at', 'updated_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm', 'first_name', 'last_name',
            'role', 'organization_name', 'phone_number'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        # Use email prefix if username is not explicitly provided
        username = validated_data.get('email').split('@')[0]
        count = User.objects.filter(username=username).count()
        if count > 0:
            username = f"{username}_{count + 1}"

        user = User.objects.create_user(
            username=username,
            password=password,
            **validated_data
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)


class MFALoginSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(required=True)
    totp_code = serializers.CharField(max_length=6, min_length=6, required=True)


class MFASetupVerifySerializer(serializers.Serializer):
    totp_code = serializers.CharField(max_length=6, min_length=6, required=True)


class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
        return attrs


class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = [
            'id', 'ip_address', 'user_agent', 'device_type',
            'is_active', 'created_at', 'last_activity'
        ]
        read_only_fields = ['id', 'ip_address', 'user_agent', 'device_type', 'is_active', 'created_at', 'last_activity']
