"use client";

import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import type { Editor, Extensions } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold,
  Columns3,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  PenSquare,
  Quote,
  Redo2,
  Rows3,
  SquareDashed,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError, mediaApi } from "@/lib/api";
import { ClozeBlankExtension, type ClozeBlankAttrs } from "@/components/richtext/ClozeBlankExtension";
import { ResizableImage } from "@/components/richtext/ResizableImageExtension";
import {
  CustomTable,
  CustomTableCell,
  CustomTableHeader,
  CustomTableRow,
} from "@/components/richtext/TableExtensions";

/** Danh sách extension nền dùng chung — soạn (ở đây) VÀ chuyển JSON→HTML lúc
 * lưu Cloze (`serializeClozeEditorState` trong `@/lib/clozeStemTransform`)
 * phải luôn khớp nhau, nên xuất thành 1 hằng số duy nhất thay vì khai báo 2 nơi. */
export const BASE_RICH_TEXT_EXTENSIONS: Extensions = [
  StarterKit,
  Underline,
  // "tableCell"/"tableHeader" cho phép nút căn trái/giữa/phải sẵn có hoạt
  // động luôn khi con trỏ đang ở trong 1 ô bảng — không cần nút riêng.
  TextAlign.configure({ types: ["heading", "paragraph", "image", "tableCell", "tableHeader"] }),
  Link.configure({ openOnClick: false }),
  ResizableImage,
  CustomTable,
  CustomTableRow,
  CustomTableCell,
  CustomTableHeader,
];

