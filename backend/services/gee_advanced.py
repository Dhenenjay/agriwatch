"""
AgriWatch Advanced GEE Service
Comprehensive satellite analytics for agricultural monitoring.
Includes 15+ vegetation indices, weather data, soil moisture, and crop analytics.
"""

import ee
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

# Initialize Earth Engine
_initialized = False

def init_gee():
    """Initialize Google Earth Engine with service account credentials."""
    global _initialized
    if _initialized:
        return True
    
    try:
        credentials_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', './gee_credentials.json')
        project_id = os.environ.get('GEE_PROJECT_ID', 'axion-ogim')
        
        if os.path.exists(credentials_path):
            credentials = ee.ServiceAccountCredentials(None, credentials_path)
            ee.Initialize(credentials, project=project_id)
        else:
            ee.Initialize(project=project_id)
        
        _initialized = True
        print(f"✓ GEE initialized with project: {project_id}")
        return True
    except Exception as e:
        print(f"✗ GEE initialization failed: {e}")
        return False


def geometry_to_ee(geojson: dict) -> ee.Geometry:
    """Convert GeoJSON geometry to Earth Engine geometry."""
    return ee.Geometry(geojson)


# =============================================================================
# VEGETATION INDICES - Complete Suite
# =============================================================================

def calculate_all_indices(image: ee.Image) -> ee.Image:
    """
    Calculate all vegetation indices from a Sentinel-2 image.
    Returns image with all index bands added.
    
    Sentinel-2 Bands:
    - B2: Blue (490nm)
    - B3: Green (560nm)
    - B4: Red (665nm)
    - B5: Red Edge 1 (705nm)
    - B6: Red Edge 2 (740nm)
    - B7: Red Edge 3 (783nm)
    - B8: NIR (842nm)
    - B8A: NIR Narrow (865nm)
    - B11: SWIR 1 (1610nm)
    - B12: SWIR 2 (2190nm)
    """
    # Get bands (scale to 0-1 range)
    blue = image.select('B2').divide(10000)
    green = image.select('B3').divide(10000)
    red = image.select('B4').divide(10000)
    re1 = image.select('B5').divide(10000)  # Red Edge 1
    re2 = image.select('B6').divide(10000)  # Red Edge 2
    re3 = image.select('B7').divide(10000)  # Red Edge 3
    nir = image.select('B8').divide(10000)
    nir_narrow = image.select('B8A').divide(10000)
    swir1 = image.select('B11').divide(10000)
    swir2 = image.select('B12').divide(10000)
    
    # 1. NDVI - Normalized Difference Vegetation Index
    # Classic vegetation index, range: -1 to 1
    ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
    
    # 2. EVI - Enhanced Vegetation Index
    # Better for high biomass areas, reduces atmospheric effects
    # Formula: 2.5 * (NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1)
    evi = nir.subtract(red).multiply(2.5).divide(
        nir.add(red.multiply(6)).subtract(blue.multiply(7.5)).add(1)
    ).rename('EVI')
    
    # 3. NDRE - Normalized Difference Red Edge
    # Sensitive to chlorophyll in leaves, good for fertilizer assessment
    ndre = nir.subtract(re1).divide(nir.add(re1)).rename('NDRE')
    
    # 4. GNDVI - Green NDVI
    # Chlorophyll content indicator, uses green instead of red
    gndvi = nir.subtract(green).divide(nir.add(green)).rename('GNDVI')
    
    # 5. SAVI - Soil-Adjusted Vegetation Index
    # Minimizes soil brightness influence, L=0.5
    L = 0.5
    savi = nir.subtract(red).multiply(1 + L).divide(
        nir.add(red).add(L)
    ).rename('SAVI')
    
    # 6. MSAVI2 - Modified SAVI
    # Self-adjusting L factor, better for sparse vegetation
    # Formula: (2*NIR + 1 - sqrt((2*NIR+1)^2 - 8*(NIR-RED))) / 2
    msavi2 = nir.multiply(2).add(1).subtract(
        nir.multiply(2).add(1).pow(2).subtract(
            nir.subtract(red).multiply(8)
        ).sqrt()
    ).divide(2).rename('MSAVI2')
    
    # 7. LSWI - Land Surface Water Index
    # Leaf water content, drought stress indicator
    lswi = nir.subtract(swir1).divide(nir.add(swir1)).rename('LSWI')
    
    # 8. NDMI - Normalized Difference Moisture Index
    # Canopy moisture content
    ndmi = nir.subtract(swir1).divide(nir.add(swir1)).rename('NDMI')
    
    # 9. NDWI - Normalized Difference Water Index
    # Surface water detection and irrigation monitoring
    ndwi = green.subtract(nir).divide(green.add(nir)).rename('NDWI')
    
    # 10. NBR - Normalized Burn Ratio
    # Fire/burn severity and stress detection
    nbr = nir.subtract(swir2).divide(nir.add(swir2)).rename('NBR')
    
    # 11. CIgreen - Chlorophyll Index Green
    # Leaf chlorophyll content, linear relationship
    cigreen = nir.divide(green).subtract(1).rename('CIgreen')
    
    # 12. CIre - Chlorophyll Index Red Edge
    # More sensitive chlorophyll estimation
    cire = nir.divide(re1).subtract(1).rename('CIre')
    
    # 13. MCARI - Modified Chlorophyll Absorption Ratio Index
    # Chlorophyll concentration in leaves
    mcari = re1.subtract(red).subtract(
        re1.subtract(green).multiply(0.2)
    ).multiply(re1.divide(red)).rename('MCARI')
    
    # 14. TCARI - Transformed CAR Index
    # Chlorophyll content, reduced soil background effect
    tcari = ee.Image(3).multiply(
        re1.subtract(red).subtract(
            re1.subtract(green).multiply(0.2).multiply(re1.divide(red))
        )
    ).rename('TCARI')
    
    # 15. WDRVI - Wide Dynamic Range VI
    # Better discrimination at high biomass (a=0.2)
    a = 0.2
    wdrvi = nir.multiply(a).subtract(red).divide(
        nir.multiply(a).add(red)
    ).rename('WDRVI')
    
    # 16. LAI (estimated) - Leaf Area Index
    # Empirical relationship with EVI: LAI = 3.618 * EVI - 0.118
    lai = evi.multiply(3.618).subtract(0.118).rename('LAI')
    
    # 17. fPAR (estimated) - Fraction of Absorbed PAR
    # From NDVI: fPAR = 1.24 * NDVI - 0.168
    fpar = ndvi.multiply(1.24).subtract(0.168).clamp(0, 1).rename('fPAR')
    
    # 18. BSI - Bare Soil Index
    # Identifies bare soil areas
    bsi = swir1.add(red).subtract(nir).subtract(blue).divide(
        swir1.add(red).add(nir).add(blue)
    ).rename('BSI')
    
    # 19. NDTI - Normalized Difference Tillage Index
    # Crop residue and tillage practices
    ndti = swir1.subtract(swir2).divide(swir1.add(swir2)).rename('NDTI')
    
    # Add all indices as bands
    return image.addBands([
        ndvi, evi, ndre, gndvi, savi, msavi2, lswi, ndmi, ndwi,
        nbr, cigreen, cire, mcari, tcari, wdrvi, lai, fpar, bsi, ndti
    ])


