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

    public CatalogPublicController(CatalogService catalogService, CurrentUserProvider currentUser) {
        this.catalogService = catalogService;
        this.currentUser = currentUser;
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
        return catalogService.getCourseDetail(id, currentUser.optionalUserId());
    }

    @GetMapping("/courses/{id}/sections")
    public List<SectionDto> sections(@PathVariable Long id) {
        return catalogService.listSections(id, currentUser.optionalUserId());
    }
}
