import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    ElementClickInterceptedException,
)

BASE_URL = "http://localhost:5173"
WAIT_SECONDS = 60

MANAGER_ROLES = {
    "SUPER_ADMIN",
    "ORG_ADMIN",
    "TENDER_MANAGER",
}

REGISTRY_HEADING = (
    By.XPATH,
    "//h3[normalize-space()='Active Tenders Registry']",
)
CREATE_BUTTON = (
    By.XPATH,
    "//button[normalize-space()='Create Draft Tender']",
)
CREATE_MODAL_HEADING = (
    By.XPATH,
    "//h3[contains(normalize-space(), 'Create New Procurement Tender')]",
)
SEARCH_INPUT = (
    By.CSS_SELECTOR,
    "input[placeholder='Search by tender number, title, keywords...']",
)
ERROR_ALERT = (
    By.XPATH,
    "//div[contains(@class,'bg-rose-500/10')]",
)


def get_manager_auth_from_db():
    """Retrieve real manager credentials and sign a genuine SimpleJWT access token directly from DB."""
    try:
        import os, sys, django
        from pathlib import Path
        backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
        if str(backend_dir) not in sys.path:
            sys.path.insert(0, str(backend_dir))
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tenderx_backend.settings")
        django.setup()
        from django.contrib.auth import get_user_model
        from rest_framework_simplejwt.tokens import RefreshToken
        from accounts.serializers import UserSerializer

        User = get_user_model()
        manager = User.objects.filter(role__in=MANAGER_ROLES, is_active=True).first()
        if not manager:
            return None, None
        refresh = RefreshToken.for_user(manager)
        token_data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
        user_data = UserSerializer(manager).data
        return user_data, token_data
    except Exception as e:
        print(f"Could not load manager from DB: {e}")
        return None, None


