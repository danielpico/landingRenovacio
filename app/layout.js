import './globals.css';

export const metadata = {
  title: 'Quan em toca renovar? | Serveis Mèdics Penedès',
  description: 'Calcula quan has de fer el teu reconeixement mèdic',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ca" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
