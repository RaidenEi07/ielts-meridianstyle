"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Columns3,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Rows3,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { ApiError, mediaApi } from "@/lib/api";

export function RichTextEditor({
  value,
  onChange,
  token,
}: {
  value: string;
  onChange: (html: string) => void;
  token: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Image,
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[220px] px-3 py-2 focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  function setLink() {
    const url = window.prompt("URL liên kết:");
    if (url) editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function insertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
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
