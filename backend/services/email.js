// services/email.js
import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  async initialize() {
    try {
      // Configure email transporter based on environment and available credentials
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        // Use real email service (Gmail or other) when credentials are provided
        this.transporter = nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE || 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });
        
        console.log(`📧 Email service initialized with ${process.env.EMAIL_SERVICE || 'Gmail'}`);
        console.log(`📧 Sending emails from: ${process.env.EMAIL_USER}`);
      } else {
        // Development: Use Ethereal Email for testing when no credentials provided
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        
        console.log('📧 Email service initialized with test account');
        console.log(`Test email preview: https://ethereal.email`);
      }
      
      // Verify transporter
      await this.transporter.verify();
      console.log('✅ Email service is ready');
      
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      
      // Fallback to console logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Using console fallback for email in development');
        this.transporter = null;
      }
    }
  }

  async sendVerificationEmail(email, userName, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Apsara Assistant <noreply@apsara.ai>',
      to: email,
      subject: 'Verify Your Email - Apsara Assistant',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 Welcome to Apsara!</h1>
              <p>Verify Your Email Address</p>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>Thank you for signing up for Apsara Assistant! To get started, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This verification link will expire in 24 hours</li>
                  <li>Once verified, you'll receive a welcome email with getting started tips</li>
                  <li>If you didn't create this account, please ignore this email</li>
                </ul>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px; font-family: monospace;">${verificationUrl}</p>
              
              <p>We're excited to help you get started with your AI assistant!</p>
              
              <p>Best regards,<br>The Apsara Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${userName}!
        
        Thank you for signing up for Apsara Assistant! To get started, please verify your email address by clicking this link:
        
        ${verificationUrl}
        
        This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
        
        Best regards,
        The Apsara Team
      `
    };

    return await this.sendEmail(mailOptions);
  }

  async sendPasswordResetEmail(email, resetToken, userName) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Apsara Assistant <noreply@apsara.ai>',
      to: email,
      subject: 'Password Reset Request - Apsara Assistant',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 Apsara Assistant</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <h2>Hello ${userName || 'User'}!</h2>
              <p>We received a request to reset your password for your Apsara Assistant account.</p>
              
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul>
                  <li>This link will expire in 10 minutes</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>For security, never share this link with anyone</li>
                </ul>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 5px; font-family: monospace;">${resetUrl}</p>
              
              <p>Best regards,<br>The Apsara Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>If you have questions, contact our support team.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${userName || 'User'}!
        
        We received a request to reset your password for your Apsara Assistant account.
        
        Click this link to reset your password: ${resetUrl}
        
        This link will expire in 10 minutes. If you didn't request this reset, please ignore this email.
        
        Best regards,
        The Apsara Team
      `
    };

    return await this.sendEmail(mailOptions);
  }

  async sendWelcomeEmail(email, userName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Apsara Assistant <noreply@apsara.ai>',
      to: email,
      subject: 'Welcome to Apsara Assistant! 🤖',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Apsara</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .feature { margin: 20px 0; padding: 15px; background: white; border-radius: 5px; border-left: 4px solid #667eea; }
            .button { display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 Welcome to Apsara!</h1>
              <p>Your AI Assistant is Ready</p>
            </div>
            <div class="content">
              <h2>Hello ${userName}! 👋</h2>
              <p>Welcome to Apsara Assistant! We're excited to have you on board.</p>
              
              <div class="feature">
                <h3>🧠 What can Apsara do for you?</h3>
                <ul>
                  <li>Answer questions and help with research</li>
                  <li>Generate and execute code</li>
                  <li>Create images and visual content</li>
                  <li>Live voice conversations</li>
                  <li>File analysis and processing</li>
                </ul>
              </div>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Start Chatting</a>
              
              <p>If you have any questions or need help getting started, don't hesitate to reach out!</p>
              
              <p>Best regards,<br>The Apsara Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    return await this.sendEmail(mailOptions);
  }

  async sendEmail(mailOptions) {
    try {
      if (!this.transporter) {
        // Fallback: Log email to console in development
        console.log('\n📧 EMAIL WOULD BE SENT:');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Text:', mailOptions.text);
        console.log('---');
        return { success: true, preview: 'console' };
      }

      const info = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email sent successfully');
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return { 
        success: true, 
        messageId: info.messageId,
        preview: nodemailer.getTestMessageUrl(info)
      };
    } catch (error) {
      console.error('❌ Error sending email:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export default new EmailService();
