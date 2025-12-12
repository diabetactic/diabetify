import { Page } from './Page';

class AppointmentsPage extends Page {
    get addAppointmentButton() { return $('[data-testid="add-appointment-btn"]'); }
}

export default new AppointmentsPage();
