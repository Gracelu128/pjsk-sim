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
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from urllib.parse import urlparse, unquote
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

# Global var to store start and end card ID
start_id = 1
end_id = 1222
# Global var to store start and end gacha ID
start_gacha = 1
end_gacha = 783

def scrape_card_images(start_num=start_id, end_num=end_id):
    """Scrape card images using Selenium with automatic driver management"""
    # Configuration
    asset_path = "/Users/gracelu/Desktop/pjsk sim/my-app/public/cards"
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

def sekaipedia_scrape_card_info(start_num=start_id, end_num=end_id):
    """Scrape card images using Selenium with automatic driver management"""
    # Configuration
    json_path = "/Users/gracelu/Desktop/pjsk sim/my-app/src/data/card_metadata.json"
    icons_path = "/Users/gracelu/Desktop/pjsk sim/my-app/public/icons"
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

        card_hrefs = []

        # Loop through every single card entry, open up webpage and extract info about card
        for index, row in enumerate(rows):
            try:

                # Extract desired card info here
                # Extract card ID from first column
                card_id = row.find_element(By.CSS_SELECTOR, "td:nth-child(1)").text.strip()
                print(f"Working on {card_id}")
                
                # Skip cards outside the specified range
                card_id_int = int(card_id)
                if card_id_int < start_num:
                    print(f"Skipping {card_id}")
                    continue
                if card_id_int > end_num:
                    break

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
                # Store character link in card_hrefs
                relative_url = character_link.get_attribute("href")
                # OR if the href is relative (e.g., "/wiki/Hatsune_Miku"), construct the full URL:
                if relative_url.startswith("/"):
                    full_url = "https://www.sekaipedia.org" + relative_url
                else:
                    full_url = relative_url  # Already absolute

                card_hrefs.append((card_id, full_url))

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
                status = row.find_element(By.CSS_SELECTOR, "td:nth-child(9)").text.strip()

                if (status == "Birthday limited"):
                    rarity = "Birthday"

                data[card_id] = {}
                data[card_id]["id"] = card_id
                data[card_id]["character"] = character
                data[card_id]["english name"] = card_title
                data[card_id]["unit"] = unit
                data[card_id]["support unit"] = support_unit
                data[card_id]["attribute"] = attribute
                data[card_id]["rarity"] = rarity
                data[card_id]["status"] = status

                print(f"[{index}] Processed card {card_id}: {card_title}")
                
                # Save progress periodically
                if index % 10 == 0:
                    with open(json_path, 'w') as f:
                        json.dump(data, f, indent=2)

                # Optional: short pause to be kind to the server
                time.sleep(1)
            except Exception as e:
                print(f"Error on row {index}: {e}")

        # Loop over hrefs, open individual card pages to extract more information
        for index, (card_id, full_url) in enumerate(card_hrefs):
            print(f"[{index}] Card {card_id}")
            # Navigate to the page
            driver.get(full_url)
            print(full_url)

            wait = WebDriverWait(driver, 15)
            # Flexible section detection using case-insensitive ID matching
            section = wait.until(
                EC.presence_of_element_located((
                    By.XPATH, 
                    "//section[.//*[translate(@id, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 'skill_name']]"
                ))
            )
            # print(section.get_attribute("outerHTML"))

            en_skill_name = None
            name_uls = section.find_elements(By.XPATH, ".//h3[.//*[contains(translate(@id, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'skill_name')]]/following-sibling::ul")
            if name_uls:
                name_ul = name_uls[0]
                try:
                    en_li = name_ul.find_element(By.XPATH, ".//li[contains(., 'English:')]")
                    en_skill_name = en_li.text.split("English:")[1].strip()
                except:
                    pass

            print(f"  Skill Name: {en_skill_name}")

            # Robust extraction for skill effect
            en_skill_effect = None
            effect_uls = section.find_elements(By.XPATH, ".//h3[.//*[contains(translate(@id, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'skill_effect')]]/following-sibling::ul")
            if effect_uls:
                effect_ul = effect_uls[0]
                try:
                    level4_li = effect_ul.find_element(By.XPATH, ".//li[contains(., 'Level 4:')]")
                    en_skill_effect = level4_li.text.split("Level 4:")[1].strip().replace(";", " and")
                except:
                    pass

            print(f"  Skill Effect: {en_skill_effect}")

            # Load the Main Stats section (for Power)
            try:
                # Fallback: find section after h2#Stats
                stats_heading = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//h2[.//span[@id='Stats']]"))
                )
                stats_section = stats_heading.find_element(By.XPATH, "following-sibling::section[1]")
            except Exception as e:
                print("Fallback: Try to look for 'Main_stats' section.")
                stats_section = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//section[.//span[@id='Main_stats']]"))
                )

            power_val = stats_section.find_element(By.XPATH, ".//tr[th[contains(., 'Power')]]/td[2]").text
            print(f"  Power (max): {power_val}")

            data[str(card_id)]["skill name (english)"] = en_skill_name
            data[str(card_id)]["skill effect (english)"] = en_skill_effect
            data[str(card_id)]["talent (max)"] = int(power_val)

            # Save progress periodically
            if index % 10 == 0:
                with open(json_path, 'w') as f:
                    json.dump(data, f, indent=2)
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

