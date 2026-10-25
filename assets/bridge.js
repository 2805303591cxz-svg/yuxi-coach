/* bridge.js —— 把「预习卡点」送进错题本的收集箱
   原理：不新增接口，直接把卡点画成一张图，走错题本已有的拍照上传通道
   （POST /api/shot?source=preview&subject=课程名），所以在错题本里它就是一条正常的待整理条目。
   错题本没开时会失败（超时 2.5 秒），界面提示你先把它打开——失败不影响预习本身。 */
(function () {
  var ENDPOINT = 'http://127.0.0.1:8347';
  var W = 1200, PAD = 60, LH = 46, FONT = '28px "Microsoft YaHei","PingFang SC",sans-serif';

  function wrap(ctx, text, maxW) {
    var out = [], line = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === '\n') { out.push(line); line = ''; continue; }
      var test = line + ch;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = ch; }
      else line = test;
    }
    if (line) out.push(line);
    return out;
  }

  function draw(session) {
    var canvas = document.createElement('canvas');
    canvas.width = W;
    var c = canvas.getContext('2d');
    var innerW = W - PAD * 2;
    var head = [
      '预习卡点 · ' + (session.courseName || ''),
      (session.taskTitle ? session.taskTitle + '　' : '') + (session.finishedAt ? new Date(session.finishedAt).toLocaleString('zh-CN') : '')
    ];
    var items = (session.blockers || []).filter(function (b) { return b && b.text; });
    if (!items.length) items = [{ text: '（这次没有记卡点）' }];

    c.font = FONT;
    var lines = [];
    items.forEach(function (b, i) {
      var reason = b.reason === 'newConcept' ? '【新概念没懂】' : (b.reason === 'prereq' ? '【前置有洞】' : '');
      var t = (i + 1) + '. ' + reason + b.text;
      wrap(c, t, innerW).forEach(function (l) { lines.push(l); });
      if (i < items.length - 1) lines.push('');
    });
    var H = PAD * 2 + 52 * head.length + lines.length * LH + 90;
    canvas.height = H;

    // 背景与标题
    var g = canvas.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1a4b8c'; g.font = 'bold 34px "Microsoft YaHei","PingFang SC",sans-serif';
    g.fillText(head[0], PAD, PAD + 34);
    g.fillStyle = '#666'; g.font = '24px "Microsoft YaHei","PingFang SC",sans-serif';
    g.fillText(head[1], PAD, PAD + 74);
    g.strokeStyle = '#d6dfea'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(PAD, PAD + 92); g.lineTo(W - PAD, PAD + 92); g.stroke();

    // 正文
    g.fillStyle = '#111'; g.font = FONT;
    var y = PAD + 92 + 46;
    lines.forEach(function (l) { if (l) g.fillText(l, PAD, y); y += LH; });

    // 页脚
    g.fillStyle = '#999'; g.font = '22px "Microsoft YaHei","PingFang SC",sans-serif';
    g.fillText('来自「预习教练」· 待整理：定位 → 红笔 → 蓝笔', PAD, H - 40);

    return canvas;
  }

  function toBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error('生成图片失败')); }, 'image/jpeg', 0.92);
    });
  }

  function post(blob, subject) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 2500) : null;
    var url = ENDPOINT + '/api/shot?source=preview&subject=' + encodeURIComponent(subject || '未分类');
    return fetch(url, {
      method: 'POST',
      body: blob,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (timer) clearTimeout(timer);
      if (!j || !j.ok) throw new Error((j && j.error) || '上传失败');
      return j;
    });
  }

  window.Bridge = {
    endpoint: ENDPOINT,
    // 返回 Promise<{ok:true}>；失败抛错（界面负责提示）
    sendBlockers: function (session) {
      if (!session) return Promise.reject(new Error('没有这次预习的记录'));
      var canvas = draw(session);
      return toBlob(canvas).then(function (blob) { return post(blob, session.courseName); });
    },
    // 供测试用：只画图不发送
    render: function (session) { return draw(session); }
  };
})();
