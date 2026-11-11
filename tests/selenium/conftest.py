
import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


@pytest.fixture(scope="session")
def base_url():
    return os.getenv("TENDERX_FRONTEND_URL", "http://localhost:5173")


@pytest.fixture
def driver(request):
    if not request.config.getoption("--run-selenium"):
        pytest.skip("Use --run-selenium to run browser tests")
    options = Options()
    options.add_argument("--start-maximized")

    browser = webdriver.Chrome(options=options)

    yield browser

    browser.quit()


@pytest.fixture(scope="session")
def manager_driver(request, base_url):
    """A safe browser session that leaves login and OTP entry to the tester."""
    if not request.config.getoption("--run-selenium"):
        pytest.skip("Use --run-selenium to run browser tests")
    if not request.config.getoption("--manual-selenium-session"):
        pytest.skip("Manager UI flows require --manual-selenium-session and a manually authenticated OTP session")

    options = Options()
    options.add_argument("--start-maximized")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    browser = webdriver.Chrome(options=options)
    browser.get(base_url)
    print("\nComplete login and any OTP prompt in Chrome, then press Enter here.")
    try:
        input()
    except (EOFError, OSError):
        pytest.fail("Selenium manager tests need an interactive, manually authenticated TenderX session.")
    if not browser.execute_script("return Boolean(localStorage.getItem('access_token'))"):
        browser.quit()
        pytest.fail("No authenticated session was found after manual login.")
    yield browser
    browser.quit()