def sekaibest_scrape_gacha_info(start_gacha=start_gacha, end_gacha=end_gacha):
    # Configuration
    json_path = "/Users/gracelu/Desktop/pjsk sim/my-app/src/data/gacha_metadata.json"
    rate_json_path = "/Users/gracelu/Desktop/pjsk sim/my-app/src/data/gacha_rates.json"

    data = None
    if os.path.exists(json_path):
        with open(json_path, 'r') as f:
            data = json.load(f)
    else:
        data = {}

    rate_data = None
    if os.path.exists(rate_json_path):
        with open(rate_json_path, 'r') as f:
            rate_data = json.load(f)
    else:
        rate_data = []

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

    for gacha_id in range(start_gacha, end_gacha + 1):
        url = f"https://sekai.best/gacha/{gacha_id}"
        print(f"Processing gacha #{gacha_id}...")
        
        try:
            # Load url
            driver.get(url)
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.XPATH, '//h6[contains(., "ID")]'))
            )
            
            # Get ID
            id_element = driver.find_element(By.XPATH, '//h6[contains(., "ID")]/following-sibling::p')
            id = id_element.text.strip()
            
            # if id not in data:
            #     data[id] = {}
            # data[id]['id'] = gacha_id

            # # Get jp and en title
            # combined_title = driver.find_element(
            #     By.XPATH,
            #     '//h6[@class="MuiTypography-root MuiTypography-h6 css-1u18iur"]'
            # ).text
            # jp_title, en_title = [t.strip() for t in combined_title.split('|', 1)]
            # data[id]['title (japanese)'] = jp_title
            
            # # Get Release Date
            # release_date = driver.find_element(
            #     By.XPATH, 
            #     '//h6[contains(., "Available From")]/following-sibling::p'
            # ).text
            # data[id]['release_date'] = release_date

            # # Determine gacha type
            # gacha_type = "unknown"  # Default value
            
            # # First try: Check for Exchange Item image
            # try:
            #     exchange_img = driver.find_element(
            #         By.XPATH, 
            #         '//h6[contains(., "Exchange Item")]/following-sibling::img'
            #     )
            #     img_src = exchange_img.get_attribute('src')
                
            #     if 'ceil_item.webp' in img_src:
            #         gacha_type = 'normal'
            #     elif 'ceil_item_limited.webp' in img_src:
            #         gacha_type = 'limited'
            #     elif 'ceil_item_birthday.webp' in img_src:
            #         gacha_type = 'birthday'
            #     else:
            #         # Handle unexpected image names
            #         if 'limited' in img_src.lower():
            #             gacha_type = 'limited'
            #         elif 'birthday' in img_src.lower():
            #             gacha_type = 'birthday'
            #         else:
            #             gacha_type = 'normal'
            
            # except:
            #     # Fallback: Check for explicit Type text
            #     try:
            #         type_text = driver.find_element(
            #             By.XPATH, 
            #             '//h6[contains(., "Type")]/following-sibling::p'
            #         ).text.lower()
                    
            #         if 'normal' in type_text:
            #             gacha_type = 'normal'
            #         elif 'limited' in type_text:
            #             gacha_type = 'limited'
            #         elif 'birthday' in type_text:
            #             gacha_type = 'birthday'
            #         else:
            #             # Handle other type texts
            #             if '限定' in type_text:  # Japanese for "limited"
            #                 gacha_type = 'limited'
            #             elif 'バースデー' in type_text:  # Japanese for "birthday"
            #                 gacha_type = 'birthday'
            #             elif 'beginner' in type_text:
            #                 gacha_type = 'beginner'
            #             elif 'gift' in type_text:
            #                 gacha_type = 'gift'
            #             else:
            #                 gacha_type = type_text
            #     except:
            #         print("Did not found gacha type")

            # data[id]['type'] = gacha_type

            # # Scrape Gacha Rates
            # # Store unique normal and guaranteed gacha rate pairs to rate_data
            # rates = extract_rates(driver)
            
            # # Create or find rate index
            # rate_index = None
            # for idx, rate_struct in enumerate(rate_data):
            #     if rate_struct == rates:
            #         rate_index = idx
            #         break
            
            # if rate_index is None:
            #     rate_data.append(rates)
            #     rate_index = len(rate_data) - 1
            
            # data[id]['gacha_rate_index'] = rate_index

            # Extract featured_cards
            featured_cards = extract_featured_cards(driver, gacha_id)
            data[id]['featured_cards'] = featured_cards
            
            # Periodically save progress
            if gacha_id % 10 == 0:
                with open(json_path, 'w') as f:
                    json.dump(data, f, indent=2)
                with open(rate_json_path, 'w') as f:
                    json.dump(rate_data, f, indent=2)

        except Exception as e:
            print(f"Issue processing gacha {gacha_id}")
            print(e)

    driver.quit()

    # Write back to json
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=2)
    # Write gacha rate back to json
    with open(rate_json_path, 'w') as f:
        json.dump(rate_data, f, indent=2)

    print("Scraping completed!")

