# CineVista Prime

CineVista Prime is a Flask-based movie recommendation web app with a modern UI and live metadata enrichment.

## Features
- Content-similarity recommendations powered by a precomputed similarity matrix.
- Movie search with full-width autocomplete suggestions.
- Genre filter for curated results with live count updates.
- Live OMDb enrichment for poster, IMDb rating, year, and genre.
- Direct IMDb links for each recommended title.
- Theme toggle (dark/light) and responsive layout.
- Sticky footer and clean default state (results hidden until recommendations are generated).

## Tech stack
- Backend: Flask, Pandas
- Frontend: HTML, CSS, JavaScript (vanilla)
- Data/API: Pickle model artifacts + OMDb API

## Run locally
```bash
pip install -r requirements.txt
python app.py
```

Then open `http://127.0.0.1:5000` in your browser.

## Configuration
- Optional: set your own OMDb key with environment variable `OMDB_API_KEY`.
- Example (PowerShell):

```powershell
$env:OMDB_API_KEY="your_api_key_here"
python app.py
```

## Notes
- Model files (`movie_dict.pkl` and `similarity.pkl`) are downloaded automatically from Google Drive if missing.
- First startup can take longer if assets need to be downloaded.
