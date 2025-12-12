describe('Diabetactic App', () => {
  it('should open the app and have the correct package name', async () => {
    const packageName = await driver.getCurrentPackage();
    expect(packageName).toEqual('io.diabetactic.app');
  });

  it('should find the welcome text', async () => {
    const welcomeText = await $('//android.widget.TextView[@text="Welcome to Diabetactic"]');
    await welcomeText.waitForDisplayed({ timeout: 30000 });
    expect(await welcomeText.isDisplayed()).toBe(true);
  });
});
