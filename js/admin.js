/**
 * ==========================================================================
 * ✨ متجر عطورات ترند (TRAND PERFUMES) - Admin Dashboard Core (js/admin.js)
 * ==========================================================================
 * 🔐 ملاحظة: يتم التحقق من بيانات الدخول وتغييرها في صفحة (login.html)
 * البريد الإلكتروني للمدير: omar@trand.com
 * كلمة المرور: trand1234
 * ==========================================================================
 */

// Supabase Configuration
const SUPABASE_URL = "https://iceianuxbnhnpeupbbrz.supabase.co";
const SUPABASE_KEY = "sb_publishable_syiACLwvd6tIh7moWlWSdA_OXJ5o5KX";

let supabaseClient = null;
if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    console.warn("Supabase init error in admin:", e);
  }
}

// State
let adminPerfumes = [];
let adminBanners = [];
let selectedPerfumeFile = null;
let selectedBannerFile = null;
let perfumeFileBase64 = "";
let bannerFileBase64 = "";

// Authentication Guard
function checkAuth() {
  const isAuth = localStorage.getItem("trand_admin_authenticated");
  if (isAuth !== "true") {
    window.location.href = "login.html";
    return false;
  }
  const email = localStorage.getItem("trand_admin_email") || "omar@trand.com";
  const userEl = document.getElementById("adminUserEmail");
  if (userEl) userEl.innerText = email;
  return true;
}

// Document Ready
document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return;
  setupTabs();
  setupUploadDropzones();
  setupForms();
  loadAdminData();

  // Logout Handler
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    if (confirm("هل ترغب بالفعل في تسجيل الخروج؟")) {
      if (supabaseClient) {
        try { await supabaseClient.auth.signOut(); } catch(e) {}
      }
      localStorage.removeItem("trand_admin_authenticated");
      localStorage.removeItem("trand_admin_email");
      window.location.href = "login.html";
    }
  });

  // Search input in table
  document.getElementById("adminPerfumesSearch")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    renderPerfumesTable(q);
  });
});

/**
 * تبديل التبويبات
 */
function setupTabs() {
  const tabs = document.querySelectorAll(".admin-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const targetId = tab.getAttribute("data-target");
      document.getElementById("perfumesSection").style.display = targetId === "perfumesSection" ? "block" : "none";
      document.getElementById("bannersSection").style.display = targetId === "bannersSection" ? "block" : "none";
    });
  });
}

/**
 * جلب البيانات وحساب الإحصائيات
 */
async function loadAdminData() {
  // 1. Fetch Perfumes
  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("perfumes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        adminPerfumes = data;
      } else {
        // Fallback to local cache if table is empty
        const cached = localStorage.getItem("trand_local_perfumes");
        adminPerfumes = cached ? JSON.parse(cached) : [];
      }
    }
  } catch (err) {
    console.error("Error loading perfumes:", err);
  }

  // 2. Fetch Banners
  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("banners")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        adminBanners = data;
      } else {
        const cached = localStorage.getItem("trand_local_banners");
        adminBanners = cached ? JSON.parse(cached) : [];
      }
    }
  } catch (err) {
    console.error("Error loading banners:", err);
  }

  updateStats();
  renderPerfumesTable();
  renderBannersTable();
}

function updateStats() {
  const total = adminPerfumes.length;
  const discounted = adminPerfumes.filter(p => (parseFloat(p.discount) || 0) > 0).length;
  const bannersCount = adminBanners.length;
  
  let avgPrice = 0;
  if (total > 0) {
    const sum = adminPerfumes.reduce((acc, p) => acc + (parseFloat(p.price) || 0), 0);
    avgPrice = Math.round(sum / total);
  }

  document.getElementById("statTotalPerfumes").innerText = total;
  document.getElementById("statDiscountedPerfumes").innerText = discounted;
  document.getElementById("statTotalBanners").innerText = bannersCount;
  document.getElementById("statAvgPrice").innerText = `${avgPrice} ر.س`;
}

/**
 * إعداد السحب والإفلات للملفات
 */
