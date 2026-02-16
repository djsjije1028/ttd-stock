const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const ADMIN_PATH = "/admin-secret-ttd";
const ADMIN_PASSWORD = "ttd1234";

const PRICE_FILE = "price.json";

// --------------------
// 가격 로드 / 저장
// --------------------
function loadPrice() {
  if (!fs.existsSync(PRICE_FILE)) {
    fs.writeFileSync(
      PRICE_FILE,
      JSON.stringify({ price: 100000, history: [100000] }, null, 2)
    );
  }
  return JSON.parse(fs.readFileSync(PRICE_FILE));
}

function savePrice(data) {
  fs.writeFileSync(PRICE_FILE, JSON.stringify(data, null, 2));
}

let priceData = loadPrice();

// --------------------
// 자동 변동 (2분)
// --------------------
setInterval(() => {
  const changeRate = (Math.random() * 4 - 2) / 100; // -2% ~ +2%
  let newPrice = Math.round(priceData.price * (1 + changeRate));

  // 최소 / 최대 제한
  newPrice = Math.max(50000, Math.min(1000000, newPrice));

  priceData.price = newPrice;
  priceData.history.push(newPrice);
  savePrice(priceData);

  console.log("자동 변동:", newPrice);
}, 120000); // 2분

// --------------------
// 가격 조회 (모두 가능)
// --------------------
app.get("/price", (req, res) => {
  res.json(priceData);
});

// ====================
// 관리자 로그인
// ====================
app.get(ADMIN_PATH, (req, res) => {
  res.send(`
    <h2>TTD 관리자 로그인</h2>
    <input type="password" id="pw" placeholder="비밀번호"/>
    <button onclick="login()">로그인</button>
    <p id="msg"></p>

    <script>
      async function login() {
        const pw = document.getElementById("pw").value;
        const r = await fetch("${ADMIN_PATH}/login", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ password: pw })
        });
        const d = await r.json();
        if (d.ok) location.href = "${ADMIN_PATH}/panel";
        else document.getElementById("msg").innerText = "❌ 비밀번호 틀림";
      }
    </script>
  `);
});

app.post(ADMIN_PATH + "/login", (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.json({ ok: false });
  }
});

// ====================
// 관리자 패널
// ====================
app.get(ADMIN_PATH + "/panel", (req, res) => {
  res.send(`
    <h2>TTD 관리자 패널</h2>
    <p>현재가: <span id="p"></span></p>

    <button onclick="change(1000)">+1,000</button>
    <button onclick="change(-1000)">-1,000</button>
    <button onclick="change(10000)">+10,000</button>
    <button onclick="change(-10000)">-10,000</button>

    <script>
      async function load() {
        const r = await fetch("/price");
        const d = await r.json();
        document.getElementById("p").innerText =
          d.price.toLocaleString();
      }
      async function change(v) {
        await fetch("${ADMIN_PATH}/change", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ delta: v })
        });
        load();
      }
      load();
    </script>
  `);
});

app.post(ADMIN_PATH + "/change", (req, res) => {
  const delta = Number(req.body.delta || 0);
  priceData.price += delta;
  priceData.history.push(priceData.price);
  savePrice(priceData);
  res.json({ ok: true });
});

// --------------------
app.listen(PORT, () => {
  console.log("서버 실행중 👉 http://localhost:" + PORT);
});
