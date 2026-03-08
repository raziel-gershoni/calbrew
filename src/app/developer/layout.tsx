import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Developer Dashboard - Calbrew',
  description: 'Manage your API clients and keys for the Calbrew B2B API.',
};

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
