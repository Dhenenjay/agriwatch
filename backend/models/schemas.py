"""Pydantic schemas for AgriWatch API."""

from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class IndexType(str, Enum):
    """Supported vegetation indices."""
    NDVI = "ndvi"
    NDRE = "ndre"
    LSWI = "lswi"
    SAVI = "savi"


class JobStatus(str, Enum):
    """Analysis job status."""
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ============ Geometry Schemas ============

class GeoJSONPolygon(BaseModel):
    """GeoJSON Polygon geometry."""
    type: str = "Polygon"
    coordinates: List[List[List[float]]]


# ============ Farm Schemas ============

class FarmBase(BaseModel):
    """Base farm schema."""
    name: str = Field(..., min_length=1, max_length=200)
    farmer_name: Optional[str] = None
    farmer_phone: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    crop_type: Optional[str] = None
    sowing_date: Optional[date] = None
    expected_harvest: Optional[date] = None


class FarmCreate(FarmBase):
    """Schema for creating a farm."""
    geometry: GeoJSONPolygon
    organization_id: Optional[str] = None


class FarmUpdate(BaseModel):
    """Schema for updating a farm."""
    name: Optional[str] = None
    farmer_name: Optional[str] = None
    farmer_phone: Optional[str] = None
    location: Optional[str] = None
    crop_type: Optional[str] = None
    sowing_date: Optional[date] = None
    expected_harvest: Optional[date] = None


class FarmResponse(FarmBase):
    """Schema for farm response."""
    id: str
    geometry: GeoJSONPolygon
    area_sqm: float
    created_at: datetime
    updated_at: datetime
    latest_ndvi: Optional[float] = None
    last_analysis_date: Optional[datetime] = None


# ============ Analysis Schemas ============

class AnalysisRequest(BaseModel):
    """Schema for analysis job request."""
    geometry: GeoJSONPolygon
    start_date: date
    end_date: date
    indices: List[IndexType] = [IndexType.NDVI, IndexType.NDRE, IndexType.LSWI]
    farm_id: Optional[str] = None
    max_cloud_cover: int = Field(default=20, ge=0, le=100)
    scale: int = Field(default=10, ge=10, le=60)


class AnalysisJobResponse(BaseModel):
    """Schema for analysis job response."""
    job_id: str
    status: JobStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: int = 0
    message: Optional[str] = None
    farm_id: Optional[str] = None


class AnalysisResultResponse(BaseModel):
    """Schema for analysis result."""
    job_id: str
    status: JobStatus
    indices: Dict[str, float]  # Mean values
    statistics: Dict[str, Dict[str, float]]  # Min, max, mean, std per index
    histogram: Optional[Dict[str, List[Dict[str, float]]]] = None
    images_processed: int
    date_range: Dict[str, str]
    geometry: GeoJSONPolygon


# ============ Index Schemas ============

class IndexDataPoint(BaseModel):
    """Single index data point for time series."""
    date: date
    ndvi: Optional[float] = None
    ndre: Optional[float] = None
    lswi: Optional[float] = None
    savi: Optional[float] = None
    cloud_cover: Optional[float] = None


class IndexTimeSeriesResponse(BaseModel):
    """Time series response for indices."""
    farm_id: str
    start_date: date
    end_date: date
    data: List[IndexDataPoint]


class IndexStatistics(BaseModel):
    """Statistics for an index."""
    min: float
    max: float
    mean: float
    std: float
    median: Optional[float] = None


class IndexDistributionBin(BaseModel):
    """Histogram bin for index distribution."""
    range: str
    min_value: float
    max_value: float
    count: int
    percentage: float


class IndexDistributionResponse(BaseModel):
    """Distribution response for an index."""
    farm_id: str
    index_type: IndexType
    analysis_date: date
    statistics: IndexStatistics
    histogram: List[IndexDistributionBin]


# ============ Alert Schemas ============

class AlertType(str, Enum):
    """Alert types."""
    LOW_NDVI = "low_ndvi"
    WATER_STRESS = "water_stress"
    NUTRIENT_DEFICIENCY = "nutrient_deficiency"
    ANOMALY = "anomaly"


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AlertResponse(BaseModel):
    """Alert response schema."""
    id: str
    farm_id: str
    farm_name: str
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    index_value: Optional[float] = None
    threshold: Optional[float] = None
    created_at: datetime
    acknowledged: bool = False