def extract_featured_cards(driver, gacha_id):
    featured_cards = []

    try:
        # Click the button to open the modal (works for singular or plural)
        gacha_cards_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable(
                (By.XPATH, '//h6[contains(text(), "Pick-up Member")]/following-sibling::button')
            )
        )
        gacha_cards_button.click()

        # Wait for modal to appear
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.XPATH, '//h2[contains(text(), "Gacha Cards")]'))
        )

        # Extract all card elements
        card_elements = driver.find_elements(
            By.XPATH,
            '//div[contains(@class, "css-tuxzvu")]//div[contains(@class, "css-1ecxf4")]'
        )

        for card in card_elements:
            try:
                # Extract card ID from href attribute
                card_link = card.find_element(By.TAG_NAME, 'a')
                href = card_link.get_attribute('href')
                card_id = href.split('/')[-1]

                # Extract rate percentage(s)
                rate_text = card.find_element(
                    By.XPATH, './/p[contains(@class, "css-khp380")]'
                ).text.splitlines()  # splits by newline

                normal_rate = float(rate_text[0].replace('%', '').strip())
                guaranteed_rate = float(rate_text[1].replace('%', '').strip()) if len(rate_text) > 1 else None

                featured_cards.append({
                    "card_id": card_id,
                    "normal_rate": normal_rate,
                    "guaranteed_rate": guaranteed_rate
                })

            except Exception as e:
                print(f"  Error processing card in gacha {gacha_id}: {str(e)}")
                continue

        # Close the modal by pressing Escape
        ActionChains(driver).send_keys(Keys.ESCAPE).perform()

    except Exception as e:
        print(f"  Couldn't extract featured cards for gacha {gacha_id}: {str(e)}")

    return featured_cards

