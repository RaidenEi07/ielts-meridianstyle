@AGENTS.md

# Gắn `data-testid` để chỉ đúng vị trí lỗi

Tailwind là utility-class, nên `class="fixed bottom-0 left-0 z-20 border-t ..."` không
nói lên đây là thành phần nào — khó mô tả/tìm khi báo lỗi. Gắn thêm `data-testid`
(không dùng để style, chỉ để có tên tra cứu được, và tiện sẵn cho việc viết test
E2E sau này):

- Component riêng (function/export có tên) → `data-testid="TênComponent"`, khớp
  y hệt tên function — không cần đặt tên riêng, không lệch khi đổi tên component.
- Một vùng rõ rệt trong 1 component/trang lớn mà KHÔNG tách thành component
  riêng (thanh audio, header phòng thi, nav dưới cùng...) →
  `data-testid="ten-vung-kebab-case"`, mô tả ngắn gọn bằng tiếng Anh.
- Phần tử lặp lại trong danh sách → thêm hậu tố id/index để phân biệt từng cái,
  vd `data-testid={`quiz-option-${option.id}`}`.

Không cần dọn lại toàn bộ code cùng lúc — thêm cho component mới khi viết, và
tiện tay thêm cho code cũ mỗi khi đang sửa nó vì lý do khác.
