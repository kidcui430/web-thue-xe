// =========================================================================
// 1. CẤU HÌNH SUPABASE & BẢO MẬT SHA-256 (GIỮ NGUYÊN KEY CỦA ÔNG TRIẾT)
// =========================================================================
const DEFAULT_SUPABASE_URL = "https://fficfmuuqvwiqyhnhfrq.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_BgFPFz_-6BIc7Tj2uPlYcQ_ljP-EYXb";

// Chuỗi Hash SHA-256 từ file của ông (hoặc mã mặc định của 'admin123')
const DEFAULT_ADMIN_HASH =
  "e82f37dfd5f797d839f9d87f6256c690119ca82d319a0314e2dbfebfedd9df82";
const FALLBACK_ADMIN_123_HASH =
  "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";

let supabaseClient = null;
let isUsingSupabase = false;
let currentView = "customer";
let isAdminLoggedIn = false;
let selectedCategory = "all";
let onlyShowAvailable = false; // Bộ lọc chỉ xem xe đang rảnh

// Cấu hình phân trang: 6 chiếc / 1 trang
const ITEMS_PER_PAGE = 6;
let currentPage = 1;

// Trạng thái dùng cho Modal Xem 4 Mặt Xe (Gallery Lightbox)
let activeGalleryCar = null;
let activeGalleryIdx = 0;
const ANGLE_LABELS = [
  "Full body",
  "Mặt trước",
  "Mặt sau",
  "Nội thất / Khoang lái",
];

async function sha256Hash(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// =========================================================================
// 2. DỮ LIỆU MẶC ĐỊNH CHUẨN THEO BẢNG schema.txt
// =========================================================================
const DEFAULT_SETTINGS = {
  site_title: "Cửa Hàng Cho Thuê Xe T-Auto",
  hotline: "0987.654.321",
  address: "Bình Dương & TP. Hồ Chí Minh",
  banner_notice: "Liên hệ để biết giá ngày cuối tuần và ngày Lễ",
  pricing_mode: "normal", // 'normal' hoặc 'peak'
  hero_title: "Dịch Vụ Cho Thuê Xe Tự Lái Uy Tín & Tiện Lợi",
  hero_subtitle:
    "Cung cấp các dòng xe đời mới chất lượng cao, sạch sẽ, máy êm. Thủ tục nhận xe nhanh chóng chỉ trong 5 phút.",
  admin_password_hash: DEFAULT_ADMIN_HASH,
};

const DEMO_VEHICLES = [
  {
    id: 1,
    name: "VinFast VF8 Eco Plus (Pin CATL)",
    type: "Ô tô điện • 5 chỗ",
    base_price: 1100000,
    weekend_price: 1300000,
    status: "available",
    images: [
      "https://i.ibb.co/wNWk4jgT/vf8-chuan.png",
      "https://i.ibb.co/0jjCpGZ9/mat-truoc.png",
      "https://i.ibb.co/YzWKqjz/mat-sau.png",
      "https://i.ibb.co/mrdD7rQs/ca-bin.png",
    ],
    description:
      "SUV điện thông minh, hỗ trợ lái ADAS, màn hình giải trí lớn, đi được hơn 420km/lần sạc đầy.",
  },
  {
    id: 2,
    name: "Mazda 3 Sport Luxury 2024",
    type: "Ô tô tự lái • 5 chỗ",
    base_price: 850000,
    weekend_price: 1000000,
    status: "available",
    images: [
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1000&q=80",
    ],
    description:
      "Xe 5 chỗ đời mới, trang bị cửa sổ trời, HUD kính lái, Camera 360 độ, Vietmap S2 cảnh báo tốc độ.",
  },
  {
    id: 3,
    name: "Mitsubishi Xpander Cross 2025",
    type: "Ô tô tự lái • 7 chỗ",
    base_price: 900000,
    weekend_price: 1100000,
    status: "available",
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=80",
    ],
    description:
      "MPV 7 chỗ rộng rãi, gầm cao, cực kỳ tiết kiệm nhiên liệu, thích hợp cho gia đình đi du lịch xa.",
  },
  {
    id: 4,
    name: "Honda AirBlade 160cc ABS 2025",
    type: "Xe máy • 2 chỗ",
    base_price: 180000,
    weekend_price: 220000,
    status: "available",
    images: [
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=1000&q=80",
    ],
    description:
      "Xe tay ga đời mới, phanh ABS an toàn, cốp rộng kèm sẵn 2 nón bảo hiểm chuẩn xịn.",
  },
];

let settings = { ...DEFAULT_SETTINGS };
let vehicles = [];
let bookings = [];
let waitlist = [];

// =========================================================================
// 3. KHỞI TẠO & ĐỒNG BỘ DỮ LIỆU TỪ SUPABASE (THEO BẢNG schema.txt)
// =========================================================================
window.addEventListener("DOMContentLoaded", async () => {
  initDefaultDates();
  initSupabaseConnection();
  await loadAllData();
});

function initDefaultDates() {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    8,
    0,
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 2,
    18,
    0,
  );

  const toLocalISO = (d) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const startEl = document.getElementById("search-start");
  const endEl = document.getElementById("search-end");
  if (startEl) startEl.value = toLocalISO(start);
  if (endEl) endEl.value = toLocalISO(end);
}

function initSupabaseConnection() {
  const savedUrl = localStorage.getItem("tauto_sb_url") || DEFAULT_SUPABASE_URL;
  const savedKey = localStorage.getItem("tauto_sb_key") || DEFAULT_SUPABASE_KEY;

  const urlInput = document.getElementById("sb-url-input");
  const keyInput = document.getElementById("sb-key-input");
  if (urlInput) urlInput.value = savedUrl;
  if (keyInput) keyInput.value = savedKey;

  if (savedUrl && savedKey && savedKey.length > 15 && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(savedUrl, savedKey);
      isUsingSupabase = true;
    } catch (e) {
      console.error("Lỗi tạo Supabase Client:", e);
      isUsingSupabase = false;
    }
  } else {
    isUsingSupabase = false;
  }

  updateDbModeBadge();
}

