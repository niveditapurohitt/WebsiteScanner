from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from database import get_scans_collection
from routers.auth import get_current_user

router = APIRouter(prefix="/scans", tags=["scans"])


def _history_item(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "url": doc["url"],
        "timestamp": doc["createdAt"],
        "score": doc["score"],
        "risk_level": doc["risk_level"],
    }


@router.get("")
async def list_scans(current_user: dict = Depends(get_current_user)):
    cursor = get_scans_collection().find({"userId": current_user["_id"]}).sort("createdAt", -1)
    return [_history_item(doc) async for doc in cursor]


@router.get("/{scan_id}")
async def get_scan(scan_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(scan_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Scan not found")

    doc = await get_scans_collection().find_one({"_id": oid, "userId": current_user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Scan not found")

    result = dict(doc["result"])
    result["id"] = str(doc["_id"])
    result["timestamp"] = doc["createdAt"]
    return result


@router.delete("/{scan_id}")
async def delete_scan(scan_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(scan_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Scan not found")

    result = await get_scans_collection().delete_one({"_id": oid, "userId": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {"success": True}


@router.delete("")
async def clear_scans(current_user: dict = Depends(get_current_user)):
    await get_scans_collection().delete_many({"userId": current_user["_id"]})
    return {"success": True}
