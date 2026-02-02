"""
Anomaly Detection Service
Detects crop anomalies, LULC changes, and abnormal patterns
"""
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import math

# ============================================================================
# NDVI ANOMALY DETECTION
# ============================================================================

def detect_ndvi_anomaly(
    current_ndvi: float,
    historical_values: List[float],
    threshold_std: float = 2.0
) -> Dict[str, Any]:
    """
    Detect anomaly in NDVI values using statistical methods
    
    Args:
        current_ndvi: Current NDVI value
        historical_values: List of historical NDVI values
        threshold_std: Number of standard deviations for anomaly threshold
    
    Returns:
        Anomaly detection result
    """
    if len(historical_values) < 5:
        return {
            "is_anomaly": False,
            "confidence": 0,
            "message": "Insufficient historical data"
        }
    
    mean = sum(historical_values) / len(historical_values)
    variance = sum((x - mean) ** 2 for x in historical_values) / len(historical_values)
    std = math.sqrt(variance) if variance > 0 else 0.001
    
    z_score = (current_ndvi - mean) / std
    
    is_anomaly = abs(z_score) > threshold_std
    confidence = min(100, abs(z_score) / threshold_std * 50)
    
    if is_anomaly:
        if z_score < 0:
            anomaly_type = "significant_decline"
            message = f"NDVI dropped significantly ({current_ndvi:.2f} vs mean {mean:.2f})"
        else:
            anomaly_type = "unexpected_increase"
            message = f"NDVI increased unexpectedly ({current_ndvi:.2f} vs mean {mean:.2f})"
    else:
        anomaly_type = "normal"
        message = "NDVI within normal range"
    
    return {
        "is_anomaly": is_anomaly,
        "anomaly_type": anomaly_type,
        "z_score": round(z_score, 2),
        "confidence": round(confidence, 1),
        "current_value": current_ndvi,
        "historical_mean": round(mean, 3),
        "historical_std": round(std, 3),
        "message": message
    }


def detect_sudden_change(
    time_series: List[Dict[str, Any]],
    index_key: str = "ndvi",
    change_threshold: float = 0.15
) -> Dict[str, Any]:
    """
    Detect sudden changes in vegetation over time
    
    Args:
        time_series: List of {date, value} dicts
        index_key: Key for the index value
        change_threshold: Minimum change to consider significant
    
    Returns:
        Change detection results
    """
    if len(time_series) < 2:
        return {"changes_detected": [], "significant_change": False}
    
    changes = []
    for i in range(1, len(time_series)):
        prev = time_series[i-1].get(index_key, 0)
        curr = time_series[i].get(index_key, 0)
        change = curr - prev
        
        if abs(change) >= change_threshold:
            changes.append({
                "date": time_series[i].get("date"),
                "previous_value": prev,
                "current_value": curr,
                "change": round(change, 3),
                "change_percent": round(change / prev * 100, 1) if prev != 0 else 0,
                "type": "decline" if change < 0 else "increase",
                "severity": "high" if abs(change) > 0.25 else "moderate"
            })
    
    return {
        "changes_detected": changes,
        "significant_change": len(changes) > 0,
        "total_changes": len(changes)
    }


# ============================================================================
# LULC CHANGE DETECTION
# ============================================================================

def detect_lulc_change(
    current_classification: Dict[str, float],
    previous_classification: Dict[str, float],
    min_change_percent: float = 5.0
) -> Dict[str, Any]:
    """
    Detect Land Use Land Cover changes
    
    Args:
        current_classification: Current LULC percentages
        previous_classification: Previous LULC percentages
        min_change_percent: Minimum change to report
    
    Returns:
        LULC change analysis
    """
    changes = []
    
    all_classes = set(current_classification.keys()) | set(previous_classification.keys())
    
    for lulc_class in all_classes:
        curr = current_classification.get(lulc_class, 0)
        prev = previous_classification.get(lulc_class, 0)
        change = curr - prev
        
        if abs(change) >= min_change_percent:
            changes.append({
                "class": lulc_class,
                "previous_percent": prev,
                "current_percent": curr,
                "change": round(change, 1),
                "trend": "increasing" if change > 0 else "decreasing"
            })
    
    # Detect specific patterns
    patterns = []
    cropland_change = current_classification.get("cropland", 0) - previous_classification.get("cropland", 0)
    urban_change = current_classification.get("urban", 0) - previous_classification.get("urban", 0)
    forest_change = current_classification.get("forest", 0) - previous_classification.get("forest", 0)
    
    if cropland_change < -5 and urban_change > 5:
        patterns.append("agricultural_to_urban_conversion")
    if forest_change < -5 and cropland_change > 5:
        patterns.append("deforestation_for_agriculture")
    if cropland_change < -10:
        patterns.append("significant_cropland_loss")
    
    return {
        "changes": changes,
        "patterns_detected": patterns,
        "has_significant_change": len(changes) > 0,
        "analysis_summary": f"Detected {len(changes)} significant LULC changes"
    }