@pytest.fixture(scope="module")
def manager_driver():
    """Open Chrome and let the user complete or confirm the real login/OTP flow."""
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")

    # Keep browser performance logs so a failed UI flow can be investigated.
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    driver = webdriver.Chrome(options=options)
    driver.get(BASE_URL)

    # Check if a valid session already exists in localStorage
    user = driver.execute_script(
        """
        const rawUser = localStorage.getItem('tenderx_user');
        return rawUser ? JSON.parse(rawUser) : null;
        """
    )
    token = driver.execute_script(
        "return localStorage.getItem('access_token');"
    )

    if not (user and user.get("role") in MANAGER_ROLES and token):
        user_data, token_data = get_manager_auth_from_db()
        if user_data and token_data:
            driver.execute_script(
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
            WebDriverWait(driver, 15).until(
                EC.visibility_of_element_located((By.XPATH, "//body"))
            )
            user = user_data
            token = token_data["access"]
        else:
            print("\nLog in with your Tender Manager/Admin account.")
            print("Complete email OTP verification in the Chrome window.")
            try:
                input("After reaching the TenderX dashboard, press Enter here...")
            except (EOFError, OSError):
                WebDriverWait(driver, 120).until(
                    lambda d: d.execute_script(
                        "return Boolean(localStorage.getItem('access_token') && localStorage.getItem('tenderx_user'));"
                    )
                )

            user = driver.execute_script(
                """
                const rawUser = localStorage.getItem('tenderx_user');
                return rawUser ? JSON.parse(rawUser) : null;
                """
            )
            token = driver.execute_script(
                "return localStorage.getItem('access_token');"
            )

    if not user or user.get("role") not in MANAGER_ROLES:
        driver.quit()
        pytest.fail(
            f"Login with a SUPER_ADMIN, ORG_ADMIN, or TENDER_MANAGER account. Current user: {user}"
        )

    if not token:
        driver.quit()
        pytest.fail("Login completed, but localStorage access_token was not found.")

    yield driver
    driver.quit()


def visible(driver, locator):
    """Return True only when the locator exists and is visible."""
    elements = driver.find_elements(*locator)
    return bool(elements) and elements[0].is_displayed()


def page_error_text(driver):
    """Read the visible TenderX error alert, if one exists."""
    for element in driver.find_elements(*ERROR_ALERT):
        if element.is_displayed() and element.text.strip():
            return element.text.strip()
    return ""


def set_react_input(driver, element, value):
    """
    Set value on a controlled React input and trigger synthetic onChange/onInput events.
    Reliably handles text, search, number, and datetime-local fields across browser locales.
    """
    driver.execute_script(
        """
        const input = arguments[0];
        const val = arguments[1];
        const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
        ).set;
        nativeSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        """,
        element,
        value,
    )


def open_tender_directory(driver):
    """Navigate to the registry without clicking the sidebar unnecessarily."""
    wait = WebDriverWait(driver, WAIT_SECONDS)

    # If a tender detail page is open, return to the registry first.
    back_buttons = driver.find_elements(
        By.XPATH,
        "//button[contains(normalize-space(.), 'Back to All Tenders') or contains(normalize-space(.), 'Back to Tenders Directory') or contains(normalize-space(.), 'Back to')]",
    )
    if back_buttons and back_buttons[0].is_displayed():
        back_buttons[0].click()
        wait.until(EC.visibility_of_element_located(REGISTRY_HEADING))
        return

    # Already on the registry.
    if visible(driver, REGISTRY_HEADING):
        return

    # Otherwise open the Tenders & BOQ section from the sidebar.
    tenders_buttons = driver.find_elements(
        By.XPATH,
        "//button[contains(normalize-space(.), 'Tenders & BOQ')]",
    )
    if not tenders_buttons:
        raise AssertionError(
            "Could not find the 'Tenders & BOQ' navigation button."
        )

    wait.until(
        EC.element_to_be_clickable(
            (
                By.XPATH,
                "//button[contains(normalize-space(.), 'Tenders & BOQ')]",
            )
        )
    ).click()

    wait.until(EC.visibility_of_element_located(REGISTRY_HEADING))


def clear_registry_filters(driver):
    """Reset search/status/category filters before creating or checking a tender."""
    wait = WebDriverWait(driver, WAIT_SECONDS)

    # 1. Clear search input via React event setter
    search_fields = driver.find_elements(*SEARCH_INPUT)
    if search_fields:
        search_field = search_fields[0]
        if search_field.get_attribute("value"):
            set_react_input(driver, search_field, "")

    # 2. Reset status dropdown if not already empty
    status_selects = driver.find_elements(
        By.XPATH,
        "//select[.//option[@value='DRAFT']]",
    )
    if status_selects:
        try:
            sel = Select(status_selects[0])
            if sel.first_selected_option.get_attribute("value") != "":
                sel.select_by_value("")
        except Exception:
            pass

    # 3. Reset category dropdown if not already empty
    registry_selects = driver.find_elements(
        By.XPATH,
        "//h3[normalize-space()='Active Tenders Registry']"
        "/ancestor::div[contains(@class,'space-y-4')][1]"
        "/preceding-sibling::div//select",
    )
    for element in registry_selects:
        try:
            sel = Select(element)
            if sel.first_selected_option.get_attribute("value") != "":
                sel.select_by_value("")
        except Exception:
            pass

    # 4. Wait for any active loading indicator to disappear
    wait.until(
        lambda d: not any(
            e.is_displayed()
            for e in d.find_elements(
                By.XPATH,
                "//span[contains(text(), 'Retrieving tender solicitations...')]",
            )
        )
    )


def tender_row_locator(title):
    safe_title = title.replace("'", "\\'")
    return (
        By.XPATH,
        f"//tbody//tr[contains(normalize-space(.), '{safe_title}')]",
    )


def wait_for_tender_row(driver, title, timeout=WAIT_SECONDS):
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located(tender_row_locator(title))
    )


