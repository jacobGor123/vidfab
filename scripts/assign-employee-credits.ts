/**
 * 批量为员工分配积分
 *
 * 用法:
 * 1. 准备员工邮箱列表文件 employees.json（放在 scripts/ 目录）
 * 2. 配置下方的 CONFIG 参数
 * 3. 运行: pnpm tsx scripts/assign-employee-credits.ts
 *
 * 功能:
 * - 自动检测员工是否已注册
 * - 已注册用户: 立即增加积分 + 记录交易日志
 * - 未注册用户: 创建 pending_credits 记录，注册时自动到账
 * - 生成详细报告（JSON 文件）
 */

// 加载环境变量
import dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin } from '@/lib/supabase';
import { CreditsManager } from '@/lib/subscription/credits-manager';
import * as fs from 'fs';
import * as path from 'path';

// ===================================
// 配置参数（根据实际情况修改）
// ===================================
const CONFIG = {
  // 员工邮箱列表文件路径
  EMPLOYEE_LIST_FILE: path.join(__dirname, 'employees.json'),

  // 每人赠送的积分数量
  CREDITS_AMOUNT: 500,

  // 来源标识（用于统计和追踪）
  SOURCE: '员工福利2025Q1',

  // 详细描述
  DESCRIPTION: '公司内部员工积分赠送',

  // 操作人员（你的邮箱，用于审计）
  ASSIGNED_BY: 'admin@company.com',

  // 是否设置过期时间（null = 永久有效）
  // 示例: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90天后过期
  EXPIRES_AT: null as Date | null,
};

// ===================================
// 员工邮箱列表格式（employees.json）
// ===================================
/*
示例内容:
[
  "employee1@company.com",
  "employee2@company.com",
  "employee3@company.com"
]
*/

// ===================================
// 类型定义
// ===================================
interface AssignmentResult {
  email: string;
  status: 'already_registered' | 'pending_assigned' | 'error';
  creditsAdded?: number;
  currentBalance?: number;
  error?: string;
}

interface SummaryReport {
  totalProcessed: number;
  alreadyRegisteredCount: number;
  pendingAssignedCount: number;
  errorCount: number;
  totalCreditsAssigned: number;
  timestamp: string;
  config: typeof CONFIG;
  results: AssignmentResult[];
}