export function RichTextEditor({
  value,
  onChange,
  token,
  enableClozeBlanks,
  onEditorReady,
}: {
  value: string;
  onChange: (html: string) => void;
  token: string;
  /** Bật thanh công cụ + node "ô trống Cloze" nội tuyến — chỉ dùng cho ô stem của câu hỏi Cloze. */
  enableClozeBlanks?: boolean;
  /** Cho component cha lấy tham chiếu editor sống (vd để lấy JSON lúc lưu Cloze). */
  onEditorReady?: (editor: Editor | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [borderWidth, setBorderWidth] = useState("1");
  const [borderStyle, setBorderStyle] = useState("solid");
  const [borderColor, setBorderColor] = useState("#000000");
  // handlePaste/handleDrop chạy trong editorProps (đóng gói lúc dựng editor)
  // nên không chắc chắn tham chiếu được biến "token" mới nhất qua closure —
  // dùng ref để luôn đọc giá trị hiện tại, khỏi phải dựng lại editor mỗi khi
  // token đổi (vd sau khi refresh access token).
  const tokenRef = useRef(token);
  tokenRef.current = token;

  async function uploadAndInsertAt(view: import("@tiptap/pm/view").EditorView, file: File) {
    setError(null);
    setUploading(true);
    try {
      const { url } = await mediaApi.uploadImage(tokenRef.current, file);
      const node = view.state.schema.nodes.image.create({ src: url });
      const tr = view.state.tr.replaceSelectionWith(node);
      view.dispatch(tr);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  }

  const editor = useEditor({
    extensions: enableClozeBlanks
      ? [...BASE_RICH_TEXT_EXTENSIONS, ClozeBlankExtension]
      : BASE_RICH_TEXT_EXTENSIONS,
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[220px] px-3 py-2 focus:outline-none",
      },
      // Cho phép Ctrl+V dán trực tiếp ảnh chụp màn hình (clipboard) vào bài,
      // không bắt buộc phải lưu file rồi chọn qua nút "Ảnh" nữa. Chỉ bắt khi
      // clipboard THỰC SỰ có file ảnh — dán text bình thường vẫn đi qua xử lý
      // mặc định của TipTap như cũ.
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        const imageFile = files.find((f) => f.type.startsWith("image/"));
        if (!imageFile) return false;
        event.preventDefault();
        uploadAndInsertAt(view, imageFile);
        return true;
      },
    },
  });

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => onEditorReady?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  function insertClozeBlank() {
    const attrs: ClozeBlankAttrs = { answers: [], caseSensitive: false, subType: "TEXT", options: null };
    editor?.chain().focus().insertContent({ type: "clozeBlank", attrs }).run();
  }

  function setLink() {
    const url = window.prompt("URL liên kết:");
    if (url) editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function insertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  /** setCellAttribute (lệnh có sẵn của TipTap) chỉ áp cho Ô/vùng đang CHỌN —
   * "Áp viền cho cả bảng" cần duyệt tay mọi ô con của bảng đang chứa con
   * trỏ rồi gộp thành 1 transaction duy nhất (undo/redo vẫn 1 bước). */
  function applyBorderToWholeTable() {
    if (!editor) return;
    const { state } = editor;
    const $from = state.selection.$from;
    let tableNode: import("@tiptap/pm/model").Node | null = null;
    let tablePos = -1;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === "table") {
        tableNode = $from.node(d);
        tablePos = $from.before(d);
        break;
      }
    }
    if (!tableNode || tablePos < 0) return;
    const width = Number(borderWidth);
    if (!Number.isFinite(width) || width < 0) return;
    const tr = state.tr;
    tableNode.descendants((node, relPos) => {
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        tr.setNodeMarkup(tablePos + 1 + relPos, undefined, {
          ...node.attrs,
          borderWidth: width,
          borderStyle,
          borderColor,
        });
      }
      return true;
    });
    editor.view.dispatch(tr);
    editor.commands.focus();
  }

  /** Chỉ áp cho Ô (hoặc vùng ô) đang chọn — lệnh setCellAttribute có sẵn của
   * TipTap tự hiểu đúng phạm vi đang chọn (1 ô nếu con trỏ đứng yên, nhiều ô
   * nếu đang bôi đen 1 vùng), không cần tự duyệt cây như "cả bảng" ở trên. */
  function applyBorderToSelectedCells() {
    const width = Number(borderWidth);
    if (!Number.isFinite(width) || width < 0) return;
    editor
      ?.chain()
      .focus()
      .setCellAttribute("borderWidth", width)
      .setCellAttribute("borderStyle", borderStyle)
      .setCellAttribute("borderColor", borderColor)
      .run();
  }

  function openImagePicker() {
    fileInputRef.current?.click();
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const { url } = await mediaApi.uploadImage(token, file);
      editor?.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  }

  const inTable = editor.isActive("table");

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap gap-1 border-b border-border p-2">
        <ToolbarButton icon={Bold} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton icon={Italic} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarButton
          icon={UnderlineIcon}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton icon={Strikethrough} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
        <Divider />
        <ToolbarButton
          icon={Heading2}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          icon={Heading3}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <Divider />
        <ToolbarButton
          icon={List}
          label="Danh sách"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={ListOrdered}
          label="Danh sách"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          icon={Quote}
          label="Trích dẫn"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <Divider />
        <ToolbarButton
          icon={AlignLeft}
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        />
        <ToolbarButton
          icon={AlignCenter}
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        />
        <ToolbarButton
          icon={AlignRight}
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        />
        <Divider />
        <ToolbarButton icon={LinkIcon} label="Liên kết" active={editor.isActive("link")} onClick={setLink} />
        <ToolbarButton icon={TableIcon} label="Bảng" onClick={insertTable} />
        <ToolbarButton
          icon={ImagePlus}
          label={uploading ? "Đang tải…" : "Ảnh"}
          onClick={openImagePicker}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleImageSelected}
        />
        {enableClozeBlanks && (
          <>
            <Divider />
            <ToolbarButton icon={PenSquare} label="Chèn ô trống" onClick={insertClozeBlank} />
          </>
        )}
        <Divider />
        <ToolbarButton icon={Undo2} label="Hoàn tác" onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarButton icon={Redo2} label="Làm lại" onClick={() => editor.chain().focus().redo().run()} />
      </div>

      {inTable && (
        <div className="flex flex-wrap gap-1 border-b border-border bg-soft p-2">
          <ToolbarButton
            icon={Columns3}
            label="Thêm cột"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          />
          <ToolbarButton
            icon={Rows3}
            label="Thêm dòng"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          />
          <ToolbarButton
            icon={Trash2}
            label="Xóa cột"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          />
          <ToolbarButton
            icon={Trash2}
            label="Xóa dòng"
            onClick={() => editor.chain().focus().deleteRow().run()}
          />
          <ToolbarButton
            icon={Trash2}
            label="Xóa bảng"
            onClick={() => editor.chain().focus().deleteTable().run()}
          />
          <Divider />
          {/* Căn ngang (trái/giữa/phải) dùng chung 3 nút Align phía trên —
          "tableCell"/"tableHeader" đã nằm trong types của TextAlign nên tự
          áp cho đúng ô đang chọn, không cần lặp lại nút ở đây. */}
          <ToolbarButton
            icon={AlignVerticalJustifyStart}
            label="Căn trên (theo chiều dọc)"
            onClick={() => editor.chain().focus().setCellAttribute("verticalAlign", "top").run()}
          />
          <ToolbarButton
            icon={AlignVerticalJustifyCenter}
            label="Căn giữa (theo chiều dọc)"
            onClick={() => editor.chain().focus().setCellAttribute("verticalAlign", "middle").run()}
          />
          <ToolbarButton
            icon={AlignVerticalJustifyEnd}
            label="Căn dưới (theo chiều dọc)"
            onClick={() => editor.chain().focus().setCellAttribute("verticalAlign", "bottom").run()}
          />
          <Divider />
          <span className="flex items-center gap-1 text-xs text-muted">
            Viền:
            <input
              type="number"
              min={0}
              value={borderWidth}
              onChange={(e) => setBorderWidth(e.target.value)}
              title="Độ dày viền (px)"
              className="input w-12 px-1 py-0.5 text-xs"
            />
            px
            <select
              value={borderStyle}
              onChange={(e) => setBorderStyle(e.target.value)}
              title="Loại viền"
              className="input px-1 py-0.5 text-xs"
            >
              <option value="solid">Nét liền</option>
              <option value="dashed">Nét đứt</option>
              <option value="dotted">Chấm chấm</option>
              <option value="double">Viền đôi</option>
            </select>
            <input
              type="color"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              title="Màu viền"
              className="h-6 w-8 cursor-pointer rounded border border-border p-0.5"
            />
          </span>
          <ToolbarButton
            icon={SquareDashed}
            label="Áp viền cho ô đang chọn"
            onClick={applyBorderToSelectedCells}
          />
          <ToolbarButton
            icon={TableIcon}
            label="Áp viền cho cả bảng"
            onClick={applyBorderToWholeTable}
          />
          <Divider />
          {/* Căn CẢ KHỐI bảng trong khung soạn — khác với 3 nút Align ở
          thanh trên (chỉ canh CHỮ trong từng ô đang chọn). */}
          <ToolbarButton
            icon={AlignLeft}
            label="Căn bảng trái"
            onClick={() => editor.chain().focus().updateAttributes("table", { align: null }).run()}
          />
          <ToolbarButton
            icon={AlignCenter}
            label="Căn bảng giữa khung"
            onClick={() => editor.chain().focus().updateAttributes("table", { align: "center" }).run()}
          />
          <ToolbarButton
            icon={AlignRight}
            label="Căn bảng phải"
            onClick={() => editor.chain().focus().updateAttributes("table", { align: "right" }).run()}
          />
        </div>
      )}

      {error && <p className="border-b border-border px-3 py-1.5 text-xs text-red">{error}</p>}

      <EditorContent editor={editor} />
    </div>
  );
}

function Divider() {
  return <span className="mx-1 w-px self-stretch bg-border" />;
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold transition-colors ${
        active ? "bg-primary-soft text-primary" : "text-muted hover:bg-soft"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label && <span>{label}</span>}
    </button>
  );
}
