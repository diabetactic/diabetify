import LoginPage from '../pageobjects/login.page';
import TabBar from '../pageobjects/tab-bar.page';

describe('Login', () => {
    beforeEach(async () => {
        await driver.reset();
    });

    it('should login with valid credentials', async () => {
        await LoginPage.loginWithCredentials('2003', 'webdriverio_test');
        await TabBar.waitForPageToLoad();
        expect(await TabBar.isDisplayed()).toBe(true);
    });

    it('should not login with invalid credentials', async () => {
        await LoginPage.loginWithCredentials('invalid', 'invalid');
        expect(await LoginPage.isDisplayed()).toBe(true);
    });

    it('should not login with empty credentials', async () => {
        await LoginPage.loginWithCredentials('', '');
        expect(await LoginPage.isDisplayed()).toBe(true);
    });

    it('should not login with empty username', async () => {
        await LoginPage.loginWithCredentials('', 'webdriverio_test');
        expect(await LoginPage.isDisplayed()).toBe(true);
    });

    it('should not login with empty password', async () => {
        await LoginPage.loginWithCredentials('2003', '');
        expect(await LoginPage.isDisplayed()).toBe(true);
    });
});
