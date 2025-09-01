# 🐍 Snake Game v2.5 (reward) – Con rắn săn mồi (Nokia vibes)

Open source MIT – Chủ sở hữu: **Zweyx** • Developers: **Gen 2k14** • Cập nhật: **30/08/2025**

🔗 Repo: https://github.com/manhtien-2k14/Snake-game

🔗 Test & Link : snake-game-k3vo.onrender.com

Game con rắn cổ điển viết bằng HTML5 Canvas + CSS3 + JavaScript thuần. Nhanh, mượt và dễ tùy biến.

## ✨ Tính năng

- 🎮 Điều khiển mượt mà: phím mũi tên hoặc vuốt trên mobile
- 🍎 Hệ thống điểm số & lưu kỷ lục (localStorage)
- 📈 Tăng tốc theo cấp: nhanh dần mỗi 5 điểm
- ⏸️ Tạm dừng/tiếp tục, 🔄 chơi lại nhanh
- 🎨 UI glass morphism, hỗ trợ ánh xạ grid tinh tế
- ⚙️ Settings: chỉnh ngôn ngữ (VI/EN), giao diện (Dark/Light), độ khó, bản đồ, kích thước ô, tốc độ
- 🧱 Obstacles & Map: từ độ khó Medium trở lên, hỗ trợ các map Classic/Box/Cross
- 📱 Responsive: desktop và mobile

## 🎯 Cách chơi

1) Bắt đầu: Nhấn nút "Bắt đầu" hoặc phím R
2) Điều khiển: ⬆️⬇️⬅️➡️ trên desktop; vuốt theo hướng trên mobile
3) Mục tiêu: Ăn thức ăn đỏ để tăng điểm và lớn dần
4) Tránh: Đừng chạm tường hoặc thân rắn
5) Tạm dừng: phím Space hoặc nút "Tạm dừng"

## 🚀 Cách chạy

- Mở trực tiếp file `index.html` trong trình duyệt
- Hoặc chạy server tĩnh:
  ```bash
  # Python
  python -m http.server 8000

  # Node.js (serve)
  npx serve .

  # Node.js (Render-compatible) – binds 0.0.0.0 and PORT env
  npm install --production
  npm start
  ```

## 🛠️ Cấu trúc

```
Snake-game/
├── index.html
├── style.css
├── script.js
├── LICENSE
└── README.md
```

## 🎨 Thiết kế

- Màu sắc: gradient tím-xám + glass morphism
- Font: system-ui, đậm rõ, có bóng chữ nhẹ
- Animation: hiệu ứng pulse khi ăn thức ăn
- Responsive: co giãn theo màn hình

## ⌨️ Phím tắt

- ⬆️⬇️⬅️➡️ – Di chuyển
- Space – Tạm dừng/Tiếp tục
- R – Bắt đầu game mới

## 📱 Mobile

- Swipe gesture để điều khiển
- Tối ưu cho portrait và landscape

## 🔧 Tùy chỉnh nhanh

- Tốc độ: thay `speedMs` trong `script.js`
- Kích thước grid: thay `gridSize` trong `script.js`
- Màu sắc: cập nhật trong `style.css`

## 🤝 Đóng góp

- PRs luôn hoan nghênh! Hãy mở issue/PR nếu có ý tưởng hoặc bug.

## 📄 License

MIT © 2025 Zweyx. Xem file [LICENSE](./LICENSE).

---

Chúc bạn chơi vui! 🎮🐍✨