def extract_rates(driver):
    """Extract gacha rates from the page"""
    rates = {"normal": {}, "guaranteed": {}}
    
    try:
        # Extract normal roll rates
        normal_header = driver.find_element(By.XPATH, '//h6[contains(., "Normal Roll Rate")]')
        normal_section = normal_header.find_element(By.XPATH, './ancestor::div[contains(@class, "MuiGrid-container")][1]')
        
        # Process each rate row
        rows = normal_section.find_elements(By.XPATH, './/div[contains(@class, "MuiGrid-grid-xs-12")]')
        for row in rows:
            try:
                # Count stars to determine rarity
                stars = row.find_elements(By.XPATH, './/img')
                rarity = len(stars)

                # Map "1" rarity to "birthday"
                rarity_key = "birthday" if rarity == 1 else str(rarity)
                
                # Extract percentage value
                perc_text = row.find_element(By.XPATH, './/div[contains(@class, "css-1wxaqej") and not(./img)]').text
                perc_value = float(perc_text.replace('%', '').strip())
                
                rates["normal"][rarity_key] = perc_value
            except:
                continue
    except:
        pass
    
    try:
        # Extract guaranteed roll rates
        guar_header = driver.find_element(By.XPATH, '//h6[contains(., "Guaranteed Roll Rate")]')
        guar_section = guar_header.find_element(By.XPATH, './ancestor::div[contains(@class, "MuiGrid-container")][1]')
        
        # Process each rate row
        rows = guar_section.find_elements(By.XPATH, './/div[contains(@class, "MuiGrid-grid-xs-12")]')
        for row in rows:
            try:
                # Count stars to determine rarity
                stars = row.find_elements(By.XPATH, './/img')
                rarity = len(stars)

                # Map "1" rarity to "birthday"
                rarity_key = "birthday" if rarity == 1 else str(rarity)
                
                # Extract percentage value
                perc_text = row.find_element(By.XPATH, './/div[contains(@class, "css-1wxaqej") and not(./img)]').text
                perc_value = float(perc_text.replace('%', '').strip())
                
                rates["guaranteed"][rarity_key] = perc_value
            except:
                continue
    except:
        pass
    
    return rates

