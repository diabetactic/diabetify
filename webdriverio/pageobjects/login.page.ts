import BasePage from './base.page';

class LoginPage extends BasePage {
    constructor() {
        super('app-login');
    }

    private get usernameField() {
        return $('[data-testid="email-input"]');
    }

    private get passwordField() {
        return $('[data-testid="password-input"]');
    }

    private get loginButton() {
        return $('[data-testid="login-button"]');
    }

    async loginWithCredentials(username, password) {
        await this.usernameField.setValue(username);
        await this.passwordField.setValue(password);
        await this.loginButton.click();
    }
}

export default new LoginPage();