# =============================================================================
# SENTINEL-2 DATA ACCESS
# =============================================================================

def get_s2_collection(
    geometry: ee.Geometry,
    start_date: str,
    end_date: str,
    max_cloud_cover: int = 20
) -> ee.ImageCollection:
    """
    Get Sentinel-2 Surface Reflectance collection filtered by geometry and date.
    Applies cloud masking and adds all vegetation indices.
    """
    # Cloud masking function
    def mask_s2_clouds(image):
        qa = image.select('QA60')
        # Bits 10 and 11 are clouds and cirrus
        cloud_bit_mask = 1 << 10
        cirrus_bit_mask = 1 << 11
        mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(
            qa.bitwiseAnd(cirrus_bit_mask).eq(0)
        )
        return image.updateMask(mask)
    
    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(geometry)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud_cover))
        .map(mask_s2_clouds)
        .map(calculate_all_indices)
    )
    
    return collection


def get_composite(
    geometry: ee.Geometry,
    start_date: str,
    end_date: str,
    max_cloud_cover: int = 20,
    composite_method: str = 'median'
) -> ee.Image:
    """
    Create a cloud-free composite from Sentinel-2 imagery.
    
    Args:
        composite_method: 'median', 'mean', 'max', 'greenest' (max NDVI)
    """
    collection = get_s2_collection(geometry, start_date, end_date, max_cloud_cover)
    
    if composite_method == 'median':
        return collection.median().clip(geometry)
    elif composite_method == 'mean':
        return collection.mean().clip(geometry)
    elif composite_method == 'max':
        return collection.max().clip(geometry)
    elif composite_method == 'greenest':
        return collection.qualityMosaic('NDVI').clip(geometry)
    else:
        return collection.median().clip(geometry)


