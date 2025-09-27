import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <mat-toolbar color="primary">
      <span class="toolbar-spacer"></span>
      <span>Lehrplan Viewer</span>
      <span class="toolbar-spacer"></span>
    </mat-toolbar>
    
    <div class="container">
      <app-document-uploader 
        [disabled]="!!currentJobId"
        (uploadStarted)="onUploadStarted($event)"
        (documentProcessed)="onDocumentProcessed($event)">
      </app-document-uploader>
      
      <app-upload-progress
        *ngIf="currentJobId && !results"
        [jobId]="currentJobId"
        (navigationRequested)="onNavigationRequested($event)">
      </app-upload-progress>
      
      <app-results 
        *ngIf="results" 
        [results]="results"
        (newUploadRequested)="onNewUploadRequested()">
      </app-results>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 20px auto;
      padding: 0 20px;
    }
    
    .toolbar-spacer {
      flex: 1 1 auto;
    }
  `]
})
export class AppComponent {
  results: any = null;
  currentJobId: string | null = null;

  onUploadStarted(jobInfo: { jobId: string, filename: string }) {
    this.currentJobId = jobInfo.jobId;
    this.results = null;
  }

  onDocumentProcessed(results: any) {
    this.results = results;
    this.currentJobId = null;
  }

  onNavigationRequested(event: { action: string, data?: any }) {
    if (event.action === 'goBack') {
      this.currentJobId = null;
      this.results = null;
    } else if (event.action === 'showResults') {
      this.results = event.data;
      this.currentJobId = null;
    }
  }

  onNewUploadRequested() {
    this.results = null;
    this.currentJobId = null;
  }
}
