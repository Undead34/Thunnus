import type { SMTP } from "@/types";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  smtp?: SMTP; // Optional, might be required by SMTP provider but not MS
  from?: {
    name?: string;
    email?: string;
  };
}

export interface IEmailProvider {
    send(options: EmailOptions): Promise<void>;
}
