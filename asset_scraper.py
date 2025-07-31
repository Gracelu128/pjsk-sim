import json
import os
import time
import re
import requests
from collections import OrderedDict
from pathlib import Path
from PIL import Image
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from urllib.parse import urlparse, unquote
from webdriver_manager.chrome import ChromeDriverManager

def scrape_card_images(start_num=1, end_num=1212):
    """Scrape card images using Selenium with automatic driver management"""
    # Configuration
    asset_path = "/Users/gracelu/Desktop/pjsk sim/src/assets/cards"
    os.makedirs(asset_path, exist_ok=True)
    
    # Set up Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run in background
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    
    # Set up Chrome driver with WebDriver Manager
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    for card_id in range(start_num, end_num + 1):
        url = f"https://sekai.best/card/{card_id}"
        print(f"Processing card #{card_id}...")
        
        try:
            # Load the page with Selenium
            driver.get(url)
            
            # Wait for the card element to be present
            wait = WebDriverWait(driver, 15)
            # wait for elem with card image to load
            card_div = wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.card-img-root[role='img']"))
            )
            
            # Get the style attribute, where .webp url is
            style_attr = card_div.get_attribute("style")
            if not style_attr:
                print(f"  ✗ Style attribute missing")
                continue
                
            # Extract image URL using regex
            pattern = re.compile(r'url\("(https://[^"]+card_normal\.webp)"\)')
            match = pattern.search(style_attr)

            if not match:
                print(f"  ✗ Couldn't extract image URL from style attribute")
                print(f"  Style content: {style_attr}")
                continue

            normal_url = match.group(1)
            trained_url = normal_url.replace("card_normal.webp", "card_after_training.webp")

            print(f"  ✓ Found normal art URL: {normal_url}")
            print(f"  ✓ Guessed trained art URL: {trained_url}")

            # Create subdirectory for this card
            card_dir = os.path.join(asset_path, str(card_id))
            os.makedirs(card_dir, exist_ok=True)

            # Download and save both images
            for label, image_url in [("card_normal.webp", normal_url), ("card_after_training.webp", trained_url)]:
                try:
                    headers = {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                        "Referer": url
                    }
                    img_response = requests.get(image_url, headers=headers, timeout=10)
                    img_response.raise_for_status()

                    if not img_response.headers.get('Content-Type', '').startswith('image/'):
                        print(f"  ✗ Unexpected content type for {label}: {img_response.headers.get('Content-Type')}")
                        continue

                    save_path = os.path.join(card_dir, label)
                    with open(save_path, "wb") as f:
                        f.write(img_response.content)

                    print(f"    ✓ Saved {label} ({len(img_response.content)//1024} KB)")
                except Exception as e:
                    print(f"    ! Failed to save {label}: {e}")
            
        except Exception as e:
            print(f"  ! Error processing card {card_id}: {str(e)}")
        
        time.sleep(1)  # Be polite to the server

    driver.quit()
    print("Scraping completed!")

