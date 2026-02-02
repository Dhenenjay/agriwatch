"""Farms API router for CRUD operations."""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
import uuid

from models.schemas import (
    FarmCreate, FarmUpdate, FarmResponse, GeoJSONPolygon
)

router = APIRouter()

# In-memory storage for demo (replace with Supabase in production)
farms_db: dict = {}


def calculate_area(geometry: GeoJSONPolygon) -> float:
    """Calculate approximate area in square meters from polygon coordinates."""
    from shapely.geometry import shape
    import pyproj
    from shapely.ops import transform
    
    try:
        # Create shapely polygon
        geom = shape(geometry.model_dump())
        
        # Project to UTM for accurate area calculation
        # Using a simple approximation for India (UTM zone 43N)
        project = pyproj.Transformer.from_crs(
            "EPSG:4326",
            "EPSG:32643",
            always_xy=True,
        ).transform
        
        projected = transform(project, geom)
        return projected.area
    except Exception:
        # Fallback: rough estimate
        return 10000  # Default 1 hectare


@router.post("/", response_model=FarmResponse)
async def create_farm(farm: FarmCreate):
    """Create a new farm."""
    farm_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    area = calculate_area(farm.geometry)
    
    farm_data = FarmResponse(
        id=farm_id,
        name=farm.name,
        farmer_name=farm.farmer_name,
        farmer_phone=farm.farmer_phone,
        location=farm.location,
        district=farm.district,
        state=farm.state,
        crop_type=farm.crop_type,
        sowing_date=farm.sowing_date,
        expected_harvest=farm.expected_harvest,
        geometry=farm.geometry,
        area_sqm=area,
        created_at=now,
        updated_at=now,
    )
    
    farms_db[farm_id] = farm_data
    return farm_data


@router.get("/", response_model=List[FarmResponse])
async def list_farms(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
):
    """List all farms with optional search."""
    farms = list(farms_db.values())
    
    if search:
        search_lower = search.lower()
        farms = [
            f for f in farms
            if search_lower in f.name.lower()
            or (f.farmer_name and search_lower in f.farmer_name.lower())
            or (f.location and search_lower in f.location.lower())
        ]
    
    return farms[skip:skip + limit]


@router.get("/{farm_id}", response_model=FarmResponse)
async def get_farm(farm_id: str):
    """Get a specific farm by ID."""
    if farm_id not in farms_db:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farms_db[farm_id]


@router.put("/{farm_id}", response_model=FarmResponse)
async def update_farm(farm_id: str, farm_update: FarmUpdate):
    """Update a farm."""
    if farm_id not in farms_db:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    farm = farms_db[farm_id]
    update_data = farm_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(farm, field, value)
    
    farm.updated_at = datetime.utcnow()
    farms_db[farm_id] = farm
    
    return farm


@router.delete("/{farm_id}")
async def delete_farm(farm_id: str):
    """Delete a farm."""
    if farm_id not in farms_db:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    del farms_db[farm_id]
    return {"message": "Farm deleted successfully"}


# Initialize with sample farms for demo
def _init_sample_farms():
    """Initialize sample farms for demonstration."""
    sample_farms = [
        {
            "name": "Sharma Farm - Block A",
            "farmer_name": "Rajesh Sharma",
            "farmer_phone": "+91 98765 43210",
            "location": "Hoshiarpur, Punjab",
            "district": "Hoshiarpur",
            "state": "Punjab",
            "crop_type": "Wheat",
            "sowing_date": "2024-11-15",
            "expected_harvest": "2025-04-15",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[75.5, 31.3], [75.55, 31.3], [75.55, 31.35], [75.5, 31.35], [75.5, 31.3]]]
            },
            "ndvi": 0.72,
        },
        {
            "name": "Patel Wheat Fields",
            "farmer_name": "Amit Patel",
            "farmer_phone": "+91 98111 22333",
            "location": "Amritsar, Punjab",
            "district": "Amritsar",
            "state": "Punjab",
            "crop_type": "Wheat",
            "sowing_date": "2024-11-20",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[74.8, 31.6], [74.85, 31.6], [74.85, 31.65], [74.8, 31.65], [74.8, 31.6]]]
            },
            "ndvi": 0.45,
        },
        {
            "name": "Singh Potato Farm",
            "farmer_name": "Gurpreet Singh",
            "farmer_phone": "+91 99888 77666",
            "location": "Jalandhar, Punjab",
            "district": "Jalandhar",
            "state": "Punjab",
            "crop_type": "Potato",
            "sowing_date": "2024-10-01",
            "expected_harvest": "2025-02-28",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[75.55, 31.32], [75.58, 31.32], [75.58, 31.36], [75.55, 31.36], [75.55, 31.32]]]
            },
            "ndvi": 0.58,
        },
        {
            "name": "Kumar Rice Paddy",
            "farmer_name": "Vikram Kumar",
            "farmer_phone": "+91 97777 88999",
            "location": "Ludhiana, Punjab",
            "district": "Ludhiana",
            "state": "Punjab",
            "crop_type": "Rice",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[75.8, 30.9], [75.88, 30.9], [75.88, 30.98], [75.8, 30.98], [75.8, 30.9]]]
            },
            "ndvi": 0.28,
        },
        {
            "name": "Verma Mustard Fields",
            "farmer_name": "Sunita Verma",
            "farmer_phone": "+91 94444 55666",
            "location": "Bathinda, Punjab",
            "district": "Bathinda",
            "state": "Punjab",
            "crop_type": "Mustard",
            "sowing_date": "2024-10-15",
            "expected_harvest": "2025-03-15",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[74.95, 30.2], [75.02, 30.2], [75.02, 30.27], [74.95, 30.27], [74.95, 30.2]]]
            },
            "ndvi": 0.68,
        },
        {
            "name": "Reddy Cotton Farm",
            "farmer_name": "Krishna Reddy",
            "farmer_phone": "+91 91111 22333",
            "location": "Nagpur, Maharashtra",
            "district": "Nagpur",
            "state": "Maharashtra",
            "crop_type": "Cotton",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[79.05, 21.12], [79.12, 21.12], [79.12, 21.18], [79.05, 21.18], [79.05, 21.12]]]
            },
            "ndvi": 0.35,
        },
    ]
    
    for farm_data in sample_farms:
        ndvi = farm_data.pop("ndvi", 0.5)
        farm_create = FarmCreate(**farm_data)
        farm_id = str(uuid.uuid4())
        now = datetime.utcnow()
        area = calculate_area(farm_create.geometry)
        
        farms_db[farm_id] = FarmResponse(
            id=farm_id,
            **farm_data,
            area_sqm=area,
            created_at=now,
            updated_at=now,
            latest_ndvi=ndvi,
            last_analysis_date=now,
        )


_init_sample_farms()
