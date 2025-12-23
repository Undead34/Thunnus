import type { EmailOptions, IEmailProvider } from "./types";
import { SmtpProvider } from "./providers/smtp";
import { MicrosoftProvider } from "./providers/microsoft";

export class EmailService {
    private provider: IEmailProvider;

    constructor(providerType: 'smtp' | 'microsoft' = 'smtp') {
        if (providerType === 'microsoft') {
            this.provider = new MicrosoftProvider();
        } else {
            this.provider = new SmtpProvider();
        }
    }

    setProvider(provider: IEmailProvider) {
        this.provider = provider;
    }

    async send(options: EmailOptions): Promise<void> {
        await this.provider.send(options);
    }
}

// Global instance or factory if needed, but for now exporting Class is fine.
// We can also export a helper function to match the previous API style if we want strict backward compatibility,
// but the plan is to refactor the caller.
