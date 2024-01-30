const admin = require('firebase-admin');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin with your project credentials
const serviceAccount = require('./firebase-adminsdk.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'fir-reg-auth-time-machine.appspot.com'
});
const storage = admin.storage().bucket();

// SMTP Transport for Nodemailer using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'itsvishnups@gmail.com',
    pass: 'pgnw hsdt hwlu xrtj'
  }
});

// Function to send email with file attachment and custom description
async function sendEmail(to, capsuleName, filePath, customDescription) {
  const subject = `Your capsule "${capsuleName}" has Unlocked Today! Yay!!`;
  const text = `Hey there,\n\nYour capsule "${capsuleName}" has unlocked today! Here's a special note for you: "${customDescription}". Have a look at your irreplaceable memory.`;

  const fileBuffer = await storage.file(filePath).download();
  const fileName = filePath.split('/').pop(); // Extract just the file's name

  const mailOptions = {
    from: 'itsvishnups@gmail.com',
    to: to,
    subject: subject,
    text: text,
    attachments: [{ 
      filename: fileName, // Use original file name for attachment
      content: fileBuffer[0]
    }]
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to', to);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Function to process capsules
async function processCapsules() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const [files] = await storage.getFiles({ prefix: 'capsules/' });
  files.forEach(async file => {
    try {
      const metadata = await file.getMetadata();
      const maturityDate = metadata[0].metadata.maturityDate;
      const userEmail = metadata[0].metadata.userEmail;
      const userCapsuleName = metadata[0].metadata.capsuleName;
      const customDescription = metadata[0].metadata.customDescription || "No special note provided.";

      if (maturityDate === today.toISOString().split('T')[0]) {
        await sendEmail(userEmail, userCapsuleName, file.name, customDescription);
      } else if (new Date(maturityDate) < yesterday) {
        await file.delete();
        console.log(`Expired capsule ${file.name} deleted successfully.`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
    }
  });
}

// Scheduled job running every day at 12 AM
cron.schedule('0 0 * * *', () => {
  console.log('Running capsule task scheduler...');
  processCapsules();
});

console.log('Capsule task scheduler started.');
