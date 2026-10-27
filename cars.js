import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyAp8qwHFUVY2LXF1AKSBcDg8PJLFEuz3Q4",
  authDomain: "elsharqawy-cars.firebaseapp.com",
  projectId: "elsharqawy-cars",
  storageBucket: "elsharqawy-cars.firebasestorage.app",
  messagingSenderId: "171196078230",
  appId: "1:171196078230:web:5cb402e156c94b30080ab7",
  measurementId: "G-KM1EM4X6QV"
});
const db = getFirestore(app);
const carsRef = collection(db, "cars");
const byNewest = query(carsRef, orderBy("createdAt", "desc"));
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const money = value => Number(value || 0).toLocaleString("de-DE");
const brands = ["مرسيدس-بنز", "بي إم دبليو", "تسلا", "فورد", "بورش", "أودي"];
let cars = [], editingId = null, selectedCar = null;

function toast(message) {
  const el = $("toast-notification");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}
function showError(error) {
  console.error(error);
  alert("حدث خطأ أثناء تنفيذ العملية. راجع اتصالك وقواعد Firebase.");
}
function setOptions(select, values, firstOption = "") {
  if (!select) return;
  const previous = select.value;
  select.innerHTML = (firstOption ? `<option value="ALL">${escapeHTML(firstOption)}</option>` : "") +
    [...new Set(values.filter(Boolean))].map(v => `<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("");
  if ([...select.options].some(o => o.value === previous)) select.value = previous;
}
function refreshBrandOptions() {
  const extra = cars.map(c => c.brand).filter(b => !brands.includes(b));
  setOptions($("filter-brand"), [...brands, ...extra], "اختر الماركة (الكل)");
  const select = $("car-brand-select");
  if (select) {
    const value = select.value;
    select.innerHTML = '<option value="">اختر الماركة</option>' +
      [...new Set([...brands, ...extra])].map(b => `<option value="${escapeHTML(b)}">${escapeHTML(b)}</option>`).join("") +
      '<option value="NEW">+ إضافة ماركة جديدة...</option>';
    if ([...select.options].some(o => o.value === value)) select.value = value;
  }
}
function renderCars(list) {
  const container = $("cars-container");
  if (!container) return;
  container.innerHTML = list.length ? list.map(c => `
    <article class="car-card">
      <div class="car-img-box"><img src="${escapeHTML(c.img)}" alt="${escapeHTML(c.name)}" loading="lazy"><span class="car-badge">${escapeHTML(c.fuel)}</span></div>
      <div class="car-content">
        <div class="car-title-row"><h3 class="car-name">${escapeHTML(c.name)} - ${escapeHTML(c.year)}</h3></div>
        <div class="car-specs"><span class="spec-item">👤 ${escapeHTML(c.seats)} مقاعد</span><span class="spec-item">⚙️ ${escapeHTML(c.trans)}</span><span class="spec-item">📅 موديل ${escapeHTML(c.year)}</span></div>
        <div class="car-footer"><div class="car-price"><span class="price-num">${money(c.price)}</span><span class="price-label">جنيه مصري</span></div></div>
      </div>
    </article>`).join("") : '<p class="empty-cars">لا توجد سيارات معروضة حالياً.</p>';
}
function applyFilters() {
  const brand = $("filter-brand")?.value || "ALL";
  const fuel = $("filter-fuel")?.value || "ALL";
  const year = $("filter-year")?.value.trim() || "";
  renderCars(cars.filter(c => (brand === "ALL" || c.brand === brand) && (fuel === "ALL" || c.fuel === fuel) && (!year || String(c.year) === year)));
}
function resetForm() {
  editingId = null;
  $("add-car-form")?.reset();
  $("form-title") && ($("form-title").textContent = "إضافة سيارة جديدة لمعرض الشرقاوي");
  $("submit-btn") && ($("submit-btn").textContent = "حفظ السيارة في المعرض");
  $("cancel-edit-btn")?.classList.add("is-hidden");
  $("car-brand-custom")?.classList.add("is-hidden");
  $("car-brand-custom")?.removeAttribute("required");
  toggleImageSource();
}
function toggleImageSource() {
  const urlMode = $("img-source-url")?.checked ?? true;
  const url = $("car-img-url"), file = $("car-img-file");
  if (!url || !file) return;
  url.classList.toggle("is-hidden", !urlMode);
  url.required = urlMode;
  file.classList.toggle("is-hidden", urlMode);
  file.required = !urlMode;
}
function openModal(car) {
  selectedCar = car;
  $("modal-car-title").textContent = car.name || "إدارة السيارة";
  $("modal-car-info").textContent = `الماركة: ${car.brand} | السنة: ${car.year} | السعر: ${money(car.price)} ج.م`;
  $("car-action-modal").classList.remove("is-hidden");
}
function editSelectedCar() {
  if (!selectedCar) return;
  editingId = selectedCar.id;
  $("car-name").value = selectedCar.name || "";
  const select = $("car-brand-select"), custom = $("car-brand-custom");
  if ([...select.options].some(o => o.value === selectedCar.brand)) {
    select.value = selectedCar.brand;
    custom.classList.add("is-hidden"); custom.required = false; custom.value = "";
  } else {
    select.value = "NEW"; custom.classList.remove("is-hidden"); custom.required = true; custom.value = selectedCar.brand || "";
  }
  $("car-year").value = selectedCar.year || "";
  $("car-price").value = selectedCar.price || "";
  $("car-fuel").value = selectedCar.fuel || "بنزين";
  $("car-trans").value = selectedCar.trans || "أوتوماتيك";
  $("car-seats").value = selectedCar.seats || 5;
  $("img-source-url").checked = true; $("car-img-url").value = selectedCar.img || ""; $("car-img-file").value = "";
  toggleImageSource();
  $("form-title").textContent = "تعديل بيانات السيارة";
  $("submit-btn").textContent = "تعديل السيارة";
  $("cancel-edit-btn").classList.remove("is-hidden");
  $("car-action-modal").classList.add("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onSnapshot(byNewest, snapshot => {
  cars = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  refreshBrandOptions();
  applyFilters();
  renderSearchResults();
}, showError);

$("filter-form")?.addEventListener("submit", e => { e.preventDefault(); applyFilters(); });
$("filter-form")?.addEventListener("reset", () => setTimeout(applyFilters, 0));
$("cars-container")?.addEventListener("click", e => {
  const img = e.target.closest(".car-img-box img");
  if (!img) return;
  $("lightbox-img").src = img.src;
  $("lightbox-modal").classList.remove("is-hidden");
});
$("lightbox-modal")?.addEventListener("click", e => {
  if (e.target.id === "lightbox-modal" || e.target.closest(".lightbox-close-btn")) {
    $("lightbox-modal").classList.add("is-hidden");
    $("lightbox-img").src = "";
  }
});

$("car-brand-select")?.addEventListener("change", e => {
  const custom = $("car-brand-custom"), show = e.target.value === "NEW";
  custom.classList.toggle("is-hidden", !show); custom.required = show;
  if (!show) custom.value = "";
});
["img-source-url", "img-source-file"].forEach(id => $(id)?.addEventListener("change", toggleImageSource));
$("cancel-edit-btn")?.addEventListener("click", resetForm);

function renderSearchResults() {
  const box = $("dashboard-search-results"), input = $("dashboard-search-input");
  if (!box || !input) return;
  const term = input.value.trim().toLowerCase();
  if (!term) { box.innerHTML = ""; return; }
  const matches = cars.filter(c => [c.name, c.brand, c.price].some(v => String(v ?? "").toLowerCase().includes(term)));
  box.innerHTML = matches.length ? matches.map(c => `
    <div class="search-result-item" data-id="${escapeHTML(c.id)}" role="button" tabindex="0">
      <div class="search-result-info"><span class="search-result-name">${escapeHTML(c.name)} (${escapeHTML(c.year)})</span><span class="search-result-meta">${escapeHTML(c.brand)} - ${money(c.price)} ج.م</span></div><span>إدارة ⚙️</span>
    </div>`).join("") : "<p>لا توجد سيارات مطابقة للبحث</p>";
}
$("dashboard-search-input")?.addEventListener("input", renderSearchResults);
$("dashboard-search-results")?.addEventListener("click", e => {
  const item = e.target.closest("[data-id]");
  const car = cars.find(c => c.id === item?.dataset.id);
  if (car) openModal(car);
});
$("modal-close-btn")?.addEventListener("click", () => $("car-action-modal").classList.add("is-hidden"));
$("modal-edit-btn")?.addEventListener("click", editSelectedCar);
$("modal-delete-btn")?.addEventListener("click", async () => {
  if (!selectedCar || !confirm(`هل تريد حذف السيارة "${selectedCar.name}"؟`)) return;
  try {
    await deleteDoc(doc(db, "cars", selectedCar.id));
    $("car-action-modal").classList.add("is-hidden");
    $("dashboard-search-input").value = ""; renderSearchResults(); toast("تم حذف السيارة بنجاح");
  } catch (error) { showError(error); }
});

$("add-car-form")?.addEventListener("submit", async e => {
  e.preventDefault();
  const button = $("submit-btn"), originalText = button.textContent;
  button.disabled = true; button.textContent = "جاري المعالجة...";
  try {
    const brand = $("car-brand-select").value === "NEW" ? $("car-brand-custom").value.trim() : $("car-brand-select").value;
    let img = $("car-img-url").value.trim();
    const file = $("car-img-file").files[0];
    if (!$("img-source-url").checked && file) {
      img = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
      });
    }
    if (!brand) throw new Error("يرجى اختيار الماركة أو إدخال ماركة جديدة.");
    if (!img) throw new Error("يرجى إضافة صورة للسيارة.");
    const data = {
      name: $("car-name").value.trim(), brand, year: Number($("car-year").value),
      price: $("car-price").value.replace(/[^0-9]/g, ""), fuel: $("car-fuel").value,
      trans: $("car-trans").value, seats: $("car-seats").value, img,
      ...(editingId ? {} : { createdAt: new Date() })
    };
    if (editingId) await updateDoc(doc(db, "cars", editingId), data);
    else await addDoc(carsRef, data);
    toast(editingId ? "تم تعديل السيارة بنجاح" : "تم حفظ السيارة بنجاح");
    resetForm();
  } catch (error) { showError(error); }
  finally { button.disabled = false; if (!editingId) button.textContent = "حفظ السيارة في المعرض"; else button.textContent = originalText; }
});

toggleImageSource();