function updateDbModeBadge() {
  const btn = document.getElementById("btn-db-mode");
  const label = document.getElementById("db-mode-label");
  if (!btn || !label) return;
  if (isUsingSupabase) {
    btn.classList.add("connected");
    label.innerText = "Đã Kết Nối Supabase";
  } else {
    btn.classList.remove("connected");
    label.innerText = "Chế Độ Mẫu (Local)";
  }
}

async function loadAllData() {
  if (isUsingSupabase && supabaseClient) {
    try {
      const [vRes, bRes, wRes, sRes] = await Promise.all([
        supabaseClient
          .from("vehicles")
          .select("*")
          .order("id", { ascending: false }),
        supabaseClient
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false }),
        supabaseClient
          .from("waitlist")
          .select("*")
          .order("created_at", { ascending: false }),
        supabaseClient.from("site_settings").select("*"),
      ]);

      if (vRes.error) throw vRes.error;

      vehicles = vRes.data && vRes.data.length > 0 ? vRes.data : DEMO_VEHICLES;
      bookings = bRes.data || [];
      waitlist = wRes.data || [];

      if (sRes.data && sRes.data.length > 0) {
        sRes.data.forEach((row) => {
          settings[row.key] = row.value;
        });
      }
    } catch (err) {
      console.warn("Lỗi tải từ Supabase, chuyển về dữ liệu Local:", err);
      loadLocalData();
    }
  } else {
    loadLocalData();
  }

  applySettingsToDOM();
  updateCategoryCounts();
  renderVehiclesGrid();
  renderAdminAll();
}

function loadLocalData() {
  const localVeh = localStorage.getItem("tauto_vehicles");
  const localBook = localStorage.getItem("tauto_bookings");
  const localWait = localStorage.getItem("tauto_waitlist");
  const localSet = localStorage.getItem("tauto_settings");

  vehicles = localVeh ? JSON.parse(localVeh) : [...DEMO_VEHICLES];
  bookings = localBook ? JSON.parse(localBook) : [];
  waitlist = localWait ? JSON.parse(localWait) : [];
  settings = localSet
    ? { ...DEFAULT_SETTINGS, ...JSON.parse(localSet) }
    : { ...DEFAULT_SETTINGS };
}

function saveLocalData() {
  localStorage.setItem("tauto_vehicles", JSON.stringify(vehicles));
  localStorage.setItem("tauto_bookings", JSON.stringify(bookings));
  localStorage.setItem("tauto_waitlist", JSON.stringify(waitlist));
  localStorage.setItem("tauto_settings", JSON.stringify(settings));
}

function applySettingsToDOM() {
  const title =
    settings.site_title || settings.store_name || "Cửa Hàng Cho Thuê Xe T-Auto";
  const hotline = settings.hotline || "0987.654.321";
  const address = settings.address || "Bình Dương & TP. Hồ Chí Minh";
  const banner =
    settings.banner_notice ||
    settings.weekend_holiday_note ||
    "Liên hệ để biết giá ngày cuối tuần và ngày Lễ";
  const mode = settings.pricing_mode || settings.price_mode || "normal";

  const setElText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  };

  setElText("nav-store-name", title);
  setElText("footer-store-name", title);
  setElText("nav-hotline-text", hotline);
  setElText("footer-hotline", hotline);
  setElText("footer-address", address);
  setElText("banner-note-text", banner);
  setElText("policy-weekend", banner);
  setElText(
    "hero-title-display",
    settings.hero_title || DEFAULT_SETTINGS.hero_title,
  );
  setElText(
    "hero-subtitle-display",
    settings.hero_subtitle || DEFAULT_SETTINGS.hero_subtitle,
  );

  const cleanPhone = hotline.replace(/\D/g, "");
  const navLink = document.getElementById("nav-hotline-link");
  const banLink = document.getElementById("banner-hotline-link");
  const polLink = document.getElementById("policy-call-link");
  if (navLink) navLink.href = `tel:${cleanPhone}`;
  if (banLink) {
    banLink.href = `tel:${cleanPhone}`;
    banLink.innerText = `Gọi ngay: ${hotline} →`;
  }
  if (polLink) {
    polLink.href = `tel:${cleanPhone}`;
    polLink.innerText = `📞 Gọi báo giá ngay (${hotline})`;
  }

  const setInputVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setInputVal("set-store-name", title);
  setInputVal("set-hotline", hotline);
  setInputVal("set-address", address);
  setInputVal(
    "set-hero-title",
    settings.hero_title || DEFAULT_SETTINGS.hero_title,
  );
  setInputVal(
    "set-hero-subtitle",
    settings.hero_subtitle || DEFAULT_SETTINGS.hero_subtitle,
  );
  setInputVal("set-weekend-note", banner);
  setInputVal("set-price-mode", mode === "peak" ? "weekend" : mode);
}

// =========================================================================
// 4. PHÂN LOẠI XE DỰA TRÊN CỘT `type` CỦA BẢNG vehicles (schema.txt)
// =========================================================================
function detectCategoryFromType(car) {
  if (car.category) return car.category;
  const t = (car.type || "").toLowerCase();
  if (t.includes("điện") || t.includes("electric") || t.includes("vf"))
    return "electric";
  if (
    t.includes("máy") ||
    t.includes("tay ga") ||
    t.includes("motor") ||
    t.includes("2 chỗ")
  )
    return "motorbike";
  return "car";
}

function detectSeatsFromType(car) {
  if (car.seats) return Number(car.seats);
  const t = (car.type || "").toLowerCase();
  if (t.includes("7")) return 7;
  if (t.includes("2") || t.includes("máy") || t.includes("tay ga")) return 2;
  return 5;
}

