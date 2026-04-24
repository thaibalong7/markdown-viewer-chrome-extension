# Hướng dẫn cú pháp Gherkin (Cucumber)

Tài liệu tóm tắt cú pháp Gherkin dùng trong tệp `.feature` (và tương đương trong fence ` ```gherkin` / ` ```cucumber` khi bật plugin Gherkin trong Markdown Plus). Tham chiếu chuẩn: [Cucumber — Gherkin Reference](https://cucumber.io/docs/gherkin/reference/).

---

## 1. Vai trò và vòng đời

- **Gherkin** là ngôn ngữ mô tả hành vi theo mẫu **BDD** (Behavior-Driven Development).
- Mỗi dòng bắt đầu bằng **từ khóa** (hoặc `*`) hoặc là **bảng** / **chuỗi nhiều dòng** / **ghi chú**.
- Parser (ví dụ `@cucumber/gherkin`) tạo **cây cú pháp**; runner Cucumber tạo **pickles** (các tình huống chạy thực tế) từ kịch bản hợp lệ.

---

## 2. Tệp tính năng (`.feature`) — tổng quan cấu trúc

Thứ tự logic thường gặp (từ trên xuống):

1. (Tuỳ chọn) **Ghi chú** `# ...`
2. (Tuỳ chọn) **`# language: <mã_ngôn_ngữ>`** — khai báo phương ngữ từ khóa
3. (Tuỳ chọn) **Thẻ (tags)** trước `Feature:`
4. Dòng **`Feature:`** (bắt buộc ở cấp tệp chuẩn)
5. (Tuỳ chọn) **Mô tả tự do** nhiều dòng dưới `Feature:`
6. (Tuỳ chọn) **`Background:`** — các bước chung cho mọi kịch bản phía dưới
7. Một hoặc nhiều: **`Rule:`**, **`Scenario:`**, hoặc **`Scenario Outline:`**
8. Trong mỗi kịch bản: các **bước (steps)**; với *Outline* thêm khối **`Examples:`** có bảng

---

## 3. Từ khóa chính (tiếng Anh mặc định)

| Từ khóa | Mục đích |
|--------|-----------|
| `Feature` | Tên tính năng cấp cao, nhóm mọi thứ trong file. |
| `Rule` (Gherkin 6+) | Nhóm các kịch bản theo quy tắc nghiệp vụ. |
| `Background` | Các bước lặp lại trước mỗi `Scenario` (trong cùng `Feature` / theo cấu trúc cho phép). |
| `Scenario` | Một tình huống cụ thể. |
| `Scenario Outline` | Khuôn mẫu chạy nhiều lần với tập dữ liệu từ `Examples`. |
| `Examples` | Bảng tham số hóa cho `Scenario Outline`. |
| `Given` | Mô tả **bối cảnh** / trạng thái ban đầu. |
| `When` | **Hành động** hoặc sự kiện. |
| `Then` | **Kết quả** / kỳ vọng. |
| `And`, `But` | Lặp lại bước cùng loại với bước trước (Given/When/Then). |
| `*` | Bước trung tính (có thể xử lý tuỳ step definition). |

**Quy ước thụt dòng:** Gherkin **không** bắt buộc khoảng trắng đầu dòng theo nghĩa ngữ pháp, nhưng **convention** là thụt 2 khoảng cho nội dung con (Scenario, bước) để dễ đọc.

---

## 4. Dòng chữ (`Feature:`, `Scenario:`, v.v.)

- Sau dấu `:` thường có **dấu cách** rồi tên / tiêu đề ngắn.
- Nhiều dòng mô tả tự do có thể theo **ngay sau** tên, không cần từ khóa, cho đến khi gặp dòng bắt đầu bằng từ khóa cấp khác hoặc gặp bảng/chuỗi đặc biệt (tuỳ parser).

Ví dụ tối thiểu hợp lệ:

```gherkin
Feature: Đăng nhập
  Tài liệu mô tả tự do
  nhiều dòng ở đây

  Scenario: Đăng nhập thành công
    Given tôi đang ở trang login
    When tôi nhập tài khoản hợp lệ
    Then tôi thấy trang chính
```

---

## 5. Thẻ (Tags)

- Dạng: `@tên` trên dòng riêng, thường **ngay trên** `Feature`, `Rule`, `Scenario` / `Scenario Outline`, `Examples`.
- Có thể dùng nhiều thẻ trên cùng khối.

```gherkin
@smoke @auth
Feature: Auth

@wip
Scenario: Tình huống chưa xong
  Given …
```

---

## 6. `Background`

- Chứa các bước chạy **trước mỗi** `Scenario` (trong phạm vi cho phép — thường cùng `Feature` sau mô tả, trước các scenario).
- Không dùng `Background` bên trong `Rule` ở một số cấu hình: tuỳ phiên bản/grammar; cách an toàn là đặt `Background` ngay dưới `Feature` theo tài liệu Cucumber cho phiên bản bạn dùng.

```gherkin
Feature: Giỏ hàng

  Background:
    Given user đã đăng nhập
    And giỏ hàng đang trống

  Scenario: Thêm sản phẩm
    When …
    Then …
```

---

## 7. `Rule` (Gherkin 6+)

- Nhóm kịch bản theo quy tắc, có tên (và mô tả) giống `Feature`/`Scenario`.

```gherkin
Feature: Thanh toán

  Rule: Không vượt hạn mức
    Scenario: Từ chối khi vượt hạn
      Given hạn mức còn 100
      When tôi thanh toán 200
      Then hệ thống từ chối
```

---

## 8. `Scenario` và `Scenario Outline`

### Scenario thường

```gherkin
Scenario: Tiêu đề ngắn
  Given …
  When …
  Then …
```

### Scenario Outline + Examples

- Dùng **placeholder** trong bước: `<TênCột>`.
- Khối `Examples:` có **bảng**: dòng đầu là tên cột, các dòng sau là giá trị.

```gherkin
Scenario Outline: Đăng nhập với nhiều cặp tài khoản
  Given tài khoản <username> tồn tại
  When tôi đăng nhập với <username> và <password>
  Then tôi thấy thông báo <message>

  Examples:
    | username | password | message     |
    | u1       | p1       | Thành công  |
    | u2       | bad      | Sai mật khẩu |
```

Có thể có **nhiều** khối `Examples` cho cùng một `Scenario Outline`.

---

## 9. Các bước (Steps)

- Cú pháp: **Từ khóa** + **cách** + phần còn lại (mô tả tự nhiên).
- `And` / `But` lặp lại kiểu bước gần nhất (cùng nhóm ngữ nghĩa).
- Một số công cụ hỗ trợ từ khóa tương đương theo phương ngữ (xem mục 14).

```gherkin
Given tôi có 3 sản phẩm trong giỏ
When tôi áp mã giảm giá "SALE10"
Then tổng giảm 10%
And tổng sau giảm là 90
But không áp dụng cho sản phẩm loại A
* bước tùy biến nếu framework cho phép
```

---

## 10. Bảng dữ liệu (Data Table)

- Gắn với bước: các dòng bắt đầu bằng `|`, lề trái thụt so với bước.
- Dùng cho tham số dạng bảng; ô phân tách bằng `|`.

```gherkin
Given các sản phẩm sau:
  | tên  | giá  |
  | A    | 1000 |
  | B    | 2000 |
```

Trong bảng **Examples**, dòng tiêu đề cột bắt buộc để ánh xạ placeholder.

---

## 11. Doc String (chuỗi nhiều dòng)

- Dùng cho văn bản dài: JSON, XML, payload, mô tả nhiều dòng.
- Mở/đóng bằng dấu `"""` hoặc ```` ``` ` (delimiter có thể cấu hình); mức thụt dòng phải thống nhất.

```gherkin
Given payload JSON:
  """
  { "a": 1, "b": 2 }
  """
```

Có thể thêm dòng mô tả kiểu nội dung (một số phiên bản hỗ trợ) — xem tài liệu Cucumber tương ứng.

---

## 12. Ghi chú (Comments)

- Bất kỳ dòng nào bắt đầu bằng `#` (sau khoảng trắng tùy chọn) là ghi chú, kéo dài đến hết dòng.
- Có thể đặt ở cuối dòng mã, nhưng nên tránh nếu dễ gây lỗi đọc.

```gherkin
# Tính năng cần test trước release
Feature: Báo cáo
```

---

## 13. Header ngôn ngữ phương ngữ từ khóa (Dialects)

- Dòng **đầu tiên** (hoặc sau BOM) dạng:

```gherkin
# language: vi
```

- Cho phép dùng từ khóa tiếng Việt (nếu định nghĩa trong gói `gherkin-languages` / tệp liên kết) thay vì `Feature`/`Given`/…
- Cần đúng mã phương ngữ mà công cụ hỗ trợ (ví dụ `en`, `vi` tuỳ bản cài).

---

## 14. Tương thích với Markdown Plus

- Bật plugin **Gherkin (Cucumber)** trong cài đặt extension, viết trong fence:

  ````markdown
  ```gherkin
  Feature: …
    Scenario: …
      Given …
  ```
  ````

- Nội dung phải **hợp lệ theo parser**; nếu thiếu `Feature:` / `Scenario:` (khi cần), sẽ báo lỗi parse.
- Giao diện viewer dựa trên **AST**, không bảo toàn từng khoảng trắng đầu dòng giống file gốc; cấp bậc thể hiện bằng cách bố cục HTML/CSS, không bắt chước 1-1 từng dấu cách nguồn.

---

## 15. Tham chiếu ngoài (đào sâu)

- [Gherkin — Cucumber](https://cucumber.io/docs/gherkin/)  
- [Step definitions & Cucumber expressions](https://cucumber.io/docs/cucumber/api/)  
- [Lược đồ messages / pickle](https://github.com/cucumber/messages) (khi tích hợp công cụ chạy test)

Nếu bạn cần tài liệu song ngữ từng từ khóa theo từng mã `language:` cụ thể, hãy trích từ bản cài `@cucumber/gherkin` (tệp `gherkin-languages.json` trong gói) hoặc từ tài liệu phiên bản Cucumber bạn dùng.
