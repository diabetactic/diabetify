import BasePage from './base.page';

class ReadingsPage extends BasePage {
    constructor() {
        super('app-readings');
    }

    private get readingsList() {
        return $('[data-testid="readings-list"]');
    }

    private get fab() {
        return $('[data-testid="add-reading-fab"]');
    }

    async tapFirstReading() {
        await this.readingsList.$('ion-item').click();
    }

    async getFirstReading() {
        return this.readingsList.$('ion-item');
    }

    async tapFab() {
        await this.fab.click();
    }
}

export default new ReadingsPage();
