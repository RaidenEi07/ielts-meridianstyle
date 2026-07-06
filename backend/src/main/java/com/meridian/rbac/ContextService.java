package com.meridian.rbac;

import com.meridian.common.ApiException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quản lý cây context và cung cấp chuỗi kế thừa (target -> ... -> SYSTEM).
 */
@Service
public class ContextService {

    private final ContextRepository contextRepository;

    public ContextService(ContextRepository contextRepository) {
        this.contextRepository = contextRepository;
    }

    @Transactional(readOnly = true)
    public Context requireSystemContext() {
        return contextRepository.findSystemContext()
                .orElseThrow(() -> ApiException.notFound("Chưa khởi tạo SYSTEM context"));
    }

    public Context getById(Long contextId) {
        return contextRepository.findById(contextId)
                .orElseThrow(() -> ApiException.notFound(
                        "Không tìm thấy context id=" + contextId));
    }

    /**
     * Tạo context mới cho một đối tượng (CATEGORY/COURSE/QUIZ) và gắn vào cây.
     * Nếu đã tồn tại (type, instanceId) thì trả về context hiện có.
     */
    @Transactional
    public Context createContext(ContextType type, Long instanceId, Context parent) {
        return contextRepository.findByTypeAndInstanceId(type, instanceId)
                .orElseGet(() -> {
                    Context ctx = new Context();
                    ctx.setType(type);
                    ctx.setInstanceId(instanceId);
                    ctx.setParent(parent);
                    return contextRepository.save(ctx);
                });
    }

    /**
     * Chuỗi id context từ đích lên gốc, theo thứ tự cụ thể -> tổng quát.
     * Phần tử đầu (index 0) là context cụ thể nhất.
     */
    @Transactional(readOnly = true)
    public List<Long> getInheritanceChainIds(Long contextId) {
        List<Long> chain = new ArrayList<>();
        Context current = getById(contextId);
        int guard = 0;
        while (current != null && guard++ < 64) {
            chain.add(current.getId());
            current = current.getParent();
        }
        return chain;
    }
}
