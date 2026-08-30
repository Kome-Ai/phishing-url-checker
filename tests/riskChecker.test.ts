import { describe, expect, it } from 'vitest';
import { checkUrl, extractHostname } from '../src/riskChecker';

describe('extractHostname', () => {
  it('スキーム付きURLからホスト名を取り出せる', () => {
    expect(extractHostname('https://www.example.com/path?x=1')).toBe('www.example.com');
  });

  it('スキームが省略されていても解析できる', () => {
    expect(extractHostname('example.com/path')).toBe('example.com');
  });

  it('不正なURLはエラーを投げる', () => {
    expect(() => extractHostname('http://')).toThrow();
  });
});

describe('checkUrl - 安全なURL', () => {
  it('無関係なドメインはノーヒットで安全と判定される', () => {
    const result = checkUrl('https://example.com');
    expect(result.level).toBe('safe');
    expect(result.score).toBe(0);
    expect(result.findings).toHaveLength(0);
  });

  it('公式ドメインそのものはブランド判定でヒットしない', () => {
    const result = checkUrl('https://www.google.com/search');
    expect(result.level).toBe('safe');
    expect(result.findings).toHaveLength(0);
  });

  it('公式ドメインのサブドメインもヒットしない', () => {
    const result = checkUrl('https://accounts.google.com/signin');
    expect(result.level).toBe('safe');
  });
});

describe('checkUrl - ブランドなりすまし', () => {
  it('公式ドメインと一致しないブランド名入りドメインを危険と判定する', () => {
    const result = checkUrl('http://accounts-google-verify.com/login');
    expect(result.level).toBe('danger');
    expect(result.findings.some((f) => f.rule === 'brand-impersonation')).toBe(true);
  });

  it('公式ドメインのサブドメインを装った攻撃(goo.google.evil.com)を検出する', () => {
    const result = checkUrl('http://goo.google.evil.com/');
    expect(result.level).toBe('danger');
  });

  it('文字列中に偶然ブランド名を含むだけの単語は誤検知しない(トークン境界)', () => {
    // "online" の中に "line" は含まれるが、境界一致しないので検出されない
    const result = checkUrl('https://online-shop-example.com');
    expect(result.findings.some((f) => f.rule === 'brand-impersonation')).toBe(false);
  });
});

describe('checkUrl - タイポスクワッティング', () => {
  it('数字の1でLを置き換えたドメイン(goog1e.com)を検出する', () => {
    const result = checkUrl('https://goog1e.com/login');
    expect(result.findings.some((f) => f.rule === 'typosquatting')).toBe(true);
    expect(result.level).toBe('caution'); // 単独では危険までは上げない
  });

  it('paypalの1文字置換(paypa1)を検出する', () => {
    const result = checkUrl('https://paypa1-secure-login.com');
    expect(result.findings.some((f) => f.rule === 'typosquatting')).toBe(true);
  });

  it('netflixの1文字挿入(netfliix)を検出する', () => {
    const result = checkUrl('https://netfliix.com');
    expect(result.findings.some((f) => f.rule === 'typosquatting')).toBe(true);
  });

  it('公式ドメインは編集距離0のため誤検知しない', () => {
    const result = checkUrl('https://www.paypal.com');
    expect(result.findings.some((f) => f.rule === 'typosquatting')).toBe(false);
  });

  it('ブランド名を完全一致で含む場合はbrand-impersonation側の担当でtyposquattingは重複計上しない', () => {
    const result = checkUrl('https://accounts-google-verify.com');
    expect(result.findings.some((f) => f.rule === 'brand-impersonation')).toBe(true);
    expect(result.findings.some((f) => f.rule === 'typosquatting')).toBe(false);
  });

  it('全く無関係なドメインは誤検知しない', () => {
    const result = checkUrl('https://my-personal-blog.com');
    expect(result.findings.some((f) => f.rule === 'typosquatting')).toBe(false);
  });

  it('タイポスクワッティング + 無料ホスティングの組み合わせで危険に引き上がる', () => {
    const result = checkUrl('https://goog1e-secure.firebaseapp.com');
    expect(result.findings.some((f) => f.rule === 'typosquatting')).toBe(true);
    expect(result.findings.some((f) => f.rule === 'free-hosting')).toBe(true);
    expect(result.level).toBe('danger');
  });
});

describe('checkUrl - 無料ホスティング', () => {
  it('firebaseapp.com のサブドメインを注意と判定する', () => {
    const result = checkUrl('https://phishing-example.firebaseapp.com');
    expect(result.level).toBe('caution');
    expect(result.findings.some((f) => f.rule === 'free-hosting')).toBe(true);
  });

  it('herokuapp.com のサブドメインを注意と判定する', () => {
    const result = checkUrl('https://fake-login.herokuapp.com');
    expect(result.level).toBe('caution');
  });
});

describe('checkUrl - 複合ケース', () => {
  it('ブランド名 + 無料ホスティングの組み合わせはスコアが加算され危険になる', () => {
    const result = checkUrl('https://google-account-verify.firebaseapp.com');
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
    expect(result.level).toBe('danger');
    expect(result.score).toBeGreaterThan(60);
  });
});

describe('checkUrl - 不正な入力', () => {
  it('URLとして解析できない入力はエラーメッセージ付きで返す', () => {
    const result = checkUrl('http://');
    expect(result.parseError).toBeDefined();
  });
});
