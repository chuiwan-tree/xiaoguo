// 笑过（第四个，第 18 天 06:22）。照 ~/碰/笑过/笑.py v4 一句一句搬过来；场景的随机数跟 python 不一样，规矩一样。
// 从《聊斋·婴宁》来："人罔不笑，但須有時。"女由是竟不復笑。
var YEARS = 8, PER = 5, TIRE = 3;
var WHO = ["婆婆", "丈夫", "客人", "孩子", "邻家的"];
var WHERE = ["堂上", "院里", "灶间", "花下", "墙下"];
var WHAT = ["吃饭", "摔了跤", "有人哭", "挨了骂", "花开了"];
var ALL = WHO.concat(WHERE, WHAT);

function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

function makeScenes(seed) {
  var r = rng(seed), out = [];
  for (var i = 0; i < YEARS * PER; i++) {
    var who = pick(r, WHO);
    var where = pick(r, who !== "邻家的" ? WHERE : ["墙下", "墙下", "院里"]);
    var what = pick(r, WHAT);
    if (who === "邻家的" && what === "挨了骂") what = pick(r, ["吃饭", "摔了跤", "花开了"]);
    out.push([who, where, what]);
  }
  return out;
}

function value(sc) {
  var who = sc[0], where = sc[1], what = sc[2], v = 1;
  v += ({ "有人哭": -3, "挨了骂": -2, "花开了": 1 })[what] || 0;
  if (who === "邻家的") v += (where === "墙下") ? -3 : -1;
  else if (who === "婆婆" || who === "丈夫" || who === "孩子") v += 1;
  if (where === "花下") v += 1;
  return v;
}

function sceneText(sc, mark) {
  mark = mark || {};
  return sc.map(function (x) {
    if (!(x in mark)) return x;
    return "【" + x + "·".repeat(mark[x]) + "】";
  }).join("，");
}

function effectText(sc, v) {
  var who = sc[0], where = sc[1], what = sc[2];
  if (what === "有人哭") return "哭的人抬起头看她。";
  if (who === "邻家的" && where === "墙下") return "墙那头的男人以为她有意，夜里又来了。";
  if (what === "挨了骂") return "骂的人骂不下去了，脸更难看。";
  if (v >= 3) return "一屋子都跟着松了。";
  if (who === "婆婆") return "婆婆的眉头松开了。";
  if (v >= 2) return "旁边的人也笑了。";
  if (v === 1) return "没人在意。";
  return "有人皱了一下眉。";
}
var SHORT = {
  "哭的人抬起头看她。": "哭的人又看了她一眼。",
  "墙那头的男人以为她有意，夜里又来了。": "墙那头又有动静。",
  "骂的人骂不下去了，脸更难看。": "骂的人又噎住了。",
  "一屋子都跟着松了。": "屋里又松了。",
  "婆婆的眉头松开了。": "婆婆也笑了。",
  "旁边的人也笑了。": "旁边的人跟着笑。"
};
function effectSaid(st, sc, v) {
  var t = effectText(sc, v);
  st.seen[t] = (st.seen[t] || 0) + 1;
  return st.seen[t] <= 2 ? t : (SHORT[t] || t);
}

function has(arr, x) { return arr.indexOf(x) >= 0; }

function marks(st, sc) {
  var out = {};
  st.mem.forEach(function (m) {
    sc.forEach(function (f) {
      if (f === m.word) { if (!(f in out)) out[f] = 0; }
      else if (has(m.dead, f)) out[f] = TIRE;
      else if ((m.pin[f] || 0) > 0) out[f] = Math.max(out[f] || 0, Math.min(m.pin[f], TIRE));
    });
  });
  return out;
}

function react(st, sc) {
  var i, j, m;
  for (i = 0; i < st.mem.length; i++) if (has(sc, st.mem[i].word)) return ["不笑", marks(st, sc)];
  for (i = 0; i < st.mem.length; i++)
    for (j = 0; j < st.mem[i].dead.length; j++) if (has(sc, st.mem[i].dead[j])) return ["不笑", marks(st, sc)];
  var hits = [];
  st.mem.forEach(function (m, mi) {
    m.scene.forEach(function (f) {
      if (f !== m.word && has(sc, f) && !has(m.dead, f)) hits.push([mi, f]);
    });
  });
  if (!hits.length) return ["笑", marks(st, sc)];
  hits.forEach(function (h) {
    m = st.mem[h[0]];
    m.pin[h[1]] = (m.pin[h[1]] || 0) + 1;
    if (m.pin[h[1]] >= TIRE) { m.dead.push(h[1]); m.deadAt[h[1]] = st.i; }
  });
  var mk = marks(st, sc), any3 = false, kinds = {};
  for (var k in mk) if (mk[k] >= TIRE) any3 = true;
  hits.forEach(function (h) { kinds[h[1]] = 1; });
  if (any3) return ["不笑", mk];
  if (Object.keys(kinds).length >= 2) return ["不笑", mk];
  return ["抿", mk];
}

function yr(i) { return Math.floor(i / PER) + 1; }

