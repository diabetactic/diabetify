
class WelcomePage {
    get getStartedButton() {
        return $('//android.widget.Button[@text="Let\'s Go!"] | //android.widget.Button[@text="¡Vamos!"]');
    }

    async tapGetStarted() {
        await this.getStartedButton.click();
    }
}

module.exports = new WelcomePage();
