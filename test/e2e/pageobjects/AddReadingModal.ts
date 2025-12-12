import { Page } from './Page';

class AddReadingModal extends Page {
    get glucoseInput() { return $('ion-input[formControlName="glucose"]').$('input'); }
    get saveButton() { return $('[data-testid="save-reading-btn"]'); }
}

export default new AddReadingModal();
