export const metadata = {
  title: "Card Gallery",
  description: "Project Sekai Card Browser",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
