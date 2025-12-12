import { Page } from './Page';

class ReadingsPage extends Page {
    get addReadingButton() { return $('[data-testid="add-reading-btn"]'); }
}

export default new ReadingsPage();
