import nodemailer from "nodemailer";

let transporterPromise;

const getTransporter = async () => {
  if (transporterPromise) return transporterPromise;

  const hasEnvCreds =
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS;

  if (hasEnvCreds) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.MAIL_HOST || "smtp.gmail.com",
        port: Number(process.env.MAIL_PORT || 587),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      })
    );
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Production mail credentials (EMAIL_USER, EMAIL_PASS) are required"
    );
  } else {
    // dev fallback: ethereal test inbox
    transporterPromise = nodemailer.createTestAccount().then((testAccount) =>
      nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      })
    );
  }

  return transporterPromise;
};

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: `"URL Shortener" <${process.env.EMAIL_USER || "no-reply@example.com"}>`,
      to,
      subject,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("Preview email at:", previewUrl);
    }
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Email could not be sent");
  }
};
