import type {
  AdminUser,
  Announcement,
  AppNotification,
  AttemptPlayer,
  AttemptResult,
  AuthResponse,
  BulkImportResult,
  Category,
  CourseDetail,
  CourseSummary,
  Enrollment,
  MeResponse,
  GradebookRow,
  PassageSummary,
  PublicStats,
  QuestionCategoryNode,
  QuestionDetail,
  QuestionSummary,
  QuestionTag,
  QuestionUpsertRequest,
  QuizDetailAdmin,
  QuizPageAdmin,
  QuizQuestionAdmin,
  QuizSummary,
  RoleAssignment,
  RoleOption,
  Section,
  StudentSummary,
  SystemAnalytics,
  TeacherPublic,
  ViolationResult,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  details?: Record<string, string>;

  constructor(status: number, message: string, details?: Record<string, string>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  _retried?: boolean;
}

// Bộ làm mới token, đăng ký bởi auth store (tránh vòng lặp phụ thuộc).
let tokenRefresher: (() => Promise<string | null>) | null = null;
export function configureTokenRefresher(fn: () => Promise<string | null>) {
  tokenRefresher = fn;
}

export async function apiFetch<T>(
  path: string,
  { method = "GET", body, token, _retried = false }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Không thể kết nối tới máy chủ. Backend đã chạy chưa?");
  }

  // Access token hết hạn → thử làm mới bằng refresh token, gọi lại 1 lần.
  if (res.status === 401 && token && !_retried && tokenRefresher) {
    const fresh = await tokenRefresher();
    if (fresh) {
      return apiFetch<T>(path, { method, body, token: fresh, _retried: true });
    }
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data && typeof data.message === "string" && data.message) ||
      `Yêu cầu thất bại (${res.status})`;
    throw new ApiError(res.status, message, data?.details);
  }
  return data as T;
}

// ---- Auth endpoints ----

export const authApi = {
  register: (username: string, email: string, password: string, fullName: string) =>
    apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: { username, email, password, fullName },
    }),

  login: (username: string, password: string) =>
    apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { username, password },
    }),

  refresh: (refreshToken: string) =>
    apiFetch<AuthResponse>("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    }),

  me: (token: string) => apiFetch<MeResponse>("/api/auth/me", { token }),
};

// ---- Catalog endpoints (public reads) ----

export const catalogApi = {
  categories: () => apiFetch<Category[]>("/api/catalog/categories"),

  courses: (categoryId?: number) =>
    apiFetch<CourseSummary[]>(
      categoryId ? `/api/catalog/courses?categoryId=${categoryId}` : "/api/catalog/courses",
    ),

  course: (id: number) => apiFetch<CourseDetail>(`/api/catalog/courses/${id}`),

  examTemplates: () =>
    apiFetch<{ id: number; code: string; name: string }[]>("/api/catalog/exam-templates"),

  teachers: () => apiFetch<TeacherPublic[]>("/api/catalog/teachers"),

  stats: () => apiFetch<PublicStats>("/api/catalog/stats"),
};

// ---- Public portal ----

export const portalApi = {
  submitInquiry: (req: {
    name: string;
    email?: string;
    phone?: string;
    message?: string;
  }) => apiFetch<unknown>("/api/inquiries", { method: "POST", body: req }),
};

// ---- Catalog management (staff, cần course:manage) ----

