import cardData from "@/data/card_metadata.json";
import Image from "next/image";

export default function Home() {
  const cards = Object.values(cardData);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Card Gallery</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {cards.map((card) => {
          const imgSrc = `/cards/${card.id}/card_normal.webp`; // correct path
          return (
            <div
              key={card.id}
              className="border rounded-lg p-3 shadow bg-white"
            >
              <Image
                src={imgSrc}
                alt={card["english name"]}
                width={200}
                height={300}
                className="rounded"
              />
              <h2 className="mt-2 text-center font-semibold">
                {card["english name"]}
              </h2>
              <p className="text-center text-sm text-gray-600">
                {card.character} ({card.unit})
              </p>
              <p className="text-center text-xs text-gray-500">
                Rarity: {card.rarity} ★ | Attribute: {card.attribute}
              </p>
            </div>
          );
        })}
      </div>
    </main>
  );
}