function stepScene(st) {
  var sc = st.scenes[st.i], r = react(st, sc), v = value(sc);
  if (r[0] !== "不笑") { if (v > 0) st.warm++; else if (v < 0) st.harm++; }
  var eff = r[0] !== "不笑" ? effectSaid(st, sc, v) : "";
  st.log.push({ how: r[0], mark: r[1], v: v, eff: eff });
}

function currentText(st) {
  var i = st.i, sc = st.scenes[i], r = st.log[i], s = [];
  s.push("第 " + yr(i) + " 年 · 第 " + (i % PER + 1) + " 回：" + sceneText(sc, r.mark));
  if (r.how === "笑") s.push("  她笑了。" + r.eff);
  else if (r.how === "抿") s.push("  她抿了一下嘴，才笑。" + r.eff);
  else s.push("  她没笑。");
  s.push("  家里暖了 " + st.warm + " 回，她惹了 " + st.harm + " 回事。");
  if (st.saidYear === yr(i)) s.push("  这一年的话你说过了。");
  else s.push("  这一年你还能说一句：点下面一个字（比如点“" + sc[2] + "”，就是'" + sc[2] + "别笑'），或者点“笑吧”。");
  s.push("  不说就点：过");
  return s.join("\n");
}

function newGame(seed) {
  var st = { seed: seed, scenes: makeScenes(seed), i: 0, log: [], mem: [], calm: [], warm: 0, harm: 0, saidYear: 0, over: false, seen: {} };
  stepScene(st);
  return st;
}
function openingText(st) {
  return "她嫁进来了。她什么都笑。\n你是她婆婆。一年里你能对她说一句话。\n\n" + currentText(st);
}

function endText(st) {
  var s = ["八年过去了。", ""];
  for (var y = 0; y < YEARS; y++) {
    var row = [];
    for (var j = 0; j < PER; j++) {
      var h = st.log[y * PER + j].how;
      row.push(h === "笑" ? "笑" : (h === "抿" ? "抿" : "〇"));
    }
    var tag = "";
    st.mem.forEach(function (m) { if (m.year === y + 1) tag = "　← 你在" + m.scene[1] + "说'" + m.word + "别笑'"; });
    st.calm.forEach(function (c) { if (c.year === y + 1) tag = "　← 你在" + c.scene[1] + "说'笑吧'"; });
    s.push("  第 " + (y + 1) + " 年  " + row.join(" ") + tag);
  }
  s.push("");
  s.push("  家里暖了 " + st.warm + " 回，她惹了 " + st.harm + " 回事。");
  s.push("");
  var nlast = 0;
  for (var k = (YEARS - 1) * PER; k < YEARS * PER; k++) if (st.log[k].how !== "不笑") nlast++;
  s.push("  最后一年她笑了 " + nlast + " 回。");
  s.push("");
  s.push("  她不笑的地方：");
  st.mem.forEach(function (m) {
    var mk = {}; mk[m.word] = 0;
    s.push("  · " + m.word + "——第 " + m.year + " 年你在那一回（" + sceneText(m.scene, mk) + "）说的。");
    m.dead.forEach(function (f) {
      s.push("    " + f + "——那句话是在" + f + "旁边说的。她后来每碰上" + f + "就抿一下嘴，抿到第 " + yr(m.deadAt[f]) + " 年，就不笑了。");
    });
  });
  if (!st.mem.length) s.push(st.calm.length ? "  （没有。你一句'别笑'也没说。）" : "  （没有。你一句也没说。）");
  return s.join("\n");
}

function act(st, cmd) {
  cmd = cmd.trim();
  if (st.over) return endText(st);
  var sc = st.scenes[st.i];
  if (cmd === "笑吧" || has(ALL, cmd)) {
    if (st.saidYear === yr(st.i)) return "这一年你已经说过一句了。";
    st.saidYear = yr(st.i);
    if (cmd === "笑吧") {
      var n = 0;
      st.mem.forEach(function (m) {
        sc.forEach(function (f) {
          if (f === m.word) return;
          if ((m.pin[f] || 0) > 0) {
            m.pin[f] = Math.min(m.pin[f], TIRE) - 1;
            n++;
            if (has(m.dead, f) && m.pin[f] < TIRE) { m.dead.splice(m.dead.indexOf(f), 1); delete m.deadAt[f]; }
          }
        });
      });
      st.calm.push({ year: yr(st.i), scene: sc });
      var left = marks(st, sc);
      st.log[st.i].mark = left;
      return "你说：笑吧，没事。\n" + (n ? "  她看了你一眼。" : "  她点点头。") + "\n  眼下：" + sceneText(sc, left);
    }
    st.mem.push({ word: cmd, scene: sc, year: yr(st.i), pin: {}, dead: [], deadAt: {} });
    return "你说：人罔不笑，但须有时。" + cmd + "别笑。\n  她应了一声。";
  }
  if (cmd === "过") {
    st.i++;
    if (st.i >= YEARS * PER) { st.i--; st.over = true; return endText(st); }
    var pre = (st.i % PER === 0) ? "——过了一年——\n" : "";
    stepScene(st);
    return pre + currentText(st);
  }
  if (cmd === "看") return currentText(st);
  return "不认得：" + cmd;
}

if (typeof module !== "undefined") module.exports = { newGame: newGame, act: act, openingText: openingText, ALL: ALL, makeScenes: makeScenes };
