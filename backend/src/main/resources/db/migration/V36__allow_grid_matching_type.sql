ALTER TABLE questions DROP CONSTRAINT questions_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_type_check
    CHECK (type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE_NOT_GIVEN',
           'MATCHING', 'SHORT_ANSWER', 'ESSAY',
           'DRAG_DROP_TEXT', 'DRAG_DROP_MARKER', 'CLOZE', 'GRID_MATCHING'));
