/* global React, ReactDOM, ECApi */
const { useState, useEffect, useMemo, useCallback, useRef } = React;
const { login: apiLogin, logout: apiLogout, fetchProducts, fetchProduct, auth: apiAuth } = ECApi;

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

function Header({ user, onSearch, onLogoClick, onLogout, query, setQuery }) {
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
            <button className="header-action" title="買い物かご">
              <div className="icon">🛒</div>
              <div className="badge">2</div>
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
            <button className="userbar-link">会員情報</button>
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
function ProductCard({ p, onClick }) {
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
        <div className="card-shop"><span className="shop-dot">K</span>{p.shop}</div>
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
function ProductListScreen({ user, onSelect, onLogout, query, setQuery, onSearch }) {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("すべて");
  const [sort, setSort] = useState("recommended");
  const [activeQuery, setActiveQuery] = useState("");

  useEffect(() => {
    let alive = true;
    setError(null);
    fetchProducts()
      .then(d => { if (alive) setProducts(d); })
      .catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = products;
    if (category !== "すべて") list = list.filter(p => p.category === category);
    if (activeQuery) {
      const q = activeQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    list = [...list];
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "reviews") list.sort((a, b) => b.reviewCount - a.reviewCount);
    return list;
  }, [products, category, sort, activeQuery]);

  const cats = useMemo(() => {
    if (!products) return [];
    const set = new Set(products.map(p => p.category));
    return ["すべて", ...Array.from(set)];
  }, [products]);

  return (
    <div data-screen-label="02 Product List">
      <Header
        user={user}
        query={query}
        setQuery={setQuery}
        onSearch={(q) => { setActiveQuery(q); onSearch && onSearch(q); }}
        onLogout={onLogout}
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
                onClick={() => setCategory(c)}
              >{c}</button>
            ))}
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
              : filtered.map(p => <ProductCard key={p.id} p={p} onClick={onSelect} />)
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
function ProductDetailScreen({ id, user, onBack, onLogout, query, setQuery, onSearch }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [qty, setQty] = useState(1);
  const [activeThumb, setActiveThumb] = useState(0);
  const [fav, setFav] = useState(false);
  const [favShop, setFavShop] = useState(false);
  const [toast, setToast] = useState(null);

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
                    onClick={() => showToast(`「${data.name.slice(0, 20)}…」を買い物かごに追加しました`)}
                  >
                    <span>⊕</span> かごに追加
                  </button>
                  <button
                    className="btn-buy"
                    disabled={data.stock === 0}
                    onClick={() => showToast("購入手続きへ進みます（プロトタイプ）")}
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
// Root App — simple router
// ============================================================
function App() {
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState({ name: "login" });
  const [query, setQuery] = useState("");

  // 起動時：トークンが残っていれば自動でリストへ
  useEffect(() => {
    if (apiAuth.isLoggedIn()) {
      setUser({ username: "user", displayName: "ユーザー", points: 21645 });
      setRoute({ name: "list" });
    }
  }, []);

  const onLoggedIn = (u) => {
    setUser(u);
    setRoute({ name: "list" });
  };

  const onLogout = () => {
    apiLogout();
    setUser(null);
    setRoute({ name: "login" });
    setQuery("");
  };

  const onSelect = (id) => setRoute({ name: "detail", id });
  const onBack = () => setRoute({ name: "list" });

  if (route.name === "login") return <LoginScreen onLoggedIn={onLoggedIn} />;
  if (route.name === "list") return (
    <ProductListScreen
      user={user}
      onSelect={onSelect}
      onLogout={onLogout}
      query={query} setQuery={setQuery}
    />
  );
  if (route.name === "detail") return (
    <ProductDetailScreen
      id={route.id}
      user={user}
      onBack={onBack}
      onLogout={onLogout}
      query={query} setQuery={setQuery}
    />
  );
  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
