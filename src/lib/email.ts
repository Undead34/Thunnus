import nodemailer from "nodemailer";
import type { SMTP } from "@/types";

interface Options {
    to: string;
    subject: string;
    html: string;
    smtp: SMTP;
}

export async function sendEmail(options: Options) {
    try {
        let config = {
            ...options.smtp,
            secure: false,
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        };
        const transporter = nodemailer.createTransport(config);

        let response = await transporter.sendMail({
            from: options.smtp.auth.user,
            to: options.to,
            html: options.html,
            subject: options.subject
        });

        console.log(response);
    }
    catch (e) {
        console.error(e);
    }
}
