import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  VersionsService,
  SoftwareVersion,
  UserPreferencesService
} from '../../../modules/core/coreModule';
import { Subscription } from 'rxjs/Subscription';
import {
  InputBuilderDefinition,
  OrientationValues
} from '@ngscaffolding/models';

@Component({
  templateUrl: './profilePage.component.html',
  styleUrls: ['./profilePage.component.scss']
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  private prefDetailsSub: Subscription;
  private prefValuesSub: Subscription;

  constructor(private userPrefs: UserPreferencesService) {}

  inputBuilderDefinition = new InputBuilderDefinition();

  userPrefsModel: any = {};

  ngOnInit() {
    // Load Preference Definitions Here
    this.prefDetailsSub = this.userPrefs.preferenceDefinitionsSubject.subscribe(
      defs => {
        if (defs) {
          const profile = defs.find(def => def.name === 'UserPrefs_Profile');

          if (profile) {
            this.inputBuilderDefinition = JSON.parse(profile.inputDetails);
          }
        }
      }
    );

    // Load User Values Here
    this.prefValuesSub = this.userPrefs.preferenceValuesSubject.subscribe(
      values => {
        if (values) {
          const userValue = values.find(
            value => value.name === 'UserPrefs_Profile'
          );
          if (userValue) {
            this.userPrefsModel = JSON.parse(userValue.value);
          }
        }
      }
    );
  }

  valueChanged(changedValue: [string, any]) {
    //this.userPrefs.setValue(changedValue[0], changedValue[1]).subscribe();
  }

  notifyChanged(changedValue: any) {}

  ngOnDestroy() {
    if (this.prefDetailsSub) {
      this.prefDetailsSub.unsubscribe();
    }
    if (this.prefValuesSub) {
      this.prefValuesSub.unsubscribe();
    }
  }
}
