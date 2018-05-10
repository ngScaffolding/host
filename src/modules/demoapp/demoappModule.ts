import { NgModule, ModuleWithProviders } from '@angular/core';
import { VERSION } from './version';
import { CommonModule } from '@angular/common';

import { RouterModule, Routes } from '@angular/router';

import { AppSettings } from '@ngscaffolding/models';

import { AppSettingsService, MenuService, LoggingService, VersionsService } from '../core/coreModule';

import { InputBuilderModule } from '../inputbuilder/inputbuilderModule';

import { DatagridModule } from '../datagrid/datagridModule';

import { InputBuilderSimpleComponent } from './pages/inputBuilderSimple/inputBuilderSimple.component';
import { DatagridSampleComponent } from './pages/dataGridSample/dataGridSample.component';

export * from './pages/inputBuilderSimple/inputBuilderSimple.component';

const appRoutes: Routes = [
  { path: 'inputbuildersimple', component: InputBuilderSimpleComponent },
  { path: 'inputbuildersimpletest', component: InputBuilderSimpleComponent },
  { path: 'datagridtest', component: DatagridSampleComponent }
];

@NgModule({
  imports: [
    CommonModule,
    InputBuilderModule,
    DatagridModule,
    RouterModule.forChild(appRoutes)
  ],
  declarations: [
    InputBuilderSimpleComponent,
    DatagridSampleComponent
  ],
  exports: [
    InputBuilderSimpleComponent,
    DatagridSampleComponent,
    RouterModule
  ]
})
export class DemoAppModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: DemoAppModule
    };
  }

  constructor(
    appSettingsService: AppSettingsService,
    menuService: MenuService,
    logger: LoggingService, versions: VersionsService
  ) {
    logger.info('Setting Values', 'demoApp.startup');

    versions.addVersion('@ngscaffolding/demoapp', VERSION.version, true);

    const settings: AppSettings = new AppSettings();
    settings.title = 'ngScaffolding Demo';
    settings.apiHome = 'http://localhost:50000';
    settings.apiAuth = 'http://localhost:50020';
    settings.errorLogConsole = true;
    settings.errorLogServer = true;
    settings.errorShowUser = true;

    settings.inputShowCalendarIcon = true;

    settings.showFullMessages = false;
    settings.showToastMessages = true;
    settings.authClientId = 'ngscaffolding_client';
    settings.authClientSecret = 'secret';
    settings.authScope = 'ngscaffoldingAPI';
    settings.authShowForgotPassword = true;
    settings.authShowRegister = true;
    settings.authShowRememberMe = true;
    settings.authSaveinLocalStorage = true;
    settings.authTermsAndConditions =
      'Demo Application Your Terms and Conditions Here. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Odio pellentesque diam volutpat commodo sed egestas.';

    appSettingsService.setValues(settings);

    menuService.addMenuItems([
      {label: 'DataGrid Samples',
    items:[
      {
        label: 'Data Grid Test',
        icon: 'grid',
        routerLink: 'datagridtest'
      }
    ]},
      {
        label: 'Input Builder (Simple)',
        items: [
          {
            label: 'Input Builder (Works)',
            icon: 'brush',
            routerLink: 'inputbuildersimple'
          }
        ]
      }
    ]);
  }
}