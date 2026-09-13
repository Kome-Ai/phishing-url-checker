// Chrome拡張機能のcontent script。
// リスク判定ロジックはCLI版と共通の src/riskChecker.ts をそのまま再利用する
// (esbuildでバンドルし、Node固有APIを使わないので変更なしで動く)。
import { checkUrl } from '../../src/riskChecker';
import type { RiskResult } from '../../src/riskChecker';

// content scriptが二重注入された場合(拡張機能の再読み込み等)に
// イベントリスナーが重複登録されるのを防ぐガード。
if (!(window as any).__phishingUrlCheckerInjected) {
  (window as any).__phishingUrlCheckerInjected = true;
  init();
}

function init(): void {
  const BADGE_ID = 'puc-hover-badge';
  const MODAL_ID = 'puc-warning-modal';

  // 同じURLを何度も判定し直さないための簡易キャッシュ。
  const riskCache = new Map<string, RiskResult>();
  let currentHoverAnchor: HTMLAnchorElement | null = null;

  function getRisk(url: string): RiskResult {
    const cached = riskCache.get(url);
    if (cached) return cached;
    const result = checkUrl(url);
    riskCache.set(url, result);
    return result;
  }

  function findAnchor(target: EventTarget | null): HTMLAnchorElement | null {
    if (!(target instanceof Element)) return null;
    return target.closest<HTMLAnchorElement>('a[href]');
  }

  /** ページ内アンカー(#top等)・javascript:・mailto:・telリンクは判定対象から除外する */
  function isCheckable(anchor: HTMLAnchorElement): boolean {
    const raw = anchor.getAttribute('href');
    if (!raw) return false;
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return false;
    if (/^(javascript|mailto|tel):/i.test(trimmed)) return false;
    try {
      return anchor.protocol === 'http:' || anchor.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return char;
      }
    });
  }

  // --- ホバー時の警告バッジ -------------------------------------------------

  function removeBadge(): void {
    document.getElementById(BADGE_ID)?.remove();
  }

  function positionBadge(badge: HTMLElement, clientX: number, clientY: number): void {
    const offset = 14;
    const rect = badge.getBoundingClientRect();
    let left = clientX + offset;
    let top = clientY + offset;
    const maxLeft = window.innerWidth - rect.width - 8;
    const maxTop = window.innerHeight - rect.height - 8;
    if (left > maxLeft) left = Math.max(8, clientX - rect.width - offset);
    if (top > maxTop) top = Math.max(8, clientY - rect.height - offset);
    badge.style.left = `${left}px`;
    badge.style.top = `${top}px`;
  }

  function showBadge(result: RiskResult, clientX: number, clientY: number): void {
    removeBadge();
    const icon = result.level === 'danger' ? '🔴' : '🟡';
    const label = result.level === 'danger' ? '危険' : '注意';
    const reason = result.findings.map((f) => f.message).join(' / ');

    const badge = document.createElement('div');
    badge.id = BADGE_ID;
    badge.className = `puc-badge puc-badge--${result.level}`;
    badge.innerHTML = `
      <span class="puc-badge__label">${icon} ${label}</span>
      <span class="puc-badge__reason">${escapeHtml(reason)}</span>
    `;
    document.body.appendChild(badge);
    positionBadge(badge, clientX, clientY);
  }

  // mouseoverはbubbleするのでdocumentへの委譲で全リンクをカバーできる
  // (動的に追加されたリンクにも個別リスナー登録なしで対応できる)。
  document.addEventListener(
    'mouseover',
    (event) => {
      const anchor = findAnchor(event.target);
      if (!anchor || !isCheckable(anchor)) return;
      if (anchor === currentHoverAnchor) return;
      currentHoverAnchor = anchor;

      const result = getRisk(anchor.href);
      if (result.parseError || result.level === 'safe') {
        removeBadge();
        return;
      }
      showBadge(result, event.clientX, event.clientY);
    },
    true,
  );

  document.addEventListener(
    'mousemove',
    (event) => {
      if (!currentHoverAnchor) return;
      const badge = document.getElementById(BADGE_ID);
      if (badge) positionBadge(badge, event.clientX, event.clientY);
    },
    true,
  );

  document.addEventListener(
    'mouseout',
    (event) => {
      if (!currentHoverAnchor) return;
      const anchor = findAnchor(event.target);
      if (anchor !== currentHoverAnchor) return;
      const related = event.relatedTarget;
      if (related instanceof Node && currentHoverAnchor.contains(related)) return;
      currentHoverAnchor = null;
      removeBadge();
    },
    true,
  );

  window.addEventListener(
    'scroll',
    () => {
      currentHoverAnchor = null;
      removeBadge();
    },
    true,
  );

  // --- クリック時のブロック -------------------------------------------------

  function handleModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') closeModal();
  }

  function closeModal(): void {
    document.getElementById(MODAL_ID)?.remove();
    document.removeEventListener('keydown', handleModalKeydown);
  }

  function navigate(anchor: HTMLAnchorElement): void {
    if (anchor.target === '_blank') {
      window.open(anchor.href, '_blank', 'noopener');
    } else {
      window.location.href = anchor.href;
    }
  }

  function showWarningModal(anchor: HTMLAnchorElement, result: RiskResult): void {
    closeModal();

    const reasonItems = result.findings.map((f) => `<li>${escapeHtml(f.message)}</li>`).join('');

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.className = 'puc-overlay';
    overlay.innerHTML = `
      <div class="puc-modal" role="alertdialog" aria-modal="true" aria-labelledby="puc-modal-title">
        <div class="puc-modal__header">
          <span class="puc-modal__icon">🔴</span>
          <span id="puc-modal-title">危険なURLへのアクセスをブロックしました</span>
        </div>
        <p class="puc-modal__url">${escapeHtml(anchor.href)}</p>
        <ul class="puc-modal__reasons">${reasonItems}</ul>
        <p class="puc-modal__note">
          このリンクはフィッシングサイトの可能性があります。パスワードや個人情報の入力は行わないでください。
        </p>
        <div class="puc-modal__actions">
          <button type="button" class="puc-btn puc-btn--cancel" data-puc-action="cancel">キャンセル(推奨)</button>
          <button type="button" class="puc-btn puc-btn--proceed" data-puc-action="proceed">リスクを理解して続行</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (event) => {
      const targetEl = event.target as HTMLElement;
      if (targetEl === overlay || targetEl.dataset.pucAction === 'cancel') {
        closeModal();
        return;
      }
      if (targetEl.dataset.pucAction === 'proceed') {
        closeModal();
        navigate(anchor);
      }
    });

    document.addEventListener('keydown', handleModalKeydown);
    overlay.querySelector<HTMLButtonElement>('[data-puc-action="cancel"]')?.focus();
  }

  // captureフェーズで拾うことで、ページ側のクリックハンドラより先に
  // 割り込み、stopPropagation()されても確実にブロックできるようにする。
  document.addEventListener(
    'click',
    (event) => {
      const anchor = findAnchor(event.target);
      if (!anchor || !isCheckable(anchor)) return;

      const result = getRisk(anchor.href);
      if (result.level !== 'danger') return; // 安全・注意は通常通り遷移させる

      event.preventDefault();
      event.stopPropagation();
      removeBadge();
      showWarningModal(anchor, result);
    },
    true,
  );
}
