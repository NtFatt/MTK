Đây là kế hoạch thẳng, đầy đủ, theo hướng thực dụng, audit được, khó sai, dễ mở rộng cho phần chấm công dành cho Branch Manager.

Kế hoạch thêm module Chấm công cho Branch Manager
1) Mục tiêu thật

Module này không phải để “điểm danh cho có”.

Mục tiêu đúng là:

Branch Manager biết hôm nay ai đi làm, ai chưa vào, ai đi trễ, ai quên check-out
Có thể xem, duyệt, chỉnh sửa có kiểm soát các bản ghi chấm công trong chi nhánh mình
Gắn chấm công với ca sáng / ca tối
Có audit trail rõ ràng để truy trách nhiệm
Không biến hệ thống thành HRM nặng nề
Không đụng payroll ở giai đoạn này

Nói ngắn gọn: đây là attendance + oversight + correction control, không phải module tính lương.

2) Vị trí module trong hệ thống

Không nên nhét chấm công trực tiếp vào page Staff hiện tại như vài nút phụ.

Thiết kế đúng nên là:

Staff = quản lý tài khoản, role, trạng thái tài khoản
Attendance = chấm công, lịch sử vào/ra, bất thường, chỉnh sửa
Shifts = mở ca, kết ca, bàn giao ca
Payroll = chưa làm
Route đề xuất
/i/:branchId/admin/staff
/i/:branchId/admin/attendance
/i/:branchId/shifts

Nếu muốn gom theo nav nội bộ thì menu nên là:

Staff
Attendance
Shift Management
3) Phạm vi của Branch Manager

Branch Manager được phép làm trong chi nhánh của mình, không được đụng dữ liệu branch khác.

Branch Manager có thể:
xem bảng chấm công hôm nay
xem lịch sử chấm công theo ngày / tuần / tháng
lọc theo nhân viên / role / trạng thái
xác nhận ai đã check-in / check-out
tạo correction khi nhân viên quên check-out
sửa giờ vào / giờ ra có lý do
duyệt bản ghi bất thường
đánh dấu absent
export báo cáo chấm công của chi nhánh
xem log chỉnh sửa
Branch Manager không nên:
sửa chấm công của branch khác
xóa cứng bản ghi chấm công
thay đổi lịch sử mà không để lại audit
tính lương
sửa ca đã khóa nếu không có quyền override cao hơn
4) Những gì module này phải có
4.1. Daily Attendance Board

Đây phải là màn hình chính.

Hiển thị theo ngày và chi nhánh, gồm:

danh sách toàn bộ nhân viên nội bộ thuộc chi nhánh
role
ca dự kiến: sáng / tối
giờ vào
giờ ra
trạng thái
nguồn chấm công
cờ bất thường
người chỉnh sửa cuối
Trạng thái nên có:
NOT_CHECKED_IN
PRESENT
LATE
EARLY_LEAVE
MISSING_CHECKOUT
ABSENT
ON_LEAVE
CORRECTED
Màu trạng thái:
Present: xanh
Late: vàng/cam
Missing checkout: đỏ
Absent: xám đậm / đỏ nhạt
Corrected: tím hoặc badge riêng

Không cần màu mè, nhưng phải nhìn là hiểu ngay.

4.2. Self Check-in / Check-out

Nhân viên nên có cách tự chấm công đơn giản.

Giai đoạn đầu có thể làm theo 2 cách:

Cách A — từ giao diện nội bộ
nhân viên đăng nhập
bấm Check-in
bấm Check-out
Cách B — manager check-in hộ
Branch Manager chọn nhân viên
bấm check-in / check-out hộ
bắt buộc ghi lý do nếu không phải self action

Nguồn chấm công phải lưu rõ:

SELF
MANAGER_MANUAL
AUTO_FROM_SHIFT
CORRECTION
4.3. Attendance Detail Drawer / Modal

Khi bấm vào một bản ghi, phải xem được đầy đủ:

tên nhân viên
username
role
branch
business date
ca dự kiến
check-in time
check-out time
tổng số giờ
trạng thái hiện tại
nguồn chấm công
ghi chú
audit log
correction history

Đây là chỗ Branch Manager xử lý bất thường.

