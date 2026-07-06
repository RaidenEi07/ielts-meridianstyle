-- =====================================================================
-- V5 — Ngân hàng câu hỏi (Giai đoạn 3)
-- 8 loại câu hỏi chính + passages (đoạn văn/audio dùng chung) + danh mục/tag.
-- Cấu trúc linh hoạt (Cloze/Drag-drop/Short answer/Essay) lưu JSONB.
-- =====================================================================

-- ---------------------------------------------------------------------
-- question_categories — cây danh mục tổ chức ngân hàng câu hỏi
-- ---------------------------------------------------------------------
CREATE TABLE question_categories (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(160) NOT NULL,
    parent_id   BIGINT       REFERENCES question_categories (id) ON DELETE CASCADE,
    description  TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_qcat_parent ON question_categories (parent_id);

-- ---------------------------------------------------------------------
-- question_tags
-- ---------------------------------------------------------------------
CREATE TABLE question_tags (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       VARCHAR(80)  NOT NULL UNIQUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- passages — đoạn văn (Reading) hoặc audio (Listening), dùng chung cho nhiều câu.
--   content được chuẩn hóa để tính offset cho annotation (highlight/note).
-- ---------------------------------------------------------------------
CREATE TABLE passages (
    id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    kind       VARCHAR(20)  NOT NULL DEFAULT 'READING'
               CHECK (kind IN ('READING', 'LISTENING', 'GENERIC')),
    content    TEXT,
    audio_url  VARCHAR(500),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- questions — câu hỏi (8 loại). Cấu hình theo loại lưu ở settings (JSONB):
--   SHORT_ANSWER: { acceptedAnswers:[...], caseSensitive:bool }
--   ESSAY:        { wordLimit:int, rubric:[...] }
--   DRAG_DROP_TEXT: { template:"...[[1]]...[[2]]..." }
--   DRAG_DROP_MARKER: { backgroundImageUrl:"..." }
-- ---------------------------------------------------------------------
CREATE TABLE questions (
    id           BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id  BIGINT        NOT NULL REFERENCES question_categories (id),
    type         VARCHAR(30)   NOT NULL
                 CHECK (type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE_NOT_GIVEN',
                        'MATCHING', 'SHORT_ANSWER', 'ESSAY',
                        'DRAG_DROP_TEXT', 'DRAG_DROP_MARKER', 'CLOZE')),
    name         VARCHAR(200)  NOT NULL,
    stem         TEXT,
    passage_id   BIGINT        REFERENCES passages (id) ON DELETE SET NULL,
    default_mark NUMERIC(6, 2) NOT NULL DEFAULT 1,
    settings     JSONB,
    created_by   UUID          REFERENCES users (id) ON DELETE SET NULL,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_questions_category ON questions (category_id);
CREATE INDEX ix_questions_type ON questions (type);
CREATE INDEX ix_questions_passage ON questions (passage_id);

-- ---------------------------------------------------------------------
-- Bảng con theo loại (owned, xóa cứng theo câu hỏi)
-- ---------------------------------------------------------------------
-- Multiple Choice + True/False/Not Given
CREATE TABLE question_options (
    id          BIGINT  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id BIGINT  NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    content     TEXT    NOT NULL,
    is_correct  BOOLEAN NOT NULL DEFAULT false,
    feedback    TEXT,
    sort_order  INT     NOT NULL DEFAULT 0
);
CREATE INDEX ix_qoptions_question ON question_options (question_id);

-- Matching
CREATE TABLE question_matching_pairs (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id BIGINT       NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    left_item   VARCHAR(500) NOT NULL,
    right_item  VARCHAR(500) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0
);
CREATE INDEX ix_qmatch_question ON question_matching_pairs (question_id);

-- Drag and drop (text + markers): item kéo-thả
CREATE TABLE question_dragdrop_items (
    id             BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id    BIGINT       NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    content        VARCHAR(500) NOT NULL,
    correct_target VARCHAR(120),   -- placeholder number (text) hoặc nhãn zone (marker)
    sort_order     INT          NOT NULL DEFAULT 0
);
CREATE INDEX ix_qddi_question ON question_dragdrop_items (question_id);

-- Drag and drop markers: vùng thả trên ảnh nền
CREATE TABLE question_dragdrop_zones (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id BIGINT       NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    label       VARCHAR(120) NOT NULL,
    x           INT          NOT NULL DEFAULT 0,
    y           INT          NOT NULL DEFAULT 0,
    width       INT          NOT NULL DEFAULT 0,
    height      INT          NOT NULL DEFAULT 0,
    sort_order  INT          NOT NULL DEFAULT 0
);
CREATE INDEX ix_qddz_question ON question_dragdrop_zones (question_id);

-- Embedded Answers (Cloze): mỗi sub-answer có loại riêng
CREATE TABLE question_cloze_subanswers (
    id               BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id      BIGINT      NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    sub_index        INT         NOT NULL,
    sub_type         VARCHAR(20) NOT NULL
                     CHECK (sub_type IN ('SELECT', 'TEXT', 'NUMERIC')),
    accepted_answers JSONB,
    options          JSONB,
    sort_order       INT         NOT NULL DEFAULT 0
);
CREATE INDEX ix_qcloze_question ON question_cloze_subanswers (question_id);

-- Map câu hỏi <-> tag
CREATE TABLE question_tag_map (
    question_id BIGINT NOT NULL REFERENCES questions (id)     ON DELETE CASCADE,
    tag_id      BIGINT NOT NULL REFERENCES question_tags (id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
);
