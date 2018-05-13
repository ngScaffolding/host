import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ViewChild
} from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { GridOptions, ColDef, ColDefUtil } from 'ag-grid/main';

import {
  Action,
  GridViewDetail,
  InputBuilderDefinition
} from '@ngscaffolding/models';

import { ConfirmationService } from 'primeng/primeng';
import { MessageService } from 'primeng/components/common/messageservice';

import {
  AppSettingsService,
  DataSourceService,
  MenuService,
  CoreMenuItem,
  LoggingService,
  NotificationService,
  BroadcastService
} from '../../../core/coreModule';

import { FiltersHolderComponent } from '../filtersHolder/filtersHolder.component';
import { DataSetResults } from '../../../core/models/datasetResults.model';
import { MenuItem } from 'primeng/primeng';
import { InputBuilderPopupComponent } from '../../../inputbuilder/inputbuilderModule';
import { ActionsHolderComponent } from '../actionsHolder/actionsHolder.component';
import { ActionService } from '../../../core/services/action/action.service';
import { ButtonCellComponent } from '../../cellTemplates/buttonCell/buttonCell.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-data-grid',
  templateUrl: './datagrid.component.html',
  styleUrls: ['./datagrid.component.scss']
})
export class DataGridComponent implements OnInit, OnDestroy {

  @ViewChild(FiltersHolderComponent) filtersHolder: FiltersHolderComponent;
  @ViewChild(InputBuilderPopupComponent)
  actionInputPopup: InputBuilderPopupComponent;
  @ViewChild(ActionsHolderComponent) actionsHolder: ActionsHolderComponent;

  @Input() gridViewDetail: GridViewDetail;

  menuItem: CoreMenuItem;
  filterValues: any;
  filters: InputBuilderDefinition;

  actions: Action[];
  actionInputDefinition: InputBuilderDefinition;
  actionValues: any;

  gridOptions: GridOptions;
  selectedRows: any[];
  columnDefs: any[];
  rowData: any[];
  rowCount: number;
  hideLabels = true;

  showFilters = true;
  showToolPanel = false;

  private menuName: string;
  private menuItems: CoreMenuItem[];

  private paramSubscription: any;
  private menuSubscription: any;

  private clickedAction: Action;

  private broadcastSubscription: Subscription;

  constructor(
    private logger: LoggingService,
    private route: ActivatedRoute,
    private notification: NotificationService,
    private actionService: ActionService,
    private appSettingsService: AppSettingsService,
    private dataSourceService: DataSourceService,
    private menuService: MenuService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private broadcast: BroadcastService
  ) {
    this.gridOptions = <GridOptions>{
      enableColResize: true,
      enableSorting: true,
      enableFilter: true,

      rowSelection: 'multiple',
      suppressCellSelection: true,

      onGridReady: () => {}
    };

    // Wire up broadcast for action clicked
    this.broadcastSubscription = broadcast.on('ACTION_CLICKED')
      .subscribe(action => {
        this.actionClicked(action as Action);
      });
  }

  // Toolbar Operations
  showHideFilters() {
    this.showFilters = !this.showFilters;
  }
  showHideColumns() {
    this.showToolPanel = !this.showToolPanel;

    this.gridOptions.api.showToolPanel(this.showToolPanel);
  }
  exportData() {}
  saveView() {}
  resetView() {}
  shareView() {}
  // Toolbar Operations

  onGridReady(params) {
    // params.api.sizeColumnsToFit();
  }

  onFiltersUpdated(filters) {
    this.filterValues = filters;
    this.loadInitialData();
  }

  onSelectionChanged($event) {
    this.selectedRows = this.gridOptions.api.getSelectedRows();
    this.actionsHolder.selectedRows = this.selectedRows;
    this.actionsHolder.selectedRowsCount = this.selectedRows.length;
  }

  selectAllRows() {
    // this.gridOptions.api.selectAll();
  }

  // Load First Data and if any criteria Changes
  public loadInitialData() {
    this.rowData = [];

    this.dataSourceService
      .getData(
        {
          id: this.gridViewDetail.selectDataSourceId,
          filterValues: JSON.stringify(this.filterValues)
        },
        true
      )
      .subscribe(
        data => {
          this.rowData = JSON.parse(data.jsonData);
          if (data.rowCount) {
            this.rowCount = data.rowCount;
          }
        },
        error => {
          // Failed Select
          this.logger.error(error);

          this.notification.showMessage({
            detail: 'Unable to get data',
            severity: 'error'
          });
        }
      );
  }

  private findMenuItem(name: string, menuItems: CoreMenuItem[]) {
    if (menuItems) {
      menuItems.forEach(menuItem => {
        this.findMenuItem(name, menuItem.items as CoreMenuItem[]);
        if (
          menuItem.name &&
          menuItem.name.toLowerCase() === name.toLowerCase()
        ) {
          this.menuItem = menuItem;
        }
      });
    }
  }

