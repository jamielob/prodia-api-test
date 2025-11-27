import "./globals.css";

export const metadata = {
  title: "Prodia API Test",
  description: "Generate images using Prodia Flux Fast Schnell",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
