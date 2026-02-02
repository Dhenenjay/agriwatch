"""Analysis API router for running vegetation index calculations."""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Optional
from datetime import datetime
import uuid

from models.schemas import (
    AnalysisRequest, AnalysisJobResponse, AnalysisResultResponse,
    JobStatus, GeoJSONPolygon
)
from config import get_settings

settings = get_settings()
router = APIRouter()

# In-memory job storage (replace with Redis/Supabase in production)
jobs_db: Dict[str, dict] = {}


def run_analysis_task(job_id: str, request: AnalysisRequest):
    """Background task to run satellite analysis.
    
    In production, this would be a Celery task.
    """
    import time
    
    try:
        jobs_db[job_id]['status'] = JobStatus.PROCESSING
        jobs_db[job_id]['started_at'] = datetime.utcnow()
        jobs_db[job_id]['progress'] = 10
        jobs_db[job_id]['message'] = "Querying Sentinel-2 imagery..."
        
        # Try to use GEE if available
        try:
            from services.gee_agri import (
                geometry_to_ee, calculate_index_statistics,
                calculate_index_histogram
            )
            
            # Convert geometry
            ee_geometry = geometry_to_ee(request.geometry.model_dump())
            
            jobs_db[job_id]['progress'] = 30
            jobs_db[job_id]['message'] = "Calculating vegetation indices..."
            
            # Calculate statistics
            stats = calculate_index_statistics(
                aoi=ee_geometry,
                start_date=request.start_date.isoformat(),
                end_date=request.end_date.isoformat(),
                max_cloud_cover=request.max_cloud_cover,
                scale=request.scale,
            )
            
            jobs_db[job_id]['progress'] = 70
            jobs_db[job_id]['message'] = "Generating histograms..."
            
            # Calculate histogram for NDVI
            histogram = calculate_index_histogram(
                aoi=ee_geometry,
                index='ndvi',
                start_date=request.start_date.isoformat(),
                end_date=request.end_date.isoformat(),
                max_cloud_cover=request.max_cloud_cover,
                scale=request.scale,
            )
            
            jobs_db[job_id]['progress'] = 90
            jobs_db[job_id]['message'] = "Finalizing results..."
            
            # Store results
            jobs_db[job_id]['result'] = {
                'statistics': stats,
                'histogram': {'ndvi': histogram},
                'images_processed': stats.pop('images_processed', 0),
            }
            
        except ImportError:
            # GEE not available - use mock data
            time.sleep(2)  # Simulate processing
            
            jobs_db[job_id]['progress'] = 50
            jobs_db[job_id]['message'] = "Processing (demo mode)..."
            
            time.sleep(2)
            
            # Mock results
            jobs_db[job_id]['result'] = {
                'statistics': {
                    'ndvi': {'mean': 0.65, 'min': 0.2, 'max': 0.85, 'std': 0.15},
                    'ndre': {'mean': 0.45, 'min': 0.15, 'max': 0.65, 'std': 0.12},
                    'lswi': {'mean': 0.25, 'min': -0.1, 'max': 0.45, 'std': 0.18},
                    'savi': {'mean': 0.62, 'min': 0.18, 'max': 0.82, 'std': 0.14},
                },
                'histogram': {
                    'ndvi': [
                        {'range': '0.0-0.1', 'min_value': 0, 'max_value': 0.1, 'count': 50, 'percentage': 2},
                        {'range': '0.1-0.2', 'min_value': 0.1, 'max_value': 0.2, 'count': 100, 'percentage': 4},
                        {'range': '0.2-0.3', 'min_value': 0.2, 'max_value': 0.3, 'count': 150, 'percentage': 6},
                        {'range': '0.3-0.4', 'min_value': 0.3, 'max_value': 0.4, 'count': 200, 'percentage': 8},
                        {'range': '0.4-0.5', 'min_value': 0.4, 'max_value': 0.5, 'count': 300, 'percentage': 12},
                        {'range': '0.5-0.6', 'min_value': 0.5, 'max_value': 0.6, 'count': 450, 'percentage': 18},
                        {'range': '0.6-0.7', 'min_value': 0.6, 'max_value': 0.7, 'count': 600, 'percentage': 24},
                        {'range': '0.7-0.8', 'min_value': 0.7, 'max_value': 0.8, 'count': 500, 'percentage': 20},
                        {'range': '0.8-0.9', 'min_value': 0.8, 'max_value': 0.9, 'count': 125, 'percentage': 5},
                        {'range': '0.9-1.0', 'min_value': 0.9, 'max_value': 1.0, 'count': 25, 'percentage': 1},
                    ]
                },
                'images_processed': 12,
            }
        
        jobs_db[job_id]['status'] = JobStatus.COMPLETED
        jobs_db[job_id]['completed_at'] = datetime.utcnow()
        jobs_db[job_id]['progress'] = 100
        jobs_db[job_id]['message'] = "Analysis complete"
        
    except Exception as e:
        jobs_db[job_id]['status'] = JobStatus.FAILED
        jobs_db[job_id]['completed_at'] = datetime.utcnow()
        jobs_db[job_id]['message'] = f"Analysis failed: {str(e)}"


@router.post("/", response_model=AnalysisJobResponse)
async def create_analysis(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
):
    """Submit a new analysis job."""
    job_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    jobs_db[job_id] = {
        'job_id': job_id,
        'status': JobStatus.PENDING,
        'created_at': now,
        'started_at': None,
        'completed_at': None,
        'progress': 0,
        'message': 'Job queued',
        'farm_id': request.farm_id,
        'request': request,
        'result': None,
    }
    
    # Run analysis in background
    background_tasks.add_task(run_analysis_task, job_id, request)
    
    return AnalysisJobResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        created_at=now,
        progress=0,
        message="Job queued",
        farm_id=request.farm_id,
    )


@router.get("/{job_id}", response_model=AnalysisJobResponse)
async def get_job_status(job_id: str):
    """Get the status of an analysis job."""
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_db[job_id]
    return AnalysisJobResponse(
        job_id=job['job_id'],
        status=job['status'],
        created_at=job['created_at'],
        started_at=job.get('started_at'),
        completed_at=job.get('completed_at'),
        progress=job.get('progress', 0),
        message=job.get('message'),
        farm_id=job.get('farm_id'),
    )


@router.get("/{job_id}/result", response_model=AnalysisResultResponse)
async def get_job_result(job_id: str):
    """Get the result of a completed analysis job."""
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_db[job_id]
    
    if job['status'] != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Job is not completed. Current status: {job['status']}"
        )
    
    result = job['result']
    request = job['request']
    
    # Extract mean values from statistics
    indices = {k: v['mean'] for k, v in result['statistics'].items()}
    
    return AnalysisResultResponse(
        job_id=job_id,
        status=job['status'],
        indices=indices,
        statistics=result['statistics'],
        histogram=result.get('histogram'),
        images_processed=result.get('images_processed', 0),
        date_range={
            'start': request.start_date.isoformat(),
            'end': request.end_date.isoformat(),
        },
        geometry=request.geometry,
    )


@router.delete("/{job_id}")
async def cancel_job(job_id: str):
    """Cancel an analysis job."""
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_db[job_id]
    
    if job['status'] in [JobStatus.COMPLETED, JobStatus.FAILED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel job with status: {job['status']}"
        )
    
    job['status'] = JobStatus.FAILED
    job['message'] = "Cancelled by user"
    job['completed_at'] = datetime.utcnow()
    
    return {"message": "Job cancelled"}
