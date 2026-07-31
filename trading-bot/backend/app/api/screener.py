
from fastapi import APIRouter
from ..signals.screener import OpportunityScreener

router = APIRouter()
screener = OpportunityScreener()

@router.get("/top-opportunities")
async def get_top_opportunities():
    return await screener.screen()
