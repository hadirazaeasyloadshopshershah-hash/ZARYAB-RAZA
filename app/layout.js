export const metadata = {
  title: "General Store",
  description: "Online ordering system for a general store"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ur" dir="rtl">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f5f6f8" }}>
        {children}
      </body>
    </html>
  );
}
