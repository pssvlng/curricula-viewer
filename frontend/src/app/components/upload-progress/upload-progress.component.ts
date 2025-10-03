import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { DocumentService, UploadJob } from '../../services/document.service';

@Component({
  selector: 'app-upload-progress',
  template: `
    <mat-card class="progress-card">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>cloud_upload</mat-icon>
          Upload Progress
        </mat-card-title>
        <mat-card-subtitle>{{ job?.filename }}</mat-card-subtitle>
      </mat-card-header>
      
      <mat-card-content>
        <div class="upload-info" *ngIf="job">
          <div class="info-row">
            <strong>Federal State:</strong>
            <span>{{ job?.federal_state }}</span>
          </div>
          
          <div class="info-row">
            <strong>Total Triples:</strong>
            <span>{{ job?.total_triples | number }}</span>
          </div>
          
          <div class="info-row">
            <strong>Status:</strong>
            <span [ngClass]="getStatusClass()">{{ getStatusText() }}</span>
          </div>
        </div>
        
        <!-- Phase 1: Upload Progress -->
        <div class="progress-section" *ngIf="job && !isAnalysisPhase()">
          <h4 class="phase-title">Phase 1: Uploading Data</h4>
          <div class="progress-info">
            <span class="progress-text">
              {{ job?.processed_triples | number }} / {{ job?.total_triples | number }} triples processed
            </span>
            <span class="progress-percentage">{{ job?.progress | number:'1.1-1' }}%</span>
          </div>
          
          <mat-progress-bar 
            mode="determinate" 
            [value]="job?.progress || 0"
            [class]="getProgressBarClass()">
          </mat-progress-bar>
          
          <div class="batch-info" *ngIf="job?.status === 'processing'">
            Batch {{ job?.current_batch }} of {{ job?.total_batches }}
          </div>
        </div>

        <!-- Phase 2: Analysis Progress -->
        <div class="progress-section" *ngIf="job && isAnalysisPhase()">
          <h4 class="phase-title">Phase 2: Analyzing Data</h4>
          <div class="progress-info">
            <span class="progress-text">{{ getAnalysisStatusText() }}</span>
            <span class="progress-percentage">{{ getAnalysisProgress() | number:'1.1-1' }}%</span>
          </div>
          
          <mat-progress-bar 
            mode="determinate" 
            [value]="getAnalysisProgress()"
            color="accent">
          </mat-progress-bar>
          
          <div class="analysis-status" *ngIf="job.analysisProgress">
            {{ job.analysisProgress.status }}
          </div>
        </div>
        
        <div class="error-message" *ngIf="job?.status === 'failed'">
          <mat-icon>error</mat-icon>
          <span>{{ job?.error_message || 'Upload failed' }}</span>
        </div>
        
        <div class="success-message" *ngIf="job?.status === 'success'">
          <mat-icon>check_circle</mat-icon>
          <span>Upload and analysis completed successfully!</span>
        </div>
      </mat-card-content>
      
      <mat-card-actions *ngIf="job?.status === 'failed'">
        <button mat-raised-button color="primary" (click)="goBack()">
          Try Again
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .progress-card {
      max-width: 600px;
      margin: 20px auto;
    }
    
    .mat-card-header {
      margin-bottom: 20px;
    }
    
    .mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .upload-info {
      margin-bottom: 20px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding: 4px 0;
    }
    
    .progress-section {
      margin-bottom: 20px;
    }
    
    .phase-title {
      color: #1976d2;
      margin: 16px 0 8px 0;
      font-size: 1.1em;
      font-weight: 500;
    }
    
    .progress-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }
    
    .progress-text {
      color: #666;
    }
    
    .progress-percentage {
      font-weight: 500;
      color: #1976d2;
    }
    
    .mat-progress-bar {
      height: 8px;
      border-radius: 4px;
    }
    
    .progress-success {
      background-color: #c8e6c9;
    }
    
    .progress-error {
      background-color: #ffcdd2;
    }
    
    .batch-info {
      text-align: center;
      margin-top: 8px;
      font-size: 12px;
      color: #666;
    }

    .analysis-status {
      text-align: center;
      margin-top: 8px;
      font-size: 12px;
      color: #666;
      font-style: italic;
    }
    
    .error-message, .success-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 4px;
      margin-top: 16px;
    }
    
    .error-message {
      background-color: #ffebee;
      color: #c62828;
    }
    
    .success-message {
      background-color: #e8f5e8;
      color: #2e7d32;
    }
    
    .status-processing {
      color: #1976d2;
    }
    
    .status-success {
      color: #2e7d32;
    }
    
    .status-failed {
      color: #c62828;
    }
    
    .mat-card-actions {
      text-align: center;
    }
  `]
})
export class UploadProgressComponent implements OnInit, OnDestroy {
  @Input() jobId!: string;
  @Output() navigationRequested = new EventEmitter<{action: string, data?: any}>();
  job: UploadJob | null = null;
  private pollSubscription?: Subscription;

