
import * as emailService from '../services/emailService';
import sgMail from '@sendgrid/mail';

jest.mock('@sendgrid/mail', () => ({
    setApiKey: jest.fn(),
    send: jest.fn(),
}));

describe('EmailService - sendConfirmationEmail', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should send email with correct parameters', async () => {
        const to = 'test@example.com';
        const subject = 'Test Subject';
        const html = '<p>Test HTML Content</p>';

        await emailService.sendConfirmationEmail(to, subject, html);

        expect(sgMail.send).toHaveBeenCalledWith({
            to,
            from: process.env.NOTIFY_FROM_EMAIL,
            subject,
            html,
        });
    });

    it('should handle errors gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const to = 'fail@example.com';
        const subject = 'Fail Subject';
        const html = '<p>Should fail</p>';

        (sgMail.send as jest.Mock).mockRejectedValue(new Error('Send failed'));

        await emailService.sendConfirmationEmail(to, subject, html);

        expect(consoleSpy).toHaveBeenCalledWith(' Failed to send email:', expect.any(Error));

        consoleSpy.mockRestore();
    });
});
