export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
}

export interface RoleAssignment {
  id: number;
  roleShortname: string;
  roleName: string;
  contextType: "SYSTEM" | "CATEGORY" | "COURSE" | "QUIZ";
  contextId: number;
  instanceId: number | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface MeResponse {
  user: User;
  roleAssignments: RoleAssignment[];
  systemCapabilities: string[];
}

// ---- Catalog (Giai đoạn 2) ----

export interface ExamTemplateSummary {
  id: number;
  code: string;
  name: string;
}

export type CourseAudienceGroup = "TRE_EM" | "TIEU_HOC" | "IELTS";

export type Audience = "IELTS" | "KIDS";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  examTemplate: ExamTemplateSummary | null;
  contextId: number | null;
  audienceGroup: CourseAudienceGroup;
}

export interface CourseSummary {
  id: number;
  title: string;
  shortname: string;
  summary: string | null;
  status: string;
  coverImageUrl: string | null;
  price: number;
  categoryId: number;
  categoryName: string;
  enrolledCount: number;
}

export interface Section {
  id: number;
  title: string;
  sortOrder: number;
  videoUrl: string | null;
  subtitleUrl: string | null;
}

export interface CourseDetail extends CourseSummary {
  examTemplateCode: string | null;
  contextId: number | null;
  sections: Section[];
}

export interface Enrollment {
  id: number;
  courseId: number;
  courseTitle: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  progressPct: number;
  enrolledAt: string;
}

// ---- Question bank (Giai đoạn 3) ----

export interface QuestionCategoryNode {
  id: number;
  name: string;
  parentId: number | null;
  description: string | null;
  audience: Audience;
}

export interface QuestionSummary {
  id: number;
  type: string;
  name: string;
  categoryId: number;
  categoryName: string;
  passageId: number | null;
  defaultMark: number;
  tags: string[];
}

export interface QuestionOption {
  id: number | null;
  content: string;
  correct: boolean;
  feedback: string | null;
  sortOrder: number;
}

export interface QuestionMatchingPair {
  id: number | null;
  leftItem: string;
  rightItem: string;
  sortOrder: number;
  leftImageUrl?: string | null;
  rightImageUrl?: string | null;
}

export interface QuestionDragItem {
  id: number | null;
  content: string;
  correctTarget: string;
  sortOrder: number;
}

export interface QuestionDragZone {
  id: number | null;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sortOrder: number;
}

export interface QuestionClozeSubAnswer {
  id: number | null;
  subIndex: number;
  subType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  acceptedAnswers: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any;
  sortOrder: number;
}

export interface QuestionDetail {
  id: number;
  type: string;
  name: string;
  stem: string | null;
  categoryId: number;
  categoryName: string;
  passageId: number | null;
  passageTitle: string | null;
  passageContent: string | null;
  answerParagraphIndex: number | null;
  explanation: string | null;
  defaultMark: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  tags: string[];
  options: QuestionOption[];
  matchingPairs: QuestionMatchingPair[];
  dragItems: QuestionDragItem[];
  dragZones: QuestionDragZone[];
  clozeSubAnswers: QuestionClozeSubAnswer[];
  audience: Audience | null;
}

export interface QuestionUpsertRequest {
  categoryId: number;
  type: string;
  name: string;
  stem?: string | null;
  passageId?: number | null;
  answerParagraphIndex?: number | null;
  explanation?: string | null;
  defaultMark?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings?: any;
  tags?: string[];
  options?: QuestionOption[];
  matchingPairs?: QuestionMatchingPair[];
  dragItems?: QuestionDragItem[];
  dragZones?: QuestionDragZone[];
  clozeSubAnswers?: QuestionClozeSubAnswer[];
}

export interface QuestionTag {
  id: number;
  name: string;
}

// ---- Quiz engine (Giai đoạn 4) ----

export interface QuizSummary {
  id: number;
  sectionId: number;
  courseId: number;
  title: string;
  intro: string | null;
  timeLimitSeconds: number | null;
  maxAttempts: number;
  shuffleQuestions: boolean;
  antiCheatEnabled: boolean;
  maxViolations: number;
  passMark: number | null;
  status: string;
  contextId: number | null;
  questionCount: number;
  examTemplateCode: string | null;
}

// ---- Quiz management (admin/teacher) ----

export interface QuizPageAdmin {
  id: number;
  pageNumber: number;
  partLabel: string | null;
  passageId: number | null;
}

export interface QuizQuestionAdmin {
  quizQuestionId: number;
  questionId: number;
  type: string | null;
  name: string | null;
  mark: number;
  pageId: number | null;
  sortOrder: number;
}

export interface QuizDetailAdmin {
  quiz: QuizSummary;
  pages: QuizPageAdmin[];
  questions: QuizQuestionAdmin[];
}

export interface PassageSummary {
  id: number;
  title: string;
  kind: string;
  content: string | null;
  audioUrl: string | null;
}

export interface PlayerOption {
  id: number;
  content: string;
}

