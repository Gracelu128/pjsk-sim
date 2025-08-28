import io
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
from urllib.parse import urlparse, unquote, urljoin
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
from typing import Dict, Any, List

# ***GLOBAL VARIABLES HERE***
start_id = 1 # default start card id
end_id = 1228
start_gacha = 1 # default start gacha id
end_gacha = 793
# ***END OF GLOBAL VARIABLES***

######################################################################
################# CARD RELATED FUNCTIONS BEGINS HERE #################

def scrape_card_images(start_num=start_id, end_num=end_id):
    """Scrape card images using Selenium with automatic driver management"""
    # Configuration
    asset_path = "my-app/public/cards"
    os.makedirs(asset_path, exist_ok=True)

    print("Scraping card images from sekai.best...")
    
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
                print(f"  Style attribute missing, moving onto next card...")
                continue
                
            # Extract image URL using regex
            pattern = re.compile(r'url\("(https://[^"]+card_normal\.webp)"\)')
            match = pattern.search(style_attr)

            if not match:
                print(f"  Couldn't extract image URL from style attribute")
                print(f"  Style content: {style_attr}, moving onto next card...")
                continue

            normal_url = match.group(1)
            trained_url = normal_url.replace("card_normal.webp", "card_after_training.webp")

            print(f"  Found normal art URL: {normal_url}")
            print(f"  Trained art URL: {trained_url}")

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
                        print(f"  Unexpected content type for {label}: {img_response.headers.get('Content-Type')}")
                        continue

                    save_path = os.path.join(card_dir, label)
                    with open(save_path, "wb") as f:
                        f.write(img_response.content)

                    print(f"    Saved {label} ({len(img_response.content)//1024} KB)")
                except Exception as e:
                    print(f"    Failed to save {label}: {e}")
            
        except Exception as e:
            print(f"  Error processing card {card_id}: {str(e)}")
        
        time.sleep(1)  # Be polite to the server

    driver.quit()
    print("Scraping card images completed!")

def sekaipedia_scrape_card_info(start_num=start_id, end_num=end_id):
    """Scrape card images using Selenium with automatic driver management"""
    # Configuration
    json_path = "my-app/src/data/card_metadata.json"
    icons_path = "my-app/public/icons"
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

    print("Scraping card information from sekaipedia...")
        
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
                    print(f"Skipping {card_id}, outside of specified range of cards")
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
                    response = requests.get(icon_url, timeout=10, headers=headers)
                    if response.status_code == 200:
                        with open(png_filepath, "wb") as f:
                            f.write(response.content)

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
                print(f"Error on card {index}: {e}")

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
                    print("Issue extracting card skill (english) name")

            # Robust extraction for skill effect
            en_skill_effect = None
            effect_uls = section.find_elements(By.XPATH, ".//h3[.//*[contains(translate(@id, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'skill_effect')]]/following-sibling::ul")
            if effect_uls:
                effect_ul = effect_uls[0]
                try:
                    level4_li = effect_ul.find_element(By.XPATH, ".//li[contains(., 'Level 4:')]")
                    en_skill_effect = level4_li.text.split("Level 4:")[1].strip().replace(";", " and")
                except:
                    print("Issue extracting card skill (english) effect")

            # Load the Main Stats section (for Power)
            try:
                # Fallback: find section after h2#Stats
                stats_heading = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//h2[.//span[@id='Stats']]"))
                )
                stats_section = stats_heading.find_element(By.XPATH, "following-sibling::section[1]")
            except Exception as e:
                stats_section = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//section[.//span[@id='Main_stats']]"))
                )

            power_val = stats_section.find_element(By.XPATH, ".//tr[th[contains(., 'Power')]]/td[2]").text
            print(f"  Card power (max): {power_val}")

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
    print("Scraping card information from sekaipedia completed!")

    # Write back to json
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=2)

def sekaibest_scrape_card_info(start_num=start_id, end_num=end_id):
    """Scrape card images using Selenium with automatic driver management"""
    # Configuration
    json_path = "my-app/src/data/card_metadata.json"
    audio_path = "my-app/public/card_audio"
    costume_path = "my-app/public/costumes"

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

    print("Scraping card information from sekai.best...")

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
                        print(f"  Downloaded audio: {audio_file}")
                    else:
                        print(f"  Failed to download audio: HTTP {response.status_code}")
            except Exception as e:
                print(f"  No gacha phrase {card_id}: {str(e)}")

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
    print("Scraping card information from sekai.best completed!")

    # Write back to json
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=2)

