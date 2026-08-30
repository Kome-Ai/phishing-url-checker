/**
 * なりすまし判定の対象とする有名ブランドと、その公式ドメイン一覧。
 *
 * ここに列挙した `name` がホスト名にトークンとして含まれるが、
 * `officialDomains` のいずれとも一致しない(サブドメインも含めて)場合に警告する。
 *
 * 将来的な拡張候補:
 *  - タイポスクワッティング(goog1e.com 等)の類似度判定
 *  - Punycode / IDN ホモグラフの検出
 *  - ブランド一覧の外部ファイル/API化
 */
export interface BrandDefinition {
  /** ホスト名中で検出するブランド名(小文字) */
  name: string;
  /** このブランドの正規ドメイン一覧(サブドメインは自動的に許可される) */
  officialDomains: string[];
}

export const KNOWN_BRANDS: BrandDefinition[] = [
  { name: 'anthropic', officialDomains: ['anthropic.com'] },
  { name: 'claude', officialDomains: ['claude.ai', 'anthropic.com'] },
  { name: 'google', officialDomains: ['google.com', 'google.co.jp'] },
  { name: 'amazon', officialDomains: ['amazon.com', 'amazon.co.jp'] },
  { name: 'apple', officialDomains: ['apple.com'] },
  { name: 'microsoft', officialDomains: ['microsoft.com', 'live.com', 'office.com'] },
  { name: 'paypal', officialDomains: ['paypal.com'] },
  { name: 'facebook', officialDomains: ['facebook.com', 'fb.com'] },
  { name: 'instagram', officialDomains: ['instagram.com'] },
  { name: 'netflix', officialDomains: ['netflix.com'] },
  { name: 'twitter', officialDomains: ['twitter.com', 'x.com'] },
  { name: 'rakuten', officialDomains: ['rakuten.co.jp', 'rakuten.com'] },
  { name: 'yahoo', officialDomains: ['yahoo.com', 'yahoo.co.jp'] },
  { name: 'linkedin', officialDomains: ['linkedin.com'] },
];
