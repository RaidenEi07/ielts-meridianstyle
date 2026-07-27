import type { QuestionCategoryNode } from "./types";

/**
 * Nhãn 1 dòng cho category trong dropdown phẳng (SearchableSelect) — khác với
 * CategoryTree (cây thật, không cần thêm gì vì đã lồng cấp bằng thụt đầu dòng).
 * Category lá thường trùng tên giữa nhiều Mock (vd "Reading" lặp lại ở mọi Mock
 * test), nên phải kèm tên cha trực tiếp để phân biệt; category ở lát 1 (con
 * của gốc) thường đã là tên duy nhất (vd "Mock 20") nên không cần thêm.
 */
export function categoryOptionLabel(c: QuestionCategoryNode, all: QuestionCategoryNode[]): string {
  if (c.parentId === null) return c.name;
  const parent = all.find((p) => p.id === c.parentId);
  if (parent && parent.parentId !== null) {
    return `— ${c.name} (${parent.name})`;
  }
  return `— ${c.name}`;
}
