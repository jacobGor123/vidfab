#!/usr/bin/env node

/**
 * Quick test to validate MediaQuality enum fixes
 */

console.log('🔧 Testing MediaQuality Import Fixes...\n');

// Check if the files exist and have proper imports
const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'hooks/useHoverVideo.ts',
  'components/create/template-gallery.tsx',
  'data/video-templates.ts'
];

let allGood = true;

filesToCheck.forEach(file => {
  const fullPath = path.join(process.cwd(), file);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${file} - FILE NOT FOUND`);
    allGood = false;
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  // Check for proper MediaQuality import (not type-only)
  const hasProperImport = content.includes('import { MediaQuality }');
  const hasTypeOnlyImport = content.includes('import type') && content.includes('MediaQuality');

  // Check for MediaQuality enum usage
  const hasEnumUsage = content.includes('MediaQuality.') || content.includes('MediaQuality.AUTO') || content.includes('MediaQuality.MEDIUM');

  console.log(`📁 ${file}:`);
  console.log(`   ${hasProperImport ? '✅' : '❌'} Has proper value import`);
  console.log(`   ${hasEnumUsage ? '✅' : '❌'} Uses enum values correctly`);

  if (!hasProperImport && hasEnumUsage) {
    console.log(`   ⚠️  WARNING: Uses enum values but missing proper import`);
    allGood = false;
  }

  console.log();
});

console.log('📊 SUMMARY:');
console.log('===========');

if (allGood) {
  console.log('✅ All MediaQuality imports are correctly configured!');
  console.log('✅ Enum values are being used properly');
  console.log('✅ Runtime error should be resolved');
} else {
  console.log('❌ Some issues were found with MediaQuality imports');
  console.log('💡 Make sure all files using MediaQuality.* import it as a value, not type-only');
}

console.log('\n🚀 Ready to test in browser!');
console.log('Run: npm run dev and check /create page');