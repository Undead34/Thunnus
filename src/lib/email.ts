import nodemailer from "nodemailer";
import type { SMTP } from "@/types";

interface Options {
    to: string;
    subject: string;
    html: string;
    smtp: SMTP;
}

export async function sendEmail(options: Options) {
    const transporter = nodemailer.createTransport({
        ...options.smtp, tls: {
            rejectUnauthorized: false
        }
    });

    await transporter.sendMail({
        to: options.to,
        html: options.html,
        subject: options.subject
    });
}
