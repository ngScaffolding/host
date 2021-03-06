import { Component } from '@angular/core';
import { AppComponent } from './app.component';
import { AppSettingsService, UserAuthenticationBase, AppSettingsQuery, UserAuthenticationQuery } from 'ngscaffolding-core';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { Observable } from 'rxjs';
import { AppSettings } from 'ngscaffolding-models';

@Component({
  selector: 'app-inline-profile',
  template: `
    <div class="profile" [ngClass]="{ 'profile-expanded': active }">
      <a href="#" (click)="onClick($event)">
        <img *ngIf="(showProfilePicture$ | async);else plainImage" class="profile-image" src="assets/layout/images/avatar.png" />
        <ng-template #plainImage>
        <!-- <i class="material-icons">person_outline</i> -->
          <span>Profile</span>
          <!--<img class="profile-image" src="assets/layout/images/avatar1.png" />-->
        </ng-template>

        <span class="profile-name">{{ (authQuery.currentUser$ | async )?.name }}</span> <i class="material-icons">keyboard_arrow_down</i>
      </a>
    </div>

    <ul class="ultima-menu profile-menu" [@menu]="active ? 'visible' : 'hidden'">
      <li role="menuitem" *ngIf="(showProfileSetting$ | async)">
        <a href="#" routerLink="/profile" class="ripplelink" [attr.tabindex]="!active ? '-1' : null">
          <i class="material-icons">person</i> <span>{{'Profile' | translate}}</span>
        </a>
      </li>
      <li role="menuitem" *ngIf="(showUserSetting$ | async)">
        <a href="#" routerLink="usersettings" class="ripplelink" [attr.tabindex]="!active ? '-1' : null">
          <i class="material-icons">settings_application</i> <span>{{'Settings' | translate}}</span>
        </a>
      </li>
      <li role="menuitem">
        <a href="#" routerLink="about" class="ripplelink" [attr.tabindex]="!active ? '-1' : null">
          <i class="material-icons">description</i> <span>{{'About' | translate}}</span>
        </a>
      </li>
      <li role="menuitem">
        <a href="#" routerLink="changepassword" class="ripplelink" [attr.tabindex]="!active ? '-1' : null">
          <i class="material-icons">vpn_key</i> <span>{{'Change Password' | translate}}</span>
        </a>
      </li>
      <li role="menuitem">
        <a href="#" routerLink="logoff" class="ripplelink" [attr.tabindex]="!active ? '-1' : null">
          <i class="material-icons">power_settings_new</i> <span>{{'Logout' | translate}}</span>
        </a>
      </li>
    </ul>
  `,
  animations: [
    trigger('menu', [
      state(
        'hidden',
        style({
          height: '0px'
        })
      ),
      state(
        'visible',
        style({
          height: '*'
        })
      ),
      transition('visible => hidden', animate('400ms cubic-bezier(0.86, 0, 0.07, 1)')),
      transition('hidden => visible', animate('400ms cubic-bezier(0.86, 0, 0.07, 1)'))
    ])
  ]
})
export class AppInlineProfileComponent {
  active: boolean;
  showProfilePicture$: Observable<boolean>;
  showProfileSetting$: Observable<boolean>;
  showUserSetting$: Observable<boolean>;

  constructor(public app: AppComponent,public authQuery: UserAuthenticationQuery, public appSettingsQuery: AppSettingsQuery, public authService: UserAuthenticationBase) {
    this.showProfilePicture$ = appSettingsQuery.selectEntity(AppSettings.showProfilePicture, e => e.value);
    this.showProfileSetting$ = appSettingsQuery.selectEntity(AppSettings.showProfileSetting, e => e.value);
    this.showUserSetting$ = appSettingsQuery.selectEntity(AppSettings.showUserSetting, e => e.value);
  }

  onClick(event) {
    this.active = !this.active;
    setTimeout(() => {
      this.app.layoutMenuScrollerViewChild.moveBar();
    }, 450);
    event.preventDefault();
  }
}
