import { NgModule, ModuleWithProviders } from '@angular/core';
import { VERSION } from './version';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VersionsService } from '../core/coreModule';

import { InputBuilderComponent } from './inputBuilder/inputBuilder.component';
import { InputBuilderPopupComponent } from './inputBuilderPopup/inputBuilderPopup.component';

import {
  DialogModule,
  InputTextModule,
  InputSwitchModule,
  CalendarModule,
  EditorModule,
  ListboxModule,
  InputTextareaModule,
  ColorPickerModule,
  SpinnerModule,
  SliderModule,
  ChipsModule,
  CheckboxModule,
  SelectButtonModule,
  RadioButtonModule,
  DropdownModule,
  TriStateCheckboxModule,
  PasswordModule,
  RatingModule,
  AutoCompleteModule,
  MultiSelectModule, ToggleButtonModule, TooltipModule
} from 'primeng/primeng';

export * from './inputBuilder/inputBuilder.component';
export * from './inputBuilderPopup/inputBuilderPopup.component';

@NgModule({
  imports: [
    CommonModule,
    AutoCompleteModule,
    FormsModule,
    DialogModule,
    EditorModule,
    ListboxModule,
    SelectButtonModule,
    ColorPickerModule,
    SliderModule,
    ChipsModule,
    ReactiveFormsModule,
    InputSwitchModule,
    InputTextModule,
    SpinnerModule,
    CalendarModule,
    TriStateCheckboxModule,
    InputTextareaModule,
    CheckboxModule,
    RadioButtonModule,
    DropdownModule,
    PasswordModule,
    RatingModule,
    MultiSelectModule, ToggleButtonModule, TooltipModule
  ],
  declarations: [
    InputBuilderComponent,
    InputBuilderPopupComponent
  ],
  exports: [
    InputBuilderComponent,
    InputBuilderPopupComponent
  ]
})
export class InputBuilderModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: InputBuilderModule,
      providers: [
        // SampleService
      ]
    };
  }
  constructor(versions: VersionsService) {
    versions.addVersion('@ngscaffolding/inputbuilder', VERSION.version);
  }
}
