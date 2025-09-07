from asset_scraper import *
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start_card", type=int, required=False)
    parser.add_argument("--end_card", type=int, required=False)
    parser.add_argument("--task", choices=["extract missing cards", "scrape card info", "reorder card info", "all"])
    args = parser.parse_args()

    if args.start_card is None or args.end_card is None and args.task not in ["extract missing cards", "reorder card info"]:
        print("Skipping card scraping: start_card or end_card not provided.")
        return
    
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

    if args.task == "extract missing cards":
        start_index, end_index = scrape_missing_cards()
        print(f"start_index={start_index}")
        print(f"end_index={end_index}")
    elif args.task == "scrape card info":
        scrape_card_images(start_num=args.start_card, end_num=args.end_card)
        sekaipedia_scrape_card_info(start_num=args.start_card, end_num=args.end_card)
        sekaibest_scrape_card_info(start_num=args.start_card, end_num=args.end_card)
    elif args.task == "reorder card info":
        json_reorder("my-app/src/data/card_metadata.json", desired_card_metadata_order)
        split_card_metadata()
    elif args.task == "all":
        # First scrape card info and images
        scrape_card_images(start_num=args.start_card, end_num=args.end_card)
        sekaipedia_scrape_card_info(start_num=args.start_card, end_num=args.end_card)
        sekaibest_scrape_card_info(start_num=args.start_card, end_num=args.end_card)
        # Second reorder card info
        json_reorder("my-app/src/data/card_metadata.json", desired_card_metadata_order)
        split_card_metadata()
    else:
        print("Please enter a valid task as listed below:\n")
        print("     scrape card info, reorder card info, all")
        return

if __name__ == "__main__":
    main()