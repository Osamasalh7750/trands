/**
 * ==========================================================================
 * ✨ متجر عطورات ترند (TRAND PERFUMES) - Client Application Core (js/app.js)
 * ==========================================================================
 */

// Supabase Configuration
const SUPABASE_URL = "https://iceianuxbnhnpeupbbrz.supabase.co";
const SUPABASE_KEY = "sb_publishable_syiACLwvd6tIh7moWlWSdA_OXJ5o5KX";
const STORE_PHONE = "966568009474";

// Initialize Supabase Client
let supabaseClient = null;
if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    console.warn("تعذر تهيئة Supabase:", e);
  }
}

// Initial Empty States (تم إفراغ البيانات الافتراضية بالكامل بناءً على طلب الإدارة)
const FALLBACK_PERFUMES = [];
const FALLBACK_BANNERS = [];

// State Management
let allPerfumes = [];
let allBanners = [];
let activeCategory = "all";
let searchQuery = "";
let currentSort = "default";
let cart = [];
let currentBannerIdx = 0;
let bannerInterval = null;

// DOM Elements Initialization
document.addEventListener("DOMContentLoaded", () => {
  initCart();
  loadData();
  setupEventListeners();
});

/**
 * جلب البيانات من Supabase أو التخزين المحدث
 */
async function loadData() {
  renderLoadingState();
  
  // 1. Fetch Perfumes from Supabase
  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("perfumes")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error && data && data.length > 0) {
        allPerfumes = data;
      } else {
        const localCached = localStorage.getItem("trand_local_perfumes");
        allPerfumes = localCached ? JSON.parse(localCached) : [];
      }
    } else {
      const localCached = localStorage.getItem("trand_local_perfumes");
      allPerfumes = localCached ? JSON.parse(localCached) : [];
    }
  } catch (err) {
    console.warn("جلب العطور:", err);
    const localCached = localStorage.getItem("trand_local_perfumes");
    allPerfumes = localCached ? JSON.parse(localCached) : [];
  }

  // 2. Fetch Banners from Supabase
  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("banners")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error && data && data.length > 0) {
        allBanners = data;
      } else {
        const localBanners = localStorage.getItem("trand_local_banners");
        allBanners = localBanners ? JSON.parse(localBanners) : [];
      }
    } else {
      const localBanners = localStorage.getItem("trand_local_banners");
      allBanners = localBanners ? JSON.parse(localBanners) : [];
    }
  } catch (err) {
    console.warn("جلب البنرات:", err);
    const localBanners = localStorage.getItem("trand_local_banners");
    allBanners = localBanners ? JSON.parse(localBanners) : [];
  }

  renderBanners();
  renderPerfumes();
}

/**
 * عرض البنرات المتحركة (Carousel)
 */
function renderBanners() {
  const bannersSection = document.getElementById("bannersSection");
  const container = document.getElementById("bannerSlidesContainer");
  const dotsContainer = document.getElementById("sliderDots");
  
  if (!bannersSection || !container) return;

  if (!allBanners || allBanners.length === 0) {
    // إخفاء قسم البنرات بأناقة عند عدم وجود بنرات مضافة
    bannersSection.style.display = "none";
    return;
  }

  bannersSection.style.display = "block";

  container.innerHTML = allBanners.map((b, idx) => `
    <div class="banner-slide" style="transform: translateX(${idx * 100}%);">
      <img src="${b.image}" alt="${b.title}" class="banner-slide-bg" onerror="this.src='https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=1600&q=80'">
      <div class="banner-slide-overlay"></div>
      <div class="banner-content">
        <span class="badge badge-gold banner-tag"><i class="fas fa-crown"></i> ${b.tag || 'عرض حصري'}</span>
        <h2 class="banner-title">${b.title}</h2>
        <p class="banner-subtitle">${b.subtitle || ''}</p>
        <div class="banner-actions">
          <button class="btn btn-primary" onclick="handleBannerAction('${encodeURIComponent(b.whatsapp_message || '')}')">
            <i class="fab fa-whatsapp"></i> ${b.button_text || 'اطلب الآن عبر الواتساب'}
          </button>
          <a href="#catalogSection" class="btn btn-outline">تصفح الكتالوج</a>
        </div>
      </div>
    </div>
  `).join("");

  if (dotsContainer) {
    dotsContainer.innerHTML = allBanners.map((_, idx) => `
      <div class="slider-dot ${idx === 0 ? 'active' : ''}" onclick="goToSlide(${idx})"></div>
    `).join("");
  }

  currentBannerIdx = 0;
  updateSliderPosition();
  startBannerAutoplay();
}

