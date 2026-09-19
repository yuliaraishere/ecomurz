'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/features/auth/actions/auth-actions';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Tag,
  Store,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  ShoppingBag,
  FolderTree,
  Search,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import type { AuthUser } from '@/features/auth/types';

interface AdminNavProps {
  user: AuthUser;
}

export function AdminNav({ user }: AdminNavProps) {
  const t = useTranslations('Admin');
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      href: '/admin',
      label: t('dashboard'),
      icon: LayoutDashboard,
      active: pathname === '/admin',
    },
    {
      href: '/admin/products',
      label: t('products') || 'Products',
      icon: ShoppingBag,
      active: pathname.startsWith('/admin/products'),
    },
    {
      href: '/admin/categories',
      label: t('categories') || 'Categories',
      icon: FolderTree,
      active: pathname.startsWith('/admin/categories'),
    },
    {
      href: '/admin/orders',
      label: t('orders'),
      icon: Package,
      active: pathname.startsWith('/admin/orders'),
    },
    {
      href: '/admin/returns',
      label: t('returns.nav'),
      icon: RotateCcw,
      active: pathname.startsWith('/admin/returns'),
    },
    {
      href: '/admin/inventory',
      label: t('inventory'),
      icon: Boxes,
      active: pathname.startsWith('/admin/inventory'),
    },
    {
      href: '/admin/promotions',
      label: t('promotions') || 'Promotions',
      icon: Tag,
      active: pathname.startsWith('/admin/promotions'),
    },
    {
      href: '/admin/search',
      label: t('search') || 'Search & Index',
      icon: Search,
      active: pathname.startsWith('/admin/search'),
    },
    {
      href: '/admin/analytics',
      label: t('analytics') || 'Analytics',
      icon: BarChart3,
      active: pathname.startsWith('/admin/analytics'),
    },
  ];

  const handleLogout = async () => {
    await logoutAction();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand & Badge */}
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-foreground font-serif">
              rupa
            </span>
            <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary tracking-wide">
              <ShieldCheck className="size-3.5" />
              ADMIN
            </span>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Back to Store + Identity + Logout */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            render={<Link href="/" />}
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Store className="size-3.5 mr-1.5" />
            {t('backToStore')}
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/60 text-xs">
            <span className="size-2 rounded-full bg-emerald-500 inline-block" />
            <span className="font-mono text-foreground truncate max-w-[140px]">
              {user.email}
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-3.5 mr-1.5" />
            {t('logout')}
          </Button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle admin navigation"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer/Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-4 space-y-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    item.active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
              {user.email}
            </div>
            <div className="flex gap-2">
              <Button
                render={<Link href="/" />}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <Store className="size-3 mr-1" />
                Store
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-xs text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-3 mr-1" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
