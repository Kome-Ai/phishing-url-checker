#!/usr/bin/env node
import { checkUrl, RiskLevel, RiskResult } from './riskChecker';

const LEVEL_LABEL: Record<RiskLevel, string> = {
  safe: '🟢 安全',
  caution: '🟡 注意',
  danger: '🔴 危険',
};

function printResult(result: RiskResult): void {
  console.log(`URL   : ${result.input}`);

  if (result.parseError) {
    console.log(`判定  : ⚠️  ${result.parseError}`);
    console.log('');
    return;
  }

  console.log(`ホスト: ${result.hostname}`);
  console.log(`判定  : ${LEVEL_LABEL[result.level]} (スコア: ${result.score})`);

  if (result.findings.length === 0) {
    console.log('理由  : 該当する懸念事項は見つかりませんでした');
  } else {
    console.log('理由  :');
    for (const finding of result.findings) {
      console.log(`  - [${finding.rule}] ${finding.message} (+${finding.score})`);
    }
  }
  console.log('');
}

function printUsage(): void {
  console.log('使い方: phishing-url-checker <URL> [URL2 URL3 ...]');
  console.log('例    : phishing-url-checker https://example.com http://accounts-google.evil.com');
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const results = args.map(checkUrl);
  results.forEach(printResult);

  // いずれかが危険と判定された場合は終了コードを非0にし、
  // CI等での自動チェックにも使えるようにする。
  if (results.some((r) => r.level === 'danger')) {
    process.exitCode = 2;
  } else if (results.some((r) => r.level === 'caution')) {
    process.exitCode = 1;
  }
}

main();
