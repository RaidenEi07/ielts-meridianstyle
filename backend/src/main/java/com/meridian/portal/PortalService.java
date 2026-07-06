package com.meridian.portal;

import com.meridian.catalog.CourseRepository;
import com.meridian.catalog.CourseStatus;
import com.meridian.common.ApiException;
import com.meridian.portal.dto.PortalDtos.InquiryDto;
import com.meridian.portal.dto.PortalDtos.InquiryRequest;
import com.meridian.portal.dto.PortalDtos.PublicStatsDto;
import com.meridian.portal.dto.PortalDtos.TeacherPublicDto;
import com.meridian.rbac.PermissionService;
import com.meridian.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PortalService {

    private final TeacherProfileRepository teacherRepository;
    private final ContactInquiryRepository inquiryRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public PortalService(TeacherProfileRepository teacherRepository,
            ContactInquiryRepository inquiryRepository, CourseRepository courseRepository,
            UserRepository userRepository, PermissionService permissionService) {
        this.teacherRepository = teacherRepository;
        this.inquiryRepository = inquiryRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
    }

    // ---- Public ----

    @Transactional(readOnly = true)
    public List<TeacherPublicDto> featuredTeachers() {
        return teacherRepository.findByFeaturedTrueOrderBySortOrderAscIdAsc().stream()
                .map(TeacherPublicDto::from).toList();
    }

    @Transactional(readOnly = true)
    public PublicStatsDto publicStats() {
        return new PublicStatsDto(
                courseRepository.countByStatus(CourseStatus.PUBLISHED),
                teacherRepository.count(),
                userRepository.count());
    }

    @Transactional
    public InquiryDto createInquiry(InquiryRequest req) {
        ContactInquiry inquiry = new ContactInquiry();
        inquiry.setName(req.name());
        inquiry.setEmail(req.email());
        inquiry.setPhone(req.phone());
        inquiry.setMessage(req.message());
        return InquiryDto.from(inquiryRepository.save(inquiry));
    }

    // ---- Admin ----

    @Transactional(readOnly = true)
    public List<InquiryDto> listInquiries(UUID uid) {
        permissionService.requireSystemCapability(uid, "user:manage");
        return inquiryRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(InquiryDto::from).toList();
    }

    @Transactional
    public InquiryDto updateInquiryStatus(UUID uid, Long id, String status) {
        permissionService.requireSystemCapability(uid, "user:manage");
        ContactInquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy phiếu tư vấn"));
        try {
            inquiry.setStatus(InquiryStatus.valueOf(status.toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Trạng thái không hợp lệ: " + status);
        }
        return InquiryDto.from(inquiryRepository.save(inquiry));
    }
}