function setupUploadDropzones() {
  // Perfume Dropzone
  const pDropzone = document.getElementById("perfumeDropzone");
  const pInput = document.getElementById("perfumeFileInput");
  const pPreviewWrap = document.getElementById("perfumeImgPreviewWrap");
  const pPreviewImg = document.getElementById("perfumeImgPreview");
  const pRemoveBtn = document.getElementById("removePerfumeImgBtn");

  if (pDropzone && pInput) {
    pDropzone.addEventListener("click", () => pInput.click());
    
    pDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      pDropzone.classList.add("drag-over");
    });
    
    pDropzone.addEventListener("dragleave", () => pDropzone.classList.remove("drag-over"));
    
    pDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      pDropzone.classList.remove("drag-over");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handlePerfumeFile(e.dataTransfer.files[0]);
      }
    });

    pInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handlePerfumeFile(e.target.files[0]);
      }
    });

    pRemoveBtn?.addEventListener("click", () => {
      selectedPerfumeFile = null;
      perfumeFileBase64 = "";
      pInput.value = "";
      pPreviewWrap.style.display = "none";
      pDropzone.style.display = "block";
    });
  }

  function handlePerfumeFile(file) {
    if (!file.type.startsWith("image/")) {
      showToast("يرجى اختيار ملف صورة صالح", "error");
      return;
    }
    selectedPerfumeFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      perfumeFileBase64 = e.target.result;
      pPreviewImg.src = e.target.result;
      pPreviewWrap.style.display = "inline-block";
      pDropzone.style.display = "none";
    };
    reader.readAsDataURL(file);
  }

  // Banner Dropzone
  const bDropzone = document.getElementById("bannerDropzone");
  const bInput = document.getElementById("bannerFileInput");
  const bPreviewWrap = document.getElementById("bannerImgPreviewWrap");
  const bPreviewImg = document.getElementById("bannerImgPreview");
  const bRemoveBtn = document.getElementById("removeBannerImgBtn");

  if (bDropzone && bInput) {
    bDropzone.addEventListener("click", () => bInput.click());
    
    bDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      bDropzone.classList.add("drag-over");
    });
    
    bDropzone.addEventListener("dragleave", () => bDropzone.classList.remove("drag-over"));
    
    bDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      bDropzone.classList.remove("drag-over");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleBannerFile(e.dataTransfer.files[0]);
      }
    });

    bInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleBannerFile(e.target.files[0]);
      }
    });

    bRemoveBtn?.addEventListener("click", () => {
      selectedBannerFile = null;
      bannerFileBase64 = "";
      bInput.value = "";
      bPreviewWrap.style.display = "none";
      bDropzone.style.display = "block";
    });
  }

  function handleBannerFile(file) {
    if (!file.type.startsWith("image/")) {
      showToast("يرجى اختيار ملف صورة صالح للبنر", "error");
      return;
    }
    selectedBannerFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      bannerFileBase64 = e.target.result;
      bPreviewImg.src = e.target.result;
      bPreviewWrap.style.display = "inline-block";
      bDropzone.style.display = "none";
    };
    reader.readAsDataURL(file);
  }
}

/**
 * رفع الصورة إلى مساحة التخزين في Supabase (Storage Bucket)
 */
