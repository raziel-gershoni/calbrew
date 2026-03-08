import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Calbrew',
  description: 'Manage all API clients, tiers, and rate limits.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
