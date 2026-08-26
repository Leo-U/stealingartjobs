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
  comicTranscript: document.querySelector("#comic-transcript"),
  comicTranscriptCopy: document.querySelector("#comic-transcript-copy"),
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
      <a href="/comics/${comic.slug}/" data-comic-index="${index}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${comic.title}</strong>
        <span>${comic.date}</span>
      </a>
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

function renderTranscript(lines = []) {
  elements.comicTranscriptCopy.replaceChildren();
  lines.forEach((line) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    elements.comicTranscriptCopy.append(paragraph);
  });
  elements.comicTranscript.hidden = !lines.length;
}

function comicPath(comic) {
  return `/comics/${comic.slug}/`;
}

function comicSlugFromPath() {
  const match = location.pathname.match(/^\/comics\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function setMeta(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute("content", value);
}

function updatePageMetadata(comic, isHome = false) {
  const title = isHome ? "Stealing Art Jobs — Independent Webcomic" : `${comic.title} — Stealing Art Jobs`;
  const description = isHome
    ? "Stealing Art Jobs is an independent webcomic about art, work, technology, and strange incentives."
    : comic.description;
  const url = `https://stealingartjobs.com${isHome ? "/" : comicPath(comic)}`;
  const imageUrl = new URL(comic.image, "https://stealingartjobs.com").href;
  document.title = title;
  document.querySelector('meta[name="description"]').setAttribute("content", description);
  document.querySelector('link[rel="canonical"]').setAttribute("href", url);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:image"]', imageUrl);
  setMeta('meta[property="og:url"]', url);
}

function showComic(index, updateUrl = true) {
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
  renderTranscript(comic.transcript);
  elements.readerPosition.textContent = `${state.currentIndex + 1} / ${state.comics.length}`;
  elements.firstButton.disabled = state.currentIndex === 0;
  elements.previousButton.disabled = state.currentIndex === 0;
  elements.comicPrevious.disabled = state.currentIndex === 0;
  elements.nextButton.disabled = state.currentIndex === state.comics.length - 1;
  elements.comicNext.disabled = state.currentIndex === state.comics.length - 1;
  elements.latestButton.disabled = state.currentIndex === state.comics.length - 1;
  if (updateUrl) history.pushState({ comic: comic.slug }, "", comicPath(comic));
  updatePageMetadata(comic, location.pathname === "/");
}

async function loadComics() {
  try {
    const response = await fetch("/comics.json");
    if (!response.ok) throw new Error("Could not load comic archive");
    state.comics = await response.json();
    renderArchive();
    if (!state.comics.length) return;
    const slugAliases = { "angry-moderator": "automoderation" };
    const fragmentSlug = location.hash.startsWith("#comic-") ? location.hash.replace("#comic-", "") : "";
    const requestedSlug = comicSlugFromPath() || fragmentSlug;
    const slug = slugAliases[requestedSlug] || requestedSlug;
    const requestedIndex = state.comics.findIndex((comic) => comic.slug === slug);
    const initialIndex = requestedIndex >= 0 ? requestedIndex : state.comics.length - 1;
    showComic(initialIndex, false);
    if (fragmentSlug || slugAliases[requestedSlug]) {
      history.replaceState({ comic: state.comics[initialIndex].slug }, "", comicPath(state.comics[initialIndex]));
      updatePageMetadata(state.comics[initialIndex]);
    }
  } catch {
    renderArchive();
  }
}

elements.archiveButton.addEventListener("click", () => toggleArchive());
elements.archiveClose.addEventListener("click", () => toggleArchive(false));
elements.archiveList.addEventListener("click", (event) => {
  const link = event.target.closest("[data-comic-index]");
  if (!link) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  showComic(Number(link.dataset.comicIndex));
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
window.addEventListener("popstate", () => {
  const slug = comicSlugFromPath();
  const index = state.comics.findIndex((comic) => comic.slug === slug);
  showComic(index >= 0 ? index : state.comics.length - 1, false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") toggleArchive(false);
  if (!elements.archivePanel.classList.contains("open") && event.key === "ArrowLeft") showComic(state.currentIndex - 1);
  if (!elements.archivePanel.classList.contains("open") && event.key === "ArrowRight") showComic(state.currentIndex + 1);
});

const savedTheme = localStorage.getItem("saj-theme");
setTheme(savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
loadComics();
