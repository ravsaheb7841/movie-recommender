import os
import math
import streamlit as st
import pickle
import pandas as pd
import requests
import gdown  

# CONFIGURATION
st.set_page_config(page_title="Movie Recommender", layout="wide")
st.title("Movie Recommender System")

# OMDb API Key (load from env or fallback)
OMDB_API_KEY = os.environ.get("OMDB_API_KEY", "9e27209a")

# Google Drive File ID for similarity.pkl
SIMILARITY_FILE_ID = "10wtuqpLK3RKAy19x_GYLuHOIgmk9cyQI"  
SIMILARITY_FILE_NAME = "similarity.pkl"


# DOWNLOAD LARGE FILES IF MISSING
def download_if_not_exists(file_id, filename):
    """Download file from Google Drive if it doesn't exist locally."""
    if not os.path.exists(filename):
        st.warning(f"Downloading {filename} from Google Drive... Please wait ⏳")
        url = f"https://drive.google.com/uc?id={file_id}"
        gdown.download(url, filename, quiet=False)
        st.success(f"{filename} downloaded successfully!")


# Download similarity.pkl if needed
download_if_not_exists(SIMILARITY_FILE_ID, SIMILARITY_FILE_NAME)


# LOAD DATA
movies_dict = pickle.load(open("movie_dict.pkl", "rb"))
movies = pd.DataFrame(movies_dict)

# Load large similarity matrix (downloaded from Drive)
similarity = pickle.load(open(SIMILARITY_FILE_NAME, "rb"))


# HELPER FUNCTIONS
@st.cache_data(show_spinner=False)
def get_imdb_id(movie_title):
    """Fetch IMDb ID for a movie title."""
    try:
        url = "http://www.omdbapi.com/"
        params = {"t": movie_title, "apikey": OMDB_API_KEY}
        response = requests.get(url, params=params, timeout=6)
        response.raise_for_status()
        data = response.json()
        if data.get("Response") == "True":
            return data.get("imdbID")
        return None
    except Exception:
        return None


@st.cache_data(show_spinner=False)
def fetch_poster(imdb_id):
    """Fetch movie poster using IMDb ID."""
    try:
        if not imdb_id:
            return "https://via.placeholder.com/500x750?text=No+Image"
        url = "http://www.omdbapi.com/"
        params = {"i": imdb_id, "apikey": OMDB_API_KEY}
        response = requests.get(url, params=params, timeout=6)
        response.raise_for_status()
        data = response.json()
        poster_url = data.get("Poster")
        if poster_url and poster_url != "N/A":
            return poster_url
    except Exception:
        pass
    return "https://via.placeholder.com/500x750?text=No+Image"


def recommend(movie, top_n=15):
    """Return top N similar movies with posters and IMDb IDs."""
    try:
        movie_index = movies[movies["title"] == movie].index[0]
    except Exception:
        return [], [], []

    distances = similarity[movie_index]
    movie_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])[1 : top_n + 1]

    recommended_titles = []
    recommended_posters = []
    recommended_imdb_ids = []

    for idx, _score in movie_list:
        title = movies.iloc[idx].title
        imdb_id = get_imdb_id(title)
        poster = fetch_poster(imdb_id)
        recommended_titles.append(title)
        recommended_posters.append(poster)
        recommended_imdb_ids.append(imdb_id)

    return recommended_titles, recommended_posters, recommended_imdb_ids

# STREAMLIT UI
movie_options = sorted(movies["title"].dropna().unique())
selected_movie_name = st.selectbox("Select a Movie", movie_options)

if st.button("Recommend") and selected_movie_name:
    with st.spinner("Fetching recommendations..."):
        names, posters, imdb_ids = recommend(selected_movie_name)

    if not names:
        st.warning("Could not fetch recommendations. Try another movie.")
    else:
        movies_per_row = 5
        num_rows = math.ceil(len(names) / movies_per_row)

        for row in range(num_rows):
            cols = st.columns(movies_per_row)
            start_idx = row * movies_per_row
            end_idx = min(start_idx + movies_per_row, len(names))
            for col_idx, col in enumerate(cols):
                idx = start_idx + col_idx
                if idx < end_idx:
                    with col:
                        st.image(posters[idx], caption=names[idx], use_container_width=True)
                        imdb_link = (
                            f"https://www.imdb.com/title/{imdb_ids[idx]}" if imdb_ids[idx] else None
                        )
                        if imdb_link:
                            st.markdown(f"[IMDb Link]({imdb_link})", unsafe_allow_html=True)
                        else:
                            st.markdown("IMDb Link: N/A")
                        st.markdown("---")

# FOOTER
st.markdown("<hr>", unsafe_allow_html=True)
st.markdown("<p style='text-align:center; color:gray;'>Developed by Ravsaheb</p>", unsafe_allow_html=True)
