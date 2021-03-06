import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChildren,
  QueryList
} from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import {
  InputDetail,
  InputTypes,
  ReferenceValueItem,
  ZuluDateHelper,
  InputDetailDateTime,
  AppSettings
} from 'ngscaffolding-models';
import { InputBuilderDefinition, OrientationValues, ReferenceValue } from 'ngscaffolding-models';

import { JsonEditorComponent, JsonEditorOptions } from 'ang-jsoneditor';

import * as objectPath from 'object-path';

import {
  AppSettingsService,
  AppSettingsQuery,
  ReferenceValuesService,
  DataSourceService,
  UserAuthenticationQuery
} from 'ngscaffolding-core';
import { InputDetailReferenceValues } from 'ngscaffolding-models';
import { Dropdown } from 'primeng/dropdown';
import { tap, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'ngs-input-builder',
  templateUrl: 'inputBuilder.component.html',
  styleUrls: ['inputBuilder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputBuilderComponent implements OnInit, OnChanges {

  constructor(
      private ref: ChangeDetectorRef,
      public appSettings: AppSettingsService,
      public appSettingsQuery: AppSettingsQuery,
      private authQuery: UserAuthenticationQuery,
      public refValuesService: ReferenceValuesService
  ) {
      this.editorOptions = new JsonEditorOptions();
      this.editorOptions.modes = ['code', 'text', 'tree', 'view']; // set all allowed modes
  }

  @Input() inputBuilderDefinition: InputBuilderDefinition;
  @Input() inputModel: any;

  @Output() modelUpdated = new EventEmitter<object>();
  @Output() valueUpdated = new EventEmitter<[string, object]>();
  @Output() fileAttached = new EventEmitter<string>();

  @Output() okClicked = new EventEmitter<[object, string]>();
  @Output() cancelClicked = new EventEmitter<any>();

  @ViewChildren('dropDown') dropDownChildren: QueryList<Dropdown>;

  private clonedInputModel: any;
  private fileContent: string;

  formBuilt = false;
  form: FormGroup;
  controlStyle = 'ui-g-12';
  containerClass = 'ui-g-12'; // This changes to allow the help Icon
  editorOptions: JsonEditorOptions;
  formSubmitted = false;
  dataSourceLookup = {};
  maxFileSize: number;
  allowedFileTypes: string;

  public formRendered$: Observable<any>;

  public getLabel(input: InputDetail) {
      if (input.label) {
          return input.label;
      } else if (input.name) {
          return input.name.replace(/([A-Z]+)/g, ' $1').replace(/([A-Z][a-z])/g, ' $1');
      }
  }

  onSubmit(form: any) {
      this.formSubmitted = true;
      if (this.form.valid) {
          if (this.inputBuilderDefinition.okButtonCallBack) {
              this.inputBuilderDefinition.okButtonCallBack(this.clonedInputModel);
          }

          this.okClicked.emit([this.clonedInputModel, this.fileContent]);
      }
  }

  onCancel() {
      if (this.inputBuilderDefinition.cancelButtonCallBack) {
          this.inputBuilderDefinition.cancelButtonCallBack(this.clonedInputModel);
      }

      this.cancelClicked.emit();
  }

  onCustom() {
      if (this.inputBuilderDefinition.customButtonCallBack) {
          this.inputBuilderDefinition.customButtonCallBack(this.clonedInputModel);
      }
  }

  ngOnChanges(changes: SimpleChanges) {
      if (changes.inputModel && changes.inputModel.currentValue !== changes.inputModel.previousValue) {
          this.formBuilt = false;
      }

      if (
          changes.inputBuilderDefinition &&
          changes.inputBuilderDefinition.currentValue !== changes.inputBuilderDefinition.previousValue
      ) {
          this.formBuilt = false;
      }

      this.buildForm();
  }

  private decorateInputModel() {
      // Add in standard Values
      const currentUser = this.authQuery.getValue().userDetails;
      const now = new Date();
      this.clonedInputModel['now'] = now;
      this.clonedInputModel['zuluDate'] = new Date(
          Date.UTC(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              now.getHours(),
              now.getMinutes(),
              now.getSeconds()
          )
      );

      this.clonedInputModel['userId'] = currentUser.userId;
  }

  ngOnInit(): void {
      this.maxFileSize = this.appSettingsQuery.hasEntity(AppSettings.maximumFileSize)
          ? this.appSettingsQuery.getEntity(AppSettings.maximumFileSize).value
          : 999999;

      this.allowedFileTypes = this.appSettingsQuery.hasEntity(AppSettings.allowedFileTypes)
          ? this.appSettingsQuery.getEntity(AppSettings.allowedFileTypes).value
          : '';
  }

  getContainerClass(inputDetail: InputDetail) {
      return inputDetail.help ? 'ui-g-11' : 'ui-g-12';
  }

  attachFiles(event: any, input: InputDetail) {
      if (this.inputBuilderDefinition.loadFileContent) {
          if (event.files && event.files.length > 0) {
              for (const file of event.files) {
                  const fileReader = new FileReader();
                  fileReader.onload = () => {
                      // this 'text' is the content of the file
                      this.fileContent = fileReader.result.toString();
                      this.fileAttached.emit(this.fileContent);
                  };
                  fileReader.readAsText(file);
              }
          }
      } else {
          this.fieldChanged(input, event.files[0]);
      }
  }

  searchAutoComplete($event, input: InputDetailReferenceValues) {
      this.loadDataSource(input, $event.query).subscribe(data => {
          this.dataSourceLookup[input.name] = data.referenceValueItems;
          setTimeout(() => {
              this.ref.detectChanges();
          }, 50);
      });
  }

  private getDefaultValue(value: any) {
      switch (value) {
          case 'today':
          case 'now':
              return ZuluDateHelper.getGMTDate(new Date());
              break;
          case 'yesterday': {
              const now = new Date();
              return ZuluDateHelper.getGMTDate(new Date(now.setDate(now.getDate() - 1)));
              break;
          }
          case 'tomorrow': {
              const now = new Date();
              return ZuluDateHelper.getGMTDate(new Date(now.setDate(now.getDate() + 1)));
              break;
          }
          default:
              return value;
              break;
      }
  }

  private buildForm() {
      if (this.formBuilt || !this.inputBuilderDefinition || !this.inputModel) {
          return;
      }

      this.formBuilt = true;

      // Clone our inputModel
      this.clonedInputModel = { ...this.inputModel };
      this.decorateInputModel();

      // Default to full width (changes if help found)
      this.containerClass = 'ui-g-12';

      if (this.inputBuilderDefinition.orientation === OrientationValues.Horizontal) {
          if (this.inputBuilderDefinition.columnCount > 0 && this.inputBuilderDefinition.columnCount < 5) {
              const colSize = 12 / this.inputBuilderDefinition.columnCount;
              this.controlStyle = `ui-g-${colSize}`;
          }
      } else {
          this.controlStyle = 'ui-g-12';
      }
      const formGroup = {};

      const localModel = {};

      const asyncGets: Array<Observable<ReferenceValue>> = [];

      // Always have one to run
      asyncGets.push(of(new ReferenceValue()));

      if (this.inputBuilderDefinition.inputDetails) {
          for (const inputDetail of this.inputBuilderDefinition.inputDetails) {
              // Get value from model and apply to new FormControl
              let inputValue: any = null;
              if (objectPath.get(this.clonedInputModel, inputDetail.name)) {
                  // If we have a passed value in the model, set the control value to this
                  inputValue = this.parseValue(inputDetail, objectPath.get(this.clonedInputModel, inputDetail.name));
              } else if (inputDetail.value) {
                  // If we have a value passed in the Input definition set the control value to this.
                  inputValue = this.getDefaultValue(inputDetail.value);
                  objectPath.set(this.clonedInputModel, inputDetail.name, inputValue);
              } else {
                  // This ensures that the property is set if not passed in
                  objectPath.set(this.clonedInputModel, inputDetail.name, null);
              }

              const formControl = new FormControl(inputValue, this.mapValidators(inputDetail)); // Validators passed here too

              // Readonly
              if (inputDetail.readonly) {
                  formControl.disable();
              }

              // Remember for dependecy check in a mo
              objectPath.set(localModel, inputDetail.name, inputValue);

              formControl.valueChanges.subscribe(changes => {
                  this.fieldChanged(inputDetail, changes);
              });

              formGroup[inputDetail.name] = formControl;

              if (inputDetail['datasourceItems'] && inputDetail['datasourceItems'].length > 0) {
                  // Pre loaded datasourceItems
                  this.dataSourceLookup[inputDetail.name] = inputDetail['datasourceItems'];
                  this.manipulateValuesToObjects(formControl, inputDetail as InputDetailReferenceValues, inputValue);
              } else if (
                  inputDetail.type !== InputTypes.autocomplete &&
                  inputDetail.hasOwnProperty('referenceValueName') &&
                  (<InputDetailReferenceValues>inputDetail).referenceValueName
              ) {
                  // If Datasource, get the values

                  // Do we need a seed value
                  let seed = '';
                  if ((<InputDetailReferenceValues>inputDetail).referenceValueSeedDependency) {
                      seed = this.clonedInputModel[
                          (<InputDetailReferenceValues>inputDetail).referenceValueSeedDependency
                      ];
                  }
                  asyncGets.push(
                      this.loadDataSource(inputDetail, seed).pipe(
                          tap(data => {
                              this.dataSourceLookup[inputDetail.name] = data.referenceValueItems;
                              this.manipulateValuesToObjects(
                                  formControl,
                                  inputDetail as InputDetailReferenceValues,
                                  inputValue
                              );
                          })
                      )
                  );
              }
          }

          // Now re-loop notifying any dependencies
          for (const inputDetail of this.inputBuilderDefinition.inputDetails) {
              this.checkForDependencies(inputDetail, localModel[inputDetail.name]);
          }
      }

      this.formRendered$ = forkJoin(asyncGets);
      this.formRendered$.subscribe(results => {
        console.log('Form rendering');
        this.form = new FormGroup(formGroup);
      });

      const formValidators = [];
      if (this.inputBuilderDefinition.customValidators) {
          this.inputBuilderDefinition.customValidators.forEach(validator => {
              formValidators.push({});
          });
      }

      this.form = new FormGroup(formGroup, formValidators);
  }

  private manipulateValuesToObjects(
      formControl: FormControl,
      inputDetail: InputDetailReferenceValues,
      inputValue: any
  ) {
      if (inputDetail.type === InputTypes.multiselect) {
          if (inputValue) {
              const foundValues = this.dataSourceLookup[inputDetail.name].filter(ds => inputValue.includes(ds.value));
              setTimeout(_ => {
                  formControl.setValue(foundValues, {
                      onlySelf: true,
                      emitEvent: false
                  });
              }, 10);
          }
      } else {
          // Now we have the values, find the ReferenceValue that matches the inputValue from above
          if (this.clonedInputModel[inputDetail.name] && this.dataSourceLookup[inputDetail.name]) {
              if (inputValue) {
                  let foundInputValue;
                  if (inputValue === 'first') {
                      foundInputValue = this.dataSourceLookup[inputDetail.name][0];
                  } else {
                      foundInputValue = this.dataSourceLookup[inputDetail.name] // tslint:disable-next-line:triple-equals
                          .find(ds => ds.value && ds.value.toString() == inputValue.toString()); // Full on corecion
                  }
                  if (foundInputValue) {
                      setTimeout(_ => {
                          formControl.setValue(foundInputValue, {
                              onlySelf: true,
                              emitEvent: false
                          });
                      }, 10);
                  }
              }
          }
      }
  }

  private parseValue(inputDetail: InputDetail, value: string): any {
      switch (inputDetail.type) {
          case InputTypes.checkbox:
          case InputTypes.switch: {
              return value.toString() === 'true' || value.toString() === 'True' || value.toString() === '1';
          }
          case InputTypes.number:
          case InputTypes.rating:
          case InputTypes.spinner: {
              return Number(value);
          }
          case InputTypes.date:
          case InputTypes.datetime:
          case InputTypes.time: {
              const valueAsDate = new Date(value);
              if ((<InputDetailDateTime>inputDetail).forceUTC) {
                  return ZuluDateHelper.getGMTDate(valueAsDate);
              } else {
                  return valueAsDate;
              }
          }
      }

      // Default just pass back original
      return value;
  }

  private fieldChanged(inputDetail: InputDetail, value: any) {
      let returnedValue: any;

      // If we are any 'Object' type input just return the object. Simples.
      if (inputDetail.type && inputDetail.type.endsWith('object')) {
          this.valueUpdated.emit([inputDetail.name, value]);
          returnedValue = value;
      } else if (inputDetail.type === InputTypes.fileattach) {
          returnedValue = value;
      } else if (
          (inputDetail.type && inputDetail.type === InputTypes.date) ||
          inputDetail.type === InputTypes.datetime ||
          inputDetail.type === InputTypes.time
      ) {
          if ((<InputDetailDateTime>inputDetail).forceUTC) {
              returnedValue = ZuluDateHelper.getGMTDate(value);
              this.valueUpdated.emit([inputDetail.name, returnedValue]);
          } else {
              returnedValue = value;
              this.valueUpdated.emit([inputDetail.name, returnedValue]);
          }
      } else if (inputDetail.type === InputTypes.spinner) {
          returnedValue = Number(value);
      } else if (inputDetail.type && inputDetail.type === InputTypes.multiselect) {
          // This is an array
          if (Array.isArray(value)) {
              const asArray = value as Array<ReferenceValueItem>;
              returnedValue = asArray.map(refVal => refVal.value);
          } else {
              returnedValue = [];
          }
      } else {
          if (value) {
              returnedValue = value.toString();
          } else {
              returnedValue = null;
          }

          if (value && value.hasOwnProperty('value')) {
              returnedValue = value.value;
              this.valueUpdated.emit([inputDetail.name, returnedValue]);
          } else {
              this.valueUpdated.emit([inputDetail.name, value]);
          }
      }

      // Do We need to notify another input of this change?
      this.checkForDependencies(inputDetail, returnedValue);

      // Flatten out Objects to value
      const updatedModel = Object.assign({}, this.clonedInputModel);

      updatedModel[inputDetail.name] = returnedValue;

      // Tell subscribers we have changes
      this.modelUpdated.emit(updatedModel);
      this.clonedInputModel = updatedModel;
  }

  private checkForDependencies(inputDetail: InputDetail, updatedValue: any) {
      this.inputBuilderDefinition.inputDetails.forEach(input => {
          if (
              this.form &&
              input.hasOwnProperty('referenceValueSeedDependency') &&
              (<InputDetailReferenceValues>input).referenceValueSeedDependency &&
              (<InputDetailReferenceValues>input).referenceValueSeedDependency === inputDetail.name
          ) {
              this.loadDataSource(
                  input,
                  updatedValue,
                  (<InputDetailReferenceValues>input).referenceValueChildLevel
              ).subscribe(data => {
                  this.dataSourceLookup[input.name] = data.referenceValueItems;

                  const formControl = this.form.controls[inputDetail.name] as FormControl;
                  this.manipulateValuesToObjects(
                      formControl,
                      inputDetail as InputDetailReferenceValues,
                      formControl.value
                  );
              });
          }
      });
  }

  private loadDataSource(inputDetail: InputDetail, seed: string = '', childDepth = 0): Observable<ReferenceValue> {
      return this.refValuesService.getReferenceValue(
          (<InputDetailReferenceValues>inputDetail).referenceValueName,
          seed,
          childDepth
      );
  }

  private mapValidators(inputDetail: InputDetail) {
      const formValidators = [];

      if (inputDetail) {
          // Required
          if (inputDetail.validateRequired) {
              formValidators.push(Validators.required);
          }

          // RequiredTrue
          if (inputDetail.validateRequiredTrue) {
              formValidators.push(Validators.requiredTrue);
          }

          // EMail
          if (inputDetail.validateEmail) {
              formValidators.push(Validators.email);
          }

          // Pattern
          if (inputDetail.validatePattern) {
              formValidators.push(Validators.pattern(inputDetail.validatePattern));
          }

          // Min Length
          if (inputDetail.validateMinLength) {
              formValidators.push(Validators.minLength(inputDetail.validateMinLength));
              if (!inputDetail.validateMinLengthMessage) {
                  inputDetail.validateMinLengthMessage = `${inputDetail.label} must be a minimum length of ${inputDetail.validateMinLength}`;
              }
          }

          // Max Length
          if (inputDetail.validateMaxLength) {
              formValidators.push(Validators.maxLength(inputDetail.validateMaxLength));
              if (!inputDetail.validateMaxLengthMessage) {
                  inputDetail.validateMaxLengthMessage = `${inputDetail.label} must be a max length of ${inputDetail.validateMinLength}`;
              }
          }
      }

      return formValidators;
  }
}
