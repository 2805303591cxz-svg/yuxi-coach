/* 预习教练 · 四套流程定义
   设计原则：老师第 7 讲的原动作一个不改，只做「大学化替换」和「按时间盒裁剪」。
   - lite(轻 5′)   ：每套固定 3 个动作，到点就走
   - quick(快 10′) ：完整步骤，但每步只处理 1 个条目，跳过深挖字段
   - standard(标准 25′)：完整步骤 + 每步 2-3 个条目 + 深挖字段
   - deep(深 35′)  ：标准 + 全部条目 + 每步末尾「用一句话讲给同学听」
   时间：quick = standard × 0.4，deep = standard × 1.4，尾步吸收舍入差。
*/
(function () {
  var LEVELS = {
    light:    { key: 'light',    name: '轻 · 只带背',          short: '轻',   secs: 300,  desc: '抽 1–2 条最要紧的定义，只做带背：读一遍 → 挖空 → 合上书复述。' },
    standard: { key: 'standard', name: '标准 · 背 + 理解 + 关联', short: '标准', secs: 1500, desc: '每条定义走完七个环节：拆段 → 理解三问 → 三轮挖空 → 复述 → 关联 → 一句话收束。' },
    deep:     { key: 'deep',     name: '深 · 再加跨学科追问',    short: '深',   secs: 2100, desc: '标准全部 + 全部关联卡 + 自己补一条跨学科关联。' },
    // 旧数据兼容：以前存过 quick 档的草稿/记录仍能显示名字
    quick:    { key: 'quick',    name: '标准 · 背 + 理解 + 关联', short: '标准', secs: 1500, desc: '' }
  };

  // 各档默认只处理几个条目
  var LIMIT = { light: 2, quick: 1, standard: 3, deep: 99 };

  // 深档专属：每步末尾「用一句话讲给同学听」
  var RECAP = { key: 'recap', type: 'textarea', label: '用一句话讲给同学听', ph: '讲不出来就说明还没吃透——把它记成卡点。' };

  var TRACKS = {
    math: {
      key: 'math', name: '数学 / 理科', color: 'math',
      blurb: '老师的理科四步：概念定义 → 公式推导 → 理科语言 → 例题母题，最后梳理卡点。',
      steps: [
        {
          key: 'def', kind: 'items', title: '概念 · 定义 · 定理',
          hint: '理科的根。先自己说一遍，再展开原文对照。做不到「一字不落」就不要往下一步走。',
          standard: 480, source: 'definitions', itemTitle: 'term', itemDetail: 'verbatim',
          addLabel: '添加一个定义 / 定理',
          addPh: '例：数列极限的定义',
          selfLabels: [['exact', '一字不落'], ['close', '差一两个字'], ['no', '说不出来']],
          needCheck: true,
          itemFields: [
            { key: 'keywords', type: 'text', label: '圈出限定词（少了这几个字就不成立）', ph: '例：任意给定、存在、当 n > N 时、恒有' },
            { key: 'understand', type: 'textarea', label: '它为什么成立？跟哪个老概念有关？', ph: '一句话就行，写不出来说明这里就是卡点。' },
            { key: 'connect', type: 'textarea', label: '挂到哪块旧知识上？', ph: '例：接到高中「函数极限」那块，或是上次课的某个定理。' }
          ]
        },
        {
          key: 'formula', kind: 'items', title: '公式与定理',
          hint: '标准是「能复述」，不是「看懂了」。看懂和自己会推，中间隔着十万八千里。',
          standard: 300, source: 'formulas', itemTitle: 'name', itemDetail: 'steps',
          addLabel: '添加一个公式 / 定理',
          addPh: '例：导数的定义式',
          selfLabels: [['exact', '能完整复述'], ['close', '能说个大概'], ['no', '说不出来']],
          itemFields: [
            { key: 'retell', type: 'textarea', label: '合上书，把推导过程写/说出来', ph: '第 1 步…第 2 步…（写不全才是正常的，写不全就是卡点）' },
            { key: 'conditions', type: 'text', label: '成立条件是什么？', ph: '例：f 在 x₀ 的某个邻域内有定义' }
          ]
        },
        {
          key: 'visual', kind: 'items', title: '理科语言：符号 / 模型 / 单位 / 图像',
          hint: '看到图能立刻在边上列出信息来。图稍微变一下就不会了，说明这一步没做。',
          standard: 240, source: 'visuals', itemTitle: 'ref', itemDetail: 'points',
          addLabel: '添加一张图 / 一个模型',
          addPh: '例：课本图 2-1 导数的几何意义',
          selfLabels: [['exact', '基本全列出来了'], ['close', '只列出一半'], ['no', '想不出来']],
          itemFields: [
            { key: 'mylist', type: 'textarea', label: '先自己列出这张图上的信息（每行一条，1-5 条）', ph: '一个点 → 一个数；一条线 → 一个量…' }
          ]
        },
        {
          key: 'example', kind: 'items', title: '例题与证明（母题）',
          hint: '课本例题 = 母题，是你第一次把知识变成实战。重点不是答案，是「他为什么这么想」。',
          standard: 300, source: 'examples', itemTitle: 'title', itemDetail: 'approach',
          addLabel: '添加一道例题 / 一个证明',
          addPh: '例：课本例 2 用定义求导数',
          selfLabels: [['exact', '思路和答案一致'], ['close', '方向对但走偏了'], ['no', '完全没思路']],
          itemFields: [
            { key: 'variation', type: 'textarea', label: '换你来出题，会怎么变？', ph: '例题本身就是为变形而生的——不考它本身，考它的魂。' }
          ]
        },
        { key: 'blocker', kind: 'blocker', title: '卡点与收尾', hint: '把卡点整理出来，明天的听课才有针对性。', standard: 180 }
      ],
      lite: [
        { key: 'goal', kind: 'prompt', title: '这节课要讲什么', hint: '一句话说清，说不清就翻一下标题和小节。', light: 90,
          label: '本节要讲什么？', ph: '例：用极限定义导数，并求几个基本函数的导数。' },
        { key: 'def', kind: 'items', title: '2 个核心定义', hint: '只看最要紧的两个，先自己说，再展开对。', light: 120,
          source: 'definitions', itemTitle: 'term', itemDetail: 'verbatim', addLabel: '添加一个定义', addPh: '例：导数',
          selfLabels: [['exact', '一字不落'], ['close', '差一两个字'], ['no', '说不出来']], needCheck: true, itemFields: [] },
        { key: 'blocker', kind: 'blocker', title: '卡点与收尾', hint: '留下一条要问的问题，5 分钟就没白花。', light: 90 }
      ]
    },

    code: {
      key: 'code', name: '编程 / 语言', color: 'code',
      blurb: '老师原课没有这一类，是按理科框架做的延伸：先想清问题，再把手过一遍，最后预测会怎么错。',
      steps: [
        {
          key: 'problem', kind: 'prompt', title: '本节要解决什么问题',
          hint: '先搞清「为什么学它」。不写代码之前先想明白这件事，比抄一遍代码有用得多。',
          standard: 120, revealFrom: 'predictions', label: '这一节是为了解决什么问题？不用它会怎么样？',
          ph: '例：要把重复的动作写成循环，否则 100 条数据要写 100 遍。'
        },
        {
          key: 'api', kind: 'items', title: '要过手的语法 / API',
          hint: '逐条过，每条都要能在 IDE 里写出来。标记「不会」的既进卡点，也要进课堂任务清单。',
          standard: 360, source: 'definitions', itemTitle: 'term', itemDetail: 'verbatim',
          addLabel: '添加一个语法 / API 点',
          addPh: '例：for 循环的三个表达式',
          selfLabels: [['exact', '能不看书写出来'], ['close', '看着能写'], ['no', '不会']],
          itemFields: [
            { key: 'wrote', type: 'text', label: '我真的在 IDE 里敲过一遍了吗？', ph: '写「敲过了」或「还没」——这一步不能靠看。' }
          ]
        },
        {
          key: 'recopy', kind: 'items', title: '示例代码：不看原文重敲一遍',
          hint: '老师说的「能复述」在这里就是「能重敲」。抄一遍等于没做。',
          standard: 480, source: 'examples', itemTitle: 'title', itemDetail: 'approach',
          addLabel: '添加一段要重敲的示例',
          addPh: '例：求 1~100 的和',
          selfLabels: [['exact', '不看原文敲出来了'], ['close', '看着敲出来的'], ['no', '敲不出来']],
          itemFields: [
            { key: 'linebyline', type: 'textarea', label: '每一行在干什么？（用自己的话）', ph: '第 3 行在累加；第 5 行在判断边界…' },
            { key: 'broken', type: 'text', label: '删掉哪一行会崩？', ph: '写一个你觉得最危险的变量或分号' }
          ]
        },
        {
          key: 'errors', kind: 'prompt', title: '报错与考法预判', revealFrom: 'predictions',
          hint: '大学编程课基本靠自己调。先预判会怎么错，听课和调 bug 都会快得多。',
          standard: 300, label: '猜一下：最容易在哪出错？老师会怎么考它？',
          ph: '例：循环变量写成浮点数；考试会让手写代码补全。'
        },
        {
          key: 'quiz', kind: 'quiz', title: '课堂抢答题', standard: 300,
          hint: '这些是课件里的原题，老师课上会点名抢答、算平时分。先自己想，再看答案。'
        },
        { key: 'blocker', kind: 'blocker', title: '卡点与收尾', hint: '把「不会写」的语法点单独列出来。', standard: 240 }
      ],
      lite: [
        { key: 'problem', kind: 'prompt', title: '本节要解决什么问题', hint: '一句话，想不出来就翻标题。', light: 90,
          label: '这一节是为了解决什么问题？', ph: '例：让程序在满足条件时反复执行。' },
        { key: 'api', kind: 'items', title: '3 个必须过手的语法点', hint: '只看 3 个，标记会不会。', light: 120,
          source: 'definitions', itemTitle: 'term', itemDetail: 'verbatim', addLabel: '添加一个语法点', addPh: '例：while 循环',
          selfLabels: [['exact', '能不看书写出来'], ['close', '看着能写'], ['no', '不会']], itemFields: [] },
        { key: 'quiz', kind: 'quiz', title: '课堂抢答题', light: 180,
          hint: '课件原题，抢答算平时分。只看 2 道，先自己想再看答案。' },
        { key: 'blocker', kind: 'blocker', title: '卡点与收尾', hint: '留下一条要问的问题，5 分钟就没白花。', light: 90 }
      ]
    },

    humanities: {
      key: 'humanities', name: '文科 / 背诵类', color: 'humanities',
      blurb: '老师的文科四步：宏观结构 → 情境（观点+论据）→ 关键要素 → 逻辑关联。核心是「无用即大用」。',
      steps: [
        {
          key: 'frame', kind: 'prompt', title: '宏观结构',
          hint: '引言、标题、小节——大家觉得是废话，其实等于看电影前先看剪辑，能帮你记住后面的东西。',
          standard: 240, revealFrom: 'structure', label: '这一章 / 这一节的引言、标题、小标题是什么？先抄骨架，不背内容。',
          ph: '例：一 理想的内涵与特征｜二 理想信念是我们的精神之钙｜三 在实现中国梦的实践中放飞青春梦想'
        },
        {
          key: 'context', kind: 'prompt', title: '核心内容 + 支撑细节 = 情境',
          hint: '文科最重要的因素是情境。单独的知识点脆弱且无用，配上情境才背得住。',
          standard: 420, label: '核心观点是什么？它靠哪几条论据撑着？',
          ph: '观点 1：……　靠：①……②……\n观点 2：……　靠：……'
        },
        {
          key: 'elements', kind: 'items', title: '关键要素（带背）',
          hint: '人物、时间、地点、数据、术语——老师特意说这是第三步，不是第一步。一条一条过，不要只看。',
          standard: 300, source: 'definitions', itemTitle: 'term', itemDetail: 'verbatim',
          addLabel: '添加一个关键要素',
          addPh: '例：五四运动 1919 年',
          selfLabels: [['exact', '能复述出来'], ['close', '差一点'], ['no', '说不出来']],
          itemFields: [
            { key: 'why', type: 'textarea', label: '它在回答什么问题？为什么重要？', ph: '例：它标志着新民主主义革命的开端。' }
          ]
        },
        {
          key: 'links', kind: 'prompt', title: '逻辑关联与记忆定位',
          hint: '文科里也要找逻辑：历史看时间线、政治看因果、地理看位置关系。再把这段挂到课本某张图上。',
          standard: 300, label: '它和前面哪块内容有关？你把这段挂在第几页哪张图上？',
          ph: '例：接到上一章「人生价值」；挂在第 32 页那张青年志愿者的图上。'
        },
        {
          key: 'output', kind: 'prompt', title: '输出骨架',
          hint: '思政课就是论述题的骨架；英语课就用一段自己的话复述。光输入不输出，第二天就没了。',
          standard: 180, label: '用「观点—论据—结论」三句话把这一节讲完',
          ph: '观点：……　论据：……　结论：……'
        },
        { key: 'blocker', kind: 'blocker', title: '卡点与收尾', hint: '把背不下来的点写成卡点。', standard: 120 }
      ],
      lite: [
        { key: 'frame', kind: 'prompt', title: '宏观结构', hint: '只抄标题和小节，30 秒的事。', light: 120,
          label: '这一节的标题和小标题都是什么？', ph: '一…… 二…… 三……' },
        { key: 'elements', kind: 'items', title: '关键要素（带背）', hint: '只带 2 条，挖空 + 复述。', light: 150,
          source: 'definitions', itemTitle: 'term', itemDetail: 'verbatim', addLabel: '添加一个关键要素', addPh: '例：1919 年',
          selfLabels: [['exact', '能复述'], ['close', '差一点'], ['no', '说不出来']], itemFields: [] },
        { key: 'blocker', kind: 'blocker', title: '卡点与收尾', hint: '留下一条要问的问题，5 分钟就没白花。', light: 90 }
      ]
    },

    concept: {
      key: 'concept', name: '概念 / 结构类', color: 'concept',
      blurb: '为软件工程专业导论这类概论课做的延伸：既有概念要背，也有进制、逻辑运算这类要动手算的。',
      steps: [
        {
          key: 'map', kind: 'prompt', title: '本章概念地图',
          hint: '先搭骨架再挂术语。单独的知识点脆弱且无用，先把它挂上去。',
          standard: 180, revealFrom: 'structure', label: '这一章有哪些概念？谁是谁的上层？',
          ph: '例：计算机系统 → 硬件 / 软件；硬件 → 运算器、控制器、存储器…'
        },
        {
          key: 'terms', kind: 'items', title: '术语与定义',
          hint: '术语不要求一字不落，要求能用自己的话说清。',
          standard: 300, source: 'definitions', itemTitle: 'term', itemDetail: 'verbatim',
          addLabel: '添加一个术语',
          addPh: '例：冯·诺依曼体系结构',
          selfLabels: [['exact', '能用自己的话说清'], ['close', '大致知道'], ['no', '说不上来']],
          itemFields: [
            { key: 'understand', type: 'textarea', label: '用一个例子把它讲活', ph: '例：把你的笔记本拆成五大部件，各自对应什么。' }
          ]
        },
        {
          key: 'structure', kind: 'items', title: '结构与流程',
          hint: '概念课最容易考的是结构图、层次、流程顺序。',
          standard: 300, source: 'visuals', itemTitle: 'ref', itemDetail: 'points',
          addLabel: '添加一个结构 / 流程',
          addPh: '例：存储层次：寄存器 → 高速缓存 → 主存 → 辅存',
          selfLabels: [['exact', '能自己画出来'], ['close', '能说出顺序'], ['no', '画不出来']],
          itemFields: [
            { key: 'mylist', type: 'textarea', label: '不看原文，自己把层次 / 顺序写一遍', ph: '每行一条，从快到慢或从上到下' }
          ]
        },
        {
          key: 'hands', kind: 'items', title: '计算 / 操作型内容亲手过一遍',
          hint: '进制换算、逻辑运算这类，看会了不算会，手算三遍才算。',
          standard: 480, source: 'examples', itemTitle: 'title', itemDetail: 'approach',
          addLabel: '添加一道要手算 / 手做的题',
          addPh: '例：把 10110110B 转成十进制和十六进制',
          selfLabels: [['exact', '能自己算出来'], ['close', '知道方法但会算错'], ['no', '不会']],
          itemFields: [
            { key: 'steps', type: 'textarea', label: '把过程写一遍（不要只写答案）', ph: '按权展开：1×2⁷ + 0×2⁶ + …' }
          ]
        },
        { key: 'blocker', kind: 'blocker', title: '卡点与收尾', hint: '术语和计算分开记卡点。', standard: 240 }
      ],
      lite: [
        { key: 'map', kind: 'prompt', title: '本章概念地图', hint: '只画骨架，不写定义。', light: 120,
          label: '这一章有哪些概念？谁是谁的上层？', ph: '例：计算机系统 → 硬件 / 软件' },
        { key: 'terms', kind: 'items', title: '3 个术语', hint: '能用自己话说清就行。', light: 120,
          source: 'definitions', itemTitle: 'term', itemDetail: 'verbatim', addLabel: '添加一个术语', addPh: '例：主存',
          selfLabels: [['exact', '能用自己的话说清'], ['close', '大致知道'], ['no', '说不上来']], itemFields: [] },
        { key: 'blocker', kind: 'blocker', title: '卡点与收尾', hint: '留下一条要问的问题，5 分钟就没白花。', light: 60 }
      ]
    }
  };

  var SELFTEST = {
    key: 'selftest', kind: 'selftest', title: '自测 · 3 分钟', standard: 180,
    hint: '带学走完了，现在才是检验：遮空 + 判断题。不及格的条目可以一键回炉。'
  };

  TRACKS.none = {
    key: 'none', name: '通用（不属于上面任何一类）', color: 'concept',
    blurb: '把该课归到最接近的一类，剪裁效果会更好；不确定就先按这个走。',
    steps: TRACKS.concept.steps, lite: TRACKS.concept.lite
  };

  // 每套流程末尾都挂上自测步（带学 ≠ 检验，检验单独一块）
  Object.keys(TRACKS).forEach(function (k) {
    if (TRACKS[k].steps.indexOf(SELFTEST) < 0) TRACKS[k].steps = TRACKS[k].steps.concat([SELFTEST]);
    if (TRACKS[k].lite.indexOf(SELFTEST) < 0) TRACKS[k].lite = TRACKS[k].lite.concat([SELFTEST]);
  });

  function round5(n) { return Math.round(n / 5) * 5; }
  function stepsFor(trackKey, level) {
    var t = TRACKS[trackKey] || TRACKS.none;
    return level === 'light' ? t.lite : t.steps;
  }
  function limitFor(level) { return LIMIT[level] || 3; }

  // 生成步骤计划。带学阶段不再倒计时，secs 只作为估算与记录用；
  // 自测步固定 180 秒（那是真的计时）。
  function planSteps(trackKey, level) {
    var lv = (level === 'quick') ? 'standard' : level;
    return stepsFor(trackKey, lv).map(function (s, i) {
      var t;
      if (s.kind === 'selftest') t = 180;
      else if (lv === 'light') t = s.light || 60;
      else if (lv === 'deep') t = round5((s.standard || 120) * 1.4);
      else t = s.standard || 120;
      return Object.assign({}, s, { idx: i, secs: t });
    });
  }

  window.LEVELS = LEVELS;
  window.TRACKS = TRACKS;
  window.PREP = {
    stepsFor: stepsFor, planSteps: planSteps, limitFor: limitFor,
    recapField: RECAP, levelList: ['light', 'standard', 'deep']
  };
})();