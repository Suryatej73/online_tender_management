import pytest
pytestmark = pytest.mark.django_db

def test_serializer_accepts_valid_tender(tender_payload):
    from tenders.serializers import TenderCreateUpdateSerializer
    s = TenderCreateUpdateSerializer(data=tender_payload)
    assert s.is_valid(), s.errors

def test_serializer_rejects_negative_budget(tender_payload):
    from tenders.serializers import TenderCreateUpdateSerializer
    tender_payload["budget"] = "-1"
    s = TenderCreateUpdateSerializer(data=tender_payload)
    assert not s.is_valid() and "budget" in s.errors
