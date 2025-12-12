/// <reference types="webdriverio/async" />

class LoginPage {
    public async loginWithCredentials(username: string, password: string): Promise<void> {
        await $('[data-testid="username-input"]').setValue(username);
        await $('[data-testid="password-input"]').setValue(password);
        await $('[data-testid="login-button"]').click();
    }
}

export default new LoginPage();
