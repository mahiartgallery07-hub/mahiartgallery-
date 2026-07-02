/* =====================================================================
   MAHI ART GALLERY — script.js
   Vanilla JS. No frameworks. Talks directly to Supabase.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. CONFIG — your Supabase project credentials
   --------------------------------------------------------------------- */
const SUPABASE_URL = "https://eoamiuxziadhvazobsxi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYW1pdXh6aWFkaHZhem9ic3hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NTE3MjQsImV4cCI6MjA5ODAyNzcyNH0.FpS2k_MWQx84gGR4tHTgoQs1kiH9h7SnBQxwL8X6lyA";

const WHATSAPP_NUMBER = "919414417958"; // 91 + 9414417958
const ADMIN_TRIGGER = "adminmahi2026";
const STORAGE_BUCKET = "media";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------------------------------------------------------------------
   2. STATE
   --------------------------------------------------------------------- */
const state = {
  categories: [],
  heroBanners: [],
  currentCategory: null,
  currentCategoryBanners: [],
  currentGalleryImages: [],
  heroIndex: 0,
  heroTimer: null,
  viewerIndex: 0,
  viewerImages: [],
  viewerCategoryName: "",
  session: null,
  adminTab: "hero",
};

/* ---------------------------------------------------------------------
   3. DOM SHORTCUTS
   --------------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

function toast(msg, isError = false) {
  const t = $("toast");
  t.textContent = msg;
  t.style.background = isError ? "#c0392b" : "";
  t.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.add("hidden"), 2600);
}

function publicUrl(path) {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
}

/* ---------------------------------------------------------------------
   4. INIT
   --------------------------------------------------------------------- */
async function init() {
  const { data } = await supabase.auth.getSession();
  state.session = data.session;

  supabase.auth.onAuthStateChange((_event, session) => {
    state.session = session;
  });

  await Promise.all([loadHeroBanners(), loadCategories()]);
  renderHero();
  renderCategories();

  window.addEventListener("hashchange", route);
  route();
}

function route() {
  const hash = location.hash;
  if (hash.startsWith("#/category/")) {
    const id = hash.replace("#/category/", "");
    openCategory(id);
  } else if (hash === "#/admin") {
    openAdmin();
  } else {
    showHome();
  }
}

function showHome() {
  $("view-home").classList.remove("hidden");
  $("view-category").classList.add("hidden");
  $("admin-panel").classList.add("hidden");
}

/* =====================================================================
   5. HERO BANNER
   ===================================================================== */

async function loadHeroBanners() {
  const { data, error } = await supabase
    .from("hero_banners")
    .select("*")
    .order("position", { ascending: true });
  if (error) { console.error(error); return; }
  state.heroBanners = data || [];
}

function renderHero() {
  const track = $("hero-track");
  const dots = $("hero-dots");
  const section = $("hero-section");
  track.innerHTML = "";
  dots.innerHTML = "";

  if (!state.heroBanners.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  state.heroBanners.forEach((b, i) => {
    const slide = el("div", "hero-slide");
    slide.style.backgroundImage = `url("${publicUrl(b.image_url)}")`;
    track.appendChild(slide);

    const dot = el("div", "hero-dot" + (i === 0 ? " active" : ""));
    dot.addEventListener("click", () => goToHeroSlide(i));
    dots.appendChild(dot);
  });

  state.heroIndex = 0;
  updateHeroTrack();
  startHeroAutoplay();
}

function updateHeroTrack() {
  const track = $("hero-track");
  track.style.transform = `translateX(-${state.heroIndex * 100}%)`;
  document.querySelectorAll(".hero-dot").forEach((d, i) => {
    d.classList.toggle("active", i === state.heroIndex);
  });
}

function goToHeroSlide(i) {
  const n = state.heroBanners.length;
  state.heroIndex = ((i % n) + n) % n;
  updateHeroTrack();
  restartHeroAutoplay();
}

function startHeroAutoplay() {
  clearInterval(state.heroTimer);
  if (state.heroBanners.length < 2) return;
  state.heroTimer = setInterval(() => goToHeroSlide(state.heroIndex + 1), 4000);
}
function restartHeroAutoplay() { startHeroAutoplay(); }

$("hero-prev").addEventListener("click", () => goToHeroSlide(state.heroIndex - 1));
$("hero-next").addEventListener("click", () => goToHeroSlide(state.heroIndex + 1));

(function heroSwipe() {
  let startX = null;
  const track = $("hero-track");
  track.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const diff = e.changedTouches[0].clientX - startX;
    if (diff > 50) goToHeroSlide(state.heroIndex - 1);
    else if (diff < -50) goToHeroSlide(state.heroIndex + 1);
    startX = null;
  });
})();

