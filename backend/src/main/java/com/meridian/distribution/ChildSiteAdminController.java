package com.meridian.distribution;

import com.meridian.distribution.dto.ChildSiteDtos.ChildSiteDto;
import com.meridian.distribution.dto.ChildSiteDtos.CreateChildSite;
import com.meridian.distribution.dto.ChildSiteDtos.UpdateChildSite;
import com.meridian.security.CurrentUserProvider;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChildSiteAdminController {

    private final ChildSiteService service;
    private final CurrentUserProvider currentUser;

    public ChildSiteAdminController(ChildSiteService service, CurrentUserProvider currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    private UUID uid() {
        return currentUser.require().id();
    }

    @GetMapping("/api/admin/child-sites")
    public List<ChildSiteDto> list() {
        return service.list(uid());
    }

    @PostMapping("/api/admin/child-sites")
    public ResponseEntity<ChildSiteDto> create(@Valid @RequestBody CreateChildSite req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(uid(), req));
    }

    @PutMapping("/api/admin/child-sites/{id}")
    public ChildSiteDto update(@PathVariable Long id, @RequestBody UpdateChildSite req) {
        return service.update(uid(), id, req);
    }

    @DeleteMapping("/api/admin/child-sites/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(uid(), id);
        return ResponseEntity.noContent().build();
    }
}
