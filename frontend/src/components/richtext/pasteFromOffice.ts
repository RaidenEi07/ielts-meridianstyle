/** Dán bảng từ Word/Excel: 2 phần mềm này thường KHÔNG ghi border/màu/canh
 * lề trực tiếp vào thuộc tính style="" của từng ô mà gom vào 1 khối <style>
 * ở đầu đoạn HTML rồi gán class cho từng ô (class=xl65 chẳng hạn) — cách
 * ProseMirror parse HTML dán vào chỉ đọc style TRỰC TIẾP trên phần tử
 * (el.style.borderWidth...) nên toàn bộ định dạng qua class bị "rơi rớt",
 * kết quả là bảng dán vào trông trơn trụi dù bản gốc có viền/màu đầy đủ.
 * Hàm này chạy TRƯỚC khi ProseMirror parse: đọc khối <style>, "khắc" ngược
 * style của từng class thẳng vào style="" của phần tử tương ứng — để mọi
 * parseHTML đọc el.style.* (viền bảng, canh chữ...) đều thấy đúng dữ liệu.
 * Chỉ xử lý selector class đơn giản (".xl65 { ... }") — đúng dạng Word/Excel
 * hay xuất ra, không cố xử lý CSS lồng nhau/media query. Lỗi bất kỳ đều trả
 * về HTML gốc, không bao giờ làm dán bị hỏng thêm so với hiện tại. */
export function inlineStylesFromStyleTags(html: string): string {
  if (!html.includes("<style")) return html;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const styleEls = Array.from(doc.querySelectorAll("style"));
    if (styleEls.length === 0) return html;

    const classRules: Record<string, string> = {};
    for (const styleEl of styleEls) {
      const css = styleEl.textContent || "";
      const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
      let match: RegExpExecArray | null;
      while ((match = ruleRe.exec(css))) {
        const decl = match[2].trim().replace(/\/\*[\s\S]*?\*\//g, "").trim();
        if (!decl) continue;
        const selectors = match[1].split(",").map((s) => s.trim());
        for (const sel of selectors) {
          const clsMatch = sel.match(/^\.([\w-]+)$/);
          if (!clsMatch) continue;
          const cls = clsMatch[1];
          classRules[cls] = classRules[cls] ? `${classRules[cls]}; ${decl}` : decl;
        }
      }
    }
    if (Object.keys(classRules).length === 0) return html;

    // Style trực tiếp trên phần tử (nếu có) ưu tiên cao hơn style suy ra từ
    // class — đặt SAU trong chuỗi để property trùng tên bị ghi đè đúng thứ tự.
    doc.querySelectorAll("[class]").forEach((el) => {
      const classes = el.getAttribute("class")?.split(/\s+/) ?? [];
      const extra = classes
        .map((c) => classRules[c])
        .filter(Boolean)
        .join("; ");
      if (!extra) return;
      const existing = el.getAttribute("style") || "";
      el.setAttribute("style", existing ? `${extra}; ${existing}` : extra);
    });
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}
