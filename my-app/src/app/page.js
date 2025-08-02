import Image from "next/image";

export default function Home() {
  return (
    <main className="w-screen h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-2xl font-bold mb-4">Card Gallery</h1>
      <div className="flex flex-col items-center">
        <div className="border rounded-lg p-3 shadow bg-white flex flex-col items-center">
          <Image
            src="/cards/1/card_normal.webp"
            alt="Card 1"
            width={0}
            height={0}
            sizes="100vw"
            style={{ width: "auto", height: "auto", maxWidth: "100%", maxHeight: "80vh" }}
            className="rounded"
            priority
          />
          <h2 className="mt-2 text-center font-semibold">Card 1</h2>
          <p className="text-center text-sm text-gray-600">
            Character Name (Unit)
          </p>
          <p className="text-center text-xs text-gray-500">
            Rarity: ★ | Attribute: Attribute
          </p>
        </div>
      </div>
    </main>
  );
}