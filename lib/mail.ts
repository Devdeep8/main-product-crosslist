import nodemailer from 'nodemailer';

// --- ADD THIS CHECK AT THE TOP ---
if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error("CRITICAL: Nodemailer environment variables SMTP_USER and SMTP_PASSWORD are not set.");
    // In a real production app, you might want to throw an error here to prevent the app from starting.
    // For now, a console error is sufficient to alert the developer.
}
// --- END OF CHECK ---

// Type for mail options
type MailOptions = {
    to: string;
    subject: string;
    html: string;
};

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

// Function to send an email (this part is unchanged)
export const sendMail = async ({ to, subject, html }: MailOptions) => {
    try {
        const info = await transporter.sendMail({
            from: `"Project Pro" <${process.env.SMTP_USER}>`,
            to: to,
            subject: subject,
            html: html,
        });
        console.log("Message sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email: ", error);
        throw new Error("Could not send email.");
    }
};