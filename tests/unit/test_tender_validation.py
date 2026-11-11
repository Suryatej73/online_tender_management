import pytest
from django.utils import timezone
pytestmark = pytest.mark.django_db

def test_lifecycle_rejects_invalid_transition(draft_tender, manager):
    from tenders.models import TenderStatus
    from tenders.services import TenderLifecycleService
    with pytest.raises(ValueError, match="Invalid lifecycle transition"):
        TenderLifecycleService.transition_tender(draft_tender, TenderStatus.ACTIVE, manager)

def test_publish_sets_date_and_history(draft_tender, manager):
    from datetime import timedelta
    from tenders.models import TenderStatus
    from tenders.services import TenderLifecycleService
    draft_tender.submission_deadline = timezone.now() + timedelta(days=2); draft_tender.save()
    TenderLifecycleService.transition_tender(draft_tender, TenderStatus.PUBLISHED, manager)
    draft_tender.refresh_from_db()
    assert draft_tender.publication_date and draft_tender.status_history.filter(to_status="PUBLISHED").exists()
