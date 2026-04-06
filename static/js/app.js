const movieSearch = document.getElementById("movieSearch");
const movieOptions = document.getElementById("movieOptions");
const topNInput = document.getElementById("topN");
const recommendBtn = document.getElementById("recommendBtn");
const statusBox = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultCount = document.getElementById("resultCount");
const resultsSection = document.getElementById("resultsSection");
const genreFilter = document.getElementById("genreFilter");
const clearFiltersBtn = document.getElementById("clearFilters");
const themeToggle = document.getElementById("themeToggle");
const btnIdle = document.getElementById("btnIdle");
const btnLoading = document.getElementById("btnLoading");
let currentRecommendations = [];
let movieCatalog = [];

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

function setResultsVisibility(isVisible) {
  if (resultsSection) {
    resultsSection.classList.toggle("hidden", !isVisible);
  }
}

function setAutocompleteVisibility(isVisible) {
  if (movieOptions) {
    movieOptions.classList.toggle("hidden", !isVisible);
  }
  if (movieSearch) {
    movieSearch.setAttribute("aria-expanded", String(isVisible));
  }
}

function hideAutocomplete() {
  setAutocompleteVisibility(false);
}

function normalizeGenres(genreText) {
  if (!genreText || genreText === "N/A") {
    return [];
  }

  return genreText
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);
}

function formatResultCount(visibleCount, totalCount) {
  if (visibleCount === totalCount) {
    return `${visibleCount} movie${visibleCount === 1 ? "" : "s"}`;
  }

  return `${visibleCount} of ${totalCount} movie${totalCount === 1 ? "" : "s"}`;
}

function renderRecommendations() {
  const selectedGenre = genreFilter ? genreFilter.value : "all";
  const visibleRecommendations =
    selectedGenre === "all"
      ? currentRecommendations
      : currentRecommendations.filter((movie) =>
          normalizeGenres(movie.genre).some((genre) => genre.toLowerCase() === selectedGenre.toLowerCase())
        );

  resultsEl.innerHTML = visibleRecommendations.map(movieCardHtml).join("");
  resultCount.textContent = formatResultCount(visibleRecommendations.length, currentRecommendations.length);
  setResultsVisibility(currentRecommendations.length > 0);
}

function populateGenreFilter(recommendations) {
  if (!genreFilter) {
    return;
  }

  const genres = new Set();
  recommendations.forEach((movie) => {
    normalizeGenres(movie.genre).forEach((genre) => genres.add(genre));
  });

  const genreOptions = Array.from(genres).sort((first, second) => first.localeCompare(second));
  genreFilter.innerHTML = [
    '<option value="all">All genres</option>',
    ...genreOptions.map((genre) => `<option value="${genre}">${genre}</option>`),
  ].join("");
  genreFilter.value = "all";
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
    movieCatalog = data.movies || [];

    if (movieOptions) {
      movieOptions.innerHTML = "";
    }

    setStatus("");
  } catch (error) {
    setStatus(error.message || "Unable to load movie catalog.", "error");
  }
}

function renderMovieSuggestions(query) {
  if (!movieOptions) {
    return;
  }

  const trimmed = (query || "").trim().toLowerCase();
  if (!trimmed) {
    movieOptions.innerHTML = "";
    hideAutocomplete();
    return;
  }

  const matches = movieCatalog
    .filter((movie) => movie.toLowerCase().includes(trimmed))
    .slice(0, 8);

  if (!matches.length) {
    movieOptions.innerHTML = '<div class="autocomplete-empty">No matches found</div>';
    setAutocompleteVisibility(true);
    return;
  }

  movieOptions.innerHTML = matches
    .map((movie) => `<button type="button" class="autocomplete-item" role="option" data-movie="${movie}">${movie}</button>`)
    .join("");
  setAutocompleteVisibility(true);
}

function selectMovieSuggestion(movie) {
  if (!movieSearch) {
    return;
  }

  movieSearch.value = movie;
  hideAutocomplete();
}

function resolveMovieTitle(query) {
  const trimmed = (query || "").trim();
  if (!trimmed) {
    return "";
  }

  const exactMatch = movieCatalog.find((movie) => movie.toLowerCase() === trimmed.toLowerCase());
  return exactMatch || "";
}

async function fetchRecommendations() {
  const movieTitle = resolveMovieTitle(movieSearch ? movieSearch.value : "");
  const topN = Number(topNInput.value || 15);

  if (!movieTitle) {
    setStatus("Please choose a movie from the suggestions.", "error");
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

    currentRecommendations = data.recommendations || [];
    populateGenreFilter(currentRecommendations);
    renderRecommendations();
    setStatus(`Found ${currentRecommendations.length} similar movies for ${movieTitle}.`, "success");
  } catch (error) {
    currentRecommendations = [];
    resultsEl.innerHTML = "";
    updateCount(0);
    setResultsVisibility(false);
    setStatus(error.message || "Could not fetch recommendations.", "error");
  } finally {
    setLoadingState(false);
  }
}

recommendBtn.addEventListener("click", fetchRecommendations);
if (movieSearch) {
  movieSearch.addEventListener("input", (event) => {
    renderMovieSuggestions(event.target.value);
  });
  movieSearch.addEventListener("focus", (event) => {
    renderMovieSuggestions(event.target.value);
  });
  movieSearch.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideAutocomplete();
    }
  });
}
if (movieOptions) {
  movieOptions.addEventListener("click", (event) => {
    const option = event.target.closest(".autocomplete-item");
    if (!option) {
      return;
    }

    selectMovieSuggestion(option.dataset.movie || "");
  });
}
if (genreFilter) {
  genreFilter.addEventListener("change", renderRecommendations);
}
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    if (genreFilter) {
      genreFilter.value = "all";
    }
    renderRecommendations();
  });
}
if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}
document.addEventListener("click", (event) => {
  if (!movieSearch || !movieOptions) {
    return;
  }

  if (!movieSearch.contains(event.target) && !movieOptions.contains(event.target)) {
    hideAutocomplete();
  }
});
window.addEventListener("DOMContentLoaded", loadMovieOptions);
window.addEventListener("DOMContentLoaded", initializeTheme);