def scrape_card_info(start_num=1, end_num=1212):
    """Scrape card images using Selenium with automatic driver management"""
    # Configuration
    json_path = "/Users/gracelu/Desktop/pjsk sim/src/data/card_metadata.json"
    icons_path = "/Users/gracelu/Desktop/pjsk sim/src/assets/icons"
    os.makedirs(icons_path, exist_ok=True)
    data = None
    if os.path.exists(json_path):
        with open(json_path, 'r') as f:
            data = json.load(f)
    else:
        data = {}
    
    # Set up Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run in background
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    
    # Set up Chrome driver with WebDriver Manager
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    base_url = "https://www.sekaipedia.org/wiki/List_of_cards"
        
    try:
        # Load the page with Selenium
        driver.get(base_url)
        
        # Wait for the card element to be present
        wait = WebDriverWait(driver, 15)
        rows = driver.find_elements(By.CSS_SELECTOR, "table.wikitable.sortable.jquery-tablesorter tbody tr")

        # Loop through every single card entry, open up webpage and extract info about card
        for index, row in enumerate(rows):
            try:
                # # Find the card name <a> tag (3rd column, so 2nd index after Thumbnail)
                # link_element = row.find_element(By.CSS_SELECTOR, "td:nth-child(3) a")

                # # Extract href
                # href = link_element.get_attribute("href")  # absolute URL if available
                # if not href.startswith("http"):
                #     href = base_url + link_element.get_attribute("href")

                # print(f"[{index}] Visiting card page: {href}")

                # # Open the link in the current browser tab
                # driver.get(href)

                # Extract desired card info here
                # Extract card ID from first column
                card_id = row.find_element(By.CSS_SELECTOR, "td:nth-child(1)").text.strip()
                
                # Skip if we already have this card
                if card_id in data:
                    print(f"[{index}] Skipping card {card_id} (already in database)")
                    continue
                    
                # Extract icon from second column
                icon_img = row.find_element(By.CSS_SELECTOR, "td:nth-child(2) img")
                icon_url = icon_img.get_attribute("src")
                if icon_url.startswith("//"):
                    icon_url = "https:" + icon_url
                # Remove the last segment (e.g., '64px-Saki_1_thumbnail.png')
                parsed = urlparse(icon_url)
                path_parts = parsed.path.split("/")
                if "thumb" in path_parts:
                    thumb_index = path_parts.index("thumb")
                    full_path_parts = path_parts[:thumb_index] + path_parts[thumb_index + 1:thumb_index + 4]  # Skip "thumb" and keep the 3 parts after
                    full_path = "/".join(full_path_parts)
                    full_url = f"{parsed.scheme}://{parsed.netloc}{full_path}"
                print(f"Icon url: {icon_url}")
                print(f"Full url: {full_url}")
                
                # Download both 64px and full-size icon
                sizes = {
                    "thumb": icon_url,  # e.g. the 64px URL
                    "full": full_url  # strip the "64px-" prefix to get full-size
                }

                card_icon_dir = os.path.join(icons_path, str(card_id))
                os.makedirs(card_icon_dir, exist_ok=True)

                for size_label, url in sizes.items():
                    png_filename = f"{card_id}_{size_label}.png"
                    png_filepath = os.path.join(icons_path, png_filename)

                    headers = {
                        "User-Agent": "Mozilla/5.0"
                    }
                    response = requests.get(url, timeout=10, headers=headers)
                    if response.status_code == 200:
                        with open(png_filepath, "wb") as f:
                            f.write(response.content)
                        print(f"Saved {size_label} PNG")

                        # Convert to WebP
                        webp_filename = f"{card_id}_{size_label}.webp"
                        webp_filepath = os.path.join(card_icon_dir, webp_filename)
                        with Image.open(png_filepath) as img:
                            img.save(webp_filepath, "webp")

                        os.remove(png_filepath)
                    else:
                        print(f"Failed to retrieve {size_label} icon for card {card_id}")


                # Extract card title from third column
                character_link = row.find_element(By.CSS_SELECTOR, "td:nth-child(3) a")
                card_title = character_link.get_attribute("title").strip()

                # Extract character from fourth column
                character = row.find_element(By.CSS_SELECTOR, "td:nth-child(4)").text.strip()

                # Extract unit from fifth column
                unit = row.find_element(By.CSS_SELECTOR, "td:nth-child(5)").text.strip()
                
                # Extract support unit from fourth column
                support_unit = row.find_element(By.CSS_SELECTOR, "td:nth-child(6)").text.strip()
                if not support_unit:
                    support_unit = None
                
                # Extract attribute from fifth column
                attribute = row.find_element(By.CSS_SELECTOR, "td:nth-child(7)").text.strip()
                
                # Extract rarity from sixth column
                rarity_td = row.find_element(By.CSS_SELECTOR, "td:nth-child(8)")
                # Count star images to determine rarity
                stars = rarity_td.find_elements(By.CSS_SELECTOR, "img[src*='Gold_star']")
                rarity = len(stars)
                
                # Extract status from seventh column
                status = row.find_element(By.CSS_SELECTOR, "td:nth-child(7)").text.strip()

                if (status == "Birthday limited"):
                    rarity = "Birthday"

                data[card_id] = {
                    "id" : card_id,
                    "character" : character,
                    "english name" : card_title,
                    "unit" : unit,
                    "support unit" : support_unit,
                    "attribute" : attribute,
                    "rarity" : rarity,
                    "status" : status,
                }

                print(f"[{index}] Processed card {card_id}: {card_title}")
                
                # Save progress periodically
                if index % 10 == 0:
                    with open(json_path, 'w') as f:
                        json.dump(data, f, indent=2)

                # Optional: short pause to be kind to the server
                time.sleep(1)
            except Exception as e:
                print(f"Error on row {index}: {e}")
    except Exception as e:
        print(f"  ! Error processing card info")

    finally:
        driver.quit()
        with open(json_path, 'w') as f:
            json.dump(data, f, indent=2)
        print("Scraping completed! Data saved to JSON.")

    driver.quit()
    print("Scraping completed!")

    # Write back to json
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=2)

def json_reorder(json_path, key_order):
    def reorder_dict(d, key_order):
        return OrderedDict((key, d.get(key, None)) for key in key_order)

    # Load the JSON file
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Reorder keys in each entry
    formatted_data = {
        card_id: reorder_dict(card_data, key_order)
        for card_id, card_data in data.items()
    }

    # Save the result back to the same file (or modify if needed)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(formatted_data, f, indent=2, ensure_ascii=False)

def asset_check():
    for i in range(1, 1213):
        path_check = Path(f"/Users/gracelu/Desktop/pjsk sim/src/assets/cards/{i}")

        if not path_check.is_dir():
            print(f"Card with id {i} does not exist.")

def main():
    """Main function to execute scraping"""
    # print("Starting PJSK card image scraper with Selenium...")
    # print("This will automatically download ChromeDriver if needed...")
    # scrape_card_images(start_num=1, end_num=1212)
    # print("Task completed. Check the output directory for results.")
    # asset_check()
    print("Starting PJSK card information scraper with Selenium...")
    print("This will automatically download ChromeDriver if needed...")
    scrape_card_info(start_num=1, end_num=1212)
    print("Task completed. Check the json for results.")
    # desired_card_metadata_order = [
    #     "id",
    #     "character",
    #     "english name",
    #     "unit",
    #     "support unit",
    #     "attribute",
    #     "rarity",
    #     "status"
    # ]
    # json_reorder("/Users/gracelu/Desktop/pjsk sim/src/data/card_metadata.json", desired_card_metadata_order)

if __name__ == "__main__":
    main()