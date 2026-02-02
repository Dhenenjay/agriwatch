"""Indices API router for vegetation index data retrieval."""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import date, datetime

from models.schemas import (
    IndexTimeSeriesResponse, IndexDataPoint,
    IndexDistributionResponse, IndexDistributionBin,
    IndexStatistics, IndexType
)
from routers.farms import farms_db

router = APIRouter()


@router.get("/time-series/{farm_id}", response_model=IndexTimeSeriesResponse)
async def get_index_time_series(
    farm_id: str,
    start_date: date = Query(..., description="Start date for time series"),
    end_date: date = Query(..., description="End date for time series"),
    indices: Optional[List[IndexType]] = Query(
        default=[IndexType.NDVI],
        description="Indices to include"
    ),
):
    """Get time series of vegetation indices for a farm."""
    if farm_id not in farms_db:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    farm = farms_db[farm_id]
    
    # Try to get real data from GEE
    try:
        from services.gee_agri import geometry_to_ee, get_time_series
        
        ee_geometry = geometry_to_ee(farm.geometry.model_dump())
        
        data = get_time_series(
            aoi=ee_geometry,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
        )
        
        data_points = [
            IndexDataPoint(
                date=datetime.strptime(d['date'], '%Y-%m-%d').date(),
                ndvi=d.get('ndvi'),
                ndre=d.get('ndre'),
                lswi=d.get('lswi'),
                savi=d.get('savi'),
                cloud_cover=d.get('cloud_cover'),
            )
            for d in data
        ]
        
    except Exception:
        # Return mock data for demo
        from datetime import timedelta
        import random
        
        data_points = []
        current = start_date
        base_ndvi = 0.3
        
        while current <= end_date:
            # Simulate growth pattern
            days_from_start = (current - start_date).days
            growth_factor = min(1.0, days_from_start / 60)  # 60-day growth cycle
            
            ndvi = base_ndvi + (0.5 * growth_factor) + random.uniform(-0.05, 0.05)
            ndre = ndvi * 0.7 + random.uniform(-0.03, 0.03)
            lswi = 0.2 + random.uniform(-0.1, 0.15)
            savi = ndvi * 0.95 + random.uniform(-0.02, 0.02)
            
            data_points.append(IndexDataPoint(
                date=current,
                ndvi=round(max(0, min(1, ndvi)), 3),
                ndre=round(max(0, min(1, ndre)), 3),
                lswi=round(max(-0.5, min(0.5, lswi)), 3),
                savi=round(max(0, min(1, savi)), 3),
                cloud_cover=random.uniform(0, 15),
            ))
            
            current += timedelta(days=5)  # Sentinel-2 revisit
    
    return IndexTimeSeriesResponse(
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
        data=data_points,
    )


@router.get("/distribution/{farm_id}", response_model=IndexDistributionResponse)
async def get_index_distribution(
    farm_id: str,
    index_type: IndexType = Query(IndexType.NDVI, description="Index type"),
    analysis_date: Optional[date] = Query(None, description="Date of analysis"),
):
    """Get spatial distribution of an index across a farm."""
    if farm_id not in farms_db:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    farm = farms_db[farm_id]
    
    if analysis_date is None:
        analysis_date = date.today()
    
    # Try real GEE data
    try:
        from services.gee_agri import geometry_to_ee, calculate_index_histogram, calculate_index_statistics
        from datetime import timedelta
        
        ee_geometry = geometry_to_ee(farm.geometry.model_dump())
        
        start_date = (analysis_date - timedelta(days=10)).isoformat()
        end_date = analysis_date.isoformat()
        
        histogram = calculate_index_histogram(
            aoi=ee_geometry,
            index=index_type.value,
            start_date=start_date,
            end_date=end_date,
        )
        
        stats_data = calculate_index_statistics(
            aoi=ee_geometry,
            start_date=start_date,
            end_date=end_date,
        )
        
        index_stats = stats_data.get(index_type.value, {})
        
        statistics = IndexStatistics(
            min=index_stats.get('min', 0),
            max=index_stats.get('max', 1),
            mean=index_stats.get('mean', 0.5),
            std=index_stats.get('std', 0.1),
        )
        
        bins = [
            IndexDistributionBin(
                range=h['range'],
                min_value=h['min_value'],
                max_value=h['max_value'],
                count=h['count'],
                percentage=h['percentage'],
            )
            for h in histogram
        ]
        
    except Exception:
        # Mock distribution data
        import random
        
        # Generate realistic distribution (beta distribution shape)
        mean = 0.6 if index_type == IndexType.NDVI else 0.4
        std = 0.15
        
        statistics = IndexStatistics(
            min=max(0, mean - 3 * std),
            max=min(1, mean + 2 * std),
            mean=mean,
            std=std,
        )
        
        # Generate histogram bins
        total = 2500
        bins = []
        ranges = [
            (0, 0.1), (0.1, 0.2), (0.2, 0.3), (0.3, 0.4), (0.4, 0.5),
            (0.5, 0.6), (0.6, 0.7), (0.7, 0.8), (0.8, 0.9), (0.9, 1.0)
        ]
        
        # Distribution weights (bell curve centered around mean)
        import math
        weights = []
        for min_v, max_v in ranges:
            mid = (min_v + max_v) / 2
            w = math.exp(-((mid - mean) ** 2) / (2 * std ** 2))
            weights.append(w)
        
        total_weight = sum(weights)
        
        for (min_v, max_v), weight in zip(ranges, weights):
            count = int(total * (weight / total_weight))
            pct = (count / total) * 100
            bins.append(IndexDistributionBin(
                range=f"{min_v:.1f}-{max_v:.1f}",
                min_value=min_v,
                max_value=max_v,
                count=count,
                percentage=round(pct, 1),
            ))
    
    return IndexDistributionResponse(
        farm_id=farm_id,
        index_type=index_type,
        analysis_date=analysis_date,
        statistics=statistics,
        histogram=bins,
    )


@router.get("/latest/{farm_id}")
async def get_latest_indices(farm_id: str):
    """Get the most recent index values for a farm."""
    if farm_id not in farms_db:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    farm = farms_db[farm_id]
    
    # Try real GEE data
    try:
        from services.gee_agri import geometry_to_ee, calculate_mean_indices
        from datetime import timedelta
        
        ee_geometry = geometry_to_ee(farm.geometry.model_dump())
        end_date = date.today().isoformat()
        start_date = (date.today() - timedelta(days=10)).isoformat()
        
        indices = calculate_mean_indices(
            aoi=ee_geometry,
            start_date=start_date,
            end_date=end_date,
        )
        
        return {
            "farm_id": farm_id,
            "farm_name": farm.name,
            "analysis_date": end_date,
            "indices": indices,
        }
        
    except Exception:
        # Mock data
        return {
            "farm_id": farm_id,
            "farm_name": farm.name,
            "analysis_date": date.today().isoformat(),
            "indices": {
                "ndvi": farm.latest_ndvi or 0.65,
                "ndre": 0.48,
                "lswi": 0.25,
                "savi": 0.62,
                "images_processed": 5,
            },
        }
