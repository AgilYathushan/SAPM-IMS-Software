# PowerShell script to set MinIO bucket to public access
# This script uses docker exec to run MinIO client commands

Write-Host "Setting MinIO bucket 'images' to public access..." -ForegroundColor Green

# Check if MinIO container is running
$minioContainer = docker ps --filter "name=ims-minio" --format "{{.Names}}"
if (-not $minioContainer) {
    Write-Host "Error: MinIO container (ims-minio) is not running!" -ForegroundColor Red
    Write-Host "Please start MinIO first: docker-compose up -d minio" -ForegroundColor Yellow
    exit 1
}

Write-Host "MinIO container found: $minioContainer" -ForegroundColor Cyan

# Method 1: Using MinIO Python client (via medical-image-service)
Write-Host "`nAttempting to set bucket policy via Python client..." -ForegroundColor Yellow

# Create a temporary Python script to set the policy
$pythonScript = @"
from minio import Minio
import json

client = Minio(
    'minio:9000',
    access_key='minioadmin',
    secret_key='minioadmin',
    secure=False
)

bucket_name = 'images'

# Public read policy
public_policy = {
    'Version': '2012-10-17',
    'Statement': [
        {
            'Effect': 'Allow',
            'Principal': {'AWS': ['*']},
            'Action': ['s3:GetObject'],
            'Resource': [f'arn:aws:s3:::{bucket_name}/*']
        }
    ]
}

try:
    client.set_bucket_policy(bucket_name, json.dumps(public_policy))
    print(f'Successfully set bucket {bucket_name} to public read access')
except Exception as e:
    print(f'Error setting policy: {e}')
"@

# Try to run via medical-image-service container
$imageServiceContainer = docker ps --filter "name=ims-medical-image-service" --format "{{.Names}}"
if ($imageServiceContainer) {
    Write-Host "Using medical-image-service container..." -ForegroundColor Cyan
    $pythonScript | docker exec -i ims-medical-image-service python -c "import sys; exec(sys.stdin.read())"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nSuccess! Bucket 'images' is now public." -ForegroundColor Green
        Write-Host "You can now access images at: http://localhost:9000/images/<filename>" -ForegroundColor Cyan
        exit 0
    }
}

# Method 2: Manual instructions
Write-Host "`nIf the above didn't work, you can set it manually:" -ForegroundColor Yellow
Write-Host "1. Open MinIO Console: http://localhost:9001" -ForegroundColor Cyan
Write-Host "2. Login with:" -ForegroundColor Cyan
Write-Host "   Username: minioadmin" -ForegroundColor White
Write-Host "   Password: minioadmin" -ForegroundColor White
Write-Host "3. Go to Buckets -> images -> Access Policy" -ForegroundColor Cyan
Write-Host "4. Select 'Public' or 'Custom' and set GetObject to Allow for all (*)" -ForegroundColor Cyan
Write-Host "`nOr use the MinIO API:" -ForegroundColor Yellow
Write-Host "docker exec ims-minio mc anonymous set public /data/images" -ForegroundColor White

