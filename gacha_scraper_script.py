from asset_scraper import *
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start_gacha", type=int, required=False)
    parser.add_argument("--end_gacha", type=int, required=False)
    parser.add_argument("--task", choices=["extract missing gachas", "scrape gacha info", "reorder gacha info", "scrape gacha assets", "all"])
    args = parser.parse_args()

    if args.task not in ["extract missing gachas", "reorder gacha info"]:
        if args.start_gacha is None or args.end_gacha is None:
            print("Skipping gacha scraping: start_gacha or gacha_card not provided.")
            return
    
    desired_gacha_metadata_order = [
        "id",
        "title (japanese)",
        "release_date",
        "end_date",
        "type",
        "gacha_rate_index",
        "featured_cards"
    ]

    if args.task == "extract missing gachas":
        start_index, end_index = scrape_missing_gachas()

        start_index = '' if start_index is None else start_index
        end_index = '' if end_index is None else end_index

        print(f"start_index={start_index}")
        print(f"end_index={end_index}")
    elif args.task == "scrape gacha info":
        sekaibest_scrape_gacha_info(start_gacha=args.start_gacha, end_gacha=args.end_gacha)
    elif args.task == "reorder gacha info":
        json_reorder("my-app/src/data/gacha_metadata.json", desired_gacha_metadata_order)
        split_gacha_metadata()
    elif args.task == "scrape gacha assets":
        sekaipedia_scrape_gacha_banners(start_num=args.start_gacha, end_num=args.end_gacha)
        sekaibest_scrape_gacha_logos(start_gacha=args.start_gacha, end_gacha=args.end_gacha)
        sekaibest_scrape_screen_texture_assets(start_gacha=args.start_gacha, end_gacha=args.end_gacha)
        generate_or_update_gacha_manifest(min_update_id=args.start_gacha, max_update_id=args.end_gacha)
    elif args.task == "all":
        # First scrape gacha info
        sekaibest_scrape_gacha_info(start_gacha=args.start_gacha, end_gacha=args.end_gacha)
        # Second reorder gacha info
        json_reorder("my-app/src/data/gacha_metadata.json", desired_gacha_metadata_order)
        split_gacha_metadata()
        # Third scrape gacha assets
        sekaipedia_scrape_gacha_banners(start_num=args.start_gacha, end_num=args.end_gacha)
        sekaibest_scrape_gacha_logos(start_gacha=args.start_gacha, end_gacha=args.end_gacha)
        sekaibest_scrape_screen_texture_assets(start_gacha=args.start_gacha, end_gacha=args.end_gacha)
        generate_or_update_gacha_manifest(min_update_id=args.start_gacha, max_update_id=args.end_gacha)
    else:
        print("Please enter a valid task as listed below:\n")
        print("     scrape gacha info, reorder gacha info, scrape gacha assets, all")
        return
    
if __name__ == "__main__":
    main()