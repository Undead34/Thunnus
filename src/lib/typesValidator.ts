import { z } from "zod";
import { Timestamp } from "firebase/firestore";

// Esquema para Timestamp (validación personalizada)
const TimestampSchema = z.instanceof(Timestamp);

// Esquema principal con valores por defecto
export const PhishingUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  group: z.string().default("default"), // Valor por defecto para "group"
  status: z.object({
    emailSended: z.boolean().default(false),
    emailOpened: z.boolean().default(false), // Valor por defecto
    linkClicked: z.boolean().default(false), // Valor por defecto
    formSubmitted: z.boolean().default(false), // Valor por defecto
    emailOpenedAt: z.any().default(null), // Valor por defecto
    firstClickAt: z.any().default(null), // Valor por defecto
    lastClickAt: z.any().default(null), // Valor por defecto
  }),
  clickCount: z.number().int().nonnegative().default(0), // Valor por defecto
  sessionsNum: z.number().int().nonnegative().default(0), // Valor por defecto
  capturedCredentials: z
    .object({
      email: z.string().email().optional(),
      password: z.string().optional(),
      submittedAt: TimestampSchema.nullable().default(null),
    })
    .optional(),
  metadata: z.object({
    ip: z.string().default(""), // Valor por defecto
    userAgent: z.string().default(""), // Valor por defecto
    geolocation: z.object({
      lat: z.number().default(0), // Valor por defecto
      lon: z.number().default(0), // Valor por defecto
      city: z.string().optional(),
      country: z.string().optional(),
    }),
    device: z.object({
      os: z.string().default(""), // Valor por defecto
      browser: z.string().default(""), // Valor por defecto
      screenResolution: z.string().default(""), // Valor por defecto
    }),
    referralSource: z.string().optional(),
  }),
  events: z
    .array(
      z.object({
        type: z.string(),
        timestamp: z.string(),
        data: z.any(),
      })
    )
    .optional(),
});