# ============================================================================
# CROP DAMAGE DETECTION
# ============================================================================

def detect_crop_damage(
    indices: Dict[str, float],
    weather_history: List[Dict[str, Any]],
    crop_type: str = "wheat"
) -> Dict[str, Any]:
    """
    Detect potential crop damage from various sources
    
    Args:
        indices: Current vegetation indices
        weather_history: Recent weather data
        crop_type: Type of crop
    
    Returns:
        Damage assessment
    """
    damage_indicators = []
    overall_damage_score = 0
    
    # Check vegetation indices for damage
    ndvi = indices.get("NDVI", 0.5)
    ndre = indices.get("NDRE", 0.3)
    lswi = indices.get("LSWI", 0.2)
    bsi = indices.get("BSI", 0)
    
    # Vegetation decline damage
    if ndvi < 0.3:
        severity = "severe" if ndvi < 0.2 else "moderate"
        damage_indicators.append({
            "type": "vegetation_decline",
            "severity": severity,
            "indicator": "NDVI",
            "value": ndvi,
            "description": f"Low vegetation vigor detected (NDVI: {ndvi:.2f})"
        })
        overall_damage_score += 30 if severity == "severe" else 15
    
    # Water stress damage
    if lswi < 0:
        severity = "severe" if lswi < -0.2 else "moderate"
        damage_indicators.append({
            "type": "water_stress",
            "severity": severity,
            "indicator": "LSWI",
            "value": lswi,
            "description": f"Water stress detected (LSWI: {lswi:.2f})"
        })
        overall_damage_score += 25 if severity == "severe" else 12
    
    # Nutrient deficiency
    if ndre < 0.2:
        severity = "severe" if ndre < 0.1 else "moderate"
        damage_indicators.append({
            "type": "nutrient_deficiency",
            "severity": severity,
            "indicator": "NDRE",
            "value": ndre,
            "description": f"Chlorophyll deficiency detected (NDRE: {ndre:.2f})"
        })
        overall_damage_score += 20 if severity == "severe" else 10
    
    # Bare soil exposure (possible crop failure)
    if bsi > 0.1:
        severity = "severe" if bsi > 0.2 else "moderate"
        damage_indicators.append({
            "type": "soil_exposure",
            "severity": severity,
            "indicator": "BSI",
            "value": bsi,
            "description": f"High bare soil detected (BSI: {bsi:.2f})"
        })
        overall_damage_score += 25 if severity == "severe" else 12
    
    # Analyze weather impact
    if weather_history:
        recent_temps = [w.get("temperature_c", 25) for w in weather_history[-7:]]
        recent_precip = sum(w.get("precipitation_mm", 0) for w in weather_history[-14:])
        
        if recent_temps and max(recent_temps) > 40:
            damage_indicators.append({
                "type": "heat_damage",
                "severity": "moderate",
                "indicator": "temperature",
                "value": max(recent_temps),
                "description": f"Heat wave impact (max temp: {max(recent_temps)}°C)"
            })
            overall_damage_score += 15
        
        if recent_precip < 5:  # Very low precipitation
            damage_indicators.append({
                "type": "drought_impact",
                "severity": "moderate",
                "indicator": "precipitation",
                "value": recent_precip,
                "description": f"Low rainfall in past 14 days ({recent_precip:.1f}mm)"
            })
            overall_damage_score += 15
    
    # Determine overall status
    if overall_damage_score >= 60:
        status = "critical"
    elif overall_damage_score >= 40:
        status = "high"
    elif overall_damage_score >= 20:
        status = "moderate"
    else:
        status = "low"
    
    return {
        "damage_score": min(100, overall_damage_score),
        "status": status,
        "indicators": damage_indicators,
        "recommendation": get_damage_recommendation(damage_indicators, crop_type)
    }


def get_damage_recommendation(
    indicators: List[Dict[str, Any]],
    crop_type: str
) -> List[str]:
    """Generate recommendations based on damage indicators"""
    recommendations = []
    
    damage_types = {ind["type"] for ind in indicators}
    
    if "water_stress" in damage_types or "drought_impact" in damage_types:
        recommendations.append("Increase irrigation immediately")
        recommendations.append("Consider mulching to retain soil moisture")
    
    if "nutrient_deficiency" in damage_types:
        recommendations.append("Apply foliar fertilizer spray")
        recommendations.append("Test soil for nutrient levels")
    
    if "heat_damage" in damage_types:
        recommendations.append("Provide temporary shade if possible")
        recommendations.append("Increase irrigation frequency during hot periods")
    
    if "vegetation_decline" in damage_types:
        recommendations.append("Conduct field inspection for pest/disease")
        recommendations.append("Consider contacting agricultural extension officer")
    
    if "soil_exposure" in damage_types:
        recommendations.append("Check for pest damage or germination failure")
        recommendations.append("Consider replanting affected areas")
    
    if not recommendations:
        recommendations.append(f"Continue monitoring {crop_type} health regularly")
    
    return recommendations


