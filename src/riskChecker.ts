import { KNOWN_BRANDS } from './brands';
import { FREE_HOSTING_DOMAINS } from './freeHosting';
import { levenshteinDistance } from './levenshtein';

export type RiskLevel = 'safe' | 'caution' | 'danger';

export interface RiskFinding {
  /** 検出したルールの識別子 */
  rule: string;
  /** 利用者向けの説明メッセージ(日本語) */
  message: string;
  /** このルールが加算するスコア */
  score: number;
}

export interface RiskResult {
  /** 入力された生のURL文字列 */
  input: string;
  /** 解析されたホスト名(判定できなかった場合はundefined) */
  hostname?: string;
  /** 合計スコア */
  score: number;
  /** 3段階のリスク判定 */
  level: RiskLevel;
  /** 検出された個々の懸念事項 */
  findings: RiskFinding[];
  /** URLとして解析できなかった場合のエラーメッセージ */
  parseError?: string;
}

// --- スコア設定 -----------------------------------------------------------
// ルールごとの加点。将来ルールを追加する場合はここに定数を足していく。
export const SCORE = {
  BRAND_IMPERSONATION: 60,
  FREE_HOSTING: 30,
  // タイポスクワッティングは編集距離による曖昧一致のため、完全一致の
  // ブランドなりすましより誤検知の可能性が高い。単独では「注意」に留め、
  // 無料ホスティング等の他シグナルと重なった場合に「危険」へ引き上げる。
  TYPOSQUATTING: 50,
} as const;

// 合計スコアと3段階判定のしきい値。
// 例: ブランドなりすまし単独(60点)は即「危険」。
//     無料ホスティング単独(30点)は「注意」。
//     タイポスクワッティング単独(50点)は「注意」。
//     いずれか2つ以上が重なると60点を超え「危険」になる。
export const THRESHOLD = {
  DANGER: 60,
  CAUTION: 20,
} as const;

/**
 * ユーザー入力のURL文字列からホスト名を取り出す。
 * スキーム(http://等)が省略されている場合は http:// を補って解析する。
 */
export function extractHostname(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
  const candidate = hasScheme ? trimmed : `http://${trimmed}`;
  const url = new URL(candidate); // 不正な場合はTypeErrorを投げる
  return url.hostname.toLowerCase();
}

/** hostname が domain 自身、またはそのサブドメインかどうか */
function isSameOrSubdomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * ホスト名がブランド名を「トークン」として含むかを判定する正規表現を作る。
 * ドット/ハイフン区切りの境界を要求することで、"online.com" が "line" に
 * 誤反応するような偽陽性を避ける。
 */
function brandTokenPattern(brandName: string): RegExp {
  const escaped = escapeRegExp(brandName);
  return new RegExp(`(^|[.-])${escaped}([.-]|$)`, 'i');
}

/**
 * 有名ブランド名を含むが、公式ドメイン(のサブドメイン)とは一致しない
 * ホスト名を検出する。
 */
export function checkBrandImpersonation(hostname: string): RiskFinding[] {
  const findings: RiskFinding[] = [];

  for (const brand of KNOWN_BRANDS) {
    const isOfficial = brand.officialDomains.some((domain) => isSameOrSubdomain(hostname, domain));
    if (isOfficial) continue;

    if (brandTokenPattern(brand.name).test(hostname)) {
      findings.push({
        rule: 'brand-impersonation',
        message: `有名ブランド「${brand.name}」を含みますが、公式ドメイン(${brand.officialDomains.join(', ')})と一致しません`,
        score: SCORE.BRAND_IMPERSONATION,
      });
    }
  }

  return findings;
}

/**
 * ブランド名との編集距離に応じて、タイポスクワッティングとして許容する
 * 最大距離を決める。短い名前ほど1文字の違いでも別の単語になりやすいため
 * 距離1までしか許容せず、長い名前は2文字までの違いを許容する。
 */
function maxAllowedTypoDistance(brandName: string): number {
  return brandName.length <= 5 ? 1 : 2;
}

/**
 * ホスト名の各ラベル(ドット区切りの各部分)が、有名ブランド名に
 * 編集距離1〜2文字程度で酷似しているが完全一致ではない場合を検出する。
 * 例: goog1e.com / paypa1-login.com / netfliix.com
 *
 * ブランド名を「完全に」含む場合は checkBrandImpersonation 側で
 * 検出されるため、ここでは完全一致のラベルはスキップして二重計上を防ぐ。
 *
 * 既知の限界: 辞書的なチェックを行わないため、ブランド名と偶然
 * 編集距離が近い一般的な単語(例: "apple" に対する "ample")を
 * 誤検知する可能性がある。将来的には一般語の許可リストや、
 * ドメイン登録日などの追加シグナルとの組み合わせで精度を上げられる。
 */
export function checkTyposquatting(hostname: string): RiskFinding[] {
  // ドット区切りのラベルだけでなく、"paypa1-secure-login.com" のように
  // ハイフンでつながれたラベル内の単語も個別に比較できるよう分割する。
  const tokens = hostname.split(/[.-]/).filter((token) => token.length > 0);
  const findings: RiskFinding[] = [];

  for (const brand of KNOWN_BRANDS) {
    const isOfficial = brand.officialDomains.some((domain) => isSameOrSubdomain(hostname, domain));
    if (isOfficial) continue;

    const maxDistance = maxAllowedTypoDistance(brand.name);

    for (const token of tokens) {
      if (token === brand.name) continue; // 完全一致は brand-impersonation 側で処理する
      if (Math.abs(token.length - brand.name.length) > maxDistance) continue; // 明らかに違う長さは早期スキップ

      const distance = levenshteinDistance(token, brand.name);
      if (distance >= 1 && distance <= maxDistance) {
        findings.push({
          rule: 'typosquatting',
          message: `「${token}」は有名ブランド「${brand.name}」と綴りが酷似しています(編集距離: ${distance})`,
          score: SCORE.TYPOSQUATTING,
        });
        break; // このブランドについては1件報告すれば十分
      }
    }
  }

  return findings;
}

/**
 * 無料/汎用ホスティングサービスのドメイン上にあるかを検出する。
 */
export function checkFreeHosting(hostname: string): RiskFinding[] {
  for (const domain of FREE_HOSTING_DOMAINS) {
    if (isSameOrSubdomain(hostname, domain)) {
      return [
        {
          rule: 'free-hosting',
          message: `無料ホスティングサービス「${domain}」上のドメインです`,
          score: SCORE.FREE_HOSTING,
        },
      ];
    }
  }
  return [];
}

function levelFromScore(score: number): RiskLevel {
  if (score >= THRESHOLD.DANGER) return 'danger';
  if (score >= THRESHOLD.CAUTION) return 'caution';
  return 'safe';
}

/**
 * 入力URLに対してすべてのルールを適用し、スコアと3段階判定をまとめて返す。
 */
export function checkUrl(rawUrl: string): RiskResult {
  let hostname: string;
  try {
    hostname = extractHostname(rawUrl);
  } catch {
    return {
      input: rawUrl,
      score: 0,
      level: 'caution',
      findings: [],
      parseError: 'URLとして解析できませんでした。入力内容を確認してください。',
    };
  }

  const findings: RiskFinding[] = [
    ...checkBrandImpersonation(hostname),
    ...checkTyposquatting(hostname),
    ...checkFreeHosting(hostname),
  ];
  const score = findings.reduce((sum, f) => sum + f.score, 0);

  return {
    input: rawUrl,
    hostname,
    score,
    level: levelFromScore(score),
    findings,
  };
}
