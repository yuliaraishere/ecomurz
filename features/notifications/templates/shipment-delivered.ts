import type { ShipmentDeliveredEmailData, RenderedEmail, SupportedLocale } from '../domain/email-template';

const copy: Record<SupportedLocale, { subject: string; greeting: string; message: string; deliveredAt: string; reviewPrompt: string }> = {
  id: {
    subject: 'Pesanan Anda Telah Tiba #{orderId} — RUPA Marketplace',
    greeting: 'Halo',
    message: 'Paket pesanan Anda telah berhasil diantarkan ke alamat tujuan.',
    deliveredAt: 'Waktu Pengiriman',
    reviewPrompt: 'Semoga Anda menikmati produk kami! Jika Anda membutuhkan bantuan atau ingin mengajukan pengembalian, silakan kunjungi portal pesanan Anda.',
  },
  en: {
    subject: 'Your Order Has Been Delivered #{orderId} — RUPA Marketplace',
    greeting: 'Hello',
    message: 'Your package has been successfully delivered to your address.',
    deliveredAt: 'Delivered At',
    reviewPrompt: 'We hope you enjoy your products! If you need assistance or wish to request a return, please visit your orders page.',
  },
  ja: {
    subject: '商品をお届けいたしました #{orderId} — RUPA マーケットプレイス',
    greeting: 'こんにちは',
    message: 'ご注文の商品がご指定の配送先にお届け完了いたしました。',
    deliveredAt: '配達日時',
    reviewPrompt: '商品をお楽しみいただければ幸いです。返品やサポートが必要な場合は、注文詳細ページよりお問い合わせください。',
  },
  tl: {
    subject: 'Naihatid Na ang Iyong Order #{orderId} — RUPA Marketplace',
    greeting: 'Kumusta',
    message: 'Matagumpay na naihatid ang iyong package sa iyong tirahan.',
    deliveredAt: 'Oras ng Paghahatid',
    reviewPrompt: 'Sana magustuhan mo ang aming produkto! Kung kailangan mo ng tulong, bisitahin ang iyong orders page.',
  },
  vi: {
    subject: 'Đơn hàng của bạn đã được giao #{orderId} — RUPA Marketplace',
    greeting: 'Xin chào',
    message: 'Gói hàng của bạn đã được giao thành công đến địa chỉ nhận.',
    deliveredAt: 'Thời gian giao hàng',
    reviewPrompt: 'Hy vọng bạn hài lòng với sản phẩm! Nếu cần hỗ trợ hoặc đổi trả, vui lòng truy cập trang đơn hàng.',
  },
  th: {
    subject: 'คำสั่งซื้อของคุณจัดส่งสำเร็จแล้ว #{orderId} — RUPA Marketplace',
    greeting: 'สวัสดี',
    message: 'พัสดุของคุณได้รับการจัดส่งถึงที่อยู่ของคุณเรียบร้อยแล้ว',
    deliveredAt: 'เวลาที่จัดส่ง',
    reviewPrompt: 'หวังว่าคุณจะพึงพอใจในสินค้า! หากต้องการความช่วยเหลือหรือต้องการขอคืนสินค้า โปรดไปที่หน้าคำสั่งซื้อของคุณ',
  },
  hi: {
    subject: 'आपका ऑर्डर डिलीवर हो गया है #{orderId} — RUPA Marketplace',
    greeting: 'नमस्ते',
    message: 'आपका पैकेज आपके पते पर सफलतापूर्वक डिलीवर कर दिया गया है।',
    deliveredAt: 'डिलीवरी का समय',
    reviewPrompt: 'हमें उम्मीद है कि आपको अपने उत्पाद पसंद आए होंगे! यदि आपको सहायता चाहिए, तो कृपया अपने ऑर्डर पृष्ठ पर जाएँ।',
  },
  zh: {
    subject: '您的订单已妥投 #{orderId} — RUPA Marketplace',
    greeting: '您好',
    message: '您的包裹已成功送达指定收货地址。',
    deliveredAt: '送达时间',
    reviewPrompt: '希望您喜欢我们的商品！如需协助或申请退换货，请前往您的订单页面。',
  },
};

export function renderShipmentDeliveredEmail(data: ShipmentDeliveredEmailData): RenderedEmail {
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
      <p style="margin: 4px 0;"><strong>${t.deliveredAt}:</strong> ${data.deliveredAt}</p>
      <p style="margin: 4px 0;"><strong>Courier:</strong> ${data.courierName} (${data.trackingNumber})</p>
    </div>
    <p style="color: #64748b; font-size: 14px;">${t.reviewPrompt}</p>
  </div>
</body>
</html>`;

  const text = `${name}\n\n${t.message}\n\nOrder ID: ${data.orderId}\n${t.deliveredAt}: ${data.deliveredAt}\nCourier: ${data.courierName} (${data.trackingNumber})\n\n${t.reviewPrompt}`;

  return { subject, html, text };
}
