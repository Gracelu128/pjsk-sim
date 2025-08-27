from asset_scraper import *
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start_gacha", type=int, required=False)
    parser.add_argument("--end_gacha", type=int, required=False)
    parser.add_argument("--task", choices=["scrape gacha info", "reorder gacha info"])
    args = parser.parse_args()

    if args.task == "scrape gacha info":
        pass
    elif args.task == "reorder gacha info":
        desired_gacha_metadata_order = [
            "id",
            "title (japanese)",
            "release_date",
            "end_date",
            "type",
            "gacha_rate_index",
            "featured_cards"
        ]
        json_reorder("my-app/src/data/gacha_metadata.json", desired_gacha_metadata_order)
        split_card_metadata()
    
if __name__ == "__main__":
    main()