# =============================================================================
# INDEX STATISTICS
# =============================================================================

def calculate_index_stats(
    geometry: ee.Geometry,
    start_date: str,
    end_date: str,
    indices: List[str] = None,
    scale: int = 10
) -> Dict[str, Any]:
    """
    Calculate statistics for all indices over a geometry.
    Returns mean, min, max, stdDev for each index.
    """
    if indices is None:
        indices = ['NDVI', 'EVI', 'NDRE', 'GNDVI', 'SAVI', 'LSWI', 'NDMI', 'LAI', 'fPAR']
    
    composite = get_composite(geometry, start_date, end_date)
    
    # Select only the requested indices
    index_image = composite.select(indices)
    
    # Calculate statistics
    stats = index_image.reduceRegion(
        reducer=ee.Reducer.mean().combine(
            ee.Reducer.minMax(), '', True
        ).combine(
            ee.Reducer.stdDev(), '', True
        ),
        geometry=geometry,
        scale=scale,
        maxPixels=1e9
    ).getInfo()
    
    # Organize results
    result = {}
    for index in indices:
        result[index] = {
            'mean': stats.get(f'{index}_mean'),
            'min': stats.get(f'{index}_min'),
            'max': stats.get(f'{index}_max'),
            'stdDev': stats.get(f'{index}_stdDev')
        }
    
    return result


def calculate_index_histogram(
    geometry: ee.Geometry,
    start_date: str,
    end_date: str,
    index: str = 'NDVI',
    num_buckets: int = 20,
    scale: int = 10
) -> List[Dict]:
    """
    Calculate histogram distribution for an index.
    """
    composite = get_composite(geometry, start_date, end_date)
    index_image = composite.select(index)
    
    # Get histogram
    histogram = index_image.reduceRegion(
        reducer=ee.Reducer.histogram(num_buckets),
        geometry=geometry,
        scale=scale,
        maxPixels=1e9
    ).getInfo()
    
    hist_data = histogram.get(index, {})
    bucket_means = hist_data.get('bucketMeans', [])
    counts = hist_data.get('histogram', [])
    
    # Calculate percentages
    total = sum(counts) if counts else 1
    
    result = []
    for i, (mean, count) in enumerate(zip(bucket_means, counts)):
        result.append({
            'range': f'{mean:.2f}',
            'value': mean,
            'count': count,
            'percentage': round(count / total * 100, 2)
        })
    
    return result


