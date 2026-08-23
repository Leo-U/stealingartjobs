const state = { comics: [], currentIndex: 0 };

const elements = {
  archiveButton: document.querySelector("#archive-button"),
  archiveClose: document.querySelector("#archive-close"),
  archivePanel: document.querySelector("#archive-panel"),
  archiveList: document.querySelector("#archive-list"),
  comicNumber: document.querySelector("#comic-number"),
  comicDate: document.querySelector("#comic-date"),
  comicTitle: document.querySelector("#comic-title"),
  comicImage: document.querySelector("#comic-image"),
  comicCaption: document.querySelector("#comic-caption"),
  comicPrevious: document.querySelector("#comic-previous"),
  comicNext: document.querySelector("#comic-next"),
  firstButton: document.querySelector("#first-button"),
  previousButton: document.querySelector("#previous-button"),
  nextButton: document.querySelector("#next-button"),
  latestButton: document.querySelector("#latest-button"),
  readerPosition: document.querySelector("#reader-position"),
  themeButton: document.querySelector("#theme-button"),
};

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("saj-theme", theme);
  elements.themeButton.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
}

function toggleArchive(force) {
  const shouldOpen = force ?? !elements.archivePanel.classList.contains("open");
  elements.archivePanel.classList.toggle("open", shouldOpen);
  elements.archivePanel.setAttribute("aria-hidden", String(!shouldOpen));
  elements.archiveButton.setAttribute("aria-expanded", String(shouldOpen));
  document.body.style.overflow = shouldOpen ? "hidden" : "";
  if (shouldOpen) elements.archiveClose.focus();
}

function renderArchive() {
  if (!state.comics.length) {
    elements.archiveList.innerHTML = '<li class="archive-empty">The first comic will appear here when it arrives.</li>';
    return;
  }

  elements.archiveList.innerHTML = state.comics.map((comic, index) => `
    <li>
      <button type="button" data-comic-index="${index}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${comic.title}</strong>
        <span>${comic.date}</span>
      </button>
    </li>
  `).join("");
}

function renderCaption(caption = "") {
  elements.comicCaption.replaceChildren();
  const parts = caption.split(/(\*[^*]+\*)/g);
  parts.forEach((part) => {
    if (part.startsWith("*") && part.endsWith("*")) {
      const emphasis = document.createElement("em");
      emphasis.textContent = part.slice(1, -1);
      elements.comicCaption.append(emphasis);
    } else {
      elements.comicCaption.append(document.createTextNode(part));
    }
  });
  elements.comicCaption.hidden = !caption;
}

function showComic(index, updateHash = true) {
  if (!state.comics.length) return;
  state.currentIndex = Math.max(0, Math.min(index, state.comics.length - 1));
  const comic = state.comics[state.currentIndex];
  elements.comicNumber.textContent = `Comic ${String(state.currentIndex + 1).padStart(2, "0")}`;
  elements.comicDate.textContent = comic.date;
  elements.comicTitle.textContent = comic.title;
  elements.comicImage.src = comic.image;
  elements.comicImage.alt = comic.alt;
  elements.comicImage.hidden = false;
  renderCaption(comic.caption);
  elements.readerPosition.textContent = `${state.currentIndex + 1} / ${state.comics.length}`;
  elements.firstButton.disabled = state.currentIndex === 0;
  elements.previousButton.disabled = state.currentIndex === 0;
  elements.comicPrevious.disabled = state.currentIndex === 0;
  elements.nextButton.disabled = state.currentIndex === state.comics.length - 1;
  elements.comicNext.disabled = state.currentIndex === state.comics.length - 1;
  elements.latestButton.disabled = state.currentIndex === state.comics.length - 1;
  if (updateHash) history.replaceState(null, "", `#comic-${comic.slug}`);
}

async function loadComics() {
  try {
    const response = await fetch("comics.json");
    if (!response.ok) throw new Error("Could not load comic archive");
    state.comics = await response.json();
    renderArchive();
    if (!state.comics.length) return;
    const slugAliases = { "angry-moderator": "automoderation" };
    const requestedSlug = location.hash.replace("#comic-", "");
    const slug = slugAliases[requestedSlug] || requestedSlug;
    const requestedIndex = state.comics.findIndex((comic) => comic.slug === slug);
    const initialIndex = requestedIndex >= 0 ? requestedIndex : state.comics.length - 1;
    showComic(initialIndex, false);
    if (location.hash.startsWith("#comic-") && state.comics[initialIndex].slug !== requestedSlug) {
      history.replaceState(null, "", `#comic-${state.comics[initialIndex].slug}`);
    }
  } catch {
    renderArchive();
  }
}

elements.archiveButton.addEventListener("click", () => toggleArchive());
elements.archiveClose.addEventListener("click", () => toggleArchive(false));
elements.archiveList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-comic-index]");
  if (!button) return;
  showComic(Number(button.dataset.comicIndex));
  toggleArchive(false);
  document.querySelector("#comic").scrollIntoView();
});
elements.firstButton.addEventListener("click", () => showComic(0));
elements.previousButton.addEventListener("click", () => showComic(state.currentIndex - 1));
elements.nextButton.addEventListener("click", () => showComic(state.currentIndex + 1));
elements.comicPrevious.addEventListener("click", () => showComic(state.currentIndex - 1));
elements.comicNext.addEventListener("click", () => showComic(state.currentIndex + 1));
elements.latestButton.addEventListener("click", () => showComic(state.comics.length - 1));
elements.themeButton.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") toggleArchive(false);
  if (!elements.archivePanel.classList.contains("open") && event.key === "ArrowLeft") showComic(state.currentIndex - 1);
  if (!elements.archivePanel.classList.contains("open") && event.key === "ArrowRight") showComic(state.currentIndex + 1);
});

const savedTheme = localStorage.getItem("saj-theme");
setTheme(savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
loadComics();
