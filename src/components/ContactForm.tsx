"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { companyContact } from "@/lib/contact";

const initialStatus = "Phản hồi trong giờ làm việc. Bạn chỉ cần khoảng 30 giây để gửi thông tin.";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState(initialStatus);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setStatus("Thông tin đã được kiểm tra. Form đang chờ kết nối máy chủ tiếp nhận; vui lòng gọi hotline hoặc nhắn Zalo để gửi yêu cầu ngay.");
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
          <input name="fullName" type="text" autoComplete="name" placeholder="Nguyễn Văn A" required />
        </label>
        <label className="contact-field">
          <span>Số điện thoại <b aria-hidden="true">*</b></span>
          <input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0978 390 339" pattern="(?:\\+84|0)[0-9 .-]{8,12}" title="Nhập số điện thoại Việt Nam, ví dụ 0978 390 339" required />
        </label>
        <label className="contact-field">
          <span>Email <em>(không bắt buộc)</em></span>
          <input name="email" type="email" autoComplete="email" placeholder="ten@congty.vn" />
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
          <textarea name="message" rows={5} placeholder="Ví dụ: Tôi cần tư vấn máy khoan dùng pin 20V cho công việc..." minLength={10} required />
        </label>
      </div>
      <label className="contact-consent">
        <input name="consent" type="checkbox" required />
        <span>Tôi đồng ý để Workman sử dụng thông tin trên nhằm phản hồi yêu cầu này.</span>
      </label>
      <div className="contact-form-actions">
        <button className="button-primary" type="submit">Kiểm tra yêu cầu</button>
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
