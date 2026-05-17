/* global React, ReactDOM, ECApi */
const { useState, useEffect, useMemo, useCallback, useRef } = React;
const { login: apiLogin, logout: apiLogout, fetchProducts, fetchProduct, postReview, createOrder, fetchMyOrders,
        fetchWishlist, addToWishlist, removeFromWishlist,
        adminListProducts, adminCreateProduct, adminUpdateProduct, adminUpdateStock, adminDeleteProduct, auth: apiAuth } = ECApi;

// ============================================================
// Utilities
// ============================================================
const fmtYen = (n) => "¥" + n.toLocaleString("ja-JP");
const yenSplit = (n) => ({ num: n.toLocaleString("ja-JP"), yen: "円" });
const calcPoints = (price, rate) => Math.floor(price * (rate || 1) / 100);

const CATEGORY_GLYPHS = {
  "家電": "🔌", "日用品": "🧺", "スポーツ": "🏃", "食品": "☕",
  "ファッション": "👕", "本": "📖", "コスメ": "💄",
};
const glyphFor = (cat) => CATEGORY_GLYPHS[cat] || "📦";

function Stars({ value, size = 13 }) {
  const v = Math.round(value * 2) / 2;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (v >= i) stars.push("★");
    else if (v >= i - 0.5) stars.push("⯨");
    else stars.push("☆");
  }
  // Use simple unicode stars; "⯨" not widely supported, fallback approach
  return (
    <span className="stars-row" style={{ fontSize: size }} aria-label={`${value}/5`}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{
          color: i <= Math.floor(v) ? "var(--accent)" :
                 (i - 0.5 === v ? "var(--accent)" : "#dcdcdc"),
        }}>
          {i <= Math.floor(v) ? "★" : (i - 0.5 === v ? "★" : "★")}
        </span>
      ))}
    </span>
  );
}

// More accurate stars with half-fill using CSS clip
function StarRow({ value, size = 14 }) {
  const pct = Math.max(0, Math.min(5, value)) / 5 * 100;
  return (
    <span style={{ position: "relative", display: "inline-block", fontSize: size, letterSpacing: "-1px", lineHeight: 1 }}>
      <span style={{ color: "#dcdcdc" }}>★★★★★</span>
      <span style={{
        position: "absolute", left: 0, top: 0, overflow: "hidden",
        width: pct + "%", color: "var(--accent)", whiteSpace: "nowrap",
      }}>★★★★★</span>
    </span>
  );
}

// ============================================================
// Shared header (for list/detail)
// ============================================================
function Topbar() {
  const links = ["ランキング", "デイリーセール", "ファッション", "グルメ", "クーポン", "ギフト", "コトリ24", "ヘルプ"];
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="topbar-nav">
          {links.map(l => <a key={l} href="#" onClick={e => e.preventDefault()}>{l}</a>)}
        </div>
        <div className="topbar-spacer" />
        <div className="topbar-right">
          <a href="#" onClick={e => e.preventDefault()}>サービス一覧</a>
          <a href="#" onClick={e => e.preventDefault()}>Global ▾</a>
          <a href="#" onClick={e => e.preventDefault()}>出店する</a>
        </div>
      </div>
    </div>
  );
}

function Header({ user, onSearch, onLogoClick, onLogout, query, setQuery, cartCount = 0, onCartClick, onOrdersClick, onWishlistClick, wishlistCount = 0, onAdminClick }) {
  const categories = ["すべて", "家電", "日用品", "スポーツ", "食品", "ファッション", "本", "コスメ", "ペット", "おもちゃ", "車・バイク"];
  return (
    <>
      <Topbar />
      <header className="header" data-screen-label="header">
        <div className="header-main">
          <a href="#" className="brand" onClick={e => { e.preventDefault(); onLogoClick && onLogoClick(); }}>
            <div className="brand-mark">K</div>
            <div className="brand-text">
              <strong>Kotori</strong>
              <span>M A R K E T</span>
            </div>
          </a>
          <form className="search" onSubmit={e => { e.preventDefault(); onSearch && onSearch(query); }}>
            <input
              type="text"
              placeholder="商品名・ブランド・型番から探す"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button type="submit" aria-label="検索">🔍</button>
          </form>
          <div className="header-actions">
            <button className="header-action" title="買い物かご" onClick={onCartClick}>
              <div className="icon">🛒</div>
              {cartCount > 0 && <div className="badge">{cartCount}</div>}
              <span>買い物かご</span>
            </button>
            <button className="header-action" title="お知らせ">
              <div className="icon">🔔</div>
              <div className="badge">3</div>
              <span>お知らせ</span>
            </button>
            <button className="header-action" title="閲覧履歴">
              <div className="icon">🕘</div>
              <span>閲覧履歴</span>
            </button>
            <button className="header-action" title="お気に入り">
              <div className="icon">☆</div>
              <span>お気に入り</span>
            </button>
          </div>
        </div>
      </header>

      {user && (
        <div className="userbar">
          <div className="userbar-inner">
            <div className="userbar-medal">D</div>
            <div className="userbar-name">{user.displayName}さん</div>
            <div className="userbar-points">保有ポイント<strong>{(user.points || 0).toLocaleString()}</strong>pt</div>
            <div className="userbar-divider" />
            <div className="userbar-points">利用可能 <strong style={{ fontSize: 14 }}>0</strong></div>
            <div className="userbar-points" style={{ color: "var(--ink-3)" }}>うち期間限定 <strong style={{ fontSize: 14, color: "var(--ink-2)" }}>0</strong></div>
            <div className="userbar-spacer" />
            <button className="userbar-link" onClick={onOrdersClick}>注文履歴</button>
            {user?.role === "ADMIN" && <>
              <div className="userbar-divider" />
              <button className="userbar-link" onClick={onAdminClick}>管理者パネル</button>
            </>}
            <div className="userbar-divider" />
            <button className="userbar-link" onClick={onLogout}>ログアウト</button>
          </div>
        </div>
      )}

      <div className="category-strip">
        <div className="category-strip-inner">
          {categories.map((c, i) => (
            <a key={c} href="#" className={i === 0 ? "active" : ""} onClick={e => e.preventDefault()}>{c}</a>
          ))}
        </div>
      </div>
    </>
  );
}

