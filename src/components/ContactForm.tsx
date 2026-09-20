"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { companyContact, contactApiUrl } from "@/lib/contact";

const initialStatus = "Phản hồi trong giờ làm việc. Bạn chỉ cần khoảng 30 giây để gửi thông tin.";
const backendMissingStatus = "Form chưa được cấu hình máy chủ tiếp nhận. Vui lòng gọi hotline hoặc nhắn Zalo để gửi yêu cầu ngay.";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(initialStatus);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!contactApiUrl) {
      setSubmitted(false);
      setStatus(backendMissingStatus);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setSubmitting(true);
    setSubmitted(false);
    setStatus("Đang gửi yêu cầu...");

    try {
      const response = await fetch(contactApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") ?? "").trim(),
          phone: String(formData.get("phone") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim(),
          subject: String(formData.get("subject") ?? "").trim(),
          message: String(formData.get("message") ?? "").trim(),
          consent: formData.get("consent") === "on",
          website: String(formData.get("website") ?? "").trim(),
          sourceUrl: window.location.href,
        }),
      });

      if (!response.ok) throw new Error("Contact submission failed");
      form.reset();
      setSubmitted(true);
      setStatus("Đã nhận yêu cầu. Workman sẽ liên hệ lại trong giờ làm việc.");
    } catch {
      setSubmitted(false);
      setStatus("Chưa thể gửi yêu cầu lúc này. Vui lòng thử lại hoặc gọi hotline/Zalo.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="contact-form-shell">
    <div className="contact-form-heading">
      <span className="eyebrow">GỬI YÊU CẦU</span>
      <h2 className="contact-title">TƯ VẤN ĐÚNG NHU CẦU</h2>
      <p>Để lại thông tin và nội dung bạn cần hỗ trợ. Đội ngũ Workman sẽ tư vấn sản phẩm, báo giá hoặc chính sách phân phối phù hợp.</p>
    </div>
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="contact-form-grid">
        <label className="contact-field">
          <span>Họ và tên <b aria-hidden="true">*</b></span>
          <input name="fullName" type="text" autoComplete="name" placeholder="Nguyễn Văn A" maxLength={120} required />
        </label>
        <label className="contact-field">
          <span>Số điện thoại <b aria-hidden="true">*</b></span>
          <input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0978 390 339" pattern="(?:\+84|0)[0-9 .-]{8,12}" maxLength={32} title="Nhập số điện thoại Việt Nam, ví dụ 0978 390 339" required />
        </label>
        <label className="contact-field">
          <span>Email <em>(không bắt buộc)</em></span>
          <input name="email" type="email" autoComplete="email" placeholder="ten@congty.vn" maxLength={160} />
        </label>
        <label className="contact-field">
          <span>Bạn cần hỗ trợ về <b aria-hidden="true">*</b></span>
          <select name="subject" defaultValue="" required>
            <option value="" disabled>Chọn một nhu cầu</option>
            <option value="product">Tư vấn sản phẩm</option>
            <option value="quote">Báo giá / đơn hàng</option>
            <option value="distribution">Trở thành nhà phân phối</option>
            <option value="other">Nội dung khác</option>
          </select>
        </label>
        <label className="contact-field contact-field-full">
          <span>Nội dung cần hỗ trợ <b aria-hidden="true">*</b></span>
          <textarea name="message" rows={5} placeholder="Ví dụ: Tôi cần tư vấn máy khoan dùng pin 20V cho công việc..." minLength={10} maxLength={4000} required />
        </label>
      </div>
      <label className="contact-honeypot" aria-hidden="true">
        <span>Website</span>
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="contact-consent">
        <input name="consent" type="checkbox" required />
        <span>Tôi đồng ý để Workman sử dụng thông tin trên nhằm phản hồi yêu cầu này.</span>
      </label>
      <div className="contact-form-actions">
        <button className="button-primary" type="submit" disabled={submitting}>{submitting ? "ĐANG GỬI..." : "GỬI YÊU CẦU"}</button>
        <p className={submitted ? "contact-form-status" : "contact-form-note"} role="status" aria-live="polite">{status}</p>
      </div>
    </form>
    <div className="contact-form-fallback">
      <span>Muốn được hỗ trợ ngay?</span>
      <a href={companyContact.hotlineHref}>Gọi {companyContact.hotline}</a>
      <a href={companyContact.zaloHref} target="_blank" rel="noreferrer">Nhắn Zalo</a>
    </div>
  </div>;
}
