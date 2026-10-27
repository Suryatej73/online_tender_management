#!/usr/bin/env python3
"""
TenderX Database Connectivity & Supabase Diagnostic Utility
Run this script to test your database connection and get instant diagnostics:
    python3 check_db.py
"""
import os
import sys
from pathlib import Path

# Add backend directory to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tenderx_backend.settings')

import django
django.setup()

from django.conf import settings
from django.db import connection

print("=" * 60)
print(" TenderX Database Connectivity & Diagnostic")
print("=" * 60)

db_settings = settings.DATABASES['default']
engine = db_settings.get('ENGINE', '')
host = db_settings.get('HOST', 'localhost')
port = db_settings.get('PORT', '')
user = db_settings.get('USER', '')
name = db_settings.get('NAME', '')

print(f"Engine : {engine}")
if 'sqlite' in engine:
    print(f"Path   : {name}")
else:
    print(f"Host   : {host}:{port}")
    print(f"User   : {user}")
    print(f"DB     : {name}")

print("\nTesting connection...")

try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1;")
        res = cursor.fetchone()
    print("SUCCESS: Database connection established successfully!")

    # Check tables
    from accounts.models import User
    from tenders.models import Tender
    user_count = User.objects.count()
    tender_count = Tender.objects.count()
    print(f"Stats  : {user_count} registered users, {tender_count} tenders found.")

except Exception as e:
    err_msg = str(e)
    print(f"\nFAILED : {err_msg}")
    print("-" * 60)
    
    if 'tenant/user' in err_msg or 'not found' in err_msg or 'ENOTFOUND' in err_msg:
        print("DIAGNOSIS: Your Supabase project appears to be PAUSED.")
        print("Free tier Supabase projects automatically pause after 7 days of inactivity.")
        print("\nHOW TO FIX:")
        print("1. Open your Supabase Dashboard: https://supabase.com/dashboard")
        print(f"2. Select your project ({user.split('.')[-1] if '.' in str(user) else 'your project'})")
        print("3. Click 'Restore Project' (takes ~1-2 minutes to resume)")
        print("4. Re-run: python3 check_db.py")
        print("\nLOCAL FALLBACK OPTION:")
        print("To continue developing immediately using local SQLite, set in .env:")
        print("   USE_SQLITE=True")
    else:
        print(f"Please check your network and DATABASE_URL in .env.")

print("=" * 60)
