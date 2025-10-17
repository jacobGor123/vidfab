/**
 * Multi-Provider Email Service for VidFab AI Video Platform
 * 支持多种邮件服务提供商的统一接口
 */
import nodemailer from 'nodemailer';

// 邮件服务提供商类型
export type EmailProvider = 'aws-ses' | 'smtp' | 'sendgrid' | 'resend';

// 邮件发送配置接口
export interface EmailConfig {
  provider: EmailProvider;
  from_name: string;
  from_email: string;
  reply_to?: string;
}

// 邮件发送选项接口
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// 邮件发送结果接口
export interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
  provider?: EmailProvider;
}

// 邮件模板接口
export interface EmailTemplate {
  html: string;
  text: string;
}

// AWS SES 配置
interface AWSConfig {
  host: string;
  username: string;
  password: string;
}

// SMTP 配置
interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

// SendGrid 配置
interface SendGridConfig {
  apiKey: string;
}

// Resend 配置
interface ResendConfig {
  apiKey: string;
}

/**
 * 通用邮件服务类
 */
export class EmailService {
  private provider: EmailProvider;
  private config: EmailConfig;

  constructor(provider?: EmailProvider) {
    this.provider = provider || this.detectProvider();
    this.config = this.loadConfig();
  }

  /**
   * 自动检测可用的邮件服务提供商
   */
  private detectProvider(): EmailProvider {
    // 按优先级检测环境变量
    if (process.env.AWS_SES_SMTP_USERNAME && process.env.AWS_SES_SMTP_PASSWORD) {
      return 'aws-ses';
    }

    if (process.env.SENDGRID_API_KEY) {
      return 'sendgrid';
    }

    if (process.env.RESEND_API_KEY) {
      return 'resend';
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD) {
      return 'smtp';
    }

    console.warn('⚠️ No email provider configured, defaulting to AWS SES');
    return 'aws-ses';
  }

  /**
   * 加载邮件配置
   */
  private loadConfig(): EmailConfig {
    return {
      provider: this.provider,
      from_name: process.env.EMAIL_FROM_NAME || 'VidFab AI',
      from_email: process.env.EMAIL_FROM_ADDRESS || process.env.AWS_SES_FROM_EMAIL || 'noreply@vidfab.ai',
      reply_to: process.env.EMAIL_REPLY_TO || process.env.AWS_SES_REPLY_TO_EMAIL || 'support@vidfab.ai'
    };
  }

  /**
   * 获取AWS SES配置
   */
  private getAWSConfig(): AWSConfig {
    const host = process.env.AWS_SES_SMTP_HOST || 'email-smtp.us-west-1.amazonaws.com';
    const username = process.env.AWS_SES_SMTP_USERNAME;
    const password = process.env.AWS_SES_SMTP_PASSWORD;

    if (!username || !password) {
      throw new Error('AWS SES credentials not configured. Please set AWS_SES_SMTP_USERNAME and AWS_SES_SMTP_PASSWORD');
    }

    return { host, username, password };
  }

  /**
   * 获取SMTP配置
   */
  private getSMTPConfig(): SMTPConfig {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';
    const username = process.env.SMTP_USERNAME;
    const password = process.env.SMTP_PASSWORD;

    if (!host || !username || !password) {
      throw new Error('SMTP configuration incomplete. Please set SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD');
    }

    return { host, port, secure, username, password };
  }

