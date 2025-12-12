import BasePage from './base.page';

class TabBar extends BasePage {
    constructor() {
        super('ion-tab-bar');
    }

    private get readingsTab() {
        return $('[data-testid="readings-tab"]');
    }

    private get appointmentsTab() {
        return $('[data-testid="appointments-tab"]');
    }

    private get profileTab() {
        return $('[data-testid="profile-tab"]');
    }

    private get settingsTab() {
        return $('[data-testid="settings-tab"]');
    }

    async tapReadingsTab() {
        await this.readingsTab.click();
    }

    async tapAppointmentsTab() {
        await this.appointmentsTab.click();
    }

    async tapProfileTab() {
        await this.profileTab.click();
    }

    async tapSettingsTab() {
        await this.settingsTab.click();
    }
}

export default new TabBar();
