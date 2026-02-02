# AgriWatch - Agricultural Monitoring Platform

An agricultural monitoring platform for tracking vegetation indices and crop health using Sentinel-2 satellite imagery. Built for Axion Orbital's agri clients like Pepsico.

![AgriWatch](https://img.shields.io/badge/version-1.0.0-green)
![Python](https://img.shields.io/badge/python-3.11+-blue)
![React](https://img.shields.io/badge/react-18+-61DAFB)

## Features

- 🗺️ Interactive map interface with Mapbox GL for drawing farm boundaries
- 🛰️ Sentinel-2 satellite imagery analysis via Google Earth Engine
- 📊 Vegetation indices: NDVI, NDRE, LSWI, SAVI
- 📈 Time series visualization of crop health
- 🔔 Alert system for water stress and nutrient deficiency
- 📱 Responsive dashboard for farm monitoring

## Vegetation Indices

| Index | Full Name | Purpose |
|-------|-----------|---------|
| NDVI | Normalized Difference Vegetation Index | Crop greenness & health |
| NDRE | Normalized Difference Red Edge | Nutrient uptake & chlorophyll |
| LSWI | Land Surface Water Index | Water stress detection |
| SAVI | Soil-Adjusted Vegetation Index | Vegetation with soil background |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   Celery        │
│  (React/TS)     │     │  (FastAPI)      │     │  (Worker)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mapbox GL     │     │   Supabase      │     │   GEE/MPC       │
│   (Map Viz)     │     │   (Database)    │     │   (Satellite)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Docker & Docker Compose** (optional)
- **Google Cloud Platform account** with Earth Engine API enabled
- **Mapbox account** for maps

## Quick Start

### 1. Clone and Setup

```bash
cd D:\agriwatch
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
copy .env.example .env
# Edit .env with your credentials

# Run the API
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
copy .env.example .env
# Add your Mapbox token to .env

# Start development server
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Docker Setup

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## API Endpoints

### Farms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/farms` | List all farms |
| POST | `/api/farms` | Create a farm |
| GET | `/api/farms/{id}` | Get farm details |
| PUT | `/api/farms/{id}` | Update farm |
| DELETE | `/api/farms/{id}` | Delete farm |

### Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analysis` | Start analysis job |
| GET | `/api/analysis/{job_id}` | Get job status |
| GET | `/api/analysis/{job_id}/result` | Get job result |

### Indices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/indices/time-series/{farm_id}` | Get index time series |
| GET | `/api/indices/distribution/{farm_id}` | Get index distribution |
| GET | `/api/indices/latest/{farm_id}` | Get latest indices |

## Data Sources

### Sentinel-2 (Primary)
- **Collection**: `COPERNICUS/S2_SR_HARMONIZED`
- **Resolution**: 10m (visible/NIR), 20m (red edge/SWIR)
- **Revisit**: 5 days
- **Access**: Google Earth Engine

### Microsoft Planetary Computer (Backup)
- **Collection**: `sentinel-2-l2a`
- **API**: STAC at `https://planetarycomputer.microsoft.com/api/stac/v1`
- **Access**: Free with Azure account

## Farm Boundary Options for India

1. **Manual Drawing**: Draw polygons on the map using Mapbox Draw
2. **CSV/GeoJSON Upload**: Import pre-mapped field boundaries
3. **ULPIN Integration** (Future): India's Unique Land Parcel ID system
4. **Google ALU** (Partnership): Automated field segmentation

## Project Structure

```
agriwatch/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── map/          # Map components
│   │   │   ├── charts/       # Visualization
│   │   │   ├── insights/     # Insight cards
│   │   │   └── ui/           # ShadCN UI
│   │   ├── pages/            # Route pages
│   │   ├── services/         # API client
│   │   └── hooks/            # React hooks
│   └── package.json
├── backend/
│   ├── routers/              # API routes
│   ├── services/             # Business logic
│   │   └── gee_agri.py       # GEE integration
│   ├── models/               # Pydantic schemas
│   ├── workers/              # Celery tasks
│   └── main.py               # FastAPI app
├── docker-compose.yml
└── README.md
```

## Environment Variables

### Backend

| Variable | Description | Required |
|----------|-------------|----------|
| `GEE_PROJECT_ID` | GCP project for Earth Engine | Yes |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase anon key | Yes |
| `REDIS_URL` | Redis connection URL | No |

### Frontend

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_MAPBOX_TOKEN` | Mapbox access token | Yes |
| `VITE_API_URL` | Backend API URL | Yes |

## Insights Interpretation

| Insight | Index | Healthy Range | Action if Low |
|---------|-------|---------------|---------------|
| Crop Greenness | NDVI | > 0.6 | Field inspection |
| Nutrient Uptake | NDRE | > 0.5 | Fertilizer application |
| Water Stress | LSWI | > 0.2 | Irrigation |
| Soil-Adjusted Health | SAVI | > 0.6 | Varies |

## License

Proprietary - Axion Orbital Space. All rights reserved.

## Contact

- Website: https://axionorbital.space/
- Support: support@axionorbital.space
