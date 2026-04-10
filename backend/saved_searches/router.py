"""HTTP route handlers for saved searches endpoints."""

from fastapi import APIRouter, Depends, HTTPException

from auth.router import get_current_user
from jobs.schemas import JobListingResponse
from saved_searches.schemas import SavedSearchCreate, SavedSearchResponse
from saved_searches.service import (
    SavedSearchLimitError,
    SavedSearchNotFoundError,
    create_saved_search,
    delete_saved_search,
    get_saved_search_results,
    list_saved_searches,
)

router = APIRouter(prefix="/api/saved-searches", tags=["saved-searches"])

SEARCH_LIMIT_DETAIL = "Maximum 10 saved searches per user."
SEARCH_NOT_FOUND_DETAIL = "Saved search not found."


@router.post("", status_code=201)
async def create_saved_search_endpoint(
    body: SavedSearchCreate,
    user: dict = Depends(get_current_user),
) -> dict:
    """Create a saved search. Returns 409 if the 10-search limit is reached."""
    try:
        doc = await create_saved_search(str(user["_id"]), body)
    except SavedSearchLimitError:
        raise HTTPException(status_code=409, detail=SEARCH_LIMIT_DETAIL)
    return {"data": SavedSearchResponse.from_doc(doc).model_dump()}


@router.get("")
async def list_saved_searches_endpoint(
    user: dict = Depends(get_current_user),
) -> dict:
    """List all saved searches for the current user."""
    docs = await list_saved_searches(str(user["_id"]))
    return {"data": [SavedSearchResponse.from_doc(d).model_dump() for d in docs]}


@router.delete("/{search_id}", status_code=204)
async def delete_saved_search_endpoint(
    search_id: str,
    user: dict = Depends(get_current_user),
) -> None:
    """Delete a saved search by id."""
    try:
        await delete_saved_search(str(user["_id"]), search_id)
    except SavedSearchNotFoundError:
        raise HTTPException(status_code=404, detail=SEARCH_NOT_FOUND_DETAIL)


@router.get("/{search_id}/results")
async def get_saved_search_results_endpoint(
    search_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Run the saved search against job_listings and return paginated results."""
    try:
        _, docs, total = await get_saved_search_results(str(user["_id"]), search_id)
    except SavedSearchNotFoundError:
        raise HTTPException(status_code=404, detail=SEARCH_NOT_FOUND_DETAIL)
    return {
        "data": [JobListingResponse.from_doc(d).model_dump() for d in docs],
        "meta": {"total": total},
    }
