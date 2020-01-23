import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ViewChild,
  OnChanges,
  SimpleChanges,
  ElementRef
} from '@angular/core';

import { GridOptions, ColDef } from 'ag-grid-community';

import {
  Action,
  GridViewDetail,
  InputBuilderDefinition,
  DialogOptions,
  IDashboardItem,
  ActionTypes
} from 'ngscaffolding-models';

import { Dialog } from 'primeng/dialog';
import { MessageService } from 'primeng/components/common/messageservice';

import {
  ActionService,
  DataSourceService,
  LoggingService,
  BroadcastService,
  UserPreferencesService,
  NgsDatePipe,
  NgsDateTimePipe,
  ComponentLoaderService,
  ReferenceValuesService
} from 'ngscaffolding-core';

import { FiltersHolderComponent } from '../filtersHolder/filtersHolder.component';
import { InputBuilderPopupComponent } from 'ngscaffolding-inputbuilder';
import { ActionsHolderComponent } from '../actionsHolder/actionsHolder.component';
import { ButtonCellComponent } from '../../cellTemplates/buttonCell/buttonCell.component';
import { Subscription } from 'rxjs';
import { UserPreferencesQuery } from 'ngscaffolding-core';
import { GridExtensionsService } from '../../services/gridExtensions/gridExtensions.service';
import { ConfirmationService } from 'primeng/api';

import * as Papa from 'papaparse';

@Component({
  selector: 'ngs-data-grid',
  templateUrl: './dataGrid.component.html',
  styleUrls: ['./dataGrid.component.scss']
})
export class DataGridComponent implements IDashboardItem, OnInit, OnDestroy, OnChanges {
  @ViewChild(FiltersHolderComponent, { static: false }) filtersHolder: FiltersHolderComponent;
  @ViewChild(InputBuilderPopupComponent, { static: false }) actionInputPopup: InputBuilderPopupComponent;
  @ViewChild(ActionsHolderComponent, { static: false }) actionsHolder: ActionsHolderComponent;
  @ViewChild(Dialog, { static: false }) dialog: Dialog;

  @Input() isWidget: boolean;
  @Input() itemId: string;
  @Input() itemDetails: GridViewDetail;
  @Input() fixedHeight: number;
  @Input() overrideGridOptions: object;

  // Base context, passed to Actions
  @Input() baseContext: object;

  @Output() selectionChanged = new EventEmitter<object[]>();

  filterValues: object = {};
  filters: InputBuilderDefinition;

  actions: Action[];

  showActionBar = false;
  showFilters = true;
  showToolPanel = false;
  heightToReserve = 0;

  actionInputDefinition: InputBuilderDefinition;
  actionValues: any;
  actionFile: string;

  gridOptions: GridOptions;
  selectedRows: any[];
  columnDefs: any[];
  rowData: any[];
  rowCount: number;
  hideLabels = true;
  hideFiltersButton: boolean;

  // setting Parent Height uses relative to parent sizing
  parentHeight = 0;

  // Show spinner when loading
  dataLoading: boolean;

  // Dialog Settings
  popupShown = false;
  dialogOptions: DialogOptions = {};

  private gridviewPrefPrefix = 'GridViewPrefs_';

  private clickedAction: Action;

  private broadcastSubscription: Subscription;

  private gridSavedState: any;