/* =====================================================================
   6. CATEGORIES (HOME)
   ===================================================================== */

async function loadCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("position", { ascending: true });
  if (error) { console.error(error); return; }
  state.categories = data || [];
}

function renderCategories(filterText = "") {
  const row = $("categories-row");
  const noResults = $("no-results");
  row.innerHTML = "";

  const filtered = filterText
    ? state.categories.filter((c) => c.name.toLowerCase().includes(filterText.toLowerCase()))
    : state.categories;

  if (!filtered.length) {
    noResults.classList.remove("hidden");
  } else {
    noResults.classList.add("hidden");
  }

  filtered.forEach((cat) => {
    const item = el("button", "category-item");
    item.innerHTML = `
      <div class="category-ring">
        <div class="category-photo">
          <img src="${cat.image_url ? publicUrl(cat.image_url) : ''}" alt="${escapeHtml(cat.name)}" loading="lazy"/>
        </div>
      </div>
      <span class="category-name">${escapeHtml(cat.name)}</span>
    `;
    item.addEventListener("click", () => { location.hash = `#/category/${cat.id}`; });
    row.appendChild(item);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

/* =====================================================================
   7. SEARCH BAR (also hosts the hidden admin trigger)
   ===================================================================== */

$("search-input").addEventListener("input", (e) => {
  const val = e.target.value;
  if (val.trim() === ADMIN_TRIGGER) {
    e.target.value = "";
    renderCategories("");
    location.hash = "#/admin";
    return;
  }
  renderCategories(val);
});

/* =====================================================================
   8. CATEGORY PAGE
   ===================================================================== */

async function openCategory(id) {
  $("view-home").classList.add("hidden");
  $("admin-panel").classList.add("hidden");
  $("view-category").classList.remove("hidden");
  window.scrollTo(0, 0);

  const cat = state.categories.find((c) => c.id === id) || (await fetchCategoryById(id));
  if (!cat) { toast("Category not found", true); location.hash = "#/"; return; }

  state.currentCategory = cat;
  $("category-title").textContent = cat.name;

  const [{ data: banners }, { data: images }] = await Promise.all([
    supabase.from("category_banners").select("*").eq("category_id", id).order("position", { ascending: true }),
    supabase.from("gallery_images").select("*").eq("category_id", id).order("position", { ascending: true }),
  ]);

  state.currentCategoryBanners = banners || [];
  state.currentGalleryImages = images || [];

  renderCategoryBanners();
  renderGalleryGrid();
}

async function fetchCategoryById(id) {
  const { data } = await supabase.from("categories").select("*").eq("id", id).single();
  return data;
}

function renderCategoryBanners() {
  const wrap = $("category-banners");
  wrap.innerHTML = "";
  if (!state.currentCategoryBanners.length) { wrap.classList.add("hidden"); return; }
  wrap.classList.remove("hidden");
  state.currentCategoryBanners.forEach((b) => {
    const div = el("div", "category-banner-img");
    div.innerHTML = `<img src="${publicUrl(b.image_url)}" alt="${escapeHtml(state.currentCategory.name)} banner" loading="lazy"/>`;
    wrap.appendChild(div);
  });
}

function renderGalleryGrid() {
  const grid = $("gallery-grid");
  const empty = $("gallery-empty");
  grid.innerHTML = "";

  if (!state.currentGalleryImages.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  state.currentGalleryImages.forEach((img, idx) => {
    const card = el("div", "gallery-card");
    card.innerHTML = `
      <img class="gallery-card-img" src="${publicUrl(img.image_url)}" alt="${escapeHtml(state.currentCategory.name)}" loading="lazy"/>
      <div class="gallery-card-footer">
        <span class="gallery-card-cat">${escapeHtml(state.currentCategory.name)}</span>
        <button class="share-btn" aria-label="Share" data-idx="${idx}">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81a3 3 0 1 0-3-3c0 .24.04.47.09.7L8.04 9.81A2.99 2.99 0 0 0 3 12a3 3 0 0 0 5.04 2.19l7.12 4.16c-.05.21-.08.43-.08.65a2.92 2.92 0 1 0 2.92-2.92Z"/></svg>
        </button>
      </div>
    `;
    card.querySelector(".gallery-card-img").addEventListener("click", () => openViewer(idx));
    card.querySelector(".share-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      shareImage(img);
    });
    grid.appendChild(card);
  });
}

$("category-back-btn").addEventListener("click", () => { location.hash = "#/"; });

/* =====================================================================
   9. IMAGE VIEWER (fullscreen, swipe, zoom, share)
   ===================================================================== */

function openViewer(idx) {
  state.viewerImages = state.currentGalleryImages;
  state.viewerCategoryName = state.currentCategory.name;
  state.viewerIndex = idx;
  $("viewer").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  renderViewer();
}

function closeViewer() {
  $("viewer").classList.add("hidden");
  document.body.style.overflow = "";
}

function renderViewer() {
  const img = $("viewer-img");
  const cap = $("viewer-caption");
  const current = state.viewerImages[state.viewerIndex];
  img.src = publicUrl(current.image_url);
  img.classList.remove("zoomed");
  img.style.transform = "";
  cap.textContent = state.viewerCategoryName;
}

function viewerNext() {
  state.viewerIndex = (state.viewerIndex + 1) % state.viewerImages.length;
  renderViewer();
}
function viewerPrev() {
  state.viewerIndex = (state.viewerIndex - 1 + state.viewerImages.length) % state.viewerImages.length;
  renderViewer();
}

$("viewer-close").addEventListener("click", closeViewer);
$("viewer-next").addEventListener("click", viewerNext);
$("viewer-prev").addEventListener("click", viewerPrev);
$("viewer-share").addEventListener("click", () => {
  shareImage(state.viewerImages[state.viewerIndex]);
});

document.addEventListener("keydown", (e) => {
  if ($("viewer").classList.contains("hidden")) return;
  if (e.key === "Escape") closeViewer();
  if (e.key === "ArrowRight") viewerNext();
  if (e.key === "ArrowLeft") viewerPrev();
});

// zoom toggle (click / double-tap)
(function viewerZoom() {
  const img = $("viewer-img");
  img.addEventListener("click", () => {
    const zoomed = img.classList.toggle("zoomed");
    img.style.transform = zoomed ? "scale(2)" : "scale(1)";
  });
})();

// swipe on viewer
(function viewerSwipe() {
  let startX = null;
  const stage = $("viewer-stage");
  stage.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) viewerPrev(); else viewerNext();
    }
    startX = null;
  });
})();

