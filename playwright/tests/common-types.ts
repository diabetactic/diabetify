export interface Appointment {
  id?: string;
  appointment_id?: string;
  queue_placement?: number;
  glucose_objective?: number;
  insulin_type?: string;
  dose?: number;
  status?: string;
  created_at?: string;
  user_id?: string;
  date?: string;
  time?: string;
  [key: string]: unknown;
}

export interface QueueState {
  state: string;
  queue_placement?: number;
  [key: string]: unknown;
}

export interface LoginResponse {
  access_token: string;
  token?: string;
  user?: {
    id: string;
    username: string;
  };
}