// ============================================================
// Footer
// ============================================================
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-cols">
          <div className="footer-col">
            <h4>ご利用ガイド</h4>
            <ul>
              <li><a href="#">はじめての方へ</a></li>
              <li><a href="#">注文方法</a></li>
              <li><a href="#">支払い方法</a></li>
              <li><a href="#">配送について</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>サービス</h4>
            <ul>
              <li><a href="#">コトリポイント</a></li>
              <li><a href="#">コトリカード</a></li>
              <li><a href="#">プレミアム会員</a></li>
              <li><a href="#">ギフトカード</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>会社情報</h4>
            <ul>
              <li><a href="#">運営会社</a></li>
              <li><a href="#">採用情報</a></li>
              <li><a href="#">プレスリリース</a></li>
              <li><a href="#">IR情報</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>お困りの方へ</h4>
            <ul>
              <li><a href="#">ヘルプセンター</a></li>
              <li><a href="#">お問い合わせ</a></li>
              <li><a href="#">利用規約</a></li>
              <li><a href="#">プライバシーポリシー</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-copyright">
          © 2026 Kotori Market — Kotlin × Spring Boot Microservices Demo
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// Login Screen
// ============================================================
function LoginScreen({ onLoggedIn }) {
  const [step, setStep] = useState("id"); // "id" or "pw"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const idRef = useRef(null);
  const pwRef = useRef(null);

  useEffect(() => {
    if (step === "id") idRef.current?.focus();
    else pwRef.current?.focus();
  }, [step]);

  const submitId = (e) => {
    e.preventDefault();
    setError(null);
    if (!username.trim()) { setError("ユーザーIDを入力してください"); return; }
    setStep("pw");
  };

  const submitPw = async (e) => {
    e.preventDefault();
    setError(null);
    if (!password) { setError("パスワードを入力してください"); return; }
    setLoading(true);
    try {
      const data = await apiLogin(username.trim(), password);
      onLoggedIn(data.user);
    } catch (err) {
      setError(err.message || "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const fillTest = (u, p) => {
    setUsername(u); setPassword(p);
    setStep("pw"); setError(null);
  };

  return (
    <div className="login-page" data-screen-label="01 Login">
      <div className="login-header">
        <a href="#" className="brand" onClick={e => e.preventDefault()}>
          <div className="brand-mark">K</div>
          <div className="brand-text">
            <strong>Kotori</strong>
            <span>M A R K E T</span>
          </div>
        </a>
      </div>

      <div className="login-main">
        <div className="login-card">
          <div className="login-notice">
            <div className="info-icon">i</div>
            <div>
              コトリIDログイン時に送信される通知メールについて。<a href="#" onClick={e => e.preventDefault()}>詳細 ›</a>
            </div>
          </div>

          {step === "id" ? (
            <>
              <h1>会員ログイン</h1>
              <p className="sub">ユーザーIDのご入力</p>

              {error && (
                <div className="error-banner" role="alert">
                  <span className="err-icon">!</span><span>{error}</span>
                </div>
              )}

              <form onSubmit={submitId}>
                <div className="field">
                  <label htmlFor="username">ユーザIDまたはメールアドレス<span className="req">（必須）</span></label>
                  <input
                    ref={idRef}
                    id="username" type="text" autoComplete="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className={error ? "error" : ""}
                  />
                </div>
                <button type="submit" className="btn-primary">次へ</button>
              </form>

              <div className="login-links">
                <a href="#" onClick={e => e.preventDefault()}>個人情報保護方針</a>
                <span style={{ color: "var(--ink-4)" }}>に同意してログイン</span>
              </div>

              <div className="login-divider">or</div>

              <button className="btn-outline" onClick={e => e.preventDefault()}>会員登録（無料）</button>

              <div className="login-links">
                <a href="#" onClick={e => e.preventDefault()}>パスワードをお忘れの方 ›</a>
              </div>
            </>
          ) : (
            <>
              <h1>ようこそ <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: 16 }}>{username}</span></h1>
              <p className="sub">パスワードのご入力</p>

              {error && (
                <div className="error-banner" role="alert">
                  <span className="err-icon">!</span><span>{error}</span>
                </div>
              )}

              <form onSubmit={submitPw}>
                <div className="field">
                  <label htmlFor="password">パスワード<span className="req">（必須）</span></label>
                  <input
                    ref={pwRef}
                    id="password" type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={error ? "error" : ""}
                  />
                  <label className="show-pw">
                    <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} />
                    パスワードを表示する
                  </label>
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "ログイン中…" : "ログイン"}
                </button>
              </form>

              <div className="login-links">
                <a href="#" onClick={e => e.preventDefault()}>パスワードをお忘れの方 ›</a>
                <a href="#" onClick={e => { e.preventDefault(); setStep("id"); setPassword(""); setError(null); }}>別のIDでログイン ›</a>
              </div>
            </>
          )}

          <div className="test-accounts">
            <strong>🔧 テストアカウント（クリックで入力）</strong>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <code onClick={() => fillTest("admin", "admin123")}>admin / admin123</code>
              <code onClick={() => fillTest("user", "user123")}>user / user123</code>
            </div>
          </div>
        </div>
      </div>

      <div className="login-footer">
        ヘルプ ・ 個人情報保護方針 ・ 会員規約　|　© Kotori Market
      </div>
    </div>
  );
}

