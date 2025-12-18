#!/bin/bash
# Bash script to set MinIO bucket to public access

echo "Setting MinIO bucket 'images' to public access..."

# Check if MinIO container is running
if ! docker ps --filter "name=ims-minio" --format "{{.Names}}" | grep -q ims-minio; then
    echo "Error: MinIO container (ims-minio) is not running!"
    echo "Please start MinIO first: docker-compose up -d minio"
    exit 1
fi

echo "MinIO container found"

# Try using MinIO client (mc) if available in container
if docker exec ims-minio which mc > /dev/null 2>&1; then
    echo "Using MinIO client (mc)..."
    docker exec ims-minio mc anonymous set public /data/images
    if [ $? -eq 0 ]; then
        echo "Success! Bucket 'images' is now public."
        echo "You can now access images at: http://localhost:9000/images/<filename>"
        exit 0
    fi
fi

# Alternative: Use Python client
echo "Attempting to set bucket policy via Python client..."

python_script=$(cat <<'EOF'
from minio import Minio
import json

client = Minio(
    'minio:9000',
    access_key='minioadmin',
    secret_key='minioadmin',
    secure=False
)

bucket_name = 'images'

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
EOF
)

# Try via medical-image-service container
if docker ps --filter "name=ims-medical-image-service" --format "{{.Names}}" | grep -q ims-medical-image-service; then
    echo "$python_script" | docker exec -i ims-medical-image-service python -c "import sys; exec(sys.stdin.read())"
    if [ $? -eq 0 ]; then
        echo "Success! Bucket 'images' is now public."
        exit 0
    fi
fi

echo ""
echo "If the above didn't work, you can set it manually:"
echo "1. Open MinIO Console: http://localhost:9001"
echo "2. Login with: minioadmin / minioadmin"
echo "3. Go to Buckets -> images -> Access Policy"
echo "4. Select 'Public' or set GetObject to Allow for all (*)"

