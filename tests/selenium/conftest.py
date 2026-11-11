
import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


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


def get_manager_auth():
    import urllib.request
    import json
    try:
        req = urllib.request.Request(
            "http://localhost:8000/api/v1/auth/login/",
            data=json.dumps({"email": "admin@tenderx.io", "password": "Admin123!"}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                return data.get("user"), data.get("tokens")
    except Exception as e:
        print("Failed to authenticate manager via API:", e)
    return None, None


@pytest.fixture(scope="session")
def manager_driver(request, base_url):
    """A browser session for manager flows."""
    if not request.config.getoption("--run-selenium"):
        pytest.skip("Use --run-selenium to run browser tests")

    options = Options()
    options.add_argument("--start-maximized")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    browser = webdriver.Chrome(options=options)
    browser.get(base_url)

    if request.config.getoption("--manual-selenium-session"):
        print("\nComplete login and any OTP prompt in Chrome, then press Enter here.")
        try:
            input()
        except (EOFError, OSError):
            browser.quit()
            pytest.fail("Selenium manager tests need an interactive, manually authenticated TenderX session.")
    else:
        user_data, token_data = get_manager_auth()
        if user_data and token_data:
            browser.execute_script(
                """
                const u = arguments[0];
                const t = arguments[1];
                localStorage.setItem('tenderx_user', JSON.stringify(u));
                localStorage.setItem('tenderx_tokens', JSON.stringify(t));
                localStorage.setItem('access_token', t.access);
                localStorage.setItem('refresh_token', t.refresh);
                window.location.reload();
                """,
                user_data,
                token_data,
            )
            WebDriverWait(browser, 15).until(
                EC.visibility_of_element_located((By.XPATH, "//body"))
            )

    if not browser.execute_script("return Boolean(localStorage.getItem('access_token'))"):
        browser.quit()
        pytest.fail("No authenticated session was found after login.")
    yield browser
    browser.quit()
