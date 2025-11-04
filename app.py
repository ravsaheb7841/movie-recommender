import os
import math
import streamlit as st
import pickle
import pandas as pd
import requests

# Set up Streamlit page
st.set_page_config(page_title="Movie Recommender", layout="wide")
st.markdown("<h1 style='text-align:center;'>Movie Recommender System</h1>", unsafe_allow_html=True)
st.markdown("---")

# Load data
movies_dict = pickle.load(open("movie_dict.pkl", "rb"))  # Load movie dictionary
movies = pd.DataFrame(movies_dict)  # Convert to DataFrame
similarity = pickle.load(open("similarity.pkl", "rb"))  # Load similarity matrix

# OMDb API key
OMDB_API_KEY = os.environ.get("OMDB_API_KEY", "9e27209a")  # Use environment variable or fallback


@st.cache_data(show_spinner=False)
def get_movie_details(movie_title: str):  # Fetch movie details
    try:
        url = "http://www.omdbapi.com/"
        params = {"t": movie_title, "apikey": OMDB_API_KEY}
        response = requests.get(url, params=params, timeout=6)
        data = response.json()
        if data.get("Response") == "True":
            imdb_id = data.get("imdbID")
            poster = data.get("Poster")
            if not poster or poster == "N/A":
                poster = "https://via.placeholder.com/500x750?text=No+Image"
            return {
                "imdb_id": imdb_id,
                "poster": poster,
                "year": data.get("Year", "N/A"),
                "rating": data.get("imdbRating", "N/A"),
                "genre": data.get("Genre", "N/A"),
            }
    except Exception:
        pass
    return {
        "imdb_id": None,
        "poster": "https://via.placeholder.com/500x750?text=No+Image",
        "year": "N/A",
        "rating": "N/A",
        "genre": "N/A",
    }


@st.cache_data(show_spinner=False)
def recommend(movie_title: str, top_n: int = 15):  # Generate recommendations
    try:
        movie_index = movies[movies["title"] == movie_title].index[0]
    except Exception:
        return []
    distances = similarity[movie_index]
    similar_movies = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])[1 : top_n + 1]
    recommendations = []
    for idx, _ in similar_movies:
        title = movies.iloc[idx].title
        details = get_movie_details(title)
        recommendations.append({"title": title, **details})
    return recommendations


# UI
movie_options = sorted(movies["title"].dropna().unique())
selected_movie = st.selectbox("Select a movie to get recommendations", movie_options)

if st.button("Recommend"):
    with st.spinner("Finding similar movies..."):
        recs = recommend(selected_movie)

    if not recs:
        st.warning("No recommendations found. Try another movie.")
    else:
        st.success(f"Found {len(recs)} similar movies for '{selected_movie}'")
        st.markdown("---")

        movies_per_row = 5
        num_rows = math.ceil(len(recs) / movies_per_row)

        for row in range(num_rows):
            cols = st.columns(movies_per_row)
            start = row * movies_per_row
            end = min(start + movies_per_row, len(recs))
            for col_idx, col in enumerate(cols):
                idx = start + col_idx
                if idx < end:
                    movie = recs[idx]
                    imdb_link = f"https://www.imdb.com/title/{movie['imdb_id']}" if movie["imdb_id"] else None
                    with col:
                        if imdb_link:
                            col.markdown(
                                f"<a href='{imdb_link}' target='_blank'><img src='{movie['poster']}' style='width:100%; border-radius:12px;'></a>",
                                unsafe_allow_html=True,
                            )
                        else:
                            st.image(movie["poster"], use_container_width=True)
                        st.markdown(
                            f"**{movie['title']} ({movie['year']})**<br>"
                            f"IMDb: {movie['rating']}<br>"
                            f"Genre: {movie['genre']}",
                            unsafe_allow_html=True,
                        )
                        st.markdown("---")

# Footer
st.markdown("<hr><div style='text-align:center; color:gray;'>Developed by Ravsaheb</div>", unsafe_allow_html=True)
