from asset_scraper import *
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start_card", type=int, required=True)
    parser.add_argument("--end_card", type=int, required=True)
    parser.add_argument("--task", choices=["scrape card info", "reorder card info"])
    args = parser.parse_args()

    if args.start_card is None or args.end_card is None:
        print("Skipping card scraping: start_card or end_card not provided.")
        return

    if args.task == "scrape card info":
        scrape_card_images(start_num=args.start_card, end_num=args.end_card)
        sekaipedia_scrape_card_info(start_num=args.start_card, end_num=args.end_card)
        sekaibest_scrape_card_info(start_num=args.start_card, end_num=args.end_card)
    elif args.task == "reorder card info":
        desired_card_metadata_order = [
            "id",
            "character",
            "character (japanese)",
            "english name",
            "japanese name",
            "skill name (japanese)",
            "skill name (english)",
            "skill effect (japanese)",
            "skill effect (english)",
            "talent (max)",
            "gacha phrase",
            "unit",
            "support unit",
            "attribute",
            "rarity",
            "status"
        ]
        json_reorder("my-app/src/data/card_metadata.json", desired_card_metadata_order)
        split_card_metadata()
    
if __name__ == "__main__":
    main()