import nodemailer from "nodemailer";
import type { IEmailProvider, EmailOptions } from "../types";

export class SmtpProvider implements IEmailProvider {
  async send(options: EmailOptions): Promise<void> {
    if (!options.smtp) {
      throw new Error("SMTP configuration is required for SmtpProvider");
    }

    const config = {
      ...options.smtp,
      secure: false, // Defaulting to false as per original implementation
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
      },
    };
    const transporter = nodemailer.createTransport(config);

    const fromEmail = options.from?.email || options.smtp.auth.user;
    const fromName = options.from?.name;

    const response = await transporter.sendMail({
      from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
      to: options.to,
      html: options.html,
      subject: options.subject,
    });

    console.log("[SMTP] Email sent:", response.messageId);
  }
}
