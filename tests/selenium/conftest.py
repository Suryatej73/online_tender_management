
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


@pytest.fixture
def driver():
    options = Options()
    options.add_argument("--start-maximized")

    browser = webdriver.Chrome(options=options)

    yield browser

    browser.quit()