async function uploadToSupabaseStorage(file, bucketName = "perfume-images") {
  if (!supabaseClient) return null;

  try {
    const fileExt = file.name.split('.').pop();
    const cleanFileName = `trand_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .upload(cleanFileName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) {
      console.warn(`خطأ رفع الصورة إلى الحوض ${bucketName}:`, error);
      return null;
    }

    const { data: urlData } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(cleanFileName);

    return urlData.publicUrl;
  } catch (err) {
    console.warn("Storage upload exception:", err);
    return null;
  }
}

/**
 * إعداد النماذج وحفظ البيانات
 */
function setupForms() {
  // 1. Add Perfume Form
  const addPerfumeForm = document.getElementById("addPerfumeForm");
  addPerfumeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = document.getElementById("savePerfumeBtn");
    const btnText = document.getElementById("savePerfumeBtnText");
    btn.disabled = true;
    btnText.innerText = "جاري الحفظ والرفع سحابياً...";

    try {
      let finalImageUrl = document.getElementById("pImageUrl").value.trim();

      // Attempt upload if file selected
      if (selectedPerfumeFile) {
        const uploadedUrl = await uploadToSupabaseStorage(selectedPerfumeFile, "perfume-images");
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else if (perfumeFileBase64) {
          // Fallback to data URL if bucket is not public yet
          finalImageUrl = perfumeFileBase64;
          showToast("تم اعتماد الصورة محلياً بنجاح", "info");
        }
      }

      if (!finalImageUrl) {
        showToast("يرجى اختيار صورة للعطر أو إدخال رابط الصورة", "error");
        btn.disabled = false;
        btnText.innerText = "حفظ ونشر العطر سحابياً";
        return;
      }

      const newPerfume = {
        name: document.getElementById("pName").value.trim(),
        category: document.getElementById("pCategory").value,
        price: parseFloat(document.getElementById("pPrice").value) || 0,
        discount: parseFloat(document.getElementById("pDiscount").value) || 0,
        offer: document.getElementById("pOffer").value.trim() || null,
        size: document.getElementById("pSize").value.trim() || "100 مل",
        type: document.getElementById("pType").value,
        badge_tag: document.getElementById("pBadge").value.trim() || null,
        longevity: parseInt(document.getElementById("pLongevity").value) || 90,
        sillage: parseInt(document.getElementById("pSillage").value) || 88,
        occasion: document.getElementById("pOccasion").value.trim(),
        top_notes: document.getElementById("pTopNotes").value.trim(),
        heart_notes: document.getElementById("pHeartNotes").value.trim(),
        base_notes: document.getElementById("pBaseNotes").value.trim(),
        description: document.getElementById("pDescription").value.trim(),
        image: finalImageUrl,
        created_at: new Date().toISOString()
      };

      // Save to Supabase
      let savedCloud = false;
      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from("perfumes")
          .insert([newPerfume])
          .select();

        if (!error && data && data.length > 0) {
          savedCloud = true;
          newPerfume.id = data[0].id;
        } else if (error) {
          console.warn("Supabase insert error (RLS or permissions):", error);
        }
      }

      if (!savedCloud) {
        newPerfume.id = "p-" + Date.now();
      }

      // Add to state & local cache
      adminPerfumes.unshift(newPerfume);
      localStorage.setItem("trand_local_perfumes", JSON.stringify(adminPerfumes));

      showToast(`تم حفظ ونشر عطر "${newPerfume.name}" بنجاح!`, "success");
      addPerfumeForm.reset();
      
      // Reset image preview
      selectedPerfumeFile = null;
      perfumeFileBase64 = "";
      document.getElementById("perfumeImgPreviewWrap").style.display = "none";
      document.getElementById("perfumeDropzone").style.display = "block";

      updateStats();
      renderPerfumesTable();
    } catch (err) {
      console.error("Save perfume error:", err);
      showToast("حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.", "error");
    } finally {
      btn.disabled = false;
      btnText.innerText = "حفظ ونشر العطر سحابياً";
    }
  });

  // 2. Add Banner Form
  const addBannerForm = document.getElementById("addBannerForm");
  addBannerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = document.getElementById("saveBannerBtn");
    const btnText = document.getElementById("saveBannerBtnText");
    btn.disabled = true;
    btnText.innerText = "جاري الحفظ سحابياً...";

    try {
      let finalBannerImg = document.getElementById("bImageUrl").value.trim();

      if (selectedBannerFile) {
        const uploaded = await uploadToSupabaseStorage(selectedBannerFile, "banner-images");
        if (uploaded) {
          finalBannerImg = uploaded;
        } else if (bannerFileBase64) {
          finalBannerImg = bannerFileBase64;
        }
      }

      if (!finalBannerImg) {
        showToast("يرجى اختيار صورة للبنر أو إدخال رابطها", "error");
        btn.disabled = false;
        btnText.innerText = "حفظ البنر سحابياً";
        return;
      }

      const newBanner = {
        id: (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'b-' + Date.now()),
        title: document.getElementById("bTitle").value.trim(),
        subtitle: document.getElementById("bSubtitle").value.trim(),
        tag: document.getElementById("bTag").value.trim(),
        button_text: document.getElementById("bButtonText").value.trim(),
        whatsapp_message: document.getElementById("bWhatsAppMsg").value.trim(),
        image: finalBannerImg,
        created_at: new Date().toISOString()
      };

      let savedCloud = false;
      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from("banners")
          .insert([newBanner])
          .select();

        if (!error && data && data.length > 0) {
          savedCloud = true;
          newBanner.id = data[0].id;
        }
      }

      if (!savedCloud) {
        newBanner.id = "b-" + Date.now();
      }

      adminBanners.unshift(newBanner);
      localStorage.setItem("trand_local_banners", JSON.stringify(adminBanners));

      showToast("تمت إضافة البنر الإعلاني بنجاح!", "success");
      addBannerForm.reset();

      selectedBannerFile = null;
      bannerFileBase64 = "";
      document.getElementById("bannerImgPreviewWrap").style.display = "none";
      document.getElementById("bannerDropzone").style.display = "block";

      updateStats();
      renderBannersTable();
    } catch (err) {
      console.error("Save banner error:", err);
      showToast("حدث خطأ أثناء حفظ البنر", "error");
    } finally {
      btn.disabled = false;
      btnText.innerText = "حفظ البنر سحابياً";
    }
  });

  // 3. Edit Perfume Form
  const editForm = document.getElementById("editPerfumeForm");
  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editPId").value;
    const p = adminPerfumes.find(x => String(x.id) === String(id));
    if (!p) return;

    p.name = document.getElementById("editPName").value.trim();
    p.category = document.getElementById("editPCategory").value;
    p.price = parseFloat(document.getElementById("editPPrice").value) || 0;
    p.discount = parseFloat(document.getElementById("editPDiscount").value) || 0;
    p.size = document.getElementById("editPSize").value.trim();
    p.type = document.getElementById("editPType").value;
    p.offer = document.getElementById("editPOffer").value.trim() || null;
    p.badge_tag = document.getElementById("editPBadge").value.trim() || null;
    p.top_notes = document.getElementById("editPTopNotes").value.trim();
    p.heart_notes = document.getElementById("editPHeartNotes").value.trim();
    p.base_notes = document.getElementById("editPBaseNotes").value.trim();
    p.description = document.getElementById("editPDescription").value.trim();
    p.image = document.getElementById("editPImage").value.trim();

    if (supabaseClient) {
      try {
        await supabaseClient.from("perfumes").update(p).eq("id", id);
      } catch (err) {
        console.warn("Supabase update error:", err);
      }
    }

    localStorage.setItem("trand_local_perfumes", JSON.stringify(adminPerfumes));
    showToast("تم تحديث بيانات العطر بنجاح", "success");
    closeEditModal();
    updateStats();
    renderPerfumesTable();
  });

  document.getElementById("closeEditModalBtn")?.addEventListener("click", closeEditModal);
}

/**
 * عرض جدول العطور
 */
function renderPerfumesTable(query = "") {
  const tbody = document.getElementById("adminPerfumesTableBody");
  if (!tbody) return;

  const filtered = adminPerfumes.filter(p => {
    if (!query) return true;
    return (p.name && p.name.toLowerCase().includes(query)) ||
           (p.category && p.category.toLowerCase().includes(query));
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <i class="fas fa-inbox" style="font-size: 2rem; color: var(--gold-primary); margin-bottom: 0.5rem;"></i>
          <p>لا توجد عطور مطابقة أو لم تتم إضافة عطور بعد</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const price = parseFloat(p.price) || 0;
    const discount = parseFloat(p.discount) || 0;
    let finalPrice = price;
    if (discount > 0 && discount < 100) {
      finalPrice = Math.round(price * (1 - discount / 100));
    }

    return `
      <tr>
        <td>
          <img src="${p.image || 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=100&q=80'}" 
               alt="${p.name}" class="table-perfume-thumb"
               onerror="this.src='https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=100&q=80'">
        </td>
        <td>
          <strong style="color: var(--text-primary); font-size: 0.95rem;">${p.name}</strong>
          ${p.badge_tag ? `<br><span class="badge badge-gold" style="font-size: 0.65rem; margin-top: 4px;">${p.badge_tag}</span>` : ''}
        </td>
        <td><span class="badge badge-category">${p.category || 'غير محدد'}</span></td>
        <td>${price} ر.س</td>
        <td>${discount > 0 ? `<span style="color: var(--accent-red); font-weight: 700;">-${discount}%</span>` : '—'}</td>
        <td style="color: var(--gold-light); font-weight: 800;">${finalPrice} ر.س</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">
          ثبات: ${p.longevity || 90}% | فوحان: ${p.sillage || 88}%
        </td>
        <td>
          <div class="table-actions">
            <button class="action-icon-btn action-edit" onclick="openEditModal('${p.id}')" title="تعديل">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-icon-btn action-delete" onclick="deletePerfume('${p.id}')" title="حذف">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/**
 * عرض جدول البنرات
 */
function renderBannersTable() {
  const tbody = document.getElementById("adminBannersTableBody");
  if (!tbody) return;

  if (adminBanners.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <i class="fas fa-images" style="font-size: 2rem; color: var(--gold-primary); margin-bottom: 0.5rem;"></i>
          <p>لا توجد بنرات إعلانية مضافة حتى الآن</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = adminBanners.map(b => `
    <tr>
      <td>
        <img src="${b.image}" alt="${b.title}" style="width: 80px; height: 45px; border-radius: 4px; object-fit: cover; border: 1px solid var(--gold-border);"
             onerror="this.src='https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=200&q=80'">
      </td>
      <td><strong>${b.title}</strong></td>
      <td><span class="badge badge-gold">${b.tag || 'عرض'}</span></td>
      <td>${b.button_text || 'اطلب الآن'}</td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; color: var(--text-muted);">${b.whatsapp_message || '—'}</td>
      <td>
        <button class="action-icon-btn action-delete" onclick="deleteBanner('${b.id}')" title="حذف">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>
  `).join("");
}

/**
 * حذف وتعديل العطور
 */
async function deletePerfume(id) {
  const p = adminPerfumes.find(x => String(x.id) === String(id));
  if (!p) return;

  if (!confirm(`هل أنت متأكد من حذف العطر "${p.name}" نهائياً؟`)) return;

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from("perfumes").delete().eq("id", id);
      if (error) {
        console.error("خطأ أثناء حذف العطر من سوبابيز:", error);
        showToast("تعذر حذف العطر من السحابة: " + error.message, "error");
        return;
      }
    } catch (e) {
      console.warn("Supabase delete exception:", e);
    }
  }

  adminPerfumes = adminPerfumes.filter(x => String(x.id) !== String(id));
  localStorage.setItem("trand_local_perfumes", JSON.stringify(adminPerfumes));
  showToast(`تم حذف العطر "${p.name}" نهائياً من قاعدة البيانات والواجهة`, "info");
  updateStats();
  renderPerfumesTable();
}

async function deleteBanner(id) {
  if (!confirm("هل أنت متأكد من حذف هذا البنر الإعلاني؟")) return;

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from("banners").delete().eq("id", id);
      if (error) {
        console.error("خطأ أثناء حذف البنر من سوبابيز:", error);
        showToast("تعذر حذف البنر من السحابة: " + error.message, "error");
        return;
      }
    } catch (e) {
      console.warn("Supabase delete exception:", e);
    }
  }

  adminBanners = adminBanners.filter(x => String(x.id) !== String(id));
  localStorage.setItem("trand_local_banners", JSON.stringify(adminBanners));
  showToast("تم حذف البنر الإعلاني بنجاح من قاعدة البيانات والواجهة", "info");
  updateStats();
  renderBannersTable();
}

function openEditModal(id) {
  const p = adminPerfumes.find(x => String(x.id) === String(id));
  if (!p) return;

  document.getElementById("editPId").value = p.id;
  document.getElementById("editPName").value = p.name || "";
  document.getElementById("editPCategory").value = p.category || "نيش";
  document.getElementById("editPPrice").value = p.price || 0;
  document.getElementById("editPDiscount").value = p.discount || 0;
  document.getElementById("editPSize").value = p.size || "100 مل";
  document.getElementById("editPType").value = p.type || "Eau de Parfum";
  document.getElementById("editPOffer").value = p.offer || "";
  document.getElementById("editPBadge").value = p.badge_tag || "";
  document.getElementById("editPTopNotes").value = p.top_notes || "";
  document.getElementById("editPHeartNotes").value = p.heart_notes || "";
  document.getElementById("editPBaseNotes").value = p.base_notes || "";
  document.getElementById("editPDescription").value = p.description || "";
  document.getElementById("editPImage").value = p.image || "";

  const modal = document.getElementById("editPerfumeModal");
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeEditModal() {
  const modal = document.getElementById("editPerfumeModal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
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