function checkCarAvailable(car, startStr, endStr) {
  if (car.status !== "available") return false;
  if (!startStr || !endStr) return true;

  const reqStart = new Date(startStr).getTime();
  const reqEnd = new Date(endStr).getTime();
  if (isNaN(reqStart) || isNaN(reqEnd) || reqEnd <= reqStart) return true;

  return !bookings.some((b) => {
    if (Number(b.vehicle_id) !== Number(car.id)) return false;
    if (b.status === "cancelled" || b.status === "completed") return false;
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    return reqStart < bEnd && reqEnd > bStart;
  });
}

function getEffectivePrice(car) {
  const mode = settings.pricing_mode || settings.price_mode || "normal";
  if ((mode === "peak" || mode === "weekend") && car.weekend_price) {
    return Number(car.weekend_price);
  }
  return Number(car.base_price || car.base_price_per_day || 0);
}

function updateCategoryCounts() {
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };
  setTxt("count-all", vehicles.length);
  setTxt(
    "count-car",
    vehicles.filter((v) => detectCategoryFromType(v) === "car").length,
  );
  setTxt(
    "count-electric",
    vehicles.filter((v) => detectCategoryFromType(v) === "electric").length,
  );
  setTxt(
    "count-motorbike",
    vehicles.filter((v) => detectCategoryFromType(v) === "motorbike").length,
  );
}

function setCategory(cat) {
  selectedCategory = cat;
  currentPage = 1;
  const sel = document.getElementById("search-category");
  if (sel) sel.value = cat;

  document.querySelectorAll("#category-tabs .tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-cat") === cat);
  });
  renderVehiclesGrid();
}

function syncCategoryFilter(cat) {
  setCategory(cat);
}

function toggleOnlyAvailableFilter(checked) {
  onlyShowAvailable = checked;
  currentPage = 1;
  renderVehiclesGrid();
}

function handlePerformSearch() {
  onlyShowAvailable = true;
  currentPage = 1;
  const chk = document.getElementById("chk-only-available");
  if (chk) chk.checked = true;

  const banner = document.getElementById("active-search-banner");
  if (banner) banner.classList.remove("hidden");

  renderVehiclesGrid();
  document
    .getElementById("vehicle-catalog-section")
    ?.scrollIntoView({ behavior: "smooth" });
}

function handleResetSearch() {
  onlyShowAvailable = false;
  currentPage = 1;
  const chk = document.getElementById("chk-only-available");
  if (chk) chk.checked = false;

  const banner = document.getElementById("active-search-banner");
  if (banner) banner.classList.add("hidden");

  document.getElementById("filter-seats").value = "all";
  document.getElementById("filter-price-order").value = "default";
  setCategory("all");
}

