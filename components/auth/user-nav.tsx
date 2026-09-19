'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { ChevronDown, History, LogOut, RotateCcw, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserNav() {
  const t = useTranslations('Auth');
  const tReturn = useTranslations('Return');
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div className="size-9 rounded-full bg-muted/60 animate-pulse" />;
  }

  if (!user) {
    return (
      <Button
        render={<Link href="/login" />}
        variant="ghost"
        className="h-11 gap-2 rounded-full px-3 sm:px-4"
        aria-label={t('signIn')}
      >
        <UserIcon className="size-4" />
        <span className="hidden sm:inline">{t('signIn')}</span>
      </Button>
    );
  }

  const displayName = user.fullName || user.email.split('@')[0];
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-11 gap-2 rounded-full px-2 sm:px-3"
            aria-label={displayName}
          />
        }
      >
        <div className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {initials}
        </div>
        <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
          {displayName}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5">
          <p className="text-sm font-medium leading-none text-foreground">{displayName}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/account')}
          className="cursor-pointer gap-2 py-2"
        >
          <UserIcon className="size-4" />
          <span>{t('account')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push('/transactions')}
          className="cursor-pointer gap-2 py-2"
        >
          <History className="size-4" />
          <span>{t('orders')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push('/returns')}
          className="cursor-pointer gap-2 py-2"
        >
          <RotateCcw className="size-4" />
          <span>{tReturn('returnsHistory')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          variant="destructive"
          className="cursor-pointer gap-2 py-2"
        >
          <LogOut className="size-4" />
          <span>{t('signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
