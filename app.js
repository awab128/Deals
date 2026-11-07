/* Deals site: the list pages (index.html, hot.html, discounts.html) and the deal pages (d/<SKU>.html),
 * in Arabic (site root) and English (en/). The page's <html lang> picks the language.
 *
 * deals.js sets window.__DEALS__ = {meta: {updated, name, tg, x, fb, count, ...}, deals: [deal, ...]}, one deal:
 *   id SKU · s store ('a' Amazon, 'n' Noon) · t title · k product type in Arabic · e emoji · c category (Arabic, the key)
 *   ce category in English · b brand · p price now · w "before" price · ws / we whose "before" price it is (ar / en)
 *   pct % off · sv riyals saved · f price with a code/coupon · fh 'كود' | 'كوبون' · r rating · rc reviews · img / big image
 *   u store link · o when the price was seen · fs deal since (or posted at) · low lowest in N days · lw 'ours' | 'store'
 *   tags [verified, low, fast, official, choice, code, top, event, flash] · ab / abe about-the-product lines (AI) · tl / tle facts lines · cl / cle code lines · cd codes
 *   sc score · post {at, tg, fb} · end ended at · h price history [[unix day, price], ...]
 */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const EN = document.documentElement.lang === 'en';
  const ROOT = document.body.dataset.root || '';             // back to the site's root (deals.js, assets)
  const LROOT = ROOT + (EN ? 'en/' : '');                    // this language's pages
  const PAGE = document.body.dataset.page;
  const PER = [15, 30, 60, 100];                              // deals per page the visitor can pick

  // ---- words --------------------------------------------------------------------------------------
  const T = EN ? {
    store: { a: 'Amazon', n: 'noon' }, sar: 'SAR', months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    now: 'just now', yesterday: 'yesterday',
    ago: (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'} ago`, units: ['minute', 'hour', 'day'],
    days: n => `${n} day${n === 1 ? '' : 's'}`,
    period: d => d >= 365 ? 'in a year' : d >= 90 ? 'in 3 months' : `in ${d} days`,
    copyFail: "Couldn't copy, please copy it by hand", linkCopied: 'Deal link copied', codeCopied: c => `Code ${c} copied`,
    shareText: (d, price, store) => `${d.t.slice(0, 90)}\n${price} SAR on ${store}`,
    favAdded: 'Added to favourites ♥', favRemoved: 'Removed from favourites',
    tagLow: p => `📉 Lowest price ${p}`, verified: '✅ Confirmed drop', fast: '⚡ Fast delivery', top: '🏆 Best seller',
    soldBy: s => `🏪 Sold by ${s}`, choice: "👍 Amazon's Choice", event: '🛍 Sale event', flash: '⚡ Flash deal',
    fromChannel: '📣 Posted', withHow: (price, how) => `✂️ ${price} SAR with ${how === 'كوبون' ? 'coupon' : 'code'}`,
    save: v => `Save ${v} SAR`, seenAt: 'When we checked the price', seeNow: 'See the price now', orderFrom: s => `Buy on ${s}`,
    fav: 'Add to favourites', share: 'Share this deal',
    updated: a => `Updated automatically · last update ${a}`, footUpdated: d => `Deals last updated: ${d}`,
    quick: { all: '🔥 All deals', posted: '📣 Posted in our channel', verified: '✅ Confirmed drop', low: '📉 Lowest price',
      half: '💥 50% off or more', code: '🏷 With a code or coupon', fast: '⚡ Fast delivery', new: '🆕 New today',
      u100: '💸 Under 100 SAR', top: '⭐ Rated 4.5+', fav: '♥ Favourites' },
    all: 'All', allCats: 'All categories',
    stats: ['live deals', 'biggest discount', 'biggest saving', 'posted in our channel'],
    emptyTitle: 'No deals match these filters', emptyFav: 'Tap ♥ on any deal to keep it here.',
    emptyTip: 'Try clearing the search or loosening the filters.', resetAll: 'Clear all filters',
    count: (n, q) => `${n} deal${n === '1' ? '' : 's'}${q ? ` for “${q}”` : ''}`,
    filters: 'Filters', minPct: 'Minimum discount', anyPct: 'Any', price: 'Price (SAR)', from: 'from', to: 'to',
    minPrice: 'Lowest price', maxPrice: 'Highest price', r4: '4 stars and up only', showEnded: 'Show deals that ended',
    apply: 'Show results', clear: 'Clear', close: 'Close',
    loadFail: "Couldn't load the deals", loadTip: 'Check your connection and refresh the page.', fresh: 'New deals just arrived ✨',
    chartLabel: (a, b) => `Price from ${a} to ${b}`,
    chartNote: (hi, lo, days) => `Highest price we saw ${hi} SAR · lowest ${lo} SAR · over ${days}`,
    statusEnded: 'Deal ended: the price went back up', statusGone: 'No longer on our list, check the price',
    statusOn: 'Deal available', rating: 'Rating', ratingOf: (r, n) => `⭐ ${r}${n ? ` from ${n} reviews` : ''}`,
    storeL: 'Store', category: 'Category', postedAt: 'We posted it', since: 'Current price since',
    postTg: 'The Telegram post', postFb: 'The Facebook post', codesTitle: '🏷 Codes and extra offers', copyCode: 'Copy code',
    aboutTitle: 'About this product', whyTitle: 'Why this deal is worth it', verifiedLine: p => `✅ We tracked the price ourselves: down ${p}% from its usual price`,
    claimLine: (p, who) => `🏷 ${p}% off compared with ${who}`, crumbs: 'Breadcrumb', allDeals: 'All deals',
    beforePrice: who => `Before the discount: ${who}`, youSave: v => `✅ You save ${v} SAR`,
    stamp: (d, a) => `🕒 Price checked: ${d} (${a})`, stampOld: ' — it may have changed, check it on the store',
    seeNowIn: s => `See the price on ${s}`, orderNow: s => `Buy on ${s} now`, historyTitle: '📈 Its price over the last days',
    shareTitle: 'Share this deal', whatsapp: 'WhatsApp', telegram: 'Telegram', x: 'X', copyLink: 'Copy link',
    note: (s, p, w, a) => `${s} lists this product at ${p} SAR${w ? ` instead of ${w} SAR` : ''}. We checked the price ${a}, and deal prices change fast, so the final price is the one on the ${s} page. This is an affiliate link: it costs you nothing extra.`,
    msg: (d, price) => `${d.t.slice(0, 80)} for ${price} SAR`,
    railEvent: ev => `🛍 ${ev} deals`, railHot: '🔥 Hot deals right now', seeAll: 'See all →', railPrev: 'Previous deals', railNext: 'Next deals', railPause: 'Pause', railPlay: 'Play', evChip: ev => `🛍 ${ev} deals`,
    prev: '‹ Previous', next: 'Next ›', page: n => `Page ${n}`, showing: (a, b, n) => `${a}–${b} of ${n} deals`,
  } : {
    store: { a: 'أمازون', n: 'نون' }, sar: 'ريال', months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    now: 'الآن', yesterday: 'أمس',
    ago: (n, unit) => 'قبل ' + arCount(n, ...unit), units: [['دقيقة', 'دقيقتين', 'دقائق', 'دقيقة'], ['ساعة', 'ساعتين', 'ساعات', 'ساعة'], ['يوم', 'يومين', 'أيام', 'يوم']],
    days: n => arCount(n, 'يوم', 'يومين', 'أيام', 'يوم'),
    period: d => d >= 365 ? 'بسنة' : d >= 90 ? 'من 3 شهور' : `من ${d} يوم`,
    copyFail: 'ما قدرت أنسخ، انسخه يدويًا', linkCopied: 'تم نسخ رابط العرض', codeCopied: c => `تم نسخ الكود ${c}`,
    shareText: (d, price, store) => `${d.k ? d.k + ' — ' : ''}${d.t.slice(0, 90)}\nبـ ${price} ريال من ${store}`,
    favAdded: 'أضفناه للمفضلة ♥', favRemoved: 'شلناه من المفضلة',
    tagLow: p => `📉 أقل سعر ${p}`, verified: '✅ نزول مؤكد', fast: '⚡ توصيل سريع', top: '🏆 الأكثر مبيعًا',
    soldBy: s => `🏪 يبيعه ${s}`, choice: '👍 اختيار أمازون', event: '🛍 عرض موسم', flash: '⚡ عرض فلاش',
    fromChannel: '📣 من القناة', withHow: (price, how) => `✂️ ${price} ريال مع ال${how}`,
    save: v => `وفّر ${v} ريال`, seenAt: 'وقت رصد السعر', seeNow: 'شوف السعر الآن', orderFrom: s => `اطلب من ${s}`,
    fav: 'أضف للمفضلة', share: 'شارك العرض',
    updated: a => `محدّث تلقائيًا · آخر تحديث ${a}`, footUpdated: d => `آخر تحديث للعروض: ${d}`,
    quick: { all: '🔥 كل العروض', posted: '📣 نشرناه بالقناة', verified: '✅ نزول مؤكد', low: '📉 أقل سعر',
      half: '💥 خصم 50٪ وأكثر', code: '🏷 مع كود أو كوبون', fast: '⚡ توصيل سريع', new: '🆕 جديد اليوم',
      u100: '💸 أقل من 100 ريال', top: '⭐ تقييم 4.5 وأكثر', fav: '♥ المفضلة' },
    all: 'الكل', allCats: 'كل الأقسام',
    stats: ['عرض متوفر الآن', 'أكبر خصم', 'أكبر توفير', 'نشرناه في القناة'],
    emptyTitle: 'ما لقينا عروض بهذي الفلاتر', emptyFav: 'اضغط ♥ على أي عرض عشان يظهر هنا.',
    emptyTip: 'جرّب تمسح البحث أو تخفف الفلاتر.', resetAll: 'مسح كل الفلاتر',
    count: (n, q) => `${n} عرض${q ? ` لـ «${q}»` : ''}`,
    filters: 'فلاتر', minPct: 'أقل نسبة خصم', anyPct: 'أي خصم', price: 'السعر (ريال)', from: 'من', to: 'إلى',
    minPrice: 'أقل سعر', maxPrice: 'أعلى سعر', r4: 'تقييم 4 نجوم وأكثر فقط', showEnded: 'اعرض العروض اللي انتهت',
    apply: 'اعرض النتائج', clear: 'مسح', close: 'إغلاق',
    loadFail: 'ما قدرنا نحمّل العروض', loadTip: 'تأكد من الاتصال وحدّث الصفحة.', fresh: 'وصلت عروض جديدة ✨',
    chartLabel: (a, b) => `تغيّر السعر من ${a} إلى ${b}`,
    chartNote: (hi, lo, days) => `أعلى سعر رصدناه ${hi} ريال · أقل سعر ${lo} ريال · خلال ${days}`,
    statusEnded: 'انتهى العرض: السعر رجع ارتفع', statusGone: 'العرض ما عاد ضمن قائمتنا، تحقق من السعر',
    statusOn: 'العرض متوفر', rating: 'التقييم', ratingOf: (r, n) => `⭐ ${r}${n ? ` من ${n} تقييم` : ''}`,
    storeL: 'المتجر', category: 'القسم', postedAt: 'نشرناه', since: 'السعر الحالي من',
    postTg: 'المنشور في تيليجرام', postFb: 'المنشور في فيسبوك', codesTitle: '🏷 أكواد وعروض إضافية', copyCode: 'نسخ الكود',
    aboutTitle: 'عن المنتج', whyTitle: 'ليش هذا العرض يستاهل', verifiedLine: p => `✅ رصدنا السعر بأنفسنا: نزل ${p}٪ عن سعره المعتاد`,
    claimLine: (p, who) => `🏷 خصم ${p}٪ مقارنة بـ «${who}»`, crumbs: 'مسار الصفحة', allDeals: 'كل العروض',
    beforePrice: who => `السعر قبل الخصم: ${who}`, youSave: v => `✅ توفّر ${v} ريال`,
    stamp: (d, a) => `🕒 السعر وقت الرصد: ${d} (${a})`, stampOld: ' — قد يكون تغيّر، تأكد منه في المتجر',
    seeNowIn: s => `شوف السعر الآن في ${s}`, orderNow: s => `اطلب من ${s} الآن`, historyTitle: '📈 سعره خلال الأيام الماضية',
    shareTitle: 'شارك العرض', whatsapp: 'واتساب', telegram: 'تيليجرام', x: 'إكس', copyLink: 'نسخ الرابط',
    note: (s, p, w, a) => `${s} يعرض هذا المنتج بسعر ${p} ريال${w ? ` بدل ${w} ريال` : ''}. رصدنا السعر ${a}، وأسعار العروض تتغير بسرعة، فالسعر النهائي هو اللي يظهر لك في صفحة ${s}. الرابط رابط تسويق بالعمولة: ما تدفع أي ريال زيادة.`,
    msg: (d, price) => `${d.k ? d.k + ' — ' : ''}${d.t.slice(0, 80)} بـ ${price} ريال`,
    railEvent: ev => `🛍 عروض ${ev}`, railHot: '🔥 العروض الساخنة الآن', seeAll: 'شوف الكل ←', railPrev: 'العروض السابقة', railNext: 'العروض التالية', railPause: 'إيقاف', railPlay: 'تشغيل', evChip: ev => `🛍 عروض ${ev}`,
    prev: '› السابق', next: 'التالي ‹', page: n => `صفحة ${n}`, showing: (a, b, n) => `${a}–${b} من ${n} عرض`,
  };
  function arCount(n, one, two, few, many) {
    if (n === 1) return one;
    if (n === 2) return two;
    if (n >= 3 && n <= 10) return `${n} ${few}`;
    return `${n} ${many}`;
  }
  const STORE = T.store;
  const ICON = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.4 2.9 4.5 6.6 4.1c2-.2 3.9.8 5.4 2.6 1.5-1.8 3.4-2.8 5.4-2.6 3.7.4 5.7 4.3 4.2 7.6C19.5 16.4 12 21 12 21Z"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.8-3.4a3 3 0 0 0 0-1.6l6.8-3.4A3 3 0 1 0 15 7l-6.8 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h11a2 2 0 0 1 2 2v11h-2V5H8V3Zm-3 4h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm0 2v11h10V9H5Z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>',
    tg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.9 4.3 18.7 19.5c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9L18 6.6c.4-.3-.1-.5-.6-.2L6.6 13.2 1.9 11.7c-1-.3-1-1 .2-1.5L20.6 3c.9-.3 1.6.2 1.3 1.3Z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8V6.5c0-.8.2-1.3 1.4-1.3H17V2.1A21 21 0 0 0 14.6 2C12.2 2 10.6 3.4 10.6 6v2H8v3.4h2.6V22H14V11.4h2.7L17 8h-3Z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z"/></svg>',
  };

  // ---- small helpers ----------------------------------------------------------------------------
  const keep = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private window */ } },
  };
  const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
  const money = v => nf.format(v);
  const compact = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const has = (d, t) => (d.tags || []).includes(t);
  const hoursSince = iso => (Date.now() - Date.parse(iso)) / 3.6e6;
  const norm = s => String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ً-ْـ]/g, '');
  const brandName = b => !b ? '' : (b.length <= 4 ? b.toUpperCase() : b.replace(/(^|\s)\S/g, c => c.toUpperCase()));
  const dealUrl = d => `${LROOT}d/${encodeURIComponent(d.id)}.html`;
  const finalPrice = d => d.f || d.p;
  const catName = d => (EN ? d.ce : d.c) || '';
  const kindName = d => EN ? d.ce : (d.k || d.c);

  function ago(iso) {
    const t = Date.parse(iso);
    if (!t) return '';
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return T.now;
    if (m < 60) return T.ago(m, T.units[0]);
    const h = Math.round(m / 60);
    if (h < 24) return T.ago(h, T.units[1]);
    const d = Math.round(h / 24);
    return d === 1 ? T.yesterday : T.ago(d, T.units[2]);
  }
  function dateFmt(iso, withTime) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const s = new Date(d.getTime() + 3 * 3.6e6);                    // Saudi time, no daylight saving
    let out = EN ? `${MONTHS()[s.getUTCMonth()]} ${s.getUTCDate()}` : `${s.getUTCDate()} ${MONTHS()[s.getUTCMonth()]}`;
    if (withTime) {
      const h = s.getUTCHours(), mm = String(s.getUTCMinutes()).padStart(2, '0');
      out += EN ? `, ${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}` : `، ${h % 12 || 12}:${mm} ${h < 12 ? 'ص' : 'م'}`;
    }
    return out;
  }
  function MONTHS() { return T.months; }

  function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function copy(text, msg) {
    const done = () => toast(msg);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallback());
    } else fallback();
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast(T.copyFail); }
      ta.remove();
    }
  }
  async function share(d) {
    const url = new URL(dealUrl(d), location.href).href;
    const text = T.shareText(d, money(finalPrice(d)), STORE[d.s]);
    if (navigator.share) {
      try { await navigator.share({ title: kindName(d) || d.t.slice(0, 60), text, url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    copy(url, T.linkCopied);
  }

  // ---- favourites & theme -----------------------------------------------------------------------
  const favs = new Set(keep.get('favs', []));
  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    keep.set('favs', [...favs]);
    $$(`[data-fav="${CSS.escape(id)}"]`).forEach(b => b.setAttribute('aria-pressed', favs.has(id)));
    toast(favs.has(id) ? T.favAdded : T.favRemoved);
    if (PAGE === 'list' && state.quick === 'fav') render();
  }
  function setupTheme() {
    const btn = $('#theme');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme
        || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) { /* private window: this visit only */ }   // read raw in <head>
    });
  }

  // ---- cards ------------------------------------------------------------------------------------
  function tagList(d) {
    const t = [];
    if (d.low) t.push(['g', T.tagLow(T.period(d.low))]);
    if (has(d, 'verified')) t.push(['g', T.verified]);
    if (has(d, 'fast')) t.push(['b', T.fast]);
    if (has(d, 'top')) t.push(['o', T.top]);
    if (has(d, 'official')) t.push(['', T.soldBy(STORE[d.s])]);
    if (has(d, 'choice') && d.s === 'a') t.push(['', T.choice]);
    if (has(d, 'event')) t.push(['o', T.event]);
    if (has(d, 'flash')) t.push(['o', T.flash]);
    return t;
  }
  function card(d) {
    const href = dealUrl(d);
    const old = hoursSince(d.o) > 24;
    const tags = tagList(d).slice(0, 1).map(([c, x]) => `<span class="tag ${c}">${x}</span>`).join('');
    return `<article class="card${d.end ? ' ended' : ''}">
<a class="media" href="${href}" tabindex="-1" aria-hidden="true"><img src="${esc(d.img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
${d.pct ? `<span class="off">-${d.pct}%</span>` : ''}<span class="store ${d.s}">${STORE[d.s]}</span>${d.post ? `<span class="flag">${T.fromChannel}</span>` : ''}</a>
<div class="body">
<div class="kind">${d.e || ''} ${esc(kindName(d))}${d.b ? ` <span class="br">· ${esc(brandName(d.b))}</span>` : ''}</div>
<a class="title" href="${href}" dir="auto">${esc(d.t)}</a>
<div class="price"><span class="now">${money(d.p)}<small>${T.sar}</small></span>${d.w ? `<s>${money(d.w)}</s>` : ''}${!d.f && d.sv ? `<span class="save">${T.save(money(d.sv))}</span>` : ''}</div>
${d.f ? `<span class="withcode">${T.withHow(money(d.f), d.fh)}</span>` : ''}
<div class="meta">${tags || '<span></span>'}<span class="seen">${d.r ? `<span class="rate">⭐ ${d.r}</span> · ` : ''}<span class="${old ? 'old' : ''}" title="${T.seenAt}">${old ? '⚠️ ' : ''}${ago(d.o)}</span></span></div>
<div class="acts"><a class="btn btn-primary" href="${esc(d.u)}" target="_blank" rel="nofollow sponsored noopener">${d.end ? T.seeNow : T.orderFrom(STORE[d.s])}</a>
<button class="mini fav" type="button" data-fav="${esc(d.id)}" aria-pressed="${favs.has(d.id)}" aria-label="${T.fav}">${ICON.heart}</button>
<button class="mini sh" type="button" data-share="${esc(d.id)}" aria-label="${T.share}">${ICON.share}</button></div>
</div></article>`;
  }
  function wireCards(root) {
    root.addEventListener('click', ev => {
      const f = ev.target.closest('[data-fav]');
      if (f) { toggleFav(f.dataset.fav); return; }
      const s = ev.target.closest('[data-share]');
      if (s && BYID.get(s.dataset.share)) share(BYID.get(s.dataset.share));
    });
  }

  // ---- data -------------------------------------------------------------------------------------
  let DATA = [], META = {}, BYID = new Map(), HOT = new Set();
  // deals.js sets window.__DEALS__: a script works opened straight from disk (file://) and on any host
  function fetchData() {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `${ROOT}deals.js?t=${Date.now()}`;
      s.onload = () => { s.remove(); window.__DEALS__ ? resolve(window.__DEALS__) : reject(new Error('no data')); };
      s.onerror = () => { s.remove(); reject(new Error('could not load deals.js')); };
      document.head.appendChild(s);
    });
  }
  async function load() {
    const j = await fetchData();
    META = j.meta || {};
    DATA = (j.deals || []).map(d => Object.assign(d, { _q: norm([d.t, d.k, d.c, d.ce, d.b, STORE[d.s], d.s === 'a' ? 'amazon أمازون' : 'noon نون', d.id].join(' ')) }));
    BYID = new Map(DATA.map(d => [d.id, d]));
    HOT = new Set(DATA.filter(d => !d.end && hoursSince(d.fs) <= 48 && (d.pct || 0) >= 20)
      .sort((a, b) => b.sc - a.sc).slice(0, 100).map(d => d.id));
    return j;
  }
  function showUpdated() {
    const el = $('#updated');
    if (el && META.updated) el.textContent = T.updated(ago(META.updated));
    const f = $('#foot-updated');
    if (f && META.updated) f.textContent = T.footUpdated(dateFmt(META.updated, true));
  }

  // ---- list pages -------------------------------------------------------------------------------
  const QUICK = [
    ['all', () => true], ['posted', d => !!d.post], ['verified', d => has(d, 'verified')], ['low', d => !!d.low],
    ['half', d => (d.pct || 0) >= 50], ['code', d => !!d.f || (d.cd || []).length > 0], ['fast', d => has(d, 'fast')],
    ['new', d => hoursSince(d.fs) <= 24], ['u100', d => finalPrice(d) < 100],
    ['top', d => (d.r || 0) >= 4.5 && (d.rc || 0) >= 50], ['fav', d => favs.has(d.id)],
  ].map(([id, test]) => ({ id, test, label: T.quick[id] }));
  let EVENT = '';                                             // the store's sale event now, e.g. '11.11'
  QUICK.splice(1, 0, { id: 'ev', test: d => !!EVENT && d.ev === EVENT, get label() { return T.evChip(EVENT); } });
  const SORTS = {
    rec: (a, b) => b.sc - a.sc,
    pct: (a, b) => (b.pct || 0) - (a.pct || 0) || b.sc - a.sc,
    sv: (a, b) => (b.sv || 0) - (a.sv || 0) || b.sc - a.sc,
    new: (a, b) => (Date.parse(b.fs) || 0) - (Date.parse(a.fs) || 0),
    cheap: (a, b) => finalPrice(a) - finalPrice(b),
    rate: (a, b) => (b.r || 0) - (a.r || 0) || (b.rc || 0) - (a.rc || 0),
  };
  const DEFAULT = { q: '', store: 'all', cat: '', quick: 'all', sort: 'rec', min: 0, pmin: '', pmax: '', r4: false, ended: false, pg: 1, per: 30 };
  // hot.html and discounts.html: the same page with its own base filter and default order
  const PRESETS = {
    hot: { test: d => HOT.has(d.id), sort: 'rec' },        // the 100 strongest deals that started in the last 48 hours
    discounts: { test: d => (d.pct || 0) >= 50, sort: 'pct' },
  };
  const PRESET = PRESETS[document.body.dataset.preset || ''] || null;
  if (PRESET) DEFAULT.sort = PRESET.sort;
  const state = Object.assign({}, DEFAULT, { per: PER.includes(+keep.get('per', 30)) ? +keep.get('per', 30) : 30 });

  function readUrl() {
    const p = new URLSearchParams(location.search);
    for (const k of Object.keys(DEFAULT)) {
      if (!p.has(k)) continue;
      const v = p.get(k);
      state[k] = typeof DEFAULT[k] === 'boolean' ? v === '1' : typeof DEFAULT[k] === 'number' ? (+v || 0) : v;
    }
  }
  function writeUrl() {
    const p = new URLSearchParams();
    for (const [k, def] of Object.entries(DEFAULT)) {
      const v = state[k];
      if (v !== def && v !== '' && v !== false) p.set(k, v === true ? '1' : v);
    }
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    // the language switch keeps the same filters
    $$('a.lang').forEach(a => { a.search = qs ? '?' + qs : ''; });
  }
  function matches(d, skip) {
    if (PRESET && !PRESET.test(d)) return false;
    if (!state.ended && d.end && state.quick !== 'fav') return false;
    const quick = QUICK.find(x => x.id === state.quick) || QUICK[0];
    if (!quick.test(d)) return false;
    if (state.min && (d.pct || 0) < state.min) return false;
    const fp = finalPrice(d);
    if (state.pmin !== '' && fp < +state.pmin) return false;
    if (state.pmax !== '' && fp > +state.pmax) return false;
    if (state.r4 && (d.r || 0) < 4) return false;
    if (skip !== 'store' && state.store !== 'all' && d.s !== state.store) return false;
    if (skip !== 'cat' && skip !== 'store' && state.cat && d.c !== state.cat) return false;
    if (state.q) {
      const words = norm(state.q).split(/\s+/).filter(Boolean);
      if (!words.every(w => d._q.includes(w))) return false;
    }
    return true;
  }
  function renderControls() {
    $('#quick').innerHTML = QUICK.filter(q => q.id !== 'ev' || EVENT).map(q => `<button class="chip" type="button" data-quick="${q.id}" aria-pressed="${state.quick === q.id}">${q.label}</button>`).join('');
    const forStores = DATA.filter(d => matches(d, 'store'));
    const n = { all: forStores.length, a: 0, n: 0 };
    forStores.forEach(d => n[d.s]++);
    $('#stores').innerHTML = [['all', T.all], ['a', STORE.a], ['n', STORE.n]].map(([k, l]) =>
      `<button type="button" data-store="${k}" aria-pressed="${state.store === k}">${l} <span class="n">${n[k]}</span></button>`).join('');
    const cats = new Map();
    DATA.filter(d => matches(d, 'cat')).forEach(d => {
      if (d.c) cats.set(d.c, { n: (cats.get(d.c) || { n: 0 }).n + 1, e: d.e, label: catName(d) });
    });
    const list = [...cats.entries()].sort((a, b) => b[1].n - a[1].n);
    $('#cats').innerHTML = `<button class="chip" type="button" data-cat="" aria-pressed="${!state.cat}">${T.allCats}</button>` +
      list.map(([c, v]) => `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="${state.cat === c}">${v.e || ''} ${esc(v.label)} <span class="n">${v.n}</span></button>`).join('');
    $('#sort').value = state.sort;
    $('#per').value = String(state.per);
    const active = (state.min ? 1 : 0) + (state.pmin !== '' || state.pmax !== '' ? 1 : 0) + (state.r4 ? 1 : 0) + (state.ended ? 1 : 0);
    const badge = $('#filter-count');
    badge.hidden = !active;
    badge.textContent = active;
    const q = $('#q');
    if (q && document.activeElement !== q) q.value = state.q;
  }
  function renderStats() {
    const live = DATA.filter(d => !d.end);
    const best = live.reduce((m, d) => Math.max(m, d.pct || 0), 0);
    const save = live.reduce((m, d) => Math.max(m, d.sv || 0), 0);
    const posted = DATA.filter(d => d.post).length;
    $('#stats').innerHTML = [
      [money(live.length), T.stats[0]], [best ? `${best}%` : '—', T.stats[1]],
      [save ? `${money(save)} ${T.sar}` : '—', T.stats[2]], [money(posted), T.stats[3]],
    ].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');
  }
  function render(keepPage) {
    if (!keepPage) state.pg = 1;
    const list = DATA.filter(d => matches(d)).sort((a, b) => (a.end ? 1 : 0) - (b.end ? 1 : 0) || SORTS[state.sort](a, b));
    const grid = $('#grid');
    if (!list.length) {
      grid.innerHTML = `<div class="empty"><b>${T.emptyTitle}</b>${state.quick === 'fav' ? T.emptyFav : T.emptyTip}
<p><button class="btn btn-ghost" type="button" id="reset-all">${T.resetAll}</button></p></div>`;
    } else {
      const pages = Math.max(1, Math.ceil(list.length / state.per));
      state.pg = Math.min(Math.max(1, state.pg), pages);
      grid.innerHTML = list.slice((state.pg - 1) * state.per, state.pg * state.per).map(card).join('');
    }
    const from = (state.pg - 1) * state.per + 1, to = Math.min(list.length, state.pg * state.per);
    $('#count').textContent = !list.length ? '' : list.length > state.per
      ? T.showing(money(from), money(to), money(list.length)) + (state.q ? ` · «${state.q}»` : '') : T.count(money(list.length), state.q);
    renderPager(list.length);
    renderControls();
    writeUrl();
  }
  function filtersSheet() {
    const dlg = $('#filters');
    const mins = [[0, T.anyPct], [25, '25%+'], [50, '50%+'], [70, '70%+']];
    dlg.innerHTML = `<form class="sheet-in" method="dialog">
<div class="sheet-head"><h2 id="filters-title">${T.filters}</h2><button class="icon-btn" value="cancel" aria-label="${T.close}">${ICON.close}</button></div>
<div class="sheet-body">
<fieldset><legend>${T.minPct}</legend><div class="opts">${mins.map(([v, l]) =>
      `<label><input type="radio" name="min" value="${v}" ${state.min === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
<fieldset><legend>${T.price}</legend><div class="range">
<input name="pmin" type="number" inputmode="numeric" min="0" placeholder="${T.from}" value="${esc(state.pmin)}" aria-label="${T.minPrice}">
<span>—</span><input name="pmax" type="number" inputmode="numeric" min="0" placeholder="${T.to}" value="${esc(state.pmax)}" aria-label="${T.maxPrice}"></div></fieldset>
<label class="switch"><span>${T.r4}</span><input type="checkbox" name="r4" ${state.r4 ? 'checked' : ''}></label>
<label class="switch"><span>${T.showEnded}</span><input type="checkbox" name="ended" ${state.ended ? 'checked' : ''}></label>
</div>
<div class="sheet-foot"><button class="btn btn-primary" value="apply">${T.apply}</button><button class="btn btn-ghost" value="reset" type="submit">${T.clear}</button></div></form>`;
    // the form's submit (method="dialog" closes the sheet afterwards); the dialog's own "close"
    // event is not reliable in every browser
    const f = $('form', dlg);
    f.addEventListener('submit', ev => {
      const how = ev.submitter && ev.submitter.value;
      const el = f.elements;
      if (how === 'apply') {
        state.min = +el.min.value || 0;
        state.pmin = el.pmin.value.trim();
        state.pmax = el.pmax.value.trim();
        state.r4 = el.r4.checked;
        state.ended = el.ended.checked;
        render();
      } else if (how === 'reset') {
        Object.assign(state, { min: 0, pmin: '', pmax: '', r4: false, ended: false });
        render();
      }
    });
    dlg.showModal();
  }
  function renderPager(total) {
    const pages = Math.ceil(total / state.per), cur = state.pg, el = $('#pager');
    if (pages <= 1) { el.innerHTML = ''; return; }
    // 1 … 4 5 [6] 7 8 … 40: the first, the last and two either side of the current page
    const nums = [];
    for (let n = 1; n <= pages; n++) {
      if (n === 1 || n === pages || Math.abs(n - cur) <= 2) nums.push(n);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    const btn = (n, label, extra = '') => `<button type="button" data-pg="${n}" ${extra}>${label}</button>`;
    el.innerHTML = (cur > 1 ? btn(cur - 1, T.prev, 'class="step"') : '') +
      nums.map(n => n === '…' ? '<span class="gap-dots">…</span>'
        : btn(n, n, `aria-label="${T.page(n)}"${n === cur ? ' aria-current="page"' : ''}`)).join('') +
      (cur < pages ? btn(cur + 1, T.next, 'class="step"') : '');
  }

  // ---- the row at the top: the store's current sale event (e.g. Amazon 11.11), else hot deals.
  // Swipe it, use the arrows, or let it move by itself one card at a time (it waits while you hover,
  // touch or use it, the pause button stops it, and it never moves for "reduce motion").
  function renderRail() {
    const el = $('#rail');
    if (!el || PRESET) return;                                   // the home page only
    const live = DATA.filter(d => !d.end);
    const groups = {};
    live.forEach(d => { if (d.ev) groups[d.ev] = (groups[d.ev] || 0) + 1; });
    EVENT = Object.keys(groups).sort((a, b) => groups[b] - groups[a]).find(ev => groups[ev] >= 4) || '';
    const list = (EVENT ? live.filter(d => d.ev === EVENT) : live.filter(d => HOT.has(d.id)))
      .sort((a, b) => b.sc - a.sc).slice(0, 24);
    if (list.length < 4) return;
    const see = EVENT ? `<button type="button" class="rail-all" data-quick-go="ev">${T.seeAll}</button>`
      : `<a class="rail-all" href="${LROOT}hot.html">${T.seeAll}</a>`;
    const rtl = document.documentElement.dir === 'rtl';
    const title = EVENT ? T.railEvent(EVENT) : T.railHot;
    el.innerHTML = `<div class="rail-head"><h2>${title}</h2>
<div class="rail-ctl">${see}<button type="button" data-rail="prev" aria-label="${T.railPrev}">${rtl ? '›' : '‹'}</button>
<button type="button" data-rail="toggle" aria-label="${T.railPause}" aria-pressed="false">❚❚</button>
<button type="button" data-rail="next" aria-label="${T.railNext}">${rtl ? '‹' : '›'}</button></div></div>
<div class="rail-view" tabindex="0" aria-label="${title}">${list.map(card).join('')}</div>
<div class="rail-dots" aria-hidden="true"></div>`;
    el.hidden = false;
    const view = $('.rail-view', el), toggle = $('[data-rail="toggle"]', el), dots = $('.rail-dots', el);
    const sign = rtl ? -1 : 1;                                    // "forward" scrolls left in Arabic
    const step = () => { const c = $('.card', view); return c ? c.getBoundingClientRect().width + 12 : 200; };
    const pos = () => Math.abs(view.scrollLeft);
    const atEnd = () => pos() + view.clientWidth >= view.scrollWidth - 6;
    const pages = () => Math.max(1, Math.ceil((view.scrollWidth - view.clientWidth) / step()) + 1);
    function move(dir) {
      if (dir > 0 && atEnd()) view.scrollTo({ left: 0 });             // back to the first card
      else if (dir < 0 && pos() < 6) view.scrollTo({ left: sign * view.scrollWidth });
      else view.scrollBy({ left: sign * dir * step() });
    }
    function paintDots() {
      const total = pages(), n = Math.min(total, 12);
      const cur = Math.min(n - 1, Math.round((pos() / step()) * (n - 1) / Math.max(1, total - 1)));
      dots.innerHTML = Array.from({ length: n }, (_, i) => `<span class="${i === cur ? 'on' : ''}"></span>`).join('');
    }
    let paused = matchMedia('(prefers-reduced-motion: reduce)').matches, busyUntil = 0, hovering = false;
    const hold = () => { busyUntil = Date.now() + 6000; };        // someone is using it: wait a bit
    function setPaused(p) {
      paused = p;
      toggle.textContent = p ? '▶' : '❚❚';
      toggle.setAttribute('aria-label', p ? T.railPlay : T.railPause);
      toggle.setAttribute('aria-pressed', String(p));
    }
    setPaused(paused);
    el.addEventListener('click', ev => {
      const b = ev.target.closest('[data-rail]');
      if (b) {
        if (b.dataset.rail === 'toggle') setPaused(!paused);
        else { move(b.dataset.rail === 'next' ? 1 : -1); hold(); }
        return;
      }
      if (ev.target.closest('[data-quick-go]')) {
        state.quick = 'ev';
        render();
        $('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    ['touchstart', 'focusin', 'wheel'].forEach(t => view.addEventListener(t, hold, { passive: true }));
    view.addEventListener('pointerenter', () => { hovering = true; });
    view.addEventListener('pointerleave', () => { hovering = false; });
    view.addEventListener('scroll', () => requestAnimationFrame(paintDots), { passive: true });
    view.addEventListener('keydown', ev => {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      ev.preventDefault();
      hold();
      move((ev.key === 'ArrowRight') === !rtl ? 1 : -1);
    });
    setInterval(() => {
      if (paused || hovering || document.hidden || Date.now() < busyUntil) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;              // not on screen
      move(1);
    }, 3500);
    paintDots();
    wireCards(view);
    renderControls();
  }

  async function listPage() {
    readUrl();
    if (!PER.includes(state.per)) state.per = 30;
    $('#grid').innerHTML = Array.from({ length: 8 }, () => '<div class="skel"></div>').join('');
    try { await load(); } catch (e) {
      $('#grid').innerHTML = `<div class="empty"><b>${T.loadFail}</b>${T.loadTip}</div>`;
      return;
    }
    showUpdated();
    renderStats();
    renderRail();
    render(true);                                    // keep ?pg= from a shared link
    $('#quick').addEventListener('click', ev => {
      const b = ev.target.closest('[data-quick]');
      if (b) { state.quick = b.dataset.quick === state.quick && state.quick !== 'all' ? 'all' : b.dataset.quick; render(); }
    });
    $('#stores').addEventListener('click', ev => {
      const b = ev.target.closest('[data-store]');
      if (b) { state.store = b.dataset.store; state.cat = ''; render(); }
    });
    $('#cats').addEventListener('click', ev => {
      const b = ev.target.closest('[data-cat]');
      if (b) { state.cat = b.dataset.cat === state.cat ? '' : b.dataset.cat; render(); }
    });
    $('#sort').addEventListener('change', ev => { state.sort = ev.target.value; render(); });
    $('#open-filters').addEventListener('click', filtersSheet);
    const q = $('#q');
    let timer;
    q.value = state.q;
    q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.q = q.value.trim(); render(); }, 160); });
    q.form.addEventListener('submit', ev => { ev.preventDefault(); state.q = q.value.trim(); render(); q.blur(); });
    $('#grid').addEventListener('click', ev => {
      if (ev.target.id === 'reset-all') { Object.assign(state, DEFAULT); render(); }
    });
    wireCards($('#grid'));
    $('#pager').addEventListener('click', ev => {
      const b = ev.target.closest('[data-pg]');
      if (!b) return;
      state.pg = +b.dataset.pg;
      render(true);
      $('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('#per').addEventListener('change', ev => {
      state.per = +ev.target.value;
      keep.set('per', state.per);                    // remembered for the next visit
      render();
    });
    // fresh deals without reloading: check every 5 minutes while the tab is open
    setInterval(async () => {
      if (document.hidden) return;
      const before = META.updated;
      try { await load(); } catch (e) { return; }
      showUpdated();
      if (META.updated !== before) { renderStats(); render(true); toast(T.fresh); }
    }, 5 * 60 * 1000);
    setInterval(showUpdated, 60 * 1000);
  }

  // ---- deal page --------------------------------------------------------------------------------
  function chart(h, cur) {
    const pts = h.slice();
    const today = Math.floor(Date.now() / 864e5);
    if (pts.length && pts[pts.length - 1][0] < today && cur) pts.push([today, cur]);
    const W = 640, H = 230, L = 74, R = 14, TOP = 18, B = 34;
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), lo = Math.min(...ys), hi = Math.max(...ys);
    const pad = (hi - lo) * 0.18 || hi * 0.06 || 1;
    const y0 = Math.max(0, lo - pad), y1 = hi + pad;
    const X = x => L + (x - x0) / ((x1 - x0) || 1) * (W - L - R);
    const Y = y => TOP + (1 - (y - y0) / ((y1 - y0) || 1)) * (H - TOP - B);
    let line = `M${X(pts[0][0]).toFixed(1)},${Y(pts[0][1]).toFixed(1)}`;
    for (let k = 1; k < pts.length; k++) line += ` H${X(pts[k][0]).toFixed(1)} V${Y(pts[k][1]).toFixed(1)}`;
    const area = `${line} V${H - B} H${X(pts[0][0]).toFixed(1)} Z`;
    const grid = [hi, (hi + lo) / 2, lo].map(v => `<line class="grid-l" x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>
<text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${money(Math.round(v))}</text>`).join('');
    const day = n => dateFmt(new Date(n * 864e5).toISOString());
    const last = pts[pts.length - 1];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${T.chartLabel(day(x0), day(x1))}" direction="ltr">
${grid}<path class="area" d="${area}"/><path class="ln" d="${line}"/>
<circle class="now-dot" cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="6"/>
<text x="${L}" y="${H - 6}" text-anchor="start">${day(x0)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${day(x1)}</text></svg>
<p class="chart-note">${T.chartNote(money(hi), money(lo), T.days(Math.max(1, x1 - x0)))}</p>`;
  }
  function codeRows(d) {
    // each code with what it gives and who can use it ("PRIME16 · Amazon Prime members · 3% off")
    const lines = (EN ? d.cle : d.cl) || [];
    const rx = EN ? /\b(?:code|Code)\s+([A-Za-z0-9][A-Za-z0-9-]{2,24})/ : /كود(?: الخصم)?:?\s*([A-Za-z0-9][A-Za-z0-9-]{2,24})/;
    const rows = lines.map(l => {
      const m = l.match(rx);
      if (!m) return { line: l };
      const note = l.replace(m[0], '').replace(/^[^\p{L}\p{N}]+/u, '').replace(/[()]/g, '').replace(/\s*:\s*/g, ' · ')
        .replace(/(\s*·\s*)+/g, ' · ').replace(/^ · | · $/g, '').replace(/^For /, '').trim();
      return { code: m[1], note };
    });
    (d.cd || []).forEach(c => { if (!rows.some(r => r.code === c)) rows.push({ code: c, note: '' }); });
    return rows;
  }
  function renderDeal(d, live) {
    const store = STORE[d.s];
    const ended = !!d.end || !live;
    d.o = d.o || d.fs;                                // a page's own copy has no "seen at": use since when
    const old = hoursSince(d.o) > 24;
    const status = d.end ? `<span class="status off">${T.statusEnded}</span>`
      : !live ? `<span class="status off">${T.statusGone}</span>` : `<span class="status on">${T.statusOn}</span>`;
    const facts = [];
    if (d.r) facts.push([T.rating, T.ratingOf(d.r, d.rc ? money(d.rc) : '')]);
    facts.push([T.storeL, store]);
    if (d.c) facts.push([T.category, `${d.e || ''} ${esc(catName(d))}`]);
    if (d.fs) facts.push([d.post ? T.postedAt : T.since, dateFmt(d.fs, true)]);
    const posted = d.post ? `<div class="posted">${d.post.tg ? `<a class="btn btn-ghost" href="${esc(d.post.tg)}" target="_blank" rel="noopener">${ICON.tg} ${T.postTg}</a>` : ''}
${d.post.fb ? `<a class="btn btn-ghost" href="${esc(d.post.fb)}" target="_blank" rel="noopener">${ICON.fb} ${T.postFb}</a>` : ''}</div>` : '';
    const url = new URL(dealUrl(d), location.href).href;
    const msg = T.msg(d, money(finalPrice(d)));
    const rows = codeRows(d);
    const codes = rows.length ? `<div class="box"><h2>${T.codesTitle}</h2><div class="codes">${rows.map(r => r.code
      ? `<div class="code"><div><b>${esc(r.code)}</b>${r.note ? `<small>${esc(r.note)}</small>` : ''}</div><button type="button" data-copy="${esc(r.code)}">${T.copyCode}</button></div>`
      : `<p class="note">${esc(r.line)}</p>`).join('')}</div></div>` : '';
    const who = EN ? d.we : d.ws;
    const about = (EN ? d.abe : d.ab) || [];
    const why = [...((EN ? d.tle : d.tl) || [])];
    if (has(d, 'verified') && d.pct) why.unshift(T.verifiedLine(d.pct));
    else if (d.pct && who) why.unshift(T.claimLine(d.pct, who));
    const crumbs = `<nav class="crumbs" aria-label="${T.crumbs}"><a href="${LROOT}index.html">${T.allDeals}</a><span>/</span>
<a href="${LROOT}index.html?store=${d.s}">${store}</a>${d.c ? `<span>/</span><a href="${LROOT}index.html?cat=${encodeURIComponent(d.c)}">${esc(catName(d))}</a>` : ''}</nav>`;
    $('#deal').outerHTML = `${crumbs}<div class="deal-grid" id="deal">
<div class="gallery"><img src="${esc(d.big || d.img)}" alt="${esc(d.t)}" referrerpolicy="no-referrer">${d.pct ? `<span class="off">-${d.pct}%</span>` : ''}</div>
<div class="info">
<div class="kind">${d.e || ''} ${esc(kindName(d))}${d.b ? ` <span class="br">· ${esc(brandName(d.b))}</span>` : ''}</div>
<h1 dir="auto">${esc(d.t)}</h1>
${status}
<div class="box">
<div class="bigprice"><span class="now">${money(d.p)} <small>${T.sar}</small></span>${d.w ? `<s>${money(d.w)} ${T.sar}</s>` : ''}${d.pct ? `<span class="off">-${d.pct}%</span>` : ''}</div>
${d.w && who ? `<p class="who">${esc(T.beforePrice(who))}</p>` : ''}
<div class="savebar">${d.sv ? `<span>${T.youSave(money(d.sv))}</span>` : ''}${d.f ? `<span class="o">${T.withHow(money(d.f), d.fh)}</span>` : ''}</div>
<p class="stamp${old ? ' old' : ''}">${T.stamp(dateFmt(d.o, true), ago(d.o))}${old ? T.stampOld : ''}</p>
</div>
<div class="cta"><a class="btn btn-primary" href="${esc(d.u)}" target="_blank" rel="nofollow sponsored noopener">${ended ? T.seeNowIn(store) : T.orderNow(store)}</a>
<button class="mini" type="button" data-fav="${esc(d.id)}" aria-pressed="${favs.has(d.id)}" aria-label="${T.fav}">${ICON.heart}</button></div>
${codes}
${about.length ? `<div class="box"><h2>${T.aboutTitle}</h2><ul class="lines about">${about.map(l => `<li dir="auto">${esc(l)}</li>`).join('')}</ul></div>` : ''}
${why.length ? `<div class="box"><h2>${T.whyTitle}</h2><ul class="lines">${why.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>` : ''}
${d.h && d.h.length >= 2 ? `<div class="box"><h2>${T.historyTitle}</h2>${chart(d.h, d.p)}</div>` : ''}
<div class="box"><div class="facts">${facts.map(([a, b]) => `<div class="fact"><span>${a}</span><b>${b}</b></div>`).join('')}</div></div>
<div class="box"><h2>${T.shareTitle}</h2><div class="share">
<a href="https://wa.me/?text=${encodeURIComponent(msg + '\n' + url)}" target="_blank" rel="noopener">${ICON.wa} ${T.whatsapp}</a>
<a href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ICON.tg} ${T.telegram}</a>
<a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener">${ICON.x} ${T.x}</a>
<button type="button" data-copy-link>${ICON.copy} ${T.copyLink}</button></div>${posted ? `<div class="gap">${posted}</div>` : ''}</div>
<p class="note">${esc(T.note(store, money(d.p), d.w ? money(d.w) : '', ago(d.o)))}</p>
</div></div>
<div class="sticky-cta"><span class="p">${money(finalPrice(d))} ${T.sar}</span><a class="btn btn-primary" href="${esc(d.u)}" target="_blank" rel="nofollow sponsored noopener">${T.orderFrom(store)}</a></div>`;
    $('main').addEventListener('click', ev => {
      const c = ev.target.closest('[data-copy]');
      if (c) copy(c.dataset.copy, T.codeCopied(c.dataset.copy));
      if (ev.target.closest('[data-copy-link]')) copy(url, T.linkCopied);
      const f = ev.target.closest('[data-fav]');
      if (f && !f.closest('#similar-grid')) toggleFav(f.dataset.fav);
    });
  }
  function renderSimilar(d) {
    const pool = DATA.filter(x => x.id !== d.id && !x.end);
    let list = pool.filter(x => x.c === d.c && d.c);
    if (list.length < 4) list = list.concat(pool.filter(x => x.s === d.s && !list.includes(x)));
    list = list.sort((a, b) => b.sc - a.sc).slice(0, 8);
    if (!list.length) return;
    $('#similar-grid').innerHTML = list.map(card).join('');
    $('#similar').hidden = false;
    wireCards($('#similar-grid'));
  }
  async function dealPage() {
    let snap = null;
    try { snap = JSON.parse($('#deal-data').textContent); } catch (e) { /* no snapshot */ }
    let live = false;
    try { await load(); live = BYID.has(snap && snap.id); } catch (e) { /* offline: the snapshot is enough */ }
    const d = (live && BYID.get(snap.id)) || snap;
    if (!d) return;
    renderDeal(d, live || !META.updated);
    showUpdated();
    if (DATA.length) renderSimilar(d);
    const q = $('#q');
    q && q.form.addEventListener('submit', ev => { if (!q.value.trim()) ev.preventDefault(); });
  }

  // ---- "join us" popup --------------------------------------------------------------------------
  // First visit after a few seconds, then again every `data-days` days; never again once they tap Join.
  function setupJoin() {
    const dlg = $('#join');
    if (!dlg || !dlg.showModal) return;
    const days = +dlg.dataset.days || 3;
    const seen = keep.get('joinSeen', 0), joined = keep.get('joined', false);
    if (joined || Date.now() - seen < days * 864e5) return;
    dlg.addEventListener('click', ev => {
      if (ev.target === dlg) dlg.close();                       // a tap outside the box closes it
      if (ev.target.closest('.join-btns a')) { keep.set('joined', true); dlg.close(); }
    });
    setTimeout(() => {
      if (document.querySelector('dialog[open]')) return;        // not over the filters sheet
      keep.set('joinSeen', Date.now());
      dlg.showModal();
    }, 4000);
  }

  // ---- start ------------------------------------------------------------------------------------
  setupTheme();
  setupJoin();
  document.addEventListener('keydown', ev => {
    if (ev.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { ev.preventDefault(); $('#q') && $('#q').focus(); }
  });
  if (PAGE === 'list') listPage(); else if (PAGE === 'deal') dealPage();
})();
