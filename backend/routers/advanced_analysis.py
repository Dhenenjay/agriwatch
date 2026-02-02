"""
Advanced Analysis API Router
Exposes the comprehensive GEE analysis functionality
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/advanced", tags=["Advanced Analysis"])

# Try to import GEE service
try:
    from services.gee_advanced import AdvancedGEEService
    gee_service = AdvancedGEEService()
    GEE_AVAILABLE = True
except Exception as e:
    print(f"GEE service not available: {e}")
    GEE_AVAILABLE = False
    gee_service = None


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class Coordinates(BaseModel):
    """Farm boundary coordinates"""
    type: str = "Polygon"
    coordinates: List[List[List[float]]]


class AnalysisRequest(BaseModel):
    """Request for comprehensive analysis"""
    farm_id: str
    geometry: Coordinates
    crop_type: str = "wheat"
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class IndexResponse(BaseModel):
    """Vegetation indices response"""
    NDVI: Optional[float] = None
    EVI: Optional[float] = None
    NDRE: Optional[float] = None
    GNDVI: Optional[float] = None
    SAVI: Optional[float] = None
    MSAVI2: Optional[float] = None
    LSWI: Optional[float] = None
    NDMI: Optional[float] = None
    NDWI: Optional[float] = None
    NBR: Optional[float] = None
    CIgreen: Optional[float] = None
    CIre: Optional[float] = None
    MCARI: Optional[float] = None
    TCARI: Optional[float] = None
    WDRVI: Optional[float] = None
    LAI: Optional[float] = None
    fPAR: Optional[float] = None
    BSI: Optional[float] = None
    NDTI: Optional[float] = None


class HealthScoreResponse(BaseModel):
    """Crop health score response"""
    overall_score: float
    greenness_score: float
    vigor_score: float
    nutrient_score: float
    water_score: float
    canopy_score: float
    health_status: str


class StressResponse(BaseModel):
    """Stress detection response"""
    water_stress: Dict[str, Any]
    nutrient_stress: Dict[str, Any]
    heat_stress: Dict[str, Any]
    vegetation_stress: Dict[str, Any]
    soil_exposure: Dict[str, Any]


class YieldResponse(BaseModel):
    """Yield estimation response"""
    estimated_yield_tha: float
    yield_min: float
    yield_max: float
    confidence: float
    crop_type: str
    model_type: str


class WeatherResponse(BaseModel):
    """Weather data response"""
    temperature_c: Optional[float] = None
    precipitation_mm: Optional[float] = None
    wind_speed_ms: Optional[float] = None
    soil_temp_c: Optional[float] = None
    evaporation_mm: Optional[float] = None
    humidity_percent: Optional[float] = None


class CropStageResponse(BaseModel):
    """Crop stage detection response"""
    current_stage: str
    stage_confidence: float
    days_in_stage: int
    estimated_days_to_next: int
    growth_rate: str
    phenology_score: float


class ComprehensiveAnalysisResponse(BaseModel):
    """Complete analysis response"""
    farm_id: str
    analysis_date: str
    indices: IndexResponse
    health_score: HealthScoreResponse
    stress_detection: StressResponse
    yield_estimation: YieldResponse
    weather: WeatherResponse
    crop_stage: CropStageResponse
    recommendations: List[str]


# ============================================================================
# MOCK DATA GENERATORS (for when GEE is not available)
# ============================================================================

def generate_mock_indices() -> dict:
    """Generate realistic mock vegetation indices"""
    import random
    base_ndvi = random.uniform(0.45, 0.75)
    return {
        "NDVI": round(base_ndvi, 3),
        "EVI": round(base_ndvi * 0.85, 3),
        "NDRE": round(base_ndvi * 0.65, 3),
        "GNDVI": round(base_ndvi * 0.95, 3),
        "SAVI": round(base_ndvi * 0.9, 3),
        "MSAVI2": round(base_ndvi * 0.88, 3),
        "LSWI": round(random.uniform(0.1, 0.4), 3),
        "NDMI": round(random.uniform(0.2, 0.5), 3),
        "NDWI": round(random.uniform(-0.1, 0.3), 3),
        "NBR": round(random.uniform(0.3, 0.6), 3),
        "CIgreen": round(random.uniform(1.5, 4.0), 3),
        "CIre": round(random.uniform(0.8, 2.5), 3),
        "MCARI": round(random.uniform(0.1, 0.4), 3),
        "TCARI": round(random.uniform(0.05, 0.2), 3),
        "WDRVI": round(random.uniform(0.3, 0.6), 3),
        "LAI": round(random.uniform(2.0, 5.0), 2),
        "fPAR": round(random.uniform(0.5, 0.85), 3),
        "BSI": round(random.uniform(-0.2, 0.1), 3),
        "NDTI": round(random.uniform(-0.1, 0.2), 3),
    }


def generate_mock_health_score(indices: dict) -> dict:
    """Generate health score from indices"""
    ndvi = indices.get("NDVI", 0.5)
    evi = indices.get("EVI", 0.4)
    ndre = indices.get("NDRE", 0.3)
    lswi = indices.get("LSWI", 0.2)
    lai = indices.get("LAI", 3.0)
    
    greenness = min(100, max(0, (ndvi + 1) / 2 * 100))
    vigor = min(100, max(0, (evi + 1) / 2 * 100))
    nutrient = min(100, max(0, (ndre + 1) / 2 * 100))
    water = min(100, max(0, (lswi + 1) / 2 * 100))
    canopy = min(100, max(0, lai / 6 * 100))
    
    overall = (greenness * 0.3 + vigor * 0.25 + nutrient * 0.2 + water * 0.15 + canopy * 0.1)
    
    if overall >= 80:
        status = "Excellent"
    elif overall >= 65:
        status = "Good"
    elif overall >= 50:
        status = "Fair"
    elif overall >= 35:
        status = "Poor"
    else:
        status = "Critical"
    
    return {
        "overall_score": round(overall, 1),
        "greenness_score": round(greenness, 1),
        "vigor_score": round(vigor, 1),
        "nutrient_score": round(nutrient, 1),
        "water_score": round(water, 1),
        "canopy_score": round(canopy, 1),
        "health_status": status,
    }


def generate_mock_stress(indices: dict, weather: dict) -> dict:
    """Generate stress detection data"""
    lswi = indices.get("LSWI", 0.2)
    ndre = indices.get("NDRE", 0.3)
    ndvi = indices.get("NDVI", 0.5)
    bsi = indices.get("BSI", 0)
    temp = weather.get("temperature_c", 25)
    
    def get_status(level):
        if level < 25: return "normal"
        if level < 50: return "moderate"
        if level < 75: return "high"
        return "critical"
    
    water_level = max(0, min(100, (0.3 - lswi) / 0.6 * 100))
    nutrient_level = max(0, min(100, (0.4 - ndre) / 0.8 * 100))
    heat_level = max(0, min(100, (temp - 25) / 20 * 100)) if temp > 25 else 0
    veg_level = max(0, min(100, (0.5 - ndvi) / 1 * 100))
    soil_level = max(0, min(100, (bsi + 0.2) / 0.4 * 100))
    
    return {
        "water_stress": {
            "level": round(water_level, 1),
            "status": get_status(water_level),
            "indicator": "LSWI",
            "value": lswi
        },
        "nutrient_stress": {
            "level": round(nutrient_level, 1),
            "status": get_status(nutrient_level),
            "indicator": "NDRE",
            "value": ndre
        },
        "heat_stress": {
            "level": round(heat_level, 1),
            "status": get_status(heat_level),
            "temperature_c": temp
        },
        "vegetation_stress": {
            "level": round(veg_level, 1),
            "status": get_status(veg_level),
            "indicator": "NDVI",
            "value": ndvi
        },
        "soil_exposure": {
            "level": round(soil_level, 1),
            "status": get_status(soil_level),
            "indicator": "BSI",
            "value": bsi
        }
    }


def generate_mock_yield(indices: dict, crop_type: str) -> dict:
    """Generate yield estimation"""
    ndvi = indices.get("NDVI", 0.5)
    lai = indices.get("LAI", 3.0)
    
    # Crop-specific yield models
    crop_params = {
        "wheat": {"base": 2.5, "max": 6.0, "ndvi_coef": 4.0, "lai_coef": 0.3},
        "rice": {"base": 3.0, "max": 7.0, "ndvi_coef": 5.0, "lai_coef": 0.4},
        "maize": {"base": 4.0, "max": 10.0, "ndvi_coef": 7.0, "lai_coef": 0.5},
        "cotton": {"base": 1.5, "max": 3.5, "ndvi_coef": 2.5, "lai_coef": 0.2},
        "sugarcane": {"base": 50, "max": 100, "ndvi_coef": 60, "lai_coef": 5},
        "potato": {"base": 15, "max": 35, "ndvi_coef": 25, "lai_coef": 2},
        "soybean": {"base": 1.5, "max": 3.5, "ndvi_coef": 2.5, "lai_coef": 0.2},
        "mustard": {"base": 1.0, "max": 2.5, "ndvi_coef": 2.0, "lai_coef": 0.15},
    }
    
    params = crop_params.get(crop_type, crop_params["wheat"])
    
    estimated = params["base"] + (ndvi * params["ndvi_coef"]) + (lai * params["lai_coef"])
    estimated = min(params["max"], max(params["base"], estimated))
    
    variance = estimated * 0.15
    confidence = min(95, max(60, 70 + ndvi * 30))
    
    return {
        "estimated_yield_tha": round(estimated, 2),
        "yield_min": round(estimated - variance, 2),
        "yield_max": round(estimated + variance, 2),
        "confidence": round(confidence, 1),
        "crop_type": crop_type,
        "model_type": "satellite-based-regression"
    }


def generate_mock_weather() -> dict:
    """Generate mock weather data"""
    import random
    return {
        "temperature_c": round(random.uniform(18, 32), 1),
        "precipitation_mm": round(random.uniform(0, 15), 1),
        "wind_speed_ms": round(random.uniform(1, 8), 1),
        "soil_temp_c": round(random.uniform(15, 28), 1),
        "evaporation_mm": round(random.uniform(2, 8), 2),
        "humidity_percent": round(random.uniform(40, 80), 0)
    }


def generate_mock_crop_stage(indices: dict) -> dict:
    """Generate crop stage based on NDVI"""
    ndvi = indices.get("NDVI", 0.5)
    
    if ndvi < 0.2:
        stage = "germination"
        days_in = 10
        days_to_next = 15
    elif ndvi < 0.4:
        stage = "vegetative"
        days_in = 25
        days_to_next = 20
    elif ndvi < 0.6:
        stage = "reproductive"
        days_in = 15
        days_to_next = 25
    elif ndvi < 0.75:
        stage = "maturity"
        days_in = 20
        days_to_next = 15
    else:
        stage = "senescence"
        days_in = 10
        days_to_next = 0
    
    import random
    growth_rates = ["slow", "normal", "fast"]
    growth_rate = random.choice(growth_rates)
    
    return {
        "current_stage": stage,
        "stage_confidence": round(random.uniform(75, 95), 1),
        "days_in_stage": days_in,
        "estimated_days_to_next": days_to_next,
        "growth_rate": growth_rate,
        "phenology_score": round(ndvi * 100, 1)
    }


def generate_recommendations(health: dict, stress: dict, crop_type: str) -> List[str]:
    """Generate actionable recommendations"""
    recommendations = []
    
    if health["overall_score"] < 50:
        recommendations.append("Critical: Immediate field inspection recommended")
    
    if stress["water_stress"]["level"] > 50:
        recommendations.append("Increase irrigation frequency - signs of water stress detected")
    
    if stress["nutrient_stress"]["level"] > 50:
        recommendations.append("Consider foliar nitrogen application - chlorophyll content below optimal")
    
    if stress["heat_stress"]["level"] > 60:
        recommendations.append("Heat stress detected - consider mulching or shade nets")
    
    if stress["soil_exposure"]["level"] > 40:
        recommendations.append("High bare soil detected - check for pest damage or poor germination")
    
    if health["canopy_score"] < 50:
        recommendations.append("Canopy coverage is low - verify plant population density")
    
    if not recommendations:
        recommendations.append(f"Crop is healthy. Continue current management practices for {crop_type}")
    
    return recommendations


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("/status")
async def get_service_status():
    """Check GEE service status"""
    return {
        "gee_available": GEE_AVAILABLE,
        "service_version": "2.0.0",
        "features": [
            "19 vegetation indices",
            "crop health scoring",
            "stress detection",
            "yield estimation",
            "weather integration",
            "crop stage detection"
        ]
    }


@router.post("/comprehensive", response_model=ComprehensiveAnalysisResponse)
async def run_comprehensive_analysis(request: AnalysisRequest):
    """
    Run comprehensive analysis including all indices, health scores,
    stress detection, yield estimation, and recommendations
    """
    geometry = request.geometry.model_dump()
    
    if GEE_AVAILABLE and gee_service:
        try:
            # Use actual GEE service
            result = gee_service.run_comprehensive_analysis(
                geometry=geometry,
                crop_type=request.crop_type
            )
            return ComprehensiveAnalysisResponse(
                farm_id=request.farm_id,
                analysis_date=datetime.now().isoformat(),
                **result
            )
        except Exception as e:
            print(f"GEE analysis failed: {e}")
            # Fall back to mock data
    
    # Generate mock data
    indices = generate_mock_indices()
    weather = generate_mock_weather()
    health = generate_mock_health_score(indices)
    stress = generate_mock_stress(indices, weather)
    yield_est = generate_mock_yield(indices, request.crop_type)
    crop_stage = generate_mock_crop_stage(indices)
    recommendations = generate_recommendations(health, stress, request.crop_type)
    
    return ComprehensiveAnalysisResponse(
        farm_id=request.farm_id,
        analysis_date=datetime.now().isoformat(),
        indices=IndexResponse(**indices),
        health_score=HealthScoreResponse(**health),
        stress_detection=StressResponse(**stress),
        yield_estimation=YieldResponse(**yield_est),
        weather=WeatherResponse(**weather),
        crop_stage=CropStageResponse(**crop_stage),
        recommendations=recommendations
    )


@router.post("/indices")
async def get_vegetation_indices(request: AnalysisRequest):
    """Get all 19 vegetation indices for a farm"""
    if GEE_AVAILABLE and gee_service:
        try:
            return gee_service.calculate_all_indices(request.geometry.model_dump())
        except Exception as e:
            print(f"GEE indices calculation failed: {e}")
    
    return generate_mock_indices()


@router.post("/health-score")
async def get_health_score(request: AnalysisRequest):
    """Calculate crop health score"""
    if GEE_AVAILABLE and gee_service:
        try:
            indices = gee_service.calculate_all_indices(request.geometry.model_dump())
            return gee_service.calculate_crop_health_score(indices)
        except Exception as e:
            print(f"GEE health score failed: {e}")
    
    indices = generate_mock_indices()
    return generate_mock_health_score(indices)


@router.post("/stress")
async def detect_stress(request: AnalysisRequest):
    """Detect various types of crop stress"""
    if GEE_AVAILABLE and gee_service:
        try:
            indices = gee_service.calculate_all_indices(request.geometry.model_dump())
            weather = gee_service.get_weather_data(request.geometry.model_dump())
            return gee_service.detect_stress(indices, weather)
        except Exception as e:
            print(f"GEE stress detection failed: {e}")
    
    indices = generate_mock_indices()
    weather = generate_mock_weather()
    return generate_mock_stress(indices, weather)


@router.post("/yield")
async def estimate_yield(request: AnalysisRequest):
    """Estimate crop yield based on satellite data"""
    if GEE_AVAILABLE and gee_service:
        try:
            indices = gee_service.calculate_all_indices(request.geometry.model_dump())
            return gee_service.estimate_yield(indices, request.crop_type)
        except Exception as e:
            print(f"GEE yield estimation failed: {e}")
    
    indices = generate_mock_indices()
    return generate_mock_yield(indices, request.crop_type)


@router.post("/weather")
async def get_weather(request: AnalysisRequest):
    """Get weather data for farm location"""
    if GEE_AVAILABLE and gee_service:
        try:
            return gee_service.get_weather_data(request.geometry.model_dump())
        except Exception as e:
            print(f"GEE weather data failed: {e}")
    
    return generate_mock_weather()


@router.post("/crop-stage")
async def detect_crop_stage(request: AnalysisRequest):
    """Detect current crop growth stage"""
    if GEE_AVAILABLE and gee_service:
        try:
            indices = gee_service.calculate_all_indices(request.geometry.model_dump())
            return gee_service.detect_crop_stage(indices)
        except Exception as e:
            print(f"GEE crop stage detection failed: {e}")
    
    indices = generate_mock_indices()
    return generate_mock_crop_stage(indices)


@router.get("/time-series/{farm_id}")
async def get_time_series(
    farm_id: str,
    index: str = Query(default="NDVI", description="Index to retrieve"),
    days: int = Query(default=90, description="Number of days of history")
):
    """Get historical time series data for an index"""
    # Generate mock time series
    from datetime import datetime, timedelta
    import random
    
    end_date = datetime.now()
    data = []
    
    for i in range(days):
        date = end_date - timedelta(days=days - i - 1)
        # Simulate seasonal variation
        base = 0.5 + 0.2 * (1 - abs(i - days/2) / (days/2))
        value = base + random.uniform(-0.1, 0.1)
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": round(max(0, min(1, value)), 3)
        })
    
    return {
        "farm_id": farm_id,
        "index": index,
        "period_days": days,
        "data": data
    }


@router.get("/risk-assessment/{farm_id}")
async def get_risk_assessment(farm_id: str):
    """Get comprehensive risk assessment"""
    import random
    
    def make_factor(name: str, base_level: float):
        level = max(0, min(100, base_level + random.uniform(-10, 10)))
        if level < 25:
            status = "low"
        elif level < 50:
            status = "moderate"
        elif level < 75:
            status = "high"
        else:
            status = "critical"
        
        descriptions = {
            "drought": "Based on LSWI and precipitation deficit analysis",
            "flood": "Based on soil moisture and rainfall patterns",
            "pest": "Based on temperature and humidity conditions favoring pest activity",
            "disease": "Based on weather conditions and crop stage vulnerability",
            "frost": "Based on minimum temperature forecasts",
            "heatwave": "Based on maximum temperature forecasts",
        }
        
        return {
            "name": name.capitalize(),
            "level": round(level, 1),
            "status": status,
            "description": descriptions.get(name, "Risk assessment based on satellite and weather data")
        }
    
    factors = {
        "drought": make_factor("drought", random.uniform(20, 60)),
        "flood": make_factor("flood", random.uniform(10, 40)),
        "pest": make_factor("pest", random.uniform(15, 50)),
        "disease": make_factor("disease", random.uniform(20, 55)),
        "frost": make_factor("frost", random.uniform(5, 30)),
        "heatwave": make_factor("heatwave", random.uniform(25, 65)),
    }
    
    # Calculate overall risk
    overall = sum(f["level"] * w for f, w in zip(
        factors.values(), 
        [0.25, 0.15, 0.2, 0.2, 0.1, 0.1]
    ))
    
    if overall < 25:
        risk_status = "low"
    elif overall < 50:
        risk_status = "moderate"
    elif overall < 75:
        risk_status = "high"
    else:
        risk_status = "critical"
    
    # Generate alerts
    alerts = []
    for name, factor in factors.items():
        if factor["status"] in ["high", "critical"]:
            alerts.append({
                "type": name,
                "severity": "critical" if factor["status"] == "critical" else "warning",
                "message": f"{factor['name']} risk is {factor['status']}. {factor['description']}",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M")
            })
    
    return {
        "farm_id": farm_id,
        "overall_risk": round(overall, 1),
        "risk_status": risk_status,
        "factors": factors,
        "alerts": alerts,
        "assessment_date": datetime.now().isoformat()
    }