function shareImage(imgRow) {
  const categoryName = state.currentCategory ? state.currentCategory.name : state.viewerCategoryName;
  const url = publicUrl(imgRow.image_url);
  const message =
    `Hello, I am interested in this product.\n\n` +
    `Could you please tell me the price and shipping cost?\n\n` +
    `Category:\n${categoryName}\n\n` +
    `Image:\n${url}`;
  const link = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(link, "_blank", "noopener");
}

/* =====================================================================
   10. ADMIN — AUTH
   ===================================================================== */

async function openAdmin() {
  $("view-home").classList.add("hidden");
  $("view-category").classList.add("hidden");

  const { data } = await supabase.auth.getSession();
  state.session = data.session;

  if (!state.session) {
    $("admin-login").classList.remove("hidden");
    $("admin-panel").classList.add("hidden");
  } else {
    $("admin-login").classList.add("hidden");
    $("admin-panel").classList.remove("hidden");
    await refreshAdminData();
  }
}

$("admin-login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("admin-email").value.trim();
  const password = $("admin-password").value;
  const errBox = $("admin-login-error");
  errBox.classList.add("hidden");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errBox.textContent = error.message;
    errBox.classList.remove("hidden");
    return;
  }
  state.session = data.session;
  $("admin-login").classList.add("hidden");
  $("admin-login-form").reset();
  $("admin-panel").classList.remove("hidden");
  await refreshAdminData();
});

