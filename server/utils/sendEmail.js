import axios from "axios";

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "LinkMint",
          email: process.env.EMAIL_FROM,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": process.env.BrevoApiKey,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Email sent:", response.data);
    return response.data;

  } catch (error) {
    console.error("Brevo error:", error.response?.data || error.message);
    throw error;
  }
};
    // if (error) {
    //   console.error("Resend error:", error);
    //   throw new Error("Email could not be sent");
    // }

//     console.log("Email sent successfully:", data?.id);
//   } catch (error) {
//     console.error("Email sending failed:", error);
//     throw new Error("Email could not be sent");
//   }
// };
// import nodemailer from "nodemailer";

// let transporterPromise;

// // const getTransporter = async () => {
// //   if (transporterPromise) return transporterPromise;

// //   const hasEnvCreds =
// //     process.env.EMAIL_USER &&
// //     process.env.EMAIL_PASS;

// //   if (hasEnvCreds) {
// //     transporterPromise = Promise.resolve(
// //       nodemailer.createTransport({
// //         host: process.env.MAIL_HOST || "smtp.gmail.com",
// //         port: Number(process.env.MAIL_PORT || 587),
// //         secure: false, // true for 465, false for other ports
// //         requireTLS: true,
// //         auth: {
// //           user: process.env.EMAIL_USER,
// //           pass: process.env.EMAIL_PASS,
// //         },
// //         tls: {
// //           rejectUnauthorized: true,
// //         },
// //         family: 4, // force Node.js to use IPv4 instead of IPv6
// //       })
// //     );
// //   } else if (process.env.NODE_ENV === "production") {
// //     throw new Error(
// //       "Production mail credentials (EMAIL_USER, EMAIL_PASS) are required"
// //     );
// //   } else {
//     // // dev fallback: ethereal test inbox
//     // transporterPromise = nodemailer.createTestAccount().then((testAccount) =>
//     //   nodemailer.createTransport({
//     //     host: "smtp.ethereal.email",
//     //     port: 587,
//     //     secure: false,
//     //     requireTLS: true,
//     //     auth: {
//     //       user: testAccount.user,
//     //       pass: testAccount.pass,
//     //     },
//     //   })
//     // );
//   //}

//   return transporterPromise;
// };

// export const sendEmail = async ({ to, subject, html }) => {
//   try {
//     const transporter = await getTransporter();

//     const info = await transporter.sendMail({
//       from: `"URL Shortener" <${process.env.EMAIL_USER || "no-reply@example.com"}>`,
//       to,
//       subject,
//       html,
//     });

//     const previewUrl = nodemailer.getTestMessageUrl(info);
//     if (previewUrl) {
//       console.log("Preview email at:", previewUrl);
//     }
//   } catch (error) {
//     console.error("Email sending failed:", error);
//     throw new Error("Email could not be sent");
//   }
// };
