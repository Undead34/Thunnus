import { Timestamp } from 'firebase/firestore';

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
}

// Estado del usuario
export interface UserStatus {
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
    startedAt: Timestamp;
    endedAt: Timestamp;
    duration: number; // en segundos
    eventsCount: number;
    deviceInfo: {
        ip: string;
        userAgent: string;
        os: string;
        browser: string;
    };
}

// Eventos específicos
export interface Event {
    id: string;
    type: 'email_open' | 'link_click' | 'form_submit' | 'page_view';
    timestamp: Timestamp;
    elementId?: string;
    details: EventDetails;
}

export interface EventDetails {
    url?: string;
    formData?: Record<string, string>;
    screenshotUrl?: string;
}

// Tipo para los eventos (para type safety)
export type EventType =
    | 'email_open'
    | 'link_click'
    | 'form_submit'
    | 'page_view';
