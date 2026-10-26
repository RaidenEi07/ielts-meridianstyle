import type { CourseAudienceGroup } from "./types";

export type GroupSlug = "tre-em" | "tieu-hoc";

const SLUG_TO_ENUM: Record<GroupSlug, CourseAudienceGroup> = {
  "tre-em": "TRE_EM",
  "tieu-hoc": "TIEU_HOC",
};

const SLUG_TO_LABEL: Record<GroupSlug, string> = {
  "tre-em": "Trẻ em",
  "tieu-hoc": "Tiểu học",
};

export function isGroupSlug(value: string): value is GroupSlug {
  return value === "tre-em" || value === "tieu-hoc";
}

export function groupSlugToAudience(slug: string): CourseAudienceGroup | null {
  return isGroupSlug(slug) ? SLUG_TO_ENUM[slug] : null;
}

/** Ngược lại với groupSlugToAudience — khóa IELTS không có trang "Vào học" riêng nên trả null. */
export function audienceToGroupSlug(group: CourseAudienceGroup | null | undefined): GroupSlug | null {
  if (group === "TRE_EM") return "tre-em";
  if (group === "TIEU_HOC") return "tieu-hoc";
  return null;
}

export function groupLabel(slug: string): string {
  return isGroupSlug(slug) ? SLUG_TO_LABEL[slug] : slug;
}
