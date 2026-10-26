package com.meridian.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.meridian.admin.dto.UserImportDtos.ImportRow;
import com.meridian.admin.dto.UserImportDtos.ImportRowResult;
import com.meridian.admin.dto.UserImportDtos.ImportUsersRequest;
import com.meridian.admin.dto.UserImportDtos.ImportUsersResult;
import com.meridian.catalog.EnrollmentService;
import com.meridian.catalog.dto.BulkEnrollResult;
import com.meridian.classroom.ClassService;
import com.meridian.classroom.dto.ClassDtos.AddMembersResult;
import com.meridian.common.ApiException;
import com.meridian.rbac.Context;
import com.meridian.rbac.ContextService;
import com.meridian.rbac.PermissionService;
import com.meridian.rbac.Role;
import com.meridian.rbac.RoleAssignmentRepository;
import com.meridian.rbac.RoleRepository;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Nhập tài khoản từ file: mật khẩu ngẫu nhiên riêng từng người, báo lỗi từng dòng, gắn vào lớp/khóa. */
@ExtendWith(MockitoExtension.class)
class UserImportServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private RoleAssignmentRepository roleAssignmentRepository;
    @Mock private ContextService contextService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private PermissionService permissionService;
    @Mock private ClassService classService;
    @Mock private EnrollmentService enrollmentService;

    private UserImportService service;
    private final UUID admin = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new UserImportService(userRepository, roleRepository, roleAssignmentRepository,
                contextService, passwordEncoder, permissionService, classService, enrollmentService);
        lenient().when(roleRepository.findByShortname("student")).thenReturn(Optional.of(new Role()));
        lenient().when(contextService.requireSystemContext()).thenReturn(new Context());
        lenient().when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "HASH:" + inv.getArgument(0));
        lenient().when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
    }

    private ImportRow row(String name, String email) {
        return new ImportRow(name, email, null);
    }

    private ImportUsersRequest req(Long classId, Long courseId, ImportRow... rows) {
        return new ImportUsersRequest(List.of(rows), classId, courseId);
    }

    @Test
    void createsAccountsWithRandomPasswords_neverTheSharedDefault() {
        ImportUsersResult result = service.importUsers(admin, req(null, null,
                row("An Nguyen", "an.nguyen@example.com"),
                row("Binh Tran", "binh@example.com"),
                row("Chi Le", "chi.le@example.com")));

        assertThat(result.created()).isEqualTo(3);
        assertThat(result.errors()).isZero();
        Set<String> passwords = new HashSet<>();
        for (ImportRowResult r : result.rows()) {
            assertThat(r.status()).isEqualTo("CREATED");
            assertThat(r.password()).hasSize(10).isNotEqualTo("Meridian@123");
            passwords.add(r.password());
            // Mật khẩu rõ chỉ trả về cho admin; trong DB chỉ có bản băm.
            verify(passwordEncoder).encode(r.password());
        }
        assertThat(passwords).hasSize(3);
        assertThat(result.rows()).extracting(ImportRowResult::username)
                .containsExactly("an.nguyen", "binh", "chi.le");
        verify(roleAssignmentRepository, times(3)).save(any());
    }

    @Test
    void usernameIsDerivedFromEmail_padded_andMadeUnique() {
        when(userRepository.existsByUsernameIgnoreCase("nguyen.van")).thenReturn(true);
        when(userRepository.existsByUsernameIgnoreCase("nguyen.van2")).thenReturn(false);

        ImportUsersResult result = service.importUsers(admin, req(null, null,
                row("Nguyen Van", "nguyen.van@example.com"),
                row("Ngan", "ab@example.com")));

        assertThat(result.rows().get(0).username()).isEqualTo("nguyen.van2");
        // "ab" ngắn hơn 3 ký tự tối thiểu của tên đăng nhập → được đệm cho đủ.
        assertThat(result.rows().get(1).username()).isEqualTo("ab0");
    }

    @Test
    void explicitUsername_mustBeValidAndFree() {
        when(userRepository.existsByUsernameIgnoreCase("taken")).thenReturn(true);

        ImportUsersResult result = service.importUsers(admin, new ImportUsersRequest(List.of(
                new ImportRow("A", "a@example.com", "taken"),
                new ImportRow("B", "b@example.com", "bad name!"),
                new ImportRow("C", "c@example.com", "chi_c")), null, null));

        assertThat(result.rows()).extracting(ImportRowResult::status)
                .containsExactly("ERROR", "ERROR", "CREATED");
        assertThat(result.rows().get(2).username()).isEqualTo("chi_c");
        assertThat(result.errors()).isEqualTo(2);
    }

    @Test
    void invalidRows_getReportedPerLine_andDoNotStopTheOthers() {
        ImportUsersResult result = service.importUsers(admin, req(null, null,
                row("", "thieu.ten@example.com"),
                row("Thiếu email", ""),
                row("Email sai", "khong-phai-email"),
                row("Hợp lệ", "ok@example.com"),
                row("Trùng trong file", "OK@example.com")));

        assertThat(result.rows()).extracting(ImportRowResult::status)
                .containsExactly("ERROR", "ERROR", "ERROR", "CREATED", "ERROR");
        assertThat(result.rows().get(0).message()).contains("họ tên");
        assertThat(result.rows().get(4).message()).contains("trùng");
        assertThat(result.rows()).extracting(ImportRowResult::line).containsExactly(1, 2, 3, 4, 5);
        assertThat(result.created()).isEqualTo(1);
        assertThat(result.errors()).isEqualTo(4);
    }

    @Test
    void existingEmail_isNotRecreated_butStillCountedAndAssigned() {
        User old = new User();
        old.setId(UUID.randomUUID());
        old.setUsername("hocvien.cu");
        when(userRepository.findByEmailIgnoreCase("cu@example.com")).thenReturn(Optional.of(old));
        when(classService.addMembers(eq(admin), eq(5L), anyList())).thenReturn(new AddMembersResult(2, 0, 0, 0));

        ImportUsersResult result = service.importUsers(admin, req(5L, null,
                row("Học viên cũ", "cu@example.com"),
                row("Học viên mới", "moi@example.com")));

        assertThat(result.existing()).isEqualTo(1);
        assertThat(result.created()).isEqualTo(1);
        assertThat(result.rows().get(0).status()).isEqualTo("EXISTING");
        assertThat(result.rows().get(0).password()).isNull();
        verify(userRepository, times(1)).save(any(User.class));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<UUID>> ids = ArgumentCaptor.forClass(List.class);
        verify(classService).addMembers(eq(admin), eq(5L), ids.capture());
        assertThat(ids.getValue()).hasSize(2).contains(old.getId());
        assertThat(result.addedToClass()).isEqualTo(2);
    }

    @Test
    void withClassAndCourse_needsEnrollmentManage_andAddsEveryoneToBoth() {
        when(classService.addMembers(eq(admin), eq(5L), anyList())).thenReturn(new AddMembersResult(2, 0, 0, 3));
        when(enrollmentService.enrollUsersInCourse(anyList(), eq(10L))).thenReturn(new BulkEnrollResult(2, 0, 0));

        ImportUsersResult result = service.importUsers(admin, req(5L, 10L,
                row("An", "an@example.com"), row("Bình", "binh@example.com")));

        verify(permissionService).requireSystemCapability(admin, "user:bulkupload");
        verify(permissionService).requireSystemCapability(admin, "enrollment:manage");
        assertThat(result.addedToClass()).isEqualTo(2);
        // 3 lượt ghi danh phát sinh từ các khóa đã gắn vào lớp + 2 lượt ghi danh trực tiếp vào khóa chọn.
        assertThat(result.newlyEnrolled()).isEqualTo(5);
    }

    @Test
    void withoutBulkuploadCapability_nothingIsTouched() {
        doThrow(ApiException.forbidden("Thiếu quyền")).when(permissionService)
                .requireSystemCapability(admin, "user:bulkupload");

        assertThatThrownBy(() -> service.importUsers(admin, req(null, null, row("An", "an@example.com"))))
                .isInstanceOf(ApiException.class);
        verifyNoInteractions(userRepository, roleAssignmentRepository, classService, enrollmentService);
    }

    @Test
    void assigningToClass_withoutEnrollmentManage_isRejectedBeforeCreatingAnyone() {
        // lenient: lời gọi đầu tiên (user:bulkupload) khác tham số với stub này nên Mockito strict sẽ báo nhầm.
        lenient().doThrow(ApiException.forbidden("Thiếu quyền")).when(permissionService)
                .requireSystemCapability(admin, "enrollment:manage");

        assertThatThrownBy(() -> service.importUsers(admin, req(5L, null, row("An", "an@example.com"))))
                .isInstanceOf(ApiException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void tooManyRows_isRejected() {
        List<ImportRow> many = new ArrayList<>();
        for (int i = 0; i < UserImportService.MAX_ROWS + 1; i++) {
            many.add(row("Học viên " + i, "u" + i + "@example.com"));
        }

        assertThatThrownBy(() -> service.importUsers(admin, new ImportUsersRequest(many, null, null)))
                .isInstanceOf(ApiException.class);
        verify(userRepository, never()).save(any());
    }
}
