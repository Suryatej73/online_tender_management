import uuid
from django.core.management.base import BaseCommand
from django.utils import timezone
import datetime

from accounts.models import User, UserRole, UserStatus, Organization, Department
from vendors.models import Vendor, VendorCategory, VendorStatus
from documents.models import DocumentType
from documents.seed import seed_default_document_types
from tenders.models import Tender, TenderCategory, TenderStatus, ProcurementMethod

class Command(BaseCommand):
    help = "Seeds initial production/testing data for Online Tender Management System (OTMS)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting OTMS database seeding..."))

        # 1. Document Types
        dt_count = seed_default_document_types()
        self.stdout.write(self.style.SUCCESS(f"Seeded {dt_count} Document Types."))

        # 2. Categories
        categories_data = [
            ("IT & Cloud Services", "Cloud infrastructure, software development, data center operations"),
            ("Renewable Energy", "Solar PV, wind microgrids, battery energy storage systems"),
            ("Civil Infrastructure", "Highways, bridges, municipal civil works, smart toll systems"),
            ("Consulting & Engineering", "Technical advisory, structural design, project management"),
            ("Healthcare & Medical Equipment", "Hospital supplies, diagnostic machinery, pharmaceuticals")
        ]

        cat_objs = {}
        for name, desc in categories_data:
            cat, _ = TenderCategory.objects.get_or_create(
                name=name,
                defaults={"description": desc, "slug": name.lower().replace(" & ", "-").replace(" ", "-")}
            )
            vcat, _ = VendorCategory.objects.get_or_create(
                name=name,
                defaults={"description": desc, "slug": name.lower().replace(" & ", "-").replace(" ", "-")}
            )
            cat_objs[name] = cat

        # 3. Organizations
        npa_org, _ = Organization.objects.get_or_create(
            name="National Procurement Authority",
            defaults={
                "code": "NPA-GOV",
                "org_type": "GOVERNMENT",
                "tax_id": "TAX-GOV-9901"
            }
        )

        mdi_org, _ = Organization.objects.get_or_create(
            name="Ministry of Digital Infrastructure",
            defaults={
                "code": "MDI-GOV",
                "org_type": "GOVERNMENT",
                "tax_id": "TAX-GOV-9902"
            }
        )

        negc_org, _ = Organization.objects.get_or_create(
            name="National Energy Commission",
            defaults={
                "code": "NEGC-GOV",
                "org_type": "PUBLIC_SECTOR",
                "tax_id": "TAX-GOV-9903"
            }
        )

        # 4. Super Admin User
        admin_user, admin_created = User.objects.get_or_create(
            email="admin@tenderx.gov",
            defaults={
                "username": "admin@tenderx.gov",
                "role": UserRole.SUPER_ADMIN,
                "status": UserStatus.ACTIVE,
                "first_name": "System",
                "last_name": "Administrator",
                "organization": npa_org,
                "organization_name": npa_org.name,
                "is_staff": True,
                "is_superuser": True,
                "is_email_verified": True
            }
        )
        if admin_created:
            admin_user.set_password("Admin123!")
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("Created Super Admin: admin@tenderx.gov / Admin123!"))
        else:
            self.stdout.write(self.style.SUCCESS("Super Admin exists: admin@tenderx.gov"))

        # 5. Organization Admin & Tender Managers
        org_user, org_created = User.objects.get_or_create(
            email="authority@digital.gov",
            defaults={
                "username": "authority@digital.gov",
                "role": UserRole.ORG_ADMIN,
                "status": UserStatus.ACTIVE,
                "first_name": "Sarah",
                "last_name": "Jenkins",
                "organization": mdi_org,
                "organization_name": mdi_org.name,
                "is_email_verified": True
            }
        )
        if org_created:
            org_user.set_password("Org123!")
            org_user.save()

        manager_user, mgr_created = User.objects.get_or_create(
            email="manager@energy.gov",
            defaults={
                "username": "manager@energy.gov",
                "role": UserRole.TENDER_MANAGER,
                "status": UserStatus.ACTIVE,
                "first_name": "Robert",
                "last_name": "Chen",
                "organization": negc_org,
                "organization_name": negc_org.name,
                "is_email_verified": True
            }
        )
        if mgr_created:
            manager_user.set_password("Org123!")
            manager_user.save()

        # 6. Evaluator Users
        eval1, eval1_created = User.objects.get_or_create(
            email="evaluator1@gov.eval",
            defaults={
                "username": "evaluator1@gov.eval",
                "role": UserRole.EVALUATOR,
                "status": UserStatus.ACTIVE,
                "first_name": "Dr. Aris",
                "last_name": "Thorne",
                "organization": npa_org,
                "organization_name": npa_org.name,
                "is_email_verified": True
            }
        )
        if eval1_created:
            eval1.set_password("Eval123!")
            eval1.save()

        # 7. Vendors
        v1_user, v1_created = User.objects.get_or_create(
            email="vendor@globaltech.com",
            defaults={
                "username": "vendor@globaltech.com",
                "role": UserRole.VENDOR,
                "status": UserStatus.ACTIVE,
                "first_name": "Alexander",
                "last_name": "Vance",
                "organization_name": "Global Tech Solutions Ltd",
                "is_email_verified": True
            }
        )
        if v1_created:
            v1_user.set_password("Vendor123!")
            v1_user.save()
            Vendor.objects.get_or_create(
                user=v1_user,
                defaults={
                    "company_name": "Global Tech Solutions Ltd",
                    "registration_number": "REG-2024-8849",
                    "email": "vendor@globaltech.com",
                    "tax_number": "GST-992144810",
                    "business_type": "PRIVATE_LIMITED",
                    "industry": "IT & Cloud Services",
                    "annual_turnover": 15000000.00,
                    "status": VendorStatus.VERIFIED,
                    "overall_rating": 4.8,
                    "performance_score": 92.5
                }
            )

        v2_user, v2_created = User.objects.get_or_create(
            email="vendor@solarpower.com",
            defaults={
                "username": "vendor@solarpower.com",
                "role": UserRole.VENDOR,
                "status": UserStatus.ACTIVE,
                "first_name": "Elena",
                "last_name": "Rostova",
                "organization_name": "SolarPower Energy Corp",
                "is_email_verified": True
            }
        )
        if v2_created:
            v2_user.set_password("Vendor123!")
            v2_user.save()
            Vendor.objects.get_or_create(
                user=v2_user,
                defaults={
                    "company_name": "SolarPower Energy Corp",
                    "registration_number": "REG-2024-9120",
                    "email": "vendor@solarpower.com",
                    "tax_number": "GST-881023941",
                    "business_type": "CORPORATION",
                    "industry": "Renewable Energy",
                    "annual_turnover": 28000000.00,
                    "status": VendorStatus.VERIFIED,
                    "overall_rating": 4.6,
                    "performance_score": 88.0
                }
            )

        # 8. Sample Tenders
        tenders_seed = [
            {
                "tender_number": "TND-2026-000101",
                "title": "High-Capacity Cloud Data Center Infrastructure",
                "description": "Procurement of tier-4 hyper-converged server racks, enterprise storage arrays, and redundant power units.",
                "category": cat_objs["IT & Cloud Services"],
                "organization": mdi_org,
                "budget": 2500000.00,
                "status": TenderStatus.ACTIVE,
                "opening_date": timezone.now() - datetime.timedelta(days=5),
                "submission_deadline": timezone.now() + datetime.timedelta(days=30)
            },
            {
                "tender_number": "TND-2026-000102",
                "title": "Solar Photovoltaic Microgrid & Battery Storage",
                "description": "Turnkey engineering, procurement, and construction (EPC) of 15MW solar microgrid with lithium-ion storage.",
                "category": cat_objs["Renewable Energy"],
                "organization": negc_org,
                "budget": 4800000.00,
                "status": TenderStatus.EVALUATION,
                "opening_date": timezone.now() - datetime.timedelta(days=20),
                "submission_deadline": timezone.now() - datetime.timedelta(days=2)
            },
            {
                "tender_number": "TND-2026-000103",
                "title": "Express Highway Civil Expansion & Smart Tolls",
                "description": "Civil widening of 42km four-lane express highway and installation of RFID fastag automated toll gantries.",
                "category": cat_objs["Civil Infrastructure"],
                "organization": npa_org,
                "budget": 12500000.00,
                "status": TenderStatus.AWARDED,
                "opening_date": timezone.now() - datetime.timedelta(days=60),
                "submission_deadline": timezone.now() - datetime.timedelta(days=15)
            }
        ]

        for t_data in tenders_seed:
            t_num = t_data.pop("tender_number")
            Tender.objects.get_or_create(
                tender_number=t_num,
                defaults={
                    **t_data,
                    "created_by": org_user,
                    "procurement_method": ProcurementMethod.OPEN_TENDER
                }
            )

        self.stdout.write(self.style.SUCCESS("--- OTMS Database Seeding Complete ---"))
        self.stdout.write("Default Accounts Created:")
        self.stdout.write("  Super Admin : admin@tenderx.gov / Admin123!")
        self.stdout.write("  Org Admin   : authority@digital.gov / Org123!")
        self.stdout.write("  Manager     : manager@energy.gov / Org123!")
        self.stdout.write("  Evaluator   : evaluator1@gov.eval / Eval123!")
        self.stdout.write("  Vendor 1    : vendor@globaltech.com / Vendor123!")
        self.stdout.write("  Vendor 2    : vendor@solarpower.com / Vendor123!")