4.4. Correction Flow

Đây là phần bắt buộc, vì thực tế luôn có lỗi.

Các case cần support:

quên check-in
quên check-out
nhập sai giờ
check-in muộn nhưng có lý do hợp lệ
về sớm do được duyệt
nhân viên nghỉ nhưng chưa được đánh dấu
Quy tắc:
correction không sửa đè im lặng
correction phải tạo record chỉnh sửa
luôn lưu:
giá trị cũ
giá trị mới
người sửa
thời điểm sửa
lý do sửa

Nếu không có cái này, attendance sẽ thành dữ liệu rác.

4.5. Exception Queue

Branch Manager rất cần một hàng đợi bất thường.

Danh sách này gom các case:

chưa check-in dù đã quá giờ
đã check-in nhưng chưa check-out quá lâu
check-in ngoài branch
check-in ngoài giờ ca
attendance bị lệch logic
correction đang chờ duyệt
nhân viên có 2 bản ghi mở cùng lúc

Đây là màn giúp manager xử lý nhanh các lỗi vận hành.

4.6. History & Reporting

Cần có màn lịch sử chấm công.

Filter nên có:

ngày
khoảng ngày
nhân viên
role
ca sáng / tối
trạng thái
có correction hay không

Output cần có:

bảng lịch sử
export CSV/Excel
tổng công sơ bộ theo ngày/tuần/tháng

Lưu ý: chỉ là tổng hợp chấm công, chưa phải payroll.

5) Gắn với ca sáng và ca tối như thế nào

Bạn đã chốt hệ thống có 2 ca:

ca sáng
ca tối

Attendance phải gắn được với 2 ca này nhưng không được đồng nhất hoàn toàn với shift run.

Phân biệt chuẩn:
Shift = ca vận hành của chi nhánh/quầy
Attendance = sự có mặt của từng nhân viên

Ví dụ:

Ca sáng branch A mở lúc 08:00
Nhân viên X check-in 07:55 → hợp lệ
Nhân viên Y check-in 08:12 → late
Nhân viên Z absent
Trường cần có trong attendance:
shiftCode: MORNING / EVENING
businessDate
scheduledStart
scheduledEnd
Logic chấm trạng thái:
check-in trước hoặc đúng giờ → PRESENT
check-in sau grace period → LATE
check-out trước ngưỡng cho phép → EARLY_LEAVE
không có checkout đến cuối ngày/ca → MISSING_CHECKOUT
6) Business rules bắt buộc
Rule 1 — Một nhân viên không được có 2 attendance open cùng lúc

Nếu một record chưa checkout thì không được tạo record open thứ hai.

Rule 2 — Chỉ thao tác trong branch của mình

Branch Manager chỉ được xem và sửa attendance của branch mình.

Rule 3 — Check-out không thể sớm hơn check-in

Dữ liệu sai phải bị chặn từ BE, không chỉ FE.

Rule 4 — Attendance đã khóa không được sửa im lặng

Nếu đã qua cutoff hoặc đã được manager duyệt cuối ngày, muốn sửa phải đi qua correction flow.

Rule 5 — Late / Early leave dùng ngưỡng cấu hình

Ví dụ:

grace late = 10 phút
early leave threshold = 10 phút

Không hard-code chết trong UI.

Rule 6 — Attendance phải theo business date

Đặc biệt ca tối kéo qua nửa đêm vẫn phải thuộc đúng businessDate của ngày vận hành.

Rule 7 — Không xóa cứng

Chỉ được:

disable logic
mark corrected
retain history
7) Cấu trúc dữ liệu đề xuất
7.1. Attendance Record

Các trường chính nên có:

id
branchId
staffId
businessDate
shiftCode
scheduledStartAt
scheduledEndAt
checkInAt
checkOutAt
status
source
note
lateMinutes
earlyLeaveMinutes
workedMinutes
isCorrected
lastCorrectedAt
lastCorrectedBy
version
createdAt
updatedAt
7.2. Attendance Correction Log
id
attendanceId
changedBy
oldCheckInAt
newCheckInAt
oldCheckOutAt
newCheckOutAt
oldStatus
newStatus
reason
createdAt
7.3. Optional Attendance Policy

