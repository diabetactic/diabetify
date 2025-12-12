import BasePage from './base.page';

class ReadingDetailPage extends BasePage {
    constructor() {
        super('app-reading-detail');
    }

    private get editButton() {
        return $('[data-testid="edit-reading-button"]');
    }

    async isDisplayed() {
        return await $('app-reading-detail').isDisplayed();
    }

    async tapEditButton() {
        await this.editButton.click();
    }
}

export default new ReadingDetailPage();
