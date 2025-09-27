# Curricula Viewer

A web application for uploading, analyzing, and visualizing curriculum data in TTL (Turtle) format. The application provides a comprehensive analysis of semantic data including class instances, relationships, and detailed tabular views.

## Architecture

The application consists of two main components:
- **Backend**: Flask-based API server for data processing and analysis
- **Frontend**: Angular-based web interface for user interaction

## Quick Start with Docker

The easiest way to run the entire system is using Docker Compose:

```bash
# Start all services in the background
docker-compose up -d

# View logs (optional)
docker-compose logs -f

# Stop all services
docker-compose down
```

This will start:
- **Frontend** on `http://localhost:4200`
- **Backend** on `http://localhost:5000`
- **Virtuoso** on `http://localhost:8890`

Once all containers are running, open your browser to `http://localhost:4200` to use the application.

### Docker Services

- `frontend`: Angular application served via nginx
- `backend`: Flask API server
- `virtuoso`: RDF triple store database

## Development Mode (Debug)

For development and debugging purposes, you can run the services individually outside of Docker.

### Prerequisites

- Python 3.9+
- Node.js 18+
- uv (Python package manager)
- npm (Node package manager)
- Virtuoso Universal Server (for RDF data storage)

### 1. Backend Setup (Development)

Navigate to the backend directory and start the Flask server:

```bash
cd backend
FLASK_ENV=development uv run python app.py
```

The backend will start on `http://localhost:5000` and provides:
- File upload endpoints
- Job status tracking
- Data analysis and processing
- SPARQL query integration

**Backend Features:**
- Asynchronous TTL file processing with progress tracking
- Batch upload to Virtuoso triple store
- Automatic semantic data analysis
- Class instance detection and labeling
- RESTful API endpoints

### 2. Frontend Setup (Development)

Navigate to the frontend directory and start the Angular development server:

```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:4200` and provides:
- File upload interface with federal state selection
- Real-time progress tracking
- Interactive results visualization
- Tabular data views with clickable URIs

**Frontend Features:**
- Single-page application with seamless navigation
- Progress monitoring with batch tracking
- Multi-tab results display
- Responsive Material Design interface

### 3. Using the Application

1. **Access the Application**: Open your browser to `http://localhost:4200`

2. **Upload TTL File**:
   - Select a federal state from the dropdown
   - Choose a TTL (Turtle) file to upload
   - Click "TTL Datei hochladen" to start processing

3. **Monitor Progress**:
   - View real-time upload progress
   - Track batch processing status
   - See triple count and processing statistics

4. **Explore Results**:
   - **Summary Tab**: Overall statistics and class analysis
   - **Class Tabs**: Detailed tables for each detected class
   - **Interactive Elements**: Click URIs to explore linked data
   - **SPARQL Access**: Direct links to query endpoints

## API Endpoints

### Backend API (`http://localhost:5000`)

- `GET /health` - Health check endpoint
- `POST /upload_file` - Upload and process TTL files
- `GET /upload/status/<job_id>` - Get job processing status
- `GET /upload/jobs` - List all jobs (debugging)

### Example API Usage

```bash
# Check backend health
curl http://localhost:5000/health

# Upload a file
curl -X POST \
  -F "file=@curriculum.ttl" \
  -F "federalState=nordrheinWestfalen" \
  http://localhost:5000/upload_file

# Check job status
curl http://localhost:5000/upload/status/<job_id>
```

## Development

### Backend Development

The backend uses:
- **Flask** for the web framework
- **RDFLib** for TTL parsing and RDF processing
- **Threading** for asynchronous job processing
- **Virtuoso** integration for triple store operations

Key files:
- `app.py` - Main Flask application
- `virtuoso.py` - Virtuoso integration functions
- `references/class_definitions.json` - Class metadata

### Frontend Development

The frontend uses:
- **Angular** with TypeScript
- **Angular Material** for UI components
- **RxJS** for reactive programming
- **SCSS** for styling

Key components:
- `app.component.ts` - Main application controller
- `document-uploader.component.ts` - File upload interface
- `upload-progress.component.ts` - Progress tracking
- `results.component.ts` - Results visualization

### Building for Production

#### Using Docker
```bash
# Build and run production containers
docker-compose -f docker-compose.prod.yml up -d
```

#### Manual Build
**Backend:**
```bash
cd backend
# Install dependencies and run with production settings
uv pip install -r requirements.txt
python app.py
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the built files with a web server
```

## Troubleshooting

### Common Issues

1. **Port 5000 already in use**:
   ```bash
   # Kill existing processes or stop Docker containers
   pkill -f "python app.py"
   # OR
   docker-compose down
   ```

2. **Port 4200 already in use**:
   ```bash
   # Stop Docker containers or kill local dev server
   docker-compose down
   # OR check for running ng serve processes
   ```

3. **Frontend compilation errors** (Development mode):
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Backend module not found** (Development mode):
   ```bash
   cd backend
   uv pip install -r requirements.txt
   ```

4. **Virtuoso connection issues**:
   - Ensure Virtuoso server is running on port 8890
   - Check SPARQL endpoint accessibility

### Logs and Debugging

- Backend logs appear in the terminal running the Flask server
- Frontend logs are available in browser developer tools
- Job processing includes detailed console output
- Use `GET /upload/jobs` endpoint to debug job states

## Features

### Data Processing
- **TTL File Support**: Parse and validate Turtle format files
- **Batch Processing**: Handle large files with progress tracking
- **Class Detection**: Automatically identify and categorize RDF classes
- **Label Resolution**: Extract rdfs:label properties for human-readable names
- **Instance Counting**: Calculate statistics for each class type

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Live progress tracking during processing
- **Interactive Tables**: Sortable columns with clickable URIs
- **Multi-tab Layout**: Organized results presentation
- **Error Handling**: User-friendly error messages and recovery

### Integration
- **SPARQL Queries**: Direct links to query uploaded data
- **Virtuoso Storage**: Persistent RDF triple storage
- **REST API**: Clean separation between frontend and backend
- **Cross-platform**: Runs on Linux, macOS, and Windows

## License

[Add your license information here]

## Contributing

[Add contribution guidelines here]