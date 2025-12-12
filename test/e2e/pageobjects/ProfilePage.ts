import { Page } from './Page';

class ProfilePage extends Page {
    get logoutButton() { return $('[data-testid="logout-btn"]'); }
}

export default new ProfilePage();