export const catalogAdminApi = {
  createCategory: (
    token: string,
    req: { name: string; slug?: string; description?: string; examTemplateCode?: string },
  ) =>
    apiFetch<Category>("/api/admin/catalog/categories", {
      method: "POST",
      body: req,
      token,
    }),

  updateCategory: (
    token: string,
    id: number,
    req: { name?: string; description?: string; examTemplateCode?: string },
  ) =>
    apiFetch<Category>(`/api/admin/catalog/categories/${id}`, {
      method: "PUT",
      body: req,
      token,
    }),

  deleteCategory: (token: string, id: number) =>
    apiFetch<void>(`/api/admin/catalog/categories/${id}`, { method: "DELETE", token }),

  courses: (token: string, categoryId?: number) =>
    apiFetch<CourseSummary[]>(
      categoryId
        ? `/api/admin/catalog/courses?categoryId=${categoryId}`
        : "/api/admin/catalog/courses",
      { token },
    ),

  createCourse: (
    token: string,
    req: {
      categoryId: number;
      title: string;
      shortname: string;
      summary?: string;
      coverImageUrl?: string;
      price?: number;
      status?: string;
    },
  ) =>
    apiFetch<CourseDetail>("/api/admin/catalog/courses", {
      method: "POST",
      body: req,
      token,
    }),

  updateCourse: (
    token: string,
    id: number,
    req: {
      categoryId?: number;
      title?: string;
      summary?: string;
      coverImageUrl?: string;
      price?: number;
      status?: string;
    },
  ) =>
    apiFetch<CourseDetail>(`/api/admin/catalog/courses/${id}`, {
      method: "PUT",
      body: req,
      token,
    }),

  deleteCourse: (token: string, id: number) =>
    apiFetch<void>(`/api/admin/catalog/courses/${id}`, { method: "DELETE", token }),

  createSection: (token: string, courseId: number, req: { title: string; sortOrder?: number }) =>
    apiFetch<Section>(`/api/admin/catalog/courses/${courseId}/sections`, {
      method: "POST",
      body: req,
      token,
    }),

  updateSection: (token: string, id: number, req: { title?: string; sortOrder?: number }) =>
    apiFetch<Section>(`/api/admin/catalog/sections/${id}`, {
      method: "PUT",
      body: req,
      token,
    }),

  deleteSection: (token: string, id: number) =>
    apiFetch<void>(`/api/admin/catalog/sections/${id}`, { method: "DELETE", token }),

  reorderSections: (token: string, courseId: number, sectionIds: number[]) =>
    apiFetch<void>(`/api/admin/catalog/courses/${courseId}/sections/reorder`, {
      method: "PUT",
      body: { sectionIds },
      token,
    }),
};

// ---- Quiz management (staff, cần course:manage) ----

export const quizAdminApi = {
  listBySection: (token: string, sectionId: number) =>
    apiFetch<QuizSummary[]>(`/api/admin/quizzes?sectionId=${sectionId}`, { token }),

  create: (
    token: string,
    req: {
      sectionId: number;
      title: string;
      intro?: string;
      timeLimitSeconds?: number;
      maxAttempts?: number;
      shuffleQuestions?: boolean;
      antiCheatEnabled?: boolean;
      maxViolations?: number;
      passMark?: number;
      status?: string;
    },
  ) =>
    apiFetch<QuizDetailAdmin>("/api/admin/quizzes", {
      method: "POST",
      body: req,
      token,
    }),

  detail: (token: string, id: number) =>
    apiFetch<QuizDetailAdmin>(`/api/admin/quizzes/${id}`, { token }),

  update: (
    token: string,
    id: number,
    req: Partial<{
      title: string;
      intro: string;
      timeLimitSeconds: number;
      maxAttempts: number;
      shuffleQuestions: boolean;
      antiCheatEnabled: boolean;
      maxViolations: number;
      passMark: number;
      status: string;
    }>,
  ) =>
    apiFetch<QuizDetailAdmin>(`/api/admin/quizzes/${id}`, {
      method: "PUT",
      body: req,
      token,
    }),

  remove: (token: string, id: number) =>
    apiFetch<void>(`/api/admin/quizzes/${id}`, { method: "DELETE", token }),

  importQuestions: (
    token: string,
    id: number,
    req: { questionIds: number[]; pageId?: number; mark?: number },
  ) =>
    apiFetch<QuizQuestionAdmin[]>(`/api/admin/quizzes/${id}/questions`, {
      method: "POST",
      body: req,
      token,
    }),

  removeQuestion: (token: string, quizQuestionId: number) =>
    apiFetch<void>(`/api/admin/quiz-questions/${quizQuestionId}`, {
      method: "DELETE",
      token,
    }),

  setPage: (
    token: string,
    id: number,
    req: { pageNumber: number; partLabel?: string; passageId?: number },
  ) =>
    apiFetch<QuizPageAdmin>(`/api/admin/quizzes/${id}/pages`, {
      method: "POST",
      body: req,
      token,
    }),

  deletePage: (token: string, pageId: number) =>
    apiFetch<void>(`/api/admin/quiz-pages/${pageId}`, {
      method: "DELETE",
      token,
    }),

  reorderQuizzes: (token: string, quizIds: number[]) =>
    apiFetch<void>(`/api/admin/quizzes/reorder`, {
      method: "PUT",
      body: { quizIds },
      token,
    }),

  reorderQuestions: (token: string, quizId: number, quizQuestionIds: number[]) =>
    apiFetch<void>(`/api/admin/quizzes/${quizId}/questions/reorder`, {
      method: "PUT",
      body: { quizQuestionIds },
      token,
    }),
};