function updateSliderPosition() {
  const container = document.getElementById("bannerSlidesContainer");
  if (!container) return;
  
  container.style.transform = `translateX(${currentBannerIdx * 100}%)`;
  
  const dots = document.querySelectorAll(".slider-dot");
  dots.forEach((dot, idx) => {
    dot.classList.toggle("active", idx === currentBannerIdx);
  });
}

function goToSlide(idx) {
  currentBannerIdx = idx;
  updateSliderPosition();
  resetBannerAutoplay();
}

function nextSlide() {
  if (!allBanners || allBanners.length <= 1) return;
  currentBannerIdx = (currentBannerIdx + 1) % allBanners.length;
  updateSliderPosition();
}

function prevSlide() {
  if (!allBanners || allBanners.length <= 1) return;
  currentBannerIdx = (currentBannerIdx - 1 + allBanners.length) % allBanners.length;
  updateSliderPosition();
}

function startBannerAutoplay() {
  if (bannerInterval) clearInterval(bannerInterval);
  if (allBanners && allBanners.length > 1) {
    bannerInterval = setInterval(nextSlide, 5000);
  }
}

function resetBannerAutoplay() {
  startBannerAutoplay();
}

function handleBannerAction(encodedMsg) {
  const msg = decodeURIComponent(encodedMsg) || "مرحباً عطورات ترند، أود الاستفسار عن عروضكم الخاصة.";
  const url = `https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

/**
 * فلترة وترتيب وعرض العطور
 */
function getFilteredPerfumes() {
  return allPerfumes.filter(p => {
    const matchCategory = activeCategory === "all" || 
      (p.category && p.category.toLowerCase().includes(activeCategory.toLowerCase()));
    
    const query = searchQuery.trim().toLowerCase();
    const matchSearch = !query || 
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.top_notes && p.top_notes.toLowerCase().includes(query)) ||
      (p.base_notes && p.base_notes.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query));
    
    return matchCategory && matchSearch;
  }).sort((a, b) => {
    const priceA = getEffectivePrice(a);
    const priceB = getEffectivePrice(b);
    
    if (currentSort === "price-low") return priceA - priceB;
    if (currentSort === "price-high") return priceB - priceA;
    if (currentSort === "discount") return (b.discount || 0) - (a.discount || 0);
    return 0;
  });
}

function getEffectivePrice(p) {
  const price = parseFloat(p.price) || 0;
  const discount = parseFloat(p.discount) || 0;
  if (discount > 0 && discount < 100) {
    return Math.round(price * (1 - discount / 100));
  }
  return price;
}

function renderPerfumes() {
  const grid = document.getElementById("perfumesGrid");
  const countEl = document.getElementById("resultsCount");
  if (!grid) return;

  const filtered = getFilteredPerfumes();
  if (countEl) countEl.innerText = filtered.length;

  // في حال كان المتجر فارغاً تماماً من العطور (Clean Slate)
  if (allPerfumes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-crown"></i></div>
        <h3 class="gold-text">نرحب بكم في متجر عطورات ترند</h3>
        <p>
          يتم حالياً تجهيز وإضافة تشكيلتنا الملكية الحصرية من العطور الفاخرة.<br>
          ترقبوا تدشين أحدث عطوراتنا، أو تواصلوا معنا مباشرة للاستفسار والطلب الخاص.
        </p>
        <div class="empty-state-actions">
          <a href="https://wa.me/${STORE_PHONE}?text=${encodeURIComponent('مرحباً عطورات ترند، أود الاستفسار عن تشكيلة العطور المتاحة لديكم.')}" target="_blank" class="btn btn-whatsapp">
            <i class="fab fa-whatsapp"></i> تواصل عبر الواتساب
          </a>
          <a href="login.html" class="btn btn-outline">
            <i class="fas fa-user-shield"></i> لوحة الإدارة (إضافة عطور جديدة)
          </a>
        </div>
      </div>
    `;
    return;
  }

  // في حال وجود عطور ولكن نتائج البحث/الفلترة فارغة
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-search"></i></div>
        <h3>لم يتم العثور على عطور مطابقة</h3>
        <p>جرب البحث بكلمات أخرى أو اختر تصنيفاً مختلفاً من شريط الأقسام.</p>
        <button class="btn btn-outline" onclick="resetFilters()">عرض كافة العطور</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const effPrice = getEffectivePrice(p);
    const hasDiscount = (p.discount || 0) > 0;
    const badge = p.badge_tag || (hasDiscount ? `خصم ${p.discount}%` : null);

    return `
      <div class="perfume-card">
        <div class="card-image-wrap" onclick="openPerfumeModal('${p.id}')">
          <img src="${p.image || 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80'}" 
               alt="${p.name}" class="card-img" loading="lazy" 
               onerror="this.src='https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80'">
          
          <div class="card-badges">
            ${badge ? `<span class="badge ${hasDiscount ? 'badge-discount' : 'badge-gold'}">${badge}</span>` : ''}
          </div>

          <div class="card-actions-quick" onclick="event.stopPropagation()">
            <button class="quick-btn" title="تفاصيل العطر" onclick="openPerfumeModal('${p.id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="quick-btn" title="أضف للسلة" onclick="addToCart('${p.id}')">
              <i class="fas fa-cart-plus"></i>
            </button>
          </div>
        </div>

        <div class="card-info">
          <div class="card-category-row">
            <span class="card-category">${p.category || 'عطور فاخرة'}</span>
            <span class="card-size">${p.size || '100 مل'} • ${p.type || 'EDP'}</span>
          </div>

          <h3 class="card-title" onclick="openPerfumeModal('${p.id}')">${p.name}</h3>

          ${p.offer ? `<div class="card-offer"><i class="fas fa-gift"></i> ${p.offer}</div>` : ''}

          <div class="card-metrics">
            <div class="metric-bar-item">
              <div class="metric-label">
                <span>الثبات</span>
                <span>${p.longevity || 90}%</span>
              </div>
              <div class="metric-track">
                <div class="metric-fill" style="width: ${p.longevity || 90}%;"></div>
              </div>
            </div>
            <div class="metric-bar-item">
              <div class="metric-label">
                <span>الفوحان</span>
                <span>${p.sillage || 88}%</span>
              </div>
              <div class="metric-track">
                <div class="metric-fill" style="width: ${p.sillage || 88}%;"></div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="card-price-block">
              ${hasDiscount ? `<span class="card-old-price">${p.price} ر.س</span>` : ''}
              <span class="card-current-price">${effPrice} <span>ر.س</span></span>
            </div>
            <button class="btn btn-primary card-add-btn" onclick="addToCart('${p.id}')">
              <i class="fas fa-cart-plus"></i> أضف للسلة
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderLoadingState() {
  const grid = document.getElementById("perfumesGrid");
  if (grid) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-spinner fa-spin"></i></div>
        <h3>جاري تحميل المتجر...</h3>
        <p>عطورات ترند ترحب بكم بأفخم الروائح الملكية</p>
      </div>
    `;
  }
}

