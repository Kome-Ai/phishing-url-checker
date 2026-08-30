/**
 * レーベンシュタイン距離(編集距離)を計算する。
 * 2つの文字列を一致させるのに必要な挿入・削除・置換の最小回数。
 *
 * タイポスクワッティング検出で「ブランド名に文字が1〜2個だけ違う」
 * ドメインラベルを見つけるために使用する。
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // 1行分だけ保持するメモリ節約版のDP
  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow.push(
        Math.min(
          previousRow[j] + 1, // 削除
          currentRow[j - 1] + 1, // 挿入
          previousRow[j - 1] + cost, // 置換
        ),
      );
    }
    previousRow = currentRow;
  }

  return previousRow[b.length];
}
