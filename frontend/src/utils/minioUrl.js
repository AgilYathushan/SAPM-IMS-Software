/**
 * Utility functions for MinIO URL handling
 * Converts internal Docker MinIO URLs to frontend-accessible URLs
 */

/**
 * Convert MinIO URL from internal Docker hostname to localhost for frontend access
 * @param {string} url - MinIO URL (e.g., http://minio:9000/images/2.png)
 * @returns {string} - Frontend-accessible URL (e.g., http://localhost:9000/images/2.png)
 */
export const convertMinioUrlForFrontend = (url) => {
  if (!url) return url;
  
  // Replace internal Docker hostname with localhost
  if (url.includes('minio:9000')) {
    return url.replace('minio:9000', 'localhost:9000');
  }
  
  // If it's already localhost or external URL, return as is
  return url;
};

/**
 * Check if a URL is a MinIO URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export const isMinioUrl = (url) => {
  if (!url) return false;
  return url.includes('minio') || url.includes('localhost:9000') || url.includes('127.0.0.1:9000');
};