/**
 * نافذة تفاصيل العطر (Modal)
 */
function openPerfumeModal(id) {
  const p = allPerfumes.find(x => String(x.id) === String(id));
  if (!p) return;

  const modal = document.getElementById("perfumeModal");
  if (!modal) return;

  const effPrice = getEffectivePrice(p);
  const hasDiscount = (p.discount || 0) > 0;

  document.getElementById("modalImg").src = p.image || '';
  document.getElementById("modalImg").onerror = function() {
    this.src = 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80';
  };
  
  document.getElementById("modalTitle").innerText = p.name;
  document.getElementById("modalCategory").innerText = p.category || "عطور ترند";
  document.getElementById("modalPrice").innerHTML = `${effPrice} <span style="font-size: 1rem; color: var(--text-secondary);">ر.س</span>`;
  
  const oldPriceEl = document.getElementById("modalOldPrice");
  if (oldPriceEl) {
    if (hasDiscount) {
      oldPriceEl.innerText = `${p.price} ر.س`;
      oldPriceEl.style.display = "inline";
    } else {
      oldPriceEl.style.display = "none";
    }
  }

  const badgeEl = document.getElementById("modalBadge");
  if (badgeEl) {
    if (p.badge_tag || hasDiscount) {
      badgeEl.innerText = p.badge_tag || `خصم ${p.discount}%`;
      badgeEl.style.display = "inline-flex";
    } else {
      badgeEl.style.display = "none";
    }
  }

  document.getElementById("modalDesc").innerText = p.description || "عطر فاخر يجسد الرقي والأناقة بمكونات عطرية نقية ومختارة بعناية فائقة.";
  document.getElementById("modalSize").innerText = p.size || "100 مل";
  document.getElementById("modalType").innerText = p.type || "Eau de Parfum";
  document.getElementById("modalOccasion").innerText = p.occasion || "كافة المناسبات الخاصة";

  // Olfactory Pyramid
  document.getElementById("modalTopNotes").innerText = p.top_notes || "حمضيات منعشة، برغموت نقي";
  document.getElementById("modalHeartNotes").innerText = p.heart_notes || "زهور نادرة، أخشاب دافئة";
  document.getElementById("modalBaseNotes").innerText = p.base_notes || "عود فاخر، عنبر، مسك أبيض";

  // Longevity & Sillage
  const longVal = p.longevity || 90;
  const sillVal = p.sillage || 88;
  document.getElementById("modalLongevityVal").innerText = `${longVal}%`;
  document.getElementById("modalLongevityBar").style.width = `${longVal}%`;
  document.getElementById("modalSillageVal").innerText = `${sillVal}%`;
  document.getElementById("modalSillageBar").style.width = `${sillVal}%`;

  // Stepper reset
  document.getElementById("modalQtyInput").value = 1;

  // Actions
  document.getElementById("modalAddToCartBtn").onclick = () => {
    const qty = parseInt(document.getElementById("modalQtyInput").value) || 1;
    addToCart(p.id, qty);
    closePerfumeModal();
  };

  document.getElementById("modalDirectWABtn").onclick = () => {
    const qty = parseInt(document.getElementById("modalQtyInput").value) || 1;
    const directMsg = `مرحباً عطورات ترند ✨\nأرغب بطلب العطر التالي بشكل مباشر:\n- العطر: ${p.name}\n- الكمية: ${qty}\n- السعر الإجمالي: ${effPrice * qty} ر.س\nيرجى تأكيد التوافر وطريقة الشحن والتوصيل.`;
    window.open(`https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(directMsg)}`, "_blank");
  };

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePerfumeModal() {
  const modal = document.getElementById("perfumeModal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

/**
 * سلة التسوق الذكية (Cart Management)
 */
function initCart() {
  try {
    const saved = localStorage.getItem("trand_perfumes_cart");
    if (saved) {
      cart = JSON.parse(saved);
    }
  } catch (e) {
    cart = [];
  }
  updateCartUI();
}

function saveCart() {
  try {
    localStorage.setItem("trand_perfumes_cart", JSON.stringify(cart));
  } catch (e) {
    console.error("خطأ بحفظ السلة:", e);
  }
  updateCartUI();
}

function addToCart(perfumeId, quantity = 1) {
  const p = allPerfumes.find(x => String(x.id) === String(perfumeId));
  if (!p) return;

  const existing = cart.find(item => String(item.id) === String(perfumeId));
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: p.id,
      name: p.name,
      price: getEffectivePrice(p),
      originalPrice: parseFloat(p.price) || 0,
      image: p.image,
      size: p.size || "100 مل",
      type: p.type || "EDP",
      quantity: quantity
    });
  }

  saveCart();
  showToast(`تمت إضافة "${p.name}" إلى سلة المشتريات`, "success");
  openCartDrawer();
}