  private loadMenuItem() {
    if (this.menuName && this.menuItems && this.menuItems.length > 0) {
      // Clear Existing Filters
      this.filters = {};

      this.findMenuItem(this.menuName, this.menuItems);

      if (this.menuItem && this.menuItem.jsonSerialized) {
        this.logger.info(`dataGrid Loading menu ${this.menuName}`);

        this.gridViewDetail = JSON.parse(
          this.menuItem.jsonSerialized
        ) as GridViewDetail;

        if (this.gridViewDetail) {
          this.columnDefs = [];
          this.filters = this.gridViewDetail.filters;

          // Do We need a Checkbox
          if (!this.gridViewDetail.disableCheckboxSelection) {

            // Switch off RowSelection
            this.gridOptions.suppressRowClickSelection = true;

            // Add the selection column
            this.columnDefs.push({
              headerName: 'Selection',
              suppressMenu: true,
              suppressFilter: true,
              suppressSorting: true,
              checkboxSelection: true,
              pinned: 'left',
              headerCheckboxSelection: true,
              headerCheckboxSelectionFilteredOnly: false
            });
          }

          // Do We need an Actions button
          if (this.gridViewDetail.actions.filter(action => action.columnButton).length > 0) {
            this.columnDefs.push({
                headerName: 'Actions',
                suppressMenu: true,
                suppressFilter: true,
                suppressSorting: true,
                field: 'Id',
                cellRendererFramework: ButtonCellComponent,
                cellRendererParams : {
                  actions: this.gridViewDetail.actions,
                  splitButton: this.gridViewDetail.isActionColumnSplitButton
                },
            });
          }

          this.gridViewDetail.columns.forEach(column => {
            const colDef: ColDef = {
              field: column.Field,
              cellClass: column.CellClass,
              filter: column.Filter,
              tooltipField: column.TooltipField,
              headerName: column.HeaderName,
              headerTooltip: column.HeaderTooltip,
              pinned: column.Pinned,
              suppressMenu: column.SuppressMenu,
              suppressFilter: column.SuppressFilter,
              suppressSorting: column.SuppressSorting,

              type: column.Type,
              hide: column.Hide
            };

            this.columnDefs.push(colDef);
          });

          // Actions Here
          this.actions = this.gridViewDetail.actions;
        }

        this.loadInitialData();
      }
    }
  }

  //
  // Action Stuff
  //
  actionClicked(action: Action) {
    // check if we need confirmation
    if (action.confirmationMessage) {
      this.confirmationService.confirm({
        message: action.confirmationMessage,
        header: 'Confirmation',
        accept: () => {
          this.checkForActionInputs(action);
        }
      });
    } else {
      // Just do it without asking
      this.checkForActionInputs(action);
    }
  }

  private checkForActionInputs(action: Action) {
    if (
      action.inputBuilderDefinition &&
      action.inputBuilderDefinition.inputDetails.length > 0
    ) {
      this.clickedAction = action;
      this.actionInputDefinition = action.inputBuilderDefinition;

      this.actionInputPopup.showPopup();
    } else {
      this.actionValues = {};
      this.callAction(action);
    }
  }

  private callAction(action: Action) {
    this.actionService
      .callAction(action, this.actionValues, this.selectedRows)
      .subscribe(
        result => {
          if (result.success) {
          if (action.successMessage) {
            if (action.successToast) {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: action.successMessage
              });
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
        err => {
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

  //
  // User Cliecked OK on popup
  //
  actionOkClicked(model: any) {
    this.actionValues = model;

    // Setup call to service to run Action
    // Once Complete

    this.callAction(this.clickedAction);
  }

  // User clicked Cancel
  actionCancelClicked() {
    alert('User Cancelled');
  }

  ngOnInit(): void {
    this.menuSubscription = this.menuService.menuSubject.subscribe(
      menuItems => {
        this.menuItems = menuItems;

        if (this.menuItems && this.menuItems.length > 0 && !this.menuItem) {
          this.loadMenuItem();
        }
      }
    );
    this.paramSubscription = this.route.params.subscribe(params => {
      this.menuName = params['id'];

      if (
        (this.menuName && !this.menuItem) ||
        this.menuName !== this.menuItem.name
      ) {
        this.loadMenuItem();
      }
    });
  }

  ngOnDestroy() {
    if (this.paramSubscription) {
      this.paramSubscription.unsubscribe();
    }
    if (this.menuSubscription) {
      this.menuSubscription.unsubscribe();
    }
    if (this.broadcastSubscription) {
      this.broadcastSubscription.unsubscribe();
    }
  }
}
