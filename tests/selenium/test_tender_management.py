import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException


BASE_URL = "http://localhost:5173"
WAIT_SECONDS = 25

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


@pytest.fixture(scope="module")
def manager_driver():
    """Open Chrome and let the user complete the real login/OTP flow."""
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")

    # Keep browser performance logs so a failed UI flow can be investigated.
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    driver = webdriver.Chrome(options=options)
    driver.get(BASE_URL)

    print("\nLog in with your Tender Manager/Admin account.")
    print("Complete email OTP verification in the Chrome window.")
    input("After reaching the TenderX dashboard, press Enter here...")

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
            "Login with a SUPER_ADMIN, ORG_ADMIN, or TENDER_MANAGER account."
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


def open_tender_directory(driver):
    """Navigate to the registry without clicking the sidebar unnecessarily."""
    wait = WebDriverWait(driver, WAIT_SECONDS)

    # Already on the registry.
    if visible(driver, REGISTRY_HEADING):
        return

    # If a tender detail page is open, return to the registry first.
    back_buttons = driver.find_elements(
        By.XPATH,
        "//button[contains(normalize-space(.), 'Back to All Tenders')]",
    )
    if back_buttons and back_buttons[0].is_displayed():
        back_buttons[0].click()
        wait.until(EC.visibility_of_element_located(REGISTRY_HEADING))
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

    search_fields = driver.find_elements(*SEARCH_INPUT)
    if search_fields:
        search_fields[0].clear()

    # Identify the status dropdown by its DRAFT option, not by select index.
    status_selects = driver.find_elements(
        By.XPATH,
        "//select[.//option[@value='DRAFT']]",
    )
    if status_selects:
        Select(status_selects[0]).select_by_value("")

    # The category dropdown is the other registry select. Clear it if present.
    registry_selects = driver.find_elements(
        By.XPATH,
        "//h3[normalize-space()='Active Tenders Registry']"
        "/ancestor::div[contains(@class,'space-y-4')][1]"
        "/preceding-sibling::div//select",
    )
    for element in registry_selects:
        try:
            Select(element).select_by_value("")
        except Exception:
            pass

    # Wait for the registry to finish refreshing.
    wait.until(lambda d: not d.find_elements(
        By.XPATH, "//*[contains(., 'Retrieving tender solicitations...')]"
    ) or not any(
        e.is_displayed()
        for e in d.find_elements(
            By.XPATH, "//*[contains(., 'Retrieving tender solicitations...')]"
        )
    ))


def tender_row_locator(title):
    # The application renders each tender title inside a div in a table row.
    # This locator does not assume the title is an h2 or a direct table cell.
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
    deadline_field.send_keys(deadline)

    description_field = form.find_element(By.TAG_NAME, "textarea")
    description_field.send_keys(
        "Automation testing tender for procurement management."
    )

    submit_button = form.find_element(
        By.XPATH, ".//button[@type='submit']"
    )
    # The form sits inside a fixed, independently scrollable modal.
    # Scroll that modal itself to the bottom; scrolling only the page can leave
    # the submit button below the viewport and cause ElementClickInterceptedException.
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

    # Wait until the button is enabled and its center is actually visible.
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

    # Confirm the button is in the viewport and not covered by another element.
    button_is_clickable_at_center = driver.execute_script(
        """
        const button = arguments[0];
        const rect = button.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const inViewport =
            x >= 0 && y >= 0 &&
            x < window.innerWidth && y < window.innerHeight;
        const topElement = document.elementFromPoint(x, y);
        return inViewport &&
            topElement &&
            (topElement === button || button.contains(topElement));
        """,
        submit_button,
    )

    if not button_is_clickable_at_center:
        driver.save_screenshot("tender_submit_button_obstructed.png")
        pytest.fail(
            "The Save Draft Tender button is still outside the visible "
            "modal area or covered by another element. Screenshot saved."
        )

    # Use a normal Selenium click first. Fall back to a JS click only if Chrome
    # still reports interception after the modal has been scrolled into view.
    try:# Check browser form validation before submitting.
 
        submit_button.click()
    except Exception as click_error:
        from selenium.common.exceptions import ElementClickInterceptedException

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
         
        pytest.fail(
            "The create form did not close and no error alert appeared. "
            f"Current URL: {driver.current_url}"
        )

    error_message = page_error_text(driver)
    if error_message:
        driver.save_screenshot("tender_create_error.png")
        pytest.fail(f"Tender API/UI returned an error: {error_message}")

    # The React component may navigate to the detail view when the API returns
    # an ID. Do not expect the tender title to be an h2: the registry title is
    # rendered as a div, and detail-page markup can differ.
    back_buttons = driver.find_elements(
        By.XPATH,
        "//button[contains(normalize-space(.), 'Back to All Tenders')]",
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
    search.clear()
    search.send_keys(created_tender)

    row = wait_for_tender_row(driver, created_tender, timeout=35)
    assert created_tender in row.text


# TC24: Filter tenders by DRAFT status
def test_04_filter_draft_tenders(manager_driver, created_tender):
    driver = manager_driver
    wait = WebDriverWait(driver, WAIT_SECONDS)

    open_tender_directory(driver)

    # Clear the search field first so the status filter is tested independently.
    search = wait.until(EC.visibility_of_element_located(SEARCH_INPUT))
    search.clear()

    status_filter = wait.until(
        EC.presence_of_element_located(
            (
                By.XPATH,
                "//select[.//option[@value='DRAFT']]",
            )
        )
    )
    Select(status_filter).select_by_value("DRAFT")

    row = wait_for_tender_row(driver, created_tender, timeout=35)
    assert "DRAFT" in row.text.upper(), (
        "The tender appeared in the DRAFT filter, but its row did not show "
        f"DRAFT status:\n{row.text}"
    )
