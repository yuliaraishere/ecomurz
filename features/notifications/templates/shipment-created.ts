import type { ShipmentCreatedEmailData, RenderedEmail, SupportedLocale } from '../domain/email-template';

const copy: Record<SupportedLocale, { subject: string; greeting: string; message: string; trackingNumber: string; courier: string; trackButton: string }> = {
  id: {
    subject: 'Pesanan Anda Telah Dikirim #{orderId} — RUPA Marketplace',
    greeting: 'Halo',
    message: 'Kabar baik! Pesanan Anda telah dikirim dan sedang dalam perjalanan.',
    trackingNumber: 'Nomor Resi Pelacakan',
    courier: 'Kurir Pengiriman',
    trackButton: 'Lacak Pengiriman',
  },
  en: {
    subject: 'Your Order Has Shipped #{orderId} — RUPA Marketplace',
    greeting: 'Hello',
    message: 'Great news! Your order has shipped and is on its way to you.',
    trackingNumber: 'Tracking Number',
    courier: 'Courier',
    trackButton: 'Track Shipment',
  },
  ja: {
    subject: '商品を発送いたしました #{orderId} — RUPA マーケットプレイス',
    greeting: 'こんにちは',
    message: 'ご注文の商品を発送いたしました。到着まで今しばらくお待ちください。',
    trackingNumber: '追跡番号',
    courier: '配送会社',
    trackButton: '配送状況を確認する',
  },
  tl: {
    subject: 'Naipadala Na ang Iyong Order #{orderId} — RUPA Marketplace',
    greeting: 'Kumusta',
    message: 'Magandang balita! Naipadala na ang iyong order at papunta na sa iyo.',
    trackingNumber: 'Tracking Number',
    courier: 'Courier',
    trackButton: 'Subaybayan ang Pagpapadala',
  },
  vi: {
    subject: 'Đơn hàng của bạn đã được gửi #{orderId} — RUPA Marketplace',
    greeting: 'Xin chào',
    message: 'Tin vui! Đơn hàng của bạn đã được xuất kho và đang trên đường giao đến bạn.',
    trackingNumber: 'Mã vận đơn',
    courier: 'Đơn vị vận chuyển',
    trackButton: 'Theo dõi đơn hàng',
  },
  th: {
    subject: 'คำสั่งซื้อของคุณถูกจัดส่งแล้ว #{orderId} — RUPA Marketplace',
    greeting: 'สวัสดี',
    message: 'ข่าวดี! คำสั่งซื้อของคุณได้รับการจัดส่งแล้วและกำลังเดินทางไปหาคุณ',
    trackingNumber: 'หมายเลขติดตามพัสดุ',
    courier: 'ผู้ให้บริการขนส่ง',
    trackButton: 'ติดตามการจัดส่ง',
  },
  hi: {
    subject: 'आपका ऑर्डर भेज दिया गया है #{orderId} — RUPA Marketplace',
    greeting: 'नमस्ते',
    message: 'खुशखबरी! आपका ऑर्डर भेज दिया गया है और रास्ते में है।',
    trackingNumber: 'ट्रैकिंग नंबर',
    courier: 'कूरियर',
    trackButton: 'शिपमेंट ट्रैक करें',
  },
  zh: {
    subject: '您的订单已发货 #{orderId} — RUPA Marketplace',
    greeting: '您好',
    message: '好消息！您的订单已发货，正在运送途中。',
    trackingNumber: '快递运单号',
    courier: '物流承运商',
    trackButton: '查询物流进度',
  },
};

export function renderShipmentCreatedEmail(data: ShipmentCreatedEmailData): RenderedEmail {
  const loc = (data.locale && data.locale in copy ? data.locale : 'id') as SupportedLocale;
  const t = copy[loc];
  const name = data.recipientName ? `${t.greeting}, ${data.recipientName}` : t.greeting;
  const subject = t.subject.replace('{orderId}', data.orderId);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #059669; padding: 16px 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px;">RUPA Marketplace</h1>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; font-weight: 600;">${name}</p>
    <p>${t.message}</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 14px;">
      <p style="margin: 4px 0;"><strong>${t.courier}:</strong> ${data.courierName}</p>
      <p style="margin: 4px 0;"><strong>${t.trackingNumber}:</strong> <span style="font-family: monospace; font-size: 16px;">${data.trackingNumber}</span></p>
    </div>
    ${data.trackingUrl ? `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.trackingUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">${t.trackButton}</a>
    </div>` : ''}
  </div>
</body>
</html>`;

  const text = `${name}\n\n${t.message}\n\nOrder ID: ${data.orderId}\n${t.courier}: ${data.courierName}\n${t.trackingNumber}: ${data.trackingNumber}\n${data.trackingUrl ? `\nTrack: ${data.trackingUrl}` : ''}`;

  return { subject, html, text };
}
