/**
 * Email Transporter Factory for VidFab AI Video Platform
 * 独立的传输器创建模块，解决构建时的导入问题
 */

export interface TransporterConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
}

/**
 * 创建邮件传输器
 */
export async function createEmailTransporter(config: TransporterConfig) {
  try {
    // 动态导入 nodemailer 以避免构建时问题
    const nodemailer = await import('nodemailer');

    return nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
      tls: config.tls || {
        rejectUnauthorized: false
      },
      connectionTimeout: config.connectionTimeout || 30000,
      greetingTimeout: config.greetingTimeout || 30000,
      socketTimeout: config.socketTimeout || 30000,
    });
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    throw new Error(`Email transporter creation failed: ${error}`);
  }
}

/**
 * 验证传输器连接
 */
export async function verifyTransporter(transporter: any): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Transporter verification failed:', error);
    return false;
  }
}

/**
 * 发送邮件
 */
export async function sendEmailWithTransporter(transporter: any, mailOptions: any): Promise<any> {
  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
}