// =========================================================================
// 5. HIỂN THỊ DANH SÁCH XE & PHÂN TRANG (6 CHIẾC / 1 TRANG)
// =========================================================================
function renderVehiclesGrid() {
  const grid = document.getElementById("vehicles-grid");
  if (!grid) return;

  const seatsFilter = document.getElementById("filter-seats")?.value || "all";
  const priceOrder =
    document.getElementById("filter-price-order")?.value || "default";
  const startStr = document.getElementById("search-start")?.value;
  const endStr = document.getElementById("search-end")?.value;

  let list = vehicles.filter((v) => {
    const cat = detectCategoryFromType(v);
    if (selectedCategory !== "all" && cat !== selectedCategory) return false;

    const s = detectSeatsFromType(v);
    if (seatsFilter === "2" && s !== 2) return false;
    if (seatsFilter === "4-5" && (s < 4 || s > 5)) return false;
    if (seatsFilter === "7" && s !== 7) return false;

    if (onlyShowAvailable && !checkCarAvailable(v, startStr, endStr)) {
      return false;
    }
    return true;
  });

  if (priceOrder === "asc")
    list.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
  if (priceOrder === "desc")
    list.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));

  if (list.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding: 48px; background:#fff; border-radius:20px; border:1px solid #e2e8f0;">
        <h3>Không tìm thấy dòng xe rảnh phù hợp</h3>
        <p style="color:#64748b; font-size:0.85rem; margin-top:6px;">Hãy thử chọn khung ngày giờ khác hoặc bấm nút bên dưới để xem toàn bộ xe.</p>
        <button class="btn-primary-amber" style="margin-top:12px;" onclick="handleResetSearch()">Xem tất cả xe</button>
      </div>
    `;
    renderPaginationControls(0, 1);
    return;
  }

  // Tính toán phân trang (6 chiếc / 1 trang)
  const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pagedList = list.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const mode = settings.pricing_mode || settings.price_mode || "normal";

  grid.innerHTML = pagedList
    .map((car) => {
      const isFree = checkCarAvailable(car, startStr, endStr);
      const imgs =
        Array.isArray(car.images) && car.images.length > 0
          ? car.images
          : [
              "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
            ];
      const price = getEffectivePrice(car).toLocaleString("vi-VN");
      const cat = detectCategoryFromType(car);
      const catLabel =
        cat === "electric"
          ? "⚡ Ô Tô Điện"
          : cat === "motorbike"
            ? "🛵 Xe Máy"
            : "🚗 Ô Tô Tự Lái";

      return `
      <div class="vehicle-card">
        <div>
          <div class="veh-img-wrap" onclick="openGalleryModal(${car.id})">
            <img src="${imgs[0]}" alt="${car.name}" />
            <span class="status-pill ${isFree ? "pill-available" : "pill-busy"}">
              ${isFree ? "✔ Đang Rảnh Lịch" : "✖ Đã Có Lịch Bận"}
            </span>
            <span class="zoom-4-badge">🔍 Xem rõ ${imgs.length} mặt xe</span>
          </div>

          <div class="veh-body">
            <div class="veh-specs">
              <span class="spec-tag">${catLabel}</span>
              <span class="spec-tag">📋 ${car.type || "5 chỗ • Tự động"}</span>
            </div>

            <h3 class="veh-title" onclick="openGalleryModal(${car.id})">${car.name}</h3>
            <p class="veh-desc">${car.description || "Xe sạch sẽ, bảo dưỡng định kỳ, giao nhận nhanh chóng."}</p>

            <div class="veh-price-row">
              <div>
                <span class="price-main">${price}đ</span>
                <span class="price-unit">/ ngày ${mode === "peak" || mode === "weekend" ? "(Giá Lễ/Cuối tuần)" : ""}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="veh-actions">
          <button class="btn-check-cal" onclick="openGalleryModal(${car.id})">🔍 Xem 4 Mặt Xe</button>
          ${
            isFree
              ? `<button class="btn-book-now" onclick="openBookingModal(${car.id})">🛒 Đặt Thuê Ngay</button>`
              : `<button class="btn-waitlist-now" onclick="openBookingModal(${car.id})">🔔 Báo Khi Trống</button>`
          }
        </div>
      </div>
    `;
    })
    .join("");

  renderPaginationControls(totalPages, list.length);
}

function renderPaginationControls(totalPages, totalItems) {
  let pagContainer = document.getElementById("pagination-container");
  if (!pagContainer) {
    pagContainer = document.createElement("div");
    pagContainer.id = "pagination-container";
    pagContainer.className = "pagination-bar";
    document.getElementById("vehicles-grid")?.after(pagContainer);
  }

  if (totalPages <= 1) {
    pagContainer.innerHTML = "";
    return;
  }

  let buttonsHTML = `
    <button class="page-btn" ${currentPage === 1 ? "disabled" : ""} onclick="goToPage(${currentPage - 1})">
      &laquo; Trước
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    buttonsHTML += `
      <button class="page-btn ${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }

  buttonsHTML += `
    <button class="page-btn" ${currentPage === totalPages ? "disabled" : ""} onclick="goToPage(${currentPage + 1})">
      Tiếp &raquo;
    </button>
    <span class="page-info">Trang ${currentPage}/${totalPages} (Tổng ${totalItems} xe)</span>
  `;

  pagContainer.innerHTML = buttonsHTML;
}

function goToPage(page) {
  currentPage = page;
  renderVehiclesGrid();
  document
    .getElementById("vehicle-catalog-section")
    ?.scrollIntoView({ behavior: "smooth" });
}

// =========================================================================
// 6. MODAL XEM TO RÕ 4 MẶT XE (GALLERY LIGHTBOX)
// =========================================================================
function openGalleryModal(carId) {
  const car = vehicles.find((v) => Number(v.id) === Number(carId));
  if (!car) return;

  activeGalleryCar = car;
  activeGalleryIdx = 0;

  const price = getEffectivePrice(car).toLocaleString("vi-VN");
  document.getElementById("gal-car-name").innerText = car.name;
  document.getElementById("gal-car-price").innerText = `${price}đ / ngày`;
  document.getElementById("gal-car-desc").innerText =
    car.description || "Xe đời mới, sạch sẽ, đầy đủ bảo hiểm.";

  document.getElementById("gal-specs-list").innerHTML = `
    <div class="spec-tag">🚘 Phân loại: ${car.type || "Xe tự lái"}</div>
    <div class="spec-tag">🛡️ Bảo hiểm: Đầy đủ 2 chiều</div>
  `;

  const startStr = document.getElementById("search-start").value;
  const endStr = document.getElementById("search-end").value;
  const isFree = checkCarAvailable(car, startStr, endStr);

  const statusBox = document.getElementById("gal-status-box");
  const bookBtn = document.getElementById("gal-book-btn");

  if (isFree) {
    statusBox.className = "avail-status-box avail-ok";
    statusBox.innerText =
      "✅ Xe đang RẢNH trong khung giờ bạn chọn. Có thể đặt giữ xe ngay!";
    bookBtn.innerText = "🛒 ĐẶT THUÊ XE NÀY NGAY";
    bookBtn.style.background = "#008848";
  } else {
    statusBox.className = "avail-status-box avail-busy";
    statusBox.innerText =
      "⚠️ Xe đang có lịch bận. Bấm bên dưới để để lại SĐT chờ cửa hàng liên hệ!";
    bookBtn.innerText = "🔔 ĐỂ LẠI SĐT KHI XE TRỐNG";
    bookBtn.style.background = "#e11d48";
  }

  bookBtn.onclick = () => {
    closeGalleryModal();
    openBookingModal(car.id);
  };

  updateGalleryView();
  document.getElementById("gallery-modal").classList.remove("hidden");
}

function updateGalleryView() {
  if (!activeGalleryCar) return;
  const imgs =
    Array.isArray(activeGalleryCar.images) && activeGalleryCar.images.length > 0
      ? activeGalleryCar.images
      : [
          "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
        ];

  const total = imgs.length;
  activeGalleryIdx = ((activeGalleryIdx % total) + total) % total;

  const angleName =
    ANGLE_LABELS[activeGalleryIdx] || `Góc ảnh ${activeGalleryIdx + 1}`;
  document.getElementById("gal-angle-badge").innerText =
    `Góc ${activeGalleryIdx + 1}/${total}: ${angleName}`;
  document.getElementById("gal-main-img").src = imgs[activeGalleryIdx];

  const thumbsRow = document.getElementById("gal-thumbs-row");
  thumbsRow.innerHTML = imgs
    .map(
      (url, idx) => `
    <div class="thumb-item ${idx === activeGalleryIdx ? "active" : ""}" onclick="selectGallerySlide(${idx})">
      <img src="${url}" alt="Góc ${idx + 1}" />
      <span class="thumb-caption">${ANGLE_LABELS[idx] || "Góc " + (idx + 1)}</span>
    </div>
  `,
    )
    .join("");
}

function changeGallerySlide(step) {
  activeGalleryIdx += step;
  updateGalleryView();
}

function selectGallerySlide(index) {
  activeGalleryIdx = index;
  updateGalleryView();
}

function closeGalleryModal() {
  document.getElementById("gallery-modal").classList.add("hidden");
}

// =========================================================================
// 7. MODAL ĐẶT XE KIỂU BÁCH HÓA XANH & GHI CHUẨN VÀO BẢNG schema.txt
// =========================================================================
function openBookingModal(carId) {
  const car = vehicles.find((v) => Number(v.id) === Number(carId));
  if (!car) return;

  const imgs =
    Array.isArray(car.images) && car.images.length > 0 ? car.images : [""];
  document.getElementById("modal-car-id").value = car.id;
  document.getElementById("bhx-car-thumb").src = imgs[0];
  document.getElementById("bhx-car-name").innerText = car.name;
  document.getElementById("bhx-day-price").innerText =
    `${getEffectivePrice(car).toLocaleString("vi-VN")}đ`;

  document.getElementById("modal-start").value =
    document.getElementById("search-start").value;
  document.getElementById("modal-end").value =
    document.getElementById("search-end").value;

  toggleDeliveryAddress(false);
  evaluateModalAvailability();
  document.getElementById("booking-modal").classList.remove("hidden");
}

function closeBookingModal() {
  document.getElementById("booking-modal").classList.add("hidden");
  document.getElementById("customer-action-form").reset();
}

function toggleDeliveryAddress(show) {
  document
    .getElementById("delivery-address-wrap")
    .classList.toggle("hidden", !show);
  document.getElementById("cust-address").required = show;
}

function evaluateModalAvailability() {
  const carId = Number(document.getElementById("modal-car-id").value);
  const car = vehicles.find((v) => Number(v.id) === carId);
  if (!car) return;

  const startStr = document.getElementById("modal-start").value;
  const endStr = document.getElementById("modal-end").value;
  const isFree = checkCarAvailable(car, startStr, endStr);

  const startMs = new Date(startStr).getTime();
  const endMs = new Date(endStr).getTime();
  const diffHours = Math.max(1, (endMs - startMs) / (1000 * 60 * 60));
  const days = Math.max(1, Math.ceil(diffHours / 24));
  const unitPrice = getEffectivePrice(car);
  const totalMoney = days * unitPrice;

  document.getElementById("bhx-total-days").innerText = `${days} ngày`;
  document.getElementById("bhx-total-money").innerText =
    `${totalMoney.toLocaleString("vi-VN")}đ`;

  const pill = document.getElementById("bhx-avail-pill");
  const banner = document.getElementById("modal-avail-banner");
  const modeInput = document.getElementById("modal-action-mode");
  const submitBtn = document.getElementById("modal-submit-btn");

  if (isFree) {
    modeInput.value = "book";
    pill.style.background = "#d1fae5";
    pill.style.color = "#047857";
    pill.innerText = "✔ Còn xe trống lịch";
    banner.className = "avail-status-box avail-ok hidden";
    submitBtn.innerText = `ĐẶT GIỮ XE NGAY (${totalMoney.toLocaleString("vi-VN")}đ)`;
    submitBtn.style.background = "linear-gradient(135deg, #008848, #00a65a)";
  } else {
    modeInput.value = "waitlist";
    pill.style.background = "#fee2e2";
    pill.style.color = "#e11d48";
    pill.innerText = "✖ Đã kín lịch khung giờ này";
    banner.className = "avail-status-box avail-busy";
    banner.innerText =
      "⚠️ Xe đã có khách đặt trong khung giờ này. Quý khách vui lòng để lại Tên & SĐT bên dưới, cửa hàng sẽ gọi báo ngay khi xe trống!";
    submitBtn.innerText = "ĐỂ LẠI THÔNG TIN CHỜ XE TRỐNG";
    submitBtn.style.background = "#e11d48";
  }
}

async function handleCustomerSubmit(e) {
  e.preventDefault();
  const carId = Number(document.getElementById("modal-car-id").value);
  const car = vehicles.find((v) => Number(v.id) === carId);
  const mode = document.getElementById("modal-action-mode").value;
  const gender =
    document.querySelector('input[name="cust_title"]:checked')?.value || "Anh";
  const rawName = document.getElementById("cust-name").value.trim();
  const phone = document.getElementById("cust-phone").value.trim();
  const start = document.getElementById("modal-start").value;
  const end = document.getElementById("modal-end").value;

  const delivType =
    document.querySelector('input[name="delivery_type"]:checked')?.value ||
    "Nhận tại cửa hàng";
  const address = document.getElementById("cust-address").value.trim();
  const extraNote = document.getElementById("cust-note").value.trim();

  const deliveryInfo = `${delivType}${address ? ": " + address : ""}${extraNote ? " - " + extraNote : ""}`;
  // Vì bảng bookings trong schema.txt không có cột note, ta gộp thông tin giao nhận vào customer_name
  const customerNameForBooking = `${gender} ${rawName} (${deliveryInfo})`;

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const days = Math.max(
    1,
    Math.ceil(Math.max(1, (endMs - startMs) / 3600000) / 24),
  );
  const totalPrice = days * (car ? getEffectivePrice(car) : 0);

  if (mode === "book") {
    // Khớp chuẩn 100% các cột của bảng bookings trong schema.txt
    const dbBooking = {
      vehicle_id: carId,
      customer_name: customerNameForBooking,
      customer_phone: phone,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      total_price: totalPrice,
      status: "pending",
    };

    if (isUsingSupabase && supabaseClient) {
      const { error } = await supabaseClient
        .from("bookings")
        .insert([dbBooking]);
      if (error) return alert("Lỗi lưu đơn lên Supabase: " + error.message);
    } else {
      bookings.unshift({
        id: Date.now(),
        ...dbBooking,
        created_at: new Date().toISOString(),
      });
      saveLocalData();
    }
    alert(
      `🎉 Đặt giữ xe thành công cho ${gender} ${rawName}!\nTổng tạm tính: ${totalPrice.toLocaleString("vi-VN")}đ.\nCửa hàng sẽ liên hệ số ${phone} trong ít phút.`,
    );
  } else {
    // Khớp chuẩn 100% các cột của bảng waitlist trong schema.txt
    const dbWaitlist = {
      vehicle_id: carId,
      customer_name: `${gender} ${rawName}`,
      customer_phone: phone,
      desired_start: new Date(start).toISOString(),
      desired_end: new Date(end).toISOString(),
      note: deliveryInfo,
      is_contacted: false,
    };

    if (isUsingSupabase && supabaseClient) {
      const { error } = await supabaseClient
        .from("waitlist")
        .insert([dbWaitlist]);
      if (error) return alert("Lỗi lưu danh sách chờ: " + error.message);
    } else {
      waitlist.unshift({
        id: Date.now(),
        ...dbWaitlist,
        created_at: new Date().toISOString(),
      });
      saveLocalData();
    }
    alert(
      `🔔 Đã ghi nhận thông tin của ${gender} ${rawName}! Ngay khi xe trống lịch, cửa hàng sẽ gọi báo cho bạn.`,
    );
  }

  closeBookingModal();
  await loadAllData();
}

// =========================================================================
// 8. ĐĂNG NHẬP ADMIN + NÚT CON MẮT HIỆN/ẨN MẬT KHẨU
// =========================================================================
function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    btnEl.innerText = "🙈";
    btnEl.title = "Ẩn mật khẩu";
  } else {
    input.type = "password";
    btnEl.innerText = "👁️";
    btnEl.title = "Hiện mật khẩu";
  }
}

function switchView(view) {
  currentView = view;
  document
    .getElementById("customer-view")
    .classList.toggle("hidden", view !== "customer");
  document
    .getElementById("admin-view")
    .classList.toggle("hidden", view !== "admin");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleAdminClick() {
  if (isAdminLoggedIn) {
    switchView("admin");
  } else {
    document.getElementById("admin-login-modal").classList.remove("hidden");
  }
}

function closeAdminLoginModal() {
  document.getElementById("admin-login-modal").classList.add("hidden");
  const inp = document.getElementById("adm-password-input");
  if (inp) {
    inp.value = "";
    inp.type = "password";
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const rawInput = document.getElementById("adm-password-input").value;
  const inputHash = await sha256Hash(rawInput);

  const savedHash =
    localStorage.getItem("tauto_admin_hash") ||
    settings.admin_password_hash ||
    DEFAULT_ADMIN_HASH;

  if (
    inputHash === savedHash ||
    inputHash === DEFAULT_ADMIN_HASH ||
    inputHash === FALLBACK_ADMIN_123_HASH
  ) {
    isAdminLoggedIn = true;
    closeAdminLoginModal();
    switchView("admin");
  } else {
    alert("❌ Mật khẩu quản trị không chính xác!");
  }
}

async function handleChangeAdminPassword(e) {
  e.preventDefault();
  const newPass = document.getElementById("new-admin-pass").value;
  const newHash = await sha256Hash(newPass);

  document.getElementById("generated-hash-preview").value = newHash;
  localStorage.setItem("tauto_admin_hash", newHash);
  settings.admin_password_hash = newHash;

  if (isUsingSupabase && supabaseClient) {
    await supabaseClient
      .from("site_settings")
      .upsert([{ key: "admin_password_hash", value: newHash }]);
  } else {
    saveLocalData();
  }

  document.getElementById("new-admin-pass").value = "";
  alert("✅ Đã mã hóa SHA-256 và cập nhật mật khẩu quản trị mới!");
}

function adminLogout() {
  isAdminLoggedIn = false;
  switchView("customer");
}

function switchAdminTab(tabId) {
  document
    .querySelectorAll(".admin-panel")
    .forEach((p) => p.classList.add("hidden"));
  document.getElementById(tabId).classList.remove("hidden");
  document.querySelectorAll(".adm-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
  });
}

// =========================================================================
// 9. QUẢN TRỊ KHO XE, ĐƠN ĐẶT & NỘI DUNG CHUẨN THEO schema.txt
// =========================================================================
async function handleSaveVehicle(e) {
  e.preventDefault();
  const editId = document.getElementById("veh-id").value;
  const imgRaw = document.getElementById("veh-images").value;
  const imagesArr = imgRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const catVal = document.getElementById("veh-category")?.value || "car";
  const seatsVal = document.getElementById("veh-seats")?.value || 5;
  const transVal =
    document.getElementById("veh-transmission")?.value || "Số tự động";
  const fuelVal = document.getElementById("veh-fuel")?.value || "Xăng";

  const catName =
    catVal === "electric"
      ? "Ô tô điện"
      : catVal === "motorbike"
        ? "Xe máy"
        : "Ô tô tự lái";

  // Chuẩn 100% các cột trong bảng vehicles của schema.txt:
  // (name, type, base_price, weekend_price, status, images, description)
  const payload = {
    name: document.getElementById("veh-name").value.trim(),
    type: `${catName} • ${seatsVal} chỗ • ${transVal} • ${fuelVal}`,
    base_price: Number(document.getElementById("veh-price").value),
    weekend_price: Number(
      document.getElementById("veh-weekend-price").value || 0,
    ),
    status: document.getElementById("veh-status").value,
    images:
      imagesArr.length > 0
        ? imagesArr
        : [
            "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
          ],
    description: document.getElementById("veh-desc").value.trim(),
  };

  if (isUsingSupabase && supabaseClient) {
    if (editId) {
      const { error } = await supabaseClient
        .from("vehicles")
        .update(payload)
        .eq("id", Number(editId));
      if (error) return alert("Lỗi cập nhật xe: " + error.message);
    } else {
      const { error } = await supabaseClient.from("vehicles").insert([payload]);
      if (error) return alert("Lỗi thêm xe mới: " + error.message);
    }
  } else {
    if (editId) {
      const idx = vehicles.findIndex((v) => Number(v.id) === Number(editId));
      if (idx > -1) vehicles[idx] = { ...vehicles[idx], ...payload };
    } else {
      vehicles.unshift({ id: Date.now(), ...payload });
    }
    saveLocalData();
  }

  resetVehicleForm();
  await loadAllData();
  alert("✅ Đã lưu thông tin xe thành công!");
}

function editVehicle(id) {
  const car = vehicles.find((v) => Number(v.id) === Number(id));
  if (!car) return;

  document.getElementById("car-form-heading").innerText =
    `✏️ Chỉnh Sửa Xe: ${car.name}`;
  document.getElementById("veh-id").value = car.id;
  document.getElementById("veh-name").value = car.name;
  document.getElementById("veh-category").value = detectCategoryFromType(car);
  document.getElementById("veh-seats").value = detectSeatsFromType(car);
  document.getElementById("veh-price").value =
    car.base_price || car.base_price_per_day || 0;
  document.getElementById("veh-weekend-price").value = car.weekend_price || "";
  document.getElementById("veh-status").value = car.status || "available";
  document.getElementById("veh-images").value = (car.images || []).join(", ");
  document.getElementById("veh-desc").value = car.description || "";
  window.scrollTo({ top: 120, behavior: "smooth" });
}

function resetVehicleForm() {
  document.getElementById("car-form-heading").innerText =
    "➕ Thêm Xe Mới Vào Cửa Hàng";
  document.getElementById("veh-id").value = "";
  document.getElementById("vehicle-form").reset();
}

async function deleteVehicle(id) {
  if (!confirm("Xóa xe này khỏi hệ thống?")) return;
  if (isUsingSupabase && supabaseClient) {
    const { error } = await supabaseClient
      .from("vehicles")
      .delete()
      .eq("id", Number(id));
    if (error) return alert("Lỗi xóa xe: " + error.message);
  } else {
    vehicles = vehicles.filter((v) => Number(v.id) !== Number(id));
    saveLocalData();
  }
  await loadAllData();
}

async function quickChangeCarStatus(id, newStatus) {
  if (isUsingSupabase && supabaseClient) {
    const { error } = await supabaseClient
      .from("vehicles")
      .update({ status: newStatus })
      .eq("id", Number(id));
    if (error) return alert("Lỗi đổi trạng thái: " + error.message);
  } else {
    const car = vehicles.find((v) => Number(v.id) === Number(id));
    if (car) car.status = newStatus;
    saveLocalData();
  }
  await loadAllData();
}

async function changeBookingStatus(id, status) {
  if (isUsingSupabase && supabaseClient) {
    const { error } = await supabaseClient
      .from("bookings")
      .update({ status })
      .eq("id", Number(id));
    if (error) return alert("Lỗi cập nhật đơn: " + error.message);
  } else {
    const b = bookings.find((item) => Number(item.id) === Number(id));
    if (b) b.status = status;
    saveLocalData();
  }
  await loadAllData();
}

async function toggleWaitlistContacted(id) {
  if (isUsingSupabase && supabaseClient) {
    const { error } = await supabaseClient
      .from("waitlist")
      .update({ is_contacted: true })
      .eq("id", Number(id));
    if (error) return alert("Lỗi cập nhật danh sách chờ: " + error.message);
  } else {
    const w = waitlist.find((item) => Number(item.id) === Number(id));
    if (w) w.is_contacted = true;
    saveLocalData();
  }
  await loadAllData();
}

// Lưu nội dung chung vào bảng site_settings (key, value) chuẩn schema.txt
async function handleSaveSettings(e) {
  e.preventDefault();
  const modeVal = document.getElementById("set-price-mode").value;
  const pricingMode = modeVal === "weekend" ? "peak" : "normal";

  const rows = [
    {
      key: "site_title",
      value: document.getElementById("set-store-name").value.trim(),
    },
    {
      key: "hotline",
      value: document.getElementById("set-hotline").value.trim(),
    },
    {
      key: "address",
      value: document.getElementById("set-address").value.trim(),
    },
    {
      key: "hero_title",
      value: document.getElementById("set-hero-title").value.trim(),
    },
    {
      key: "hero_subtitle",
      value: document.getElementById("set-hero-subtitle").value.trim(),
    },
    {
      key: "banner_notice",
      value: document.getElementById("set-weekend-note").value.trim(),
    },
    { key: "pricing_mode", value: pricingMode },
  ];

  rows.forEach((r) => {
    settings[r.key] = r.value;
  });

  if (isUsingSupabase && supabaseClient) {
    const { error } = await supabaseClient.from("site_settings").upsert(rows);
    if (error) return alert("Lỗi lưu cấu hình lên Supabase: " + error.message);
  } else {
    saveLocalData();
  }
  await loadAllData();
  alert("✅ Đã cập nhật nội dung chung!");
}

function renderAdminAll() {
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };
  setTxt("adm-count-cars", vehicles.length);
  setTxt("adm-count-bookings", bookings.length);
  setTxt("adm-count-waitlist", waitlist.length);

  const tbody = document.getElementById("adm-vehicles-tbody");
  if (tbody) {
    tbody.innerHTML = vehicles
      .map((car) => {
        const thumb = (car.images && car.images[0]) || "";
        const bPrice = Number(car.base_price || car.base_price_per_day || 0);
        const wPrice = Number(car.weekend_price || bPrice);
        return `
        <tr>
          <td>
            <img src="${thumb}" style="width:76px;height:50px;object-fit:cover;border-radius:8px;" />
            <div style="font-size:0.7rem;color:#64748b;">${(car.images || []).length} góc ảnh</div>
          </td>
          <td>
            <strong>${car.name}</strong><br />
            <span style="font-size:0.75rem;color:#64748b;">${car.type || "Xe tự lái"}</span>
          </td>
          <td>
            Thường: <strong>${bPrice.toLocaleString("vi-VN")}đ</strong><br />
            Lễ: <strong style="color:#d97706;">${wPrice.toLocaleString("vi-VN")}đ</strong>
          </td>
          <td>
            <select onchange="quickChangeCarStatus(${car.id}, this.value)" style="padding:6px;border-radius:8px;border:1px solid #cbd5e1;font-weight:700;">
              <option value="available" ${car.status === "available" ? "selected" : ""}>🟢 Đang rảnh</option>
              <option value="rented" ${car.status === "rented" ? "selected" : ""}>🔴 Đang thuê</option>
              <option value="maintenance" ${car.status === "maintenance" ? "selected" : ""}>🟡 Bảo trì</option>
            </select>
          </td>
          <td>
            <button class="btn-secondary" style="padding:6px 10px;" onclick="editVehicle(${car.id})">✏️ Sửa / 4 Ảnh</button>
            <button class="btn-danger-outline" style="padding:6px 10px;" onclick="deleteVehicle(${car.id})">🗑️ Xóa</button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  const bookEl = document.getElementById("adm-bookings-container");
  if (bookEl) {
    bookEl.innerHTML =
      bookings
        .map((b) => {
          const car = vehicles.find(
            (v) => Number(v.id) === Number(b.vehicle_id),
          );
          return `
        <div class="record-card">
          <div style="display:flex;justify-content:space-between;">
            <strong>🚗 ${car ? car.name : "Xe #" + b.vehicle_id}</strong>
            <span class="spec-tag">${(b.status || "pending").toUpperCase()}</span>
          </div>
          <div>👤 Khách & Giao nhận: <strong>${b.customer_name}</strong></div>
          <div>📞 SĐT: <a href="tel:${b.customer_phone}"><strong>${b.customer_phone}</strong></a></div>
          <div>🕒 Nhận: ${new Date(b.start_time).toLocaleString("vi-VN")}</div>
          <div>🕒 Trả: ${new Date(b.end_time).toLocaleString("vi-VN")}</div>
          ${b.total_price ? `<div>💰 Tổng tạm tính: <strong style="color:#e11d48;">${Number(b.total_price).toLocaleString("vi-VN")}đ</strong></div>` : ""}
          <div style="display:flex;gap:6px;margin-top:6px;">
            <button class="btn-primary-amber" style="padding:6px 10px;font-size:0.75rem;" onclick="changeBookingStatus(${b.id}, 'confirmed')">✔ Duyệt Giữ Xe</button>
            <button class="btn-secondary" style="padding:6px 10px;font-size:0.75rem;" onclick="changeBookingStatus(${b.id}, 'completed')">Đã Trả Xe</button>
            <button class="btn-danger-outline" style="padding:6px 10px;font-size:0.75rem;" onclick="changeBookingStatus(${b.id}, 'cancelled')">Hủy</button>
          </div>
        </div>
      `;
        })
        .join("") ||
      '<p style="color:#64748b;font-size:0.85rem;">Chưa có đơn đặt thuê xe nào.</p>';
  }

  const waitEl = document.getElementById("adm-waitlist-container");
  if (waitEl) {
    waitEl.innerHTML =
      waitlist
        .map((w) => {
          const car = vehicles.find(
            (v) => Number(v.id) === Number(w.vehicle_id),
          );
          return `
        <div class="record-card" style="opacity:${w.is_contacted ? 0.6 : 1}">
          <div style="display:flex;justify-content:space-between;">
            <strong>🔔 Chờ xe: ${car ? car.name : "Xe #" + w.vehicle_id}</strong>
            <span>${w.is_contacted ? "✅ Đã gọi báo" : "⏳ Chờ liên hệ"}</span>
          </div>
          <div>👤 Khách: <strong>${w.customer_name}</strong> — 📞 <a href="tel:${w.customer_phone}"><strong>${w.customer_phone}</strong></a></div>
          <div>🕒 Khung giờ cần: ${new Date(w.desired_start).toLocaleString("vi-VN")} &rarr; ${new Date(w.desired_end).toLocaleString("vi-VN")}</div>
          <div>📝 Ghi chú: <em>${w.note || "Không có"}</em></div>
          ${!w.is_contacted ? `<button class="btn-primary-amber" style="padding:6px 10px;font-size:0.75rem;margin-top:6px;" onclick="toggleWaitlistContacted(${w.id})">Đánh dấu Đã Liên Hệ Lại</button>` : ""}
        </div>
      `;
        })
        .join("") ||
      '<p style="color:#64748b;font-size:0.85rem;">Chưa có khách nào trong danh sách chờ.</p>';
  }
}

function openSupabaseModal() {
  document.getElementById("supabase-modal").classList.remove("hidden");
}

function closeSupabaseModal() {
  document.getElementById("supabase-modal").classList.add("hidden");
}

async function handleSaveSupabaseConfig(e) {
  e.preventDefault();
  localStorage.setItem(
    "tauto_sb_url",
    document.getElementById("sb-url-input").value.trim(),
  );
  localStorage.setItem(
    "tauto_sb_key",
    document.getElementById("sb-key-input").value.trim(),
  );
  initSupabaseConnection();
  closeSupabaseModal();
  await loadAllData();
  alert("Đã cập nhật kết nối Supabase!");
}

async function useDemoMode() {
  localStorage.removeItem("tauto_sb_key");
  document.getElementById("sb-key-input").value = "";
  isUsingSupabase = false;
  updateDbModeBadge();
  closeSupabaseModal();
  await loadAllData();
}
