/**
 * AWS SES邮件服务配置 - VidFab AI视频平台
 */
import nodemailer from 'nodemailer';

// AWS SES SMTP配置
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.AWS_SES_SMTP_HOST || 'email-smtp.us-west-1.amazonaws.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.AWS_SES_SMTP_USERNAME,
      pass: process.env.AWS_SES_SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    },
    // 连接超时和响应超时配置
    connectionTimeout: 30000, // 30秒
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });
};

// 验证码邮件模板
export const createVerificationEmailTemplate = (code: string, email: string) => {
  return {
    html: `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VidFab 邮箱验证</title>
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
    `,
    text: `
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
    `
  };
};

// 发送邮件函数
export async function sendEmailViaSES(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // 验证环境变量
    if (!process.env.AWS_SES_SMTP_USERNAME || !process.env.AWS_SES_SMTP_PASSWORD) {
      console.error('❌ AWS SES SMTP credentials not configured');
      return {
        success: false,
        error: 'Email service not configured properly'
      };
    }

    const transporter = createTransporter();
    
    // 验证SMTP连接（开发环境下）
    if (process.env.NODE_ENV === 'development') {
      try {
        await transporter.verify();
      } catch (verifyError: any) {
        console.error('❌ SMTP connection failed:', verifyError.message);
        return {
          success: false,
          error: `SMTP connection failed: ${verifyError.message}`
        };
      }
    }

    // 发送邮件
    const mailOptions = {
      from: {
        name: 'VidFab Ai',
        address: process.env.AWS_SES_FROM_EMAIL || 'noreply@vidfab.ai'
      },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      // 邮件头部配置
      headers: {
        'X-Mailer': 'VidFab-AI-Platform',
        'X-Priority': '3',
      },
      // 回复地址
      replyTo: process.env.AWS_SES_REPLY_TO_EMAIL || 'support@vidfab.ai',
    };
    
    const result = await transporter.sendMail(mailOptions);
  

    return {
      success: true,
      messageId: result.messageId
    };

  } catch (error: any) {
    console.error('❌ Email sending failed:', error);
    
    // 处理常见错误
    let errorMessage = 'Failed to send email';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed - check AWS credentials';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Email service connection failed';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Email sending timed out';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

// 发送验证码邮件的便捷函数
export async function sendVerificationCodeEmail(
  email: string, 
  code: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const template = createVerificationEmailTemplate(code, email);
  
  return sendEmailViaSES({
    to: email,
    subject: `VidFab - Your Verification Code: ${code}`,
    html: template.html,
    text: template.text
  });
}