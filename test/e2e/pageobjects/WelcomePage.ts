import { Page } from './Page';

class WelcomePage extends Page {
    get loginButton() { return $('[data-testid="login-btn"]'); }
    get createAccountButton() { return $('[data-testid="create-account-btn"]'); }
}

export default new WelcomePage();
