package com.meridian.admin;

import com.meridian.admin.dto.AdminDtos.BulkImportRequest;
import com.meridian.admin.dto.AdminDtos.BulkImportResult;
import com.meridian.security.CurrentUserProvider;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class BulkUserController {

    private final BulkUserService bulkUserService;
    private final CurrentUserProvider currentUser;

    public BulkUserController(BulkUserService bulkUserService, CurrentUserProvider currentUser) {
        this.bulkUserService = bulkUserService;
        this.currentUser = currentUser;
    }

    @PostMapping("/bulk")
    public BulkImportResult bulkImport(@RequestBody BulkImportRequest req) {
        return bulkUserService.importUsers(currentUser.require().id(), req);
    }
}