function updateCartQuantity(perfumeId, delta) {
  const item = cart.find(x => String(x.id) === String(perfumeId));
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(perfumeId);
  } else {
    saveCart();
  }
}

function removeFromCart(perfumeId) {
  cart = cart.filter(x => String(x.id) !== String(perfumeId));
  saveCart();
  showToast("تم حذف المنتج من السلة", "info");
}

function clearCart() {
  cart = [];
  saveCart();
}

function updateCartUI() {
  const countBadges = document.querySelectorAll(".cart-count-badge");
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  countBadges.forEach(b => {
    b.innerText = totalCount;
    b.style.display = totalCount > 0 ? "flex" : "none";
  });

  const cartList = document.getElementById("cartItemsList");
  const cartTotalEl = document.getElementById("cartTotalPrice");
  const cartItemsCountEl = document.getElementById("cartItemsCountText");

  if (!cartList) return;

  if (cart.length === 0) {
    cartList.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <i class="fas fa-shopping-bag" style="font-size: 3rem; color: var(--gold-primary); margin-bottom: 1rem;"></i>
        <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">سلة المشتريات فارغة</h4>
        <p style="font-size: 0.85rem;">اختر من تشكيلتنا الملكية وأضف ما يعجبك إلى السلة</p>
      </div>
    `;
    if (cartTotalEl) cartTotalEl.innerText = "0 ر.س";
    if (cartItemsCountEl) cartItemsCountEl.innerText = "(0 منتجات)";
    return;
  }

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (cartTotalEl) cartTotalEl.innerText = `${totalPrice} ر.س`;
  if (cartItemsCountEl) cartItemsCountEl.innerText = `(${totalCount} منتجات)`;

  cartList.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image || 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=200&q=80'}" 
           alt="${item.name}" class="cart-item-img"
           onerror="this.src='https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=200&q=80'">
      
      <div class="cart-item-details">
        <div>
          <h4 class="cart-item-title">${item.name}</h4>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${item.size} • ${item.type}</span>
        </div>
        <span class="cart-item-price">${item.price * item.quantity} ر.س</span>
        
        <div class="cart-item-controls">
          <div class="quantity-stepper" style="transform: scale(0.85); transform-origin: right center;">
            <button class="stepper-btn" onclick="updateCartQuantity('${item.id}', -1)"><i class="fas fa-minus"></i></button>
            <span class="stepper-input">${item.quantity}</span>
            <button class="stepper-btn" onclick="updateCartQuantity('${item.id}', 1)"><i class="fas fa-plus"></i></button>
          </div>
          <button class="cart-delete-btn" onclick="removeFromCart('${item.id}')" title="حذف">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

function openCartDrawer() {
  const overlay = document.getElementById("cartDrawerOverlay");
  if (overlay) {
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeCartDrawer() {
  const overlay = document.getElementById("cartDrawerOverlay");
  if (overlay) {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }
}

/**
 * إتمام الطلب عبر الواتساب (WhatsApp Checkout Flow)
 */
function checkoutWhatsApp() {
  if (cart.length === 0) {
    showToast("السلة فارغة! يرجى إضافة عطور أولاً", "error");
    return;
  }

  const notesInput = document.getElementById("cartSpecialNotes");
  const specialNotes = notesInput && notesInput.value.trim() ? notesInput.value.trim() : "لا توجد ملاحظات إضافية";
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  let message = `مرحباً متجر عطورات ترند ✨\n`;
  message += `أود تأكيد طلب العطورات التالية عبر السلة الذكية:\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📦 *المنتجات المطلوبة:*\n`;

  cart.forEach((item, index) => {
    message += `${index + 1}. *${item.name}*\n`;
    message += `   • الحجم والنوع: ${item.size} (${item.type})\n`;
    message += `   • الكمية: ${item.quantity}\n`;
    message += `   • السعر: ${item.price * item.quantity} ر.س\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *المجموع النهائي:* ${totalPrice} ر.س\n`;
  message += `📍 *التوصيل:* داخل مدينة الرياض فقط\n`;
  message += `🎁 *ملاحظات خاصة وتغليف:* ${specialNotes}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `أرجو تزويدي بتفاصيل الدفع وتأكيد التوصيل في الرياض. شكراً لكم!`;

  const whatsappUrl = `https://wa.me/${STORE_PHONE}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
}

/**
 * إعداد الأحداث والمستمعين
 */
function setupEventListeners() {
  // Search
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderPerfumes();
    });
  }

  // Category Pills
  const pills = document.querySelectorAll(".category-pill");
  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      pills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeCategory = pill.getAttribute("data-category") || "all";
      renderPerfumes();
    });
  });

  // Sort
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderPerfumes();
    });
  }

  // Cart Drawer triggers
  const cartBtn = document.getElementById("cartTriggerBtn");
  if (cartBtn) cartBtn.addEventListener("click", openCartDrawer);

  const closeCartBtn = document.getElementById("closeCartBtn");
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);

  const cartOverlay = document.getElementById("cartDrawerOverlay");
  if (cartOverlay) {
    cartOverlay.addEventListener("click", (e) => {
      if (e.target === cartOverlay) closeCartDrawer();
    });
  }

  // Modal triggers
  const modal = document.getElementById("perfumeModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closePerfumeModal();
    });
  }

  const closeModalBtn = document.getElementById("closeModalBtn");
  if (closeModalBtn) closeModalBtn.addEventListener("click", closePerfumeModal);

  // Stepper inside modal
  const minusBtn = document.getElementById("modalQtyMinus");
  const plusBtn = document.getElementById("modalQtyPlus");
  const qtyInput = document.getElementById("modalQtyInput");

  if (minusBtn && qtyInput) {
    minusBtn.addEventListener("click", () => {
      let val = parseInt(qtyInput.value) || 1;
      if (val > 1) qtyInput.value = val - 1;
    });
  }

  if (plusBtn && qtyInput) {
    plusBtn.addEventListener("click", () => {
      let val = parseInt(qtyInput.value) || 1;
      qtyInput.value = val + 1;
    });
  }

  // Banners slider controls
  const nextBtn = document.getElementById("nextBannerBtn");
  const prevBtn = document.getElementById("prevBannerBtn");
  if (nextBtn) nextBtn.addEventListener("click", () => { nextSlide(); resetBannerAutoplay(); });
  if (prevBtn) prevBtn.addEventListener("click", () => { prevSlide(); resetBannerAutoplay(); });
}

function resetFilters() {
  activeCategory = "all";
  searchQuery = "";
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
  const pills = document.querySelectorAll(".category-pill");
  pills.forEach((p, idx) => p.classList.toggle("active", idx === 0));
  renderPerfumes();
}

/**
 * Toast Notifications
 */
function showToast(message, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = "fa-info-circle";
  if (type === "success") icon = "fa-check-circle";
  if (type === "error") icon = "fa-exclamation-circle";

  toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
