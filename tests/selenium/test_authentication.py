"""Opt-in browser smoke checks. They never automate a real email OTP."""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

pytestmark = pytest.mark.selenium

def test_landing_page_loads(driver, base_url):
    driver.get(base_url)
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    assert driver.title
