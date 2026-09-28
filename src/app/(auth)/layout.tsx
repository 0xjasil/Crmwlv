import type { Metadata } from 'next';
import './../globals.css';
import { APP_CONFIG } from '@/config/app';

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} | Login`,
  description: APP_CONFIG.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <main>{children}</main>;
}
