import os
import pickle
from functools import lru_cache

import pandas as pd
import requests
from flask import Flask, jsonify, render_template, request, send_from_directory
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

APP_NAME = "CineVista Prime"
MOVIE_DICT_ID = "1c5bKp7Dij-sjd4Y61ywcOnZA3uJMa-v4"
SIMILARITY_ID = "10wtuqpLK3RKAy19x_GYLuHOIgmk9cyQI"
MOVIE_DICT_FILE = "movie_dict.pkl"
SIMILARITY_FILE = "similarity.pkl"
PLACEHOLDER_POSTER = "https://via.placeholder.com/500x750?text=No+Image"

# 🔐 Secure API Key (NO default value)
OMDB_API_KEY = os.environ.get("OMDB_API_KEY")

if not OMDB_API_KEY:
    raise ValueError("OMDB_API_KEY not found! Please set it in .env file")


def download_if_missing(file_id: str, filename: str) -> None:
    if os.path.exists(filename):
        return

    try:
        import gdown
    except ImportError as exc:
        raise RuntimeError(
            "Missing dependency 'gdown'. Install it using 'pip install -r requirements.txt'."
        ) from exc

    url = f"https://drive.google.com/uc?id={file_id}"
    print(f"Downloading {filename} from Google Drive...")
    gdown.download(url, filename, quiet=False)


def load_assets() -> tuple[pd.DataFrame, object]:
    download_if_missing(MOVIE_DICT_ID, MOVIE_DICT_FILE)
    download_if_missing(SIMILARITY_ID, SIMILARITY_FILE)

    with open(MOVIE_DICT_FILE, "rb") as movie_file:
        movies_dict = pickle.load(movie_file)
    with open(SIMILARITY_FILE, "rb") as sim_file:
        similarity_matrix = pickle.load(sim_file)

    return pd.DataFrame(movies_dict), similarity_matrix


movies, similarity = load_assets()
movie_options = sorted(movies["title"].dropna().unique().tolist())

app = Flask(__name__)


@lru_cache(maxsize=4096)
def get_movie_details(movie_title: str) -> dict:
    try:
        response = requests.get(
            "http://www.omdbapi.com/",
            params={"t": movie_title, "apikey": OMDB_API_KEY},
            timeout=6,
        )
        data = response.json()
        if data.get("Response") == "True":
            poster = data.get("Poster")
            return {
                "imdb_id": data.get("imdbID"),
                "poster": poster if poster and poster != "N/A" else PLACEHOLDER_POSTER,
                "year": data.get("Year", "N/A"),
                "rating": data.get("imdbRating", "N/A"),
                "genre": data.get("Genre", "N/A"),
            }
    except Exception:
        pass

    return {
        "imdb_id": None,
        "poster": PLACEHOLDER_POSTER,
        "year": "N/A",
        "rating": "N/A",
        "genre": "N/A",
    }


def recommend(movie_title: str, top_n: int = 15) -> list[dict]:
    try:
        movie_index = movies[movies["title"] == movie_title].index[0]
    except Exception:
        return []

    distances = similarity[movie_index]
    similar_movies = sorted(
        list(enumerate(distances)),
        reverse=True,
        key=lambda item: item[1],
    )[1 : top_n + 1]

    recommendations = []
    for idx, _ in similar_movies:
        title = movies.iloc[idx].title
        details = get_movie_details(title)
        recommendations.append({"title": title, **details})

    return recommendations


@app.get("/")
def home():
    return render_template("index.html", app_name=APP_NAME)


@app.get("/favicon.ico")
def favicon():
    return send_from_directory("static", "favicon.svg", mimetype="image/svg+xml")


@app.get("/api/movies")
def list_movies():
    return jsonify({"movies": movie_options})


@app.post("/api/recommend")
def api_recommend():
    payload = request.get_json(silent=True) or {}
    movie_title = payload.get("movie_title", "").strip()
    top_n = payload.get("top_n", 15)

    try:
        top_n = int(top_n)
    except (TypeError, ValueError):
        top_n = 15
    top_n = max(1, min(top_n, 25))

    if not movie_title:
        return jsonify({"error": "movie_title is required"}), 400

    if movie_title not in movie_options:
        return jsonify({"error": "Movie not found in catalog"}), 404

    recommendations = recommend(movie_title, top_n=top_n)
    return jsonify(
        {
            "app_name": APP_NAME,
            "query": movie_title,
            "count": len(recommendations),
            "recommendations": recommendations,
        }
    )


if __name__ == "__main__":
    app.run(debug=True)