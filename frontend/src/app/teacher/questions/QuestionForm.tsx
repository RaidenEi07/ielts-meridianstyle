"use client";

import { useState } from "react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ApiError, questionBankApi } from "@/lib/api";
import { TYPE_META } from "@/lib/questionTypes";
import type {
  PassageSummary,
  QuestionCategoryNode,
  QuestionClozeSubAnswer,
  QuestionDetail,
  QuestionDragItem,
  QuestionDragZone,
  QuestionMatchingPair,
  QuestionOption,
  QuestionTag,
} from "@/lib/types";
import { ClozeForm } from "./forms/ClozeForm";
import { DragDropMarkerForm } from "./forms/DragDropMarkerForm";
import { DragDropTextForm } from "./forms/DragDropTextForm";
import { EssayForm } from "./forms/EssayForm";
import { MatchingForm } from "./forms/MatchingForm";
import { OptionListForm } from "./forms/OptionListForm";
import { ShortAnswerForm } from "./forms/ShortAnswerForm";
import { CategoryForm } from "./CategoryForm";
import { QuestionTypeGuide } from "./QuestionTypeGuide";
import { QuestionTypePicker } from "./QuestionTypePicker";

function splitCsv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function withSortOrder<T extends { sortOrder: number }>(arr: T[]): T[] {
  return arr.map((item, idx) => ({ ...item, sortOrder: idx }));
}

