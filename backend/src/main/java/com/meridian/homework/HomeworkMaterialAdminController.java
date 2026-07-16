package com.meridian.homework;

import com.meridian.homework.dto.HomeworkMaterialDto;
import com.meridian.security.CurrentUserProvider;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Quản lý tài liệu bài tập về nhà — kiểm quyền 'course:manage' trong HomeworkMaterialService. */
@RestController
@RequestMapping("/api/admin/homework-materials")
public class HomeworkMaterialAdminController {

    private final HomeworkMaterialService materialService;
    private final CurrentUserProvider currentUser;

    public HomeworkMaterialAdminController(HomeworkMaterialService materialService,
            CurrentUserProvider currentUser) {
        this.materialService = materialService;
        this.currentUser = currentUser;
    }

    @PostMapping("/sections/{sectionId}")
    public ResponseEntity<HomeworkMaterialDto> create(@PathVariable Long sectionId,
            @RequestBody Map<String, String> body) {
        HomeworkMaterialDto dto = materialService.create(currentUser.require().id(), sectionId,
                body.get("mediaType"), body.get("url"), body.get("label"));
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        materialService.delete(currentUser.require().id(), id);
        return ResponseEntity.noContent().build();
    }
}
