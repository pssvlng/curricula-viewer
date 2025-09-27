from flask import Flask, request, jsonify
from flask_cors import CORS
from rdflib import Graph, RDF, RDFS
import os
import json
import uuid
import threading
import time
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Dict, Optional, List
from virtuoso import storeDataToGraph, storeDataToGraphInBatches

app = Flask(__name__)
CORS(app)

# Upload Job Management
@dataclass
class UploadJob:
    job_id: str
    filename: str
    federal_state: str
    timestamp: datetime
    status: str  # 'processing', 'failed', 'success'
    progress: float  # 0.0 to 100.0
    total_triples: int
    processed_triples: int
    current_batch: int
    total_batches: int
    error_message: Optional[str] = None
    result_data: Optional[Dict] = None

# In-memory job queue
upload_jobs: Dict[str, UploadJob] = {}
job_lock = threading.Lock()

# Load class definitions on startup
CLASS_DEFINITIONS = {}
URI_TO_CLASS = {}
class_definitions_file = 'references/class_definitions.json'
if os.path.exists(class_definitions_file):
    with open(class_definitions_file, 'r', encoding='utf-8') as f:
        CLASS_DEFINITIONS = json.load(f)
    
    # Create a URI-to-class mapping for faster lookups
    for class_id, class_info in CLASS_DEFINITIONS.items():
        uri = class_info.get('uri')
        if uri:
            URI_TO_CLASS[uri] = class_info
    
    print(f"Loaded {len(CLASS_DEFINITIONS)} class definitions")
    print(f"Created URI mapping for {len(URI_TO_CLASS)} classes")
else:
    print("Warning: class_definitions.json not found")

# Job Management Functions
def create_upload_job(filename: str, federal_state: str, total_triples: int) -> str:
    """Create a new upload job and return the job ID"""
    job_id = str(uuid.uuid4())
    total_batches = (total_triples + 1999) // 2000  # Ceiling division for batch size 2000
    
    with job_lock:
        upload_jobs[job_id] = UploadJob(
            job_id=job_id,
            filename=filename,
            federal_state=federal_state,
            timestamp=datetime.now(),
            status='processing',
            progress=0.0,
            total_triples=total_triples,
            processed_triples=0,
            current_batch=0,
            total_batches=total_batches
        )
    
    return job_id

def update_job_progress(job_id: str, current_batch: int, processed_triples: int):
    """Update job progress"""
    with job_lock:
        if job_id in upload_jobs:
            job = upload_jobs[job_id]
            job.current_batch = current_batch
            job.processed_triples = processed_triples
            job.progress = (processed_triples / job.total_triples) * 100.0

def complete_job(job_id: str, result_data: Dict):
    """Mark job as completed with result data"""
    with job_lock:
        if job_id in upload_jobs:
            job = upload_jobs[job_id]
            job.status = 'success'
            job.progress = 100.0
            job.result_data = result_data

def fail_job(job_id: str, error_message: str):
    """Mark job as failed with error message"""
    with job_lock:
        if job_id in upload_jobs:
            job = upload_jobs[job_id]
            job.status = 'failed'
            job.error_message = error_message

def get_job(job_id: str) -> Optional[UploadJob]:
    """Get job by ID"""
    with job_lock:
        return upload_jobs.get(job_id)

# Virtuoso configuration
VIRTUOSO_URL = os.getenv('VIRTUOSO_URL', 'http://localhost:8890')
SPARQL_ENDPOINT = f"{VIRTUOSO_URL}/sparql"

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"})

