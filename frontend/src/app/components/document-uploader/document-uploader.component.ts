
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-document-uploader',
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Lehrplan Datei Upload</mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        <div class="form-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Bundesland auswählen</mat-label>
            <mat-select [(ngModel)]="selectedState" required>
              <mat-option *ngFor="let state of germanStates" [value]="state.value">
                {{ state.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        
        <div class="upload-section">
          <input 
            type="file" 
            #fileInput 
            (change)="onFileSelected($event)"
            accept=".ttl"
            style="display: none">
          
          <button 
            mat-raised-button 
            [color]="selectedState ? 'primary' : ''"
            [disabled]="!selectedState || isProcessing || disabled"
            (click)="fileInput.click()">
            <mat-icon *ngIf="!isProcessing">upload_file</mat-icon>
            <mat-spinner *ngIf="isProcessing" diameter="20"></mat-spinner>
            {{ getUploadButtonText() }}
          </button>
          
          <span *ngIf="selectedFile && !isProcessing" class="file-name">
            {{ selectedFile.name }}
          </span>
          
          <div *ngIf="isProcessing" class="processing-info">
            <mat-spinner diameter="24"></mat-spinner>
            <span>Datei wird verarbeitet...</span>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .form-section {
      margin-bottom: 20px;
    }
    
    .upload-section {
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .file-name {
      color: #666;
      font-style: italic;
    }
    
    .processing-info {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #1976d2;
      font-weight: 500;
    }
    
    .full-width {
      width: 100%;
    }
    
    button[disabled] {
      opacity: 0.6;
    }
    
    button mat-spinner {
      margin-right: 8px;
    }
  `]
})

export class DocumentUploaderComponent {
  @Input() disabled: boolean = false;
  @Output() documentProcessed = new EventEmitter<any>();
  @Output() uploadStarted = new EventEmitter<{jobId: string, filename: string}>();
  selectedFile: File | null = null;
  selectedState: string = '';
  isProcessing: boolean = false;

  germanStates = [
    { name: 'Baden-Württemberg', value: 'badenWuerttemberg' },
    { name: 'Bayern', value: 'bayern' },
    { name: 'Berlin', value: 'berlin' },
    { name: 'Brandenburg', value: 'brandenburg' },
    { name: 'Bremen', value: 'bremen' },
    { name: 'Hamburg', value: 'hamburg' },
    { name: 'Hessen', value: 'hessen' },
    { name: 'Mecklenburg-Vorpommern', value: 'mecklenburgVorpommern' },
    { name: 'Niedersachsen', value: 'niedersachsen' },
    { name: 'Nordrhein-Westfalen', value: 'nordrheinWestfalen' },
    { name: 'Rheinland-Pfalz', value: 'rheinlandPfalz' },
    { name: 'Saarland', value: 'saarland' },
    { name: 'Sachsen', value: 'sachsen' },
    { name: 'Sachsen-Anhalt', value: 'sachsenAnhalt' },
    { name: 'Schleswig-Holstein', value: 'schleswigHolstein' },
    { name: 'Thüringen', value: 'thueringen' }
  ];

  constructor(
    private snackBar: MatSnackBar,
    private documentService: DocumentService
  ) {}

  getUploadButtonText(): string {
    if (this.isProcessing) {
      return 'Verarbeitung läuft...';
    }
    if (this.disabled) {
      return 'Upload läuft...';
    }
    if (!this.selectedState) {
      return 'Erst Bundesland wählen';
    }
    return 'TTL Datei hochladen';
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.name.toLowerCase().endsWith('.ttl')) {
      this.selectedFile = file;
      this.snackBar.open('TTL Datei ausgewählt', 'Schließen', {
        duration: 2000
      });
      // Automatically start upload when file is selected
      this.uploadFile();
    } else {
      this.snackBar.open('Bitte wählen Sie eine gültige TTL-Datei aus', 'Schließen', {
        duration: 3000
      });
      // Reset the file input
      event.target.value = '';
    }
  }

  uploadFile() {
    if (!this.selectedFile || !this.selectedState || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    this.documentService.uploadFile(this.selectedFile, this.selectedState)
      .subscribe({
        next: (result) => {
          this.isProcessing = false;
          
          // Check if this is the new job-based response
          if (result.jobId) {
            // New job-based flow
            this.uploadStarted.emit({
              jobId: result.jobId,
              filename: result.filename || this.selectedFile!.name
            });
            this.snackBar.open('Upload gestartet - Fortschritt wird angezeigt', 'Schließen', {
              duration: 3000
            });
          } else {
            // Legacy direct response flow
            this.documentProcessed.emit(result);
            this.snackBar.open('Datei erfolgreich hochgeladen und verarbeitet!', 'Schließen', {
              duration: 3000
            });
          }
          
          // Reset for next upload
          this.selectedFile = null;
        },
        error: (error) => {
          this.isProcessing = false;
          this.snackBar.open('Fehler beim Hochladen: ' + (error.error?.error || error.message), 'Schließen', {
            duration: 5000
          });
          // Reset for retry
          this.selectedFile = null;
        }
      });
  }
}
