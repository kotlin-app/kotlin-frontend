/**
 * API layer — BFF（localhost:8080）接続
 *
 * エンドポイント:
 *   POST /api/auth/login       → JWT 取得
 *   GET  /api/products         → 商品一覧（X-Client-Type: web）
 *   GET  /api/products/{id}    → 商品詳細＋レビュー（X-Client-Type: web）
 */

const API_BASE = "http://localhost:8080";  // BFFのURL（nginxから別オリジンで呼ぶため明示）
const TOKEN_KEY = "ec_kotlin_jwt";

// ---------- トークン管理 ----------
const auth = {
  getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  setToken(t) {
    try { localStorage.setItem(TOKEN_KEY, t); } catch {}
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  },
  isLoggedIn() { return !!this.getToken(); },
};

// ---------- 共通 fetch ----------
async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = auth.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // 401 はログイン失敗として扱う
    if (res.status === 401) throw new Error("ユーザー名またはパスワードが正しくありません");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

// ---------- ログイン ----------
// BFF レスポンス: { token, username, role, expiresIn }
async function login(username, password) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  auth.setToken(data.token);
  return {
    token: data.token,
    user: {
      username: data.username,
      displayName: data.role === "ADMIN" ? "管理者" : data.username,
      points: 0,
    },
  };
}

// ---------- 商品一覧 ----------
// BFF レスポンス: [{ id, name, price, description, stock, category }]
async function fetchProducts() {
  const list = await request("/api/products", {
    headers: { "X-Client-Type": "web" },
  });
  return list.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    stock: p.stock,
    desc: p.description,
    shop: "コトリマーケット",
    rating: 0,         // 一覧APIでは平均評価なし → 詳細画面で表示
    reviewCount: 0,    // 同上
    shipFree: p.price >= 5000,
    pointRate: 1,
  }));
}

// ---------- 商品詳細 ----------
// BFF レスポンス: { id, name, price, description, stock, category, reviews, avgRating }
// reviews: [{ id, productId, userName, rating, comment }]
async function fetchProduct(id) {
  const data = await request(`/api/products/${id}`, {
    headers: { "X-Client-Type": "web" },
  });
  return {
    id: data.id,
    name: data.name,
    price: data.price,
    category: data.category,
    stock: data.stock,
    desc: data.description,
    shop: "コトリマーケット",
    rating: data.avgRating ?? 0,
    reviewCount: data.reviews?.length ?? 0,
    shipFree: data.price >= 5000,
    pointRate: 1,
    reviews: (data.reviews || []).map(r => ({
      user: r.userName,
      rating: r.rating,
      date: "2026-05-01",
      title: r.comment?.slice(0, 20) || "レビュー",
      body: r.comment || "",
    })),
  };
}

function logout() { auth.clear(); }

// グローバル公開（Babel スコープ用）
Object.assign(window, { ECApi: { login, logout, fetchProducts, fetchProduct, auth } });
