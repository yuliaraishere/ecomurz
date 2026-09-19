import type { OrderConfirmationEmailData, RenderedEmail, SupportedLocale } from '../domain/email-template';

const copy: Record<SupportedLocale, { subject: string; greeting: string; thankYou: string; summary: string; subtotal: string; shipping: string; discount: string; total: string; address: string; payment: string }> = {
  id: {
    subject: 'Konfirmasi Pesanan #{orderId} — RUPA Marketplace',
    greeting: 'Halo',
    thankYou: 'Terima kasih atas pesanan Anda! Kami sedang memproses pesanan Anda.',
    summary: 'Rincian Pesanan',
    subtotal: 'Subtotal Produk',
    shipping: 'Biaya Pengiriman',
    discount: 'Diskon',
    total: 'Total Pembayaran',
    address: 'Alamat Pengiriman',
    payment: 'Metode Pembayaran',
  },
  en: {
    subject: 'Order Confirmation #{orderId} — RUPA Marketplace',
    greeting: 'Hello',
    thankYou: 'Thank you for your order! We are preparing your items.',
    summary: 'Order Summary',
    subtotal: 'Product Subtotal',
    shipping: 'Shipping Fee',
    discount: 'Discount',
    total: 'Total Payment',
    address: 'Shipping Address',
    payment: 'Payment Method',
  },
  ja: {
    subject: 'ご注文の確認 #{orderId} — RUPA マーケットプレイス',
    greeting: 'こんにちは',
    thankYou: 'ご注文いただきありがとうございます！現在商品の手配を進めております。',
    summary: '注文内容',
    subtotal: '小計',
    shipping: '配送料',
    discount: '割引',
    total: '合計金額',
    address: '配送先住所',
    payment: 'お支払い方法',
  },
  tl: {
    subject: 'Kumpirmasyon ng Order #{orderId} — RUPA Marketplace',
    greeting: 'Kumusta',
    thankYou: 'Salamat sa iyong order! Inihahanda na namin ang iyong mga item.',
    summary: 'Buod ng Order',
    subtotal: 'Subtotal ng Produkto',
    shipping: 'Bayad sa Pagpapadala',
    discount: 'Diskwento',
    total: 'Kabuuang Bayad',
    address: 'Tirahan ng Pagpapadala',
    payment: 'Paraan ng Pagbabayad',
  },
  vi: {
    subject: 'Xác nhận đơn hàng #{orderId} — RUPA Marketplace',
    greeting: 'Xin chào',
    thankYou: 'Cảm ơn bạn đã đặt hàng! Chúng tôi đang chuẩn bị các sản phẩm của bạn.',
    summary: 'Tóm tắt đơn hàng',
    subtotal: 'Tạm tính',
    shipping: 'Phí vận chuyển',
    discount: 'Giảm giá',
    total: 'Tổng thanh toán',
    address: 'Địa chỉ giao hàng',
    payment: 'Phương thức thanh toán',
  },
  th: {
    subject: 'ยืนยันคำสั่งซื้อ #{orderId} — RUPA Marketplace',
    greeting: 'สวัสดี',
    thankYou: 'ขอบคุณสำหรับคำสั่งซื้อของคุณ! เรากำลังเตรียมสินค้าให้คุณ',
    summary: 'สรุปคำสั่งซื้อ',
    subtotal: 'ยอดรวมสินค้า',
    shipping: 'ค่าจัดส่ง',
    discount: 'ส่วนลด',
    total: 'ยอดรวมทั้งสิ้น',
    address: 'ที่อยู่จัดส่ง',
    payment: 'วิธีการชำระเงิน',
  },
  hi: {
    subject: 'ऑर्डर की पुष्टि #{orderId} — RUPA Marketplace',
    greeting: 'नमस्ते',
    thankYou: 'आपके ऑर्डर के लिए धन्यवाद! हम आपके सामान तैयार कर रहे हैं।',
    summary: 'ऑर्डर सारांश',
    subtotal: 'उत्पाद उप-योग',
    shipping: 'शिपिंग शुल्क',
    discount: 'छूट',
    total: 'कुल भुगतान',
    address: 'शिपिंग पता',
    payment: 'भुगतान का तरीका',
  },
  zh: {
    subject: '订单确认 #{orderId} — RUPA Marketplace',
    greeting: '您好',
    thankYou: '感谢您的订购！我们正在为您准备商品。',
    summary: '订单摘要',
    subtotal: '商品小计',
    shipping: '运费',
    discount: '折扣',
    total: '实付总计',
    address: '收货地址',
    payment: '支付方式',
  },
};

export function renderOrderConfirmationEmail(data: OrderConfirmationEmailData): RenderedEmail {
  const loc = (data.locale && data.locale in copy ? data.locale : 'id') as SupportedLocale;
  const t = copy[loc];
  const name = data.recipientName ? `${t.greeting}, ${data.recipientName}` : t.greeting;
  const subject = t.subject.replace('{orderId}', data.orderId);

  const itemsRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">¥${item.price.toLocaleString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">¥${item.subtotal.toLocaleString()}</td>
      </tr>`
    )
    .join('');

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
    <p>${t.thankYou}</p>
    
    <h3 style="margin-top: 24px; border-bottom: 2px solid #059669; padding-bottom: 8px;">${t.summary} (ID: ${data.orderId})</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px;">
      <thead>
        <tr style="background-color: #f8fafc;">
          <th style="padding: 8px; text-align: left;">Item</th>
          <th style="padding: 8px; text-align: center;">Qty</th>
          <th style="padding: 8px; text-align: right;">Price</th>
          <th style="padding: 8px; text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div style="margin-top: 16px; font-size: 14px; text-align: right;">
      <p style="margin: 4px 0;">${t.subtotal}: <strong>¥${data.subtotal.toLocaleString()}</strong></p>
      <p style="margin: 4px 0;">${t.shipping}: <strong>¥${data.shippingFee.toLocaleString()}</strong></p>
      ${data.discount > 0 ? `<p style="margin: 4px 0; color: #dc2626;">${t.discount}: -¥${data.discount.toLocaleString()}</p>` : ''}
      <p style="margin: 8px 0 0 0; font-size: 18px; color: #059669;">${t.total}: <strong>¥${data.total.toLocaleString()}</strong></p>
    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
      <p style="margin: 4px 0;"><strong>${t.address}:</strong> ${data.shippingAddress}</p>
      <p style="margin: 4px 0;"><strong>${t.payment}:</strong> ${data.paymentMethod.toUpperCase()}</p>
    </div>
  </div>
</body>
</html>`;

  const textItems = data.items
    .map((i) => `- ${i.name} x${i.quantity} @ ¥${i.price} = ¥${i.subtotal}`)
    .join('\n');

  const text = `${name}\n\n${t.thankYou}\n\nOrder ID: ${data.orderId}\n\n${textItems}\n\n${t.subtotal}: ¥${data.subtotal}\n${t.shipping}: ¥${data.shippingFee}\n${t.discount}: ¥${data.discount}\n${t.total}: ¥${data.total}\n\n${t.address}: ${data.shippingAddress}\n${t.payment}: ${data.paymentMethod}`;

  return { subject, html, text };
}