$("admin-login-cancel").addEventListener("click", () => {
  $("admin-login").classList.add("hidden");
  $("admin-login-form").reset();
  location.hash = "#/";
});

$("admin-exit-btn").addEventListener("click", () => { location.hash = "#/"; });

$("admin-logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  state.session = null;
  toast("Logged out");
  location.hash = "#/";
});

/* Admin tabs */
$("admin-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".admin-tab");
  if (!btn) return;
  document.querySelectorAll(".admin-tab").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".admin-section").forEach((s) => s.classList.add("hidden"));
  const tab = btn.dataset.tab;
  state.adminTab = tab;
  $(`admin-tab-${tab}`).classList.remove("hidden");
});

async function refreshAdminData() {
  await Promise.all([loadHeroBanners(), loadCategories()]);
  renderHeroAdminList();
  renderCategoriesAdminList();
  populateGalleryCategorySelect();
  renderHero();
  renderCategories();
}

/* =====================================================================
   11. STORAGE UPLOAD HELPER
   ===================================================================== */

async function uploadImage(file, folder) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${uid()}-${safeName}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

async function replaceImage(oldPath, file, folder) {
  const newPath = await uploadImage(file, folder);
  if (oldPath) {
    await supabase.storage.from(STORAGE_BUCKET).remove([oldPath]).catch(() => {});
  }
  return newPath;
}

async function deleteStorageObject(path) {
  if (!path) return;
  await supabase.storage.from(STORAGE_BUCKET).remove([path]).catch(() => {});
}

/* Generic drag & drop reorder for a list container.
   items: array of {id, ...} in current order (mutated in place)
   onCommit(orderedIds) persists new positions to DB */
function attachDragReorder(container, itemSelector, items, table, onDone) {
  let dragEl = null;

  container.querySelectorAll(itemSelector).forEach((node) => {
    node.setAttribute("draggable", "true");

    node.addEventListener("dragstart", () => {
      dragEl = node;
      node.classList.add("dragging");
    });
    node.addEventListener("dragend", () => {
      node.classList.remove("dragging");
      dragEl = null;
      commitOrder();
    });
    node.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!dragEl || dragEl === node) return;
      const rect = node.getBoundingClientRect();
      const isGrid = container.classList.contains("admin-list-grid");
      const before = isGrid
        ? e.clientX < rect.left + rect.width / 2
        : e.clientY < rect.top + rect.height / 2;
      container.insertBefore(dragEl, before ? node : node.nextSibling);
    });
  });

  function commitOrder() {
    const idsInOrder = Array.from(container.querySelectorAll(itemSelector)).map((n) => n.dataset.id);
    onDone(idsInOrder);
  }
}

async function persistPositions(table, idsInOrder) {
  try {
    await Promise.all(
      idsInOrder.map((id, i) => supabase.from(table).update({ position: i }).eq("id", id))
    );
    toast("Order updated");
  } catch (err) {
    console.error(err);
    toast("Could not save order", true);
  }
}

/* =====================================================================
   12. ADMIN — HERO BANNERS
   ===================================================================== */