def create_tender_through_ui(driver):
    """Create one tender through the same modal and submit button as a user."""
    wait = WebDriverWait(driver, WAIT_SECONDS)
    open_tender_directory(driver)
    clear_registry_filters(driver)

    title = (
        "Automation Test Tender "
        + datetime.now().strftime("%Y%m%d%H%M%S")
        + "-"
        + uuid4().hex[:6]
    )

    wait.until(EC.element_to_be_clickable(CREATE_BUTTON)).click()
    wait.until(EC.visibility_of_element_located(CREATE_MODAL_HEADING))

    form = wait.until(
        EC.visibility_of_element_located((By.XPATH, "//form"))
    )

    # Use the actual field types from TenderManagementDashboard.jsx.
    title_field = form.find_element(By.CSS_SELECTOR, "input[type='text']")
    title_field.send_keys(title)

    category_field = Select(
        form.find_element(By.TAG_NAME, "select")
    )
    usable_categories = [
        option
        for option in category_field.options
        if option.get_attribute("value")
        and option.is_enabled()
    ]
    if not usable_categories:
        pytest.fail(
            "The category dropdown has no selectable category. "
            "Check whether the backend categories loaded."
        )
    category_field.select_by_value(
        usable_categories[0].get_attribute("value")
    )

    budget_field = form.find_element(
        By.CSS_SELECTOR, "input[type='number']"
    )
    budget_field.send_keys("125000")

    deadline = (
        datetime.now() + timedelta(days=7)
    ).strftime("%Y-%m-%dT%H:%M")

    deadline_field = form.find_element(
        By.CSS_SELECTOR, "input[type='datetime-local']"
    )
    set_react_input(driver, deadline_field, deadline)

    description_field = form.find_element(By.TAG_NAME, "textarea")
    description_field.send_keys(
        "Automation testing tender for procurement management."
    )

    submit_button = form.find_element(
        By.XPATH, ".//button[@type='submit']"
    )

    # Scroll the modal container so the submit button is in view.
    modal_scroll_container = driver.find_element(
        By.XPATH,
        "//div[contains(@class,'fixed') and contains(@class,'inset-0')]"
        "//div[contains(@class,'overflow-y-auto')]",
    )

    driver.execute_script(
        """
        const modal = arguments[0];
        modal.scrollTop = modal.scrollHeight;
        """,
        modal_scroll_container,
    )

    # Check browser HTML5 form validation before submitting
    validity_info = driver.execute_script(
        """
        const form = arguments[0];
        const isValid = form.checkValidity();
        const invalidFields = [];
        if (!isValid) {
            for (const el of form.elements) {
                if (el.checkValidity && !el.checkValidity()) {
                    invalidFields.push({
                        name: el.name || el.id || el.type || el.tagName,
                        value: el.value,
                        badInput: el.validity.badInput,
                        valueMissing: el.validity.valueMissing,
                        validationMessage: el.validationMessage
                    });
                }
            }
        }
        return { isValid: isValid, invalidFields: invalidFields };
        """,
        form,
    )

    if not validity_info.get("isValid"):
        driver.save_screenshot("tender_form_validation_failed.png")
        pytest.fail(
            f"HTML5 form validation failed before submit: {validity_info.get('invalidFields')}"
        )

    # Wait until the button is enabled and scrolled into view.
    wait.until(lambda d: submit_button.is_enabled())
    driver.execute_script(
        """
        arguments[0].scrollIntoView({
            behavior: 'instant',
            block: 'center',
            inline: 'nearest'
        });
        """,
        submit_button,
    )

    # Real Selenium click
    try:
        submit_button.click()
    except Exception as click_error:
        if not isinstance(click_error, ElementClickInterceptedException):
            raise
        driver.execute_script("arguments[0].click();", submit_button)

    # On success, React closes the create modal. On failure it leaves the
    # modal open and displays the error alert in the dashboard.
    try:
        WebDriverWait(driver, 35).until(
            lambda d: (
                not visible(d, CREATE_MODAL_HEADING)
                or bool(page_error_text(d))
            )
        )
    except TimeoutException:
        driver.save_screenshot("tender_create_timeout.png")
        try:
            logs = driver.get_log("browser")
            print("Browser console logs on timeout:\n", logs)
        except Exception:
            pass
        pytest.fail(
            "The create form did not close and no error alert appeared within 35 seconds. "
            f"Current URL: {driver.current_url}"
        )

    error_message = page_error_text(driver)
    if error_message:
        driver.save_screenshot("tender_create_error.png")
        pytest.fail(f"Tender API/UI returned an error: {error_message}")

    # Return to the registry if the detail view was automatically opened.
    back_buttons = driver.find_elements(
        By.XPATH,
        "//button[contains(normalize-space(.), 'Back to All Tenders') or contains(normalize-space(.), 'Back to Tenders Directory') or contains(normalize-space(.), 'Back to')]",
    )
    if back_buttons and back_buttons[0].is_displayed():
        back_buttons[0].click()

    wait.until(EC.visibility_of_element_located(REGISTRY_HEADING))

    # Ensure the registry is showing all tenders, then wait for the new row.
    clear_registry_filters(driver)

    try:
        row = wait_for_tender_row(driver, title, timeout=35)
    except TimeoutException:
        driver.save_screenshot("tender_created_but_not_in_registry.png")
        body_text = driver.find_element(By.TAG_NAME, "body").text
        pytest.fail(
            "The form closed without a visible error, but the created tender "
            "did not appear in the registry. This may indicate a list/API "
            "refresh or backend status/permission issue.\n"
            f"Current URL: {driver.current_url}\n"
            f"Visible page text:\n{body_text}"
        )

    print(f"\nTender created and found in registry: {title}")
    print(f"Registry row:\n{row.text}")
    return title


