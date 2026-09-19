import type { VerificationEmailData, RenderedEmail, SupportedLocale } from '../domain/email-template';

const copy: Record<SupportedLocale, { subject: string; greeting: string; instruction: string; buttonText: string; expiry: string }> = {
  id: {
    subject: 'Verifikasi Alamat Email Anda — RUPA Marketplace',
    greeting: 'Halo',
    instruction: 'Terima kasih telah mendaftar di RUPA Multilingual Asian Marketplace. Silakan klik tombol di bawah ini untuk memverifikasi akun Anda:',
    buttonText: 'Verifikasi Email',
    expiry: 'Tautan ini akan kedaluwarsa dalam 24 jam.',
  },
  en: {
    subject: 'Verify Your Email Address — RUPA Marketplace',
    greeting: 'Hello',
    instruction: 'Thank you for registering with RUPA Multilingual Asian Marketplace. Please click the button below to verify your account:',
    buttonText: 'Verify Email',
    expiry: 'This link will expire in 24 hours.',
  },
  ja: {
    subject: 'メールアドレスの確認 — RUPA マーケットプレイス',
    greeting: 'こんにちは',
    instruction: 'RUPAマーケットプレイスにご登録いただきありがとうございます。以下のボタンをクリックしてメールアドレスを確認してください：',
    buttonText: 'メールを確認する',
    expiry: 'このリンクは24時間有効です。',
  },
  tl: {
    subject: 'I-verify ang Iyong Email Address — RUPA Marketplace',
    greeting: 'Kumusta',
    instruction: 'Salamat sa pagrehistro sa RUPA Multilingual Asian Marketplace. I-click ang button sa ibaba upang i-verify ang iyong account:',
    buttonText: 'I-verify ang Email',
    expiry: 'Mag-e-expire ang link na ito sa loob ng 24 na oras.',
  },
  vi: {
    subject: 'Xác minh địa chỉ email của bạn — RUPA Marketplace',
    greeting: 'Xin chào',
    instruction: 'Cảm ơn bạn đã đăng ký tại RUPA Multilingual Asian Marketplace. Vui lòng nhấp vào nút bên dưới để xác minh tài khoản của bạn:',
    buttonText: 'Xác minh Email',
    expiry: 'Liên kết này sẽ hết hạn sau 24 giờ.',
  },
  th: {
    subject: 'ยืนยันที่อยู่อีเมลของคุณ — RUPA Marketplace',
    greeting: 'สวัสดี',
    instruction: 'ขอบคุณที่ลงทะเบียนกับ RUPA Multilingual Asian Marketplace โปรดคลิกปุ่มด้านล่างเพื่อยืนยันบัญชีของคุณ:',
    buttonText: 'ยืนยันอีเมล',
    expiry: 'ลิงก์นี้จะหมดอายุภายใน 24 ชั่วโมง',
  },
  hi: {
    subject: 'अपना ईमेल पता सत्यापित करें — RUPA Marketplace',
    greeting: 'नमस्ते',
    instruction: 'RUPA बहुभाषी एशियाई बाज़ार में पंजीकरण करने के लिए धन्यवाद। कृपया अपने खाते को सत्यापित करने के लिए नीचे दिए गए बटन पर क्लिक करें:',
    buttonText: 'ईमेल सत्यापित करें',
    expiry: 'यह लिंक 24 घंटों में समाप्त हो जाएगा।',
  },
  zh: {
    subject: '验证您的电子邮件地址 — RUPA Marketplace',
    greeting: '您好',
    instruction: '感谢您注册 RUPA 亚洲多语言电商平台。请点击下方按钮验证您的账户：',
    buttonText: '验证邮箱',
    expiry: '此链接将在 24 小时后失效。',
  },
};

export function renderVerificationEmail(data: VerificationEmailData): RenderedEmail {
  const loc = (data.locale && data.locale in copy ? data.locale : 'id') as SupportedLocale;
  const t = copy[loc];
  const name = data.recipientName ? `${t.greeting}, ${data.recipientName}` : t.greeting;

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
    <p>${t.instruction}</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.verificationUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">${t.buttonText}</a>
    </div>
    <p style="color: #64748b; font-size: 13px;">${t.expiry}</p>
  </div>
</body>
</html>`;

  const text = `${name}\n\n${t.instruction}\n\n${data.verificationUrl}\n\n${t.expiry}`;

  return { subject: t.subject, html, text };
}