function renderHeroAdminList() {
  const list = $("hero-admin-list");
  list.innerHTML = "";
  state.heroBanners.forEach((b) => {
    const row = el("div", "admin-row");
    row.dataset.id = b.id;
    row.innerHTML = `
      <img src="${publicUrl(b.image_url)}" alt="banner"/>
      <div class="admin-row-name">Hero banner</div>
      <div class="admin-row-actions">
        <label class="icon-btn" title="Replace">
          ⟲<input type="file" accept="image/*" hidden class="replace-input"/>
        </label>
        <button class="icon-btn danger" title="Delete">🗑</button>
      </div>
    `;
    row.querySelector(".replace-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const newPath = await replaceImage(b.image_url, file, "hero");
        await supabase.from("hero_banners").update({ image_url: newPath }).eq("id", b.id);
        toast("Banner replaced");
        await refreshAdminData();
      } catch (err) { toast(err.message, true); }
    });
    row.querySelector(".icon-btn.danger").addEventListener("click", async () => {
      if (!confirm("Delete this banner?")) return;
      await supabase.from("hero_banners").delete().eq("id", b.id);
      await deleteStorageObject(b.image_url);
      toast("Banner deleted");
      await refreshAdminData();
    });
    list.appendChild(row);
  });

  attachDragReorder(list, ".admin-row", state.heroBanners, "hero_banners", (ids) =>
    persistPositions("hero_banners", ids)
  );
}

async function handleHeroFiles(files) {
  if (!files.length) return;
  const startPos = state.heroBanners.length;
  try {
    for (let i = 0; i < files.length; i++) {
      const path = await uploadImage(files[i], "hero");
      await supabase.from("hero_banners").insert({ image_url: path, position: startPos + i });
    }
    toast("Banner(s) uploaded");
    await refreshAdminData();
  } catch (err) {
    toast(err.message, true);
  }
}

$("hero-file-input").addEventListener("change", (e) => handleHeroFiles(Array.from(e.target.files)));
setupDropzone($("hero-dropzone"), (files) => handleHeroFiles(files));

function setupDropzone(zone, onFiles) {
  ["dragenter", "dragover"].forEach((evt) =>
    zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach((evt) =>
    zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove("dragover"); })
  );
  zone.addEventListener("drop", (e) => {
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
    onFiles(files);
  });
}

/* =====================================================================
   13. ADMIN — CATEGORIES
   ===================================================================== */

let newCategoryImageFile = null;

$("new-category-image").addEventListener("change", (e) => {
  newCategoryImageFile = e.target.files[0] || null;
  $("new-category-filename").textContent = newCategoryImageFile ? newCategoryImageFile.name : "";
});

$("add-category-btn").addEventListener("click", async () => {
  const name = $("new-category-name").value.trim();
  if (!name) { toast("Enter a category name", true); return; }
  try {
    let imagePath = null;
    if (newCategoryImageFile) imagePath = await uploadImage(newCategoryImageFile, "categories");
    await supabase.from("categories").insert({
      name,
      image_url: imagePath,
      position: state.categories.length,
    });
    $("new-category-name").value = "";
    $("new-category-image").value = "";
    $("new-category-filename").textContent = "";
    newCategoryImageFile = null;
    toast("Category added");
    await refreshAdminData();
  } catch (err) {
    toast(err.message, true);
  }
});

