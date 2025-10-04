import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, QueryList, ViewChildren } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

export interface UploadInfo {
  status: string;
  message: string;
  graphId: string;
  graphName: string;
  triplesCount: number;
  sparqlEndpoint: string;
  analysisResults?: {
    totalTriples: number;
    classDefinitionsLoaded: number;
    foundClassesCount: number;
    classList: Array<{
      label: string;
      instanceCount: number;
      uri: string;
    }>;
  };
}

export interface TabInfo {
  label: string;
  content: string;
  type: 'text' | 'table' | 'summary';
  data?: any[];
  uploadInfo?: UploadInfo;
}

@Component({
  selector: 'app-results',
  template: `
    <mat-card *ngIf="results && tabData && tabData.length > 0">
      <mat-card-header>
        <mat-card-title>Lehrplan Analyse</mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        <mat-tab-group>
          <mat-tab *ngFor="let tab of tabData" [label]="tab.label">
            
            <!-- Summary tab with upload info and analysis -->
            <div *ngIf="tab.type === 'summary'">
              <!-- Upload Results Section -->
              <div class="upload-info">
                <h3>Upload Ergebnisse</h3>
                <div class="result-item">
                  <strong>Status:</strong> 
                  <span class="success">{{ tab.uploadInfo?.status }}</span>
                </div>
                
                <div class="result-item">
                  <strong>Nachricht:</strong> {{ tab.uploadInfo?.message }}
                </div>
                
                <div class="result-item">
                  <strong>Bundesland (Graph ID):</strong> 
                  <code>{{ tab.uploadInfo?.graphId }}</code>
                </div>
                
                <div class="result-item">
                  <strong>Graph URI:</strong> 
                  <code>{{ tab.uploadInfo?.graphName }}</code>
                </div>
                
                <div class="result-item">
                  <strong>Anzahl Triples:</strong> 
                  <span class="count">{{ tab.uploadInfo?.triplesCount }}</span>
                </div>
                
                <div class="result-item">
                  <strong>SPARQL Endpoint:</strong> 
                  <a [href]="getSparqlQueryUrl(tab.uploadInfo)" target="_blank">{{ tab.uploadInfo?.sparqlEndpoint }}</a>
                </div>
              </div>

              <!-- Analysis Results Section -->
              <div class="analysis-section">
                <h3>Analyse Ergebnisse</h3>
                
                <div class="analysis-stats" *ngIf="tab.uploadInfo?.analysisResults">
                  <div class="result-item">
                    <strong>Gesamtanzahl Triples:</strong> 
                    <span class="count">{{ tab.uploadInfo?.analysisResults?.totalTriples }}</span>
                  </div>
                  
                  <div class="result-item">
                    <strong>Anzahl geladener Klassendefinitionen:</strong> 
                    <span class="count">{{ tab.uploadInfo?.analysisResults?.classDefinitionsLoaded }}</span>
                  </div>
                  
                  <div class="result-item">
                    <strong>Gefundene Klassen mit Instanzen:</strong> 
                    <span class="count">{{ tab.uploadInfo?.analysisResults?.foundClassesCount }}</span>
                  </div>
                </div>
                
                <!-- Class Instance List -->
                <div class="class-instances" *ngIf="hasClassList(tab)">
                  <h4>Gefundene Klassen:</h4>
                  <div class="class-list">
                    <div class="class-item" *ngFor="let classInfo of getClassList(tab)">
                      <div class="class-label">{{ classInfo.label }}</div>
                      <div class="instance-count">
                        <span class="count">{{ classInfo.instanceCount }}</span>
                        <span class="count-label">{{ classInfo.instanceCount === 1 ? 'Instanz' : 'Instanzen' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Fallback to original content if structured data not available -->
                <div *ngIf="!tab.uploadInfo?.analysisResults" class="legacy-analysis">
                  <pre>{{ tab.content }}</pre>
                </div>
              </div>
            </div>
            
            <!-- Text content tab -->
            <div *ngIf="tab.type === 'text'" class="text-content">
              <pre>{{ tab.content }}</pre>
            </div>
            
            <!-- Table content tab -->
            <div *ngIf="tab.type === 'table'" class="table-content">
              <div *ngIf="tab.data && tab.data.length > 0">
                <div matSort #sort>
                  <mat-table [dataSource]="getDataSource(tab)" class="mat-elevation-z2">
                    <ng-container matColumnDef="label">
                      <mat-header-cell *matHeaderCellDef mat-sort-header class="column-header">
                        <div class="header-content">
                          <span class="header-title">Label</span>
                          <mat-form-field appearance="outline" class="header-filter">
                            <input matInput 
                                   (keyup)="applyColumnFilter($event, tab, 'label')" 
                                   placeholder="Filter..."
                                   class="filter-input">
                            <mat-icon matSuffix class="filter-icon">filter_list</mat-icon>
                          </mat-form-field>
                        </div>
                      </mat-header-cell>
                      <mat-cell *matCellDef="let element">{{ element.label }}</mat-cell>
                    </ng-container>

                    <ng-container matColumnDef="uri">
                      <mat-header-cell *matHeaderCellDef mat-sort-header class="column-header">
                        <div class="header-content">
                          <span class="header-title">URI</span>
                          <mat-form-field appearance="outline" class="header-filter">
                            <input matInput 
                                   (keyup)="applyColumnFilter($event, tab, 'uri')" 
                                   placeholder="Filter..."
                                   class="filter-input">
                            <mat-icon matSuffix class="filter-icon">filter_list</mat-icon>
                          </mat-form-field>
                        </div>
                      </mat-header-cell>
                      <mat-cell *matCellDef="let element">
                        <a [href]="element.uri" target="_blank" class="uri-link">
                          <code class="uri-code">{{ element.uri }}</code>
                        </a>
                      </mat-cell>
                    </ng-container>

                    <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
                    <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
                  </mat-table>
                </div>
                
                <!-- Paginator -->
                <mat-paginator 
                  #paginator
                  [pageSizeOptions]="[5, 10, 20, 50, 100]" 
                  [pageSize]="20"
                  [length]="tab.data.length"
                  showFirstLastButtons
                  aria-label="Select page"
                  (page)="onPageChange(tab, $event)">
                </mat-paginator>
                
                <!-- Connect paginator after render -->
                <div style="display: none;">{{ connectPaginator(tab, paginator) }}</div>
              </div>
              
              <div *ngIf="!tab.data || tab.data.length === 0" class="no-data">
                <p>Keine Daten für diese Klasse gefunden.</p>
              </div>
            </div>
            
          </mat-tab>
        </mat-tab-group>
      </mat-card-content>
      
      <mat-card-actions align="end">
        <button mat-raised-button color="primary" (click)="onNewUpload()">
          <mat-icon>cloud_upload</mat-icon>
          New Upload
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .upload-info {
      margin-bottom: 24px;
      padding: 16px;
      background-color: #f8f9fa;
      border-radius: 4px;
      border-left: 4px solid #28a745;
    }
    
    .upload-info h3 {
      margin: 0 0 16px 0;
      color: #333;
      font-weight: 500;
    }
    
    .result-item {
      margin-bottom: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    
    .result-item:last-of-type {
      border-bottom: none;
    }
    
    .success {
      color: #4caf50;
      font-weight: 500;
    }
    
    .count {
      color: #1976d2;
      font-weight: 500;
    }
    
    .analysis-section {
      margin-top: 24px;
      padding: 16px;
      background-color: #f8f9fa;
      border-radius: 4px;
      border-left: 4px solid #17a2b8;
    }
    
    .analysis-section h3 {
      margin: 0 0 16px 0;
      color: #333;
      font-weight: 500;
    }
    
    .analysis-section h4 {
      margin: 16px 0 12px 0;
      color: #555;
      font-weight: 500;
      font-size: 1.1em;
    }
    
    .analysis-stats {
      margin-bottom: 20px;
    }
    
    .class-instances {
      margin-top: 20px;
    }
    
    .class-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .class-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background-color: white;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
      transition: box-shadow 0.2s ease;
    }
    
    .class-item:hover {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .class-label {
      font-weight: 500;
      color: #333;
      flex: 1;
    }
    
    .instance-count {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .count-label {
      color: #666;
      font-size: 0.9em;
    }
    
    .legacy-analysis pre {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.4;
    }
    
    .text-content {
      margin-top: 16px;
    }
    
    .text-content pre,
    .analysis-content pre {
      background-color: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.4;
    }
    
    .table-content {
      margin-top: 16px;
      overflow-x: auto;
    }
    
    .filter-field {
      width: 100%;
      max-width: 400px;
      margin-bottom: 16px;
    }
    
    .mat-table {
      width: 100%;
    }
    
    .column-header {
      padding: 4px 8px !important;
      background-color: #f8f9fa;
      border-bottom: 2px solid #dee2e6;
      vertical-align: top !important;
    }
    
    .header-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      min-height: 60px;
    }
    
    .header-title {
      font-weight: 600;
      color: #495057;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    
    .header-filter {
      width: 100% !important;
      min-width: 120px;
    }
    
    .header-filter .mat-form-field-wrapper {
      padding-bottom: 0 !important;
      margin-bottom: 0 !important;
    }
    
    .header-filter .mat-form-field-infix {
      padding: 2px 0 4px 0 !important;
      border-top: none !important;
    }
    
    .header-filter .mat-form-field-outline {
      top: -2px !important;
    }
    
    .header-filter .mat-form-field-outline-start,
    .header-filter .mat-form-field-outline-end {
      border-width: 1px !important;
    }
    
    .header-filter .mat-form-field-outline-thick .mat-form-field-outline-start,
    .header-filter .mat-form-field-outline-thick .mat-form-field-outline-end,
    .header-filter .mat-form-field-outline-thick .mat-form-field-outline-gap {
      border-width: 1px !important;
    }
    
    .filter-input {
      font-size: 11px !important;
      padding: 2px 4px !important;
      height: 20px !important;
      line-height: 20px !important;
    }
    
    .filter-icon {
      font-size: 14px !important;
      color: #6c757d !important;
      width: 14px !important;
      height: 14px !important;
    }
    
    .mat-header-cell {
      color: #495057 !important;
      font-weight: 600 !important;
    }
    
    .mat-sort-header-arrow {
      color: #007bff !important;
    }
    
    .mat-row:hover {
      background-color: #f8f9fa !important;
    }
    
    .mat-cell {
      padding: 12px 8px !important;
      border-bottom: 1px solid #dee2e6 !important;
    }
    
    .mat-header-row {
      background-color: #f8f9fa !important;
    }
    
    .uri-code {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      background-color: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
      word-break: break-all;
    }
    
    .uri-link {
      color: #1976d2;
      text-decoration: none;
    }
    
    .uri-link:hover {
      text-decoration: underline;
    }
    
    .uri-link:hover .uri-code {
      background-color: #e3f2fd;
    }
    
    .mat-cell, .mat-header-cell {
      padding: 12px 8px;
    }
    
    .mat-paginator {
      background-color: #f8f9fa;
      border-top: 1px solid #dee2e6;
    }
    
    .no-data {
      text-align: center;
      padding: 32px;
      color: #666;
      font-style: italic;
    }
    
    code {
      background-color: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    a {
      color: #1976d2;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
  `]
})
export class ResultsComponent implements OnInit, AfterViewInit {
  @Input() results: any = null;
  @Output() newUploadRequested = new EventEmitter<void>();
  
