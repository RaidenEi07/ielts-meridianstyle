package com.meridian.admin;

import com.meridian.admin.dto.AdminDtos.BulkImportRequest;
import com.meridian.admin.dto.AdminDtos.BulkImportResult;
import com.meridian.admin.dto.UserImportDtos.ImportUsersRequest;
import com.meridian.admin.dto.UserImportDtos.ImportUsersResult;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class BulkUserController {

    private final BulkUserService bulkUserService;
    private final UserImportService userImportService;
    private final CurrentUserProvider currentUser;

    public BulkUserController(BulkUserService bulkUserService, UserImportService userImportService,
            CurrentUserProvider currentUser) {
        this.bulkUserService = bulkUserService;
        this.userImportService = userImportService;
        this.currentUser = currentUser;
    }

    @PostMapping("/bulk")
    public BulkImportResult bulkImport(@RequestBody BulkImportRequest req) {
        return bulkUserService.importUsers(currentUser.require().id(), req);
    }

    /** Nhập từ file Excel/CSV (đọc ở trình duyệt): mật khẩu ngẫu nhiên riêng cho từng tài khoản mới, trả về 1 lần. */
    @PostMapping("/import")
    public ImportUsersResult importFromFile(@Valid @RequestBody ImportUsersRequest req) {
        return userImportService.importUsers(currentUser.require().id(), req);
    }
}
