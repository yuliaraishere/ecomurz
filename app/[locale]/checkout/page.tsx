'use client';

import Image from 'next/image';
import { Link, useRouter } from '@/i18n/routing';
import { ArrowRight, Check, ChevronLeft, CreditCard, MapPin, PackageCheck, Truck } from 'lucide-react';
import { SubmitEvent, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { SiteHeader } from '@/components/site-header';
import { useCart } from '@/features/cart';
import { useOrders } from '@/features/orders';
import { rupiah, shippingOptions } from '@/lib/marketplace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

import { CouponInput, AppliedCouponInfo } from '@/components/checkout/coupon-input';

const payments = ['Bank Transfer', 'GoPay', 'Kartu Kredit'];
const formString = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === 'string' ? value : '';
};

export default function CheckoutPage() {
  const router = useRouter();
  const t = useTranslations('Checkout');
  const locale = useLocale();
  const { cart, hydrated: cartHydrated, getProduct, clearCart } = useCart();
  const { createOrderServer, hydrated: ordersHydrated } = useOrders();
  const hydrated = cartHydrated && ordersHydrated;

  const [shippingId, setShippingId] = useState('regular');
  const [payment, setPayment] = useState('Bank Transfer');
  const [buying, setBuying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponInfo | null>(null);

  const lines = useMemo(
    () =>
      cart.flatMap((item) => {
        const product = getProduct(item.productId);
        return product ? [{ ...item, product }] : [];
      }),
    [cart, getProduct]
  );

  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const shipping = shippingOptions.find((item) => item.id === shippingId) ?? shippingOptions[0];
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const total = Math.max(0, subtotal - discountAmount) + shipping.price;

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!lines.length || buying) return;
    setBuying(true);
    setErrorMessage(null);
    const data = new FormData(event.currentTarget);

    try {
      const result = await createOrderServer({
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        address: {
          name: formString(data, 'name'),
          phone: formString(data, 'phone'),
          address: formString(data, 'address'),
          city: formString(data, 'city'),
          postalCode: formString(data, 'postalCode'),
        },
        shippingId,
        payment,
        couponCode: appliedCoupon?.code,
        locale,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        setBuying(false);
        return;
      }

      clearCart();
      const rawTargetUrl = (result as any).paymentUrl || `/payments/dummy/${result.order.id}`;
      if (rawTargetUrl.startsWith('http')) {
        window.location.href = rawTargetUrl;
      } else {
        const sanitized = rawTargetUrl.replace(/^\/(id|en|ja|tl|vi|th|hi|zh)(\/|$)/, '/');
        const target = sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
        window.setTimeout(() => router.push(target), 300);
      }
    } catch (err) {
      console.error('Failed to process checkout:', err);
      setErrorMessage('Terjadi kesalahan saat memproses pesanan.');
      setBuying(false);
    }
  };

  if (hydrated && !lines.length) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-5 py-20 text-center">
          <PackageCheck className="mx-auto size-12 text-muted-foreground" />
          <h1 className="mt-5 font-heading text-3xl font-semibold">{t('emptyCartTitle')}</h1>
          <p className="mt-2 text-muted-foreground">{t('emptyCartSubtitle')}</p>
          <Button render={<Link href="/" />} className="mt-6 rounded-full">
            {t('browseProducts')}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <form onSubmit={submit} className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <Button render={<Link href="/cart" />} type="button" variant="ghost" className="mb-6 rounded-full">
          <ChevronLeft /> {t('backToCart')}
        </Button>
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">{t('tag')}</p>
              <h1 className="mt-1 font-heading text-4xl font-semibold tracking-[-.05em]">{t('title')}</h1>
            </div>

            <section className="rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/8 sm:p-7">
              <h2 className="flex items-center gap-3 font-heading text-xl font-semibold">
                <span className="grid size-9 place-items-center rounded-full bg-secondary">
                  <MapPin className="size-4" />
                </span>
                {t('shippingAddressTitle')}
              </h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('recipientName')}</Label>
                  <Input id="name" name="name" required defaultValue="Yulia Rizki Anjani" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phoneNumber')}</Label>
                  <Input id="phone" name="phone" required type="tel" defaultValue="0812 3456 7890" className="h-11" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">{t('fullAddress')}</Label>
                  <Textarea id="address" name="address" required defaultValue="Jl. Kemang Raya No. 18, Kel. Bangka" className="min-h-24" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">{t('city')}</Label>
                  <NativeSelect name="city" className="w-full">
                    <NativeSelectOption>Jakarta Selatan</NativeSelectOption>
                    <NativeSelectOption>Bandung</NativeSelectOption>
                    <NativeSelectOption>Surabaya</NativeSelectOption>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">{t('postalCode')}</Label>
                  <Input id="postalCode" name="postalCode" required inputMode="numeric" defaultValue="12730" className="h-11" />
                </div>
              </div>
            </section>

            <section className="rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/8 sm:p-7">
              <h2 className="flex items-center gap-3 font-heading text-xl font-semibold">
                <span className="grid size-9 place-items-center rounded-full bg-secondary">
                  <Truck className="size-4" />
                </span>
                {t('shippingMethodTitle')}
              </h2>
              <RadioGroup
                value={shippingId}
                onValueChange={(value) => setShippingId(String(value))}
                className="mt-5 grid gap-3"
              >
                {shippingOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                      shippingId === option.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value={option.id} />
                    <div className="flex-1">
                      <p className="font-semibold">{option.name}</p>
                      <p className="text-sm text-muted-foreground">{option.eta}</p>
                    </div>
                    <span className="text-sm font-semibold">{rupiah(option.price)}</span>
                  </label>
                ))}
              </RadioGroup>
            </section>

            <section className="rounded-[1.5rem] bg-card p-5 ring-1 ring-foreground/8 sm:p-7">
              <h2 className="flex items-center gap-3 font-heading text-xl font-semibold">
                <span className="grid size-9 place-items-center rounded-full bg-secondary">
                  <CreditCard className="size-4" />
                </span>
                {t('paymentMethodTitle')}
              </h2>
              <RadioGroup
                value={payment}
                onValueChange={(value) => setPayment(String(value))}
                className="mt-5 grid gap-3 sm:grid-cols-3"
              >
                {payments.map((item) => (
                  <label
                    key={item}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                      payment === item
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value={item} />
                    <span className="text-sm font-semibold">{item}</span>
                  </label>
                ))}
              </RadioGroup>
            </section>
          </div>

          <aside className="h-fit rounded-[1.5rem] bg-[#19352f] p-6 text-[#f7f4e9] lg:sticky lg:top-28">
            <h2 className="font-heading text-xl font-semibold">{t('orderSummaryTitle')}</h2>
            <div className="mt-5 max-h-56 space-y-4 overflow-auto pr-1">
              {lines.map((line) => (
                <div key={line.productId} className="flex gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-white/10">
                    <Image src={line.product.image} alt="" fill sizes="56px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{line.product.name}</p>
                    <p className="mt-1 text-xs text-[#d7e0d4]">
                      {line.quantity} × {rupiah(line.product.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="my-5 h-px bg-white/15" />
            <div className="rounded-xl bg-white/5 p-3 border border-white/10">
              <p className="mb-2 text-xs font-semibold text-[#d7e0d4] uppercase tracking-wider">
                {t('couponCode') || 'Promo Code'}
              </p>
              <CouponInput
                cartItems={cart.map((item) => ({ productId: item.productId, quantity: item.quantity }))}
                appliedCoupon={appliedCoupon}
                onApplyCoupon={(coupon) => setAppliedCoupon(coupon)}
                onRemoveCoupon={() => setAppliedCoupon(null)}
                disabled={buying}
              />
            </div>
            <div className="my-5 h-px bg-white/15" />
            <div className="space-y-3 text-sm text-[#d7e0d4]">
              <div className="flex justify-between">
                <span>{t('subtotal')}</span>
                <span>{rupiah(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between font-semibold text-emerald-400">
                  <span>{t('discount') || 'Discount'} ({appliedCoupon?.code})</span>
                  <span>-{rupiah(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t('shippingCost')}</span>
                <span>{rupiah(shipping.price)}</span>
              </div>
            </div>
            <div className="my-5 h-px bg-white/15" />
            <div className="flex items-end justify-between">
              <span>{t('total')}</span>
              <span className="font-heading text-2xl font-semibold">{rupiah(total)}</span>
            </div>
            {errorMessage && (
              <div className="mt-4 rounded-xl bg-destructive/15 p-3 text-xs text-[#ffb4b4] border border-destructive/30">
                {errorMessage}
              </div>
            )}
            <Button
              type="submit"
              disabled={buying || !hydrated}
              className="mt-6 h-12 w-full rounded-full bg-[#f3c969] text-[#19352f] hover:bg-[#ffda7f]"
            >
              {buying ? <><Check /> {t('processing')}</> : <>{t('payNow')} <ArrowRight /></>}
            </Button>
          </aside>
        </div>
      </form>
    </main>
  );
}
