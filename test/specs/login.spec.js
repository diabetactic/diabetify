
const WelcomePage = require('../pageobjects/welcome.page');
const LoginPage = require('../pageobjects/login.page');
const DashboardPage = require('../pageobjects/dashboard.page');

describe('Login Flow', () => {
    beforeEach(async () => {
        await driver.reset();
        await WelcomePage.tapGetStarted();
    });

    it('should login with valid credentials', async () => {
        await LoginPage.enterUserId('1000');
        await LoginPage.enterPassword('tuvieja');
        await LoginPage.tapLogin();

        await expect(DashboardPage.dashboardTitle).toBeDisplayed();
    });

    it('should show error for invalid credentials', async () => {
        await LoginPage.enterUserId('invalid');
        await LoginPage.enterPassword('wrong');
        await LoginPage.tapLogin();

        await expect(LoginPage.errorMessage).toBeDisplayed();
    });
});
