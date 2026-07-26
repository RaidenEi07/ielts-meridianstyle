"use client";

import { ChevronRight, Download } from "lucide-react";
import { useState } from "react";
import type { QuestionCategoryNode } from "@/lib/types";

interface TreeNode extends QuestionCategoryNode {
  children: TreeNode[];
}

function buildTree(flat: QuestionCategoryNode[]): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  flat.forEach((c) => byId.set(c.id, { ...c, children: [] }));
  const roots: TreeNode[] = [];
  byId.forEach((node) => {
    const parent = node.parentId !== null ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

/**
 * Cây danh mục ngân hàng câu hỏi — dùng chung giữa /teacher/questions và
 * /teacher/kids-questions. Danh mục có con (vd Mock test) chỉ để mở/thu gọn,
 * không lọc câu hỏi (vốn không nằm trực tiếp trong đó); chỉ danh mục lá mới
 * chọn được để lọc bảng câu hỏi.
 */
export function CategoryTree({
  categories,
  activeCat,
  onSelect,
  onExport,
}: {
  categories: QuestionCategoryNode[];
  activeCat: number | null;
  onSelect: (id: number) => void;
  onExport?: (id: number, name: string) => void;
}) {
  const tree = buildTree(categories);
  return (
    <ul className="space-y-0.5">
      {tree.map((node) => (
        <TreeRow
          key={node.id}
          node={node}
          depth={0}
          activeCat={activeCat}
          onSelect={onSelect}
          onExport={onExport}
        />
      ))}
    </ul>
  );
}

function TreeRow({
  node,
  depth,
  activeCat,
  onSelect,
  onExport,
}: {
  node: TreeNode;
  depth: number;
  activeCat: number | null;
  onSelect: (id: number) => void;
  onExport?: (id: number, name: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className="group flex items-center">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded p-1 text-faint hover:text-text"
            aria-label={open ? "Thu gọn" : "Mở rộng"}
          >
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="w-[22px] shrink-0" />
        )}
        <button
          type="button"
          onClick={hasChildren ? () => setOpen((v) => !v) : () => onSelect(node.id)}
          style={{ paddingLeft: depth * 12 }}
          className={`flex-1 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
            activeCat === node.id
              ? "bg-primary-soft font-semibold text-primary"
              : "text-text hover:bg-soft"
          }`}
        >
          {node.name}
        </button>
        {onExport && !hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExport(node.id, node.name);
            }}
            title="Xuất câu hỏi của danh mục này ra file .zip"
            className="shrink-0 rounded-lg p-1.5 text-faint opacity-0 transition-opacity hover:bg-soft hover:text-primary group-hover:opacity-100"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {hasChildren && open && (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              activeCat={activeCat}
              onSelect={onSelect}
              onExport={onExport}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