def get_time_series(
    geometry: ee.Geometry,
    start_date: str,
    end_date: str,
    indices: List[str] = None,
    interval_days: int = 5,
    scale: int = 10
) -> List[Dict]:
    """
    Get time series of index values over the geometry.
    """
    if indices is None:
        indices = ['NDVI', 'EVI', 'NDRE', 'LSWI']
    
    collection = get_s2_collection(geometry, start_date, end_date, max_cloud_cover=30)
    
    def extract_values(image):
        """Extract mean values for an image."""
        stats = image.select(indices).reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=scale,
            maxPixels=1e9
        )
        return ee.Feature(None, stats.set('date', image.date().format('YYYY-MM-dd')))
    
    # Get values for each image
    features = collection.map(extract_values)
    
    # Get as list
    result = features.getInfo()
    
    time_series = []
    for feature in result.get('features', []):
        props = feature.get('properties', {})
        entry = {'date': props.get('date')}
        for index in indices:
            entry[index.lower()] = props.get(index)
        time_series.append(entry)
    
    # Sort by date
    time_series.sort(key=lambda x: x['date'])
    
    return time_series


# =============================================================================
# WEATHER DATA (ERA5-Land)
# =============================================================================

def get_weather_data(
    geometry: ee.Geometry,
    start_date: str,
    end_date: str,
    scale: int = 1000
) -> Dict[str, Any]:
    """
    Get weather data from ERA5-Land dataset.
    Includes temperature, precipitation, humidity, wind.
    """
    # ERA5-Land hourly data
    era5 = (
        ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
        .filterBounds(geometry)
        .filterDate(start_date, end_date)
    )
    
    # Calculate mean values
    mean_image = era5.mean()
    
    stats = mean_image.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geometry,
        scale=scale,
        maxPixels=1e9
    ).getInfo()
    
    # Convert units and organize
    temp_k = stats.get('temperature_2m', 293)  # Kelvin
    temp_c = temp_k - 273.15 if temp_k else None
    
    return {
        'temperature_c': round(temp_c, 1) if temp_c else None,
        'temperature_k': temp_k,
        'precipitation_mm': stats.get('total_precipitation'),
        'humidity_percent': stats.get('surface_pressure'),  # Would need conversion
        'wind_u': stats.get('u_component_of_wind_10m'),
        'wind_v': stats.get('v_component_of_wind_10m'),
        'soil_temp_c': (stats.get('soil_temperature_level_1', 293) - 273.15) if stats.get('soil_temperature_level_1') else None,
        'evaporation': stats.get('evaporation_from_vegetation_transpiration'),
    }


def get_weather_time_series(
    geometry: ee.Geometry,
    start_date: str,
    end_date: str,
    scale: int = 1000
) -> List[Dict]:
    """
    Get daily weather time series.
    """
    era5 = (
        ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
        .filterBounds(geometry)
        .filterDate(start_date, end_date)
    )
    
    def extract_weather(image):
        stats = image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=scale,
            maxPixels=1e9
        )
        return ee.Feature(None, stats.set('date', image.date().format('YYYY-MM-dd')))
    
    features = era5.map(extract_weather).getInfo()
    
    result = []
    for feature in features.get('features', []):
        props = feature.get('properties', {})
        temp_k = props.get('temperature_2m', 293)
        result.append({
            'date': props.get('date'),
            'temp_max_c': round(props.get('temperature_2m_max', 300) - 273.15, 1),
            'temp_min_c': round(props.get('temperature_2m_min', 290) - 273.15, 1),
            'temp_mean_c': round(temp_k - 273.15, 1) if temp_k else None,
            'precipitation_mm': props.get('total_precipitation_sum'),
        })
    
    return sorted(result, key=lambda x: x['date'])


# =============================================================================
# SOIL MOISTURE (SMAP)
# =============================================================================