  @ViewChildren(MatSort) sorts!: QueryList<MatSort>;
  
  tabData: TabInfo[] = [];
  displayedColumns: string[] = ['label', 'uri'];
  dataSources: Map<string, MatTableDataSource<any>> = new Map();
  columnFilters: Map<string, {label: string, uri: string}> = new Map();

  ngOnInit(): void {
    if (this.results && this.results.tabs) {
      this.tabData = this.results.tabs;
    }
  }

  ngAfterViewInit(): void {
    // Connect sorts to data sources after view initialization
    setTimeout(() => {
      this.connectSorts();
    });
  }

  connectSorts(): void {
    // Connect each sort to their respective data sources
    let tableIndex = 0;
    this.tabData.forEach((tab) => {
      if (tab.type === 'table' && tab.data && tab.data.length > 0) {
        const dataSource = this.getDataSource(tab);
        const sortArray = this.sorts.toArray();
        
        if (sortArray[tableIndex]) {
          dataSource.sort = sortArray[tableIndex];
          console.log(`Connected sort for ${tab.label}`);
        }
        tableIndex++;
      }
    });
  }

  getDataSource(tab: TabInfo): MatTableDataSource<any> {
    let dataSource = this.dataSources.get(tab.label);
    if (!dataSource) {
      dataSource = new MatTableDataSource(tab.data || []);
      
      // Configure custom filter predicate for multi-column filtering
      dataSource.filterPredicate = (data: any, filter: string) => {
        const filters = JSON.parse(filter);
        const labelMatch = !filters.label || data.label.toLowerCase().includes(filters.label.toLowerCase());
        const uriMatch = !filters.uri || data.uri.toLowerCase().includes(filters.uri.toLowerCase());
        return labelMatch && uriMatch;
      };
      
      // Configure sorting
      dataSource.sortingDataAccessor = (item: any, property: string) => {
        switch (property) {
          case 'label': return item.label ? item.label.toLowerCase() : '';
          case 'uri': return item.uri ? item.uri.toLowerCase() : '';
          default: return item[property];
        }
      };
      
      this.dataSources.set(tab.label, dataSource);
      this.columnFilters.set(tab.label, {label: '', uri: ''});
    }
    return dataSource;
  }