def sekaibest_scrape_card_info(start_num=start_id, end_num=end_id):
    """Scrape card images using Selenium with automatic driver management"""
    # Configuration
    json_path = "/Users/gracelu/Desktop/pjsk sim/my-app/src/data/card_metadata.json"
    audio_path = "/Users/gracelu/Desktop/pjsk sim/my-app/public/card_audio"
    costume_path = "/Users/gracelu/Desktop/pjsk sim/my-app/public/costumes"

    os.makedirs(audio_path, exist_ok=True)
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

    for card_id in range(start_num, end_num + 1):
        url = f"https://sekai.best/card/{card_id}"
        print(f"Processing card #{card_id}...")
        
        try:
            # Load the page with Selenium
            driver.get(url)
            
            # Wait for the card element to be present
            wait = WebDriverWait(driver, 15)
            card_container = wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.MuiGrid-container.MuiGrid-direction-xs-column"))
            )

            # Find the Title section
            title_section = driver.find_element(By.XPATH, 
                "//div[contains(@class, 'MuiGrid-container') and .//h6[contains(text(), 'Title')]]")

            # Get the container that holds both title paragraphs
            title_container = title_section.find_element(By.CSS_SELECTOR, "div.MuiGrid-container.MuiGrid-direction-xs-column")

            # Get both title paragraphs
            title_paragraphs = title_container.find_elements(By.CSS_SELECTOR, "p.MuiTypography-body1")

            if len(title_paragraphs) >= 2:
                # First paragraph is Japanese title
                jp_title = title_paragraphs[0].text.strip()
                print(f"  Japanese Title: {jp_title}")
                data[str(card_id)]["japanese name"] = jp_title
            else:
                print("  ! Couldn't find both title paragraphs")

            try:
                # Find the Gacha Phrase section
                gacha_section = card_container.find_element(
                    By.XPATH, 
                    ".//div[contains(@class, 'MuiGrid-container') and .//h6[contains(., 'Gacha Phrase')]]"
                )
                
                # Get Japanese gacha phrase (first paragraph in the gacha container)
                jp_gacha_phrase = gacha_section.find_element(
                    By.XPATH, 
                    ".//div[contains(@class, 'MuiGrid-direction-xs-column')]//p[contains(@class, 'MuiTypography-body1')][1]"
                ).text.strip()
                
                print(f"  Japanese Gacha Phrase: {jp_gacha_phrase}")
                data[str(card_id)]["gacha phrase"] = jp_gacha_phrase

                # Get audio URL
                audio_link = gacha_section.find_element(
                    By.XPATH, 
                    ".//a[contains(@href, '.mp3')]"
                )
                audio_url = audio_link.get_attribute("href")
                print(f"  Audio URL: {audio_url}")
                
                # Download audio file
                if audio_url:
                    response = requests.get(audio_url)
                    if response.status_code == 200:
                        audio_file = os.path.join(audio_path, f"{card_id}.mp3")
                        with open(audio_file, "wb") as f:
                            f.write(response.content)
                        print(f"  ✓ Downloaded audio: {audio_file}")
                    else:
                        print(f"  ! Failed to download audio: HTTP {response.status_code}")
            except Exception as e:
                print(f"  ! No gacha phrase {card_id}: {str(e)}")

            # Find the Character section
            character_section = card_container.find_element(
                By.XPATH, 
                ".//div[contains(@class, 'MuiGrid-container') and .//h6[contains(., 'Character')]]"
            )
            
            # Get Japanese character name (first paragraph in the character container)
            jp_character = character_section.find_element(
                By.XPATH, 
                ".//div[contains(@class, 'MuiGrid-direction-xs-column')]//p[contains(@class, 'MuiTypography-body1')][1]"
            ).text.strip()
            
            print(f"  Character (JP): {jp_character}")
            data[str(card_id)]["character (japanese)"] = jp_character

            card_container = wait.until(EC.presence_of_element_located((
                By.XPATH,
                "//div[contains(@class, 'MuiGrid-direction-xs-column') and contains(@class, 'css-fkg94b')][.//h6[contains(., 'Skill Name')] and .//h6[contains(., 'Skill Effect') or contains(., 'Skill Effect (Normal)')]]"
            )))

            # Extract skill name section
            skill_name_section = card_container.find_element(
                By.XPATH, ".//h6[contains(., 'Skill Name')]/ancestor::div[contains(@class, 'MuiGrid-wrap-xs-nowrap')]"
            )

            # Extract 
            name_paragraphs = skill_name_section.find_elements(
                By.CSS_SELECTOR, "div.MuiGrid-direction-xs-column > p"
            )
            jp_skill_name = name_paragraphs[0].text

            # Extract skill effect section
            skill_effect_section = card_container.find_element(
                By.XPATH, ".//h6[contains(., 'Skill Effect')]/ancestor::div[contains(@class, 'MuiGrid-wrap-xs-nowrap')]"
            )

            # Extract
            effect_paragraphs = skill_effect_section.find_elements(
                By.CSS_SELECTOR, "div.MuiGrid-direction-xs-column > p"
            )
            jp_skill_effect = effect_paragraphs[0].text

            print("Japanese Skill Name:", jp_skill_name)
            print("Japanese Skill Effect:", jp_skill_effect)

            data[str(card_id)]["skill name (japanese)"] = jp_skill_name
            data[str(card_id)]["skill effect (japanese)"] = jp_skill_effect

            # Try to scrape for costume for if card is 4 star
            if data[str(card_id)]["rarity"] == 4:
                # Try to find the costume rewards section
                try:
                    # Use a more specific XPath to target only costume rewards
                    rewards_container = WebDriverWait(driver, 5).until(
                        EC.presence_of_element_located((By.XPATH,
                            "//div[contains(@class, 'MuiGrid-wrap-xs-nowrap') and .//h6[contains(., 'Rewards')] and .//img[contains(@src, 'costume/')]]"
                        ))
                    )
                    
                    # Find all costume images within this specific container
                    costume_images = rewards_container.find_elements(
                        By.CSS_SELECTOR, "img[src*='costume/']"
                    )
                    
                    if costume_images:
                        # Create directory for this card's costumes
                        costume_dir = f"/Users/gracelu/Desktop/pjsk sim/my-app/public/costumes/{card_id}"
                        os.makedirs(costume_dir, exist_ok=True)
                        
                        # Download and save each costume image
                        downloaded_files = []
                        for img in costume_images:
                            try:
                                url = img.get_attribute('src')
                                filename = url.split('/')[-1]
                                filepath = os.path.join(costume_dir, filename)
                                
                                # Download only if file doesn't exist
                                if not os.path.exists(filepath):
                                    response = requests.get(url)
                                    with open(filepath, 'wb') as f:
                                        f.write(response.content)
                                
                                downloaded_files.append(filename)
                            except Exception as e:
                                print(f"  ! Error downloading costume image: {str(e)}")
                        
                        print(f"  Downloaded {len(downloaded_files)} costume images")
                    else:
                        print("  No costume images found in rewards section")
                        
                except Exception as e:
                    print("  No costume rewards section found for this card")

            # Save progress periodically
            if card_id % 10 == 0:
                with open(json_path, 'w') as f:
                    json.dump(data, f, indent=2)

        except Exception as e:
            print(f"  ! Error processing card {card_id}: {str(e)}")
        
        time.sleep(1)  # Be polite to the server

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

