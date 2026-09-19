'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const t = useTranslations('NotFound');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="max-w-md space-y-4 rounded-3xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">404</p>
        <h1 className="font-heading text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
        <div className="pt-2">
          <Button render={<Link href="/" />} className="rounded-full px-6 gap-2">
            <ArrowLeft className="size-4" />
            {t('backHome')}
          </Button>
        </div>
      </div>
    </div>
  );
}
