from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/api/v1/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
