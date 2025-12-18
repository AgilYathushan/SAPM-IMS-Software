import httpx  # HTTP client for making API calls
from app.core.config import settings  # Application configuration

def log_workflow_action_async(user_id: str, action: str, entity_type: str = None, relevant_id: str = None):
    api_gateway_url = settings.API_GATEWAY_URL
    
    try:
        with httpx.Client(timeout=5.0) as client:
            data = {
                "user_id": user_id,
                "action": action,
                "entity_type": entity_type,
                "relevant_id": relevant_id
            }
            response = client.post(  # POST request to workflow service API
                f"{api_gateway_url}/api/v1/workflow/logs",
                json=data,
                headers={"Content-Type": "application/json"}
            )
            if response.status_code not in [200, 201]:
                print(f"Workflow logging failed: {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Error logging workflow action: {e}")
