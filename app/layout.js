export const metadata = {
  title: 'Quan em toca renovar? | Serveis Mèdics Penedès',
  description: 'Calcula quan has de fer el teu reconeixement mèdic',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ca" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/globals.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
