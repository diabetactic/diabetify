class BasePage {
    private selector: string;

    constructor(selector: string) {
        this.selector = selector;
    }

    async waitForPageToLoad() {
        await $(this.selector).waitForDisplayed();
    }

    async switchToWebview() {
        const contexts = await driver.getContexts();
        const webviewContext = contexts.find((context) => context.includes('WEBVIEW'));
        if (webviewContext) {
            await driver.switchContext(webviewContext);
        } else {
            throw new Error('Webview context not found');
        }
    }

    async switchToNative() {
        await driver.switchContext('NATIVE_APP');
    }

    async takeScreenshot(filename: string) {
        await driver.saveScreenshot(`./screenshots/${filename}.png`);
    }
}

export default BasePage;
