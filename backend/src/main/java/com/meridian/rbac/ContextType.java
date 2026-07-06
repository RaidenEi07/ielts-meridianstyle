package com.meridian.rbac;

/**
 * Loại context trong cây phân cấp RBAC: SYSTEM -> CATEGORY -> COURSE -> QUIZ.
 */
public enum ContextType {
    SYSTEM,
    CATEGORY,
    COURSE,
    QUIZ
}
