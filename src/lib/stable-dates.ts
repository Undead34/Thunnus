/**
 * Representa una hora del día (formato 24h).
 */
type TimeOfDay = {
    hour: number;   // 0–23
    minute: number; // 0–59
};

/**
 * Opciones para generar las fechas estables.
 */
interface StableDatesOptions {
    /** Días antes de la fecha futura para generar la fecha pasada. */
    daysBefore: number;
    /** Días después de la fecha pasada para generar la fecha futura. */
    daysAfter: number;
    /** Hora y minuto de la fecha pasada (GMT). */
    pastTime: TimeOfDay;
    /** Hora y minuto de la fecha futura (hora local). */
    futureTime: TimeOfDay;
}

/**
 * Resultado con las dos fechas ya formateadas.
 */
interface StableDates {
    past: string;   // Ej: "24/06/2025 00:33 (GMT)"
    future: string; // Ej: "04/07/2025 a las 10:00 AM (hora local)"
}

/**
 * Genera dos fechas "estables" en bloques de tiempo fijos.  
 * Mientras no se supere la fecha futura, la pareja de fechas seguirá siendo la misma.
 *
 * @param opts Opciones de configuración (todos tienen valor por defecto).
 * @returns Objeto con `past` y `future` ya formateadas.
 */
export function getStableDates(
    opts: Partial<StableDatesOptions> = {}
): StableDates {
    // Valores por defecto
    const {
        daysBefore = 3,
        daysAfter = 7,
        pastTime = { hour: 0, minute: 33 },
        futureTime = { hour: 10, minute: 0 },
    } = opts;

    const MS_PER_DAY = 24 * 60 * 60 * 1_000;
    const nowMs = Date.now();
    const periodMs = (daysBefore + daysAfter) * MS_PER_DAY;
    const offsetMs = daysBefore * MS_PER_DAY;

    // Calculamos el índice de bloque con ceil para incluir el offset
    const blockIndex = Math.ceil((nowMs - offsetMs) / periodMs);
    const futureBaseMs = blockIndex * periodMs + offsetMs;
    const pastBaseMs = futureBaseMs - offsetMs;

    // Creamos los objetos Date y ajustamos horas/minutos
    const pastDate = new Date(pastBaseMs);
    pastDate.setUTCHours(pastTime.hour, pastTime.minute, 0, 0);

    const futureDate = new Date(futureBaseMs);
    futureDate.setHours(futureTime.hour, futureTime.minute, 0, 0);

    const pad2 = (n: number) => String(n).padStart(2, '0');

    // Formateo GMT para la fecha pasada
    const pastStr = [
        pad2(pastDate.getUTCDate()),
        pad2(pastDate.getUTCMonth() + 1),
        pastDate.getUTCFullYear(),
    ].join('/') +
        ' ' +
        pad2(pastDate.getUTCHours()) +
        ':' +
        pad2(pastDate.getUTCMinutes()) +
        ' (GMT)';

    // Formateo local para la fecha futura, con AM/PM
    let h = futureDate.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const futureStr = [
        pad2(futureDate.getDate()),
        pad2(futureDate.getMonth() + 1),
        futureDate.getFullYear(),
    ].join('/') +
        ' a las ' +
        pad2(h) +
        ':' +
        pad2(futureDate.getMinutes()) +
        ` ${ampm} (hora local)`;

    return { past: pastStr, future: futureStr };
}
