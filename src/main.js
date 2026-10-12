import { works } from "./works.js";


const grid = document.getElementById("works-grid");

grid.innerHTML = works
  .map((w) => {
    const hasImage = w.images.length > 0;
    const sizeClass = w.size ? `work--${w.size}` : "";
    const cover = hasImage ? `<img src="${w.images[0]}" alt="${w.title}" loading="lazy" />` : "";
    // Без фото плитка получает фирменный градиент
    const style = hasImage
      ? ""
      : ` style="background: linear-gradient(135deg, #600303, #3f2724)"`;

    return `
    <button type="button" class="work ${sizeClass}" data-id="${w.id}"${style} aria-label="Подробнее: ${w.title}">
      ${cover}
      <span class="work-overlay"></span>
      <span class="work-text">
        <span class="work-category">${w.category}</span>
        <span class="work-title">${w.title}</span>
        <span class="work-more">Подробнее →</span>
      </span>
    </button>`;
  })
  .join("");

/* ============================================================
   2. Модальное окно и слайдер
   ============================================================ */

const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const slider = document.getElementById("slider");
const track = document.getElementById("slider-track");
const dots = document.getElementById("slider-dots");
const counter = document.getElementById("slider-counter");
const prevBtn = document.getElementById("slider-prev");
const nextBtn = document.getElementById("slider-next");

let currentWork = null;
let currentIndex = 0;

function renderSlide() {
  track.style.transform = `translateX(-${currentIndex * 100}%)`;
  dots.querySelectorAll("button").forEach((dot, i) => {
    dot.classList.toggle("is-active", i === currentIndex);
  });
  counter.textContent = `${currentIndex + 1} / ${currentWork.images.length}`;
}

function goTo(step) {
  if (!currentWork || currentWork.images.length < 2) return;
  const n = currentWork.images.length;
  currentIndex = (currentIndex + step + n) % n;
  renderSlide();
}
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Оборачивает "Слово:" в начале строки в <em><strong>
function formatLabels(text) {
  return escapeHtml(text).replace(
    /^([^\n:]{1,40}):/gm,
    '<em class="label"><strong>$1:</strong></em>'
  );
}
// Показывает/скрывает пару <dt>+<dd> целиком в зависимости от содержимого
function toggleField(wrapId, value) {
  if (value === undefined) value = "";
  const wrap = document.getElementById(wrapId);
  const isEmpty =
    value == null ||
    (typeof value === "string" && value.trim() === "");
  wrap.hidden = isEmpty;
  return !isEmpty;
}
function openModal(work) {
  currentWork = work;
  currentIndex = 0;

  const hasImages = work.images.length > 0;
  slider.hidden = !hasImages;

  if (hasImages) {
  track.style.transition = "none";
  track.innerHTML = work.images
    .map((src, i) => `
      <div class="slide">
        <img
          src="${src}"
          alt="${work.title} — фото ${i + 1}"
          draggable="false"
          loading="lazy"
        />
      </div>`)
    .join("");
    // Стрелки, точки и счётчик нужны только при нескольких фото
    const multi = work.images.length > 1;
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;
    dots.hidden = !multi;
    counter.hidden = !multi;

    renderSlide();
    track.offsetHeight; // сбрасываем переход, чтобы не ехать от прошлой работы
    track.style.transition = "";
  }
document.getElementById("modal-category").textContent = work.category;
document.getElementById("modal-title").textContent = work.title;

// Задача
const hasTask = toggleField("modal-task-wrap", work.task);
document.getElementById("modal-task").textContent = hasTask ? work.task : "";

// Результат
const hasResult = toggleField("modal-result-wrap", work.result);
document.getElementById("modal-result").textContent = hasResult ? work.result : "";

// Решение (рендерится через formatLabels, поэтому пишем только если есть текст)
const hasSolution = toggleField("modal-solution-wrap", work.solution);
document.getElementById("modal-solution").innerHTML = hasSolution
  ? formatLabels(work.solution)
  : "";

  modal.hidden = false;
  document.body.classList.add("no-scroll");
  modalClose.focus();
}

function closeModal() {
  modal.hidden = true;
  currentWork = null;
  document.body.classList.remove("no-scroll");
}

grid.addEventListener("click", (e) => {
  const card = e.target.closest(".work");
  if (!card) return;
  const work = works.find((w) => w.id === card.dataset.id);
  if (work) openModal(work);
});

modalClose.addEventListener("click", closeModal);

// Клик по затемнению закрывает окно
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

prevBtn.addEventListener("click", () => goTo(-1));
nextBtn.addEventListener("click", () => goTo(1));

dots.addEventListener("click", (e) => {
  const dot = e.target.closest("[data-dot]");
  if (!dot) return;
  currentIndex = Number(dot.dataset.dot);
  renderSlide();
});

// Клавиатура: Esc закрывает, стрелки листают
document.addEventListener("keydown", (e) => {
  if (modal.hidden) return;
  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowLeft") goTo(-1);
  if (e.key === "ArrowRight") goTo(1);
});

// Свайп на телефоне
let touchX = null;
slider.addEventListener(
  "touchstart",
  (e) => {
    touchX = e.touches[0].clientX;
  },
  { passive: true }
);
slider.addEventListener(
  "touchend",
  (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (dx > 50) goTo(-1);
    if (dx < -50) goTo(1);
    touchX = null;
  },
  { passive: true }
);

/* ============================================================
   3. Экран загрузки
   Скрывается, когда загружены страница, шрифты и все фото,
   но не раньше MIN_DURATION. Если что-то зависло, откроется
   сам через MAX_WAIT.
   ============================================================ */

const MIN_DURATION = 3000;
const FADE_DURATION = 600;
const MAX_WAIT = 15000;

const preloader = document.getElementById("preloader");
const bar = document.getElementById("preloader-bar");
const label = document.getElementById("preloader-label");

function waitForPageLoad() {
  if (document.readyState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener("load", resolve, { once: true });
  });
}

// Картинка, которая уже есть на странице (не lazy)
function waitForImage(img) {
  if (img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", resolve, { once: true });
  });
}

// Принудительная загрузка фото работ в кэш браузера
function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.src = src;
  });
}

function startPreloader() {
  const start = performance.now();

  const eagerImages = Array.from(document.images).filter((img) => img.loading !== "lazy");
  const workImages = works.flatMap((w) => w.images);

  const tasks = [
    waitForPageLoad(),
    document.fonts.ready,
    ...eagerImages.map(waitForImage),
    ...workImages.map(preloadImage),
  ];

  const total = tasks.length;
  let done = 0;

  tasks.forEach((task) => {
    task.then(() => {
      done += 1;
      const pct = Math.round((done / total) * 100);
      bar.style.width = `${pct}%`;
      label.textContent = `Загрузка… ${pct}%`;
    });
  });

  const timeout = new Promise((resolve) => setTimeout(resolve, MAX_WAIT));

  Promise.race([Promise.all(tasks), timeout]).then(() => {
    const wait = Math.max(0, MIN_DURATION - (performance.now() - start));
    setTimeout(() => preloader.classList.add("is-fading"), wait);
    setTimeout(() => {
      preloader.hidden = true;
    }, wait + FADE_DURATION);
  });
}

startPreloader();
