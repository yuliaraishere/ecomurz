'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Calendar, History, LogOut, Mail, Package, ShieldCheck, ShoppingBag, User } from 'lucide-react';
import type { AuthUser } from '@/features/auth';
import { useAuth } from '@/features/auth';
import { useOrders } from '@/features/orders';
import { Button } from '@/components/ui/button';

export function AccountView({ initialUser }: { initialUser: AuthUser }) {
  const t = useTranslations('Account');
  const tAuth = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const { signOut } = useAuth();
  const { transactions } = useOrders();

  const memberSince = initialUser.createdAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(initialUser.createdAt))
    : '-';

  const userOrders = transactions;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header Profile Card */}
      <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary sm:size-20">
            {(initialUser.fullName || initialUser.email).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold sm:text-3xl">
                {initialUser.fullName || t('defaultName')}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3.5" />
                {t('verifiedBadge')}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="size-4" />
              {initialUser.email}
            </p>
          </div>
        </div>

        <Button
          onClick={handleSignOut}
          variant="outline"
          className="rounded-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="size-4" />
          {tAuth('signOut')}
        </Button>
      </div>

      {/* Grid Information */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Account Details */}
        <div className="rounded-[2rem] border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="font-heading text-lg font-bold flex items-center gap-2">
            <User className="size-5 text-primary" />
            {t('profileTitle')}
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">{t('userIdLabel')}</span>
              <span className="font-mono text-xs max-w-[180px] truncate">{initialUser.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">{t('emailLabel')}</span>
              <span className="font-medium truncate max-w-[200px]">{initialUser.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">{t('memberSinceLabel')}</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="size-3.5" />
                {memberSince}
              </span>
            </div>
          </div>
        </div>

        {/* Orders Overview */}
        <div className="rounded-[2rem] border bg-card p-6 shadow-sm sm:p-8 flex flex-col justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold flex items-center gap-2">
              <Package className="size-5 text-primary" />
              {t('ordersTitle')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('ordersSubtitle', { count: userOrders.length })}
            </p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-heading text-4xl font-bold">{userOrders.length}</span>
              <span className="text-sm text-muted-foreground">{t('ordersPlaced')}</span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              render={<Link href="/transactions" />}
              className="flex-1 rounded-full gap-2"
            >
              <History className="size-4" />
              {t('viewOrdersButton')}
            </Button>
            <Button
              render={<Link href="/" />}
              variant="outline"
              className="rounded-full gap-2"
            >
              <ShoppingBag className="size-4" />
              {t('shopButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