  constructor(
    private documentService: DocumentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.jobId) {
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    // Use adaptive polling - faster during processing, slower when complete
    let pollInterval = 2000; // Start with 2 seconds
    
    this.pollSubscription = interval(pollInterval).subscribe(() => {
      this.checkJobStatus();
    });
    
    // Initial check
    this.checkJobStatus();
  }

  private adjustPollingInterval(): void {
    if (this.job) {
      let newInterval = 2000; // Default 2 seconds
      
      if (this.job.status === 'processing') {
        if (this.isAnalysisPhase()) {
          newInterval = 3000; // 3 seconds during analysis
        } else {
          newInterval = 1500; // 1.5 seconds during upload
        }
      } else {
        newInterval = 5000; // 5 seconds for completed/failed jobs
      }
      
      // Restart polling with new interval if needed
      if (this.pollSubscription) {
        this.stopPolling();
        this.pollSubscription = interval(newInterval).subscribe(() => {
          this.checkJobStatus();
        });
      }
    }
  }

  private stopPolling(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = undefined;
    }
  }

  private checkJobStatus(): void {
    this.documentService.getUploadStatus(this.jobId).subscribe({
      next: (job: UploadJob) => {
        const previousStatus = this.job?.status;
        this.job = job;
        
        // Adjust polling interval based on status change
        if (previousStatus !== job.status) {
          this.adjustPollingInterval();
        }
        
        // Stop polling when job is complete
        if (job.status === 'success' || job.status === 'failed') {
          this.stopPolling();
          
          // Navigate to results when successful
          if (job.status === 'success') {
            setTimeout(() => {
              this.viewResults();
            }, 1000);
          }
        }
      },
      error: (error: any) => {
        console.error('Error checking job status:', error);
        // Slow down polling on errors
        if (this.pollSubscription) {
          this.stopPolling();
          this.pollSubscription = interval(5000).subscribe(() => {
            this.checkJobStatus();
          });
        }
      }
    });
  }

  getStatusText(): string {
    if (!this.job) return '';
    
    switch (this.job.status) {
      case 'processing':
        if (this.isAnalysisPhase()) {
          return 'Analyzing...';
        }
        return 'Processing...';
      case 'success':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return this.job.status;
    }
  }

  isAnalysisPhase(): boolean {
    return this.job != null && 
           this.job.status === 'processing' && 
           this.job.progress >= 100.0;
  }

  getAnalysisProgress(): number {
    if (!this.job || !this.job.analysisProgress) {
      return 0;
    }
    return this.job.analysisProgress.progress || 0;
  }

  getAnalysisStatusText(): string {
    if (!this.job || !this.job.analysisProgress) {
      return 'Preparing analysis...';
    }
    return this.job.analysisProgress.status || 'Analyzing...';
  }

  getStatusClass(): string {
    if (!this.job) return '';
    return `status-${this.job.status}`;
  }

  getProgressBarClass(): string {
    if (!this.job) return '';
    
    if (this.job.status === 'success') {
      return 'progress-success';
    } else if (this.job.status === 'failed') {
      return 'progress-error';
    }
    
    return '';
  }

  goBack(): void {
    this.navigationRequested.emit({ action: 'goBack' });
  }

  viewResults(): void {
    if (this.job && this.job.result_data) {
      // Transform the backend data to the format expected by results component
      const resultsData = {
        tabs: this.job.result_data
      };
      
      // Emit navigation event with transformed result data
      this.navigationRequested.emit({ 
        action: 'showResults', 
        data: resultsData 
      });
    } else {
      console.error('No job data or result_data available');
    }
  }
}
