/// <reference types="webdriverio/async" />

class AddReadingModal {
    public async waitForLoad(): Promise<void> {
        await $('[data-testid="add-reading-modal"]').waitForExist({ timeout: 5000 });
    }

    public async isDisplayed(): Promise<boolean> {
        return $('[data-testid="add-reading-modal"]').isDisplayed();
    }

    public async enterGlucoseValue(value: string): Promise<void> {
        await $('[data-testid="glucose-input"]').setValue(value);
    }

    public async tapSave(): Promise<void> {
        await $('[data-testid="save-reading-btn"]').click();
    }

    public async hasValidationError(): Promise<boolean> {
        return $('[data-testid="validation-error"]').isDisplayed();
    }
}

export default new AddReadingModal();