// ============================================================
// Product Card
// ============================================================
function ProductCard({ p, onClick, isFav, onToggleFav }) {
  const stockTag =
    p.stock === 0 ? { cls: "tag-stock-out", text: "在庫切れ" } :
    p.stock < 30 ? { cls: "tag-stock-low", text: `残り${p.stock}点` } :
    { cls: "tag-stock-ok", text: `在庫${p.stock}` };

  return (
    <div className="card" onClick={() => onClick(p.id)} role="button" tabIndex={0}
         onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick(p.id)}>
      <div className="card-img">
        {p.shipFree && <div className="ribbon">送料無料</div>}
        <div className="point-badge">P<strong>+{p.pointRate || 1}</strong>倍</div>
        <div className="card-glyph">{glyphFor(p.category)}</div>
        {p.stock === 0 && <div className="sold-out">SOLD OUT</div>}
      </div>
      <div className="card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div className="card-shop"><span className="shop-dot">K</span>{p.shop}</div>
          {onToggleFav && (
            <button className={`wishlist-btn ${isFav ? "active" : ""}`}
              onClick={e => { e.stopPropagation(); onToggleFav(p.id); }}
              title={isFav ? "お気に入りから削除" : "お気に入りに追加"}
            >{isFav ? "★" : "☆"}</button>
          )}
        </div>
        <h3 className="card-name">{p.name}</h3>
        <div className="card-rating">
          <StarRow value={p.rating} />
          <span className="rating-num">{p.rating.toFixed(2)}</span>
          <span className="review-count">({p.reviewCount.toLocaleString()})</span>
        </div>
        <div className="card-price">
          <span className="price-num">{p.price.toLocaleString()}</span>
          <span className="yen">円</span>
        </div>
        <div className="card-meta">
          <span className="tag tag-cat">{p.category}</span>
          <span className={`tag ${stockTag.cls}`}>{stockTag.text}</span>
          {p.shipFree && <span className="tag tag-ship">送料無料</span>}
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="card" style={{ pointerEvents: "none" }}>
      <div className="card-img skeleton" />
      <div className="card-body">
        <div className="skeleton" style={{ height: 10, width: "40%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 14, marginBottom: 4 }} />
        <div className="skeleton" style={{ height: 14, width: "70%", marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 24, width: "50%", marginTop: "auto" }} />
      </div>
    </div>
  );
}

// ============================================================
// Product List Screen
// ============================================================
function ProductListScreen({ user, onSelect, onLogout, query, setQuery, onSearch, cartCount, onCartClick, onOrdersClick, onWishlistClick, wishlist, onToggleWishlist }) {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("すべて");
  const [sort, setSort] = useState("recommended");
  const [activeQuery, setActiveQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceOpen, setPriceOpen] = useState(false);

  const loadProducts = useCallback((q, cat, min, max) => {
    setError(null); setProducts(null);
    fetchProducts({
      q: q || undefined,
      category: cat && cat !== "すべて" ? cat : undefined,
      minPrice: min ? parseInt(min) : undefined,
      maxPrice: max ? parseInt(max) : undefined,
    })
      .then(setProducts)
      .catch(e => setError(e.message));
  }, []);

  useEffect(() => { loadProducts("", "すべて", "", ""); }, []);

  const handleSearch = (q) => {
    setActiveQuery(q);
    loadProducts(q, category, minPrice, maxPrice);
    onSearch && onSearch(q);
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    loadProducts(activeQuery, cat, minPrice, maxPrice);
  };

  const handlePriceFilter = () => {
    loadProducts(activeQuery, category, minPrice, maxPrice);
    setPriceOpen(false);
  };

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = [...products];
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "reviews") list.sort((a, b) => b.reviewCount - a.reviewCount);
    return list;
  }, [products, sort]);

  const cats = ["すべて", "家電", "日用品", "スポーツ", "食品", "ファッション", "本", "コスメ"];

  return (
    <div data-screen-label="02 Product List">
      <Header
        user={user}
        query={query}
        setQuery={setQuery}
        onSearch={handleSearch}
        onLogout={onLogout}
        cartCount={cartCount}
        onCartClick={onCartClick}
        onOrdersClick={onOrdersClick}
        onWishlistClick={onWishlistClick}
        wishlistCount={wishlist ? wishlist.size : 0}
      />

      <div className="page">
        <div className="breadcrumb">
          <a href="#" onClick={e => e.preventDefault()}>ホーム</a>
          <span className="sep">›</span>
          <span>商品一覧</span>
          {category !== "すべて" && (<><span className="sep">›</span><span>{category}</span></>)}
        </div>

        <div className="page-banner">
          <div className="page-banner-badge">KOTORI POINTS</div>
          <div>
            <h2>{user?.displayName || "ゲスト"}さんは今ポイント<span className="pts">3.5</span>倍</h2>
            <p>会員ランクとエントリーで、もっとおトクに。期間中の対象商品ご購入で最大18倍。</p>
          </div>
        </div>

        <div className="toolbar">
          <div className="result-count">
            {products
              ? <>該当 <strong>{filtered.length.toLocaleString()}</strong> 件</>
              : <>読み込み中…</>}
          </div>
          <div className="toolbar-spacer" />
          <div className="toolbar-filters">
            {cats.map(c => (
              <button
                key={c}
                className={`chip ${category === c ? "active" : ""}`}
                onClick={() => handleCategoryChange(c)}
              >{c}</button>
            ))}
            <div style={{ position: "relative" }}>
              <button className={`chip ${(minPrice || maxPrice) ? "active" : ""}`} onClick={() => setPriceOpen(o => !o)}>
                価格帯 {(minPrice || maxPrice) ? `(¥${minPrice||"0"}〜¥${maxPrice||"∞"})` : ""}
              </button>
              {priceOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#fff",
                              border: "1px solid var(--border)", borderRadius: 8, padding: 12, zIndex: 100,
                              boxShadow: "0 4px 16px rgba(0,0,0,.12)", display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="number" placeholder="最安値" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                      style={{ width: 90, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6 }} />
                    <span>〜</span>
                    <input type="number" placeholder="最高値" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                      style={{ width: 90, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-primary" style={{ flex: 1, padding: "6px 0", fontSize: 13 }} onClick={handlePriceFilter}>適用</button>
                    <button className="chip" style={{ flex: 1, padding: "6px 0", fontSize: 13 }} onClick={() => { setMinPrice(""); setMaxPrice(""); loadProducts(activeQuery, category, "", ""); setPriceOpen(false); }}>クリア</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="recommended">おすすめ順</option>
            <option value="price-asc">価格が安い順</option>
            <option value="price-desc">価格が高い順</option>
            <option value="rating">評価が高い順</option>
            <option value="reviews">レビュー数順</option>
          </select>
        </div>

        {error && (
          <div className="error-banner"><span className="err-icon">!</span>{error}</div>
        )}

        <div className="grid">
          {!products
            ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            : filtered.length === 0
              ? <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px", color: "var(--ink-3)" }}>
                  該当する商品が見つかりませんでした
                </div>
              : filtered.map(p => <ProductCard key={p.id} p={p} onClick={onSelect} isFav={wishlist && wishlist.has(p.id)} onToggleFav={onToggleWishlist} />)
          }
        </div>
      </div>

      <Footer />
    </div>
  );
}

// ============================================================
// Product Detail Screen
// ============================================================
function ProductDetailScreen({ id, user, onBack, onLogout, query, setQuery, onSearch, onAddToCart, cartCount, onCartClick }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [qty, setQty] = useState(1);
  const [activeThumb, setActiveThumb] = useState(0);
  const [fav, setFav] = useState(false);
  const [favShop, setFavShop] = useState(false);
  const [toast, setToast] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null); setError(null);
    fetchProduct(id)
      .then(d => { if (alive) setData(d); })
      .catch(e => { if (alive) setError(e.message); });
    window.scrollTo({ top: 0, behavior: "instant" });
    return () => { alive = false; };
  }, [id]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  // Build histogram from reviews
  const histo = useMemo(() => {
    if (!data) return null;
    const buckets = [0, 0, 0, 0, 0]; // 5..1
    data.reviews.forEach(r => { buckets[5 - r.rating] = (buckets[5 - r.rating] || 0) + 1; });
    const max = Math.max(1, ...buckets);
    return buckets.map((c, i) => ({ stars: 5 - i, count: c, pct: (c / max) * 100 }));
  }, [data]);

  return (
    <div data-screen-label="03 Product Detail">
      <Header
        user={user}
        query={query}
        setQuery={setQuery}
        onSearch={onSearch}
        onLogoClick={onBack}
        onLogout={onLogout}
        cartCount={cartCount}
        onCartClick={onCartClick}
      />

      <div className="page">
        <div className="breadcrumb">
          <a href="#" onClick={e => { e.preventDefault(); onBack(); }}>ホーム</a>
          <span className="sep">›</span>
          <a href="#" onClick={e => { e.preventDefault(); onBack(); }}>商品一覧</a>
          {data && (<><span className="sep">›</span><span>{data.category}</span></>)}
          {data && (<><span className="sep">›</span><span style={{ color: "var(--ink-2)" }}>{data.name.slice(0, 20)}…</span></>)}
        </div>

        {error && <div className="error-banner"><span className="err-icon">!</span>{error}</div>}

        {!data ? (
          <div className="detail-grid">
            <div>
              <div className="skeleton" style={{ aspectRatio: "1/1", borderRadius: 6 }} />
              <div className="thumbs">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: "1/1" }} />)}
              </div>
            </div>
            <div>
              <div className="skeleton" style={{ height: 24, marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 24, width: "70%", marginBottom: 18 }} />
              <div className="skeleton" style={{ height: 80, marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 48 }} />
            </div>
          </div>
        ) : (
          <>
            <div className="detail-grid">
              <div className="detail-gallery">
                <div className="main-img">
                  <div className="card-glyph">{glyphFor(data.category)}</div>
                </div>
                <div className="thumbs">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`thumb ${i === activeThumb ? "active" : ""}`}
                      onClick={() => setActiveThumb(i)}
                    >{glyphFor(data.category)}</div>
                  ))}
                </div>
              </div>

              <div className="detail-info">
                <div className="shop-line">
                  <span className="shop-dot" style={{ background: "var(--brand)", color: "#fff" }}>K</span>
                  {data.shop}
                </div>
                <h1 className="detail-title">{data.name}</h1>

                <div className="detail-rating">
                  <StarRow value={data.rating} size={18} />
                  <span className="rating-num">{data.rating.toFixed(2)}</span>
                  <a href="#reviews" className="review-count" onClick={e => {
                    e.preventDefault();
                    const el = document.getElementById("reviews");
                    if (el) window.scrollTo({ top: el.offsetTop - 20, behavior: "smooth" });
                  }}>({data.reviewCount.toLocaleString()}件)</a>
                </div>

                <div className="detail-price-block">
                  <div className="detail-price">
                    <span className="price-num">{data.price.toLocaleString()}</span>
                    <span className="yen">円</span>
                    <span className="tax">（税込）</span>
                  </div>
                  <div className="detail-ship">
                    {data.shipFree ? <><span className="free">送料無料</span> ・ 最短翌日お届け</> : "送料: 全国一律 660円"}
                  </div>
                  <div className="detail-points">
                    ポイント <strong>{calcPoints(data.price, data.pointRate)}</strong>pt（{data.pointRate}倍）獲得
                  </div>
                </div>

                <div className="meta-row">
                  <div className="meta-pill">カテゴリ: <strong>{data.category}</strong></div>
                  <div className="meta-pill">
                    在庫:&nbsp;
                    <strong style={{ color: data.stock === 0 ? "var(--brand)" : data.stock < 30 ? "#b66a00" : "var(--success)" }}>
                      {data.stock === 0 ? "在庫切れ" : `${data.stock}点`}
                    </strong>
                  </div>
                  <div className="meta-pill">商品番号: <strong>KM-{String(data.id).padStart(6, "0")}</strong></div>
                </div>

                <div className="qty-row">
                  <label>数量</label>
                  <div className="qty-control">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} disabled={data.stock === 0}>−</button>
                    <input
                      value={qty}
                      onChange={e => {
                        const n = parseInt(e.target.value.replace(/\D/g, "") || "1", 10);
                        setQty(Math.max(1, Math.min(data.stock || 1, n)));
                      }}
                    />
                    <button onClick={() => setQty(q => Math.min(data.stock || 1, q + 1))} disabled={data.stock === 0}>+</button>
                  </div>
                </div>

                <div className="cta-row">
                  <button
                    className="btn-cart"
                    disabled={data.stock === 0}
                    onClick={() => {
                      onAddToCart && onAddToCart(data, qty);
                      showToast(`「${data.name.slice(0, 20)}」をかごに追加しました`);
                    }}
                  >
                    <span>⊕</span> かごに追加
                  </button>
                  <button
                    className="btn-buy"
                    disabled={data.stock === 0}
                    onClick={() => { onAddToCart && onAddToCart(data, qty); onCartClick && onCartClick(); }}
                  >
                    <span>🛒</span> 購入手続きへ
                  </button>
                </div>

                <div className="fav-row">
                  <button className={`fav-btn ${fav ? "active" : ""}`} onClick={() => setFav(f => !f)}>
                    {fav ? "★" : "☆"} お気に入り商品
                  </button>
                  <button className={`fav-btn ${favShop ? "active" : ""}`} onClick={() => setFavShop(f => !f)}>
                    {favShop ? "★" : "☆"} お気に入りショップ
                  </button>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>商品説明</h3>
              <div className="desc-body">{data.desc}</div>
            </div>

            <div className="detail-section">
              <h3>商品仕様</h3>
              <table className="spec-table">
                <tbody>
                  <tr><th>商品番号</th><td>KM-{String(data.id).padStart(6, "0")}</td></tr>
                  <tr><th>カテゴリ</th><td>{data.category}</td></tr>
                  <tr><th>販売価格</th><td>{fmtYen(data.price)}（税込）</td></tr>
                  <tr><th>在庫数</th><td>{data.stock === 0 ? "現在お取り扱いがありません" : `${data.stock}点`}</td></tr>
                  <tr><th>販売店</th><td>{data.shop}</td></tr>
                  <tr><th>配送</th><td>{data.shipFree ? "全国送料無料 / 最短翌日着" : "全国一律 660円"}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="detail-section" id="reviews">
              <h3>レビュー（{data.reviews.length}件）</h3>

              <div className="reviews-summary">
                <div className="reviews-big">
                  <div className="big-num">{data.rating.toFixed(2)}</div>
                  <div className="big-stars"><StarRow value={data.rating} size={16} /></div>
                  <div className="big-count">{data.reviewCount.toLocaleString()}件のレビュー</div>
                </div>
                <div className="histo">
                  {histo && histo.map(h => (
                    <div className="histo-row" key={h.stars}>
                      <span>★ {h.stars}</span>
                      <div className="histo-bar"><div style={{ width: h.pct + "%" }} /></div>
                      <span>{h.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {data.reviews.map((r, i) => (
                <div className="review-item" key={i}>
                  <div className="review-head">
                    <div className="review-user">
                      <div className="review-avatar">{r.user.charAt(0).toUpperCase()}</div>
                      <span>{r.user}</span>
                    </div>
                    <span className="review-stars"><StarRow value={r.rating} size={14} /></span>
                    <span className="review-date">{r.date}</span>
                  </div>
                  <div className="review-title">{r.title}</div>
                  <p className="review-body">{r.body}</p>
                </div>
              ))}

              <div className="review-form-box">
                <h4 style={{ margin: "0 0 12px", fontSize: 15 }}>レビューを書く</h4>
                {reviewError && <div className="error-banner" style={{ marginBottom: 10 }}><span className="err-icon">!</span>{reviewError}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: "var(--ink-2)" }}>評価:</span>
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setReviewForm(f => ({ ...f, rating: s }))}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, lineHeight: 1,
                               color: s <= reviewForm.rating ? "var(--accent)" : "#dcdcdc" }}>★</button>
                  ))}
                  <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{reviewForm.rating}/5</span>
                </div>
                <textarea
                  placeholder="商品の感想を入力してください（必須）"
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  rows={3}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)",
                           fontFamily: "inherit", fontSize: 14, resize: "vertical", boxSizing: "border-box" }}
                />
                <button
                  className="btn-primary"
                  style={{ marginTop: 10, padding: "8px 24px" }}
                  disabled={reviewSubmitting || !reviewForm.comment.trim()}
                  onClick={async () => {
                    if (!reviewForm.comment.trim()) return;
                    setReviewSubmitting(true); setReviewError(null);
                    try {
                      await postReview(id, reviewForm.rating, reviewForm.comment.trim());
                      setReviewForm({ rating: 5, comment: "" });
                      showToast("レビューを投稿しました");
                      // 再フェッチで一覧を更新
                      const updated = await fetchProduct(id);
                      setData(updated);
                    } catch(e) { setReviewError(e.message); }
                    finally { setReviewSubmitting(false); }
                  }}
                >
                  {reviewSubmitting ? "投稿中…" : "投稿する"}
                </button>
              </div>
            </div>

            <div className="back-row">
              <button className="back-link" onClick={onBack}>← 一覧に戻る</button>
              <button
                className="back-link"
                onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); }}
              >トップへ ↑</button>
            </div>
          </>
        )}
      </div>

      <Footer />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ============================================================