# ============================================================================
# CARBON SEQUESTRATION ESTIMATION
# ============================================================================

def estimate_carbon_sequestration(
    ndvi: float,
    lai: float,
    area_ha: float,
    crop_type: str,
    days_since_sowing: int = 90
) -> Dict[str, Any]:
    """
    Estimate carbon sequestration potential
    
    Args:
        ndvi: Current NDVI
        lai: Leaf Area Index
        area_ha: Farm area in hectares
        crop_type: Type of crop
        days_since_sowing: Days since sowing
    
    Returns:
        Carbon sequestration estimates
    """
    # Crop-specific carbon fixation rates (tC/ha/year at peak growth)
    crop_carbon_rates = {
        "wheat": 3.5,
        "rice": 4.0,
        "maize": 6.0,
        "cotton": 2.5,
        "sugarcane": 8.0,
        "potato": 3.0,
        "soybean": 3.5,
        "mustard": 2.5,
    }
    
    base_rate = crop_carbon_rates.get(crop_type, 3.5)
    
    # Adjust for vegetation health
    health_factor = (ndvi + 1) / 2  # Normalize NDVI to 0-1
    
    # Adjust for canopy (LAI)
    canopy_factor = min(1.0, lai / 4.0)  # Peak LAI ~4
    
    # Growth stage factor (simplified curve)
    if days_since_sowing < 30:
        growth_factor = 0.3
    elif days_since_sowing < 60:
        growth_factor = 0.7
    elif days_since_sowing < 90:
        growth_factor = 1.0
    elif days_since_sowing < 120:
        growth_factor = 0.8
    else:
        growth_factor = 0.5
    
    # Calculate current sequestration rate
    current_rate = base_rate * health_factor * canopy_factor * growth_factor
    
    # Annual estimate (projected)
    annual_sequestration_per_ha = base_rate * 0.8  # Conservative estimate
    total_annual = annual_sequestration_per_ha * area_ha
    
    # CO2 equivalent (1 tC = 3.67 tCO2)
    co2_equivalent = total_annual * 3.67
    
    # Carbon credits estimate (simplified, ~$25/tCO2)
    credit_value = co2_equivalent * 25
    
    return {
        "current_rate_tc_ha_day": round(current_rate / 365, 4),
        "annual_estimate_tc_ha": round(annual_sequestration_per_ha, 2),
        "total_annual_tc": round(total_annual, 2),
        "co2_equivalent_t": round(co2_equivalent, 2),
        "potential_credit_value_usd": round(credit_value, 2),
        "health_factor": round(health_factor, 2),
        "methodology": "Remote sensing based estimation using NDVI and LAI",
        "confidence": "medium",
        "note": "Estimates for dMRV compliance. Actual verification requires additional data."
    }


# ============================================================================
# PATTERN ANALYSIS
# ============================================================================

def analyze_spatial_patterns(
    pixel_values: List[List[float]],
    threshold: float = 0.2
) -> Dict[str, Any]:
    """
    Analyze spatial patterns in vegetation index grid
    
    Args:
        pixel_values: 2D grid of index values
        threshold: Threshold for pattern detection
    
    Returns:
        Spatial pattern analysis
    """
    if not pixel_values or not pixel_values[0]:
        return {"patterns": [], "uniformity": 0}
    
    # Calculate statistics
    all_values = [v for row in pixel_values for v in row]
    mean_val = sum(all_values) / len(all_values)
    variance = sum((v - mean_val) ** 2 for v in all_values) / len(all_values)
    cv = (math.sqrt(variance) / mean_val * 100) if mean_val > 0 else 0
    
    # Uniformity score (inverse of CV)
    uniformity = max(0, 100 - cv)
    
    patterns = []
    
    # Detect low-value clusters (potential problem areas)
    low_count = sum(1 for v in all_values if v < mean_val - threshold)
    if low_count > len(all_values) * 0.2:
        patterns.append({
            "type": "clustered_low_values",
            "description": "Areas with significantly lower vegetation health detected",
            "affected_percent": round(low_count / len(all_values) * 100, 1)
        })
    
    # Detect high variability
    if cv > 30:
        patterns.append({
            "type": "high_variability",
            "description": "Uneven crop growth across field",
            "coefficient_of_variation": round(cv, 1)
        })
    
    return {
        "uniformity_score": round(uniformity, 1),
        "mean_value": round(mean_val, 3),
        "coefficient_of_variation": round(cv, 1),
        "patterns": patterns,
        "recommendation": "Field is uniform" if uniformity > 80 else "Consider zone-specific management"
    }
