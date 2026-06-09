# just built a working API proxy from scratch. Token auth, async HTTP, the 200-but-errors GraphQL trap, response reshaping, edge-case handling. That's the whole backend slice

import os
import httpx
from fastapi import APIRouter, HTTPException
from app.config import settings

router = APIRouter()

RAILWAY_API = "https://backboard.railway.com/graphql/v2"

QUERY = """
query deployments($input: DeploymentListInput!) {
  deployments(input: $input, first: 10) {
    edges { node { id status createdAt } }
  }
}
"""

EXCLUDED_STATUSES = {"REMOVED"}


@router.get("/api/status")
async def get_status():
    # 1. build headers (Bearer token from env) + variables (project/service IDs)
    headers = {
        "Authorization": f"Bearer {settings.railway_token}",
    }

    variables = {
        "input": {
            "projectId": settings.railway_project_id,
            "serviceId": settings.railway_partida_service_id
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            RAILWAY_API,
            headers=headers,
            json = {
                "query": QUERY,
                "variables": variables,
            }
        )
    payload = response.json()

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Railway API error")

    if "errors" in payload:
        raise HTTPException(status_code=502, detail="Railway GraphQL error")

    filtered_nodes = [edge["node"] for edge in payload["data"]["deployments"]["edges"] if edge["node"]["status"] not in EXCLUDED_STATUSES]

    if not filtered_nodes:
        return {"latest": None, "history":[]}
    
    sorted_nodes = sorted(filtered_nodes, key=lambda n: n["createdAt"], reverse=True)

    latest = sorted_nodes[0]
    history = sorted_nodes[1:]

    return {
        "latest": latest,
        "history": history,
    }
