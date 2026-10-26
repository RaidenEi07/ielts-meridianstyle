package com.meridian.catalog;

import com.meridian.catalog.dto.CategoryDto;
import com.meridian.catalog.dto.CourseDetailDto;
import com.meridian.catalog.dto.CourseSummaryDto;
import com.meridian.catalog.dto.ExamTemplateDto;
import com.meridian.catalog.dto.SectionDto;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Đọc danh mục/khóa học công khai (không cần đăng nhập). Danh sách chỉ trả khóa đã xuất bản; chi tiết khóa CHƯA xuất
 * bản (nháp/lưu trữ) chỉ trả cho người quản lý khóa đó hoặc học viên đã ghi danh, còn lại 404.
 */
@RestController
@RequestMapping("/api/catalog")
public class CatalogPublicController {

    private final CatalogService catalogService;
    private final CurrentUserProvider currentUser;
    private final CourseAccessGuard accessGuard;

    public CatalogPublicController(CatalogService catalogService, CurrentUserProvider currentUser,
            CourseAccessGuard accessGuard) {
        this.catalogService = catalogService;
        this.currentUser = currentUser;
        this.accessGuard = accessGuard;
    }

    @GetMapping("/exam-templates")
    public List<ExamTemplateDto> examTemplates() {
        return catalogService.listExamTemplates();
    }

    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return catalogService.listCategories();
    }

    @GetMapping("/courses")
    public List<CourseSummaryDto> courses(
            @RequestParam(name = "categoryId", required = false) Long categoryId,
            @RequestParam(name = "audienceGroup", required = false) CourseAudienceGroup audienceGroup) {
        return catalogService.listPublishedCourses(categoryId, audienceGroup);
    }

    @GetMapping("/courses/{id}")
    public CourseDetailDto course(@PathVariable Long id) {
        java.util.UUID viewer = currentUser.optionalUserId();
        CourseDetailDto detail = catalogService.getCourseDetail(id, viewer);
        // Giới thiệu + đề cương vẫn công khai; video / phụ đề chỉ cho người đã ghi danh hoặc phụ trách khóa.
        return accessGuard.canAccessContent(viewer, id) ? detail : detail.outlineOnly();
    }

    @GetMapping("/courses/{id}/sections")
    public List<SectionDto> sections(@PathVariable Long id) {
        java.util.UUID viewer = currentUser.optionalUserId();
        List<SectionDto> sections = catalogService.listSections(id, viewer);
        return accessGuard.canAccessContent(viewer, id) ? sections : sections.stream().map(SectionDto::outline).toList();
    }
}
