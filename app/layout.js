import "./globals.css";

export const metadata = {
  title: "Storyd Pattern Generator",
  description: "AI-powered seamless pattern creator for fashion and textile prints",
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
