'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, Lock, Mail, User } from 'lucide-react';
import { registerAction } from '@/features/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function RegisterForm() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/account';

  const [state, formAction, isPending] = useActionState(registerAction, null);

  useEffect(() => {
    if (state?.success && !state.requiresEmailConfirmation) {
      const rawTarget = state.redirectTo || redirectTo || '/account';
      // Strip any duplicate locale prefix (e.g. /id/account -> /account) for next-intl router
      const sanitized = rawTarget.replace(/^\/(id|en|ja|tl|vi|th|hi|zh)(\/|$)/, '/');
      const target = sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
      router.push(target);
      router.refresh();
    }
  }, [state, redirectTo, router]);

  const getErrorMessage = (errorKey?: string) => {
    if (!errorKey) return null;
    switch (errorKey) {
      case 'EMAIL_REQUIRED':
        return t('errorEmailRequired');
      case 'EMAIL_INVALID':
        return t('errorEmailInvalid');
      case 'PASSWORD_REQUIRED':
        return t('errorPasswordRequired');
      case 'PASSWORD_TOO_SHORT':
        return t('errorPasswordTooShort');
      case 'PASSWORDS_DO_NOT_MATCH':
        return t('errorPasswordsDoNotMatch');
      default:
        return errorKey;
    }
  };

  if (state?.success && state?.requiresEmailConfirmation) {
    return (
      <div className="mx-auto w-full max-w-md rounded-[2rem] border bg-card p-6 shadow-sm sm:p-8 text-center">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Mail className="size-8" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {t('checkEmailTitle')}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {t('checkEmailSubtitle', { email: state.email || '' })}
        </p>
        <div className="mt-6">
          <Button
            render={
              <Link
                href={
                  redirectTo
                    ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
                    : '/login'
                }
              />
            }
            className="w-full rounded-xl h-11"
          >
            {t('signInNow')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-[2rem] border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {t('registerTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('registerSubtitle')}</p>
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
          <Label htmlFor="fullName">{t('fullName')}</Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              placeholder="Budi Santoso"
              className="h-11 rounded-xl pl-10"
              disabled={isPending}
            />
          </div>
        </div>

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
          <Label htmlFor="password">{t('password')}</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className="h-11 rounded-xl pl-10"
              disabled={isPending}
            />
          </div>
          {state?.fieldErrors?.confirmPassword && (
            <p className="text-xs text-destructive">
              {getErrorMessage(state.fieldErrors.confirmPassword)}
            </p>
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
              <span>{t('signingUp')}</span>
            </>
          ) : (
            t('signUp')
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        {t('hasAccount')}{' '}
        <Link
          href={redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/login'}
          className="font-medium text-primary hover:underline"
        >
          {t('signInNow')}
        </Link>
      </div>
    </div>
  );
}
