
import os
import pytest

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


BASE_URL = "http://localhost:5173"


def open_signup(driver):
    wait = WebDriverWait(driver, 15)

    driver.get(BASE_URL)

    # Open Sign In modal
    sign_in = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[normalize-space()='Sign In']")
        )
    )
    sign_in.click()

    # Click Sign up inside the modal
    signup_link = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[normalize-space()='Sign up']")
        )
    )
    signup_link.click()

    # Wait for registration form
    wait.until(
        EC.visibility_of_element_located(
            (By.NAME, "first_name")
        )
    )


def get_error(driver):
    return WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, "div.text-red-200")
        )
    )


# TC11: Verify registration form opens
def test_signup_form_opens(driver):

    open_signup(driver)

    assert driver.find_element(
        By.NAME, "first_name"
    ).is_displayed()

    assert driver.find_element(
        By.NAME, "last_name"
    ).is_displayed()

    assert driver.find_element(
        By.NAME, "email"
    ).is_displayed()

    assert driver.find_element(
        By.NAME, "password"
    ).is_displayed()


# TC12: Empty registration form validation
def test_empty_registration(driver):

    open_signup(driver)

    first_name = driver.find_element(By.NAME, "first_name")
    email = driver.find_element(By.NAME, "email")
    password = driver.find_element(By.NAME, "password")

    assert first_name.get_attribute("required") is not None
    assert email.get_attribute("required") is not None
    assert password.get_attribute("required") is not None

    assert driver.execute_script(
        "return arguments[0].validity.valueMissing;",
        first_name
    )


# TC13: Invalid email validation
def test_invalid_signup_email(driver):

    open_signup(driver)

    email = driver.find_element(By.NAME, "email")
    email.send_keys("wrong-email")

    is_valid = driver.execute_script(
        "return arguments[0].validity.valid;",
        email
    )

    assert is_valid is False


# TC14: Weak password validation
def test_weak_password(driver):

    open_signup(driver)

    driver.find_element(
        By.NAME, "first_name"
    ).send_keys("Test")

    driver.find_element(
        By.NAME, "email"
    ).send_keys("weak-password-test@example.com")

    driver.find_element(
        By.NAME, "password"
    ).send_keys("123")

    driver.find_element(
        By.XPATH,
        "//button[normalize-space()='Create account']"
    ).click()

    error = get_error(driver)

    assert "at least 6 characters" in error.text


# TC15: Verify available registration roles
def test_registration_roles(driver):

    open_signup(driver)

    assert driver.find_element(
        By.XPATH, "//button[normalize-space()='Vendor']"
    ).is_displayed()

    assert driver.find_element(
        By.XPATH, "//button[normalize-space()='Manager']"
    ).is_displayed()

    assert driver.find_element(
        By.XPATH, "//button[normalize-space()='Evaluator']"
    ).is_displayed()


# TC16: Existing email registration
def test_duplicate_email_registration(driver):

    existing_email = os.getenv("TENDERX_EXISTING_EMAIL")

    if not existing_email:
        pytest.skip("Set TENDERX_EXISTING_EMAIL to run this test")

    open_signup(driver)

    driver.find_element(
        By.NAME, "first_name"
    ).send_keys("Test")

    driver.find_element(
        By.NAME, "email"
    ).send_keys(existing_email)

    driver.find_element(
        By.NAME, "password"
    ).send_keys("TestPassword123!")

    driver.find_element(
        By.XPATH,
        "//button[normalize-space()='Create account']"
    ).click()

    error = get_error(driver)

    assert error.is_displayed()