// ===================================
// 主函数
// ===================================
async function assignEmployeeCredits(): Promise<void> {
  console.log('🚀 开始批量分配员工积分...\n');
  console.log('⚙️  配置信息:');
  console.log(`   - 积分数量: ${CONFIG.CREDITS_AMOUNT}`);
  console.log(`   - 来源: ${CONFIG.SOURCE}`);
  console.log(`   - 操作人: ${CONFIG.ASSIGNED_BY}`);
  console.log(`   - 过期时间: ${CONFIG.EXPIRES_AT ? CONFIG.EXPIRES_AT.toISOString() : '永久有效'}`);
  console.log('');

  // ===================================
  // Step 1: 读取员工邮箱列表
  // ===================================
  if (!fs.existsSync(CONFIG.EMPLOYEE_LIST_FILE)) {
    console.error(`❌ 错误: 找不到员工邮箱列表文件: ${CONFIG.EMPLOYEE_LIST_FILE}`);
    console.log(`\n📝 请创建 ${CONFIG.EMPLOYEE_LIST_FILE} 文件，格式如下:`);
    console.log(JSON.stringify(['employee1@company.com', 'employee2@company.com'], null, 2));
    process.exit(1);
  }

  let employeeEmails: string[];
  try {
    const fileContent = fs.readFileSync(CONFIG.EMPLOYEE_LIST_FILE, 'utf-8');
    employeeEmails = JSON.parse(fileContent);

    if (!Array.isArray(employeeEmails)) {
      throw new Error('邮箱列表必须是数组格式');
    }

    if (employeeEmails.length === 0) {
      throw new Error('邮箱列表不能为空');
    }
  } catch (error: any) {
    console.error(`❌ 读取邮箱列表失败: ${error.message}`);
    process.exit(1);
  }

  console.log(`📋 读取到 ${employeeEmails.length} 个员工邮箱\n`);

  // ===================================
  // Step 2: 确认执行
  // ===================================
  console.log('⚠️  即将执行以下操作:');
  console.log(`   - 处理 ${employeeEmails.length} 个员工`);
  console.log(`   - 每人赠送 ${CONFIG.CREDITS_AMOUNT} 积分`);
  console.log(`   - 总计赠送 ${employeeEmails.length * CONFIG.CREDITS_AMOUNT} 积分`);
  console.log('\n按 Ctrl+C 取消，或等待 5 秒后自动开始...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // ===================================
  // Step 3: 逐个处理员工
  // ===================================
  const results: AssignmentResult[] = [];
  const creditsManager = new CreditsManager();

  for (let i = 0; i < employeeEmails.length; i++) {
    const email = employeeEmails[i].toLowerCase().trim();
    console.log(`[${i + 1}/${employeeEmails.length}] 处理: ${email}`);

    try {
      // 检查用户是否已注册
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('uuid, credits_remaining, nickname')
        .eq('email', email)
        .single();

      if (existingUser) {
        // ===================================
        // 用户已注册 -> 直接增加积分
        // ===================================
        console.log(`  ✅ 用户已注册 (${existingUser.nickname})，直接增加积分...`);

        await creditsManager.addBonusCredits(
          existingUser.uuid,
          CONFIG.CREDITS_AMOUNT,
          CONFIG.DESCRIPTION
        );

        const newBalance = existingUser.credits_remaining + CONFIG.CREDITS_AMOUNT;

        results.push({
          email,
          status: 'already_registered',
          creditsAdded: CONFIG.CREDITS_AMOUNT,
          currentBalance: newBalance,
        });

        console.log(`  💰 积分已到账: +${CONFIG.CREDITS_AMOUNT} (余额: ${newBalance})`);
      } else {
        // ===================================
        // 用户未注册 -> 插入 pending_credits
        // ===================================
        console.log(`  📌 用户未注册，创建待领取记录...`);

        const insertData: any = {
          email,
          credits_amount: CONFIG.CREDITS_AMOUNT,
          source: CONFIG.SOURCE,
          description: CONFIG.DESCRIPTION,
          assigned_by: CONFIG.ASSIGNED_BY,
        };

        if (CONFIG.EXPIRES_AT) {
          insertData.expires_at = CONFIG.EXPIRES_AT.toISOString();
        }

        const { error } = await supabaseAdmin
          .from('pending_credits')
          .insert(insertData);

        if (error) throw error;

        results.push({
          email,
          status: 'pending_assigned',
          creditsAdded: CONFIG.CREDITS_AMOUNT,
        });

        console.log(`  ⏳ 待领取积分: ${CONFIG.CREDITS_AMOUNT} (注册后自动到账)`);
      }
    } catch (error: any) {
      console.error(`  ❌ 错误: ${error.message}`);
      results.push({
        email,
        status: 'error',
        error: error.message,
      });
    }

    console.log('');
  }

  // ===================================
  // Step 4: 输出汇总报告
  // ===================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 分配完成，汇总报告:\n');

  const alreadyRegistered = results.filter(r => r.status === 'already_registered');
  const pendingAssigned = results.filter(r => r.status === 'pending_assigned');
  const errors = results.filter(r => r.status === 'error');

  console.log(`✅ 已注册用户（立即到账）: ${alreadyRegistered.length} 人`);
  console.log(`📌 未注册用户（待领取）  : ${pendingAssigned.length} 人`);
  console.log(`❌ 处理失败              : ${errors.length} 人`);
  console.log(`💰 总计赠送积分          : ${(alreadyRegistered.length + pendingAssigned.length) * CONFIG.CREDITS_AMOUNT}`);

  if (errors.length > 0) {
    console.log('\n❌ 失败列表:');
    errors.forEach(e => {
      console.log(`  - ${e.email}: ${e.error}`);
    });
  }

  // ===================================
  // Step 5: 保存详细报告
  // ===================================
  const summaryReport: SummaryReport = {
    totalProcessed: results.length,
    alreadyRegisteredCount: alreadyRegistered.length,
    pendingAssignedCount: pendingAssigned.length,
    errorCount: errors.length,
    totalCreditsAssigned: (alreadyRegistered.length + pendingAssigned.length) * CONFIG.CREDITS_AMOUNT,
    timestamp: new Date().toISOString(),
    config: CONFIG,
    results,
  };

  const reportDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportFile = path.join(reportDir, `assignment-report-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(summaryReport, null, 2));
  console.log(`\n📄 详细报告已保存: ${reportFile}`);

  console.log('\n✨ 任务完成！');
}

// ===================================
// 错误处理
// ===================================
assignEmployeeCredits().catch(error => {
  console.error('\n💥 发生致命错误:', error);
  process.exit(1);
});
