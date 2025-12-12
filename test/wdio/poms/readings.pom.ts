/// <reference types="webdriverio/async" />

class ReadingsPage {
    public async tapFabButton(): Promise<void> {
        await $('[data-testid="fab-button"]').click();
    }

    public async waitForLoad(): Promise<void> {
        await $('[data-testid="readings-list"]').waitForExist({ timeout: 10000 });
    }

    public async getFirstReading(): Promise<{ value: string }> {
        const reading = await $('[data-testid="reading-item"]');
        return {
            value: await reading.getText()
        };
    }
}

export default new ReadingsPage();
