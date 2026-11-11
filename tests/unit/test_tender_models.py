import pytest
pytestmark = pytest.mark.django_db

def test_tender_string_includes_reference_and_title(draft_tender):
    assert draft_tender.tender_number in str(draft_tender) and draft_tender.title in str(draft_tender)

def test_category_parent_name_is_rendered(category):
    from tenders.models import TenderCategory
    child = TenderCategory.objects.create(name="Child", slug="child-category", parent_category=category)
    assert str(child) == f"{category.name} > Child"
