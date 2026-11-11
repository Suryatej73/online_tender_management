import pytest
pytestmark = pytest.mark.selenium

def test_lifecycle_requires_manager_session(manager_driver):
    assert manager_driver.execute_script("return Boolean(localStorage.getItem('tenderx_user'))")
