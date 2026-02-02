"""Google Earth Engine service for agricultural index calculations.

Supports Sentinel-2 L2A imagery with the following indices:
- NDVI: Normalized Difference Vegetation Index (crop greenness)
- NDRE: Normalized Difference Red Edge (nutrient uptake)
- LSWI: Land Surface Water Index (water stress)
- SAVI: Soil-Adjusted Vegetation Index

Sentinel-2 Band Reference:
- B2 (Blue): 490nm
- B3 (Green): 560nm
- B4 (Red): 665nm
- B5 (Red Edge 1): 705nm
- B6 (Red Edge 2): 740nm
- B7 (Red Edge 3): 783nm
- B8 (NIR): 842nm
- B8A (NIR narrow): 865nm
- B11 (SWIR 1): 1610nm
- B12 (SWIR 2): 2190nm
"""

import ee
from google.oauth2 import service_account
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import json

from config import get_settings

settings = get_settings()
_initialized = False


class GEEError(Exception):
    """Base exception for GEE errors."""
    pass


class GEENoDataError(GEEError):
    """Raised when no imagery is available."""
    pass


def init_gee() -> None:
    """Initialize Google Earth Engine with service account credentials."""
    global _initialized
    
    if _initialized:
        return
    
    try:
        credentials = service_account.Credentials.from_service_account_file(
            settings.google_application_credentials,
            scopes=[
                "https://www.googleapis.com/auth/earthengine",
                "https://www.googleapis.com/auth/cloud-platform",
            ],
        )
        
        ee.Initialize(
            credentials=credentials,
            project=settings.gee_project_id,
        )
        
        _initialized = True
        
    except Exception as e:
        raise GEEError(f"Failed to initialize Earth Engine: {e}")


def get_ee() -> ee:
    """Get initialized Earth Engine module."""
    if not _initialized:
        init_gee()
    return ee


def _calculate_ndvi(image: ee.Image) -> ee.Image:
    """Calculate NDVI: (NIR - Red) / (NIR + Red)"""
    return image.normalizedDifference(['B8', 'B4']).rename('ndvi')


def _calculate_ndre(image: ee.Image) -> ee.Image:
    """Calculate NDRE: (NIR - RedEdge) / (NIR + RedEdge)"""
    return image.normalizedDifference(['B8', 'B5']).rename('ndre')


def _calculate_lswi(image: ee.Image) -> ee.Image:
    """Calculate LSWI: (NIR - SWIR) / (NIR + SWIR)"""
    return image.normalizedDifference(['B8', 'B11']).rename('lswi')


def _calculate_savi(image: ee.Image, L: float = 0.5) -> ee.Image:
    """Calculate SAVI: ((NIR - Red) / (NIR + Red + L)) * (1 + L)
    
    Args:
        image: Sentinel-2 image
        L: Soil brightness correction factor (0.5 for moderate vegetation)
    """
    nir = image.select('B8')
    red = image.select('B4')
    
    savi = nir.subtract(red).divide(
        nir.add(red).add(L)
    ).multiply(1 + L).rename('savi')
    
    return savi


def add_indices(image: ee.Image) -> ee.Image:
    """Add all vegetation indices to an image."""
    return image.addBands([
        _calculate_ndvi(image),
        _calculate_ndre(image),
        _calculate_lswi(image),
        _calculate_savi(image),
    ])


def get_s2_collection(
    aoi: ee.Geometry,
    start_date: str,
    end_date: str,
    max_cloud_cover: int = 20,
) -> Tuple[ee.ImageCollection, int]:
    """Get Sentinel-2 L2A (Surface Reflectance) collection for an AOI.
    
    Args:
        aoi: Earth Engine Geometry defining the area of interest
        start_date: Start date in 'YYYY-MM-DD' format
        end_date: End date in 'YYYY-MM-DD' format
        max_cloud_cover: Maximum cloud cover percentage (0-100)
    
    Returns:
        Tuple of (filtered ImageCollection with indices, image count)
    """
    ee_module = get_ee()
    
    # Use harmonized Sentinel-2 L2A collection
    collection = (
        ee_module.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(aoi)
        .filterDate(start_date, end_date)
        .filter(ee_module.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud_cover))
        .map(add_indices)
    )
    
    count = collection.size().getInfo()
    
    if count == 0:
        raise GEENoDataError(
            f"No Sentinel-2 imagery found for {start_date} to {end_date} "
            f"with cloud cover < {max_cloud_cover}%"
        )
    
    return collection, count


def calculate_mean_indices(
    aoi: ee.Geometry,
    start_date: str,
    end_date: str,
    max_cloud_cover: int = 20,
    scale: int = 10,
) -> Dict[str, float]:
    """Calculate mean vegetation indices for an AOI over a time period.
    
    Args:
        aoi: Earth Engine Geometry (Polygon)
        start_date: Start date in 'YYYY-MM-DD' format
        end_date: End date in 'YYYY-MM-DD' format
        max_cloud_cover: Maximum cloud cover percentage
        scale: Resolution in meters for reduction
    
    Returns:
        Dictionary with mean values for each index
    """
    ee_module = get_ee()
    
    collection, count = get_s2_collection(aoi, start_date, end_date, max_cloud_cover)
    
    # Compute median composite
    composite = collection.median()
    
    # Extract index bands
    indices_image = composite.select(['ndvi', 'ndre', 'lswi', 'savi'])
    
    # Calculate mean over the AOI
    stats = indices_image.reduceRegion(
        reducer=ee_module.Reducer.mean(),
        geometry=aoi,
        scale=scale,
        maxPixels=1e9,
    ).getInfo()
    
    return {
        'ndvi': stats.get('ndvi', 0),
        'ndre': stats.get('ndre', 0),
        'lswi': stats.get('lswi', 0),
        'savi': stats.get('savi', 0),
        'images_processed': count,
    }