// ---- Enrollment endpoints (authenticated) ----

export const enrollmentApi = {
  enroll: (courseId: number, token: string) =>
    apiFetch<Enrollment>("/api/enrollments", {
      method: "POST",
      body: { courseId },
      token,
    }),

  mine: (token: string) => apiFetch<Enrollment[]>("/api/enrollments/me", { token }),
};

// ---- Question bank (staff, cần question:manage) ----

export const questionBankApi = {
  categories: (token: string) =>
    apiFetch<QuestionCategoryNode[]>("/api/admin/question-bank/categories", { token }),

  questions: (token: string, categoryId?: number) =>
    apiFetch<QuestionSummary[]>(
      categoryId
        ? `/api/admin/question-bank/questions?categoryId=${categoryId}`
        : "/api/admin/question-bank/questions",
      { token },
    ),

  passages: (token: string) =>
    apiFetch<PassageSummary[]>("/api/admin/question-bank/passages", { token }),

  passage: (token: string, id: number) =>
    apiFetch<PassageSummary>(`/api/admin/question-bank/passages/${id}`, { token }),

  createPassage: (
    token: string,
    req: { title: string; kind?: string; content?: string; audioUrl?: string },
  ) =>
    apiFetch<PassageSummary>("/api/admin/question-bank/passages", {
      method: "POST",
      body: req,
      token,
    }),

  updatePassage: (
    token: string,
    id: number,
    req: { title?: string; kind?: string; content?: string; audioUrl?: string },
  ) =>
    apiFetch<PassageSummary>(`/api/admin/question-bank/passages/${id}`, {
      method: "PUT",
      body: req,
      token,
    }),

  deletePassage: (token: string, id: number) =>
    apiFetch<void>(`/api/admin/question-bank/passages/${id}`, { method: "DELETE", token }),

  createCategory: (
    token: string,
    req: { name: string; parentId?: number; description?: string },
  ) =>
    apiFetch<QuestionCategoryNode>("/api/admin/question-bank/categories", {
      method: "POST",
      body: req,
      token,
    }),

  tags: (token: string) =>
    apiFetch<QuestionTag[]>("/api/admin/question-bank/tags", { token }),

  createTag: (token: string, name: string) =>
    apiFetch<QuestionTag>("/api/admin/question-bank/tags", {
      method: "POST",
      body: { name },
      token,
    }),

  question: (token: string, id: number) =>
    apiFetch<QuestionDetail>(`/api/admin/question-bank/questions/${id}`, { token }),

  createQuestion: (token: string, req: QuestionUpsertRequest) =>
    apiFetch<QuestionDetail>("/api/admin/question-bank/questions", {
      method: "POST",
      body: req,
      token,
    }),

  updateQuestion: (token: string, id: number, req: QuestionUpsertRequest) =>
    apiFetch<QuestionDetail>(`/api/admin/question-bank/questions/${id}`, {
      method: "PUT",
      body: req,
      token,
    }),

  deleteQuestion: (token: string, id: number) =>
    apiFetch<void>(`/api/admin/question-bank/questions/${id}`, { method: "DELETE", token }),

  duplicateQuestion: (token: string, id: number) =>
    apiFetch<QuestionDetail>(`/api/admin/question-bank/questions/${id}/duplicate`, {
      method: "POST",
      token,
    }),
};

