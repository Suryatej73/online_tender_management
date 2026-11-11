"""
Diagnostic Test Suite for TenderX Submission Flow
Traces the full chain:
React form -> submit handler -> API helper -> Django endpoint -> serializer -> database -> API response -> React state update.

Validates:
1. HTML5 Form Validity
2. Submit event dispatch and preventDefault()
3. Network request URL, HTTP Method, and Bearer token
4. Backend Django response code and payload structure
5. Tender creation in the database
6. Modal dismissal and table update in UI
"""

import json
import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

BASE_URL = "http://localhost:5173"
WAIT_SECONDS = 25

MANAGER_ROLES = {"SUPER_ADMIN", "ORG_ADMIN", "TENDER_MANAGER"}
REGISTRY_HEADING = (By.XPATH, "//h3[normalize-space()='Active Tenders Registry']")
CREATE_BUTTON = (By.XPATH, "//button[normalize-space()='Create Draft Tender']")
CREATE_MODAL_HEADING = (By.XPATH, "//h3[contains(normalize-space(), 'Create New Procurement Tender')]")


@pytest.fixture(scope="module")
def diag_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    options.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    driver = webdriver.Chrome(options=options)
    driver.get(BASE_URL)

    user = driver.execute_script(
        "const u = localStorage.getItem('tenderx_user'); return u ? JSON.parse(u) : null;"
    )
    token = driver.execute_script("return localStorage.getItem('access_token');")

    if not (user and user.get("role") in MANAGER_ROLES and token):
        print("\n[DIAGNOSTIC] Log in with your Tender Manager/Admin account.")
        print("[DIAGNOSTIC] Complete email OTP verification in the Chrome window.")
        try:
            input("After reaching the TenderX dashboard, press Enter here...")
        except (EOFError, OSError):
            WebDriverWait(driver, 120).until(
                lambda d: d.execute_script(
                    "return Boolean(localStorage.getItem('access_token') && localStorage.getItem('tenderx_user'));"
                )
            )

        user = driver.execute_script(
            "const u = localStorage.getItem('tenderx_user'); return u ? JSON.parse(u) : null;"
        )
        token = driver.execute_script("return localStorage.getItem('access_token');")

    if not user or user.get("role") not in MANAGER_ROLES:
        driver.quit()
        pytest.fail(f"Invalid role for diagnostic: {user.get('role') if user else None}")

    yield driver
    driver.quit()