def split_card_metadata(
    input_path="/Users/gracelu/Desktop/pjsk sim/my-app/src/data/card_metadata.json",
    output_dir="/Users/gracelu/Desktop/pjsk sim/my-app/src/data/individual_card_metadata"
):
    # Make sure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Load big JSON file
    with open(input_path, "r", encoding="utf-8") as infile:
        metadata = json.load(infile)

    count = 0

    # Save each card to its own JSON file
    for card_id, card_data in metadata.items():
        filename = f"card_{card_id}.json"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as outfile:
            json.dump(card_data, outfile, ensure_ascii=False, indent=2)
        count += 1

    print(f"Done! Exported {count} cards to: {output_dir}")

def split_gacha_metadata(
    input_path="/Users/gracelu/Desktop/pjsk sim/my-app/src/data/gacha_metadata.json",
    output_dir="/Users/gracelu/Desktop/pjsk sim/my-app/src/data/individual_gacha_metadata"
):
    # Make sure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Load big JSON file
    with open(input_path, "r", encoding="utf-8") as infile:
        metadata = json.load(infile)

    count = 0

    # Save each card to its own JSON file
    for gacha_id, gacha_data in metadata.items():
        filename = f"gacha_{gacha_id}.json"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as outfile:
            json.dump(gacha_data, outfile, ensure_ascii=False, indent=2)
        count += 1

    print(f"Done! Exported {count} cards to: {output_dir}")

def main():
    # scrape_gacha_assets()
    # """Main function to execute scraping"""
    # print("Starting PJSK card image scraper with Selenium...")
    # scrape_card_images(start_num=1218 , end_num=1222)
    # sekaipedia_scrape_card_info(start_num=1218, end_num=1222)
    # sekaibest_scrape_card_info(start_num=1218, end_num=1222)
    # desired_card_metadata_order = [
    #     "id",
    #     "character",
    #     "character (japanese)",
    #     "english name",
    #     "japanese name",
    #     "skill name (japanese)",
    #     "skill name (english)",
    #     "skill effect (japanese)",
    #     "skill effect (english)",
    #     "talent (max)",
    #     "gacha phrase",
    #     "unit",
    #     "support unit",
    #     "attribute",
    #     "rarity",
    #     "status"
    # ]
    # json_reorder("/Users/gracelu/Desktop/pjsk sim/my-app/src/data/card_metadata.json", desired_card_metadata_order)
    # split_card_metadata()
    # scrape_screen_texture_assets()
    # split_gacha_metadata()
    sekaipedia_scrape_gacha_banner(start_num=1, end_num=318)
    # sekaibest_scrape_gacha_info(start_gacha=1, end_gacha=783)