// ---- Quiz player ----

export const quizApi = {
  courseQuizzes: (courseId: number, token: string) =>
    apiFetch<QuizSummary[]>(`/api/courses/${courseId}/quizzes`, { token }),

  start: (quizId: number, token: string) =>
    apiFetch<AttemptPlayer>(`/api/quizzes/${quizId}/attempts`, {
      method: "POST",
      token,
    }),

  getAttempt: (attemptId: number, token: string) =>
    apiFetch<AttemptPlayer>(`/api/attempts/${attemptId}`, { token }),

  saveAnswer: (
    attemptId: number,
    quizQuestionId: number,
    response: unknown,
    token: string,
  ) =>
    apiFetch<void>(`/api/attempts/${attemptId}/answers`, {
      method: "PATCH",
      body: { quizQuestionId, response },
      token,
    }),

  logEvent: (attemptId: number, eventType: string, detail: string, token: string) =>
    apiFetch<ViolationResult>(`/api/attempts/${attemptId}/logs`, {
      method: "POST",
      body: { eventType, detail },
      token,
    }),

  submit: (attemptId: number, token: string) =>
    apiFetch<AttemptResult>(`/api/attempts/${attemptId}/submit`, {
      method: "POST",
      token,
    }),

  result: (attemptId: number, token: string) =>
    apiFetch<AttemptResult>(`/api/attempts/${attemptId}/result`, { token }),
};

// ---- Gradebook & reports ----

export const gradebookApi = {
  me: (token: string, courseId?: number) =>
    apiFetch<GradebookRow[]>(
      courseId ? `/api/gradebook/me?courseId=${courseId}` : "/api/gradebook/me",
      { token },
    ),

  forStudentAsAdmin: (token: string, userId: string, courseId?: number) =>
    apiFetch<GradebookRow[]>(
      courseId
        ? `/api/admin/students/${userId}/gradebook?courseId=${courseId}`
        : `/api/admin/students/${userId}/gradebook`,
      { token },
    ),

  forMyStudent: (token: string, studentId: string, courseId?: number) =>
    apiFetch<GradebookRow[]>(
      courseId
        ? `/api/teacher/roster/students/${studentId}/gradebook?courseId=${courseId}`
        : `/api/teacher/roster/students/${studentId}/gradebook`,
      { token },
    ),
};

export const reportApi = {
  analytics: (token: string) =>
    apiFetch<SystemAnalytics>("/api/admin/analytics", { token }),
};

// ---- Roster giáo viên–học sinh ----

export const rosterApi = {
  assign: (token: string, teacherId: string, studentIds: string[]) =>
    apiFetch<void>("/api/admin/roster/assign", {
      method: "POST",
      body: { teacherId, studentIds },
      token,
    }),

  unassign: (token: string, teacherId: string, studentId: string) =>
    apiFetch<void>(`/api/admin/roster/${teacherId}/${studentId}`, {
      method: "DELETE",
      token,
    }),

  forTeacher: (token: string, teacherId: string) =>
    apiFetch<StudentSummary[]>(`/api/admin/roster?teacherId=${teacherId}`, { token }),

  myStudents: (token: string) =>
    apiFetch<StudentSummary[]>("/api/teacher/roster/students", { token }),

  enrollStudent: (token: string, studentId: string, courseId: number) =>
    apiFetch<Enrollment>(`/api/teacher/roster/students/${studentId}/enroll`, {
      method: "POST",
      body: { courseId },
      token,
    }),
};

// ---- Admin tools ----

