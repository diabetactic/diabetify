
class DashboardPage {
    get dashboardTitle() {
        return $('//android.widget.TextView[@text="Dashboard"] | //android.widget.TextView[@text="Panel"]');
    }

    async isDisplayed() {
        return this.dashboardTitle.isDisplayed();
    }
}

module.exports = new DashboardPage();
