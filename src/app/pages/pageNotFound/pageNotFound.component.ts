import { Component, OnInit } from '@angular/core';
import { LoggingService, AppSettingsService } from '../../../modules/core/coreModule';
import { Router, ActivatedRoute } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
// import {MessageService} from 'primeng/components/common/messageservice';

@Component({
  templateUrl: 'pageNotFound.component.html',
  styles: ['pageNotFound.component.scss']
})
export class PageNotFoundComponent implements OnInit {

  private readonly defaultMessage = 'The page you requested could not be found';
  message: string;

  constructor(private logger: LoggingService, private appSettings: AppSettingsService
  ) {
      this.message = appSettings.pageNotFoundText || this.defaultMessage;
  }

  ngOnInit() {
  }
}