def split_card_metadata(
    input_path= "my-app/src/data/card_metadata.json",
    output_dir= "my-app/src/data/individual_card_metadata"
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

################# CARD RELATED FUNCTIONS ENDS HERE ###################
######################################################################


######################################################################
################# GACHA RELATED FUNCTIONS BEGINS HERE #################

def sekaibest_scrape_gacha_info(start_gacha=start_gacha, end_gacha=end_gacha):
    # Configuration
    json_path = "my-app/src/data/gacha_metadata.json"
    ## depends on the metadata, we skip over some birthday gacha downloads!!!
    ## later if we add automation process, this needs to be fed in to the scrape_gacha function, so it can skip the birthday banners!!!
    rate_json_path = "my-app/src/data/gacha_rates.json"

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

    print("Scraping gacha information from sekai.best...")

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
            
            if id not in data:
                data[id] = {}
            data[id]['id'] = gacha_id

            # Get jp and en title
            combined_title = driver.find_element(
                By.XPATH,
                '//h6[@class="MuiTypography-root MuiTypography-h6 css-1u18iur"]'
            ).text
            jp_title, en_title = [t.strip() for t in combined_title.split('|', 1)]
            data[id]['title (japanese)'] = jp_title
            
            # Get Release Date
            release_date = driver.find_element(
                By.XPATH, 
                '//h6[contains(., "Available From")]/following-sibling::p'
            ).text
            data[id]['release_date'] = release_date

            end_date = driver.find_element(
                By.XPATH, 
                '//h6[contains(., "Available Until")]/following-sibling::p'
            ).text
            data[id]['end_date'] = end_date

            # Determine gacha type
            gacha_type = "unknown"  # Default value
            
            # First try: Check for Exchange Item image
            try:
                exchange_img = driver.find_element(
                    By.XPATH, 
                    '//h6[contains(., "Exchange Item")]/following-sibling::img'
                )
                img_src = exchange_img.get_attribute('src')
                
                if 'ceil_item.webp' in img_src:
                    gacha_type = 'normal'
                elif 'ceil_item_limited.webp' in img_src:
                    gacha_type = 'limited'
                elif 'ceil_item_birthday.webp' in img_src:
                    gacha_type = 'birthday'
                else:
                    # Handle unexpected image names
                    if 'limited' in img_src.lower():
                        gacha_type = 'limited'
                    elif 'birthday' in img_src.lower():
                        gacha_type = 'birthday'
                    else:
                        gacha_type = 'normal'
            
            except:
                # Fallback: Check for explicit Type text
                try:
                    type_text = driver.find_element(
                        By.XPATH, 
                        '//h6[contains(., "Type")]/following-sibling::p'
                    ).text.lower()
                    
                    if 'normal' in type_text:
                        gacha_type = 'normal'
                    elif 'limited' in type_text:
                        gacha_type = 'limited'
                    elif 'birthday' in type_text:
                        gacha_type = 'birthday'
                    else:
                        # Handle other type texts
                        if '限定' in type_text:  # Japanese for "limited"
                            gacha_type = 'limited'
                        elif 'バースデー' in type_text:  # Japanese for "birthday"
                            gacha_type = 'birthday'
                        elif 'beginner' in type_text:
                            gacha_type = 'beginner'
                        elif 'gift' in type_text:
                            gacha_type = 'gift'
                        else:
                            gacha_type = type_text
                except:
                    print("Did not found gacha type")

            data[id]['type'] = gacha_type

            # Scrape Gacha Rates
            # Store unique normal and guaranteed gacha rate pairs to rate_data
            rates = extract_rates(driver)
            
            # Create or find rate index
            rate_index = None
            for idx, rate_struct in enumerate(rate_data):
                if rate_struct == rates:
                    rate_index = idx
                    break
            
            if rate_index is None:
                rate_data.append(rates)
                rate_index = len(rate_data) - 1
            
            data[id]['gacha_rate_index'] = rate_index

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
    """
    Helper function for sekaibest_scrape_gacha_info to collect
    featured cards of a gacha.
    """
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
    """
    Helper function for sekaibest_scrape_gacha_info to store rates of a gacha.
    """
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

def split_gacha_metadata(
    input_path= "my-app/src/data/gacha_metadata.json",
    output_dir= "my-app/src/data/individual_gacha_metadata"
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

def scrape_gacha_logos_1_to_377():
    """
    Function to scrape gacha logos (1–377) from Sekaipedia and save as webp.
    Logos 1-377 not found in asset viewer of sekai.best.
    Note: Logos are stored out of order on the sekaipedia pages
    """
    base_urls = [
        "https://www.sekaipedia.org/wiki/Category:Gacha_logos?fileuntil=Gacha295+logo.png#mw-category-media", 
        "https://www.sekaipedia.org/wiki/Category:Gacha_logos",  
        "https://www.sekaipedia.org/wiki/Category:Gacha_logos?filefrom=Gacha527+logo.png#mw-category-media",  
        "https://www.sekaipedia.org/wiki/Category:Gacha_logos?filefrom=Gacha760+logo.png#mw-category-media"
    ]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0 Safari/537.36"
    }
    
    all_gallery_boxes = []

    # Load all category pages
    for url in base_urls:
        print(f"Fetching {url}")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        gallery_boxes = soup.find_all("li", class_="gallerybox")
        all_gallery_boxes.extend(gallery_boxes)
        print(f"Found {len(gallery_boxes)} gallery boxes")

    print(f"Total gallery boxes collected: {len(all_gallery_boxes)}")

    for box in all_gallery_boxes:
        filename_tag = box.find("a", class_="galleryfilename")
        if not filename_tag:
            continue

        filename = filename_tag.text.strip().replace(" ", "_")
        match = re.search(r"Gacha(\d+)_logo\.png", filename)
        if not match:
            continue

        gacha_id = int(match.group(1))

        # Only keep 1–377
        if gacha_id < 1 or gacha_id > 377:
            continue

        save_dir = os.path.join("my-app", "public", "gacha", f"gacha_{gacha_id}", "logo")
        webp_path = os.path.join(save_dir, "logo.webp")
        if os.path.exists(webp_path):
            print(f"Gacha {gacha_id} already exists, skipping")
            continue

        # Go to file page
        file_page_url = "https://www.sekaipedia.org" + filename_tag.get("href")
        try:
            file_resp = requests.get(file_page_url, headers=headers, timeout=30)
            file_resp.raise_for_status()
            file_soup = BeautifulSoup(file_resp.text, "html.parser")
            
            img_link = file_soup.find("a", class_="internal")
            if not img_link:
                print(f"Could not find full image link for Gacha {gacha_id}")
                continue
            
            full_image_url = img_link.get("href")
            if full_image_url.startswith("//"):
                full_image_url = "https:" + full_image_url

            print(f"Downloading Gacha {gacha_id} from {full_image_url}")
            img_data = requests.get(full_image_url, headers=headers, timeout=30).content
            
            image = Image.open(io.BytesIO(img_data)).convert("RGBA")
            os.makedirs(save_dir, exist_ok=True)
            image.save(webp_path, "WEBP", quality=95)
            print(f"Saved Gacha {gacha_id} → {webp_path}")
            
            time.sleep(0.5)

        except Exception as e:
            print(f"Error processing Gacha {gacha_id}: {str(e)}")
    
    # Check for missing logos 1-376
    base_path = "my-app/public/gacha"
    missing = []

    for i in range(1, 378):
        folder = os.path.join(base_path, f"gacha_{i}")
        if not os.path.exists(folder):
            # Skip if it doesn’t exist
            continue  
        filepath = os.path.join(folder, "logo/logo.webp")  # adjust name if different
        if not os.path.exists(filepath):
            missing.append(f"gacha_{i}")

    if not missing:
        print("All logos 1–377 are present!")
    else:
        print("Missing logos in:", missing)

def scrape_gacha_backgrounds_1_to_377():
    """
    Scrape gacha backgrounds (1–377) from Sekaipedia and save as webp.
    Backgrounds 1-377 not found in asset viewer of sekai.best.
    Note: Backgrounds are stored out of order on the sekaipedia pages
    """
    base_urls = [
        "https://www.sekaipedia.org/wiki/Category:Gacha_backgrounds",
        "https://www.sekaipedia.org/wiki/Category:Gacha_backgrounds?filefrom=Gacha451+background.png#mw-category-media",
        "https://www.sekaipedia.org/wiki/Category:Gacha_backgrounds?filefrom=Gacha760-1+background.png#mw-category-media"
    ]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0 Safari/537.36"
    }
    
    all_gallery_boxes = []

    # Load all category pages
    for url in base_urls:
        print(f"Fetching {url}")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        gallery_boxes = soup.find_all("li", class_="gallerybox")
        all_gallery_boxes.extend(gallery_boxes)
        print(f"Found {len(gallery_boxes)} gallery boxes")

    print(f"Total gallery boxes collected: {len(all_gallery_boxes)}")

    for box in all_gallery_boxes:
        filename_tag = box.find("a", class_="galleryfilename")
        if not filename_tag:
            continue

        filename = filename_tag.text.strip().replace(" ", "_")
        match = re.search(r"Gacha(\d+)_background\.png", filename)
        if not match:
            continue

        gacha_id = int(match.group(1))

        # Only keep 1–377
        if gacha_id < 1 or gacha_id > 377:
            continue

        save_dir = os.path.join("my-app", "public", "gacha", f"gacha_{gacha_id}", "screen", "texture")
        webp_path = os.path.join(save_dir, f"bg_gacha{gacha_id}.webp")
        if os.path.exists(webp_path):
            print(f"Gacha {gacha_id} background already exists, skipping")
            continue

        # Go to file page
        file_page_url = "https://www.sekaipedia.org" + filename_tag.get("href")
        try:
            file_resp = requests.get(file_page_url, headers=headers, timeout=30)
            file_resp.raise_for_status()
            file_soup = BeautifulSoup(file_resp.text, "html.parser")
            
            img_link = file_soup.find("a", class_="internal")
            if not img_link:
                print(f"Could not find full image link for Gacha {gacha_id} background")
                continue
            
            full_image_url = img_link.get("href")
            if full_image_url.startswith("//"):
                full_image_url = "https:" + full_image_url

            print(f"Downloading Gacha {gacha_id} background from {full_image_url}")
            img_data = requests.get(full_image_url, headers=headers, timeout=30).content
            
            image = Image.open(io.BytesIO(img_data)).convert("RGBA")
            os.makedirs(save_dir, exist_ok=True)
            image.save(webp_path, "WEBP", quality=95)
            print(f"Saved Gacha {gacha_id} background → {webp_path}")
            
            time.sleep(0.5)

        except Exception as e:
            print(f"Error processing Gacha {gacha_id} background: {str(e)}")

    # Check for missing logos 1-376
    base_path = "my-app/public/gacha"
    missing = []

    for i in range(1, 378):
        folder = os.path.join(base_path, f"gacha_{i}")
        if not os.path.exists(folder):
            # Skip if it doesn’t exist
            continue  
        filepath = os.path.join(folder, f"screen/texture/bg_gacha{i}.webp")  # adjust name if different
        if not os.path.exists(filepath):
            missing.append(f"gacha_{i}")

    if not missing:
        print("All logos 1–377 are present!")
    else:
        print("Missing logos in:", missing)

