import "./globals.css";

export const metadata = {
  title: "AgentFence",
  description: "The security boundary between AI agents and the web.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