function splitPassageParagraphs(html: string | null | undefined): string[] {
  if (!html) return [];
  const matches = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) ?? [];
  return matches.map((p) => p.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

export function QuestionForm({
  mode,
  initial,
  categories,
  passages,
  tags,
  token,
  onSaved,
  onCategoriesChanged,
}: {
  mode: "create" | "edit";
  initial?: QuestionDetail;
  categories: QuestionCategoryNode[];
  passages: PassageSummary[];
  tags: QuestionTag[];
  token: string;
  onSaved: (q: QuestionDetail) => void;
  onCategoriesChanged: () => void;
}) {
  const [step, setStep] = useState<"pick" | "form">(mode === "edit" ? "form" : "pick");
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState<number | "">(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [type, setType] = useState(initial?.type ?? "MULTIPLE_CHOICE");
  const [stem, setStem] = useState(initial?.stem ?? "");
  const [passageId, setPassageId] = useState<number | "">(initial?.passageId ?? "");
  const [answerParagraphIndex, setAnswerParagraphIndex] = useState<number | "">(
    initial?.answerParagraphIndex ?? "",
  );
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [defaultMark, setDefaultMark] = useState(String(initial?.defaultMark ?? "1"));
  const [tagsSelected, setTagsSelected] = useState<string[]>(initial?.tags ?? []);
  const [newTagsRaw, setNewTagsRaw] = useState("");

  const initSettings = initial?.settings as Record<string, unknown> | null | undefined;

  const [options, setOptions] = useState<QuestionOption[]>(initial?.options ?? []);
  const [matchingPairs, setMatchingPairs] = useState<QuestionMatchingPair[]>(
    initial?.matchingPairs ?? [],
  );
  const [shortAnswerAccepted, setShortAnswerAccepted] = useState(
    Array.isArray(initSettings?.acceptedAnswers)
      ? (initSettings!.acceptedAnswers as string[]).join(", ")
      : "",
  );
  const [caseSensitive, setCaseSensitive] = useState(Boolean(initSettings?.caseSensitive));
  const [essayWordLimit, setEssayWordLimit] = useState(
    initSettings?.wordLimit != null ? String(initSettings.wordLimit) : "",
  );
  const [essayRubric, setEssayRubric] = useState<string[]>(
    Array.isArray(initSettings?.rubric) ? (initSettings!.rubric as string[]) : [],
  );
  const [dragDropTemplate, setDragDropTemplate] = useState(
    typeof initSettings?.template === "string" ? initSettings.template : "",
  );
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(
    typeof initSettings?.backgroundImageUrl === "string" ? initSettings.backgroundImageUrl : "",
  );
  const [dragItems, setDragItems] = useState<QuestionDragItem[]>(initial?.dragItems ?? []);
  const [dragZones, setDragZones] = useState<QuestionDragZone[]>(initial?.dragZones ?? []);
  const [clozeSubAnswers, setClozeSubAnswers] = useState<QuestionClozeSubAnswer[]>(
    initial?.clozeSubAnswers ?? [],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildSettings(): unknown {
    switch (type) {
      case "SHORT_ANSWER":
        return { acceptedAnswers: splitCsv(shortAnswerAccepted), caseSensitive };
      case "ESSAY":
        return {
          wordLimit: essayWordLimit ? Number(essayWordLimit) : undefined,
          rubric: essayRubric.filter((r) => r.trim().length > 0),
        };
      case "DRAG_DROP_TEXT":
        return { template: dragDropTemplate };
      case "DRAG_DROP_MARKER":
        return { backgroundImageUrl };
      default:
        return undefined;
    }
  }

  const selectedPassage = passages.find((p) => p.id === passageId);
  const passageParagraphs = splitPassageParagraphs(selectedPassage?.content);

  function toggleTag(name: string) {
    setTagsSelected((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const req = {
        categoryId: Number(categoryId),
        type,
        name,
        stem: stem || undefined,
        passageId: passageId ? Number(passageId) : undefined,
        answerParagraphIndex: passageId && answerParagraphIndex ? Number(answerParagraphIndex) : undefined,
        explanation: explanation || undefined,
        defaultMark: defaultMark ? Number(defaultMark) : undefined,
        settings: buildSettings(),
        tags: [...tagsSelected, ...splitCsv(newTagsRaw)],
        options:
          type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE_NOT_GIVEN"
            ? withSortOrder(options)
            : undefined,
        matchingPairs: type === "MATCHING" ? withSortOrder(matchingPairs) : undefined,
        dragItems:
          type === "DRAG_DROP_TEXT" || type === "DRAG_DROP_MARKER"
            ? withSortOrder(dragItems)
            : undefined,
        dragZones: type === "DRAG_DROP_MARKER" ? withSortOrder(dragZones) : undefined,
        clozeSubAnswers: type === "CLOZE" ? withSortOrder(clozeSubAnswers) : undefined,
      };
      const saved =
        mode === "create"
          ? await questionBankApi.createQuestion(token, req)
          : await questionBankApi.updateQuestion(token, initial!.id, req);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu câu hỏi thất bại");
    } finally {
      setSaving(false);
    }
  }

  if (step === "pick") {
    return (
      <QuestionTypePicker
        onSelect={(t) => {
          setType(t);
          setStep("form");
        }}
      />
    );
  }

  const meta = TYPE_META[type] ?? { label: type, cls: "bg-soft text-muted" };

  return (
    <div className="grid animate-fade-slide-in gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={save} className="space-y-6">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.cls}`}>
            {meta.label}
          </span>
          {mode === "create" && (
            <button
              type="button"
              onClick={() => setStep("pick")}
              className="text-sm font-semibold text-accent"
            >
              ← Đổi loại câu hỏi
            </button>
          )}
          {mode === "edit" && (
            <span className="text-xs text-muted">Không thể đổi loại sau khi đã tạo câu hỏi.</span>
          )}
        </div>

        <section className="rounded-card border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">Thông tin chung</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted">Tên câu hỏi</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
            </label>

            <div className="block">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Danh mục</span>
                {!creatingCategory && (
                  <button
                    type="button"
                    onClick={() => setCreatingCategory(true)}
                    className="text-xs font-semibold text-accent"
                  >
                    + Tạo danh mục mới
                  </button>
                )}
              </div>
              <SearchableSelect
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Tìm danh mục…"
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.parentId !== null ? `— ${c.name}` : c.name,
                }))}
              />
              {creatingCategory && (
                <div className="mt-2">
                  <CategoryForm
                    token={token}
                    categories={categories}
                    onCancel={() => setCreatingCategory(false)}
                    onSaved={(c) => {
                      setCategoryId(c.id);
                      setCreatingCategory(false);
                      onCategoriesChanged();
                    }}
                  />
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Passage (tùy chọn)</span>
              <SearchableSelect
                value={passageId}
                onChange={(v) => {
                  setPassageId(v);
                  setAnswerParagraphIndex("");
                }}
                allowClear
                clearLabel="— Không gắn passage —"
                placeholder="Tìm passage…"
                options={passages.map((p) => ({ value: p.id, label: `${p.title} (${p.kind})` }))}
              />
            </label>

            {passageId && passageParagraphs.length > 0 && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Đoạn chứa đáp án (tùy chọn)
                </span>
                <SearchableSelect
                  value={answerParagraphIndex}
                  onChange={setAnswerParagraphIndex}
                  allowClear
                  clearLabel="— Không chỉ định —"
                  placeholder="Chọn đoạn…"
                  options={passageParagraphs.map((text, idx) => ({
                    value: idx + 1,
                    label: `Đoạn ${idx + 1}: ${text.slice(0, 60)}${text.length > 60 ? "…" : ""}`,
                  }))}
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Điểm mặc định</span>
              <input
                type="number"
                step="0.1"
                value={defaultMark}
                onChange={(e) => setDefaultMark(e.target.value)}
                className="input"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted">
                Nội dung câu hỏi (stem)
                {type === "CLOZE" && " — dùng {1}, {2}… đánh dấu chỗ trống"}
              </span>
              <RichTextEditor value={stem} onChange={setStem} token={token} />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted">
                Giải thích đáp án (tùy chọn, hiển thị cho học sinh sau khi nộp bài)
              </span>
              <RichTextEditor value={explanation} onChange={setExplanation} token={token} />
            </label>

            <div className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted">Tag</span>
              <div className="mb-2 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <label
                    key={t.id}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                      tagsSelected.includes(t.name)
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border text-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={tagsSelected.includes(t.name)}
                      onChange={() => toggleTag(t.name)}
                      className="hidden"
                    />
                    {t.name}
                  </label>
                ))}
              </div>
              <input
                value={newTagsRaw}
                onChange={(e) => setNewTagsRaw(e.target.value)}
                placeholder="Tag mới, cách nhau bởi dấu phẩy"
                className="input text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-card border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">Nội dung theo loại câu hỏi</h2>
          {(type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE_NOT_GIVEN") && (
            <OptionListForm value={options} onChange={setOptions} />
          )}
          {type === "MATCHING" && <MatchingForm value={matchingPairs} onChange={setMatchingPairs} />}
          {type === "SHORT_ANSWER" && (
            <ShortAnswerForm
              acceptedAnswers={shortAnswerAccepted}
              onAcceptedAnswersChange={setShortAnswerAccepted}
              caseSensitive={caseSensitive}
              onCaseSensitiveChange={setCaseSensitive}
            />
          )}
          {type === "ESSAY" && (
            <EssayForm
              wordLimit={essayWordLimit}
              onWordLimitChange={setEssayWordLimit}
              rubric={essayRubric}
              onRubricChange={setEssayRubric}
            />
          )}
          {type === "DRAG_DROP_TEXT" && (
            <DragDropTextForm
              template={dragDropTemplate}
              onTemplateChange={setDragDropTemplate}
              items={dragItems}
              onItemsChange={setDragItems}
            />
          )}
          {type === "DRAG_DROP_MARKER" && (
            <DragDropMarkerForm
              backgroundImageUrl={backgroundImageUrl}
              onBackgroundImageUrlChange={setBackgroundImageUrl}
              items={dragItems}
              onItemsChange={setDragItems}
              zones={dragZones}
              onZonesChange={setDragZones}
            />
          )}
          {type === "CLOZE" && <ClozeForm value={clozeSubAnswers} onChange={setClozeSubAnswers} />}
        </section>

        {error && <p className="text-sm text-red">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Đang lưu…" : mode === "create" ? "Tạo câu hỏi" : "Lưu thay đổi"}
          </button>
        </div>
      </form>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <QuestionTypeGuide type={type} />
      </aside>
    </div>
  );
}
