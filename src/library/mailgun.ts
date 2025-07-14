import FormData from "form-data"; // form-data v4.0.1
import Mailgun from "mailgun.js"; // mailgun.js v11.1.0

async function sendRecoveryPassword() {
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: process.env.API_KEY || "API_KEY",
    // When you have an EU-domain, you must specify the endpoint:
    // url: "https://api.eu.mailgun.net"
  });
  try {
    const data = await mg.messages.create("sandboxb39523951ba94c96a49dfdca99d16e86.mailgun.org", {
      from: "Mailgun Sandbox <postmaster@sandboxb39523951ba94c96a49dfdca99d16e86.mailgun.org>",
      to: ["Salvador Jurado Arana <salvador.jurado@anticorrupcion.org>"],
      subject: "Hello Salvador Jurado Arana",
      text: "Congratulations Salvador Jurado Arana, you just sent an email with Mailgun! You are truly awesome!",
    });

    console.log(data); // logs response data
  } catch (error) {
    console.log(error); //logs any error
  }
}