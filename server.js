// ===============================
// 필수 모듈
// ===============================
const express = require("express");
const fs = require("fs");
const path = require("path");

// ===============================
// Express 앱 생성
// ===============================
const app = express();

// ===============================
// 포트 설정 (배포 대응)
// ===============================
const PORT = process.env.PORT || 3000;

// ===============================
// 미들웨어
// ===============================
app.use(express.json());
app.use(express.static("public"));

// ===============================
// 파일 DB 설정
// ===============================
const DB_PATH = path.join(__dirname, "price.json");
const MAX_HISTORY = 300;

// DB 파일 보장
function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify({ price: 100000, history: [100000] }, null, 2)
    );
  }
}

// DB 읽기
function readDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

// DB 쓰기
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ===============================
// API
// ===============================

// 가격 조회 (외부 가능)
app.get("/price", (req, res) => {
  res.json(readDB());
});

// 가격 변경 (사람 조작 불가: 보기 전용)
app.post("/price", (req, res) => {
  return res.status(403).json({ message: "읽기 전용 사이트입니다" });
});

// ===============================
// 서버 자동 가격 변동 (⏱️ 2분)
// ===============================
setInterval(() => {
  try {
    const db = readDB();
    const change = (Math.random() * 4 - 2) / 100; // -2% ~ +2%
    db.price = Math.max(1, Math.round(db.price * (1 + change)));
    db.history.push(db.price);

    if (db.history.length > MAX_HISTORY) {
      db.history = db.history.slice(-MAX_HISTORY);
    }

    writeDB(db);
    console.log("AUTO PRICE:", db.price);
  } catch (e) {
    console.log("AUTO ERROR:", e.message);
  }
}, 2 * 60 * 1000); // ⭐ 2분마다

// ===============================
// 기본 페이지
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// 서버 시작
// ===============================
app.listen(PORT, () => {
  console.log("서버 실행중 👉 http://localhost:" + PORT);
});