function renderCategoriesAdminList() {
  const list = $("categories-admin-list");
  list.innerHTML = "";
  state.categories.forEach((cat) => {
    const row = el("div", "admin-row");
    row.dataset.id = cat.id;
    row.innerHTML = `
      <img src="${cat.image_url ? publicUrl(cat.image_url) : ''}" alt="${escapeHtml(cat.name)}"/>
      <div class="admin-row-name">
        <input type="text" value="${escapeHtml(cat.name)}" class="rename-input"/>
      </div>
      <div class="admin-row-actions">
        <label class="icon-btn" title="Change image">
          🖼<input type="file" accept="image/*" hidden class="change-image-input"/>
        </label>
        <button class="icon-btn danger" title="Delete">🗑</button>
      </div>
    `;

    const nameInput = row.querySelector(".rename-input");
    nameInput.addEventListener("change", async () => {
      const newName = nameInput.value.trim();
      if (!newName || newName === cat.name) return;
      await supabase.from("categories").update({ name: newName }).eq("id", cat.id);
      toast("Category renamed");
      await refreshAdminData();
    });

    row.querySelector(".change-image-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const newPath = await replaceImage(cat.image_url, file, "categories");
        await supabase.from("categories").update({ image_url: newPath }).eq("id", cat.id);
        toast("Category image updated");
        await refreshAdminData();
      } catch (err) { toast(err.message, true); }
    });

    row.querySelector(".icon-btn.danger").addEventListener("click", async () => {
      if (!confirm(`Delete category "${cat.name}"? This also removes its banners and gallery images.`)) return;
      await supabase.from("categories").delete().eq("id", cat.id);
      await deleteStorageObject(cat.image_url);
      toast("Category deleted");
      await refreshAdminData();
    });

    list.appendChild(row);
  });

  attachDragReorder(list, ".admin-row", state.categories, "categories", (ids) =>
    persistPositions("categories", ids)
  );
}

/* =====================================================================
   14. ADMIN — GALLERY TAB (category banners + gallery images)
   ===================================================================== */

function populateGalleryCategorySelect() {
  const select = $("gallery-category-select");
  const prev = select.value;
  select.innerHTML = state.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  if (prev && state.categories.some((c) => c.id === prev)) select.value = prev;
  if (select.value) loadGalleryTabData(select.value);
}

$("gallery-category-select").addEventListener("change", (e) => loadGalleryTabData(e.target.value));

let galleryTabCategoryId = null;
let galleryTabBanners = [];
let galleryTabImages = [];

async function loadGalleryTabData(categoryId) {
  galleryTabCategoryId = categoryId;
  if (!categoryId) return;
  const [{ data: banners }, { data: images }] = await Promise.all([
    supabase.from("category_banners").select("*").eq("category_id", categoryId).order("position", { ascending: true }),
    supabase.from("gallery_images").select("*").eq("category_id", categoryId).order("position", { ascending: true }),
  ]);
  galleryTabBanners = banners || [];
  galleryTabImages = images || [];
  renderCatBannerAdminList();
  renderGalleryAdminList();
}

/* --- category banners (max 3) --- */

function renderCatBannerAdminList() {
  const list = $("catbanner-admin-list");
  list.innerHTML = "";
  galleryTabBanners.forEach((b) => {
    const row = el("div", "admin-row");
    row.dataset.id = b.id;
    row.innerHTML = `
      <img src="${publicUrl(b.image_url)}" alt="banner"/>
      <div class="admin-row-name">Banner</div>
      <div class="admin-row-actions">
        <label class="icon-btn" title="Replace">
          ⟲<input type="file" accept="image/*" hidden class="replace-input"/>
        </label>
        <button class="icon-btn danger" title="Delete">🗑</button>
      </div>
    `;
    row.querySelector(".replace-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const newPath = await replaceImage(b.image_url, file, `category-banners/${galleryTabCategoryId}`);
        await supabase.from("category_banners").update({ image_url: newPath }).eq("id", b.id);
        toast("Banner replaced");
        await loadGalleryTabData(galleryTabCategoryId);
        if (state.currentCategory && state.currentCategory.id === galleryTabCategoryId) openCategory(galleryTabCategoryId);
      } catch (err) { toast(err.message, true); }
    });
    row.querySelector(".icon-btn.danger").addEventListener("click", async () => {
      if (!confirm("Delete this banner?")) return;
      await supabase.from("category_banners").delete().eq("id", b.id);
      await deleteStorageObject(b.image_url);
      toast("Banner deleted");
      await loadGalleryTabData(galleryTabCategoryId);
    });
    list.appendChild(row);
  });

  attachDragReorder(list, ".admin-row", galleryTabBanners, "category_banners", (ids) =>
    persistPositions("category_banners", ids)
  );
}

