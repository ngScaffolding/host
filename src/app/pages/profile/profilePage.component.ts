import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  VersionsService,
  SoftwareVersion,
  UserPreferencesService
} from '../../../modules/core/coreModule';
import { Subscription } from 'rxjs/Subscription';
import { InputBuilderDefinition, OrientationValues } from '@ngscaffolding/models';

@Component({
  templateUrl: './profilePage.component.html',
  styleUrls: ['./profilePage.component.scss']
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  private prefDetailsSub: Subscription;
  private prefValuesSub: Subscription;

  private baseInputDefinition: InputBuilderDefinition = {
    inputDetails: [],
    orientation: OrientationValues.Vertical,
    okButtonText: null,
    cancelButtonText: null
  };

  constructor(private userPrefs: UserPreferencesService) {}

  inputBuilderDefinition = new InputBuilderDefinition();

  userPrefsModel: Array<any> = [];

  ngOnInit() {
    // Load Preference Definitions Here
    this.prefDetailsSub = this.userPrefs.preferenceDefinitionsSubject.subscribe(
      defs => {
        if (defs) {
          // Build our Input Definition from this input
          const newInputDefinition = Object.assign({}, this.baseInputDefinition);

          defs.forEach((value, key) => {
            const inputDef = JSON.parse(value.inputDetails);
            if (inputDef) {
              newInputDefinition.inputDetails.push(inputDef);
            }
          });

          this.inputBuilderDefinition = newInputDefinition;
        }
      }
    );

    // Load User Values Here
    this.prefValuesSub = this.userPrefs.preferenceValuesSubject.subscribe(
      values => {
        if (values) {
          values.forEach((value, key) => {
            this.userPrefsModel[value.name] = value.value;
          });
        }
      }
    );
  }

  valueChanged(changedValue: [string, any]) {
    this.userPrefs.setValue(changedValue[0], changedValue[1]).subscribe();
  }

  notifyChanged(changedValue: any) {
  }

  ngOnDestroy() {
    if (this.prefDetailsSub) {
      this.prefDetailsSub.unsubscribe();
    }
    if (this.prefValuesSub) {
      this.prefValuesSub.unsubscribe();
    }
  }
}