// Cart Screen
// ============================================================
function CartScreen({ user, cart, onUpdateQty, onRemove, onBack, onLogout, onOrderComplete, cartCount, onCartClick }) {
  const [ordering, setOrdering] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const total = cart.reduce((s, item) => s + item.product.price * item.quantity, 0);

  const handleOrder = async () => {
    if (cart.length === 0) return;
    setOrdering(true);
    setError(null);
    try {
      for (const item of cart) {
        await createOrder(item.product.id, item.quantity, item.product.price * item.quantity);
      }
      setDone(true);
      setTimeout(() => { onOrderComplete && onOrderComplete(); }, 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div data-screen-label="04 Cart">
      <Header user={user} onLogout={onLogout} query="" setQuery={() => {}} onLogoClick={onBack}
              cartCount={cartCount} onCartClick={onCartClick} />
      <div className="page">
        <div className="breadcrumb">
          <a href="#" onClick={e => { e.preventDefault(); onBack(); }}>ホーム</a>
          <span className="sep">›</span><span>買い物かご</span>
        </div>

        <h2 style={{ margin: "16px 0", fontSize: 20 }}>買い物かご（{cart.length}点）</h2>

        {done ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ color: "var(--success)", marginBottom: 8 }}>注文が完了しました！</h3>
            <p style={{ color: "var(--ink-3)" }}>注文履歴から確認できます</p>
          </div>
        ) : cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-3)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
            <p>かごに商品がありません</p>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={onBack}>商品を見る</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
            <div>
              {cart.map(item => (
                <div key={item.product.id} style={{
                  display: "flex", gap: 16, padding: 16, marginBottom: 12,
                  border: "1px solid var(--border)", borderRadius: 8, background: "#fff"
                }}>
                  <div style={{
                    width: 80, height: 80, background: "var(--surface-2)", borderRadius: 6,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0
                  }}>{glyphFor(item.product.category)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.product.name}</div>
                    <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 8 }}>{item.product.shop}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="qty-control" style={{ transform: "scale(0.85)", transformOrigin: "left" }}>
                        <button onClick={() => onUpdateQty(item.product.id, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                        <input value={item.quantity} readOnly style={{ width: 40 }} />
                        <button onClick={() => onUpdateQty(item.product.id, item.quantity + 1)}>+</button>
                      </div>
                      <button onClick={() => onRemove(item.product.id)}
                        style={{ background: "none", border: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: 13 }}>
                        削除
                      </button>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {(item.product.price * item.quantity).toLocaleString()}<span style={{ fontSize: 13 }}>円</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                      {item.product.price.toLocaleString()}円 × {item.quantity}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 20, background: "#fff", position: "sticky", top: 16 }}>
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>注文内容</h3>
              {cart.map(item => (
                <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: "var(--ink-2)" }}>{item.product.name.slice(0, 14)}…×{item.quantity}</span>
                  <span>{(item.product.price * item.quantity).toLocaleString()}円</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18 }}>
                  <span>合計</span><span>{total.toLocaleString()}円</span>
                </div>
              </div>
              {error && <div className="error-banner" style={{ marginTop: 12 }}><span className="err-icon">!</span>{error}</div>}
              <button className="btn-buy" style={{ width: "100%", marginTop: 16 }}
                onClick={handleOrder} disabled={ordering}>
                {ordering ? "注文処理中…" : "注文を確定する"}
              </button>
              <button className="back-link" style={{ width: "100%", textAlign: "center", marginTop: 8 }} onClick={onBack}>
                買い物を続ける
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

// ============================================================
// Order History Screen
// ============================================================
function OrderHistoryScreen({ user, onBack, onLogout, cartCount, onCartClick }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .catch(e => setError(e.message));
  }, []);

  const statusLabel = { PENDING: "処理中", CONFIRMED: "確定", CANCELLED: "キャンセル済", SHIPPED: "発送済", DELIVERED: "配達完了" };
  const statusColor = { PENDING: "#b66a00", CONFIRMED: "var(--success)", CANCELLED: "var(--ink-3)" };

  return (
    <div data-screen-label="05 Order History">
      <Header user={user} onLogout={onLogout} query="" setQuery={() => {}} onLogoClick={onBack}
              cartCount={cartCount} onCartClick={onCartClick} />
      <div className="page">
        <div className="breadcrumb">
          <a href="#" onClick={e => { e.preventDefault(); onBack(); }}>ホーム</a>
          <span className="sep">›</span><span>注文履歴</span>
        </div>
        <h2 style={{ margin: "16px 0", fontSize: 20 }}>注文履歴</h2>

        {error && <div className="error-banner"><span className="err-icon">!</span>{error}</div>}

        {!orders ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-3)" }}>読み込み中…</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-3)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p>注文履歴がありません</p>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={onBack}>商品を見る</button>
          </div>
        ) : (
          <div>
            {orders.map(o => (
              <div key={o.id} style={{
                border: "1px solid var(--border)", borderRadius: 8, padding: 16,
                marginBottom: 12, background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>注文番号: KM-{String(o.id).padStart(6, "0")}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 4 }}>
                    商品ID: {o.productId} ／ 数量: {o.quantity}点
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                    {o.createdAt ? new Date(o.createdAt).toLocaleString("ja-JP") : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                    {Number(o.totalPrice).toLocaleString()}円
                  </div>
                  <div style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                    background: statusColor[o.status] + "22", color: statusColor[o.status]
                  }}>
                    {statusLabel[o.status] || o.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

// ============================================================
// Wishlist Screen
// ============================================================
function WishlistScreen({ user, wishlist, onToggleWishlist, onSelect, onBack, onLogout, cartCount, onCartClick, onAdminClick }) {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!wishlist || wishlist.size === 0) { setProducts([]); return; }
    fetchProducts()
      .then(all => setProducts(all.filter(p => wishlist.has(p.id))))
      .catch(e => setError(e.message));
  }, [wishlist]);

  return (
    <div data-screen-label="Wishlist">
      <Header user={user} onLogout={onLogout} query="" setQuery={() => {}} onLogoClick={onBack}
              cartCount={cartCount} onCartClick={onCartClick} onAdminClick={onAdminClick} />
      <div className="page">
        <div className="breadcrumb">
          <a href="#" onClick={e => { e.preventDefault(); onBack(); }}>ホーム</a>
          <span className="sep">›</span><span>お気に入り</span>
        </div>
        <h2 style={{ margin: "16px 0 20px", fontSize: 20 }}>お気に入り商品（{wishlist ? wishlist.size : 0}件）</h2>

        {error && <div className="error-banner"><span className="err-icon">!</span>{error}</div>}

        {products === null ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-3)" }}>読み込み中…</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink-3)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>☆</div>
            <p>お気に入り商品がありません</p>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={onBack}>商品を見る</button>
          </div>
        ) : (
          <div className="grid">
            {products.map(p => (
              <ProductCard key={p.id} p={p} onClick={onSelect}
                isFav={wishlist.has(p.id)} onToggleFav={onToggleWishlist} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

// ============================================================
// Admin Screen
// ============================================================
const CATEGORIES = ["家電", "日用品", "スポーツ", "食品", "ファッション", "本", "コスメ"];
const EMPTY_FORM = { name: "", price: "", description: "", stock: "", category: "家電" };

function AdminScreen({ user, onBack, onLogout, cartCount, onCartClick }) {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stockEdit, setStockEdit] = useState({});

  const reload = () => {
    adminListProducts().then(setProducts).catch(e => setError(e.message));
  };
  useEffect(reload, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const data = { ...form, price: parseInt(form.price), stock: parseInt(form.stock) };
      if (editId) await adminUpdateProduct(editId, data);
      else await adminCreateProduct(data);
      setForm(EMPTY_FORM); setEditId(null); reload();
    } catch(ex) { setError(ex.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("本当に削除しますか？")) return;
    try { await adminDeleteProduct(id); reload(); }
    catch(ex) { setError(ex.message); }
  };

  const handleStockSave = async (id) => {
    try { await adminUpdateStock(id, parseInt(stockEdit[id])); reload(); setStockEdit(s => ({ ...s, [id]: undefined })); }
    catch(ex) { setError(ex.message); }
  };

  return (
    <div data-screen-label="Admin">
      <Header user={user} onLogout={onLogout} query="" setQuery={() => {}} onLogoClick={onBack}
              cartCount={cartCount} onCartClick={onCartClick} />
      <div className="page">
        <div className="breadcrumb">
          <a href="#" onClick={e => { e.preventDefault(); onBack(); }}>ホーム</a>
          <span className="sep">›</span><span>管理者パネル</span>
        </div>
        <h2 style={{ margin: "16px 0 20px", fontSize: 20 }}>商品管理</h2>

        {error && <div className="error-banner"><span className="err-icon">!</span>{error}</div>}

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>{editId ? "商品を編集" : "商品を追加"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="admin-form-row">
              <label>商品名<input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: 200 }} /></label>
              <label>価格(円)<input required type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={{ width: 100 }} /></label>
              <label>在庫数<input required type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} style={{ width: 80 }} /></label>
              <label>カテゴリ
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label style={{ flexGrow: 1 }}>説明
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} style={{ width: "100%", minWidth: 300 }} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" type="submit" disabled={saving} style={{ padding: "7px 20px" }}>
                {saving ? "保存中…" : editId ? "更新" : "追加"}
              </button>
              {editId && <button type="button" className="chip" onClick={() => { setEditId(null); setForm(EMPTY_FORM); }}>キャンセル</button>}
            </div>
          </form>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "auto" }}>
          {!products ? <div style={{ padding: 20, color: "var(--ink-3)" }}>読み込み中…</div> : (
            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>商品名</th><th>カテゴリ</th><th>価格</th><th>在庫</th><th>操作</th></tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: "var(--ink-3)" }}>KM-{String(p.id).padStart(4, "0")}</td>
                    <td style={{ fontWeight: 600, maxWidth: 180 }}>{p.name}</td>
                    <td><span className="tag tag-cat">{p.category}</span></td>
                    <td>{p.price.toLocaleString()}円</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="number" value={stockEdit[p.id] ?? p.stock}
                          onChange={e => setStockEdit(s => ({ ...s, [p.id]: e.target.value }))}
                          style={{ width: 64, padding: "3px 6px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 13 }} />
                        {stockEdit[p.id] !== undefined && stockEdit[p.id] != p.stock && (
                          <button className="btn-primary" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => handleStockSave(p.id)}>保存</button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="chip" style={{ fontSize: 12, padding: "3px 10px" }}
                          onClick={() => { setEditId(p.id); setForm({ name: p.name, price: String(p.price), description: p.description || "", stock: String(p.stock), category: p.category }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          編集
                        </button>
                        <button style={{ fontSize: 12, padding: "3px 10px", background: "none", border: "1px solid #e53", color: "#e53", borderRadius: 20, cursor: "pointer" }}
                          onClick={() => handleDelete(p.id)}>
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ============================================================
// Root App — simple router
// ============================================================
function App() {
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState({ name: "login" });
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState(new Set());

  useEffect(() => {
    if (apiAuth.isLoggedIn()) {
      setUser({ username: "user", displayName: "ユーザー", points: 21645 });
      setRoute({ name: "list" });
    }
  }, []);

  const onLoggedIn = (u) => {
    setUser(u);
    setRoute({ name: "list" });
    fetchWishlist().then(ids => setWishlist(new Set((ids || []).map(Number)))).catch(() => {});
  };
  const onLogout = () => { apiLogout(); setUser(null); setRoute({ name: "login" }); setQuery(""); setCart([]); setWishlist(new Set()); };
  const onSelect = (id) => setRoute({ name: "detail", id });
  const onBack = () => setRoute({ name: "list" });
  const onCartClick = () => setRoute({ name: "cart" });
  const onOrdersClick = () => setRoute({ name: "orders" });
  const onAdminClick = () => setRoute({ name: "admin" });

  const addToCart = (product, quantity) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      return [...prev, { product, quantity }];
    });
  };

  const updateQty = (productId, qty) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.product.id !== productId)); return; }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.product.id !== productId));

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const toggleWishlist = (productId) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
        removeFromWishlist(productId).catch(() => {});
      } else {
        next.add(productId);
        addToWishlist(productId).catch(() => {});
      }
      return next;
    });
  };

  const sharedProps = { user, onLogout, cartCount, onCartClick, onOrdersClick, onAdminClick, wishlist, onToggleWishlist: toggleWishlist };

  if (route.name === "login") return <LoginScreen onLoggedIn={onLoggedIn} />;
  if (route.name === "list") return (
    <ProductListScreen {...sharedProps} onSelect={onSelect} query={query} setQuery={setQuery} onWishlistClick={() => setRoute({ name: "wishlist" })} />
  );
  if (route.name === "detail") return (
    <ProductDetailScreen {...sharedProps} id={route.id} onBack={onBack}
      query={query} setQuery={setQuery} onAddToCart={addToCart} />
  );
  if (route.name === "cart") return (
    <CartScreen {...sharedProps} cart={cart} onUpdateQty={updateQty} onRemove={removeFromCart}
      onBack={onBack} onOrderComplete={() => { setCart([]); setRoute({ name: "orders" }); }} />
  );
  if (route.name === "orders") return (
    <OrderHistoryScreen {...sharedProps} onBack={onBack} />
  );
  if (route.name === "wishlist") return (
    <WishlistScreen {...sharedProps} onBack={onBack} onSelect={onSelect} />
  );
  if (route.name === "admin") return (
    <AdminScreen {...sharedProps} onBack={onBack} />
  );
  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
