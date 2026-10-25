/* 预习教练 v3 · 整章呈现渲染器
   block 类型：map / concept / derive / example / structure / claim / elements
              syntax / snippet / trace / table / pitfalls / note
*/
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nl(s) { return esc(s).replace(/\n/g, '<br>'); }
  function lines(arr) { return (arr || []).map(function (x) { return '<div>' + esc(x) + '</div>'; }).join(''); }

  var KIND_NAME = { prior: '往前接', next: '往后接', subject: '别的学科', life: '生活里', counter: '反例' };

  function renderBlock(b, i) {
    if (!b || !b.type) return '';
    switch (b.type) {
      case 'map':
        return '<section class="rd-sec" id="sec' + i + '"><h3>' + esc(b.title || '知识地图') + '</h3>' +
          '<pre class="rd-map">' + esc((b.lines || []).join('\n')) + '</pre></section>';

      case 'concept':
        return '<section class="rd-sec rd-concept" id="sec' + i + '">' +
          '<h3>' + esc(b.term) + (b.source ? ' <span class="rd-src">' + esc(b.source) + '</span>' : '') + '</h3>' +
          '<div class="rd-quote">' + nl(b.verbatim) + '</div>' +
          (b.intuition ? '<p class="rd-intuition"><b>说人话：</b>' + nl(b.intuition) + '</p>' : '') +
          ((b.conditions || []).length ? '<div class="rd-cond"><div class="rd-sub">每个条件在管什么</div>' +
            b.conditions.map(function (c) {
              return '<div class="rd-cond-item"><b>' + esc(c.text) + '</b><div>' + nl(c.why || '') + '</div>' +
                (c.counter ? '<div class="rd-counter">去掉会怎样：' + esc(c.counter) + '</div>' : '') + '</div>';
            }).join('') + '</div>' : '') +
          ((b.links || []).length ? '<div class="rd-links"><div class="rd-sub">连接到哪</div>' +
            b.links.map(function (l) {
              return '<div class="rd-link"><span class="tag ' + (l.kind === 'subject' ? 'concept' : (l.kind === 'next' ? 'humanities' : 'math')) + '">' +
                esc(KIND_NAME[l.kind] || '关联') + '</span> ' + esc(l.text) + '</div>';
            }).join('') + '</div>' : '') +
          '</section>';

      case 'derive':
        return '<section class="rd-sec rd-derive" id="sec' + i + '">' +
          '<h3>' + esc(b.name) + '</h3>' +
          (b.statement ? '<div class="rd-quote">' + nl(b.statement) + '</div>' : '') +
          '<ol class="rd-steps">' + (b.steps || []).map(function (s) {
            return '<li><div class="rd-line">' + nl(s.line) + '</div>' + (s.why ? '<div class="rd-why">为什么这么走：' + nl(s.why) + '</div>' : '') + '</li>';
          }).join('') + '</ol>' +
          (b.conditions ? '<div class="rd-note"><b>成立条件：</b>' + nl(b.conditions) + '</div>' : '') +
          (b.summary ? '<div class="rd-note ok"><b>一句话：</b>' + nl(b.summary) + '</div>' : '') +
          '</section>';

      case 'example':
        return '<section class="rd-sec rd-example" id="sec' + i + '">' +
          '<h3>例题 · ' + esc(b.title) + '</h3>' +
          (b.prompt ? '<div class="rd-prompt">' + nl(b.prompt) + '</div>' : '') +
          '<ol class="rd-steps">' + (b.solution || []).map(function (s) { return '<li>' + nl(s) + '</li>'; }).join('') + '</ol>' +
          (b.insight ? '<div class="rd-note"><b>这题的切入点：</b>' + nl(b.insight) + '</div>' : '') +
          (b.variant ? '<div class="rd-note warn"><b>变式：</b>' + nl(b.variant) + '</div>' : '') +
          '</section>';
      case 'structure':
        return '<section class="rd-sec rd-structure" id="sec' + i + '">' +
          '<h3>' + esc(b.title || '宏观结构') + '</h3>' +
          '<ul class="rd-tree">' + (b.items || []).map(function (it) {
            var lv = it.level || 1;
            return '<li class="lv' + lv + '">' + esc(it.text) + (it.note ? ' <span class="rd-src">' + esc(it.note) + '</span>' : '') + '</li>';
          }).join('') + '</ul>' +
          (b.summary ? '<div class="rd-note"><b>整章一句话：</b>' + nl(b.summary) + '</div>' : '') +
          '</section>';

      case 'claim':
        return '<section class="rd-sec rd-claim" id="sec' + i + '">' +
          '<h3>核心观点 · ' + esc(b.claim) + '</h3>' +
          '<div class="rd-sub">论据</div><ol class="rd-steps">' + (b.evidence || []).map(function (e) { return '<li>' + nl(e) + '</li>'; }).join('') + '</ol>' +
          (b.note ? '<div class="rd-note"><b>记法：</b>' + nl(b.note) + '</div>' : '') +
          '</section>';

      case 'elements':
        return '<section class="rd-sec" id="sec' + i + '"><h3>' + esc(b.title || '关键要素') + '</h3>' +
          '<table class="rd-table"><tbody>' + (b.rows || []).map(function (r) {
            return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>';
          }).join('') + '</tbody></table></section>';

      case 'syntax':
        return '<section class="rd-sec rd-syntax" id="sec' + i + '">' +
          '<h3>' + esc(b.name) + '</h3>' +
          (b.use ? '<p>' + nl(b.use) + '</p>' : '') +
          (b.code ? '<pre class="rd-code">' + esc(b.code) + '</pre>' : '') +
          (b.pitfall ? '<div class="rd-note warn"><b>坑：</b>' + nl(b.pitfall) + '</div>' : '') +
          '</section>';

      case 'snippet':
        return '<section class="rd-sec" id="sec' + i + '"><h3>' + esc(b.title || '代码骨架') + '</h3>' +
          '<pre class="rd-code">' + esc(b.code) + '</pre>' +
          ((b.notes || []).length ? '<table class="rd-table"><tbody>' + b.notes.map(function (n) {
            return '<tr><td><code>' + esc(n.code) + '</code></td><td>' + esc(n.note) + '</td></tr>';
          }).join('') + '</tbody></table>' : '') +
          '</section>';

      case 'trace':
        return '<section class="rd-sec rd-trace" id="sec' + i + '"><h3>' + esc(b.title || '手工推演') + '</h3>' +
          '<pre class="rd-code">' + esc(b.code) + '</pre>' +
          ((b.how || []).length ? '<ol class="rd-steps">' + b.how.map(function (h) { return '<li>' + nl(h) + '</li>'; }).join('') + '</ol>' : '') +
          '<div class="rd-output"><b>输出：</b><code>' + esc(b.output) + '</code></div>' +
          (b.pitfall ? '<div class="rd-note warn"><b>注意：</b>' + nl(b.pitfall) + '</div>' : '') +
          '</section>';

      case 'table':
        return '<section class="rd-sec" id="sec' + i + '">' + (b.title ? '<h3>' + esc(b.title) + '</h3>' : '') +
          '<table class="rd-table"><thead><tr>' + (b.head || []).map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead>' +
          '<tbody>' + (b.rows || []).map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></section>';

      case 'codecard':
        return '<section class="rd-sec rd-card" id="sec' + i + '">' +
          '<h3>' + esc(b.title) + '</h3>' +
          '<div class="rd-card-t">① 完整代码</div>' +
          '<pre class="rd-code">' + esc(b.code) + '</pre>' +
          '<div class="rd-card-t">② 这张卡里的语法点</div>' +
          (b.syntax || []).map(function (s) {
            return '<div class="rd-syn"><b>' + esc(s.point) + '</b><div>' + nl(s.detail) + '</div></div>';
          }).join('') +
          '<div class="rd-card-t">③ 执行过程与输出</div>' +
          (b.run || []).map(function (x) {
            return '<div class="rd-run"><span class="rd-run-in">' + esc(x.in) + '</span> → <span class="rd-run-out">' + esc(x.out) + '</span></div>';
          }).join('') +
          '<div class="rd-output"><b>输出：</b><code>' + esc(b.output) + '</code></div>' +
          '<div class="rd-card-t">④ 改一处会怎样</div>' +
          '<ul class="rd-pit">' + (b.variants || []).map(function (v) { return '<li>' + esc(v) + '</li>'; }).join('') + '</ul>' +
          (b.pitfall ? '<div class="rd-note warn"><b>坑：</b>' + nl(b.pitfall) + '</div>' : '') +
          '</section>';

      case 'questions':
        return '<section class="rd-sec rd-questions" id="sec' + i + '">' +
          '<h3>' + esc(b.title || '带着这些问题进教室') + '</h3>' +
          '<ol class="rd-pit">' + (b.items || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
          '<button class="btn mt-s" data-act="to-class-tasks">加入课堂任务清单</button></section>';

      case 'pitfalls':
        return '<section class="rd-sec" id="sec' + i + '"><h3>本章易错点</h3><ul class="rd-pit">' +
          (b.items || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>';

      case 'note':
        return '<div class="rd-note ' + (b.kind === 'warn' ? 'warn' : (b.kind === 'ok' ? 'ok' : '')) + '">' + nl(b.text) + '</div>';

      default:
        return '';
    }
  }

  function render(reader) {
    if (!reader || !reader.blocks) return '<div class="empty">这一章还没有呈现内容。</div>';
    var secs = reader.blocks.filter(function (b) { return b.type !== 'note'; });
    var toc = secs.map(function (b, idx) {
      var t = b.title || b.term || b.name || b.claim || ('第 ' + (idx + 1) + ' 节');
      return '<a href="#sec' + reader.blocks.indexOf(b) + '">' + esc(t) + '</a>';
    }).join('');
    var body = reader.blocks.map(function (b, i) { return renderBlock(b, i); }).join('');
    return '<div class="rd-layout">' +
      '<nav class="rd-toc"><div class="rd-toc-t">本章目录</div>' + toc + '</nav>' +
      '<article class="rd-main">' + (reader.intro ? '<div class="rd-intro">' + nl(reader.intro) + '</div>' : '') + body + '</article>' +
      '</div>';
  }

  /* ---------- 三种比对模式 ---------- */
  function normCode(s) {
    return String(s || '')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, '')
      .replace(/[，。；：""''（）]/g, function (c) {
        return { '，': ',', '。': '.', '；': ';', '：': ':', '“': '"', '”': '"', '‘': "'", '’': "'", '（': '(', '）': ')' }[c];
      });
  }

  function compare(mode, input, target, keywords) {
    if (mode === 'keyword') {
      var txt = String(input || '').replace(/\s+/g, '');
      var list = keywords || [];
      var hit = list.filter(function (k) { return txt.indexOf(String(k).replace(/\s+/g, '')) >= 0; });
      var miss = list.filter(function (k) { return hit.indexOf(k) < 0; });
      return {
        pct: list.length ? Math.round(100 * hit.length / list.length) : 0,
        hit: hit.length, total: list.length,
        missing: miss, html: ''
      };
    }
    if (mode === 'code') {
      var r = window.Coach.diff(normCode(input), normCode(target));
      r.missing = [];
      return r;
    }
    var d = window.Coach.diff(input, target);
    d.missing = [];
    return d;
  }

  window.Reader = { render: render, compare: compare, normCode: normCode };
})();