GACHA_BASE_URL="https://www.sekaipedia.org/wiki/Category:Gacha_banners"
def sekaipedia_scrape_gacha_banner(start_num=start_id, end_num=end_id):
    """Scrape card images using Selenium with automatic driver management"""
    # Configuration
    banners_path = "/Users/songchuanhua/Documents/GitHub/pjsk-sim/my-app/public/gacha"
    os.makedirs(banners_path, exist_ok=True)
    data = None
    
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
        
    try:
        # Load the page with Selenium
        driver.get(GACHA_BASE_URL)

        # Wait for the card element to be present
        wait = WebDriverWait(driver, 15)
        rows = driver.find_elements(By.CSS_SELECTOR, "table.wikitable.sortable.jquery-tablesorter tbody tr")

        card_hrefs = []

        # Loop through every single card entry, open up webpage and extract info about card
        for index, row in enumerate(rows):
            try:

                # Extract desired card info here
                # Extract card ID from first column
                card_id = row.find_element(By.CSS_SELECTOR, "td:nth-child(1)").text.strip()
                print(f"Working on {card_id}")
                
                # Skip cards outside the specified range
                card_id_int = int(card_id)
                if card_id_int < start_num:
                    print(f"Skipping {card_id}")
                    continue
                if card_id_int > end_num:
                    break

                # Extract icon from second column
                icon_img = row.find_element(By.CSS_SELECTOR, "td:nth-child(2) img")
                icon_url = icon_img.get_attribute("src")
                if icon_url.startswith("//"):
                    icon_url = "https:" + icon_url
                # Remove the last segment (e.g., '64px-Saki_1_thumbnail.png')
                parsed = urlparse(icon_url)
                path_parts = parsed.path.split("/")
                if "thumb" in path_parts:
                    path_parts.remove("thumb")
                    full_url = urlunparse(parsed._replace(path=("/".join(path_parts))))
                print(f"Icon url: {icon_url}")
                print(f"Full url: {full_url}")
                

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
                # Store character link in card_hrefs
                relative_url = character_link.get_attribute("href")
                # OR if the href is relative (e.g., "/wiki/Hatsune_Miku"), construct the full URL:
                if relative_url.startswith("/"):
                    full_url = "https://www.sekaipedia.org" + relative_url
                else:
                    full_url = relative_url  # Already absolute

                card_hrefs.append((card_id, full_url))

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
                status = row.find_element(By.CSS_SELECTOR, "td:nth-child(9)").text.strip()

                if (status == "Birthday limited"):
                    rarity = "Birthday"

                data[card_id] = {}
                data[card_id]["id"] = card_id
                data[card_id]["character"] = character
                data[card_id]["english name"] = card_title
                data[card_id]["unit"] = unit
                data[card_id]["support unit"] = support_unit
                data[card_id]["attribute"] = attribute
                data[card_id]["rarity"] = rarity
                data[card_id]["status"] = status

                print(f"[{index}] Processed card {card_id}: {card_title}")
                
                # Save progress periodically
                if index % 10 == 0:
                    with open(json_path, 'w') as f:
                        json.dump(data, f, indent=2)

                # Optional: short pause to be kind to the server
                time.sleep(1)
            except Exception as e:
                print(f"Error on row {index}: {e}")

        # Loop over hrefs, open individual card pages to extract more information
        for index, (card_id, full_url) in enumerate(card_hrefs):
            print(f"[{index}] Card {card_id}")
            # Navigate to the page
            driver.get(full_url)
            print(full_url)

            wait = WebDriverWait(driver, 15)
            # Flexible section detection using case-insensitive ID matching
            section = wait.until(
                EC.presence_of_element_located((
                    By.XPATH, 
                    "//section[.//*[translate(@id, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = 'skill_name']]"
                ))
            )
            # print(section.get_attribute("outerHTML"))

            en_skill_name = None
            name_uls = section.find_elements(By.XPATH, ".//h3[.//*[contains(translate(@id, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'skill_name')]]/following-sibling::ul")
            if name_uls:
                name_ul = name_uls[0]
                try:
                    en_li = name_ul.find_element(By.XPATH, ".//li[contains(., 'English:')]")
                    en_skill_name = en_li.text.split("English:")[1].strip()
                except:
                    pass

            print(f"  Skill Name: {en_skill_name}")

            # Robust extraction for skill effect
            en_skill_effect = None
            effect_uls = section.find_elements(By.XPATH, ".//h3[.//*[contains(translate(@id, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'skill_effect')]]/following-sibling::ul")
            if effect_uls:
                effect_ul = effect_uls[0]
                try:
                    level4_li = effect_ul.find_element(By.XPATH, ".//li[contains(., 'Level 4:')]")
                    en_skill_effect = level4_li.text.split("Level 4:")[1].strip().replace(";", " and")
                except:
                    pass

            print(f"  Skill Effect: {en_skill_effect}")

            # Load the Main Stats section (for Power)
            try:
                # Fallback: find section after h2#Stats
                stats_heading = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//h2[.//span[@id='Stats']]"))
                )
                stats_section = stats_heading.find_element(By.XPATH, "following-sibling::section[1]")
            except Exception as e:
                print("Fallback: Try to look for 'Main_stats' section.")
                stats_section = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//section[.//span[@id='Main_stats']]"))
                )

            power_val = stats_section.find_element(By.XPATH, ".//tr[th[contains(., 'Power')]]/td[2]").text
            print(f"  Power (max): {power_val}")

            data[str(card_id)]["skill name (english)"] = en_skill_name
            data[str(card_id)]["skill effect (english)"] = en_skill_effect
            data[str(card_id)]["talent (max)"] = int(power_val)

            # Save progress periodically
            if index % 10 == 0:
                with open(json_path, 'w') as f:
                    json.dump(data, f, indent=2)
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