export const configApi = {
  getPublic: () => apiFetch<Record<string, string>>("/api/config/public"),
  getAll: (token: string) =>
    apiFetch<Record<string, string>>("/api/admin/config", { token }),
  update: (token: string, updates: Record<string, string>) =>
    apiFetch<Record<string, string>>("/api/admin/config", {
      method: "PUT",
      body: updates,
      token,
    }),
};

export const announcementApi = {
  active: (token: string) => apiFetch<Announcement[]>("/api/announcements", { token }),
  adminList: (token: string) =>
    apiFetch<Announcement[]>("/api/admin/announcements", { token }),
  create: (
    token: string,
    req: { title: string; body?: string; level?: string; active?: boolean },
  ) =>
    apiFetch<Announcement>("/api/admin/announcements", {
      method: "POST",
      body: req,
      token,
    }),
  remove: (token: string, id: number) =>
    apiFetch<void>(`/api/admin/announcements/${id}`, { method: "DELETE", token }),
};

export const notificationApi = {
  me: (token: string) => apiFetch<AppNotification[]>("/api/notifications/me", { token }),
  unreadCount: (token: string) =>
    apiFetch<{ count: number }>("/api/notifications/unread-count", { token }),
  markRead: (token: string, id: number) =>
    apiFetch<void>(`/api/notifications/${id}/read`, { method: "POST", token }),
  markAllRead: (token: string) =>
    apiFetch<void>("/api/notifications/read-all", { method: "POST", token }),
  broadcast: (token: string, req: { title: string; body?: string; link?: string }) =>
    apiFetch<{ recipients: number }>("/api/admin/notifications/broadcast", {
      method: "POST",
      body: req,
      token,
    }),
};

export const adminUserApi = {
  bulk: (
    token: string,
    users: { email: string; fullName: string; password?: string }[],
  ) =>
    apiFetch<BulkImportResult>("/api/admin/users/bulk", {
      method: "POST",
      body: { users },
      token,
    }),
};

// ---- Quản lý tài khoản & vai trò (cần user:manage / role:assign) ----

export const usersAdminApi = {
  list: (token: string, search?: string) =>
    apiFetch<AdminUser[]>(
      search ? `/api/admin/users?search=${encodeURIComponent(search)}` : "/api/admin/users",
      { token },
    ),

  roles: (token: string) => apiFetch<RoleOption[]>("/api/admin/roles", { token }),

  createUser: (
    token: string,
    req: {
      username: string;
      email: string;
      password: string;
      fullName: string;
      roleShortname?: string;
    },
  ) =>
    apiFetch<AdminUser>("/api/admin/users", {
      method: "POST",
      body: req,
      token,
    }),

  assignRole: (
    token: string,
    req: { userId: string; roleShortname: string; contextId?: number },
  ) =>
    apiFetch<RoleAssignment>("/api/admin/role-assignments", {
      method: "POST",
      body: req,
      token,
    }),

  revokeRole: (token: string, assignmentId: number) =>
    apiFetch<void>(`/api/admin/role-assignments/${assignmentId}`, {
      method: "DELETE",
      token,
    }),
};

// ---- Media upload (ảnh cho rich-text + ảnh đại diện khóa học) ----

async function uploadMedia(
  endpoint: string,
  failMessage: string,
  token: string,
  file: File,
  _retried = false,
): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ApiError(0, "Không thể kết nối tới máy chủ. Backend đã chạy chưa?");
  }

  if (res.status === 401 && !_retried && tokenRefresher) {
    const fresh = await tokenRefresher();
    if (fresh) return uploadMedia(endpoint, failMessage, fresh, file, true);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data && typeof data.message === "string" && data.message) || `${failMessage} (${res.status})`;
    throw new ApiError(res.status, message, data?.details);
  }
  return data;
}

export const mediaApi = {
  uploadImage: (token: string, file: File) =>
    uploadMedia("/api/admin/media/images", "Tải ảnh thất bại", token, file),
  uploadAudio: (token: string, file: File) =>
    uploadMedia("/api/admin/media/audio", "Tải audio thất bại", token, file),
};
