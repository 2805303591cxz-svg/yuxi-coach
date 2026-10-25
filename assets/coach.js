/* 预习教练 · 带学引擎（纯逻辑，不碰 DOM）
   输入：一条定义/公式/图/例题 + 深度档
   输出：一串"卡片"，一张卡只做一件事，用户做完点继续。
*/
(function () {
  var PUNCT = /[\s，。、；：""''（）()【】\[\]…—\-·？！,.;:!?"'`~]/g;
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(PUNCT, ''); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var KINDS = {
    prior: '往前接（旧概念）',
    next: '往后接（后面才会用）',
    subject: '别的学科',
    life: '生活里'
  };
  var KIND_ORDER = ['prior', 'next', 'subject', 'life'];

  /* 关联四问套路：常驻面板用的文案 */
  var RECIPE = [
    { q: '向前：它是由哪个旧概念定义的？', eg: '例：导数 ← 极限。看到"导数"先问：它用的是哪个旧工具？' },
    { q: '向后：它能推出什么？后面哪一节会用它？', eg: '例：导数 → 微分、中值定理、泰勒展开，一整章都在用它。' },
    { q: '同构：换个学科，哪个东西结构一样？', eg: '例：导数是"变化率"，物理里就是速度；编程里就是数值微分。' },
    { q: '反向：去掉某个条件会崩成什么样？', eg: '例：去掉"连续"，可导就不成立了；反例 |x| 在 0 点。' }
  ];

  /* 没有手写 coach 时，按标点把原文切成不超过 max 段 */
  function splitChunks(text, max) {
    var m = String(text || '').match(/[^，；。]+[，；。]?/g) || [String(text || '')];
    m = m.map(function (s) { return s.trim(); }).filter(Boolean);
    while (m.length > max) {
      var bi = 0, bs = 1e9;
      for (var i = 0; i < m.length - 1; i++) {
        var len = m[i].length + m[i + 1].length;
        if (len < bs) { bs = len; bi = i; }
      }
      m.splice(bi, 2, m[bi] + m[bi + 1]);
    }
    return m;
  }

  /* 用 keywords 自动造一轮挖空 */
  function autoBlanks(item, rounds) {
    var text = item.verbatim || item.statement || '';
    var kws = (item.keywords || []).filter(function (k) { return k && text.indexOf(k) >= 0; });
    if (!kws.length) return [];
    var per = Math.ceil(kws.length / (rounds || 1));
    var out = [];
    for (var r = 0; r < (rounds || 1); r++) {
      var pick = kws.slice(r * per, (r + 1) * per);
      if (!pick.length) break;
      var tpl = text, ans = [];
      pick.forEach(function (k) {
        var i = tpl.indexOf(k);
        if (i < 0) return;
        ans.push(k);
        tpl = tpl.slice(0, i) + '[[' + ans.length + ']]' + tpl.slice(i + k.length);
      });
      if (ans.length) out.push({ tpl: tpl, answers: ans, hint: '把被遮住的部分补回来', focus: r === 0 ? '遮关键词' : '再遮一层' });
    }
    return out;
  }

  /* ---------- 卡片序列 ---------- */

  function cardSafe(c) { return c && c.title; }

  function planDefinition(item, level) {
    var c = item.coach || null;
    var text = item.verbatim || '';
    var cards = [];
    cards.push({ t: 'text', key: 'read', title: '先读一遍，不用记', body: text, note: '只要求读通顺。读完点继续。' });

    if (level !== 'light') {
      var chunks = (c && c.chunks && c.chunks.length) ? c.chunks : splitChunks(text, 4).map(function (x) {
        return { text: x, point: '这一段在说什么？它在限定什么？', explain: '这张单子还没有逐段解释，先自己说一遍，再往下一段。', counter: '' };
      });
      chunks.forEach(function (ch, i) {
        cards.push({
          t: 'ask', key: 'chunk' + i,
          title: '第 ' + (i + 1) + ' 段：这一句在限定什么？',
          body: ch.text,
          q: ch.point || '这一段在说什么？它在限定什么？',
          hint: '先用自己的话说一句，说得糙没关系。',
          answer: ch.explain || '',
          counter: ch.counter || ''
        });
      });
    }

    if (level === 'standard' || level === 'deep') {
      var probes = (c && c.probes && c.probes.length) ? c.probes : [
        { q: '为什么必须加这个条件？去掉会怎样？', hint: '盯住定义里的限定词。', a: '这张单子没写参考，先自己想，想不出就记成卡点。' },
        { q: '它是由哪个旧概念推出来的？', hint: '看定义里用了哪些以前学过的词。', a: '同上。' },
        { q: '它和哪个概念是一对？', hint: '想想谁和它总是成对出现。', a: '同上。' }
      ];
      probes.forEach(function (p, i) {
        cards.push({ t: 'ask', key: 'probe' + i, title: '理解第 ' + (i + 1) + ' 问', q: p.q, hint: p.hint || '', answer: p.a || '', counter: '' });
      });
    }

    var blanks = (c && c.blanks && c.blanks.length) ? c.blanks : autoBlanks(item, level === 'light' ? 1 : 2);
    if (level === 'light') blanks = blanks.slice(0, 1);
    else blanks = blanks.slice(0, 3);
    blanks.forEach(function (b, i) {
      cards.push({ t: 'blank', key: 'blank' + i, title: '第 ' + (i + 1) + ' 轮挖空：' + (b.focus || '补回被遮住的部分'), tpl: b.tpl, answers: b.answers, hint: b.hint || '' });
    });

    cards.push({ t: 'recall', key: 'recall', title: '合上原文，整段复述', target: text, cue: (c && c.recall && c.recall.cue) || '' });

    if (level === 'standard' || level === 'deep') {
      var links = (c && c.links) || [];
      links.forEach(function (l, i) {
        cards.push({ t: 'link', key: 'link' + i, title: l.title || ('关联 ' + (i + 1)), kind: l.kind || 'prior', text: l.text, check: l.check || '', detail: l.detail || l.text });
      });
      if (level === 'deep') {
        cards.push({ t: 'selflink', key: 'selflink', title: '你自己补一条跨学科关联', hint: '用「同构」那一问：换个学科，哪个东西和它结构一样？' });
      }
    }

    cards.push({ t: 'summary', key: 'summary', title: '用你自己的话说一遍', prompt: '不看原文，把它写成一句人话（允许不严谨）。', ref: (c && c.summary) || '' });
    return cards;
  }

  function planFormula(item, level) {
    var c = item.coach || null;
    var cards = [];
    var stmt = item.statement || '';
    cards.push({ t: 'text', key: 'read', title: '先看这个公式在说什么', body: stmt, note: item.conditions ? '成立条件：' + item.conditions : '先把符号认全。' });

    var steps = (item.steps || []).slice();
    if (level !== 'light') {
      steps.forEach(function (s, i) {
        cards.push({
          t: 'ask', key: 'dstep' + i, title: '推导第 ' + (i + 1) + ' 步：先自己做这一步',
          body: i === 0 ? '' : '上一行：' + (steps[i - 1] || ''),
          q: '这一步是怎么变过来的？',
          hint: '想不出来就看提示，但先自己试一句。',
          answer: s, counter: ''
        });
      });
    } else {
      cards.push({ t: 'text', key: 'steps', title: '推导过程（先读一遍）', body: steps.join('\n'), note: '轻档只要求读顺。' });
    }

    if (item.conditions) {
      cards.push({ t: 'ask', key: 'cond', title: '它成立的条件是什么？', q: '把条件写成一条一条。', hint: '少一条都可能不成立。', answer: item.conditions, counter: '' });
    }

    var blanks = (c && c.derivation && c.derivation.length) ? c.derivation : [];
    blanks.forEach(function (b, i) {
      cards.push({ t: 'blank', key: 'dblank' + i, title: '推导挖空 ' + (i + 1), tpl: b.tpl, answers: b.answers, hint: b.hint || '' });
    });

    cards.push({ t: 'recall', key: 'recall', title: '合上，把推导复述一遍', target: steps.join(' '), cue: '' });

    if (level !== 'light') {
      ((c && c.links) || []).forEach(function (l, i) {
        cards.push({ t: 'link', key: 'link' + i, title: l.title || ('关联 ' + (i + 1)), kind: l.kind || 'prior', text: l.text, check: l.check || '', detail: l.detail || l.text });
      });
    }
    cards.push({ t: 'summary', key: 'summary', title: '一句话说清它为什么长这样', prompt: '不写公式，用人话说。', ref: (c && c.summary) || '' });
    return cards;
  }

  function planVisual(item, level) {
    var cards = [];
    var pts = item.points || [];
    cards.push({ t: 'text', key: 'read', title: '这张图 / 这个结构在讲什么', body: item.ref || '', note: '先别看答案。' });
    cards.push({
      t: 'ask', key: 'scan', title: '看到它，你第一眼该找什么？',
      q: '先列出你要从这张图上找的 1–3 样东西（坐标轴？层次？箭头方向？数量？）',
      hint: '找不到就先看图的标题和图例。',
      answer: pts.slice(0, 2).join('；'),
      counter: ''
    });
    cards.push({ t: 'ask', key: 'own', title: '现在自己列一遍', q: '把你看到的逐条写下来（每行一条）', hint: '', answer: pts.join('\n'), counter: '' });
    if (level !== 'light') {
      cards.push({ t: 'blank', key: 'b0', title: '把关键信息补回来', tpl: pts.map(function (p, i) { return (i + 1) + '. [[' + (i + 1) + ']]'; }).join('\n'), answers: pts, hint: '按顺序补' });
    }
    cards.push({ t: 'summary', key: 'summary', title: '一句话：这张图最想告诉你什么', prompt: '别抄原文。', ref: '' });
    return cards;
  }

  function planExample(item, level) {
    var cards = [];
    cards.push({ t: 'text', key: 'read', title: '先读题，别看答案', body: item.prompt || item.title || '', note: '读完先别动手。' });
    cards.push({ t: 'ask', key: 'q1', title: '这题给了什么？', q: '把已知条件一条条说出来。', hint: '数一数有几个条件。', answer: '', counter: '' });
    cards.push({ t: 'ask', key: 'q2', title: '要求什么？', q: '最终要得到什么？', hint: '', answer: '', counter: '' });
    cards.push({ t: 'ask', key: 'q3', title: '中间缺什么？', q: '从已知到所求，缺的那一步是什么？', hint: '这一步就是"切入点"。', answer: item.approach || '', counter: '' });
    if (level !== 'light') {
      cards.push({ t: 'ask', key: 'var', title: '换你来出题', q: '改一个条件，这题会变成什么样？', hint: '改数字、改函数、改问法都行。', answer: item.variation || '', counter: '' });
    }
    cards.push({ t: 'summary', key: 'summary', title: '一句话记下这道题的"魂"', prompt: '下次遇到同类题，你先看什么？', ref: '' });
    return cards;
  }

  /* 编程的语法/API、概念课的术语：按"带背 + 用它"走 */
  function planTerm(item, level) {
    var cards = [];
    var text = item.verbatim || '';
    cards.push({ t: 'text', key: 'read', title: '先看一遍', body: text, note: item.source ? '来源：' + item.source : '' });
    if (level !== 'light') {
      cards.push({ t: 'ask', key: 'use', title: '它解决什么问题？', q: '不用它会怎样？', hint: '', answer: (item.coach && item.coach.summary) || '', counter: '' });
    }
    (autoBlanks(item, 1)).forEach(function (b, i) {
      cards.push({ t: 'blank', key: 'b' + i, title: '挖空：把关键词补回来', tpl: b.tpl, answers: b.answers, hint: b.hint });
    });
    cards.push({ t: 'recall', key: 'recall', title: '合上，说一遍', target: text, cue: '' });
    if (level !== 'light') {
      ((item.coach && item.coach.links) || []).forEach(function (l, i) {
        cards.push({ t: 'link', key: 'link' + i, title: l.title || ('关联 ' + (i + 1)), kind: l.kind || 'subject', text: l.text, check: l.check || '', detail: l.detail || l.text });
      });
    }
    cards.push({ t: 'summary', key: 'summary', title: '用一句话说清它', prompt: '说给一个没学过的人听。', ref: (item.coach && item.coach.summary) || '' });
    return cards;
  }

  function plan(kind, item, level) {
    if (kind === 'formula') return planFormula(item, level);
    if (kind === 'visual') return planVisual(item, level);
    if (kind === 'example') return planExample(item, level);
    if (kind === 'term') return planTerm(item, level);
    return planDefinition(item, level);
  }
  /* ---------- 逐字比对 ---------- */
  var PUNCT_TEST = /[\s，。、；：""''（）()【】\[\]…—\-·？！,.;:!?"'`~]/;

  function normMap(s) {
    var chars = [], pos = [];
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (PUNCT_TEST.test(ch)) continue;
      chars.push(ch.toLowerCase());
      pos.push(i);
    }
    return { text: chars.join(''), pos: pos };
  }

  function lcsMatch(a, b) {
    var n = a.length, m = b.length;
    if (n > 400 || m > 400) return null;
    var dp = [], i, j;
    for (i = 0; i <= n; i++) { dp.push(new Array(m + 1).fill(0)); }
    for (i = 1; i <= n; i++) {
      for (j = 1; j <= m; j++) {
        dp[i][j] = (a[i - 1] === b[j - 1]) ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    var match = new Array(m).fill(false);
    i = n; j = m;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) { match[j - 1] = true; i--; j--; }
      else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
      else j--;
    }
    return match;
  }

  /* 返回 { hit, total, pct, html }。html 里对不上的字用 <mark> 标出来。 */
  function diff(input, target) {
    var t = normMap(String(target || ''));
    var u = normMap(String(input || ''));
    if (!t.text.length) return { hit: 0, total: 0, pct: 0, html: '' };
    var match = lcsMatch(u.text, t.text);
    if (!match) match = new Array(t.text.length).fill(false);
    var hit = match.filter(Boolean).length;

    // 归一化下标 → 原文下标
    var okSet = {};
    for (var k = 0; k < match.length; k++) { if (match[k]) okSet[t.pos[k]] = 1; }

    var out = '';
    for (var i = 0; i < String(target).length; i++) {
      var ch = String(target)[i];
      if (PUNCT_TEST.test(ch)) { out += esc(ch); continue; }
      out += okSet[i] ? esc(ch) : '<mark class="bad">' + esc(ch) + '</mark>';
    }
    return { hit: hit, total: t.text.length, pct: Math.round(100 * hit / t.text.length), html: out };
  }

  /* ---------- 自测出题 ---------- */
  function rotate(arr, k) {
    var n = arr.length; k = ((k % n) + n) % n;
    return arr.slice(k).concat(arr.slice(0, k));
  }

  function selftest(task) {
    var defs = (task.definitions || []).slice(0, 3);
    var qs = [];

    // 1-2：两条挖空
    defs.slice(0, 2).forEach(function (d, i) {
      var c = d.coach || {};
      var b = (c.blanks && c.blanks[0]) ? c.blanks[0] : autoBlanks(d, 1)[0];
      if (b) qs.push({ type: 'blank', from: d.term, tpl: b.tpl, answers: b.answers, hint: '把空补回来' });
    });
    if (qs.length === 1) {
      var d0 = defs[0], c0 = d0.coach || {};
      var b2 = (c0.blanks && c0.blanks[1]) ? c0.blanks[1] : autoBlanks(d0, 2)[1];
      if (b2) qs.push({ type: 'blank', from: d0.term, tpl: b2.tpl, answers: b2.answers, hint: '再补一轮' });
    }

    // 3：哪个词被改坏了
    var d = defs[0];
    if (d) {
      var kws = (d.keywords || []).filter(function (k) { return k && d.verbatim.indexOf(k) >= 0; });
      if (kws.length) {
        var right = kws[0];
        var mutated = d.verbatim.replace(right, '＿＿＿');
        var others = kws.slice(1, 3);
        while (others.length < 2) others.push(others.length ? '以上都不对' : '标点符号');
        var opts = rotate([right].concat(others.slice(0, 2)), right.length % 3);
        qs.push({
          type: 'choice', from: d.term,
          q: '这句话被挖空了一处：<br><span class="qquote">' + esc(mutated.slice(0, 120)) + (mutated.length > 120 ? '…' : '') + '</span><br>被挖掉的是哪个词？',
          options: opts, correct: right
        });
      }
    }

    // 4-5：关联归类
    var links = [];
    defs.forEach(function (x) { ((x.coach && x.coach.links) || []).forEach(function (l) { links.push(l); }); });
    links.slice(0, 2).forEach(function (l) {
      var rightName = KINDS[l.kind] || KINDS.prior;
      var opts = rotate(KIND_ORDER.map(function (k) { return KINDS[k]; }), rightName.length % 4);
      qs.push({
        type: 'choice', from: l.title || '',
        q: '这条关联：<br><span class="qquote">' + esc(l.text) + '</span><br>它属于哪一类？',
        options: opts, correct: rightName
      });
    });

    // 从课件抢答题里抽 1 道有明确选项的（深档更有价值）
    var cqs = (task.classQuestions || []).filter(function (q) {
      return q.options && q.options.length >= 3 && q.options.some(function (o) { return String(q.answer || '').indexOf(o) === 0; });
    });
    if (cqs.length) {
      var cq = cqs[0];
      var hit = cq.options.filter(function (o) { return String(cq.answer || '').indexOf(o) === 0; })[0];
      qs.push({ type: 'choice', from: '课件 p' + cq.page, q: '【课件原题】' + cq.q, options: cq.options, correct: hit });
    }

    return qs;
  }

  window.Coach = {
    plan: plan, diff: diff, selftest: selftest,
    autoBlanks: autoBlanks, splitChunks: splitChunks, norm: norm,
    KINDS: KINDS, KIND_ORDER: KIND_ORDER, RECIPE: RECIPE
  };
})();