################# GACHA RELATED FUNCTIONS ENDS HERE ###################
#######################################################################

################# GENERAL HELPER FUNCTIONS START HERE #################

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

################# GENERAL HELPER FUNCTIONS END HERE ###################
#######################################################################

import collections

################################ JOY'S CODE ###################################

###############################################################################
############# HELPER FUNCTIONS FOR SEKAIPEDIA SCRAPE GACHA BANNERS ############

SEKAIPEDIA_ROOT = "https://www.sekaipedia.org"
HEADERS = {"User-Agent": "Mozilla/5.0"}
def to_original_media_url(thumb_src: str) -> str:
    """
    Convert a MediaWiki /thumb/ URL to the original file URL.
    Example:
      //static.wikitide.net/projectsekaiwiki/thumb/9/9c/Gacha319_banner.png/300px-Gacha319_banner.png
    -> //static.wikitide.net/projectsekaiwiki/9/9c/Gacha319_banner.png
    """
    # Ensure scheme
    if thumb_src.startswith("//"):
        thumb_src = "https:" + thumb_src
    # Only transform if it contains /thumb/
    if "/thumb/" not in thumb_src:
        return thumb_src
    parts = thumb_src.split("/thumb/", 1)
    left = parts[0]
    right = parts[1]
    # right looks like: "<hashpath>/Gacha319_banner.png/300px-Gacha319_banner.png"
    # we want: "<hashpath>/Gacha319_banner.png"
    right_bits = right.split("/")
    # Find the segment that ends with .png (the filename)
    filename_idx = None
    for i, seg in enumerate(right_bits):
        if seg.lower().endswith(".png"):
            filename_idx = i
            break
    if filename_idx is None:
        return thumb_src  # fallback
    original_path = right_bits[:filename_idx + 1]  # up to and including filename
    return left + "/" + "/".join(original_path)

