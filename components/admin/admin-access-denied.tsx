import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

interface AdminAccessDeniedProps {
  isUnauthorized?: boolean; // true if guest/not logged in, false if customer lacking admin role
}

export function AdminAccessDenied({ isUnauthorized = false }: AdminAccessDeniedProps) {
  const t = useTranslations('Admin');

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-8" />
        </div>

        <h1 className="text-xl font-bold text-foreground mb-2">
          {isUnauthorized ? t('unauthorized') : t('forbidden')}
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          {isUnauthorized ? t('unauthorizedMessage') : t('forbiddenMessage')}
        </p>

        <div className="flex flex-col gap-3">
          {isUnauthorized ? (
            <Button render={<Link href="/login?redirectTo=/admin" />} className="w-full rounded-full">
              <LogIn className="size-4 mr-2" />
              Sign In to Admin
            </Button>
          ) : (
            <Button
              render={<Link href="/" />}
              className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <ArrowLeft className="size-4 mr-2" />
              {t('returnHome')}
            </Button>
          )}

          <Button render={<Link href="/" />} variant="outline" className="w-full rounded-full">
            {t('backToStore')}
          </Button>
        </div>
      </div>
    </div>
  );
}
