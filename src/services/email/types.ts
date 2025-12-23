import type { SMTP } from "@/types";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  smtp?: SMTP; // Optional, might be required by SMTP provider but not MS
}

export interface IEmailProvider {
    send(options: EmailOptions): Promise<void>;
}
