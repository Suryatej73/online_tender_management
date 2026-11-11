
from selenium import webdriver
from selenium.webdriver.common.by import By
import time

driver = webdriver.Chrome()

driver.get("http://localhost:5173")

print("Page title:", driver.title)
print("Current URL:", driver.current_url)

# Keep Chrome open for manual inspection
input("Press Enter to close the browser...")

driver.quit()
