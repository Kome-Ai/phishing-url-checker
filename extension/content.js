"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/brands.ts
  var KNOWN_BRANDS;
  var init_brands = __esm({
    "src/brands.ts"() {
      "use strict";
      KNOWN_BRANDS = [
        { name: "anthropic", officialDomains: ["anthropic.com"] },
        { name: "claude", officialDomains: ["claude.ai", "anthropic.com"] },
        { name: "google", officialDomains: ["google.com", "google.co.jp"] },
        { name: "amazon", officialDomains: ["amazon.com", "amazon.co.jp"] },
        { name: "apple", officialDomains: ["apple.com"] },
        { name: "microsoft", officialDomains: ["microsoft.com", "live.com", "office.com"] },
        { name: "paypal", officialDomains: ["paypal.com"] },
        { name: "facebook", officialDomains: ["facebook.com", "fb.com"] },
        { name: "instagram", officialDomains: ["instagram.com"] },
        { name: "netflix", officialDomains: ["netflix.com"] },
        { name: "twitter", officialDomains: ["twitter.com", "x.com"] },
        { name: "rakuten", officialDomains: ["rakuten.co.jp", "rakuten.com"] },
        { name: "yahoo", officialDomains: ["yahoo.com", "yahoo.co.jp"] },
        { name: "linkedin", officialDomains: ["linkedin.com"] }
      ];
    }
  });

  // src/freeHosting.ts
  var FREE_HOSTING_DOMAINS;
  var init_freeHosting = __esm({
    "src/freeHosting.ts"() {
      "use strict";
      FREE_HOSTING_DOMAINS = [
        "firebaseapp.com",
        "web.app",
        "herokuapp.com",
        "github.io",
        "netlify.app",
        "vercel.app",
        "pages.dev",
        "glitch.me",
        "repl.co",
        "weebly.com",
        "wixsite.com",
        "blogspot.com",
        "appspot.com",
        "surge.sh",
        "onrender.com",
        "000webhostapp.com",
        "ngrok.io",
        "ngrok-free.app",
        "workers.dev"
      ];
    }
  });

  // src/levenshtein.ts
  function levenshteinDistance(a, b) {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const currentRow = [i];
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        currentRow.push(
          Math.min(
            previousRow[j] + 1,
            // 削除
            currentRow[j - 1] + 1,
            // 挿入
            previousRow[j - 1] + cost
            // 置換
          )
        );
      }
      previousRow = currentRow;
    }
    return previousRow[b.length];
  }
  var init_levenshtein = __esm({
    "src/levenshtein.ts"() {
      "use strict";
    }
  });

  // src/riskChecker.ts
  function extractHostname(rawUrl) {
    const trimmed = rawUrl.trim();
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
    const candidate = hasScheme ? trimmed : `http://${trimmed}`;
    const url = new URL(candidate);
    return url.hostname.toLowerCase();
  }
  function isSameOrSubdomain(hostname, domain) {
    return hostname === domain || hostname.endsWith(`.${domain}`);
  }
  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function brandTokenPattern(brandName) {
    const escaped = escapeRegExp(brandName);
    return new RegExp(`(^|[.-])${escaped}([.-]|$)`, "i");
  }
  function checkBrandImpersonation(hostname) {
    const findings = [];
    for (const brand of KNOWN_BRANDS) {
      const isOfficial = brand.officialDomains.some((domain) => isSameOrSubdomain(hostname, domain));
      if (isOfficial) continue;
      if (brandTokenPattern(brand.name).test(hostname)) {
        findings.push({
          rule: "brand-impersonation",
          message: `\u6709\u540D\u30D6\u30E9\u30F3\u30C9\u300C${brand.name}\u300D\u3092\u542B\u307F\u307E\u3059\u304C\u3001\u516C\u5F0F\u30C9\u30E1\u30A4\u30F3(${brand.officialDomains.join(", ")})\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093`,
          score: SCORE.BRAND_IMPERSONATION
        });
      }
    }
    return findings;
  }
  function maxAllowedTypoDistance(brandName) {
    return brandName.length <= 5 ? 1 : 2;
  }
  function checkTyposquatting(hostname) {
    const tokens = hostname.split(/[.-]/).filter((token) => token.length > 0);
    const findings = [];
    for (const brand of KNOWN_BRANDS) {
      const isOfficial = brand.officialDomains.some((domain) => isSameOrSubdomain(hostname, domain));
      if (isOfficial) continue;
      const maxDistance = maxAllowedTypoDistance(brand.name);
      for (const token of tokens) {
        if (token === brand.name) continue;
        if (Math.abs(token.length - brand.name.length) > maxDistance) continue;
        const distance = levenshteinDistance(token, brand.name);
        if (distance >= 1 && distance <= maxDistance) {
          findings.push({
            rule: "typosquatting",
            message: `\u300C${token}\u300D\u306F\u6709\u540D\u30D6\u30E9\u30F3\u30C9\u300C${brand.name}\u300D\u3068\u7DB4\u308A\u304C\u9177\u4F3C\u3057\u3066\u3044\u307E\u3059(\u7DE8\u96C6\u8DDD\u96E2: ${distance})`,
            score: SCORE.TYPOSQUATTING
          });
          break;
        }
      }
    }
    return findings;
  }
  function checkFreeHosting(hostname) {
    for (const domain of FREE_HOSTING_DOMAINS) {
      if (isSameOrSubdomain(hostname, domain)) {
        return [
          {
            rule: "free-hosting",
            message: `\u7121\u6599\u30DB\u30B9\u30C6\u30A3\u30F3\u30B0\u30B5\u30FC\u30D3\u30B9\u300C${domain}\u300D\u4E0A\u306E\u30C9\u30E1\u30A4\u30F3\u3067\u3059`,
            score: SCORE.FREE_HOSTING
          }
        ];
      }
    }
    return [];
  }
  function levelFromScore(score) {
    if (score >= THRESHOLD.DANGER) return "danger";
    if (score >= THRESHOLD.CAUTION) return "caution";
    return "safe";
  }
  function checkUrl(rawUrl) {
    let hostname;
    try {
      hostname = extractHostname(rawUrl);
    } catch {
      return {
        input: rawUrl,
        score: 0,
        level: "caution",
        findings: [],
        parseError: "URL\u3068\u3057\u3066\u89E3\u6790\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      };
    }
    const findings = [
      ...checkBrandImpersonation(hostname),
      ...checkTyposquatting(hostname),
      ...checkFreeHosting(hostname)
    ];
    const score = findings.reduce((sum, f) => sum + f.score, 0);
    return {
      input: rawUrl,
      hostname,
      score,
      level: levelFromScore(score),
      findings
    };
  }
  var SCORE, THRESHOLD;
  var init_riskChecker = __esm({
    "src/riskChecker.ts"() {
      "use strict";
      init_brands();
      init_freeHosting();
      init_levenshtein();
      SCORE = {
        BRAND_IMPERSONATION: 60,
        FREE_HOSTING: 30,
        // タイポスクワッティングは編集距離による曖昧一致のため、完全一致の
        // ブランドなりすましより誤検知の可能性が高い。単独では「注意」に留め、
        // 無料ホスティング等の他シグナルと重なった場合に「危険」へ引き上げる。
        TYPOSQUATTING: 50
      };
      THRESHOLD = {
        DANGER: 60,
        CAUTION: 20
      };
    }
  });

  // extension/src/content.ts
  var require_content = __commonJS({
    "extension/src/content.ts"() {
      init_riskChecker();
      if (!window.__phishingUrlCheckerInjected) {
        window.__phishingUrlCheckerInjected = true;
        init();
      }
      function init() {
        const BADGE_ID = "puc-hover-badge";
        const MODAL_ID = "puc-warning-modal";
        const riskCache = /* @__PURE__ */ new Map();
        let currentHoverAnchor = null;
        function getRisk(url) {
          const cached = riskCache.get(url);
          if (cached) return cached;
          const result = checkUrl(url);
          riskCache.set(url, result);
          return result;
        }
        function findAnchor(target) {
          if (!(target instanceof Element)) return null;
          return target.closest("a[href]");
        }
        function isCheckable(anchor) {
          const raw = anchor.getAttribute("href");
          if (!raw) return false;
          const trimmed = raw.trim();
          if (trimmed === "" || trimmed.startsWith("#")) return false;
          if (/^(javascript|mailto|tel):/i.test(trimmed)) return false;
          try {
            return anchor.protocol === "http:" || anchor.protocol === "https:";
          } catch {
            return false;
          }
        }
        function escapeHtml(value) {
          return value.replace(/[&<>"']/g, (char) => {
            switch (char) {
              case "&":
                return "&amp;";
              case "<":
                return "&lt;";
              case ">":
                return "&gt;";
              case '"':
                return "&quot;";
              case "'":
                return "&#39;";
              default:
                return char;
            }
          });
        }
        function removeBadge() {
          document.getElementById(BADGE_ID)?.remove();
        }
        function positionBadge(badge, clientX, clientY) {
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
        function showBadge(result, clientX, clientY) {
          removeBadge();
          const icon = result.level === "danger" ? "\u{1F534}" : "\u{1F7E1}";
          const label = result.level === "danger" ? "\u5371\u967A" : "\u6CE8\u610F";
          const reason = result.findings.map((f) => f.message).join(" / ");
          const badge = document.createElement("div");
          badge.id = BADGE_ID;
          badge.className = `puc-badge puc-badge--${result.level}`;
          badge.innerHTML = `
      <span class="puc-badge__label">${icon} ${label}</span>
      <span class="puc-badge__reason">${escapeHtml(reason)}</span>
    `;
          document.body.appendChild(badge);
          positionBadge(badge, clientX, clientY);
        }
        document.addEventListener(
          "mouseover",
          (event) => {
            const anchor = findAnchor(event.target);
            if (!anchor || !isCheckable(anchor)) return;
            if (anchor === currentHoverAnchor) return;
            currentHoverAnchor = anchor;
            const result = getRisk(anchor.href);
            if (result.parseError || result.level === "safe") {
              removeBadge();
              return;
            }
            showBadge(result, event.clientX, event.clientY);
          },
          true
        );
        document.addEventListener(
          "mousemove",
          (event) => {
            if (!currentHoverAnchor) return;
            const badge = document.getElementById(BADGE_ID);
            if (badge) positionBadge(badge, event.clientX, event.clientY);
          },
          true
        );
        document.addEventListener(
          "mouseout",
          (event) => {
            if (!currentHoverAnchor) return;
            const anchor = findAnchor(event.target);
            if (anchor !== currentHoverAnchor) return;
            const related = event.relatedTarget;
            if (related instanceof Node && currentHoverAnchor.contains(related)) return;
            currentHoverAnchor = null;
            removeBadge();
          },
          true
        );
        window.addEventListener(
          "scroll",
          () => {
            currentHoverAnchor = null;
            removeBadge();
          },
          true
        );
        function handleModalKeydown(event) {
          if (event.key === "Escape") closeModal();
        }
        function closeModal() {
          document.getElementById(MODAL_ID)?.remove();
          document.removeEventListener("keydown", handleModalKeydown);
        }
        function navigate(anchor) {
          if (anchor.target === "_blank") {
            window.open(anchor.href, "_blank", "noopener");
          } else {
            window.location.href = anchor.href;
          }
        }
        function showWarningModal(anchor, result) {
          closeModal();
          const reasonItems = result.findings.map((f) => `<li>${escapeHtml(f.message)}</li>`).join("");
          const overlay = document.createElement("div");
          overlay.id = MODAL_ID;
          overlay.className = "puc-overlay";
          overlay.innerHTML = `
      <div class="puc-modal" role="alertdialog" aria-modal="true" aria-labelledby="puc-modal-title">
        <div class="puc-modal__header">
          <span class="puc-modal__icon">\u{1F534}</span>
          <span id="puc-modal-title">\u5371\u967A\u306AURL\u3078\u306E\u30A2\u30AF\u30BB\u30B9\u3092\u30D6\u30ED\u30C3\u30AF\u3057\u307E\u3057\u305F</span>
        </div>
        <p class="puc-modal__url">${escapeHtml(anchor.href)}</p>
        <ul class="puc-modal__reasons">${reasonItems}</ul>
        <p class="puc-modal__note">
          \u3053\u306E\u30EA\u30F3\u30AF\u306F\u30D5\u30A3\u30C3\u30B7\u30F3\u30B0\u30B5\u30A4\u30C8\u306E\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u30D1\u30B9\u30EF\u30FC\u30C9\u3084\u500B\u4EBA\u60C5\u5831\u306E\u5165\u529B\u306F\u884C\u308F\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002
        </p>
        <div class="puc-modal__actions">
          <button type="button" class="puc-btn puc-btn--cancel" data-puc-action="cancel">\u30AD\u30E3\u30F3\u30BB\u30EB(\u63A8\u5968)</button>
          <button type="button" class="puc-btn puc-btn--proceed" data-puc-action="proceed">\u30EA\u30B9\u30AF\u3092\u7406\u89E3\u3057\u3066\u7D9A\u884C</button>
        </div>
      </div>
    `;
          document.body.appendChild(overlay);
          overlay.addEventListener("click", (event) => {
            const targetEl = event.target;
            if (targetEl === overlay || targetEl.dataset.pucAction === "cancel") {
              closeModal();
              return;
            }
            if (targetEl.dataset.pucAction === "proceed") {
              closeModal();
              navigate(anchor);
            }
          });
          document.addEventListener("keydown", handleModalKeydown);
          overlay.querySelector('[data-puc-action="cancel"]')?.focus();
        }
        document.addEventListener(
          "click",
          (event) => {
            const anchor = findAnchor(event.target);
            if (!anchor || !isCheckable(anchor)) return;
            const result = getRisk(anchor.href);
            if (result.level !== "danger") return;
            event.preventDefault();
            event.stopPropagation();
            removeBadge();
            showWarningModal(anchor, result);
          },
          true
        );
      }
    }
  });
  require_content();
})();