  constructor(
      private log: LoggingService,
      private ngsDatePipe: NgsDatePipe,
      private ngsDateTimePipe: NgsDateTimePipe,
      private referenceService: ReferenceValuesService,
      private elementRef: ElementRef,
      private actionService: ActionService,
      private dataSourceService: DataSourceService,
      private componentLoader: ComponentLoaderService,
      private broadcast: BroadcastService,
      private confirmationService: ConfirmationService,
      private messageService: MessageService,
      private prefService: UserPreferencesService,
      private prefsQuery: UserPreferencesQuery,
      private gridExtensionsService: GridExtensionsService
  ) {
      this.gridOptions = <GridOptions>{
          defaultColDef: {
              filter: true
          },
          statusBar: {
              statusPanels: [
                  { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
                  { statusPanel: 'agTotalRowCountComponent', align: 'center' },
                  { statusPanel: 'agFilteredRowCountComponent' },
                  { statusPanel: 'agSelectedRowCountComponent' },
                  { statusPanel: 'agAggregationComponent' }
              ]
          },
          sideBar: {
              toolPanels: [
                  {
                      id: 'columns',
                      labelDefault: 'Columns',
                      labelKey: 'columns',
                      iconKey: 'columns',
                      toolPanel: 'agColumnsToolPanel'
                  },
                  {
                      id: 'filters',
                      labelDefault: 'Filters',
                      labelKey: 'filters',
                      iconKey: 'filter',
                      toolPanel: 'agFiltersToolPanel'
                  }
              ]
          },
          enableColResize: true,
          enableSorting: true,
          enableFilter: true,
          groupMultiAutoColumn: true,
          rowGroupPanelShow: 'always',

          rowSelection: 'multiple',
          suppressCellSelection: true,

          columnTypes: {
              dateColumn: {
                  filter: 'agDateColumnFilter',
                  cellFormatter: data => {
                      return this.ngsDatePipe.transform(data.value);
                  },
                  suppressMenu: true
              },
              dateTimeColumn: {
                  filter: 'agDateColumnFilter',
                  cellFormatter: data => {
                      return this.ngsDateTimePipe.transform(data.value);
                  },
                  suppressMenu: true
              }
          },

          // context used to call back from button Column
          context: {
              componentParent: this
          },

          onGridReady: () => {
              this.calculateHeights();
              if (this.gridSavedState) {
                  this.gridOptions.columnApi.setColumnState(this.gridSavedState);
              }
          }
      };

      // Add in custom Renderers
      const renderers = {};
      for (const renderer of this.gridExtensionsService.cellRenderers) {
          renderers[renderer.name] = renderer.renderer;
      }
      this.gridOptions.frameworkComponents = renderers;

      this.broadcastSubscription = this.broadcast.on('CLOSE_POPUP').subscribe(saved => {
          this.popupShown = false;
          if (saved) {
              this.refreshData();
          }
      });
  }

  // Toolbar Operations
  showHideFilters() {
      this.showFilters = !this.showFilters;
      this.calculateHeights();
  }

  showHideColumns() {
      this.showToolPanel = !this.showToolPanel;

      this.gridOptions.api.showToolPanel(this.showToolPanel);
  }

  exportData() {
      this.gridOptions.api.exportDataAsCsv();
  }

  // Expose Method in Angular Element
  // https://github.com/angular/angular/issues/22114
  // Dashboard Item Interface
  @Input()
  public refreshData = () => {
      this.log.info('DataGrid: Refreshing Data');
      this.loadInitialData();
  };

  @Input()
  public updateData = (newData: any) => {
      this.filterValues = newData;
  };

  saveView() {
      const savedState = this.gridOptions.columnApi.getColumnState();
      this.prefService.setValue(this.gridviewPrefPrefix + this.itemId, JSON.stringify(savedState)).subscribe(
          () => {
              this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: 'View Saved'
              });
          },
          () => {
              this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'View not Saved'
              });
          }
      );
  }

  resetView() {
      // Remove our saved settings
      this.prefService.deleteValue(this.gridviewPrefPrefix + this.itemId).subscribe(
          () => {
              this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: 'View Reset'
              });
              this.loadMenuItem();
          },
          () => {
              this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'View not Reset'
              });
          }
      );
  }
  shareView() {}
  // Toolbar Operations

  onGridReady() {
      // params.api.sizeColumnsToFit();
  }

  onFiltersUpdated(filters) {
      this.filterValues = filters;

      this.loadInitialData();
  }

  onSelectionChanged() {
      this.selectedRows = this.gridOptions.api.getSelectedRows();
      if (this.actionsHolder) {
          this.actionsHolder.selectedRows = this.selectedRows;
          this.actionsHolder.selectedRowsCount = this.selectedRows.length;
      }
      this.selectionChanged.emit(this.selectedRows);
  }

  private calculateHeights() {
      let height = 0;
      if (!this.isWidget) {
          if (this.showFilters) {
              height += 62;
          }
          if (this.showActionBar) {
              height += 52;
          }
      }
      this.heightToReserve = height;
  }

  // Load First Data and if any criteria Changes
  public loadInitialData() {
      this.rowData = [];

      this.dataLoading = true;

      if (this.itemDetails.dataValues) {
          this.rowData = this.itemDetails.dataValues;
          this.rowCount = this.itemDetails.dataValues.length;
          this.dataLoading = false;
      } else if (this.itemDetails.selectDataSourceName) {
          this.dataSourceService
              .getDataSource({
                  forceRefresh: true,
                  name: this.itemDetails.selectDataSourceName,
                  filterValues: { ...this.baseContext, ...this.filterValues },
                  seed: this.itemDetails.seedValue
              })
              .subscribe(
                  results => {
                      if (!results.inflight) {
                          if (results.jsonData) {
                              if (typeof results.jsonData === 'string') {
                                  this.rowData = JSON.parse(results.jsonData);
                              } else {
                                  this.rowData = results.jsonData;
                              }

                              if (results.rowCount) {
                                  this.rowCount = results.rowCount;
                              }
                          }
                          this.dataLoading = false;
                      }
                  },
                  () => {
                      this.dataLoading = false;
                  }
              );
      }
  }

  private loadMenuItem() {
      if (this.itemDetails) {
          this.columnDefs = [];
          this.filters = this.itemDetails.filters;
          if (this.filters && this.filters.inputDetails && this.filters.inputDetails.length > 0) {
              this.hideFiltersButton = false;
          } else {
              this.hideFiltersButton = true;
          }

          // Do We need a Checkbox
          if (!this.itemDetails.disableCheckboxSelection) {
              // Switch off RowSelection
              this.gridOptions.suppressRowClickSelection = true;

              // Add the selection column
              this.columnDefs.push({
                  width: 70,
                  suppressMenu: true,
                  filter: false,
                  sortable: false,
                  suppressToolPanel: true,
                  checkboxSelection: true,
                  pinned: 'left',
                  headerCheckboxSelection: true,
                  headerCheckboxSelectionFilteredOnly: false
              });
          }

          if (this.itemDetails.isDataIsland) {
              this.gridOptions.rowGroupPanelShow = 'onlyWhenGrouping';
          }

          // Do We need an Actions button
          if (this.itemDetails.actions && this.itemDetails.actions.filter(action => action.columnButton).length > 0) {
              this.columnDefs.push({
                  headerName: 'Actions',
                  suppressMenu: true,
                  filter: false,
                  sortable: false,
                  suppressToolPanel: true,
                  pinned: 'left',
                  field: 'Id',
                  cellRendererFramework: ButtonCellComponent,
                  cellRendererParams: {
                      actions: this.itemDetails.actions,
                      splitButton: this.itemDetails.isActionColumnSplitButton
                  }
              });
          }

          this.itemDetails.columns.forEach(column => {
              // const colDef: ColDef = {
              //     field: column.field,
              //     cellClass: <string>column.cellClass,
              //     tooltipField: column.tooltipField,
              //     headerName: column.headerName,
              //     headerTooltip: column.headerTooltip,
              //     pinned: column.pinned,
              //     suppressMenu: column.suppressMenu,
              //     filter: column.filter,
              //     sortable: column.sortable === undefined ? true : column.sortable,
              //     width: column.width,
              //     enableRowGroup: true,

              //     type: column.type,
              //     hide: column.hide
              // };

              // if (column.valueFormatter) {
              //     colDef.valueFormatter = this.gridExtensionsService.getValueFormatter(column.valueFormatter);
              // }

              // if (column.cellRenderer) {
              //     colDef.cellRenderer = column.cellRenderer;
              // }

              this.columnDefs.push(column);
          });

          // Actions Here
          this.actions = this.itemDetails.actions;
          this.showActionBar = this.actions && this.actions.filter(action => !action.columnButton).length > 0;
      }

      this.loadInitialData();
  }

  //
  // Action Stuff
  //
  actionClicked(action: Action, row: any) {
      // check if we need confirmation
      if (action.confirmationMessage) {
          this.confirmationService.confirm({
              key: this.itemDetails.title,
              message: action.confirmationMessage,
              header: 'Confirmation',
              accept: () => {
                  this.checkForActionInputs(action, row);
              }
          });
      } else {
          // Just do it without asking
          this.checkForActionInputs(action, row);
      }
  }

  private checkForActionInputs(action: Action, row: any) {
      if (action.inputBuilderDefinition && action.inputBuilderDefinition.inputDetails.length > 0) {
          this.clickedAction = action;
          this.actionInputDefinition = action.inputBuilderDefinition;
          if (row) {
              this.actionValues = row;
          } else {
              this.actionValues = {};
          }
          this.actionInputPopup.showPopup();
      } else {
          if (row) {
              this.actionValues = row;
          } else {
              this.actionValues = {};
          }
          this.callAction(action, row);
      }
  }

  public popupHidden() {}

  private callAction(action: Action, row: any) {
      switch (action.type) {
          case ActionTypes.angularComponent: {
              this.componentLoader.loadComponent(action.angularComponent).then(newComponent => {
                  newComponent['data'] = row;

                  if (action.idValue) {
                      newComponent['idValue'] = action.idValue;
                  }
                  if (action.additionalProperties) {
                      newComponent['additionalProperties'] = action.additionalProperties;
                  }

                  this.popupShown = true;
                  // Give the dialog time to open
                  window.setTimeout(() => {
                      this.elementRef.nativeElement.querySelector('#popupContent').appendChild(newComponent);

                      // Center Popup here
                      this.dialog.center();
                  });
              });

              // Use the options from our action
              if (action.dialogOptions) {
                  this.dialogOptions = action.dialogOptions;
              } else {
                  this.dialogOptions = {};
              }

              break;
          }
          default: {
              let rowsToProcess: object[] = this.selectedRows;

              // If user uploaded file. Use this as rows once parsed
              if (this.actionFile) {
                  rowsToProcess = Papa.parse(this.actionFile, {
                      header: true
                  }).data;
              }
              this.actionService.callAction(action, this.actionValues, rowsToProcess, this.baseContext).subscribe(
                  result => {
                      if (result.success) {
                          if (action.successMessage) {
                              if (action.successToast) {
                                  this.messageService.add({
                                      severity: 'success',
                                      summary: 'Success',
                                      detail: action.successMessage
                                  });
                                  if (action.flushReferenceValues) {
                                      // Remove cached version
                                      this.referenceService.clearReferenceValue(action.flushReferenceValues);
                                  }
                              } else {
                                  this.confirmationService.confirm({
                                      message: action.successMessage,
                                      acceptLabel: 'OK',
                                      icon: 'fa-check',
                                      header: 'Success',
                                      rejectVisible: false
                                  });
                              }
                          }
                          // finally
                          this.actionInputPopup.isShown = false;

                          // Refresh Data
                          this.loadInitialData();
                      } else {
                          if (action.errorMessage) {
                              this.confirmationService.confirm({
                                  message: action.errorMessage,
                                  icon: 'fa-close',
                                  acceptLabel: 'OK',
                                  header: 'Error',
                                  rejectVisible: false
                              });
                          }
                      }
                  },
                  () => {
                      if (action.errorMessage) {
                          this.confirmationService.confirm({
                              message: action.errorMessage,
                              icon: 'fa-close',
                              acceptLabel: 'OK',
                              header: 'Error',
                              rejectVisible: false
                          });
                      }
                  }
              );
          }
      }
  }

  //
  // User Clicked OK on popup
  //
  actionOkClicked(model: object) {
      this.actionValues = model[0];
      this.actionFile = model[1];

      // Setup call to service to run Action
      // Once Complete

      this.callAction(this.clickedAction, model);
  }

  // User clicked Cancel
  actionCancelClicked() {
      alert('User Cancelled');
  }

  ngOnChanges(changes: SimpleChanges): void {
      if (changes.itemDetails && changes.itemDetails.currentValue) {
          this.loadMenuItem();
      }

      if (changes.isWidget && changes.isWidget.currentValue) {
          this.parentHeight = 90;
      }

      // We have some incomming updates to gridOptions
      if (changes.overrideGridOptions && changes.overrideGridOptions.currentValue) {
          this.gridOptions = { ...this.gridOptions, ...changes.overrideGridOptions.currentValue };
      }

      if (changes.itemId && changes.itemId.currentValue && !changes.itemId.previousValue) {
          // watch for Prefs changes
          this.prefsQuery.selectEntity(this.gridviewPrefPrefix + this.itemId).subscribe(pref => {
              if (pref) {
                  this.gridSavedState = JSON.parse(pref.value);
                  if (this.gridOptions.columnApi) {
                      this.gridOptions.columnApi.setColumnState(this.gridSavedState);
                  }
              }
          });
      }
  }

  ngOnInit(): void {}

  ngOnDestroy() {
      if (this.broadcastSubscription) {
          this.broadcastSubscription.unsubscribe();
      }
  }
}