Theo branch:

lateGraceMinutes
earlyLeaveGraceMinutes
autoMarkAbsentAfterMinutes
autoMarkMissingCheckoutAt
allowManagerManualAttendance
lockCorrectionAfterHours
8) Thiết kế UI đề xuất
8.1. Attendance Overview Page

Đây là màn chính của Branch Manager.

Header
chọn ngày
chọn ca: tất cả / sáng / tối
search nhân viên
filter role
filter trạng thái
nút refresh
export
KPI strip
tổng nhân viên dự kiến
đã check-in
chưa check-in
đi trễ
quên check-out
absent
Main table

Cột nên có:

nhân viên
role
ca
check-in
check-out
worked time
trạng thái
source
bất thường
action
Row actions
xem chi tiết
check-in hộ
check-out hộ
tạo correction
mark absent
thêm ghi chú
8.2. Attendance Detail Drawer

Khi chọn một người:

thông tin nhân viên
timeline check-in/check-out
status badge
late/early metrics
correction history
audit history
action buttons
8.3. Exception Queue Tab

Tab riêng để manager xử lý nhanh.

Các nhóm:

Missing check-in
Missing check-out
Late arrivals
Early leaves
Needs correction
Cross-branch/invalid cases
8.4. Employee Attendance History Page

Khi vào profile nhân viên:

lịch sử 7 ngày / 30 ngày
tổng số ngày đi làm
số ngày đi trễ
số lần correction
số lần absent

Rất hữu ích cho quản lý, mà chưa cần đụng payroll.

9) Hardening bắt buộc

Đây là phần không được bỏ.

9.1. Idempotency

Các action nhạy cảm phải có idempotency:

manager check-in hộ
manager check-out hộ
create correction
approve correction
mark absent

Không có cái này là double-click ra dữ liệu rác.

9.2. Optimistic locking

Attendance record phải có version.

Nếu manager đang mở detail mà có người khác chỉnh record đó trước:

action tiếp theo phải fail mềm
báo stale
yêu cầu refetch
9.3. Cross-branch isolation

Không cho manager nhìn thấy hay suy ra data branch khác.

Nếu truy cập sai branch:

trả 403
UI báo generic
không leak “record có tồn tại hay không”
9.4. Audit trail

Mọi action chỉnh attendance đều phải log:

ai làm
lúc nào
từ đâu đến đâu
lý do gì
9.5. Timezone / business date

Phải đồng nhất timezone theo branch/system.
Không được để FE tự đoán ngày rồi BE hiểu kiểu khác.

9.6. Anti-overlap

Không cho hai bản ghi attendance open trên cùng staff.

9.7. Soft lock cuối ngày

Sau một mốc giờ hoặc sau khi manager review cuối ngày:

record bị khóa chỉnh sửa thường
muốn sửa phải qua correction flow
10) API proposal

Vì repo đang theo contract-lock, phần này chỉ nên là đề xuất contract mới, không tự code bừa trước.

Endpoints đề xuất
Attendance listing

GET /api/v1/admin/attendance

Query:

branchId
date
shiftCode
status
staffId
q
Attendance detail

GET /api/v1/admin/attendance/:attendanceId

Self check-in

POST /api/v1/attendance/check-in

Self check-out

POST /api/v1/attendance/check-out

Manager manual check-in

POST /api/v1/admin/attendance/:staffId/check-in

Manager manual check-out

POST /api/v1/admin/attendance/:staffId/check-out

Create correction

POST /api/v1/admin/attendance/:attendanceId/corrections

Update/approve correction

PATCH /api/v1/admin/attendance/:attendanceId/corrections/:correctionId

Mark absent

POST /api/v1/admin/attendance/:staffId/mark-absent

Attendance history by staff

GET /api/v1/admin/staff/:staffId/attendance

Export attendance

GET /api/v1/admin/attendance/export

11) FE architecture đề xuất
API layer
attendanceApi.ts
Query hooks
useAttendanceListQuery.ts
useAttendanceDetailQuery.ts
useStaffAttendanceHistoryQuery.ts
Mutation hooks
useCheckInMutation.ts
useCheckOutMutation.ts
useManualAttendanceMutation.ts
useAttendanceCorrectionMutation.ts
useMarkAbsentMutation.ts
Components
AttendanceToolbar
AttendanceKpiStrip
AttendanceTable
AttendanceStatusBadge
AttendanceDetailDrawer
AttendanceCorrectionModal
AttendanceExceptionPanel
StaffAttendanceHistoryCard
12) Realtime có nên có không

