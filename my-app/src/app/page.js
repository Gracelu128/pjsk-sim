import Image from "next/image";
import cardData from "@/data/card_metadata.json";

export default function Home() {
  const card = cardData["1"];

  return (
    <main className="w-screen h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-2xl font-bold mb-4">Card Gallery</h1>
      <div className="flex flex-col items-center">
        <div className="border rounded-lg p-3 shadow bg-white flex flex-col items-center">
          <Image
            src="/cards/1/card_normal.webp"
            alt={card["english name"]}
            unoptimized
            width={0}
            height={0}
            sizes="100vw"
            style={{ width: "60%", height: "auto" }}
          />
          <h2 className="mt-2 text-center font-semibold">{card["english name"]}</h2>
          <p className="text-center text-sm text-gray-600">
            {card.character} ({card.unit})
          </p>
          <p className="text-center text-xs text-gray-500">
            Rarity: {card.rarity} ★ | Attribute: {card.attribute}
          </p>
        </div>
      </div>
    </main>
  );
}