import { Page } from './Page';

class DashboardPage extends Page {
    get readingsTab() { return $('//*[contains(text(),"Lecturas") or contains(text(),"Readings")]'); }
    get appointmentsTab() { return $('//*[contains(text(),"Citas") or contains(text(),"Appointments")]'); }
    get profileTab() { return $('//*[contains(text(),"Perfil") or contains(text(),"Profile")]'); }
}

export default new DashboardPage();