def find_next_page_url(soup: BeautifulSoup) -> str | None:
    """
    Find the 'next page' link on the category page.
    It usually looks like:
      <a href="/wiki/Category:Gacha_banners?filefrom=Gacha319+banner.png#mw-category-media" title="Category:Gacha banners">next page</a>
    """
    a = soup.find("a", string=re.compile(r"^\s*next page\s*$", re.I))
    if a and a.get("href"):
        return urljoin(SEKAIPEDIA_ROOT, a["href"])
    return None

def extract_banner_items(soup: BeautifulSoup):
    """
    Yield (gacha_id:str, original_png_url:str) for each banner found on the page.
    We target img tags with srcs that contain 'Gacha###_banner.png' and '/thumb/'.
    """
    for img in soup.find_all("img", src=True):
        src = img["src"]
        # Quick filter
        if "Gacha" not in src or "banner.png" not in src:
            continue
        # Pull out the numeric ID
        m = re.search(r"Gacha(\d+)_banner\.png", src)
        if not m:
            continue
        gacha_id = m.group(1)
        # Convert thumb URL to original
        original_url = to_original_media_url(src)
        yield gacha_id, original_url

def download_png_to_webp(original_png_url: str, out_dir: Path, base_name: str) -> bool:
    """
    Download the PNG, convert to WebP, then remove the PNG.
    Returns True on success.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / f"{base_name}.png"
    webp_path = out_dir / f"{base_name}.webp"

    try:
        r = requests.get(original_png_url, headers=HEADERS, timeout=20)
        if r.status_code != 200:
            print(f"[WARN] {original_png_url} -> HTTP {r.status_code}")
            return False
        with open(png_path, "wb") as f:
            f.write(r.content)

        with Image.open(png_path) as im:
            im.save(webp_path, "webp")

        png_path.unlink(missing_ok=True)
        return True
    except Exception as e:
        print(f"[ERROR] {original_png_url}: {e}")
        try:
            png_path.unlink(missing_ok=True)
        except Exception:
            pass
        return False

def banner_already_present(out_dir: Path) -> bool:
    """Return True if gacha_xxx/banner/ exists and contains anything."""
    return out_dir.exists() and any(out_dir.iterdir())

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

def dir_has_anything(p: Path) -> bool:
    return p.exists() and any(p.iterdir())

def download_with_retries(url: str, out_path: Path, max_retries: int = 3, backoff: float = 1.0) -> bool:
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            if resp.status_code == 200:
                out_path.parent.mkdir(parents=True, exist_ok=True)
                with open(out_path, "wb") as f:
                    f.write(resp.content)
                return True
            elif resp.status_code == 404:
                print(f"[404] Not found: {url}")
                return False
            else:
                print(f"[HTTP {resp.status_code}] {url}")
        except requests.RequestException as e:
            print(f"[ERROR attempt {attempt}/{max_retries}] {url}: {e}")
        time.sleep(backoff * attempt)
    return False

def _unique_sorted(seq):
    return sorted(list(dict.fromkeys(seq)))

######################### HELPER FUNCTIONS END HERE ###########################
###############################################################################

###############################################################################
########################## SCRAPE GACHA FUNCTIONS #############################

# this should be available from 1 to whatever number
def sekaipedia_scrape_gacha_banners(
    start_urls=None,
    start_num: int = 1,
    end_num: int = 999
):
    """
    Crawl Sekaipedia's Gacha banner category, following 'next page' links
    until none remains. Filters by gacha id range. Saves WebP banners to:

      my-app/public/gacha/gacha_<id>/banner/Gacha<id>_banner.webp
    """
    if start_urls is None:
        start_urls = [
            "https://www.sekaipedia.org/wiki/Category:Gacha_banners?fileuntil=Gacha319+banner.png#mw-category-media"
        ]

    root_out = Path("my-app/public/gacha")
    total_downloaded = 0
    seen_pages = set()

    for start_url in start_urls:
        current = start_url
        while current and current not in seen_pages:
            print(f"[PAGE] {current}")
            seen_pages.add(current)

            # Fetch + parse
            try:
                resp = requests.get(current, headers=HEADERS, timeout=20)
                resp.raise_for_status()
            except Exception as e:
                print(f"[ERROR] fetching page: {e}")
                break

            soup = BeautifulSoup(resp.text, "html.parser")

            # Extract banners on this page
            for gacha_id, original_png_url in extract_banner_items(soup):
                gid = int(gacha_id)
                if gid < start_num or gid > end_num:
                    continue

                out_dir = root_out / f"gacha_{gid}" / "banner"

                # Added skip logic for the banners that already exist
                if banner_already_present(out_dir):
                    print(f"[SKIP] gacha {gid}: {out_dir} already has files; not re-downloading.")
                    continue

                base_name = f"Gacha{gid}_banner"
                ok = download_png_to_webp(original_png_url, out_dir, base_name)
                if ok:
                    total_downloaded += 1
                    print(f"[OK] gacha {gid} -> {out_dir / (base_name + '.webp')}")

            # Find next page (if any)
            next_url = find_next_page_url(soup)
            # Be polite to the site
            time.sleep(1.0)
            current = next_url

    print(f"[DONE] Total banners processed: {total_downloaded}")

# this we only scrape starting from 377 inclusive
# currently this looks for up to gacha_999, which needs to be updated later.
def sekaibest_scrape_gacha_logos():
    start_gid = 377
    end_gid = 999
    root_local = Path("my-app/public/gacha")
    total_ok = 0
    total_skip = 0
    total_miss = 0

    for gid in range(start_gid, end_gid + 1):
        display_name = f"gacha_{gid}"
        local_logo_dir = root_local / display_name / "logo"
        local_logo_path = local_logo_dir / "logo.webp"

        # Skip if the logo dir already has anything inside
        if dir_has_anything(local_logo_dir):
            print(f"[SKIP] {display_name}: {local_logo_dir} already has files.")
            total_skip += 1
            continue

        remote_key = f"ab_gacha_{gid}"
        url = f"https://storage.sekai.best/sekai-jp-assets/gacha/{remote_key}/logo/logo.webp"
        print(f"[GET] {display_name} <- {url}")

        ok = download_with_retries(url, local_logo_path)
        if ok:
            print(f"[OK] Saved {local_logo_path}")
            total_ok += 1
        else:
            print(f"[MISS] {display_name}: logo not downloaded.")
            total_miss += 1

        # Be polite (tune as needed)
        time.sleep(0.15)

    print(f"\n[DONE] Logos saved: {total_ok}, skipped: {total_skip}, missing/failed: {total_miss}")

# this we only scrape starting from 377 inclusive
# note, the texture files are only scraped if the gacha_gid path already exists
# and doesn't already have a screen/texture path.
# otherwise it will be skipped so this function is called after logos.
def sekaibest_scrape_screen_texture_assets():
    base_local = "my-app/public/gacha"

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

    try:
        for display_name in os.listdir(base_local):
            gacha_path = os.path.join(base_local, display_name)
            if not os.path.isdir(gacha_path):
                continue

            # Expect folders like "gacha_XXX" → extract the numeric id
            m = re.search(r"gacha_(\d+)$", display_name)
            if not m:
                continue
            gid = int(m.group(1))

            # Skip anything before or equal to 376
            if gid <= 376:
                # Optional: print once in a while
                # print(f"Skipping gacha {gid} (<= 376)")
                continue

            # If screen/texture already exists, skip this gacha
            texture_dir = os.path.join(gacha_path, "screen", "texture")
            if os.path.exists(texture_dir):
                print(f"Already has {texture_dir}, skipping {display_name}")
                continue

            # Remote path key must be ab_gacha_XXX (with underscore before number)
            remote_key = f"ab_gacha_{gid}"

            # Visit the asset viewer page for this gacha's screen/texture
            url = f"https://sekai.best/asset_viewer/gacha/{remote_key}/screen/texture/"
            os.makedirs(texture_dir, exist_ok=True)
            print(f"\n[{display_name}] → remote key: {remote_key}")
            print(f"Created {texture_dir}")
            print(f"Opening {url}")

            driver.set_window_size(1200, 10000)
            driver.get(url)
            time.sleep(4)  # wait for initial render

            # Scroll to bottom to trigger lazy loading (twice for good measure)
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(1)

            soup = BeautifulSoup(driver.page_source, "html.parser")

            # Extract file names from the list (skip stripeanimation + only .webp)
            spans = soup.find_all(
                "span",
                class_="MuiTypography-root MuiTypography-body1 MuiListItemText-primary css-vb35nm"
            )
            filenames = [
                span.text.strip()
                for span in spans
                if span.text and span.text.strip().endswith(".webp")
                and "stripeanimation" not in span.text.strip().lower()
                and "tex_common" not in span.text.strip().lower()
            ]

            print(f"{display_name}: Found {len(filenames)} remote webp files")

            # Download each file from storage bucket
            for filename in filenames:
                asset_url = f"https://storage.sekai.best/sekai-jp-assets/gacha/{remote_key}/screen/texture/{filename}"
                save_path = os.path.join(texture_dir, filename)
                print(f"Downloading {asset_url} -> {save_path}")

                try:
                    resp = requests.get(asset_url, timeout=20)
                    if resp.status_code == 200:
                        with open(save_path, "wb") as f:
                            f.write(resp.content)
                        print(f"Saved {save_path}")
                    else:
                        print(f"Failed {asset_url} (HTTP {resp.status_code})")
                except Exception as e:
                    print(f"Error downloading {asset_url}: {e}")

            # Be polite between gachas (tune if needed)
            time.sleep(0.5)

    finally:
        driver.quit()
        print("Done scraping screen/texture assets.")

###############################################################################
### MANIFEST GENERATED FROM EXISTING GACHA FOLDERS (SHOULD BE CALLED LAST!) ###

def generate_or_update_gacha_manifest(
    gacha_base="my-app/public/gacha",
    manifest_path="my-app/public/gacha/manifest.json",
    make_backup=True,
    min_update_id=377,   # <-- only update ids >= 377 by default
    max_update_id=None,  # <-- set to an int to cap the range; None = no upper cap
):
    # Load existing manifest (preserve all prior/custom fields)
    existing = {}
    manifest_file = Path(manifest_path)
    if manifest_file.exists():
        try:
            with open(manifest_file, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except Exception:
            print("[WARN] Could not read existing manifest; starting with empty.")

    updated = dict(existing)  # shallow copy

    # Walk local folders, but only process ids within [min_update_id, max_update_id]
    for folder in os.listdir(gacha_base):
        gacha_dir = os.path.join(gacha_base, folder)
        if not (os.path.isdir(gacha_dir) and folder.startswith("gacha_")):
            continue

        gid_str = folder.replace("gacha_", "")
        if not gid_str.isdigit():
            continue
        gid = int(gid_str)

        # Respect update window
        if gid < (min_update_id or -10**9):
            # Do not touch 1–376 (keeps custom paths intact)
            continue
        if max_update_id is not None and gid > max_update_id:
            continue

        # Start from any existing entry to preserve custom keys/values
        entry = updated.get(gid_str, {})
        entry.setdefault("bg", [])
        entry.setdefault("img", [])
        entry.setdefault("logo", "")
        entry.setdefault("banner", [])

        # Collect assets from disk (non-destructive merge)
        texture_dir = os.path.join(gacha_dir, "screen", "texture")
        new_bg, new_img = [], []
        if os.path.isdir(texture_dir):
            for fname in os.listdir(texture_dir):
                if fname.startswith("bg_") and fname.endswith(".webp"):
                    new_bg.append(fname)
                # require .webp for both prefixes (fix precedence)
                if fname.endswith(".webp") and (fname.startswith("img_") or fname.startswith("cardname_")):
                    new_img.append(fname)

        logo_dir = os.path.join(gacha_dir, "logo")
        new_logo = "logo/logo.webp" if (os.path.isdir(logo_dir) and "logo.webp" in os.listdir(logo_dir)) else None

        banner_dir = os.path.join(gacha_dir, "banner")
        new_banners = []
        if os.path.isdir(banner_dir):
            for fname in os.listdir(banner_dir):
                if fname.lower().endswith((".webp", ".png", ".jpg", ".jpeg")):
                    new_banners.append(fname)

        # Merge additively (don’t delete pre-existing values)
        entry["bg"] = _unique_sorted(list(entry.get("bg", [])) + new_bg)
        entry["img"] = _unique_sorted(list(entry.get("img", [])) + new_img)
        if new_logo:  # only set if present now; otherwise keep whatever was there
            entry["logo"] = new_logo
        entry["banner"] = _unique_sorted(list(entry.get("banner", [])) + new_banners)

        # Only write if it has something (or already existed)
        if entry["bg"] or entry["img"] or entry["logo"] or entry["banner"] or gid_str in updated:
            updated[gid_str] = entry

    # Sort by numeric id
    sorted_manifest = collections.OrderedDict(
        sorted(updated.items(), key=lambda kv: int(kv[0]) if kv[0].isdigit() else 10**9)
    )

    # Backup then write
    if make_backup and manifest_file.exists():
        backup = manifest_file.with_suffix(".backup.json")
        try:
            backup.write_text(manifest_file.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"[BACKUP] {backup}")
        except Exception as e:
            print(f"[WARN] Backup failed: {e}")

    manifest_file.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(sorted_manifest, f, indent=2, ensure_ascii=False)

    print(f"[OK] Manifest updated (ids ≥ {min_update_id}"
          f"{'' if max_update_id is None else f' and ≤ {max_update_id}'}): {manifest_path}")

###############################################################################
############################ NOT IN USE ANYMORE ###############################
############################# FOR BG BEFORE 377 ###############################

ROOT = Path(__file__).resolve().parent
APP_DIR = ROOT / "my-app"
PUBLIC_DIR = APP_DIR / "public"
DATA_DIR = APP_DIR / "src" / "data"
MANIFEST_PATH = PUBLIC_DIR / "gacha" / "manifest.json"
GACHA_META_PATH = DATA_DIR / "gacha_metadata.json"
CARD_META_PATH = DATA_DIR / "card_metadata.json"

def _read_json(p: Path) -> Dict[str, Any]:
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)

def _write_json(p: Path, payload: Dict[str, Any]) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    tmp.replace(p)

def _backup(p: Path) -> Path:
    ts = time.strftime("%Y%m%d-%H%M%S")
    bak = p.with_suffix(p.suffix + f".bak.{ts}")
    bak.write_bytes(p.read_bytes())
    return bak

# Inject card backgrounds into the manifest for Gachas 1-376 due to missing bg
# Called once and not used anymore
def inject_card_backgrounds(
    start_id: int = 1,
    end_id: int = 376,
    only_when_bg_empty: bool = True,
    verify_files_exist: bool = True,
) -> None:
    """
    For gachas in [start_id, end_id], append featured 4★ card images as rotating backgrounds:
      /cards/<card_id>/card_after_training.webp

    - only_when_bg_empty=True: only add if manifest[gacha]['bg'] is missing/empty
    - verify_files_exist=True: only include paths that exist under public/cards/<id>/
    """

    manifest: Dict[str, Any] = _read_json(MANIFEST_PATH) if MANIFEST_PATH.exists() else {}
    gacha_meta: Dict[str, Any] = _read_json(GACHA_META_PATH)
    card_meta: Dict[str, Any] = _read_json(CARD_META_PATH)

    changed = False
    added_total = 0

    for gid in range(start_id, end_id + 1):
        gid_str = str(gid)
        ginfo = gacha_meta.get(gid_str)
        if not ginfo:
            continue

        featured = ginfo.get("featured_cards") or []
        # Collect eligible 4★ card ids
        four_star_ids: List[str] = []
        for fc in featured:
            cid = str(fc.get("card_id"))
            cinfo = card_meta.get(cid)
            if not cinfo:
                continue
            # rarity = cinfo.get("rarity")
            # try:
            #     is_four = int(rarity) == 4
            # except Exception:
            #     is_four = str(rarity).strip() == "4"
            # if is_four:
            four_star_ids.append(cid)

        if not four_star_ids:
            continue

        # Prepare manifest bucket
        entry = manifest.setdefault(gid_str, {})
        bg_list: List[str] = entry.get("bg") or []

        if only_when_bg_empty and len(bg_list) > 0:
            # Skip if already has BGs
            continue

        # Build candidate card paths (absolute-from-public so the app can serve them)
        # e.g. /cards/198/card_after_training.webp
        new_paths: List[str] = []
        for cid in four_star_ids:
            rel = f"/cards/{cid}/card_after_training.webp"
            if verify_files_exist:
                fs_path = PUBLIC_DIR / rel.lstrip("/")
                if not fs_path.exists():
                    continue
            new_paths.append(rel)

        if not new_paths:
            continue

        # Merge (dedupe, keep order: existing first, then new)
        existing_set = set(bg_list)
        appended = [p for p in new_paths if p not in existing_set]
        if not appended:
            continue

        entry["bg"] = bg_list + appended
        # Ensure other keys exist so DisplayGacha doesn't choke
        entry.setdefault("img", [])
        entry.setdefault("banner", [])
        entry.setdefault("logo", entry.get("logo") or None)

        added_total += len(appended)
        changed = True

    if changed:
        _backup(MANIFEST_PATH)
        _write_json(MANIFEST_PATH, manifest)
        print(f"Updated manifest: added {added_total} card backgrounds.")
    else:
        print("No changes made (nothing to add or conditions not met).")

########################### END OF MISC FUNCTIONS #############################
###############################################################################

def main():
    # scrape_gacha_assets()
    # """Main function to execute scraping"""
    # sekaipedia_scrape_gacha_banners()
    # sekaibest_scrape_gacha_logos()
    # sekaibest_scrape_screen_texture_assets()
    generate_or_update_gacha_manifest()
    # pass

if __name__ == "__main__":
    main()