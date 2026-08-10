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
  isMaster: boolean;
}

// ---- Web con (chỉ web tổng dùng) ----

export interface ChildSite {
  id: number;
  name: string;
  baseUrl: string;
  apiKey: string;
  active: boolean;
  createdAt: string;
}

export interface DistributeResult {
  childSiteId: number;
  childSiteName: string | null;
  success: boolean;
  message: string | null;
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
  audienceGroup: CourseAudienceGroup;
  enrolledCount: number;
}

export interface Section {
  id: number;
  title: string;
  sortOrder: number;
  videoUrl: string | null;
  subtitleUrl: string | null;
  shortDescription: string | null;
  hidden: boolean;
}

export interface VideoCheckpoint {
  id: number | null;
  sectionId: number | null;
  timestampSec: number;
  questionId: number;
  sortOrder: number;
  answered: boolean;
}

export interface RecommendedCourses {
  courses: CourseSummary[];
  averageBandScore: number | null;
  note: string;
}

export interface CheckpointQuestion {
  questionId: number;
  type: string;
  name: string;
  stem: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  options: PlayerOption[];
  matchingPairs: PlayerMatchingPair[];
  matchingRightPool: PlayerMatchingOption[];
  dragItems: PlayerDragItem[];
  dragZones: PlayerDragZone[];
  clozeSubAnswers: PlayerClozeSubAnswer[];
  gridColumns: PlayerGridColumn[];
  gridRows: PlayerGridRow[];
  audience: Audience | null;
}

export interface CourseDetail extends CourseSummary {
  examTemplateCode: string | null;
  contextId: number | null;
  sections: Section[];
  descriptionHtml: string | null;
  objectives: string[];
  prerequisites: string | null;
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
  caseSensitive: boolean;
}

export interface QuestionGridColumn {
  id: number | null;
  label: string;
  sortOrder: number;
}

export interface QuestionGridRow {
  id: number | null;
  rowText: string;
  correctColumnLabel: string;
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
  gridColumns: QuestionGridColumn[];
  gridRows: QuestionGridRow[];
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
  gridColumns?: QuestionGridColumn[];
  gridRows?: QuestionGridRow[];
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
  audienceGroup: CourseAudienceGroup;
  allowReviewAfterSubmit: boolean;
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
  groupIntro: string | null;
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

export interface PlayerGridColumn {
  label: string;
}

export interface PlayerGridRow {
  id: number;
  rowText: string;
}

export interface PlayerQuestion {
  quizQuestionId: number;
  questionId: number;
  type: string;
  name: string;
  stem: string | null;
  mark: number;
  pageId: number | null;
  passageId: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any;
  options: PlayerOption[];
  matchingPairs: PlayerMatchingPair[];
  matchingRightPool: PlayerMatchingOption[];
  dragItems: PlayerDragItem[];
  dragZones: PlayerDragZone[];
  clozeSubAnswers: PlayerClozeSubAnswer[];
  gridColumns: PlayerGridColumn[];
  gridRows: PlayerGridRow[];
  audience: Audience | null;
  correctAnswerCount: number | null;
  /** Chỉ khác null ở câu hỏi ĐẦU TIÊN của 1 nhóm câu hỏi dùng chung 1 đoạn
   * hướng dẫn (vd "Questions 14-19 / Do the following statements agree..."
   * + chú thích YES/NO/NOT GIVEN) — quiz/[attemptId]/page.tsx gộp các câu
   * MULTIPLE_CHOICE/TRUE_FALSE_NOT_GIVEN liên tiếp cùng nhóm này thành 1
   * khối dùng chung tiêu đề thay vì hiện từng thẻ riêng. */
  groupIntro: string | null;
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
  correctAnswerLines: string[];
  groupIntro: string | null;
  /** ID cac lua chon DUNG (MULTIPLE_CHOICE/TRUE_FALSE_NOT_GIVEN) - de to mau
   * ngay tai vi tri lua chon do luc xem lai. Rong voi cac dang cau hoi khac. */
  correctOptionIds: number[];
  /** subIndex (dang chuoi) -> o trong Cloze do dien dung hay sai - de to mau
   * ngay tai tung o trong luc xem lai. Rong voi cac dang cau hoi khac. */
  clozeSubCorrect: Record<string, boolean>;
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
  attemptList: AttemptSummary[];
}

/** Tóm tắt 1 lượt làm bài cụ thể — dùng để admin/giáo viên xem chi tiết. */
export interface AttemptSummary {
  attemptId: number;
  attemptNumber: number;
  status: string;
  submittedAt: string | null;
  rawScore: number | null;
  maxScore: number | null;
  bandScore: number | null;
  violations: number;
}

/** 1 lượt làm bài của CHÍNH học viên — trả về bởi GET /api/attempts/me, dùng cho trang "Lịch sử làm bài". */
export interface MyAttemptSummary {
  id: number;
  attemptNumber: number;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  rawScore: number | null;
  maxScore: number | null;
  bandScore: number | null;
  violations: number;
  quizId: number | null;
  quizTitle: string | null;
  courseId: number | null;
  courseTitle: string | null;
  allowReviewAfterSubmit: boolean;
}

/** Số câu đúng/sai theo 1 dạng câu hỏi, gộp toàn bộ lịch sử làm bài của học viên. */
export interface TypeBreakdown {
  type: string;
  correctCount: number;
  wrongCount: number;
}

/** Một câu trả lời trong 1 lượt làm — dùng cho màn "Xem chi tiết lượt làm bài". */
export interface AnswerGradingDto {
  answerId: number;
  quizQuestionId: number;
  type: string | null;
  name: string | null;
  response: string | null;
  mark: number | null;
  awardedMark: number | null;
  correct: boolean | null;
  needsManualGrading: boolean;
  answered: boolean;
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

export interface TextImportSummary {
  questionsCreated: number;
  errors: { blockIndex: number; excerpt: string; reason: string }[];
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

export interface Badge {
  code: string;
  name: string;
  description: string;
  emoji: string;
  earned: boolean;
}

// ---- Tài liệu bài tập về nhà (Phase 21) ----

export interface HomeworkMaterial {
  id: number;
  mediaType: "AUDIO" | "VIDEO";
  url: string;
  label: string | null;
  sortOrder: number;
}

// ---- Lồng tiếng nhân vật (Phase 16) ----

export interface DubbingSegment {
  id: number;
  startSeconds: number;
  endSeconds: number;
}

export interface DubbingCharacter {
  id: number;
  name: string;
  segments: DubbingSegment[];
}

export interface DubbingRecording {
  id: number;
  segmentId: number;
  audioUrl: string;
}

// ---- Ghi âm luyện nói (Phase 15) ----

export interface LessonRecording {
  id: number;
  audioUrl: string;
  starRating: number | null;
  createdAt: string;
}

export interface AdminLessonRecording {
  id: number;
  userId: string;
  userFullName: string;
  audioUrl: string;
  starRating: number | null;
  createdAt: string;
}
