import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Breadcrumb } from "@/components/Breadcrumb";
import { companyContact } from "@/lib/contact";

const title = "Chính sách bảo mật";
const description = "Cách Workman thu thập, sử dụng và bảo vệ thông tin bạn gửi qua website WOKIN TOOLS Việt Nam.";
const canonical = "/chinh-sach-bao-mat/";

export const metadata: Metadata = pageMetadata({ title: title, description, path: canonical });

// Describes only what the site actually does today: the contact form, anti-spam checks and no tracking.
export default function PrivacyPage() {
  return <main className="page-shell">
    <Breadcrumb items={[{ label: title }]} />
    <article className="container-wokin section content-section prose-content">
      <h1 className="page-title">{title}</h1>
      <p>Website WOKIN TOOLS Việt Nam do {companyContact.legalName} (“Workman”, mã số thuế {companyContact.taxCode}) vận hành. Chính sách này giải thích những thông tin chúng tôi nhận được khi bạn sử dụng website và cách chúng tôi xử lý các thông tin đó.</p>
      <h2>1. Thông tin chúng tôi thu thập</h2>
      <p>Website chỉ thu thập thông tin cá nhân khi bạn chủ động gửi form tư vấn tại trang Liên hệ, gồm: họ và tên, số điện thoại, email (không bắt buộc), nhu cầu cần hỗ trợ, nội dung tin nhắn, trang bạn gửi form và thời điểm gửi. Để chống spam, máy chủ tiếp nhận có sử dụng địa chỉ IP của yêu cầu nhằm giới hạn số lần gửi.</p>
      <p>Việc xem sản phẩm, danh mục và tìm kiếm trên website không yêu cầu đăng nhập và không yêu cầu cung cấp thông tin cá nhân.</p>
      <h2>2. Mục đích sử dụng</h2>
      <p>Thông tin bạn gửi chỉ được dùng để liên hệ lại, tư vấn sản phẩm, báo giá hoặc trao đổi về chính sách phân phối theo đúng yêu cầu của bạn. Chúng tôi không bán hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba.</p>
      <h2>3. Sự đồng ý</h2>
      <p>Form liên hệ chỉ được gửi khi bạn đánh dấu đồng ý cho Workman sử dụng thông tin nhằm phản hồi yêu cầu. Bạn có thể rút lại sự đồng ý bất kỳ lúc nào bằng cách liên hệ với chúng tôi theo thông tin ở mục 6.</p>
      <h2>4. Lưu trữ và bảo vệ</h2>
      <p>Yêu cầu liên hệ được lưu trong hệ thống quản trị nội bộ của Workman. Chỉ tài khoản quản trị được phân quyền mới xem được thông tin khách hàng. Chúng tôi lưu thông tin trong thời gian cần thiết để xử lý yêu cầu hoặc theo thời hạn pháp luật quy định.</p>
      <h2>5. Quyền của bạn</h2>
      <p>Bạn có quyền yêu cầu xem, chỉnh sửa hoặc xoá thông tin cá nhân đã gửi, cũng như phản đối việc xử lý thông tin theo quy định của pháp luật Việt Nam về bảo vệ dữ liệu cá nhân.</p>
      <h2>6. Liên hệ</h2>
      <p>{companyContact.legalName}<br />Địa chỉ: {companyContact.address}<br />Hotline/Zalo: <a href={companyContact.hotlineHref}>{companyContact.hotline}</a></p>
      <p>Chính sách có thể được cập nhật khi website thay đổi cách xử lý thông tin; phiên bản trên trang này là phiên bản đang áp dụng.</p>
    </article>
  </main>;
}
