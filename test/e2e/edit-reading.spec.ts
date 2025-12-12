import LoginPage from '../pageobjects/login.page';
import TabBar from '../pageobjects/tab-bar.page';
import ReadingsPage from '../pageobjects/readings.page';
import ReadingDetailPage from '../pageobjects/reading-detail.page';
import EditReadingModal from '../pageobjects/edit-reading-modal.page';

describe('Edit Reading', () => {
  const updatedValue = '150';

  before(async () => {
    await LoginPage.loginWithCredentials('1000', 'tuvieja');
    await TabBar.tapReadingsTab();
    await ReadingsPage.waitForLoad();
  });

  it('should open reading detail on tap', async () => {
    await ReadingsPage.tapFirstReading();
    await ReadingDetailPage.waitForLoad();

    expect(await ReadingDetailPage.isDisplayed()).toBe(true);
  });

  it('should enter edit mode', async () => {
    await ReadingDetailPage.tapEditButton();
    await EditReadingModal.waitForLoad();

    expect(await EditReadingModal.getGlucoseValue()).toBeTruthy();
  });

  it('should update glucose value', async () => {
    await EditReadingModal.clearGlucoseValue();
    await EditReadingModal.enterGlucoseValue(updatedValue);
    await EditReadingModal.tapSave();

    await ReadingsPage.waitForLoad();
    const firstReading = await ReadingsPage.getFirstReading();
    expect(firstReading.value).toContain(updatedValue);
  });
});
