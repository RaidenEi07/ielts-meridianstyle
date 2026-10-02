import { useState } from "react";

/**
 * Ảnh admin tải lên có thể bị xóa hoặc không tải được. Trả về `broken` để giao diện rơi về hình mặc định, và
 * `imgProps` để rải vào thẻ <img>. Đổi sang URL khác thì thử lại (`broken` tự về false).
 */
export function useBrokenImage(url: string) {
  const [failedUrl, setFailedUrl] = useState("");
  const markBroken = () => setFailedUrl(url);

  return {
    broken: url !== "" && failedUrl === url,
    imgProps: {
      onError: markBroken,
      // Ảnh do server dựng có thể đã tải hỏng TRƯỚC khi React gắn onError (lúc hydrate) nên sự kiện lỗi bị bỏ
      // lỡ: kiểm tra lại trạng thái ngay khi phần tử được gắn. SVG bỏ qua vì có thể báo naturalWidth = 0 dù
      // vẫn hiển thị bình thường (thiếu width/height).
      ref: (el: HTMLImageElement | null) => {
        if (el && el.complete && el.naturalWidth === 0 && !/\.svg$/i.test(url)) markBroken();
      },
    },
  };
}
