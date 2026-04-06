const movieSelect = document.getElementById("movieSelect");
const topNInput = document.getElementById("topN");
const recommendBtn = document.getElementById("recommendBtn");
const statusBox = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultCount = document.getElementById("resultCount");
const themeToggle = document.getElementById("themeToggle");
const btnIdle = document.getElementById("btnIdle");
const btnLoading = document.getElementById("btnLoading");

function applyTheme(theme) {
  const activeTheme = theme === "light" ? "light" : "dark";
  document.body.setAttribute("data-theme", activeTheme);

  if (themeToggle) {
    const switchTo = activeTheme === "dark" ? "light" : "dark";
    const label = `Switch to ${switchTo} mode`;
    themeToggle.setAttribute("aria-label", label);
    themeToggle.setAttribute("title", label);
  }
}

function setLoadingState(isLoading) {
  recommendBtn.disabled = isLoading;

  if (btnIdle) {
    btnIdle.classList.toggle("hidden", isLoading);
  }
  if (btnLoading) {
    btnLoading.classList.toggle("hidden", !isLoading);
  }
}

function initializeTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    applyTheme(stored);
    return;
  }

  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(prefersLight ? "light" : "dark");
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme") || "dark";
  const nextTheme = current === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  localStorage.setItem("theme", nextTheme);
}

function setStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`.trim();
}

function updateCount(count) {
  resultCount.textContent = `${count} movie${count === 1 ? "" : "s"}`;
}

function movieCardHtml(movie) {
  const imdbUrl = movie.imdb_id ? `https://www.imdb.com/title/${movie.imdb_id}` : null;
  const title = `${movie.title} (${movie.year || "N/A"})`;

  const poster = `<img src="${movie.poster}" alt="Poster of ${movie.title}" loading="lazy" />`;
  const posterBlock = imdbUrl
    ? `<a class="poster-wrap" href="${imdbUrl}" target="_blank" rel="noopener noreferrer">${poster}</a>`
    : `<div class="poster-wrap">${poster}</div>`;

  return `
    <article class="movie-card">
      ${posterBlock}
      <div class="card-body">
        <h3 class="card-title">${title}</h3>
        <div class="meta"><i class="fa-solid fa-star"></i> IMDb: ${movie.rating || "N/A"}</div>
        <div class="meta"><i class="fa-solid fa-masks-theater"></i> ${movie.genre || "N/A"}</div>
      </div>
    </article>
  `;
}

async function loadMovieOptions() {
  setStatus("Loading movie catalog...");
  try {
    const response = await fetch("/api/movies");
    if (!response.ok) {
      throw new Error("Could not load movie list");
    }

    const data = await response.json();
    const movies = data.movies || [];

    movieSelect.innerHTML = movies
      .map((movie) => `<option value="${movie}">${movie}</option>`)
      .join("");

    setStatus("");
  } catch (error) {
    setStatus(error.message || "Unable to load movie catalog.", "error");
  }
}

async function fetchRecommendations() {
  const movieTitle = movieSelect.value;
  const topN = Number(topNInput.value || 15);

  if (!movieTitle) {
    setStatus("Please select a movie first.", "error");
    return;
  }

  setStatus("Analyzing similarity and fetching metadata...");
  setLoadingState(true);

  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        movie_title: movieTitle,
        top_n: topN,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Recommendation request failed");
    }

    const recs = data.recommendations || [];
    resultsEl.innerHTML = recs.map(movieCardHtml).join("");
    updateCount(recs.length);
    setStatus(`Found ${recs.length} similar movies for ${movieTitle}.`, "success");
  } catch (error) {
    resultsEl.innerHTML = "";
    updateCount(0);
    setStatus(error.message || "Could not fetch recommendations.", "error");
  } finally {
    setLoadingState(false);
  }
}

recommendBtn.addEventListener("click", fetchRecommendations);
if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}
window.addEventListener("DOMContentLoaded", loadMovieOptions);
window.addEventListener("DOMContentLoaded", initializeTheme);