export interface PlayerMatchingPair {
  id: number;
  leftItem: string;
  leftImageUrl: string | null;
}

export interface PlayerMatchingOption {
  value: string;
  imageUrl: string | null;
}

export interface PlayerDragItem {
  id: number;
  content: string;
}

export interface PlayerDragZone {
  id: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayerClozeSubAnswer {
  id: number;
  subIndex: number;
  subType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any;
}

export interface PlayerQuestion {
  quizQuestionId: number;
  questionId: number;
  type: string;
  name: string;
  stem: string | null;
  mark: number;
  pageId: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  options: PlayerOption[];
  matchingPairs: PlayerMatchingPair[];
  matchingRightPool: PlayerMatchingOption[];
  dragItems: PlayerDragItem[];
  dragZones: PlayerDragZone[];
  clozeSubAnswers: PlayerClozeSubAnswer[];
  audience: Audience | null;
}

export interface ExamPage {
  id: number;
  pageNumber: number;
  partLabel: string | null;
  passageId: number | null;
  passageTitle: string | null;
  passageKind: string | null;
  passageContent: string | null;
  passageAudioUrl: string | null;
}

export interface AttemptPlayer {
  attemptId: number;
  quizId: number;
  quizTitle: string;
  status: string;
  startedAt: string;
  deadlineAt: string | null;
  timeLimitSeconds: number | null;
  antiCheatEnabled: boolean;
  maxViolations: number;
  violations: number;
  examTemplateCode: string | null;
  pages: ExamPage[];
  questions: PlayerQuestion[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  savedAnswers: Record<number, any>;
}

export interface GradedItem {
  quizQuestionId: number;
  type: string;
  name: string;
  mark: number;
  awardedMark: number | null;
  correct: boolean | null;
  explanation: string | null;
  answerParagraphIndex: number | null;
  answerParagraphHtml: string | null;
}

export interface AttemptResult {
  attemptId: number;
  status: string;
  rawScore: number | null;
  maxScore: number | null;
  bandScore: number | null;
  violations: number;
  submittedAt: string | null;
  breakdown: GradedItem[];
}

export interface ViolationResult {
  violations: number;
  autoSubmitted: boolean;
}

// ---- Gradebook & reports (Giai đoạn 5) ----

export interface GradebookRow {
  quizId: number;
  quizTitle: string;
  courseId: number;
  courseName: string;
  bestScore: number | null;
  maxScore: number | null;
  bandScore: number | null;
  status: string;
  attempts: number;
  lastSubmittedAt: string | null;
}

export interface MonthlyPoint {
  month: string;
  enrollments: number;
  revenue: number;
}

export interface SystemAnalytics {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalQuizzes: number;
  totalAttempts: number;
  totalRevenue: number;
  monthly: MonthlyPoint[];
}

// ---- Admin tools (Giai đoạn 6) ----

export interface AppNotification {
  id: number;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string | null;
  level: "INFO" | "WARNING" | "CRITICAL";
  active: boolean;
  createdAt: string;
}

export interface BulkImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

// ---- Xuất/nhập ngân hàng câu hỏi theo danh mục ----

export interface ImportSummary {
  categoriesCreated: number;
  categoriesReused: number;
  passagesCreated: number;
  passagesReused: number;
  tagsCreated: number;
  tagsReused: number;
  questionsCreated: number;
  questionsSkippedDuplicate: number;
  warnings: string[];
}

// ---- Public portal (Giai đoạn 7) ----

export interface TeacherPublic {
  id: number;
  fullName: string;
  headline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  yearsExperience: number;
}

export interface PublicStats {
  publishedCourses: number;
  teachers: number;
  students: number;
}

// ---- Admin: quản lý tài khoản & vai trò ----

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  roleAssignments: RoleAssignment[];
}

export interface RoleOption {
  id: number;
  shortname: string;
  name: string;
  description: string | null;
}

export interface StudentSummary {
  id: string;
  username: string;
  email: string;
  fullName: string;
}

// ---- Phụ huynh & hồ sơ con (Giai đoạn v2, Phase 11) ----

export interface ChildProfile {
  id: string;
  username: string;
  fullName: string;
}

// ---- Tiến độ học của con (Phase 18) ----

export interface ChildProgress {
  totalLessonsCompleted: number;
  averageScorePct: number | null;
  weeklyLessons: { weekStart: string; count: number }[];
  recentLessons: { sectionTitle: string; courseTitle: string; completedAt: string }[];
}

// ---- Tiến độ học (Phase 12) ----

export interface CourseProgress {
  completedSectionIds: number[];
}

// ---- Game hóa (Phase 19) ----

export interface MemoryPair {
  pairId: number;
  word: string;
  imageUrl: string | null;
}

export interface LeaderboardEntry {
  fullName: string;
  totalPoints: number;
}

export interface RaceQuestion {
  questionId: number;
  stem: string;
  options: { id: number; content: string }[];
}

// ---- Ghi âm luyện nói (Phase 15) ----

export interface LessonRecording {
  id: number;
  audioUrl: string;
  createdAt: string;
}
