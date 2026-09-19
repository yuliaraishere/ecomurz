import type { PaymentConfirmationEmailData, RenderedEmail, SupportedLocale } from '../domain/email-template';

const copy: Record<SupportedLocale, { subject: string; greeting: string; message: string; orderId: string; amount: string; method: string; date: string }> = {
  id: {
    subject: 'Pembayaran Diterima untuk Pesanan #{orderId} — RUPA Marketplace',
    greeting: 'Halo',
    message: 'Pembayaran Anda telah berhasil kami terima dan verifikasi. Pesanan Anda akan segera kami kirimkan.',
    orderId: 'ID Pesanan',
    amount: 'Jumlah Pembayaran',
    method: 'Metode Pembayaran',
    date: 'Waktu Pembayaran',
  },
  en: {
    subject: 'Payment Received for Order #{orderId} — RUPA Marketplace',
    greeting: 'Hello',
    message: 'We have successfully received and verified your payment. Your order will be prepared for shipment shortly.',
    orderId: 'Order ID',
    amount: 'Amount Paid',
    method: 'Payment Method',
    date: 'Payment Timestamp',
  },
  ja: {
    subject: 'お支払い受領のお知らせ #{orderId} — RUPA マーケットプレイス',
    greeting: 'こんにちは',
    message: 'お支払いの受領と確認が完了いたしました。商品の発送手配を進めてまいります。',
    orderId: '注文ID',
    amount: '支払金額',
    method: '支払方法',
    date: '支払日時',
  },
  tl: {
    subject: 'Natanggap ang Pagbabayad para sa Order #{orderId} — RUPA Marketplace',
    greeting: 'Kumusta',
    message: 'Matagumpay naming natanggap at na-verify ang iyong bayad. Ihahanda na ang iyong order para sa pagpapadala.',
    orderId: 'Order ID',
    amount: 'Halagang Binayaran',
    method: 'Paraan ng Pagbabayad',
    date: 'Petsa ng Pagbabayad',
  },
  vi: {
    subject: 'Đã nhận thanh toán cho đơn hàng #{orderId} — RUPA Marketplace',
    greeting: 'Xin chào',
    message: 'Chúng tôi đã nhận và xác minh thành công khoản thanh toán của bạn. Đơn hàng sẽ sớm được vận chuyển.',
    orderId: 'Mã đơn hàng',
    amount: 'Số tiền thanh toán',
    method: 'Phương thức thanh toán',
    date: 'Thời gian thanh toán',
  },
  th: {
    subject: 'ได้รับการชำระเงินสำหรับคำสั่งซื้อ #{orderId} — RUPA Marketplace',
    greeting: 'สวัสดี',
    message: 'เราได้รับและยืนยันการชำระเงินของคุณเรียบร้อยแล้ว คำสั่งซื้อของคุณจะถูกจัดส่งในเร็วๆ นี้',
    orderId: 'รหัสคำสั่งซื้อ',
    amount: 'จำนวนเงินที่ชำระ',
    method: 'วิธีการชำระเงิน',
    date: 'เวลาที่ชำระเงิน',
  },
  hi: {
    subject: 'ऑर्डर #{orderId} के लिए भुगतान प्राप्त हुआ — RUPA Marketplace',
    greeting: 'नमस्ते',
    message: 'हमने आपका भुगतान सफलतापूर्वक प्राप्त और सत्यापित कर लिया है। आपका ऑर्डर शीघ्र ही भेजा जाएगा।',
    orderId: 'ऑर्डर आईडी',
    amount: 'भुगतान की गई राशि',
    method: 'भुगतान विधि',
    date: 'भुगतान समय',
  },
  zh: {
    subject: '已收到订单 #{orderId} 的付款 — RUPA Marketplace',
    greeting: '您好',
    message: '我们已成功收到并确认您的付款。您的订单将很快安排发货。',
    orderId: '订单编号',
    amount: '付款金额',
    method: '支付方式',
    date: '付款时间',
  },
};

export function renderPaymentConfirmationEmail(data: PaymentConfirmationEmailData): RenderedEmail {
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
      <p style="margin: 4px 0;"><strong>${t.orderId}:</strong> ${data.orderId}</p>
      <p style="margin: 4px 0;"><strong>${t.amount}:</strong> ¥${data.amount.toLocaleString()}</p>
      <p style="margin: 4px 0;"><strong>${t.method}:</strong> ${data.paymentMethod.toUpperCase()}</p>
      <p style="margin: 4px 0;"><strong>${t.date}:</strong> ${data.paidAt}</p>
    </div>
  </div>
</body>
</html>`;

  const text = `${name}\n\n${t.message}\n\n${t.orderId}: ${data.orderId}\n${t.amount}: ¥${data.amount}\n${t.method}: ${data.paymentMethod}\n${t.date}: ${data.paidAt}`;

  return { subject, html, text };
}
