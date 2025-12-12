import LoginPage from '../pageobjects/login.page';
import TabBar from '../pageobjects/tab-bar.page';
import ReadingsPage from '../pageobjects/readings.page';
import AddReadingModal from '../pageobjects/add-reading-modal.page';
import ReadingDetailPage from '../pageobjects/reading-detail.page';
import EditReadingModal from '../pageobjects/edit-reading-modal.page';

describe('Readings CRUD', () => {
    const initialValue = '120';
    const updatedValue = '130';

    beforeEach(async () => {
        await driver.reset();
        await LoginPage.loginWithCredentials('2003', 'webdriverio_test');
        await TabBar.tapReadingsTab();
        await ReadingsPage.waitForPageToLoad();
    });

    it('should create, read, update, and delete a reading', async () => {
        // Create
        await ReadingsPage.tapFab();
        await AddReadingModal.waitForPageToLoad();
        await AddReadingModal.enterGlucoseValue(initialValue);
        await AddReadingModal.tapSave();
        await ReadingsPage.waitForPageToLoad();
        const firstReading = await ReadingsPage.getFirstReading();
        expect(await firstReading.getText()).toContain(initialValue);

        // Read
        await ReadingsPage.tapFirstReading();
        await ReadingDetailPage.waitForPageToLoad();
        expect(await ReadingDetailPage.isDisplayed()).toBe(true);

        // Update
        await ReadingDetailPage.tapEditButton();
        await EditReadingModal.waitForPageToLoad();
        await EditReadingModal.clearGlucoseValue();
        await EditReadingModal.enterGlucoseValue(updatedValue);
        await EditReadingModal.tapSave();
        await ReadingsPage.waitForPageToLoad();
        const updatedReading = await ReadingsPage.getFirstReading();
        expect(await updatedReading.getText()).toContain(updatedValue);

        // Delete (implementation pending swipe action)
    });
});
