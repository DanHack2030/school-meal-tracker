import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Control de Colaciones',
  description: 'Monitorea y registra la ingesta nutricional de los estudiantes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
