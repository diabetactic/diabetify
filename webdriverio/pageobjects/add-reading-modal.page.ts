import BasePage from './base.page';

class AddReadingModal extends BasePage {
    constructor() {
        super('app-add-reading-modal');
    }

    private get glucoseInput() {
        return $('[data-testid="glucose-input"]');
    }

    private get saveButton() {
        return $('[data-testid="save-reading-button"]');
    }

    async enterGlucoseValue(value: string) {
        await this.glucoseInput.addValue(value);
    }

    async tapSave() {
        await this.saveButton.click();
    }
}

export default new AddReadingModal();