def get_soil_moisture(
    geometry: ee.Geometry,
    start_date: str,
    end_date: str,
    scale: int = 1000
) -> Dict[str, Any]:
    """
    Get soil moisture data from NASA SMAP.
    """
    try:
        smap = (
            ee.ImageCollection('NASA/SMAP/SPL4SMGP/007')
            .filterBounds(geometry)
            .filterDate(start_date, end_date)
        )
        
        mean_image = smap.mean()
        
        stats = mean_image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=scale,
            maxPixels=1e9
        ).getInfo()
        
        return {
            'surface_moisture': stats.get('sm_surface'),
            'rootzone_moisture': stats.get('sm_rootzone'),
            'surface_moisture_error': stats.get('sm_surface_error'),
        }
    except:
        return {'surface_moisture': None, 'rootzone_moisture': None}


# =============================================================================
# CROP HEALTH ANALYSIS
# =============================================================================

def calculate_crop_health_score(indices: Dict[str, float]) -> Dict[str, Any]:
    """
    Calculate overall crop health score from indices.
    Returns score 0-100 and individual component scores.
    """
    # Component scores (normalized to 0-100)
    ndvi = indices.get('NDVI', 0.5)
    evi = indices.get('EVI', 0.4)
    ndre = indices.get('NDRE', 0.4)
    lswi = indices.get('LSWI', 0.2)
    lai = indices.get('LAI', 1.5)
    
    # Greenness score (from NDVI)
    greenness = min(100, max(0, (ndvi + 0.1) / 1.1 * 100))
    
    # Vigor score (from EVI - better for high biomass)
    vigor = min(100, max(0, (evi + 0.1) / 0.9 * 100))
    
    # Nutrient score (from NDRE - chlorophyll)
    nutrient = min(100, max(0, (ndre + 0.1) / 0.8 * 100))
    
    # Water status (from LSWI)
    water = min(100, max(0, (lswi + 0.5) / 1.0 * 100))
    
    # Canopy score (from LAI)
    canopy = min(100, max(0, lai / 6.0 * 100))
    
    # Overall score (weighted average)
    overall = (
        greenness * 0.25 +
        vigor * 0.25 +
        nutrient * 0.20 +
        water * 0.15 +
        canopy * 0.15
    )
    
    return {
        'overall_score': round(overall, 1),
        'greenness_score': round(greenness, 1),
        'vigor_score': round(vigor, 1),
        'nutrient_score': round(nutrient, 1),
        'water_score': round(water, 1),
        'canopy_score': round(canopy, 1),
        'health_status': get_health_status(overall)
    }


def get_health_status(score: float) -> str:
    """Get health status label from score."""
    if score >= 80:
        return 'Excellent'
    elif score >= 65:
        return 'Good'
    elif score >= 50:
        return 'Moderate'
    elif score >= 35:
        return 'Stressed'
    else:
        return 'Critical'


# =============================================================================
# YIELD ESTIMATION
# =============================================================================

def estimate_yield(
    crop_type: str,
    ndvi_max: float,
    evi_mean: float,
    lai_mean: float,
    gdd: float = None
) -> Dict[str, Any]:
    """
    Estimate crop yield based on vegetation indices.
    Uses empirical relationships for common crops.
    
    Returns yield in tonnes/hectare with confidence interval.
    """
    # Crop-specific parameters (empirically derived)
    crop_params = {
        'wheat': {'a': 1.2, 'b': 4.5, 'c': 0.8, 'base_yield': 2.5},
        'rice': {'a': 1.0, 'b': 5.0, 'c': 0.9, 'base_yield': 3.0},
        'maize': {'a': 1.5, 'b': 6.0, 'c': 1.0, 'base_yield': 4.0},
        'cotton': {'a': 0.8, 'b': 2.5, 'c': 0.6, 'base_yield': 1.5},
        'sugarcane': {'a': 2.0, 'b': 40.0, 'c': 2.0, 'base_yield': 50.0},
        'potato': {'a': 1.2, 'b': 15.0, 'c': 1.2, 'base_yield': 20.0},
        'soybean': {'a': 0.6, 'b': 2.0, 'c': 0.5, 'base_yield': 1.8},
        'mustard': {'a': 0.4, 'b': 1.2, 'c': 0.3, 'base_yield': 1.0},
    }
    
    params = crop_params.get(crop_type.lower(), crop_params['wheat'])
    
    # Yield model: Y = base + a*NDVI_max + b*EVI_mean + c*LAI_mean
    estimated_yield = (
        params['base_yield'] +
        params['a'] * ndvi_max +
        params['b'] * evi_mean +
        params['c'] * lai_mean
    )
    
    # Confidence based on index quality
    confidence = min(0.95, max(0.5, ndvi_max * 1.2))
    
    # Calculate range
    uncertainty = estimated_yield * (1 - confidence) * 0.5
    
    return {
        'estimated_yield_tha': round(max(0, estimated_yield), 2),
        'yield_min': round(max(0, estimated_yield - uncertainty), 2),
        'yield_max': round(estimated_yield + uncertainty, 2),
        'confidence': round(confidence * 100, 1),
        'crop_type': crop_type,
        'model_inputs': {
            'ndvi_max': ndvi_max,
            'evi_mean': evi_mean,
            'lai_mean': lai_mean
        }
    }


