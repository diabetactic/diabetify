import axios from 'axios';

const backofficeUrl = process.env.BACKOFFICE_URL || 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';
const username = process.env.BACKOFFICE_USERNAME || 'admin';
const password = process.env.BACKOFFICE_PASSWORD || 'admin';

async function getAuthToken() {
    const response = await axios.post(`${backofficeUrl}/api/token`, {
        username,
        password,
    });
    return response.data.token;
}

async function getAppointments(token: string) {
    const response = await axios.get(`${backofficeUrl}/api/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
}

async function setAppointmentStatus(token: string, appointmentId: string, status: 'accepted' | 'denied') {
    await axios.patch(`${backofficeUrl}/api/appointments/${appointmentId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
    );
}

export async function acceptAppointment(appointmentId: string) {
    const token = await getAuthToken();
    await setAppointmentStatus(token, appointmentId, 'accepted');
}

export async function denyAppointment(appointmentId: string) {
    const token = await getAuthToken();
    await setAppointmentStatus(token, appointmentId, 'denied');
}

export async function clearAppointments() {
    const token = await getAuthToken();
    const appointments = await getAppointments(token);
    for (const appt of appointments) {
        if (appt.user.dni === '2003') {
            await axios.delete(`${backofficeUrl}/api/appointments/${appt.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
        }
    }
}
