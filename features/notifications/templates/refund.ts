import type { RefundEmailData, RenderedEmail, SupportedLocale } from '../domain/email-template';

const copy: Record<SupportedLocale, { subject: string; greeting: string; message: string; orderId: string; refundId: string; amount: string; reason: string; note: string }> = {
  id: {
    subject: 'Pengembalian Dana Diproses #{orderId} — RUPA Marketplace',
    greeting: 'Halo',
    message: 'Pengembalian dana untuk pesanan Anda telah berhasil diproses.',
    orderId: 'ID Pesanan',
    refundId: 'ID Pengembalian',
    amount: 'Jumlah Dana Dikembalikan',
    reason: 'Alasan',
    note: 'Dana akan kembali ke metode pembayaran asal Anda dalam 3–7 hari kerja tergantung kebijakan bank/penerbit kartu Anda.',
  },
  en: {
    subject: 'Refund Processed for Order #{orderId} — RUPA Marketplace',
    greeting: 'Hello',
    message: 'A refund has been successfully processed for your order.',
    orderId: 'Order ID',
    refundId: 'Refund ID',
    amount: 'Refund Amount',
    reason: 'Reason',
    note: 'The funds will be credited back to your original payment method within 3–7 business days depending on your bank/card issuer.',
  },
  ja: {
    subject: '返金処理完了のお知らせ #{orderId} — RUPA マーケットプレイス',
    greeting: 'こんにちは',
    message: 'ご注文に対する返金手続きが完了いたしました。',
    orderId: '注文ID',
    refundId: '返金ID',
    amount: '返金金額',
    reason: '理由',
    note: 'ご利用の決済機関またはカード会社の規定により、通常3〜7営業日以内に口座へ反映されます。',
  },
  tl: {
    subject: 'Naproseso Na ang Refund para sa Order #{orderId} — RUPA Marketplace',
    greeting: 'Kumusta',
    message: 'Matagumpay nang naproseso ang refund para sa iyong order.',
    orderId: 'Order ID',
    refundId: 'Refund ID',
    amount: 'Halaga ng Refund',
    reason: 'Dahilan',
    note: 'Babalik ang pondo sa iyong orihinal na paraan ng pagbabayad sa loob ng 3–7 araw ng negosyo.',
  },
  vi: {
    subject: 'Đã xử lý hoàn tiền cho đơn hàng #{orderId} — RUPA Marketplace',
    greeting: 'Xin chào',
    message: 'Khoản tiền hoàn cho đơn hàng của bạn đã được xử lý thành công.',
    orderId: 'Mã đơn hàng',
    refundId: 'Mã hoàn tiền',
    amount: 'Số tiền hoàn lại',
    reason: 'Lý do',
    note: 'Tiền sẽ được ghi có vào phương thức thanh toán ban đầu trong vòng 3–7 ngày làm việc.',
  },
  th: {
    subject: 'ดำเนินการคืนเงินสำหรับคำสั่งซื้อ #{orderId} — RUPA Marketplace',
    greeting: 'สวัสดี',
    message: 'การคืนเงินสำหรับคำสั่งซื้อของคุณได้รับการดำเนินการเรียบร้อยแล้ว',
    orderId: 'รหัสคำสั่งซื้อ',
    refundId: 'รหัสการคืนเงิน',
    amount: 'จำนวนเงินที่คืน',
    reason: 'เหตุผล',
    note: 'เงินจะถูกโอนกลับเข้าบัญชีเดิมของคุณภายใน 3–7 วันทำการขึ้นอยู่กับธนาคารหรือผู้ให้บริการบัตรของคุณ',
  },
  hi: {
    subject: 'ऑर्डर #{orderId} के लिए रिफंड संसाधित — RUPA Marketplace',
    greeting: 'नमस्ते',
    message: 'आपके ऑर्डर के लिए रिफंड सफलतापूर्वक संसाधित कर दिया गया है।',
    orderId: 'ऑर्डर आईडी',
    refundId: 'रिफंड आईडी',
    amount: 'रिफंड राशि',
    reason: 'कारण',
    note: 'धनराशि आपके बैंक/कार्ड प्रदाता की नीति के अनुसार 3-7 कार्य दिवसों के भीतर आपके मूल भुगतान विधि में जमा कर दी जाएगी।',
  },
  zh: {
    subject: '已处理订单 #{orderId} 的退款 — RUPA Marketplace',
    greeting: '您好',
    message: '您的订单退款已成功处理。',
    orderId: '订单编号',
    refundId: '退款编号',
    amount: '退款金额',
    reason: '退款原因',
    note: '款项将在 3–7 个工作日内退回至您的原支付账户，具体到账时间取决于银行或发卡机构。',
  },
};

export function renderRefundEmail(data: RefundEmailData): RenderedEmail {
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
      <p style="margin: 4px 0;"><strong>${t.refundId}:</strong> ${data.refundId}</p>
      <p style="margin: 4px 0;"><strong>${t.amount}:</strong> ¥${data.amount.toLocaleString()}</p>
      ${data.reason ? `<p style="margin: 4px 0;"><strong>${t.reason}:</strong> ${data.reason}</p>` : ''}
    </div>
    <p style="color: #64748b; font-size: 13px;">${t.note}</p>
  </div>
</body>
</html>`;

  const text = `${name}\n\n${t.message}\n\nOrder ID: ${data.orderId}\nRefund ID: ${data.refundId}\nAmount: ¥${data.amount}\n${data.reason ? `Reason: ${data.reason}\n` : ''}\n${t.note}`;

  return { subject, html, text };
}