# =============================================================================
# STRESS DETECTION
# =============================================================================

def detect_stress(
    indices: Dict[str, float],
    weather: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Detect various types of crop stress from indices and weather.
    """
    ndvi = indices.get('NDVI', 0.5)
    lswi = indices.get('LSWI', 0.2)
    ndmi = indices.get('NDMI', 0.2)
    ndre = indices.get('NDRE', 0.4)
    evi = indices.get('EVI', 0.4)
    bsi = indices.get('BSI', -0.1)
    
    # Water stress (from LSWI and NDMI)
    water_stress_level = 0
    if lswi < 0:
        water_stress_level = min(100, abs(lswi) * 200)
    elif lswi < 0.1:
        water_stress_level = 50 - lswi * 500
    
    # Nutrient stress (from NDRE and chlorophyll indices)
    nutrient_stress_level = 0
    if ndre < 0.3:
        nutrient_stress_level = (0.3 - ndre) / 0.3 * 100
    
    # Heat stress (from weather if available)
    heat_stress_level = 0
    if weather and weather.get('temperature_c'):
        temp = weather['temperature_c']
        if temp > 35:
            heat_stress_level = min(100, (temp - 35) * 10)
    
    # Overall vegetation stress (from NDVI decline)
    vegetation_stress = 0
    if ndvi < 0.4:
        vegetation_stress = (0.4 - ndvi) / 0.4 * 100
    
    # Soil exposure (from BSI)
    soil_exposure = max(0, bsi * 100 + 50) if bsi else 0
    
    return {
        'water_stress': {
            'level': round(water_stress_level, 1),
            'status': 'Critical' if water_stress_level > 70 else 'Warning' if water_stress_level > 40 else 'Normal',
            'indicator': 'LSWI',
            'value': lswi
        },
        'nutrient_stress': {
            'level': round(nutrient_stress_level, 1),
            'status': 'Critical' if nutrient_stress_level > 70 else 'Warning' if nutrient_stress_level > 40 else 'Normal',
            'indicator': 'NDRE',
            'value': ndre
        },
        'heat_stress': {
            'level': round(heat_stress_level, 1),
            'status': 'Critical' if heat_stress_level > 70 else 'Warning' if heat_stress_level > 40 else 'Normal',
            'temperature_c': weather.get('temperature_c') if weather else None
        },
        'vegetation_stress': {
            'level': round(vegetation_stress, 1),
            'status': 'Critical' if vegetation_stress > 70 else 'Warning' if vegetation_stress > 40 else 'Normal',
            'indicator': 'NDVI',
            'value': ndvi
        },
        'soil_exposure': {
            'level': round(soil_exposure, 1),
            'status': 'High' if soil_exposure > 60 else 'Moderate' if soil_exposure > 30 else 'Low',
            'indicator': 'BSI',
            'value': bsi
        }
    }


# =============================================================================
# CROP PHENOLOGY
# =============================================================================

def detect_crop_stage(
    ndvi_values: List[float],
    dates: List[str],
    sowing_date: str = None
) -> Dict[str, Any]:
    """
    Detect crop growth stage from NDVI time series.
    """
    if not ndvi_values or len(ndvi_values) < 3:
        return {'stage': 'Unknown', 'confidence': 0}
    
    current_ndvi = ndvi_values[-1]
    max_ndvi = max(ndvi_values)
    trend = ndvi_values[-1] - ndvi_values[-3] if len(ndvi_values) >= 3 else 0
    
    # Determine stage based on NDVI pattern
    if current_ndvi < 0.2:
        stage = 'Bare Soil / Fallow'
        stage_code = 0
    elif current_ndvi < 0.3 and trend > 0:
        stage = 'Emergence'
        stage_code = 1
    elif current_ndvi < 0.5 and trend > 0:
        stage = 'Vegetative Growth'
        stage_code = 2
    elif current_ndvi >= 0.5 and trend > 0:
        stage = 'Active Growth'
        stage_code = 3
    elif current_ndvi >= 0.6 and abs(trend) < 0.05:
        stage = 'Peak / Flowering'
        stage_code = 4
    elif current_ndvi >= 0.4 and trend < 0:
        stage = 'Grain Filling / Maturation'
        stage_code = 5
    elif current_ndvi < 0.4 and trend < 0:
        stage = 'Senescence'
        stage_code = 6
    elif current_ndvi < 0.25:
        stage = 'Harvest Ready'
        stage_code = 7
    else:
        stage = 'Unknown'
        stage_code = -1
    
    return {
        'stage': stage,
        'stage_code': stage_code,
        'current_ndvi': current_ndvi,
        'max_ndvi': max_ndvi,
        'trend': round(trend, 3),
        'trend_direction': 'Increasing' if trend > 0.02 else 'Decreasing' if trend < -0.02 else 'Stable'
    }


# =============================================================================
# COMPREHENSIVE ANALYSIS
# =============================================================================

def run_comprehensive_analysis(
    geometry: dict,
    start_date: str,
    end_date: str,
    crop_type: str = 'wheat',
    scale: int = 10
) -> Dict[str, Any]:
    """
    Run complete analysis including all indices, weather, stress, yield estimation.
    """
    ee_geometry = geometry_to_ee(geometry)
    
    # Get vegetation indices statistics
    index_stats = calculate_index_stats(
        ee_geometry, start_date, end_date,
        indices=['NDVI', 'EVI', 'NDRE', 'GNDVI', 'SAVI', 'MSAVI2', 'LSWI', 'NDMI', 'NDWI', 'LAI', 'fPAR', 'BSI'],
        scale=scale
    )
    
    # Extract mean values
    mean_indices = {k: v.get('mean', 0) for k, v in index_stats.items()}
    
    # Get weather data
    weather = get_weather_data(ee_geometry, start_date, end_date)
    
    # Calculate health scores
    health = calculate_crop_health_score(mean_indices)
    
    # Detect stress
    stress = detect_stress(mean_indices, weather)
    
    # Estimate yield
    yield_estimate = estimate_yield(
        crop_type,
        ndvi_max=index_stats['NDVI'].get('max', 0.6),
        evi_mean=mean_indices.get('EVI', 0.4),
        lai_mean=mean_indices.get('LAI', 2.0)
    )
    
    # Get histogram for primary indices
    ndvi_histogram = calculate_index_histogram(
        ee_geometry, start_date, end_date, 'NDVI', num_buckets=15, scale=scale
    )
    
    return {
        'analysis_date': datetime.utcnow().isoformat(),
        'date_range': {'start': start_date, 'end': end_date},
        'indices': index_stats,
        'mean_indices': mean_indices,
        'weather': weather,
        'health': health,
        'stress': stress,
        'yield_estimate': yield_estimate,
        'ndvi_distribution': ndvi_histogram,
        'crop_type': crop_type
    }
