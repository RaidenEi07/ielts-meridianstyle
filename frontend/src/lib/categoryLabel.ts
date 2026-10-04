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

/**
 * id của danh mục `rootId` cùng mọi danh mục con cháu của nó. Câu hỏi thường chỉ gắn ở danh mục lá (vd "Mock 05 ›
 * Reading"), nên lọc đúng-1-danh-mục theo `categoryId` thì chọn danh mục cha ra 0 câu; lọc theo tập này thì chọn cha
 * hay lá đều ra đúng (giống cách backend lọc ở QuestionService.listQuestions).
 */
export function categorySubtreeIds(rootId: number, all: QuestionCategoryNode[]): Set<number> {
  const childrenOf = new Map<number, number[]>();
  for (const c of all) {
    if (c.parentId === null) continue;
    const list = childrenOf.get(c.parentId);
    if (list) list.push(c.id);
    else childrenOf.set(c.parentId, [c.id]);
  }
  const ids = new Set<number>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    for (const child of childrenOf.get(queue.pop()!) ?? []) {
      if (!ids.has(child)) {
        ids.add(child);
        queue.push(child);
      }
    }
  }
  return ids;
}
