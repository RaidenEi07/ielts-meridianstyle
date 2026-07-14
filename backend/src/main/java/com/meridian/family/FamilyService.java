package com.meridian.family;

import com.meridian.auth.AuthService;
import com.meridian.auth.dto.AuthResponse;
import com.meridian.common.ApiException;
import com.meridian.family.dto.ChildProfileDto;
import com.meridian.family.dto.CreateChildRequest;
import com.meridian.user.User;
import com.meridian.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Phụ huynh quản lý hồ sơ con và chuyển sang học cùng con — không cần mật khẩu của con. */
@Service
public class FamilyService {

    private static final String CHILD_ROLE = "student";

    private final ParentChildProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    public FamilyService(ParentChildProfileRepository profileRepository,
            UserRepository userRepository, AuthService authService) {
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @Transactional
    public ChildProfileDto createChildProfile(UUID parentId, CreateChildRequest request) {
        User parent = userRepository.findById(parentId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy phụ huynh"));

        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        User child = authService.createUserAccount(
                "child_" + suffix, "child+" + suffix + "@meridian.local",
                UUID.randomUUID().toString(), request.fullName());
        authService.assignRole(child, CHILD_ROLE);

        ParentChildProfile profile = new ParentChildProfile();
        profile.setParent(parent);
        profile.setChild(child);
        profileRepository.save(profile);

        return ChildProfileDto.from(child);
    }

    @Transactional(readOnly = true)
    public List<ChildProfileDto> listChildren(UUID parentId) {
        return profileRepository.findByParentId(parentId).stream()
                .map(p -> ChildProfileDto.from(p.getChild()))
                .toList();
    }

    @Transactional
    public void deleteChildProfile(UUID parentId, UUID childId) {
        profileRepository.deleteByParentIdAndChildId(parentId, childId);
    }

    @Transactional(readOnly = true)
    public AuthResponse switchToChild(UUID parentId, UUID childId) {
        if (!profileRepository.existsByParentIdAndChildId(parentId, childId)) {
            throw ApiException.forbidden("Hồ sơ con này không thuộc quyền quản lý của bạn");
        }
        User child = userRepository.findById(childId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy hồ sơ con"));
        return authService.issueTokensForUser(child);
    }
}
