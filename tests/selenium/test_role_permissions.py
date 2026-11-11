import pytest
pytestmark = pytest.mark.selenium

def test_permission_ui_requires_manager_session(manager_driver):
    assert manager_driver.execute_script("return Boolean(localStorage.getItem('tenderx_user'))")
