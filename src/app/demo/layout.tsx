import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Explorer - Calbrew B2B API',
  description:
    'Interactive playground to explore the Calbrew B2B API endpoints for Hebrew date conversions, holidays, contacts, and webhooks.',
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
