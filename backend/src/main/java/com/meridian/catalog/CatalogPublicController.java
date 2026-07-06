package com.meridian.catalog;

import com.meridian.catalog.dto.CategoryDto;
import com.meridian.catalog.dto.CourseDetailDto;
import com.meridian.catalog.dto.CourseSummaryDto;
import com.meridian.catalog.dto.ExamTemplateDto;
import com.meridian.catalog.dto.SectionDto;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Đọc danh mục/khóa học công khai (không cần đăng nhập). Chỉ trả khóa đã xuất bản.
 */
@RestController
@RequestMapping("/api/catalog")
public class CatalogPublicController {

    private final CatalogService catalogService;

    public CatalogPublicController(CatalogService catalogService) {
        this.catalogService = catalogService;
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
            @RequestParam(name = "categoryId", required = false) Long categoryId) {
        return catalogService.listPublishedCourses(categoryId);
    }

    @GetMapping("/courses/{id}")
    public CourseDetailDto course(@PathVariable Long id) {
        return catalogService.getCourseDetail(id);
    }

    @GetMapping("/courses/{id}/sections")
    public List<SectionDto> sections(@PathVariable Long id) {
        return catalogService.listSections(id);
    }
}
