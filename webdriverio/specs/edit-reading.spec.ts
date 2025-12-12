import LoginPage from '../pageobjects/login.page';
import TabBar from '../pageobjects/tab-bar.page';
import ReadingsPage from '../pageobjects/readings.page';
import ReadingDetailPage from '../pageobjects/reading-detail.page';
import EditReadingModal from '../pageobjects/edit-reading-modal.page';

describe('Edit Reading', () => {
    const updatedValue = '151';

    beforeEach(async () => {
        await driver.reset();
        await LoginPage.loginWithCredentials('2003', 'webdriverio_test');
        await TabBar.tapReadingsTab();
        await ReadingsPage.waitForPageToLoad();
    });

    it('should allow a user to edit a glucose reading', async () => {
        // Navigate to the reading detail
        await ReadingsPage.tapFirstReading();
        await ReadingDetailPage.waitForPageToLoad();
        expect(await ReadingDetailPage.isDisplayed()).toBe(true);

        // Enter edit mode
        await ReadingDetailPage.tapEditButton();
        await EditReadingModal.waitForPageToLoad();
        const originalValue = await EditReadingModal.getGlucoseValue();
        expect(originalValue).toBeTruthy();

        // Update the value
        await EditReadingModal.clearGlucoseValue();
        await EditReadingModal.enterGlucoseValue(updatedValue);
        await EditReadingModal.tapSave();

        // Verify the new value is displayed on the readings list
        await ReadingsPage.waitForPageToLoad();
        const firstReading = await ReadingsPage.getFirstReading();
        expect(await firstReading.getText()).toContain(updatedValue);
    });
});
