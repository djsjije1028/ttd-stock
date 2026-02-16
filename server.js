const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const DB_PATH = path.join(__dirname, "price.json");
const MAX_HISTORY = 300;

// ✅ 가격 제한(원하면 숫자만 바꾸면 됨)
const START_PRICE = 100000; // 시작가
const MIN_PRICE = 50000;    // 하한(바닥)
const MAX_PRICE = 200000;   // 상한(천장)

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify({ price: START_PRICE, history: [START_PRICE] }, null, 2)
    );
  }
}

function readDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// 가격 조회
app.get("/price", (req, res) => {
  res.json(readDB());
});

// 보기 전용 (사람은 변경 불가)
app.post("/price", (req, res) => {
  return res.status(403).json({ message: "읽기 전용 사이트입니다" });
});

// ✅ 2분마다 자동 변동 + 상한/하한 강제 적용
setInterval(() => {
  try {
    const db = readDB();

    const change = (Math.random() * 4 - 2) / 100; // -2% ~ +2%
    let next = Math.round(db.price * (1 + change));

    // ⭐ 상한/하한 적용(이게 핵심)
    next = Math.max(MIN_PRICE, Math.min(MAX_PRICE, next));

    db.price = next;
    db.history.push(db.price);

    if (db.history.length > MAX_HISTORY) {
      db.history = db.history.slice(-MAX_HISTORY);
    }

    writeDB(db);
    console.log("AUTO PRICE:", db.price);
  } catch (e) {
    console.log("AUTO ERROR:", e.message);
  }
}, 2 * 60 * 1000);

// 기본 페이지
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("서버 실행중 👉 http://localhost:" + PORT);
});
