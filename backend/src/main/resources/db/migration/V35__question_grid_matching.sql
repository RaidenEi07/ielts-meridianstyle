-- Trắc nghiệm dạng lưới/bảng (Grid Matching): cột dùng chung + mỗi hàng chọn đúng 1 cột
CREATE TABLE question_grid_columns (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id BIGINT       NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    label       VARCHAR(120) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0
);
CREATE INDEX ix_qgc_question ON question_grid_columns (question_id);

CREATE TABLE question_grid_rows (
    id                   BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id          BIGINT        NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    row_text             VARCHAR(500)  NOT NULL,
    correct_column_label VARCHAR(120)  NOT NULL,
    sort_order           INT           NOT NULL DEFAULT 0
);
CREATE INDEX ix_qgr_question ON question_grid_rows (question_id);
