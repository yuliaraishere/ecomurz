import { getCurrentUser } from '@/features/auth/services/current-user';
import { AdminNav } from '@/components/admin/admin-nav';
import { AdminAccessDenied } from '@/components/admin/admin-access-denied';
import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Operations | RUPA Marketplace',
  description: 'Operations and fulfillment dashboard for RUPA marketplace',
};

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Authoritative server-side identity and role verification from PostgreSQL
  const user = await getCurrentUser();

  if (!user) {
    return <AdminAccessDenied isUnauthorized={true} />;
  }

  if (user.role !== 'ADMIN') {
    return <AdminAccessDenied isUnauthorized={false} />;
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col font-sans">
      <AdminNav user={user} />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
