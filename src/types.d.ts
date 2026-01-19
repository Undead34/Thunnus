import type { Timestamp } from "firebase/firestore";

// Interface principal del usuario
export interface PhishingUser {
  id: string;
  name: string;
  email: string;
  group: string;
  status: UserStatus;
  clickCount: number;
  sessionsNum: number;
  capturedCredentials?: CapturedCredentials;
  metadata: UserMetadata;
  sessions?: Session[];
  events?: Event[];
  tags?: { name: string; color: string }[];
}

// Estado del usuario
export interface UserStatus {
  emailSended: boolean;
  emailOpened: boolean;
  linkClicked: boolean;
  formSubmitted: boolean;
  emailOpenedAt: Timestamp | null;
  firstClickAt: Timestamp | null;
  lastClickAt: Timestamp | null;
}

// Credenciales capturadas (cifradas)
export interface CapturedCredentials {
  email?: string;
  password?: string;
  submittedAt: Timestamp;
}

// Metadatos técnicos
export interface UserMetadata {
  ip: string;
  userAgent: string;
  geolocation: Geolocation;
  device: DeviceInfo;
  referralSource?: string;
}

export interface Geolocation {
  lat: number;
  lon: number;
  city?: string;
  country?: string;
}

export interface DeviceInfo {
  os: string;
  browser: string;
  screenResolution: string;
}

// Sesiones de interacción
export interface Session {
  id: string;
  startedAt: string;
  endedAt: string;
  duration: number; // en segundos
  eventsCount: number;
  events: EventDetails[];
}

export interface EventDetails {
  type: string;
  timestamp: string;
  data: any;
}

export interface SMTP {
  provider?: "smtp" | "microsoft";
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}