Có, nhưng chỉ ở mức hợp lý.

Nên có:
update khi staff vừa check-in
update khi staff vừa check-out
update khi manager vừa correction
badge “mới thay đổi”
Không cần vẽ quá:
animation loạn
realtime từng giây
thứ không giúp manager ra quyết định

Room có thể theo branch:

ops:{branchId}
hoặc
attendance:{branchId} nếu backend mở room riêng sau này

Nếu chưa có contract thì vẫn chạy tốt bằng invalidate/refetch.

13) Các case khó phải xử lý
nhân viên quên check-out
nhân viên check-in trễ nhưng được duyệt
staff đổi role giữa ngày
nhân viên đăng nhập được nhưng attendance chưa open
manager sửa attendance cùng lúc với admin
ca tối kéo qua 00:00
nhân viên được tạo attendance ở nhầm branch
check-in rồi logout trình duyệt
refresh trang giữa lúc correction
2 manager cùng sửa 1 bản ghi
mạng chập chờn làm double-submit
nhân viên nghỉ nhưng chưa được mark absent
14) Những gì không nên làm ngay

Không nên kéo module này đi quá xa ở giai đoạn đầu.

Chưa nên làm:
payroll
OT calculation phức tạp
nghỉ phép full HRM
bảo hiểm / hợp đồng lao động
geofence/GPS phức tạp
face recognition

Giai đoạn này chỉ nên làm:

attendance chắc
manager oversight chắc
correction chắc
audit chắc
15) Kế hoạch triển khai theo phase
Phase 1 — Attendance foundation

Mục tiêu:

tạo record chấm công
self check-in/check-out
daily attendance board cho manager
filter cơ bản
trạng thái cơ bản

Deliver:

list page
check-in/check-out
status mapping
chi nhánh isolation
Phase 2 — Manager controls

Mục tiêu:

manager check-in/out hộ
mark absent
detail drawer
exception queue

Deliver:

action panel
exception filters
audit log cơ bản
Phase 3 — Correction & hardening

Mục tiêu:

correction flow
optimistic locking
idempotency
soft lock cuối ngày
history per staff

Deliver:

correction modal
correction logs
stale protection
branch-safe UX
Phase 4 — Reporting & polish

Mục tiêu:

export attendance
KPI strip
lịch sử tuần/tháng
realtime invalidate/update
empty/loading/error states đẹp và rõ

Deliver:

export
summary cards
better feedback UX
16) Acceptance criteria

Chỉ được coi là xong khi đạt tối thiểu:

Branch Manager chỉ thấy attendance của chi nhánh mình
Nhân viên không thể có 2 attendance open cùng lúc
Check-out không thể nhỏ hơn check-in
Late / missing checkout được nhận diện đúng
Manager sửa attendance phải có lý do và có audit
Correction không ghi đè im lặng
Attendance của ca tối qua ngày vẫn thuộc đúng business date
List, filter, history chạy ổn
Không double-submit khi chấm công hoặc correction
Trường hợp stale data được xử lý sạch
17) Definition of Done

Module này chỉ được gọi là ổn khi:

dùng được hàng ngày cho Branch Manager
dữ liệu attendance không dễ vỡ
có exception handling tử tế
audit đủ để giải trình
không leak cross-branch
không bị nhầm với payroll
UI đủ nhanh để manager xử lý trong giờ vận hành
18) Chốt cuối

Thiết kế đúng cho phần này là:

Attendance là module riêng
Branch Manager là người giám sát và chỉnh sửa có kiểm soát
Staff vẫn chỉ là account management
Shift vẫn là module ca vận hành riêng
Không nhảy sang payroll lúc này

Đây là hướng vừa đủ mạnh, vừa sạch kiến trúc, vừa hợp với web hiện tại. Nếu cần, mình chốt tiếp luôn bản PR breakdown chi tiết theo file, API, component, state.