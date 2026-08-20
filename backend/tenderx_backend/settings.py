"""
Django settings for tenderx_backend project.
"""

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-tenderx-module1-default-key-change-in-prod')

DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

try:
    import rest_framework
    INSTALLED_APPS.append('rest_framework')
except ImportError:
    pass

try:
    import corsheaders
    INSTALLED_APPS.append('corsheaders')
except ImportError:
    pass

INSTALLED_APPS.append('core.apps.CoreConfig')
INSTALLED_APPS.append('accounts.apps.AccountsConfig')
INSTALLED_APPS.append('tenders.apps.TendersConfig')
INSTALLED_APPS.append('vendors.apps.VendorsConfig')

AUTH_USER_MODEL = 'accounts.User'



MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

try:
    import corsheaders
    MIDDLEWARE.insert(0, 'corsheaders.middleware.CorsMiddleware')
except ImportError:
    pass


ROOT_URLCONF = 'tenderx_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'tenderx_backend.wsgi.application'
ASGI_APPLICATION = 'tenderx_backend.asgi.application'

# Database Configuration
POSTGRES_DB = os.getenv('POSTGRES_DB', os.getenv('DB_NAME', 'tenderx_db'))
POSTGRES_USER = os.getenv('POSTGRES_USER', os.getenv('DB_USER', 'tenderx_user'))
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', os.getenv('DB_PASSWORD', 'tenderx_password'))
POSTGRES_HOST = os.getenv('POSTGRES_HOST', os.getenv('DB_HOST', 'db'))
POSTGRES_PORT = os.getenv('POSTGRES_PORT', os.getenv('DB_PORT', '5432'))

# A direct ``python manage.py runserver`` command should work without Docker.
# Docker Compose explicitly sets USE_SQLITE=False and supplies PostgreSQL.
USE_SQLITE = os.getenv('USE_SQLITE', 'True').lower() == 'true'

if USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    try:
        import psycopg2
        db_engine = 'django.db.backends.postgresql'
    except ImportError:
        db_engine = 'django.db.backends.sqlite3'

    DATABASES = {
        'default': {
            'ENGINE': db_engine,
            'NAME': POSTGRES_DB if db_engine == 'django.db.backends.postgresql' else BASE_DIR / 'db.sqlite3',
            'USER': POSTGRES_USER,
            'PASSWORD': POSTGRES_PASSWORD,
            'HOST': POSTGRES_HOST,
            'PORT': POSTGRES_PORT,
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ]
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}


CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379/1')

try:
    import redis
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }
except ImportError:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }


CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://redis:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
