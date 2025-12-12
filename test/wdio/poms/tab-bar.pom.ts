/// <reference types="webdriverio/async" />

class TabBar {
    public async tapReadingsTab(): Promise<void> {
        await $('[data-testid="readings-tab"]').click();
    }
}

export default new TabBar();
