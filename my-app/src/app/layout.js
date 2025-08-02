export const metadata = {
  title: "Card Gallery",
  description: "Project Sekai Card Browser",
};
import './style.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
