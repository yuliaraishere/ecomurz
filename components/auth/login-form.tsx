'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, Lock, Mail } from 'lucide-react';
import { loginAction } from '@/features/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffect } from 'react';

export function LoginForm() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/account';

  const [state, formAction, isPending] = useActionState(loginAction, null);

  useEffect(() => {
    if (state?.success) {
      const rawTarget = state.redirectTo || redirectTo || '/account';
      const sanitized = rawTarget.replace(/^\/(id|en|ja|tl|vi|th|hi|zh)(\/|$)/, '/');
      const target = sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
      router.push(target);
      router.refresh();
    }
  }, [state, redirectTo, router]);

  const getErrorMessage = (errorKey?: string) => {
    if (!errorKey) return null;
    switch (errorKey) {
      case 'INVALID_CREDENTIALS':
      case 'Invalid login credentials':
        return t('errorInvalidCredentials');
      case 'EMAIL_REQUIRED':
        return t('errorEmailRequired');
      case 'PASSWORD_REQUIRED':
        return t('errorPasswordRequired');
      default:
        return errorKey;
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-[2rem] border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {t('loginTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('loginSubtitle')}</p>
      </div>

      {state?.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="size-4" />
          <AlertDescription>{getErrorMessage(state.error)}</AlertDescription>
        </Alert>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="nama@contoh.com"
              className="h-11 rounded-xl pl-10"
              disabled={isPending}
            />
          </div>
          {state?.fieldErrors?.email && (
            <p className="text-xs text-destructive">{getErrorMessage(state.fieldErrors.email)}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('password')}</Label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="h-11 rounded-xl pl-10"
              disabled={isPending}
            />
          </div>
          {state?.fieldErrors?.password && (
            <p className="text-xs text-destructive">{getErrorMessage(state.fieldErrors.password)}</p>
          )}
        </div>

        <Button
          type="submit"
          className="mt-2 h-11 w-full rounded-xl font-medium"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>{t('signingIn')}</span>
            </>
          ) : (
            t('signIn')
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link
          href={redirectTo ? `/register?redirectTo=${encodeURIComponent(redirectTo)}` : '/register'}
          className="font-medium text-primary hover:underline"
        >
          {t('signUpNow')}
        </Link>
      </div>
    </div>
  );
}
