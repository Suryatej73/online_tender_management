
import os
import pytest

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


URL = "http://localhost:5173"


@pytest.fixture
def driver():
    browser = webdriver.Chrome()
    browser.maximize_window()

    yield browser

    browser.quit()


def open_login(driver):
    wait = WebDriverWait(driver, 15)

    driver.get(URL)

    # Click Sign In on the TenderX landing page
    sign_in = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[normalize-space()='Sign In']")
        )
    )
    sign_in.click()

    # Wait until the login modal appears
    email = wait.until(
        EC.visibility_of_element_located(
            (By.NAME, "email")
        )
    )

    return email


# TC01: Verify login form opens
def test_login_page(driver):
    open_login(driver)

    assert driver.find_element(
        By.NAME, "email"
    ).is_displayed()

    assert driver.find_element(
        By.NAME, "password"
    ).is_displayed()

    print("Login form opened successfully")


# TC02: Verify empty email validation
def test_empty_email(driver):
    email = open_login(driver)

    password = driver.find_element(
        By.NAME, "password"
    )

    password.send_keys("password123")

    driver.find_element(
        By.XPATH, "//button[@type='submit']"
    ).click()

    assert driver.execute_script(
        "return arguments[0].validity.valueMissing;",
        email
    )

    print("Empty email validation passed")


# TC03: Verify invalid email format
def test_invalid_email(driver):
    email = open_login(driver)

    email.send_keys("invalid-email")

    assert not driver.execute_script(
        "return arguments[0].checkValidity();",
        email
    )

    print("Invalid email validation passed")


# TC04: Verify invalid credentials
def test_invalid_credentials(driver):
    open_login(driver)

    driver.find_element(
        By.NAME, "email"
    ).send_keys("invalid-test@example.com")

    driver.find_element(
        By.NAME, "password"
    ).send_keys("WrongPassword123!")

    driver.find_element(
        By.XPATH, "//button[@type='submit']"
    ).click()

    wait = WebDriverWait(driver, 20)

    error = wait.until(
        EC.visibility_of_element_located(
            (By.XPATH, "//div[contains(@class,'text-red-200')]")
        )
    )

    assert error.text.strip() != ""

    print("Invalid credentials rejected:", error.text)


# TC05: Verify valid login (optional)
def test_valid_login(driver):
    email_value = os.getenv("TENDERX_TEST_EMAIL")
    password_value = os.getenv("TENDERX_TEST_PASSWORD")

    if not email_value or not password_value:
        pytest.skip("Test credentials not configured")

    open_login(driver)

    driver.find_element(
        By.NAME, "email"
    ).send_keys(email_value)

    driver.find_element(
        By.NAME, "password"
    ).send_keys(password_value)

    driver.find_element(
        By.XPATH, "//button[@type='submit']"
    ).click()

    wait = WebDriverWait(driver, 20)

    # Login may require OTP or MFA
    wait.until(
        lambda d:
        len(d.find_elements(
            By.XPATH, "//input[@name='otp_code']"
        )) > 0
        or len(d.find_elements(
            By.XPATH, "//div[contains(@class,'text-purple-200')]"
        )) > 0
        or "dashboard" in d.current_url.lower()
    )

    print("Login flow progressed to authentication verification")
