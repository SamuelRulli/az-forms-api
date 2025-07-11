# AZ Forms API

API for managing forms and responses with file upload capabilities.

## Docker Compose Setup

This project includes a Docker Compose configuration for easy deployment and development.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Running the Application

1. Clone the repository:
   ```bash
   git clone https://github.com/SamuelRulli/az-forms-api.git
   cd az-forms-api
   ```

2. Start the services:
   ```bash
   docker-compose up -d
   ```

3. The API will be available at: http://localhost:4000

4. To stop the services:
   ```bash
   docker-compose down
   ```

### MongoDB Configuration

The Docker Compose setup provides two options for MongoDB:

1. **Local MongoDB** (default): 
   - A MongoDB container is included in the Docker Compose configuration
   - Data is persisted in a Docker volume
   - This is the default configuration in the docker-compose.yml file

2. **MongoDB Atlas**:
   - To use MongoDB Atlas instead of the local MongoDB:
     1. Open docker-compose.yml
     2. Comment out the line: `- VITE_MONGODB_URI=mongodb://mongodb:27017/formbuilder`
     3. Uncomment the line: `# - VITE_MONGODB_URI=${VITE_MONGODB_URI}`
     4. Make sure your .env file contains the correct MongoDB Atlas connection string

### Development Mode

For development with hot reloading:

1. Uncomment these lines in docker-compose.yml:
   ```yaml
   # - .:/app
   # - /app/node_modules
   ```

2. Modify the CMD in Dockerfile to use nodemon:
   ```dockerfile
   CMD ["npm", "run", "dev"]
   ```

## API Endpoints

- **Forms**
  - GET /api/forms - List all forms
  - GET /api/forms/:id - Get a specific form
  - POST /api/forms - Create a new form
  - PUT /api/forms/:id - Update a form

- **Responses**
  - GET /api/responses - List all form responses
  - POST /api/responses - Submit a form response

- **File Upload**
  - POST /api/upload - Upload a single file
  - POST /api/upload/multiple - Upload multiple files
  - GET /api/files - List all files
  - GET /api/files/:id - Get file metadata
  - GET /api/files/:id/download - Download a file
  - DELETE /api/files/:id - Delete a file
