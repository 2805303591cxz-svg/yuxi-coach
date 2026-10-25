/* 预习教练 · 状态与存储（全部存在浏览器本地，不上传任何地方） */
(function () {
  var KEY = 'preview_coach_v2';
  var V1_KEY = 'preview_coach_v1';

  function uid(p) { return (p || 'x') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dayOf(ts) { var d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function blank() {
    return {
      v: 1,
      createdAt: Date.now(),
      courses: (window.PRESET_COURSES || []).map(function (c) { return Object.assign({}, c); }),
      sessions: [],
      overrides: {},
      syncCode: '',
      draft: null
    };
  }

  var state = null;

  function load() {
    var raw = null, legacy = null;
    try { raw = localStorage.getItem(KEY); legacy = localStorage.getItem(V1_KEY); } catch (e) { raw = null; }
    if (!raw) {
      // 从 v1 迁移：课程、历史预习记录、原文覆盖都带过来；旧草稿（带学流程不同）不迁，按方案丢弃
      if (legacy) {
        try {
          var old = JSON.parse(legacy);
          state = blank();
          if (Array.isArray(old.courses) && old.courses.length) state.courses = old.courses;
          if (Array.isArray(old.sessions)) state.sessions = old.sessions;
          if (old.overrides && typeof old.overrides === 'object') state.overrides = old.overrides;
          state.migratedFromV1 = true;
          try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e2) {}
          return state;
        } catch (e3) { /* 坏了就当作没有 */ }
      }
      state = blank(); return state;
    }
    try {
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object') throw new Error('bad');
      s.courses = s.courses || [];
      s.sessions = s.sessions || [];
      s.overrides = s.overrides || {};
      state = s;
    } catch (e) {
      state = blank();
    }
    // 培养方案更新后，补齐新增的预置课程（不动用户已改过的）
    (window.PRESET_COURSES || []).forEach(function (p) {
      var cur = state.courses.filter(function (c) { return c.id === p.id; })[0];
      if (!cur) { state.courses.push(Object.assign({}, p)); return; }
      // 预置课程补充了教材等信息时，给老数据补上（用户自己改过的不覆盖）
      ['textbook'].forEach(function (k) {
        if (p[k] && !cur[k]) cur[k] = p[k];
      });
    });
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('保存失败', e); }
  }

  function all() { return state || load(); }

  /* ---------- 课程 ---------- */
  function courses() { return all().courses; }
  function enabledCourses() { return all().courses.filter(function (c) { return c.enabled; }); }
  function course(id) { return all().courses.filter(function (c) { return c.id === id; })[0] || null; }
  function upsertCourse(c) {
    var s = all();
    var i = s.courses.findIndex(function (x) { return x.id === c.id; });
    if (i >= 0) s.courses[i] = Object.assign({}, s.courses[i], c);
    else { c.id = c.id || uid('c'); s.courses.push(c); }
    save(); return c;
  }
  function deleteCourse(id) {
    var s = all();
    s.courses = s.courses.filter(function (c) { return c.id !== id; });
    save();
  }
  function importCurriculum(semN) {
    var sem = (window.CURRICULUM.semesters.filter(function (x) { return x.n === semN; })[0]);
    if (!sem) return 0;
    var s = all(), added = 0;
    sem.courses.forEach(function (c) {
      if (s.courses.some(function (x) { return x.name === c.name && x.semester === semN; })) return;
      s.courses.push({
        id: uid('c'), semester: semN, name: c.name, credits: c.credits, category: c.category,
        track: 'none', importance: 'normal', level: window.recommendLevel('normal', c.credits), enabled: true,
        why: '从培养方案导入（' + sem.label + '），需要时自己调档位。'
      });
      added++;
    });
    save(); return added;
  }

  /* ---------- 预习记录 ---------- */
  function addSession(s) { var st = all(); st.sessions.unshift(s); save(); return s; }
  function updateSession(id, patch) {
    var st = all();
    var i = st.sessions.findIndex(function (x) { return x.id === id; });
    if (i >= 0) { st.sessions[i] = Object.assign({}, st.sessions[i], patch); save(); return st.sessions[i]; }
    return null;
  }
  function session(id) { return all().sessions.filter(function (x) { return x.id === id; })[0] || null; }
  function sessions() { return all().sessions; }
  function pendingVerify() { return all().sessions.filter(function (s) { return s.finishedAt && !s.verify; }); }
  function pendingBackfill() { return all().sessions.filter(function (s) { return s.verify && !s.backfill; }); }
  function lastSessionOf(courseId) {
    return all().sessions.filter(function (s) { return s.courseId === courseId && s.finishedAt; })[0] || null;
  }

  /* ---------- 草稿（进行中的预习，刷新不丢） ---------- */
  function setDraft(d) { all().draft = d; save(); }
  function getDraft() { return all().draft; }
  function clearDraft() { all().draft = null; save(); }

  /* ---------- 定义原文覆盖（把「需核对课本原句」改成你课本上的原句） ---------- */
  function getOverride(taskId, key) {
    var o = all().overrides || {};
    return (o[taskId] && o[taskId][key]) || null;
  }
  function setOverride(taskId, key, text) {
    var st = all();
    st.overrides = st.overrides || {};
    st.overrides[taskId] = st.overrides[taskId] || {};
    if (text) st.overrides[taskId][key] = text; else delete st.overrides[taskId][key];
    save();
  }

  /* ---------- 云同步 ---------- */
  function snapshot() {
    var st = all();
    return { version: 2, exportedAt: Date.now(), courses: st.courses, sessions: st.sessions, overrides: st.overrides || {} };
  }

  function mergeRemote(remote) {
    if (!remote || typeof remote !== 'object') return { added: 0, merged: 0 };
    var st = all();
    var added = 0, merged = 0;

    var courseIds = {};
    st.courses.forEach(function (c) { courseIds[c.id] = 1; });
    (remote.courses || []).forEach(function (c) {
      if (!c || !c.id) return;
      if (!courseIds[c.id]) { st.courses.push(c); courseIds[c.id] = 1; added++; }
    });

    var byId = {};
    st.sessions.forEach(function (s) { byId[s.id] = s; });
    (remote.sessions || []).forEach(function (rs) {
      if (!rs || !rs.id) return;
      var ls = byId[rs.id];
      if (!ls) { st.sessions.push(rs); byId[rs.id] = rs; added++; return; }
      // 同一份记录：补齐缺的验证/回填/抢答标记
      var changed = false;
      if (rs.verify && !ls.verify) { ls.verify = rs.verify; changed = true; }
      if (rs.backfill && !ls.backfill) { ls.backfill = rs.backfill; changed = true; }
      if (rs.quizMarks) {
        var m = Object.assign({}, rs.quizMarks, ls.quizMarks || {});
        if (JSON.stringify(m) !== JSON.stringify(ls.quizMarks || {})) { ls.quizMarks = m; changed = true; }
      }
      if (changed) merged++;
    });
    st.sessions.sort(function (a, b) { return (b.finishedAt || 0) - (a.finishedAt || 0); });

    st.overrides = Object.assign({}, remote.overrides || {}, st.overrides || {});
    save();
    return { added: added, merged: merged };
  }

  function getSyncCode() { return (all().syncCode || '').trim(); }
  function setSyncCode(code) { all().syncCode = String(code || '').trim(); save(); }

  /* ---------- 统计 ---------- */
  function stats() {
    var st = all();
    var done = st.sessions.filter(function (s) { return s.finishedAt; });
    var days = {};
    done.forEach(function (s) { days[dayOf(s.finishedAt)] = true; });
    // 连续天数（今天没做但昨天做了，也算连续，提示你去补）
    var streak = 0, cursor = new Date();
    if (!days[today()]) cursor.setDate(cursor.getDate() - 1);
    for (;;) {
      var k = dayOf(cursor);
      if (days[k]) { streak++; cursor.setDate(cursor.getDate() - 1); } else break;
    }
    var weekAgo = Date.now() - 7 * 864e5;
    var week = done.filter(function (s) { return s.finishedAt >= weekAgo; });
    var avg = 0;
    if (done.length) avg = Math.round(done.reduce(function (a, s) { return a + (s.elapsedSecs || 0); }, 0) / done.length);
    var blockers = 0, solved = 0, quizGot = 0, quizBad = 0;
    done.forEach(function (s) {
      var m = s.quizMarks || {};
      Object.keys(m).forEach(function (k) { if (m[k] === 'got') quizGot++; else if (m[k] === 'bad') quizBad++; });
    });
    done.forEach(function (s) {
      (s.blockers || []).forEach(function (b) { blockers++; if (b.resolved === 'yes') solved++; });
    });
    return {
      streak: streak, weekCount: week.length, totalCount: done.length,
      avgSecs: avg, blockers: blockers, solved: solved,
      quizGot: quizGot, quizBad: quizBad,
      quizRate: (quizGot + quizBad) ? Math.round(100 * quizGot / (quizGot + quizBad)) : null,
      todayDone: !!days[today()]
    };
  }

  /* ---------- 导出 / 导入 ---------- */
  function exportText() {
    return JSON.stringify({
      app: '预习教练', version: 1, exportedAt: new Date().toISOString(),
      courses: all().courses, sessions: all().sessions, overrides: all().overrides || {}
    }, null, 2);
  }
  function importText(txt, mode) {
    var data = JSON.parse(txt);
    if (!data || !Array.isArray(data.courses)) throw new Error('这不像是预习教练导出的备份文件。');
    var st = all();
    if (mode === 'replace') {
      st.courses = data.courses;
      st.sessions = Array.isArray(data.sessions) ? data.sessions : [];
    } else {
      var byId = {};
      st.sessions.forEach(function (s) { byId[s.id] = 1; });
      (data.sessions || []).forEach(function (s) { if (!byId[s.id]) { st.sessions.push(s); byId[s.id] = 1; } });
      st.sessions.sort(function (a, b) { return (b.finishedAt || 0) - (a.finishedAt || 0); });
      st.overrides = Object.assign({}, data.overrides || {}, st.overrides || {});
      var haveName = {};
      st.courses.forEach(function (c) { haveName[c.id] = 1; });
      data.courses.forEach(function (c) { if (!haveName[c.id]) st.courses.push(c); });
    }
    save();
    return { courses: st.courses.length, sessions: st.sessions.length };
  }
  function resetAll() { state = blank(); save(); }

  window.Store = {
    load: load, save: save, uid: uid, today: today, dayOf: dayOf,
    courses: courses, enabledCourses: enabledCourses, course: course, upsertCourse: upsertCourse,
    deleteCourse: deleteCourse, importCurriculum: importCurriculum,
    sessions: sessions, session: session, addSession: addSession, updateSession: updateSession,
    pendingVerify: pendingVerify, pendingBackfill: pendingBackfill, lastSessionOf: lastSessionOf,
    setDraft: setDraft, getDraft: getDraft, clearDraft: clearDraft,
    getOverride: getOverride, setOverride: setOverride,
    snapshot: snapshot, mergeRemote: mergeRemote, getSyncCode: getSyncCode, setSyncCode: setSyncCode,
    stats: stats, exportText: exportText, importText: importText, resetAll: resetAll, blank: blank
  };
})();