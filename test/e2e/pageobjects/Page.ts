export class Page {
  async waitForIonicHydration(timeout = 10000): Promise<void> {
    await browser.waitUntil(
      async () => {
        const ionApp = await $('ion-app');
        return ionApp.isDisplayed();
      },
      { timeout, timeoutMsg: 'Ionic app did not hydrate' }
    );
  }

  async switchToWebView(): Promise<void> {
    const contexts = await browser.getContexts() as string[];
    const webview = contexts.find(c => c.includes('WEBVIEW'));
    if (webview) await browser.switchContext(webview);
  }
}