def calculate_index_statistics(
    aoi: ee.Geometry,
    start_date: str,
    end_date: str,
    max_cloud_cover: int = 20,
    scale: int = 10,
) -> Dict[str, Dict[str, float]]:
    """Calculate detailed statistics for each index.
    
    Returns:
        Dictionary with min, max, mean, std for each index
    """
    ee_module = get_ee()
    
    collection, count = get_s2_collection(aoi, start_date, end_date, max_cloud_cover)
    composite = collection.median()
    indices_image = composite.select(['ndvi', 'ndre', 'lswi', 'savi'])
    
    # Combined reducer for multiple statistics
    reducer = ee_module.Reducer.mean().combine(
        ee_module.Reducer.minMax(), sharedInputs=True
    ).combine(
        ee_module.Reducer.stdDev(), sharedInputs=True
    )
    
    stats = indices_image.reduceRegion(
        reducer=reducer,
        geometry=aoi,
        scale=scale,
        maxPixels=1e9,
    ).getInfo()
    
    result = {}
    for index in ['ndvi', 'ndre', 'lswi', 'savi']:
        result[index] = {
            'mean': stats.get(f'{index}_mean', 0),
            'min': stats.get(f'{index}_min', 0),
            'max': stats.get(f'{index}_max', 0),
            'std': stats.get(f'{index}_stdDev', 0),
        }
    
    result['images_processed'] = count
    return result


def calculate_index_histogram(
    aoi: ee.Geometry,
    index: str,
    start_date: str,
    end_date: str,
    num_bins: int = 10,
    max_cloud_cover: int = 20,
    scale: int = 10,
) -> List[Dict]:
    """Calculate histogram distribution for an index.
    
    Args:
        aoi: Earth Engine Geometry
        index: Index name ('ndvi', 'ndre', 'lswi', 'savi')
        start_date: Start date
        end_date: End date
        num_bins: Number of histogram bins
        max_cloud_cover: Maximum cloud cover
        scale: Resolution in meters
    
    Returns:
        List of histogram bins with range, count, and percentage
    """
    ee_module = get_ee()
    
    collection, _ = get_s2_collection(aoi, start_date, end_date, max_cloud_cover)
    composite = collection.median()
    index_image = composite.select([index])
    
    # Calculate histogram
    histogram = index_image.reduceRegion(
        reducer=ee_module.Reducer.histogram(num_bins),
        geometry=aoi,
        scale=scale,
        maxPixels=1e9,
    ).getInfo()
    
    hist_data = histogram.get(index, {})
    bucket_means = hist_data.get('bucketMeans', [])
    bucket_counts = hist_data.get('histogram', [])
    bucket_width = hist_data.get('bucketWidth', 0.1)
    
    total_count = sum(bucket_counts) if bucket_counts else 1
    
    result = []
    for i, (mean, count) in enumerate(zip(bucket_means, bucket_counts)):
        min_val = mean - bucket_width / 2
        max_val = mean + bucket_width / 2
        result.append({
            'range': f'{min_val:.1f}-{max_val:.1f}',
            'min_value': min_val,
            'max_value': max_val,
            'count': count,
            'percentage': (count / total_count) * 100 if total_count > 0 else 0,
        })
    
    return result


def get_time_series(
    aoi: ee.Geometry,
    start_date: str,
    end_date: str,
    max_cloud_cover: int = 30,
    scale: int = 10,
) -> List[Dict]:
    """Get time series of index values for an AOI.
    
    Returns:
        List of data points with date and index values
    """
    ee_module = get_ee()
    
    collection, _ = get_s2_collection(aoi, start_date, end_date, max_cloud_cover)
    
    def extract_values(image: ee.Image) -> ee.Feature:
        """Extract mean index values from each image."""
        stats = image.select(['ndvi', 'ndre', 'lswi', 'savi']).reduceRegion(
            reducer=ee_module.Reducer.mean(),
            geometry=aoi,
            scale=scale,
            maxPixels=1e9,
        )
        
        return ee_module.Feature(None, {
            'date': image.date().format('YYYY-MM-dd'),
            'ndvi': stats.get('ndvi'),
            'ndre': stats.get('ndre'),
            'lswi': stats.get('lswi'),
            'savi': stats.get('savi'),
            'cloud_cover': image.get('CLOUDY_PIXEL_PERCENTAGE'),
        })
    
    features = collection.map(extract_values)
    data = features.getInfo()
    
    result = []
    for feature in data.get('features', []):
        props = feature.get('properties', {})
        result.append({
            'date': props.get('date'),
            'ndvi': props.get('ndvi'),
            'ndre': props.get('ndre'),
            'lswi': props.get('lswi'),
            'savi': props.get('savi'),
            'cloud_cover': props.get('cloud_cover'),
        })
    
    # Sort by date
    result.sort(key=lambda x: x['date'])
    return result


def geometry_to_ee(geojson: Dict) -> ee.Geometry:
    """Convert GeoJSON geometry to Earth Engine Geometry."""
    ee_module = get_ee()
    return ee_module.Geometry.Polygon(geojson['coordinates'])
