package com.meridian.family;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.meridian.auth.AuthService;
import com.meridian.auth.dto.AuthResponse;
import com.meridian.auth.dto.UserDto;
import com.meridian.common.ApiException;
import com.meridian.family.dto.CreateChildRequest;
import com.meridian.gradebook.ReportService;
import com.meridian.progress.LessonProgressRepository;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import com.meridian.user.UserStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FamilyServiceTest {

    @Mock private ParentChildProfileRepository profileRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuthService authService;
    @Mock private LessonProgressRepository lessonProgressRepository;
    @Mock private ReportService reportService;

    private FamilyService familyService;

    @BeforeEach
    void setUp() {
        familyService = new FamilyService(profileRepository, userRepository, authService,
                lessonProgressRepository, reportService);
    }

    private User activeUser(String username) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setFullName("Người dùng " + username);
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    @Test
    void createChildProfileGeneratesAccountAssignsStudentRoleAndLinksParent() {
        User parent = activeUser("phuhuynh");
        User child = activeUser("child_generated");
        when(userRepository.findById(parent.getId())).thenReturn(Optional.of(parent));
        when(authService.createUserAccount(any(), any(), any(), org.mockito.ArgumentMatchers.eq("Bé An")))
                .thenReturn(child);

        var result = familyService.createChildProfile(parent.getId(), new CreateChildRequest("Bé An"));

        assertThat(result.id()).isEqualTo(child.getId());
        org.mockito.Mockito.verify(authService).assignRole(child, "student");
        org.mockito.Mockito.verify(profileRepository).save(any(ParentChildProfile.class));
    }

    @Test
    void switchToChildDeniedWhenProfileNotLinkedToParent() {
        UUID parentId = UUID.randomUUID();
        UUID childId = UUID.randomUUID();
        when(profileRepository.existsByParentIdAndChildId(parentId, childId)).thenReturn(false);

        assertThatThrownBy(() -> familyService.switchToChild(parentId, childId))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(403));
    }

    @Test
    void switchToChildRejectsAnotherParentsChild() {
        // Phụ huynh A không được chuyển sang con của phụ huynh B.
        UUID parentAId = UUID.randomUUID();
        UUID parentBsChildId = UUID.randomUUID();
        when(profileRepository.existsByParentIdAndChildId(parentAId, parentBsChildId))
                .thenReturn(false);

        assertThatThrownBy(() -> familyService.switchToChild(parentAId, parentBsChildId))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(403));

        org.mockito.Mockito.verify(authService, org.mockito.Mockito.never())
                .issueTokensForUser(any());
    }

    @Test
    void switchToChildIssuesTokensForChildWhenLinked() {
        UUID parentId = UUID.randomUUID();
        User child = activeUser("child_x");
        when(profileRepository.existsByParentIdAndChildId(parentId, child.getId())).thenReturn(true);
        when(userRepository.findById(child.getId())).thenReturn(Optional.of(child));
        AuthResponse expected = AuthResponse.of("acc", "ref", 900L, UserDto.from(child));
        when(authService.issueTokensForUser(child)).thenReturn(expected);

        var response = familyService.switchToChild(parentId, child.getId());

        assertThat(response).isSameAs(expected);
    }

    @Test
    void childProgressRejectsAnotherParentsChild() {
        // Phụ huynh A không được xem tiến độ con của phụ huynh B.
        UUID parentAId = UUID.randomUUID();
        UUID parentBsChildId = UUID.randomUUID();
        when(profileRepository.existsByParentIdAndChildId(parentAId, parentBsChildId))
                .thenReturn(false);

        assertThatThrownBy(() -> familyService.childProgress(parentAId, parentBsChildId))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus().value()).isEqualTo(403));

        org.mockito.Mockito.verify(lessonProgressRepository, org.mockito.Mockito.never())
                .findByUserIdAndCompletedAtAfterOrderByCompletedAtDesc(any(), any());
        org.mockito.Mockito.verify(reportService, org.mockito.Mockito.never())
                .gradebookForUser(any(), any());
    }

    @Test
    void listChildrenMapsToDto() {
        UUID parentId = UUID.randomUUID();
        User child = activeUser("child_y");
        ParentChildProfile profile = new ParentChildProfile();
        profile.setChild(child);
        when(profileRepository.findByParentId(parentId)).thenReturn(List.of(profile));

        var result = familyService.listChildren(parentId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).username()).isEqualTo("child_y");
    }
}
