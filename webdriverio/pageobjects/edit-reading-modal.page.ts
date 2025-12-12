import BasePage from './base.page';

class EditReadingModal extends BasePage {
    constructor() {
        super('app-edit-reading-modal');
    }

    private get glucoseInput() {
        return $('[data-testid="glucose-input"]');
    }

    private get saveButton() {
        return $('[data-testid="save-reading-button"]');
    }

    async getGlucoseValue() {
        return this.glucoseInput.getValue();
    }

    async clearGlucoseValue() {
        await this.glucoseInput.clearValue();
    }

    async enterGlucoseValue(value: string) {
        await this.glucoseInput.addValue(value);
    }

    async tapSave() {
        await this.saveButton.click();
    }
}

export default new EditReadingModal();
