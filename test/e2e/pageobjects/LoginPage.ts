import { Page } from './Page';

class LoginPage extends Page {
    get emailInput() { return $('ion-input[formControlName="email"]').$('input'); }
    get passwordInput() { return $('ion-input[formControlName="password"]').$('input'); }
    get loginButton() { return $('[data-testid="login-btn"]'); }
}

export default new LoginPage();
