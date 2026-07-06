package com.meridian.catalog;

import com.meridian.catalog.dto.CategoryDto;
import com.meridian.catalog.dto.CategoryRequests;
import com.meridian.catalog.dto.CourseDetailDto;
import com.meridian.catalog.dto.CourseRequests;
import com.meridian.catalog.dto.CourseSummaryDto;
import com.meridian.catalog.dto.SectionDto;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Quản lý danh mục/khóa học/section. Kiểm quyền 'course:manage' tại context phù
 * hợp được thực hiện trong CatalogService (admin kế thừa từ SYSTEM; giáo viên
 * được gán tại category/course sẽ có quyền tại nhánh đó).
 */
@RestController
@RequestMapping("/api/admin/catalog")
public class CatalogAdminController {

    private final CatalogService catalogService;
    private final CurrentUserProvider currentUser;

    public CatalogAdminController(CatalogService catalogService,
            CurrentUserProvider currentUser) {
        this.catalogService = catalogService;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    // ---- Categories ----

    @PostMapping("/categories")
    public ResponseEntity<CategoryDto> createCategory(
            @Valid @RequestBody CategoryRequests.Create req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(catalogService.createCategory(uid(), req));
    }

    @PutMapping("/categories/{id}")
    public CategoryDto updateCategory(@PathVariable Long id,
            @RequestBody CategoryRequests.Update req) {
        return catalogService.updateCategory(uid(), id, req);
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        catalogService.deleteCategory(uid(), id);
        return ResponseEntity.noContent().build();
    }

    // ---- Courses ----

    /** Liệt kê khóa học cho quản trị — mọi trạng thái (kể cả DRAFT). */
    @GetMapping("/courses")
    public List<CourseSummaryDto> listCourses(
            @RequestParam(name = "categoryId", required = false) Long categoryId) {
        return catalogService.listCoursesForManagement(uid(), categoryId);
    }

    @PostMapping("/courses")
    public ResponseEntity<CourseDetailDto> createCourse(
            @Valid @RequestBody CourseRequests.CreateCourse req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(catalogService.createCourse(uid(), req));
    }

    @PutMapping("/courses/{id}")
    public CourseDetailDto updateCourse(@PathVariable Long id,
            @RequestBody CourseRequests.UpdateCourse req) {
        return catalogService.updateCourse(uid(), id, req);
    }

    @DeleteMapping("/courses/{id}")
    public ResponseEntity<Void> deleteCourse(@PathVariable Long id) {
        catalogService.deleteCourse(uid(), id);
        return ResponseEntity.noContent().build();
    }

    // ---- Sections ----

    @PostMapping("/courses/{courseId}/sections")
    public ResponseEntity<SectionDto> createSection(@PathVariable Long courseId,
            @Valid @RequestBody CourseRequests.CreateSection req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(catalogService.createSection(uid(), courseId, req));
    }

    @PutMapping("/sections/{id}")
    public SectionDto updateSection(@PathVariable Long id,
            @RequestBody CourseRequests.UpdateSection req) {
        return catalogService.updateSection(uid(), id, req);
    }

    @DeleteMapping("/sections/{id}")
    public ResponseEntity<Void> deleteSection(@PathVariable Long id) {
        catalogService.deleteSection(uid(), id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/courses/{courseId}/sections/reorder")
    public ResponseEntity<Void> reorderSections(@PathVariable Long courseId,
            @Valid @RequestBody CourseRequests.ReorderSections req) {
        catalogService.reorderSections(uid(), courseId, req.sectionIds());
        return ResponseEntity.noContent().build();
    }
}
