import httpx
from fastapi import APIRouter, HTTPException
from app.config import settings

router = APIRouter()

RAILWAY_API = "https://backboard.railway.com/graphql/v2"

QUERY = """
query deployments($input: DeploymentListInput!) {
  deployments(input: $input, first: 10) {
    edges { node { id status createdAt meta environment { name } service { name } } }
  }
}
"""

EXCLUDED_STATUSES = {"REMOVED"}

def shape_deployment(node):
    meta = node.get("meta") or {}
    env = node.get("environment") or {}
    repo = meta.get("repo")
    commit = meta.get("commitHash")
    return {
        "id": node.get("id"),
        "status": node.get("status"), 
        "createdAt": node.get("createdAt"), 
        "commit": commit[:7] if commit else None, 
        "branch": meta.get("branch"), 
        "environment": env.get("name"), 
        "commitAuthor": meta.get("commitAuthor"),
        "url": f"https://github.com/{repo}/actions" if repo else None,
    }

@router.get("/api/status")
async def get_status():
    # 1. build headers (Bearer token from env) + variables (project/service IDs)
    headers = {
        "Authorization": f"Bearer {settings.railway_token}",
    }

    variables = {
        "input": {
            "projectId": settings.railway_project_id,
            "serviceId": settings.railway_service_id,
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

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Railway API error")
    
    payload = response.json()

    if "errors" in payload:
        raise HTTPException(status_code=502, detail="Railway GraphQL error")

    filtered_nodes = [edge["node"] for edge in payload["data"]["deployments"]["edges"] if edge["node"]["status"] not in EXCLUDED_STATUSES]

    if not filtered_nodes:
        return {"latest": None, "history":[]}
    
    sorted_nodes = sorted(filtered_nodes, key=lambda n: n["createdAt"], reverse=True)

    latest = sorted_nodes[0]
    history = sorted_nodes[1:]

    service_name = (latest.get("service") or {}).get("name")

    return {
        "serviceName": service_name,
        "latest": shape_deployment(latest),
        "history": [shape_deployment(n) for n in history],
    }
