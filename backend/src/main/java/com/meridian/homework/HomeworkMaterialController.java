package com.meridian.homework;

import com.meridian.homework.dto.HomeworkMaterialDto;
import com.meridian.security.CurrentUserProvider;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Đọc tài liệu bài tập về nhà — cần đăng nhập, không cần capability riêng. */
@RestController
@RequestMapping("/api/homework-materials")
public class HomeworkMaterialController {

    private final HomeworkMaterialService materialService;
    private final CurrentUserProvider currentUser;

    public HomeworkMaterialController(HomeworkMaterialService materialService, CurrentUserProvider currentUser) {
        this.materialService = materialService;
        this.currentUser = currentUser;
    }

    @GetMapping("/sections/{sectionId}")
    public List<HomeworkMaterialDto> list(@PathVariable Long sectionId) {
        currentUser.require();
        return materialService.list(sectionId);
    }
}
