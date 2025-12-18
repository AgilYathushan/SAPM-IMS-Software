# Frontend - Local Development Setup

## Prerequisites

- Node.js 18+ installed
- npm or yarn installed
- Backend services running via Docker (see main README)

## Installation

1. Install dependencies:
```bash
npm install
```

## Running Locally

1. **Start backend services** (in project root):
```bash
docker-compose up -d
```

2. **Start frontend** (in frontend directory):
```bash
npm start
```

The frontend will start on `http://localhost:3000`

## Configuration

### API URL
The frontend is configured to connect directly to backend services. Each service runs on its own port (5001-5008).

You can configure the API base URL by:
- Setting `REACT_APP_API_URL` environment variable
- Creating a `.env` file with `REACT_APP_API_URL=http://localhost:5001/api` (for auth-service)

**Note**: The frontend may need to be updated to handle multiple service endpoints or use a service discovery pattern.

### JWT Authentication
- Tokens are stored in `localStorage` as `token`
- Axios interceptors automatically add `Authorization: Bearer <token>` header to all requests
- No additional configuration needed

## Development

- Hot reload is enabled
- Changes will automatically refresh the browser
- API calls go directly to backend services

## Troubleshooting

### Cannot connect to API
- Ensure backend services are running: `docker-compose ps`
- Check individual service health endpoints: `http://localhost:5001/health`
- Verify API URL in `.env` file

### CORS Issues
- Each service handles CORS independently
- Ensure services allow requests from `http://localhost:3000`

### JWT Token Issues
- Check browser console for authentication errors
- Verify token is stored in localStorage: `localStorage.getItem('token')`
- Clear localStorage and login again if token is expired
