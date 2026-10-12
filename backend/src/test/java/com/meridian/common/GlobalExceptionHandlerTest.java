package com.meridian.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.sql.SQLException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Kiểm tra bảng ánh xạ lỗi → mã trạng thái. Trước đây catch-all {@code Exception} biến mọi lỗi do người gọi gây
 * ra (sai Content-Type, id không phải số, đường dẫn không có) thành 500.
 */
class GlobalExceptionHandlerTest {

    record Body(@NotBlank(message = "Tên là bắt buộc") @Size(max = 5, message = "Tên tối đa 5 ký tự") String name) {
    }

    @RestController
    static class Probe {
        @GetMapping("/items/{id}")
        String item(@PathVariable long id) {
            return "item " + id;
        }

        @PostMapping("/items")
        String create(@Valid @RequestBody Body body) {
            return "ok " + body.name();
        }

        @GetMapping("/boom")
        String boom() {
            throw new IllegalStateException("secret internal detail");
        }

        @GetMapping("/missing-resource")
        String missingResource() throws Exception {
            throw new NoResourceFoundException(HttpMethod.GET, "/uploads/", "uploads/");
        }

        @GetMapping("/too-long")
        String tooLong() {
            throw new DataIntegrityViolationException("insert failed",
                    new SQLException("value too long for type character varying(150)", "22001"));
        }

        @GetMapping("/duplicate")
        String duplicate() {
            throw new DataIntegrityViolationException("insert failed",
                    new SQLException("duplicate key value violates unique constraint", "23505"));
        }

        @GetMapping("/unknown-integrity")
        String unknownIntegrity() {
            throw new DataIntegrityViolationException("something else");
        }

        @GetMapping("/denied")
        String denied() {
            throw new AccessDeniedException("nope");
        }

        @GetMapping("/api-error")
        String apiError() {
            throw ApiException.notFound("Không tìm thấy khóa học");
        }
    }

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new Probe())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void wrongContentTypeIs415NotServerError() throws Exception {
        mvc.perform(post("/items").contentType(MediaType.TEXT_PLAIN).content("x"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415))
                .andExpect(jsonPath("$.message").value("Định dạng dữ liệu gửi lên không được hỗ trợ"));
    }

    @Test
    void nonNumericPathVariableIs400() throws Exception {
        mvc.perform(get("/items/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void unknownResourceIs404() throws Exception {
        mvc.perform(get("/missing-resource"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"));
    }

    @Test
    void wrongMethodIs405AndKeepsAllowHeader() throws Exception {
        MvcResult result = mvc.perform(get("/items"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405))
                .andReturn();
        assertThat(result.getResponse().getHeader("Allow")).contains("POST");
    }

    @Test
    void validationErrorsListTheFields() throws Exception {
        mvc.perform(post("/items").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"quá dài rồi\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Dữ liệu không hợp lệ"))
                .andExpect(jsonPath("$.details.name").value("Tên tối đa 5 ký tự"));
    }

    @Test
    void unreadableBodyIs400AndDoesNotEchoInternals() throws Exception {
        MvcResult result = mvc.perform(post("/items").contentType(MediaType.APPLICATION_JSON).content("{bad"))
                .andExpect(status().isBadRequest())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        assertThat(body).contains("Body request không hợp lệ");
        assertThat(body).doesNotContain("Unexpected character").doesNotContain("com.meridian");
    }

    @Test
    void emptyBodyIs400() throws Exception {
        mvc.perform(post("/items").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    void valueTooLongFromTheDatabaseIs400() throws Exception {
        mvc.perform(get("/too-long"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Dữ liệu quá dài so với giới hạn cho phép"));
    }

    @Test
    void duplicateKeyIs409() throws Exception {
        mvc.perform(get("/duplicate"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Dữ liệu đã tồn tại"));
    }

    @Test
    void integrityViolationWithoutSqlStateIs409() throws Exception {
        mvc.perform(get("/unknown-integrity")).andExpect(status().isConflict());
    }

    @Test
    void accessDeniedThrownInsideControllerIs403() throws Exception {
        mvc.perform(get("/denied")).andExpect(status().isForbidden());
    }

    @Test
    void apiExceptionKeepsItsStatusAndMessage() throws Exception {
        mvc.perform(get("/api-error"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy khóa học"));
    }

    @Test
    void genuineServerErrorsStayAt500WithoutLeakingTheCause() throws Exception {
        MvcResult result = mvc.perform(get("/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Đã xảy ra lỗi không mong muốn"))
                .andReturn();
        assertThat(result.getResponse().getContentAsString()).doesNotContain("secret internal detail");
        assertThat(HttpStatus.valueOf(result.getResponse().getStatus())).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
