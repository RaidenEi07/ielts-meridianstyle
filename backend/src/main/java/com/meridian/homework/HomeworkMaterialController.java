package com.meridian.homework;

import com.meridian.catalog.CourseAccessGuard;
import com.meridian.homework.dto.HomeworkMaterialDto;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Đọc tài liệu bài tập về nhà — chỉ người đã được ghi danh khóa (hoặc phụ trách khóa). */
@RestController
@RequestMapping("/api/homework-materials")
public class HomeworkMaterialController {

    private final HomeworkMaterialService materialService;
    private final CurrentUserProvider currentUser;
    private final CourseAccessGuard accessGuard;

    public HomeworkMaterialController(HomeworkMaterialService materialService, CurrentUserProvider currentUser,
            CourseAccessGuard accessGuard) {
        this.materialService = materialService;
        this.currentUser = currentUser;
        this.accessGuard = accessGuard;
    }

    @GetMapping("/sections/{sectionId}")
    public List<HomeworkMaterialDto> list(@PathVariable Long sectionId) {
        accessGuard.requireSectionAccess(currentUser.require().id(), sectionId);
        return materialService.list(sectionId);
    }
}
