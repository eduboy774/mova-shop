import { Component, inject } from '@angular/core';
import { SettingsService } from '../core/services/settings.service';

@Component({
    selector: 'footer',
    templateUrl: './footer.html',
})
export class FooterComponent {
    settings = inject(SettingsService);
    currYear: number = new Date().getFullYear();
}
