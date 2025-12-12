import LoginPage from '../poms/login.page';
import TabBar from '../poms/tab-bar.pom';
import ReadingsPage from '../poms/readings.pom';
import AddReadingModal from '../poms/add-reading-modal.pom';

describe('Add Reading', () => {
  const testGlucoseValue = Math.floor(Math.random() * 100) + 80; // 80-180 range

  before(async () => {
    await LoginPage.loginWithCredentials('1000', 'tuvieja');
    await TabBar.tapReadingsTab();
  });

  it('should open add reading modal via FAB', async () => {
    await ReadingsPage.tapFabButton();
    await AddReadingModal.waitForLoad();

    expect(await AddReadingModal.isDisplayed()).toBe(true);
  });

  it('should add reading with glucose value', async () => {
    await AddReadingModal.enterGlucoseValue(testGlucoseValue.toString());
    await AddReadingModal.tapSave();

    await ReadingsPage.waitForLoad();
    const latestReading = await ReadingsPage.getFirstReading();
    expect(latestReading.value).toContain(testGlucoseValue.toString());
  });

  it('should validate glucose value range', async () => {
    await ReadingsPage.tapFabButton();
    await AddReadingModal.enterGlucoseValue('999');
    await AddReadingModal.tapSave();

    expect(await AddReadingModal.hasValidationError()).toBe(true);
  });
});
