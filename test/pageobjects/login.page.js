
class LoginPage {
    get userIdInput() {
        return $('//android.widget.EditText[@resource-id="ion-input-0"]');
    }

    get passwordInput() {
        return $('//android.widget.EditText[@resource-id="ion-input-1"]');
    }

    get loginButton() {
        return $('//android.widget.Button[@resource-id="login-btn"]');
    }

    get errorMessage() {
        return $('//android.widget.TextView[contains(@text, "Invalid")]');
    }

    async enterUserId(userId) {
        await this.userIdInput.setValue(userId);
    }

    async enterPassword(password) {
        await this.passwordInput.setValue(password);
    }

    async tapLogin() {
        await this.loginButton.click();
    }

    async getErrorMessage() {
        return this.errorMessage.getText();
    }
}

module.exports = new LoginPage();
