#!/bin/bash
# Test script to verify all services are running independently

echo "Testing SOA Services..."
echo "======================"

SERVICES=(
    "auth-service:5001:/api/v1/auth"
    "user-service:5002:/api/v1/users"
    "patient-service:5003:/api/v1/patients"
    "medical-staff-service:5004:/api/v1/medical-staff"
    "medical-image-service:5005:/api/v1/medical-images"
    "diagnostic-report-service:5006:/api/v1/diagnostic-reports"
    "billing-service:5007:/api/v1/billing"
    "workflow-service:5008:/api/v1/workflow"
)

echo ""
echo "Testing direct service access:"
echo "----------------------------------------------"

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service_name port path <<< "$service_info"
    echo -n "Testing $service_name directly (port $port)... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/health" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo "✓ Service is healthy"
    else
        echo "✗ Service may not be running (HTTP $response)"
    fi
done

echo ""
echo "Test complete!"

