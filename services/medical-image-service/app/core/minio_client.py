from minio import Minio
from minio.error import S3Error
from app.core.config import settings
import json

def get_minio_client() -> Minio:
    """Create and return MinIO client instance"""
    client = Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE
    )
    
    # Ensure bucket exists and set to public
    try:
        if not client.bucket_exists(settings.MINIO_BUCKET_NAME):
            client.make_bucket(settings.MINIO_BUCKET_NAME)
        
        # Set bucket policy to public read
        public_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{settings.MINIO_BUCKET_NAME}/*"]
                }
            ]
        }
        
        try:
            client.set_bucket_policy(settings.MINIO_BUCKET_NAME, json.dumps(public_policy))
            print(f"Bucket '{settings.MINIO_BUCKET_NAME}' set to public read access")
        except S3Error as e:
            print(f"Warning: Could not set bucket policy (may already be set): {e}")
            
    except S3Error as e:
        print(f"Error creating bucket: {e}")
    
    return client