@app.route('/upload/status/<job_id>', methods=['GET'])
def get_upload_status(job_id):
    """Get upload job status and progress"""
    job = get_job(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    
    job_data = asdict(job)
    # Convert datetime to string for JSON serialization
    job_data['timestamp'] = job.timestamp.isoformat()
    
    return jsonify(job_data)

@app.route('/upload/jobs', methods=['GET'])
def get_all_jobs():
    """Get all upload jobs (for debugging)"""
    with job_lock:
        jobs_data = []
        for job in upload_jobs.values():
            job_data = asdict(job)
            job_data['timestamp'] = job.timestamp.isoformat()
            jobs_data.append(job_data)
    
    return jsonify(jobs_data)

def process_upload_async(job_id: str, graph: Graph, federal_state: str):
    """Process upload in background with progress updates"""
    try:
        job = get_job(job_id)
        if not job:
            return
        
        # Create graph URI
        graph_uri = f"http://localhost:8080/graph/{federal_state}"
        sparql_endpoint = "http://localhost:8890/sparql"
        
        # Progress callback function
        def progress_callback(batch_num, processed_triples, total_triples):
            update_job_progress(job_id, batch_num, processed_triples)
        
        print(f"Starting batch upload for job {job_id}")
        
        # Upload data with progress tracking
        success = storeDataToGraphInBatches(
            graph_uri, 
            graph, 
            batch_size=2000, 
            progress_callback=progress_callback
        )
        
        if not success:
            fail_job(job_id, "Failed to upload data to Virtuoso")
            return
        
        print(f"Upload completed for job {job_id}, analyzing data...")
        
        # Analyze the uploaded data
        result_data = analyze_uploaded_data(graph, federal_state, graph_uri, sparql_endpoint)
        
        # Mark job as completed
        complete_job(job_id, result_data)
        
        print(f"Job {job_id} completed successfully")
        
    except Exception as e:
        print(f"Error processing job {job_id}: {str(e)}")
        fail_job(job_id, str(e))

def analyze_uploaded_data(graph, federal_state, graph_name, sparql_endpoint):
    """Analyze the uploaded TTL data and create tabs for different classes"""
    tabs = []
    
    # Summary tab with upload results and analysis
    total_triples = len(graph)
    
    # Create structured upload info for better formatting in frontend
    upload_info = {
        'status': 'Erfolgreich',
        'message': 'TTL file uploaded and stored successfully',
        'federalState': federal_state,
        'graphId': federal_state,
        'graphName': graph_name,
        'triplesCount': total_triples,
        'sparqlEndpoint': sparql_endpoint
    }
    
    # Find all subjects that are instances of known classes
    class_instances = {}
    all_classes_found = set()
    
    print(f"Analyzing {total_triples} triples...")
    
    for subj, pred, obj in graph:
        if pred == RDF.type:
            class_uri = str(obj)
            all_classes_found.add(class_uri)
            
            if class_uri in URI_TO_CLASS:
                if class_uri not in class_instances:
                    class_instances[class_uri] = []
                class_instances[class_uri].append(str(subj))
    
    print(f"Found {len(all_classes_found)} total classes: {list(all_classes_found)[:5]}...")
    print(f"Found {len(class_instances)} known classes with instances")
    
    # Prepare structured analysis data
    class_analysis = []
    for class_uri, instances in class_instances.items():
        class_info = URI_TO_CLASS.get(class_uri, {})
        class_label = class_info.get('label_de', class_info.get('label_en', class_info.get('display_label', class_uri.split('/')[-1])))
        class_analysis.append({
            'label': class_label,
            'instanceCount': len(instances),
            'uri': class_uri
        })
    
    # Sort by instance count (descending)
    class_analysis.sort(key=lambda x: x['instanceCount'], reverse=True)
    
    # Create analysis summary for upload info
    upload_info['analysisResults'] = {
        'totalTriples': total_triples,
        'classDefinitionsLoaded': len(CLASS_DEFINITIONS),
        'foundClassesCount': len(class_instances),
        'classList': class_analysis
    }
    
    # Keep simple content for legacy support
    analysis_content = f"Analyse Ergebnisse\n"
    analysis_content += "=" * 50 + "\n"
    analysis_content += f"Gesamtanzahl Triples: {total_triples}\n"
    analysis_content += f"Anzahl geladener Klassendefinitionen: {len(CLASS_DEFINITIONS)}\n"
    analysis_content += f"Gefundene Klassen mit Instanzen: {len(class_instances)}\n"
    for class_info in class_analysis:
        analysis_content += f"- {class_info['label']}: {class_info['instanceCount']} Instanzen\n"
    
    tabs.append({
        'label': 'Summary',
        'content': analysis_content,
        'type': 'summary',  # Special type for summary with upload info
        'uploadInfo': upload_info
    })
    
    # Create tabs for each class with instances
    for class_uri, instances in class_instances.items():
        class_info = URI_TO_CLASS.get(class_uri, {})
        class_label = class_info.get('label_de', class_info.get('label_en', class_info.get('display_label', class_uri.split('/')[-1])))
        
        # Get labels for instances
        instance_data = []
        for instance_uri in instances:
            # Try to find a label for this instance
            instance_label = None
            for subj, pred, obj in graph:
                if str(subj) == instance_uri and pred == RDFS.label:
                    instance_label = str(obj)
                    break
            
            if not instance_label:
                instance_label = instance_uri.split('/')[-1] if '/' in instance_uri else instance_uri
            
            instance_data.append({
                'uri': instance_uri,
                'label': instance_label
            })
        
        tabs.append({
            'label': f'{class_label} ({len(instances)})',
            'content': '',
            'type': 'table',
            'data': instance_data
        })
    
    return tabs

@app.route('/upload_file', methods=['POST'])
def upload_file():
    """Upload TTL file and create processing job"""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        federal_state = request.form.get('federalState', '')
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not file.filename.lower().endswith('.ttl'):
            return jsonify({"error": "File must be a TTL file"}), 400
            
        if not federal_state:
            return jsonify({"error": "Federal state is required"}), 400
        
        # Read TTL file content
        ttl_content = file.read().decode('utf-8')
        
        # Parse TTL content with rdflib
        graph = Graph()
        graph.parse(data=ttl_content, format='turtle')
        
        total_triples = len(graph)
        print(f"Received file: {file.filename} with {total_triples} triples for state: {federal_state}")
        
        # Create upload job
        job_id = create_upload_job(file.filename, federal_state, total_triples)
        
        # Start background processing
        thread = threading.Thread(
            target=process_upload_async,
            args=(job_id, graph, federal_state),
            daemon=True
        )
        thread.start()
        
        return jsonify({
            "success": True,
            "message": "File upload started",
            "jobId": job_id,
            "filename": file.filename,
            "federalState": federal_state,
            "triplesCount": total_triples
        })
            
    except Exception as e:
        print(f"Error starting upload job: {e}")
        return jsonify({"error": f"Failed to start upload: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