def scrape_screen_texture_assets():
    base_local = "my-app/public/gacha"
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    for display_name in os.listdir(base_local):
        gacha_path = os.path.join(base_local, display_name)
        if not os.path.isdir(gacha_path):
            continue

        # Only process if screen/texture does NOT exist
        texture_dir = os.path.join(gacha_path, "screen", "texture")
        if os.path.exists(texture_dir):
            print(f"Already has {texture_dir}, skipping {display_name}")
            continue

        os.makedirs(texture_dir, exist_ok=True)
        print(f"Created {texture_dir}")

        url = f"https://sekai.best/asset_viewer/gacha/{display_name}/screen/texture/"
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        driver.set_window_size(1200, 10000)
        driver.get(url)
        time.sleep(4)  # Wait for the page and lazy-loaded elements

        # Scroll to bottom to trigger lazy loading
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)  # Wait for any additional elements to load

        soup = BeautifulSoup(driver.page_source, "html.parser")
        driver.quit()

        # Only get .webp files, skip those with "stripeanimation"
        spans = soup.find_all("span", class_="MuiTypography-root MuiTypography-body1 MuiListItemText-primary css-vb35nm")
        filenames = [
            span.text.strip()
            for span in spans
            if span.text.strip().endswith(".webp") and "stripeanimation" not in span.text.strip()
        ]

        print(f"{display_name}: Found {len(filenames)} remote webp files")

        for filename in filenames:
            asset_url = f"https://storage.sekai.best/sekai-jp-assets/gacha/{display_name}/screen/texture/{filename}"
            save_path = os.path.join(texture_dir, filename)
            print(f"Downloading {asset_url} -> {save_path}")
            resp = requests.get(asset_url)
            if resp.status_code == 200:
                with open(save_path, "wb") as f:
                    f.write(resp.content)
                print(f"Saved {save_path}")
            else:
                print(f"Failed to download {asset_url} (status {resp.status_code})")
                
BASE_URL = "https://sekai.best/asset_viewer/gacha"
def get_gacha_folders():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    driver.set_window_size(1200, 40000)
    driver.get(BASE_URL)
    wait = WebDriverWait(driver, 15)
    wait.until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, "a.MuiButtonBase-root.MuiListItemButton-root.MuiListItemButton-gutters.MuiListItemButton-root.MuiListItemButton-gutters.css-32zsw6")
        )
    )

    # Infinite scroll: keep scrolling until no new folders appear
    last_count = 0
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(1.5)  # Wait for new items to load
        soup = BeautifulSoup(driver.page_source, "html.parser")
        folders = soup.find_all("a", class_="MuiButtonBase-root MuiListItemButton-root MuiListItemButton-gutters MuiListItemButton-root MuiListItemButton-gutters css-32zsw6")
        print(f"Scrolling... found {len(folders)} folders")
        if len(folders) == last_count:
            break
        last_count = len(folders)

    # Now extract folder info
    folder_list = []
    for a in folders:
        span = a.find("span", class_="MuiTypography-root MuiTypography-body1 MuiListItemText-primary css-vb35nm")
        if span and a.has_attr("href"):
            display_name = span.text.strip()
            href = a["href"]
            if href.startswith("/"):
                href = "https://sekai.best" + href
            folder_list.append((display_name, href))

    print(f"Total folders found: {len(folder_list)}")
    driver.quit()
    return folder_list

def get_webp_links(folder_url):
    """Scrape all .webp file links from a given sekai.best asset_viewer folder URL."""
    resp = requests.get(folder_url)
    soup = BeautifulSoup(resp.text, "html.parser")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.endswith(".webp"):
            # Make absolute URL if needed
            if href.startswith("/"):
                links.append("https://sekai.best" + href)
            else:
                links.append(folder_url.rstrip("/") + "/" + href)
    return links

def download_and_save(url, save_path):
    dir_path = os.path.dirname(save_path)
    print(f"Ensuring directory exists: {dir_path}")
    os.makedirs(dir_path, exist_ok=True)
    print(f"Downloading {url} -> {save_path}")
    resp = requests.get(url)
    if resp.status_code == 200:
        with open(save_path, "wb") as f:
            f.write(resp.content)
        print(f"Saved {save_path}")
    else:
        print(f"Failed to download {url} (status {resp.status_code})")

# def scrape_gacha_assets():
#     folders = get_gacha_folders()
#     for display_name, _ in folders:
#         # Download logo
#         logo_url = f"https://storage.sekai.best/sekai-jp-assets/gacha/{display_name}/logo/logo.webp"
#         save_path = os.path.join("my-app/public/gacha", display_name, "logo", "logo.webp")
#         print(f"Downloading logo: {logo_url} -> {save_path}")
#         download_and_save(logo_url, save_path)


if __name__ == "__main__":
    main()