@pytest.fixture(scope="module")
def created_tender(manager_driver):
    """
    Create once for all dependent tests.

    This avoids global variables and makes tests 02-04 work even if pytest
    selects those tests directly or executes them in a different order.
    """
    return create_tender_through_ui(manager_driver)


# TC21: Open tender management page
def test_01_open_tender_directory(manager_driver):
    open_tender_directory(manager_driver)

    assert manager_driver.find_element(*REGISTRY_HEADING).is_displayed()


# TC22: Create a tender and verify it appears in the registry
def test_02_create_draft_tender(manager_driver, created_tender):
    open_tender_directory(manager_driver)

    row = wait_for_tender_row(manager_driver, created_tender)
    assert created_tender in row.text

    # Verify the actual status shown by the application.
    status_text = row.text.upper()
    assert "DRAFT" in status_text, (
        "Tender was created and listed, but its status is not DRAFT. "
        f"Actual registry row:\n{row.text}"
    )


# TC23: Search for the created tender
def test_03_search_tender(manager_driver, created_tender):
    driver = manager_driver
    wait = WebDriverWait(driver, WAIT_SECONDS)

    open_tender_directory(driver)

    search = wait.until(EC.visibility_of_element_located(SEARCH_INPUT))
    set_react_input(driver, search, created_tender)

    row = wait_for_tender_row(driver, created_tender, timeout=WAIT_SECONDS)
    assert created_tender in row.text


# TC24: Filter tenders by DRAFT status
def test_04_filter_draft_tenders(manager_driver, created_tender):
    driver = manager_driver
    wait = WebDriverWait(driver, WAIT_SECONDS)

    open_tender_directory(driver)

    # Clear the search field first so the status filter is tested independently.
    search = wait.until(EC.visibility_of_element_located(SEARCH_INPUT))
    set_react_input(driver, search, "")

    status_filter = wait.until(
        EC.presence_of_element_located(
            (
                By.XPATH,
                "//select[.//option[@value='DRAFT']]",
            )
        )
    )
    Select(status_filter).select_by_value("DRAFT")

    row = wait_for_tender_row(driver, created_tender, timeout=WAIT_SECONDS)
    assert "DRAFT" in row.text.upper(), (
        "The tender appeared in the DRAFT filter, but its row did not show "
        f"DRAFT status:\n{row.text}"
    )
