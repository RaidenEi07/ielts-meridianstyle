"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ApiError, questionBankApi } from "@/lib/api";
import type { PassageSummary, QuestionCategoryNode, QuestionDetail, QuestionTag } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { QuestionForm } from "../QuestionForm";

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const questionId = Number(params.id);
  const router = useRouter();
  const { accessToken, hydrated, loadMe } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const token = accessToken ?? "";

  const [categories, setCategories] = useState<QuestionCategoryNode[]>([]);
  const [passages, setPassages] = useState<PassageSummary[]>([]);
  const [tags, setTags] = useState<QuestionTag[]>([]);
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    loadMe()
      .then(() => setAllowed(useAuthStore.getState().systemCapabilities.includes("question:manage")))
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, accessToken]);

  const refreshCategories = () => questionBankApi.categories(token).then(setCategories).catch(() => {});

  useEffect(() => {
    if (!allowed) return;
    refreshCategories();
    questionBankApi.passages(token).then(setPassages).catch(() => {});
    questionBankApi.tags(token).then(setTags).catch(() => {});
    questionBankApi
      .question(token, questionId)
      .then(setDetail)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Không tải được câu hỏi"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, questionId]);

  if (!hydrated || !ready) {
    return <div className="grid min-h-screen place-items-center text-muted">Đang tải…</div>;
  }

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Không có quyền truy cập</p>
          <p className="mt-1 text-sm text-muted">
            Trang này cần quyền <code>question:manage</code>.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-accent">
            ← Về bảng điều khiển
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader title="Sửa câu hỏi" backHref="/teacher/questions" backLabel="Ngân hàng câu hỏi" />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {error && <p className="text-sm text-red">{error}</p>}
        {!detail ? (
          !error && <p className="text-muted">Đang tải…</p>
        ) : (
          <QuestionForm
            mode="edit"
            initial={detail}
            categories={categories}
            passages={passages}
            tags={tags}
            token={token}
            onSaved={() => router.push("/teacher/questions")}
            onCategoriesChanged={refreshCategories}
          />
        )}
      </main>
    </div>
  );
}
