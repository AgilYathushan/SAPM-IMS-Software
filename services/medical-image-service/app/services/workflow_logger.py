# Workflow Logger Helper
# Makes async HTTP calls to workflow service to log actions

import httpx
from app.core.config import settings

def log_workflow_action_async(user_id: str, action: str, entity_type: str = None, relevant_id: str = None):
    # Log workflow action asynchronously via HTTP call to workflow service
    # This should be called via BackgroundTasks
    # entity_type: "USER", "PATIENT", "REPORT", "BILL", "MEDICAL_TEST", "IMAGE", "NONE"
    api_gateway_url = settings.API_GATEWAY_URL
    
    try:
        # Make async HTTP call
        with httpx.Client(timeout=5.0) as client:
            data = {
                "user_id": user_id,  # Include user_id for internal service calls
                "action": action,
                "entity_type": entity_type,
                "relevant_id": relevant_id
            }
            # Note: This would need auth token in production
            # For now, workflow service should accept internal calls
            response = client.post(
                f"{api_gateway_url}/api/v1/workflow/logs",
                json=data,
                headers={"Content-Type": "application/json"}
            )
            if response.status_code not in [200, 201]:
                print(f"Workflow logging failed: {response.status_code}: {response.text}")
    except Exception as e:
        # Log error but don't fail the main operation
        print(f"Error logging workflow action: {e}")

