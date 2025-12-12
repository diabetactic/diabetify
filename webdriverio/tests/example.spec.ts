import { expect } from '@wdio/globals'

describe('My Login application', () => {
    it('should login with valid credentials', async () => {
        // Switch to WebView for Ionic content
        const contexts = await driver.getContexts();
        const webview = contexts.find((c: string) => c.includes('WEBVIEW'));
        await driver.switchContext(webview as string);

        // Your test code here

        // Switch back to native for Android UI
        await driver.switchContext('NATIVE_APP');
    })
})