async function handleCatBannerFiles(files) {
  if (!files.length) return;
  if (!galleryTabCategoryId) { toast("Choose a category first", true); return; }
  if (galleryTabBanners.length + files.length > 3) {
    toast("A category can have at most 3 banners", true);
    return;
  }
  try {
    const startPos = galleryTabBanners.length;
    for (let i = 0; i < files.length; i++) {
      const path = await uploadImage(files[i], `category-banners/${galleryTabCategoryId}`);
      await supabase.from("category_banners").insert({
        category_id: galleryTabCategoryId,
        image_url: path,
        position: startPos + i,
      });
    }
    toast("Banner(s) uploaded");
    await loadGalleryTabData(galleryTabCategoryId);
  } catch (err) {
    toast(err.message, true);
  }
}

$("catbanner-file-input").addEventListener("change", (e) => handleCatBannerFiles(Array.from(e.target.files)));
setupDropzone($("catbanner-dropzone"), (files) => handleCatBannerFiles(files));

/* --- gallery images (bulk upload, preview, reorder) --- */

let pendingGalleryFiles = [];

function renderUploadPreview() {
  const wrap = $("upload-preview");
  wrap.innerHTML = "";
  pendingGalleryFiles.forEach((file) => {
    const img = el("img");
    img.src = URL.createObjectURL(file);
    wrap.appendChild(img);
  });
}

async function handleGalleryFiles(files) {
  if (!files.length) return;
  if (!galleryTabCategoryId) { toast("Choose a category first", true); return; }
  pendingGalleryFiles = files;
  renderUploadPreview();

  try {
    const startPos = galleryTabImages.length;
    for (let i = 0; i < files.length; i++) {
      const path = await uploadImage(files[i], `gallery/${galleryTabCategoryId}`);
      await supabase.from("gallery_images").insert({
        category_id: galleryTabCategoryId,
        image_url: path,
        position: startPos + i,
      });
    }
    toast(`${files.length} image(s) uploaded`);
    pendingGalleryFiles = [];
    renderUploadPreview();
    await loadGalleryTabData(galleryTabCategoryId);
  } catch (err) {
    toast(err.message, true);
  }
}

$("gallery-file-input").addEventListener("change", (e) => handleGalleryFiles(Array.from(e.target.files)));
setupDropzone($("gallery-dropzone"), (files) => handleGalleryFiles(files));

function renderGalleryAdminList() {
  const list = $("gallery-admin-list");
  list.innerHTML = "";
  galleryTabImages.forEach((img) => {
    const card = el("div", "admin-grid-card");
    card.dataset.id = img.id;
    card.innerHTML = `
      <img src="${publicUrl(img.image_url)}" alt="gallery image"/>
      <div class="admin-row-actions">
        <label class="icon-btn" title="Replace">
          ⟲<input type="file" accept="image/*" hidden class="replace-input"/>
        </label>
        <button class="icon-btn danger" title="Delete">🗑</button>
      </div>
    `;
    card.querySelector(".replace-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const newPath = await replaceImage(img.image_url, file, `gallery/${galleryTabCategoryId}`);
        await supabase.from("gallery_images").update({ image_url: newPath }).eq("id", img.id);
        toast("Image replaced");
        await loadGalleryTabData(galleryTabCategoryId);
      } catch (err) { toast(err.message, true); }
    });
    card.querySelector(".icon-btn.danger").addEventListener("click", async () => {
      if (!confirm("Delete this image?")) return;
      await supabase.from("gallery_images").delete().eq("id", img.id);
      await deleteStorageObject(img.image_url);
      toast("Image deleted");
      await loadGalleryTabData(galleryTabCategoryId);
    });
    list.appendChild(card);
  });

  attachDragReorder(list, ".admin-grid-card", galleryTabImages, "gallery_images", (ids) =>
    persistPositions("gallery_images", ids)
  );
}

/* ---------------------------------------------------------------------
   15. GO
   --------------------------------------------------------------------- */
init();
