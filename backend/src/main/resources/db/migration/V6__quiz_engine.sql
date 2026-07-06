-- =====================================================================
-- V6 — Quiz Engine & Exam Simulation (Giai đoạn 4)
-- Section -> Quiz -> (import) Question. Quiz có ≤3 page (Pagination #10).
-- Lượt làm (attempts) + đáp án + log anti-cheat. Override/regrade cho giáo viên.
-- =====================================================================

-- ---------------------------------------------------------------------
-- quizzes — thuộc một course_section; gắn QUIZ context cho RBAC.
--   Hành vi mô phỏng thi kế thừa từ exam_template của category khóa học.
-- ---------------------------------------------------------------------
CREATE TABLE quizzes (
    id                 BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_id         BIGINT       NOT NULL REFERENCES course_sections (id) ON DELETE CASCADE,
    title              VARCHAR(200) NOT NULL,
    intro              TEXT,
    time_limit_seconds INT,                       -- NULL = không giới hạn
    max_attempts       INT          NOT NULL DEFAULT 1,   -- 0 = không giới hạn
    shuffle_questions  BOOLEAN      NOT NULL DEFAULT false,
    anti_cheat_enabled BOOLEAN      NOT NULL DEFAULT false,
    max_violations     INT          NOT NULL DEFAULT 3,
    pass_mark          NUMERIC(6, 2),
    status             VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                       CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    context_id         BIGINT       REFERENCES contexts (id),
    deleted_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_quizzes_section ON quizzes (section_id);

-- ---------------------------------------------------------------------
-- quiz_pages — tối đa 3 page/quiz (Part). passage_id cho Reading.
-- ---------------------------------------------------------------------
CREATE TABLE quiz_pages (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id     BIGINT       NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    page_number INT          NOT NULL CHECK (page_number BETWEEN 1 AND 3),
    part_label  VARCHAR(120),
    passage_id  BIGINT       REFERENCES passages (id) ON DELETE SET NULL,
    UNIQUE (quiz_id, page_number)
);

-- ---------------------------------------------------------------------
-- quiz_questions — import câu hỏi từ ngân hàng vào quiz.
-- ---------------------------------------------------------------------
CREATE TABLE quiz_questions (
    id          BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id     BIGINT        NOT NULL REFERENCES quizzes (id)   ON DELETE CASCADE,
    question_id BIGINT        NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    page_id     BIGINT        REFERENCES quiz_pages (id) ON DELETE SET NULL,
    mark        NUMERIC(6, 2) NOT NULL DEFAULT 1,
    sort_order  INT           NOT NULL DEFAULT 0,
    UNIQUE (quiz_id, question_id)
);
CREATE INDEX ix_quizq_quiz ON quiz_questions (quiz_id);

-- ---------------------------------------------------------------------
-- quiz_attempts — một lượt làm bài của user.
-- ---------------------------------------------------------------------
CREATE TABLE quiz_attempts (
    id             BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id        BIGINT        NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    user_id        UUID          NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
    attempt_number INT           NOT NULL DEFAULT 1,
    status         VARCHAR(20)   NOT NULL DEFAULT 'IN_PROGRESS'
                   CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'EXPIRED')),
    started_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deadline_at    TIMESTAMPTZ,                    -- thời điểm hết giờ (có override)
    submitted_at   TIMESTAMPTZ,
    raw_score      NUMERIC(8, 2),                  -- tổng điểm chấm tự động
    max_score      NUMERIC(8, 2),
    band_score     NUMERIC(3, 1),                  -- quy đổi (Listening/Reading)
    violations     INT           NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (quiz_id, user_id, attempt_number)
);
CREATE INDEX ix_attempts_quiz ON quiz_attempts (quiz_id);
CREATE INDEX ix_attempts_user ON quiz_attempts (user_id);

-- ---------------------------------------------------------------------
-- quiz_attempt_answers — đáp án người dùng (response JSONB) + kết quả chấm.
-- ---------------------------------------------------------------------
CREATE TABLE quiz_attempt_answers (
    id              BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    attempt_id      BIGINT        NOT NULL REFERENCES quiz_attempts (id)  ON DELETE CASCADE,
    quiz_question_id BIGINT       NOT NULL REFERENCES quiz_questions (id) ON DELETE CASCADE,
    response        JSONB,
    is_correct      BOOLEAN,
    awarded_mark    NUMERIC(6, 2),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (attempt_id, quiz_question_id)
);
CREATE INDEX ix_answers_attempt ON quiz_attempt_answers (attempt_id);

-- ---------------------------------------------------------------------
-- quiz_attempt_logs — sự kiện anti-cheat (chuyển tab, thoát fullscreen...).
-- ---------------------------------------------------------------------
CREATE TABLE quiz_attempt_logs (
    id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    attempt_id BIGINT      NOT NULL REFERENCES quiz_attempts (id) ON DELETE CASCADE,
    event_type VARCHAR(40) NOT NULL,
    detail     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_logs_attempt ON quiz_attempt_logs (attempt_id);