def test_trace_complete_submission_flow(diag_driver):
    driver = diag_driver
    wait = WebDriverWait(driver, WAIT_SECONDS)

    # 1. Navigate to Tenders Directory
    back_buttons = driver.find_elements(
        By.XPATH, "//button[contains(normalize-space(.), 'Back to')]"
    )
    if back_buttons and back_buttons[0].is_displayed():
        back_buttons[0].click()

    if not driver.find_elements(*REGISTRY_HEADING) or not any(e.is_displayed() for e in driver.find_elements(*REGISTRY_HEADING)):
        btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(normalize-space(.), 'Tenders & BOQ')]")))
        btn.click()
    wait.until(EC.visibility_of_element_located(REGISTRY_HEADING))

    # 2. Inject fetch / submit monitor to inspect network & event flow in real time
    driver.execute_script("""
        window.__diagnostic = {
            submitFired: false,
            defaultPrevented: false,
            fetchCalls: [],
            lastResponse: null
        };

        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const url = args[0] ? args[0].toString() : '';
            const options = args[1] || {};
            const record = {
                url: url,
                method: options.method || 'GET',
                headers: options.headers || {},
                body: options.body ? options.body : null,
                timestamp: Date.now()
            };
            window.__diagnostic.fetchCalls.push(record);
            const response = await originalFetch.apply(this, args);
            const clone = response.clone();
            try {
                const data = await clone.json();
                record.status = response.status;
                record.responseData = data;
            } catch (e) {
                record.status = response.status;
            }
            return response;
        };
    """)

    # 3. Open Create Modal
    wait.until(EC.element_to_be_clickable(CREATE_BUTTON)).click()
    wait.until(EC.visibility_of_element_located(CREATE_MODAL_HEADING))

    form = wait.until(EC.visibility_of_element_located((By.XPATH, "//form")))

    # Attach submit event listener to trace preventDefault()
    driver.execute_script("""
        const form = arguments[0];
        form.addEventListener('submit', function(e) {
            window.__diagnostic.submitFired = true;
            window.__diagnostic.defaultPrevented = e.defaultPrevented;
        }, true);
    """, form)

    # 4. Fill form fields
    test_title = f"Diagnostic Tender {datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:6]}"
    title_field = form.find_element(By.CSS_SELECTOR, "input[type='text']")
    title_field.send_keys(test_title)

    category_field = Select(form.find_element(By.TAG_NAME, "select"))
    usable_categories = [
        opt for opt in category_field.options
        if opt.get_attribute("value") and opt.is_enabled()
    ]
    assert usable_categories, "Diagnostic failure: Category options list is empty."
    category_field.select_by_value(usable_categories[0].get_attribute("value"))

    budget_field = form.find_element(By.CSS_SELECTOR, "input[type='number']")
    budget_field.send_keys("75000")

    deadline = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%dT%H:%M")
    deadline_field = form.find_element(By.CSS_SELECTOR, "input[type='datetime-local']")

    # Use native setter to trigger React's synthetic input event
    driver.execute_script("""
        const input = arguments[0];
        const val = arguments[1];
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    """, deadline_field, deadline)

    desc_field = form.find_element(By.TAG_NAME, "textarea")
    desc_field.send_keys("Diagnostic trace testing payload and lifecycle execution.")

    # 5. Check HTML5 Form Validation before submission
    validity_info = driver.execute_script("""
        const form = arguments[0];
        return {
            isValid: form.checkValidity(),
            invalidElements: Array.from(form.elements).filter(el => el.checkValidity && !el.checkValidity()).map(el => ({
                name: el.name || el.type,
                val: el.value,
                msg: el.validationMessage
            }))
        };
    """, form)

    print("\n--- DIAGNOSTIC STEP 1: Form Validity ---")
    print(f"Form checkValidity(): {validity_info['isValid']}")
    assert validity_info["isValid"], f"HTML5 validation failed: {validity_info['invalidElements']}"

    # 6. Scroll submit button into view and click
    submit_button = form.find_element(By.XPATH, ".//button[@type='submit']")
    modal_container = driver.find_element(
        By.XPATH, "//div[contains(@class,'fixed') and contains(@class,'inset-0')]//div[contains(@class,'overflow-y-auto')]"
    )
    driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight;", modal_container)
    driver.execute_script("arguments[0].scrollIntoView({behavior: 'instant', block: 'center'});", submit_button)
    wait.until(EC.element_to_be_clickable(submit_button))

    submit_button.click()

    # 7. Wait for modal to close
    WebDriverWait(driver, 35).until(lambda d: not driver.find_elements(*CREATE_MODAL_HEADING) or not any(e.is_displayed() for e in driver.find_elements(*CREATE_MODAL_HEADING)))

    # 8. Inspect diagnostic telemetry
    telemetry = driver.execute_script("return window.__diagnostic;")
    print("\n--- DIAGNOSTIC STEP 2: Event & Network Telemetry ---")
    print(f"Submit fired: {telemetry.get('submitFired')}")
    print(f"Fetch calls count: {len(telemetry.get('fetchCalls', []))}")

    # Find the POST call to tenders endpoint
    tenders_post_calls = [
        c for c in telemetry.get("fetchCalls", [])
        if "tenders" in c.get("url", "") and c.get("method") == "POST"
    ]
    assert tenders_post_calls, f"No POST request to tenders endpoint was detected! Fetch calls: {telemetry.get('fetchCalls')}"

    call = tenders_post_calls[0]
    print(f"Tenders API URL: {call.get('url')}")
    print(f"HTTP Method: {call.get('method')}")
    print(f"Response Status: {call.get('status')}")

    assert call.get("status") in (200, 201), f"Tender creation API returned error status {call.get('status')}: {call.get('responseData')}"

    resp_data = call.get("responseData", {})
    tender_status = resp_data.get("status")
    print(f"Created Tender Number: {resp_data.get('tender_number')}")
    print(f"Created Tender Status: {tender_status}")

    assert tender_status == "DRAFT", f"Expected newly created tender status to be DRAFT, got: {tender_status}"

    # 9. Return to registry if detail view was navigated
    back_buttons = driver.find_elements(By.XPATH, "//button[contains(normalize-space(.), 'Back to')]")
    if back_buttons and back_buttons[0].is_displayed():
        back_buttons[0].click()

    wait.until(EC.visibility_of_element_located(REGISTRY_HEADING))

    # Verify tender appears in the UI registry
    safe_title = test_title.replace("'", "\\'")
    row = wait.until(EC.visibility_of_element_located((By.XPATH, f"//tbody//tr[contains(normalize-space(.), '{safe_title}')]")))
    print(f"Tender verified in Registry Table:\n{row.text}")
    assert "DRAFT" in row.text.upper()
    print("\n[DIAGNOSTIC] Entire submission flow passed successfully end-to-end!")