  setupPagination(tab: TabInfo, event: any): void {
    // This method is called when page changes, but we don't need to do anything special
    // The mat-paginator automatically handles the pagination of the data source
  }

  onPageChange(tab: TabInfo, event: any): void {
    // Handle page changes if needed
    console.log(`Page changed for ${tab.label}:`, event);
  }

  connectPaginator(tab: TabInfo, paginator: MatPaginator): string {
    // This method is called from the template to connect paginator to data source
    const dataSource = this.dataSources.get(tab.label);
    if (dataSource && paginator && !dataSource.paginator) {
      dataSource.paginator = paginator;
      console.log(`Connected paginator for ${tab.label}`);
    }
    return ''; // Return empty string for template binding
  }

  applyFilter(event: Event, tab: TabInfo): void {
    const filterValue = (event.target as HTMLInputElement).value;
    const dataSource = this.dataSources.get(tab.label);
    if (dataSource) {
      dataSource.filter = filterValue.trim().toLowerCase();
    }
  }

  applyColumnFilter(event: Event, tab: TabInfo, column: string): void {
    const filterValue = (event.target as HTMLInputElement).value;
    const filters = this.columnFilters.get(tab.label) || {label: '', uri: ''};
    
    if (column === 'label') {
      filters.label = filterValue;
    } else if (column === 'uri') {
      filters.uri = filterValue;
    }
    
    this.columnFilters.set(tab.label, filters);
    
    const dataSource = this.dataSources.get(tab.label);
    if (dataSource) {
      dataSource.filter = JSON.stringify(filters);
    }
  }

  getSparqlQueryUrl(uploadInfo: any): string {
    if (!uploadInfo?.graphId) {
      return uploadInfo?.sparqlEndpoint || '';
    }

    const federalState = uploadInfo.graphId;
    const graphUri = `http://localhost:8080/graph/${federalState}`;
    
    const sparqlQuery = `select * from <${graphUri}>
where {
?s ?p ?o
}
LIMIT 1000`;
    
    const encodedQuery = encodeURIComponent(sparqlQuery);
    
    return `http://localhost:8890/sparql?default-graph-uri=&qtxt=${encodedQuery}&format=text%2Fhtml&should-sponge=&timeout=0&signal_void=on`;
  }

  hasClassList(tab: TabInfo): boolean {
    return !!(tab.uploadInfo?.analysisResults?.classList && tab.uploadInfo.analysisResults.classList.length > 0);
  }

  getClassList(tab: TabInfo): Array<{label: string; instanceCount: number; uri: string}> {
    return tab.uploadInfo?.analysisResults?.classList || [];
  }

  onNewUpload(): void {
    this.newUploadRequested.emit();
  }
}