  /**
   * 创建AWS SES传输器
   */
  private createAWSTransporter(): nodemailer.Transporter {
    const awsConfig = this.getAWSConfig();

    return nodemailer.createTransport({
      host: awsConfig.host,
      port: 587,
      secure: false,
      auth: {
        user: awsConfig.username,
        pass: awsConfig.password,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    });
  }

  /**
   * 创建SMTP传输器
   */
  private createSMTPTransporter(): nodemailer.Transporter {
    const smtpConfig = this.getSMTPConfig();

    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    });
  }

  /**
   * 使用SendGrid发送邮件
   */
  private async sendWithSendGrid(options: EmailOptions): Promise<EmailResult> {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        throw new Error('SendGrid API key not configured');
      }

      const sgMail = await import('@sendgrid/mail');
      sgMail.setApiKey(apiKey);

      const msg = {
        to: options.to,
        from: {
          email: this.config.from_email,
          name: this.config.from_name
        },
        replyTo: this.config.reply_to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const result = await sgMail.send(msg);

      return {
        success: true,
        messageId: result[0]?.headers?.['x-message-id'] || 'sendgrid-sent',
        provider: 'sendgrid'
      };
    } catch (error: any) {
      console.error('SendGrid send error:', error);
      return {
        success: false,
        error: error.message || 'SendGrid send failed',
        provider: 'sendgrid'
      };
    }
  }

  /**
   * 使用Resend发送邮件
   */
  private async sendWithResend(options: EmailOptions): Promise<EmailResult> {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error('Resend API key not configured');
      }

      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);

      const result = await resend.emails.send({
        from: `${this.config.from_name} <${this.config.from_email}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        reply_to: this.config.reply_to,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
          provider: 'resend'
        };
      }

      return {
        success: true,
        messageId: result.data?.id || 'resend-sent',
        provider: 'resend'
      };
    } catch (error: any) {
      console.error('Resend send error:', error);
      return {
        success: false,
        error: error.message || 'Resend send failed',
        provider: 'resend'
      };
    }
  }

  /**
   * 使用SMTP发送邮件（AWS SES或通用SMTP）
   */
  private async sendWithSMTP(options: EmailOptions): Promise<EmailResult> {
    try {
      let transporter: nodemailer.Transporter;

      if (this.provider === 'aws-ses') {
        transporter = this.createAWSTransporter();
      } else {
        transporter = this.createSMTPTransporter();
      }

      // 在开发环境中验证SMTP连接
      if (process.env.NODE_ENV === 'development') {
        try {
          await transporter.verify();
          console.log('✅ SMTP connection verified');
        } catch (verifyError: any) {
          console.error('❌ SMTP connection failed:', verifyError.message);
          return {
            success: false,
            error: `SMTP connection failed: ${verifyError.message}`,
            provider: this.provider
          };
        }
      }

      const mailOptions = {
        from: {
          name: this.config.from_name,
          address: this.config.from_email
        },
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: this.config.reply_to,
        headers: {
          'X-Mailer': 'VidFab-AI-Platform',
          'X-Priority': '3',
        },
      };

      const result = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        provider: this.provider
      };
    } catch (error: any) {
      console.error('SMTP send error:', error);

      let errorMessage = 'Email send failed';

      if (error.code === 'EAUTH') {
        errorMessage = 'Email authentication failed - check credentials';
      } else if (error.code === 'ECONNECTION') {
        errorMessage = 'Email service connection failed';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Email sending timed out';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        provider: this.provider
      };
    }
  }

  /**
   * 发送邮件（主要方法）
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      console.log(`📧 Sending email via ${this.provider} to ${options.to}`);
      console.log(`📧 Subject: ${options.subject}`);

      let result: EmailResult;

      switch (this.provider) {
        case 'sendgrid':
          result = await this.sendWithSendGrid(options);
          break;

        case 'resend':
          result = await this.sendWithResend(options);
          break;

        case 'aws-ses':
        case 'smtp':
        default:
          result = await this.sendWithSMTP(options);
          break;
      }

      if (result.success) {
        console.log(`✅ Email sent successfully via ${result.provider}`, {
          to: options.to,
          messageId: result.messageId
        });
      } else {
        console.error(`❌ Email send failed via ${result.provider}:`, result.error);
      }

      return result;
    } catch (error: any) {
      console.error('Email service error:', error);
      return {
        success: false,
        error: error.message || 'Unknown email service error',
        provider: this.provider
      };
    }
  }

  /**
   * 测试邮件服务配置
   */
  async testConfiguration(): Promise<EmailResult> {
    const testEmail: EmailOptions = {
      to: this.config.from_email, // 发送给自己
      subject: `VidFab Email Service Test - ${this.provider}`,
      text: `This is a test email to verify ${this.provider} configuration is working correctly.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Service Test</h2>
          <p>This is a test email to verify <strong>${this.provider}</strong> configuration is working correctly.</p>
          <p><strong>Provider:</strong> ${this.provider}</p>
          <p><strong>From:</strong> ${this.config.from_email}</p>
          <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
          <hr>
          <p><em>VidFab AI Video Platform</em></p>
        </div>
      `
    };

    return await this.sendEmail(testEmail);
  }

  /**
   * 获取当前配置信息
   */
  getProviderInfo(): { provider: EmailProvider; config: EmailConfig; configured: boolean } {
    let configured = false;

    try {
      switch (this.provider) {
        case 'aws-ses':
          this.getAWSConfig(); // 会抛出异常如果未配置
          configured = true;
          break;
        case 'smtp':
          this.getSMTPConfig(); // 会抛出异常如果未配置
          configured = true;
          break;
        case 'sendgrid':
          configured = !!process.env.SENDGRID_API_KEY;
          break;
        case 'resend':
          configured = !!process.env.RESEND_API_KEY;
          break;
      }
    } catch (error) {
      configured = false;
    }

    return {
      provider: this.provider,
      config: this.config,
      configured
    };
  }
}

/**
 * 创建验证码邮件模板
 */
export function createVerificationEmailTemplate(code: string, email: string): EmailTemplate {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VidFab Email Verification</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }

        .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .subtitle {
            font-size: 18px;
            opacity: 0.9;
        }

        .content {
            padding: 40px 30px;
            text-align: center;
        }

        .greeting {
            font-size: 20px;
            margin-bottom: 30px;
            color: #374151;
        }

        .verification-code {
            display: inline-block;
            background: #1f2937;
            color: #ffffff;
            font-size: 36px;
            font-weight: bold;
            padding: 20px 40px;
            border-radius: 12px;
            letter-spacing: 8px;
            margin: 20px 0;
            box-shadow: 0 8px 25px rgba(31, 41, 55, 0.3);
            border: 2px solid #374151;
        }

        .instructions {
            font-size: 16px;
            color: #6b7280;
            margin: 30px 0;
            line-height: 1.6;
        }

        .expiry-notice {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            color: #92400e;
            font-size: 14px;
        }

        .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }

        .footer-text {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 15px;
        }

        .footer-links {
            font-size: 12px;
            color: #9ca3af;
        }

        .footer-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
        }

        .footer-links a:hover {
            text-decoration: underline;
        }

        @media (max-width: 600px) {
            body {
                padding: 10px;
            }

            .container {
                border-radius: 8px;
            }

            .header {
                padding: 30px 20px;
            }

            .content {
                padding: 30px 20px;
            }

            .verification-code {
                font-size: 28px;
                padding: 15px 30px;
                letter-spacing: 4px;
            }

            .footer {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">VidFab</div>
            <div class="subtitle">AI Video Platform</div>
        </div>

        <div class="content">
            <div class="greeting">
                Welcome to VidFab! 🎉
            </div>

            <p class="instructions">
                Your email verification code is:
            </p>

            <div class="verification-code">
                ${code}
            </div>

            <div class="expiry-notice">
                ⏰ This verification code expires in <strong>5 minutes</strong>. Please use it promptly.
            </div>

            <p class="instructions">
                Please enter this verification code on the login page to complete your email verification.<br>
                If you didn't request this code, please ignore this email.
            </p>
        </div>

        <div class="footer">
            <div class="footer-text">
                This email was automatically sent by VidFab AI Video Platform
            </div>
            <div class="footer-links">
                <a href="https://vidfab.ai">Website</a>
                <a href="https://vidfab.ai/help">Help Center</a>
                <a href="https://vidfab.ai/privacy">Privacy Policy</a>
            </div>
        </div>
    </div>
</body>
</html>
  `;

  const text = `
VidFab AI Video Platform

Welcome to VidFab!

Your email verification code is: ${code}

This verification code expires in 5 minutes. Please use it promptly.

Please enter this verification code on the login page to complete your email verification.
If you didn't request this code, please ignore this email.

Security Tips:
- Never share your verification code with others
- VidFab will never ask for your password via email
- Contact our support team if you have any questions

This email was automatically sent by VidFab AI Video Platform
Website: https://vidfab.ai
  `;

  return { html, text };
}

// 导出默认邮件服务实例
export const emailService = new EmailService();

// 发送验证码邮件的便捷函数
export async function sendVerificationEmail(email: string, code: string): Promise<EmailResult> {
  try {
    console.log(`📧 Preparing to send verification code ${code} to ${email}`);

    const template = createVerificationEmailTemplate(code, email);

    const emailOptions: EmailOptions = {
      to: email,
      subject: `VidFab - Your Verification Code: ${code}`,
      html: template.html,
      text: template.text
    };

    const result = await emailService.sendEmail(emailOptions);

    // 在开发模式下也打印验证码方便调试
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Development Mode - Verification code for ${email}: ${code}`);
    }

    return result;
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send verification email'
    };
  }
}