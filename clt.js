// ============================================================
// clt.js
// 变化定位任务 (Change Localization Task, CLT)
// 基于 CLT.m (0630版) 实验规则
//
// 实验设计：
//   2×1 设计：set size (4, 6)，所有试次均为 change trial
//   SS4 和 SS6 各 70 trial，共 140 trial，均分到 4 个 block（每 block 35 trial）
//   练习 10 trial（2 种 set size × 5）
//
// 试次结构：
//   1. ITI              (500 ms)    显示注视点
//   2. 学习阵列         (250 ms)    显示注视点
//   3. 保留间隔         (1000 ms)   显示注视点（注视点全程固定显示，不消失）
//   4. 测试阵列         (无时间限制) 显示注视点
//
// Block 规则：
//   4 个 block，每 block 35 trial；block 间强制休息至少 30 秒（含倒计时），
//   倒计时结束后显示「您可以继续休息或按【SPACE】开始下一组实验」，按 SPACE 进入下一组
//   不设「低正确率自动结束」：无论正确率高低，实验都完整跑完 4 个 block
//   低正确率只做标记：set size = 4 的平均正确率低于 50% 时，
//   在导出文件名最前面加 F（如 F20260910_1234567890.xlsx）
//
// 调试模式（被试信息四个输入框全部填 1，隐藏触发）：
//   除每个 block 试次数 35 → 5（共 20 trial）外，其余流程与正式实验完全一致
//   （练习 10 trial、block 间强制休息 ≥30 秒、数据保存等均不变）
//   被试编号与随机种子固定为 1111，导出文件名固定为 1111.xlsx
//
// 导出（Excel，3 个 sheet，调试模式与正式实验规则完全一致）：
//   文件名：正式实验 = 实验日期_被试编号（YYYYMMDD_编号），
//                      SS4 平均正确率 < 50% 时前面加 F；
//           调试模式 = 1111.xlsx（固定，不加 F）
//   Sheet1 被试信息：姓名 / 性别 / 年龄 / 身份证号 / 手机号
//   Sheet2 实验数据：全部 trial 的 SetSize、正确/选择色块、鼠标判断、反应时、是否正确
//   Sheet3 实验结果：SS4 / SS6 各自的 Acc、平均 RT（正确试次）、K
//                   以及「低正确率标记」（SS4 平均正确率 < 50% 时为 1）
//   K = (Acc * N^2 - N) / (N - 1)
//
// 颜色规则（每个试次由 buildProbePlan 一次算好并冻结，drawPlanSquares 只按计划绘制）：
//   记忆阵列：从 9 色调色板中不重复地随机取 setSize 个颜色
//   探测阵列：复制记忆阵列颜色，只替换「变化方块」一个 → 有且只有一个色块变色
//   新颜色  ：只能从「记忆阵列中没出现过的颜色」里挑（严格排除，无兜底放宽）
//   计划生成后立即自检 verifyProbePlan()，违反则 console.error 报警（probePlanViolations）
//   探测阵列直接使用记忆阵列那一份 plan，不会因重入/并发读到别的试次的数据
//
// 鼠标反应：直接点击探测阵列中的色块
//   左键 = 确定；右键 = 不确定。两种点击都记录所选色块并计算正确率。
//   只有点击落在色块范围内才算作反应；右键菜单在实验画布上被禁用。
//
// 变化颜色规则：
//   被选方块变为一个未在阵列中出现过的新颜色。
// ============================================================

// 运行版本标记（与 clt.html 中 clt.js?v= 保持一致）：
// 用于确认浏览器实际加载的是最新代码，而非缓存里的旧版本
const CLT_BUILD = '20260917mj1';
console.log('[CLT] build ' + CLT_BUILD + ' loaded');

// 在设置页显示当前 build（确认浏览器加载的是最新代码，而非缓存中的旧版）
(function showBuildTag() {
    const tag = document.getElementById('build-tag');
    if (tag) tag.innerText = 'clt.js build ' + CLT_BUILD;
})();

// 版本自检：页面（clt.html）与脚本（clt.js）版本号必须一致。
// 不一致说明浏览器缓存了旧的 clt.js（实验会跑出旧规则、旧导出文件名），
// 在设置页直接给出告警，避免又用旧代码跑一整轮实验。
(function checkBuildMatch() {
    const pageBuild = window.CLT_PAGE_BUILD;
    if (pageBuild && pageBuild !== CLT_BUILD) {
        console.warn('[CLT] 版本不一致：页面 ' + pageBuild + ' / 脚本 ' + CLT_BUILD +
            ' —— 浏览器可能缓存了旧 clt.js，请 Ctrl+F5 强制刷新');
        const el = document.getElementById('build-mismatch');
        if (el) el.classList.remove('hidden');
    }
})();

const storage = window.CLTStorage;
let p = {};
let stimData = [];
let practiceData = [];
let currentBlock = 1;
let currentTrial = 0;
let blockTrials = [];
let experimentPhase = 'setup';
let currentNItems = 4; // 当前试次的 set size，用于鼠标命中范围判断
let lowAccBlockCount = 0;        // 正确率低于 50% 的 block 累计数（只统计，不终止实验）
// 低正确率标记：set size = 4 的平均正确率低于 50% 时为 true，导出文件名最前面加 F。
// 注意：实验本身不再因低正确率提前结束，永远跑完 4 个 block。
let ss4LowAccuracyFlag = false;

// --- 实验参数（对应 CLT.m getPreferences） ---
const prefs = {
    setSizes: [4, 6],
    numBlocks: 4,
    numTrials: 35,
    nEachSS: 70,            // 每个 set size 70 trial
    nPractice: 10,          // 练习 10 trial
    ITI: 500,               // ms
    studyDuration: 250,     // ms（对应 MATLAB studyDuration）
    retentionInterval: 1000,// ms
    stimSize: 51,
    minDist: 51 * 2.5,
    fixationSize: 8,
    breakLength: 0.5,
    labelFontSize: 18
};

// --- 兼容旧版数据结构的内部标签映射 ---
// 鼠标版不再绘制数字标签，但保留映射字段，便于旧表结构继续接收 response/correctResponse。
const LABEL_CHARS = ['1', '2', '3', '8', '9', '0'];
let trialLabels = [];

const colors_9 = [
    [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0],
    [255, 0, 255], [0, 255, 255], [255, 255, 255], [0, 0, 0], [255, 128, 0]
];

// --- PRNG ---
let seed = 1;
function seedRandom(s) { seed = s; }
function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function randInt(min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
}

// --- 高精度计时器 ---
function wait(ms) {
    return new Promise(resolve => {
        const start = performance.now();
        function check(time) {
            if (time - start >= ms) { resolve(); }
            else { requestAnimationFrame(check); }
        }
        requestAnimationFrame(check);
    });
}

// --- DOM 元素 ---
// 问卷阶段已删除，因此 screens 中不再包含 questionnaire 键
const screens = {
    setup: document.getElementById('setup-phase'),
    instructions: document.getElementById('instructions-phase'),
    experiment: document.getElementById('experiment-phase'),
    break: document.getElementById('break-phase'),
    upload: document.getElementById('upload-phase'),
    finished: document.getElementById('finished-phase')
};
const canvas = document.getElementById('expCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// --- 身份证号掩蔽 & SubjectID 自动生成 ---
let realIdCard = ''; // 存储真实身份证号（掩蔽显示时仍保留原值）

const idCardInput = document.getElementById('subIdCard');
const phoneInput = document.getElementById('subPhone');
const subjectIDInput = document.getElementById('subjectID');

// 身份证号：输入时更新真实值
idCardInput.addEventListener('input', () => {
    realIdCard = idCardInput.value;
    updateSubjectID();
});
// 聚焦时恢复真实值便于编辑
idCardInput.addEventListener('focus', () => {
    idCardInput.value = realIdCard;
});
// 失焦时掩蔽显示（前4位 + * + 后6位）
idCardInput.addEventListener('blur', () => {
    realIdCard = idCardInput.value;
    if (realIdCard.length > 10) {
        idCardInput.value = realIdCard.substring(0, 4)
            + '*'.repeat(realIdCard.length - 10)
            + realIdCard.substring(realIdCard.length - 6);
    }
});

// 手机号变化时更新 SubjectID
phoneInput.addEventListener('input', updateSubjectID);

function updateSubjectID() {
    const id = buildSubjectID();
    subjectIDInput.value = id;
}

// 按规则生成被试编号：身份证号后 6 位 + 手机号后 4 位（纯字符串，保留前导 0）
// 直接读取输入框当前值，不依赖 input 事件（浏览器自动填充、程序赋值等场景同样正确）
function buildSubjectID() {
    const idVal = realIdCard || idCardInput.value || '';
    const phoneVal = phoneInput.value || '';
    if (idVal.length >= 6 && phoneVal.length >= 4) {
        return idVal.slice(-6) + phoneVal.slice(-4);
    }
    return '';
}

// 实验日期（YYYYMMDD），用于导出文件名「实验日期_被试编号」
function formatDateYYYYMMDD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
}

// 掩蔽身份证号（用于数据导出，保护隐私）
function maskIdCard(idCard) {
    if (idCard.length > 10) {
        return idCard.substring(0, 4)
            + '*'.repeat(idCard.length - 10)
            + idCard.substring(idCard.length - 6);
    }
    return idCard;
}

// --- 设置表单 ---
document.getElementById('start-btn').addEventListener('click', async () => {
    const form = document.getElementById('setup-form');
    if (!form.reportValidity()) return;

    p.subName = document.getElementById('subName').value;
    p.subGender = document.getElementById('subGender').value;
    p.subAge = document.getElementById('subAge').value;
    p.subIdCard = realIdCard || idCardInput.value; // 使用真实身份证号
    p.subPhone = document.getElementById('subPhone').value;
    // 被试编号：点击开始时按规则由当前输入框的值重新生成一次
    // （不依赖 input 事件，浏览器自动填充 / 程序赋值也能正确生成）
    if (buildSubjectID()) subjectIDInput.value = buildSubjectID();
    // 严格按「身份证后6位 + 手机后4位」的原始数字字符串保存，不做 parseInt
    // （否则前导 0 会被吞掉，如 0701231234 变成 701231234）
    const generatedID = String(subjectIDInput.value || '').trim();
    p.subjectID = generatedID || String(Date.now());
    if (!generatedID) {
        // 身份证号不足 6 位或手机号不足 4 位时无法按规则生成编号，
        // 只能退回时间戳。明确告警，避免事后把「一串数字」误当成随机种子。
        console.warn('[CLT] 被试编号无法按规则生成（身份证号需 ≥6 位、手机号需 ≥4 位），' +
            '已退回时间戳：' + p.subjectID);
    }
    // 随机种子：用字符串编号派生（Number 转换仅用于 PRNG 内部，不影响编号本身）
    const seedNum = Number(p.subjectID);
    p.rndSeed = Number.isFinite(seedNum) ? seedNum : Date.now();
    p.saveLocal = true; // 保存到本地始终开启（复选框已隐藏，网页端数据库 + 本地均保存）
    p.expDate = formatDateYYYYMMDD(new Date()); // 实验日期（导出文件名用）

    // 调试模式触发（复选框已隐藏）：姓名/年龄/身份证号/手机号 四个输入框全部填 1
    // （性别为下拉选择，不参与判定；subjectID 自动生成不受影响）
    // 判定做了两处容错，避免「明明填了 1 却没进调试模式、导出文件名变成一串时间戳」：
    //   1) 中文输入法打出的全角「１」自动折算为半角；
    //   2) 只要四个框的内容「全部由数字 1 组成」即算命中 —— 身份证号框受 maxlength=18
    //      限制，连打 18 个 1 时也是命中；且用的是未掩蔽的 realIdCard，
    //      不会因为失焦掩蔽成「1111********111111」而漏判。
    const normalizeOnes = (v) => String(v == null ? '' : v)
        .trim()
        .replace(/[\uFF10-\uFF19]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30));
    const isAllOnes = (v) => /^1+$/.test(normalizeOnes(v));
    p.debugMode = isAllOnes(p.subName) && isAllOnes(p.subAge)
        && isAllOnes(p.subIdCard) && isAllOnes(p.subPhone);
    if (p.debugMode) {
        console.log('[CLT] 调试模式已触发（姓名/年龄/身份证号/手机号 全为 1）');
    } else {
        console.log(`[CLT] 正式模式（姓名="${p.subName}" 年龄="${p.subAge}" ` +
            `身份证号长度=${String(p.subIdCard || '').length} 手机号="${p.subPhone}"）`);
    }

    // 调试模式：练习、正式实验流程、block 间休息等全部与正式实验完全一致，
    // 唯一差异是每个 block 的试次数由 35 降为 5（4 block × 5 = 20 trial，SS4/SS6 各 10）；
    // 被试编号与随机种子一并固定为 1111（导出文件名也是 1111.xlsx），便于识别与复现
    if (p.debugMode) {
        prefs.numTrials = 5;
        prefs.nEachSS = 10;
        p.subjectID = '1111';
        p.rndSeed = 1111;
        subjectIDInput.value = '1111'; // 设置页同步显示，与导出文件名一致
    }

    seedRandom(p.rndSeed);

    try {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
    } catch (err) { console.log("Fullscreen denied."); }

    try {
        if (!storage) throw new Error('Storage adapter is unavailable');
        await storage.initializeStorage({ participant: { ...p }, build: CLT_BUILD });
    } catch (err) {
        console.error('[CLT storage] initialization failed:', err);
        if (storage && storage.backendName === 'jatos') {
            showSetupError('JATOS 初始化失败，实验尚未开始。请联系实验管理员。');
            return;
        }
    }

    switchScreen('instructions');
    experimentPhase = 'instructions';
});

function showSetupError(message) {
    const el = document.getElementById('build-mismatch');
    if (!el) return;
    el.innerText = message;
    el.classList.remove('hidden');
}

function switchScreen(screenName) {
    for (let key in screens) screens[key].classList.add('hidden');
    screens[screenName].classList.remove('hidden');
}

// --- 全局键盘监听：仅用于阶段切换，不再用于试次作答 ---
window.addEventListener('keydown', (e) => {
    if (e.repeat) return;

    if (experimentPhase === 'instructions' && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        startPractice();
    } else if (experimentPhase === 'practice_end' && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        startFormal();
    } else if (experimentPhase === 'break_countdown' || experimentPhase === 'break_wait') {
        // 休息阶段：强制倒计时期间按 SPACE 无效；
        // 倒计时结束后按 SPACE 进入下一组（无「继续休息」按钮，也无 ESC 退出）
        if (experimentPhase === 'break_wait' && (e.code === 'Space' || e.key === ' ')) {
            e.preventDefault();
            nextBlock();
        }
    }
});

// 右键用于“不确定”作答，因此实验画布上禁用浏览器右键菜单。
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// 把鼠标坐标换算到 canvas 坐标，并判断点击落在哪个色块上。
function clickedItemIndex(e) {
    if (!trialPlan || !Array.isArray(trialPlan.locs)) return -1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return -1;
    const x = (e.clientX - rect.left) * canvas.width / rect.width;
    const y = (e.clientY - rect.top) * canvas.height / rect.height;
    const half = prefs.stimSize / 2;
    for (let i = 0; i < currentNItems; i++) {
        const loc = trialPlan.locs[i];
        if (Math.abs(x - loc.x) <= half && Math.abs(y - loc.y) <= half) return i;
    }
    return -1;
}

canvas.addEventListener('mousedown', (e) => {
    const phase = experimentPhase;
    if (phase !== 'practice_response' && phase !== 'trial_response') return;
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();

    const itemIdx = clickedItemIndex(e);
    if (itemIdx < 0) return;

    // response/correctResponse 沿用旧版标签槽编号，确保既有数据结构兼容；
    // 实际选择的是 itemIdx 对应的色块，导出时再转换为 1 起始的色块序号。
    const mappedSlot = labelMap.indexOf(itemIdx);
    const responseNum = mappedSlot >= 0 ? mappedSlot + 1 : itemIdx + 1;
    const mouseButton = e.button === 0 ? 'left' : 'right';

    if (phase === 'practice_response') recordPracticeResponse(responseNum, mouseButton);
    else recordResponse(responseNum, mouseButton);
});

// ============================================================
//  练习阶段（20 trial，2 种 set size × 10，全部 change）
// ============================================================
let practiceTrials = [];
let practiceTrialIdx = 0;
let practiceAcc = [];

function startPractice() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let nPerSzPractice = prefs.nPractice / prefs.setSizes.length;
    practiceTrials = [];
    for (let ss of prefs.setSizes) {
        for (let i = 0; i < nPerSzPractice; i++) {
            practiceTrials.push({ setSize: ss, change: 1 }); // CLT 全部 change
        }
    }
    shuffleArray(practiceTrials);
    practiceTrialIdx = 0;
    practiceAcc = [];
    practiceData = [];

    switchScreen('experiment');
    runPracticeTrial();
}

let activeColors = [];
let activeLocs = [];
let trialData = {};
let practiceTrialData = {};
let responseStartTime = 0;

// CLT 专用：变化方块索引、新颜色、兼容旧数据的内部标签映射
// 这些全局量是「当前试次」的镜像，记录数据与鼠标判断用；
// 绘制一律走 trialPlan（见 buildProbePlan），不直接读这些全局量。
let changeItemIdx = 0;
let changeColorIdx = 0;
let labelMap = [];
let correctLabel = 0;

// --- 当前试次的「探测计划」---
// 记忆阵列颜色、探测阵列颜色、位置、标签全部由它一次算好并冻结。
// 这样探测阵列必定是「它自己那次记忆阵列」的唯一一个方块变色，
// 不可能出现两个（或更多）方块同时变色。
let trialPlan = null;
let probePlanViolations = 0;   // 自检失败计数，正常情况下恒为 0

// 自检：探测阵列相对记忆阵列必须有且只有一个方块变色，
// 且变化后的颜色不能是记忆阵列中出现过的颜色
function verifyProbePlan(plan) {
    let diff = [];
    for (let i = 0; i < plan.setSize; i++) {
        if (plan.probeColors[i] !== plan.memColors[i]) diff.push(i);
    }
    const onlyOneChanged = diff.length === 1 && diff[0] === plan.changeIdx;
    const newColorNotInMemory = !plan.memColors.includes(plan.probeColors[plan.changeIdx]);
    const colorReallyChanged = plan.probeColors[plan.changeIdx] !== plan.memColors[plan.changeIdx];
    const noDupInMemory = new Set(plan.memColors).size === plan.setSize;
    const ok = onlyOneChanged && newColorNotInMemory && colorReallyChanged && noDupInMemory;
    if (!ok) {
        probePlanViolations++;
        console.error('[CLT] 探测阵列自检未通过（不应发生）：', {
            diff: diff, memColors: plan.memColors, probeColors: plan.probeColors,
            changeIdx: plan.changeIdx, setSize: plan.setSize, violations: probePlanViolations
        });
    }
    return ok;
}

// 生成一次试次的完整视觉计划
//   记忆阵列：从 9 色调色板中不重复地随机取 setSize 个颜色
//   探测阵列：复制记忆阵列颜色，只把「变化方块」换成新颜色 → 恰好 1 个方块变色
//   新颜色  ：只能从「记忆阵列中没出现过的颜色」里挑，严格排除，无兜底放宽
function buildProbePlan(setSize) {
    let colorIndexArr = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    shuffleArray(colorIndexArr);
    const memColors = colorIndexArr.slice(0, setSize);

    const locs = getStimLocs(setSize, canvas.width / 2, canvas.height / 2);

    // 变化方块：随机 1 个
    const changeIdx = randInt(0, setSize - 1);

    // 新颜色：排除记忆阵列出现过的全部颜色
    let newColorPool = [];
    for (let c = 0; c < colors_9.length; c++) {
        if (!memColors.includes(c)) newColorPool.push(c);
    }
    if (newColorPool.length === 0) {
        // 调色板共 9 色、setSize 最大 6，实际不可能触发；
        // 保留防御但不放宽条件（绝不退回记忆阵列已用的颜色）
        throw new Error('buildProbePlan: 调色板颜色不足，无法选出不属于记忆阵列的新颜色');
    }
    const newColor = newColorPool[randInt(0, newColorPool.length - 1)];

    // 探测阵列颜色：仅替换变化方块那一项
    const probeColors = memColors.slice();
    probeColors[changeIdx] = newColor;

    // 内部标签映射：鼠标版不绘制标签，仅用于保持旧数据字段的编号语义。
    let lmap = [];
    for (let i = 0; i < setSize; i++) lmap.push(i);
    shuffleArray(lmap);

    // 兼容旧数据的标签字符元数据（不显示给被试）
    let charPool = [0, 1, 2, 3, 4, 5];
    shuffleArray(charPool);

    const plan = {
        setSize: setSize,
        locs: locs,
        memColors: memColors,           // 记忆阵列颜色
        probeColors: probeColors,       // 探测阵列颜色（恰好 1 项与 memColors 不同）
        changeIdx: changeIdx,           // 变化方块的索引
        origColor: memColors[changeIdx],// 变化方块原色
        newColor: newColor,             // 变化方块新色（不在 memColors 中）
        labelMap: lmap,
        trialLabels: charPool.slice(0, setSize),
        correctLabel: lmap.indexOf(changeIdx) + 1
    };

    verifyProbePlan(plan);
    return plan;
}

// 把试次计划同步到全局镜像（记录数据 / 按键判断用；绘制不依赖这些全局量）
function applyPlanToGlobals(plan) {
    activeColors = plan.memColors.slice();
    activeLocs = plan.locs;
    changeItemIdx = plan.changeIdx;
    changeColorIdx = plan.newColor;
    labelMap = plan.labelMap.slice();
    trialLabels = plan.trialLabels.slice();
    correctLabel = plan.correctLabel;
    currentNItems = plan.setSize;
}

// 按指定颜色数组绘制当前计划的全部方块（记忆阵列 / 探测阵列共用）
function drawPlanSquares(plan, colorIdxArr) {
    for (let i = 0; i < plan.setSize; i++) {
        drawSquare(plan.locs[i].x, plan.locs[i].y, colors_9[colorIdxArr[i]]);
    }
}

async function runPracticeTrial() {
    if (practiceTrialIdx >= practiceTrials.length) {
        endPractice();
        return;
    }

    experimentPhase = 'practice_running';
    let condition = practiceTrials[practiceTrialIdx];
    currentNItems = condition.setSize;
    practiceTrialData = {
        block: 0, trial: practiceTrialIdx + 1,
        setSize: condition.setSize, isChange: 1
    };

    // ITI
    drawBackground(); drawFixation();
    await wait(prefs.ITI);

    await showStudyArrayPractice(condition);
}

async function showStudyArrayPractice(condition) {
    // 一次算好并冻结本试次的视觉计划：记忆阵列 / 探测阵列 / 位置 / 标签
    // 计划内已保证「有且只有一个方块变色」且「新颜色不在记忆阵列中出现」
    const plan = buildProbePlan(condition.setSize);
    trialPlan = plan;
    applyPlanToGlobals(plan);

    // 学习阵列（仅方块，无标签）
    drawBackground(); drawFixation();
    drawPlanSquares(plan, plan.memColors);
    await wait(prefs.studyDuration);

    // 保留间隔（注视点全程固定显示，不消失）
    drawBackground(); drawFixation();
    await wait(prefs.retentionInterval);

    // 探测阵列：直接用同一个 plan 的 probeColors，任何情况下都只有一个方块变色
    showTestArrayPractice(plan);
}

function showTestArrayPractice(plan) {
    drawBackground(); drawFixation();

    // 绘制全部方块（变化方块使用新颜色）
    drawPlanSquares(plan, plan.probeColors);

    experimentPhase = 'practice_response';
    canvas.style.cursor = 'crosshair';
    responseStartTime = performance.now();
}

function recordPracticeResponse(responseNum, mouseButton) {
    // 立即锁定反应阶段：防止鼠标连击在同一试次内触发第二次响应
    if (experimentPhase !== 'practice_response') return;
    experimentPhase = 'practice_locked';
    canvas.style.cursor = 'default';

    let rt = (performance.now() - responseStartTime) / 1000;
    practiceTrialData.rt = rt;
    practiceTrialData.response = responseNum;          // 兼容旧数据的标签槽编号（1..nItems）
    practiceTrialData.responseKey = mouseButton;       // left=确定，right=不确定
    practiceTrialData.correctResponse = correctLabel;
    practiceTrialData.changeItem = changeItemIdx;
    practiceTrialData.origColorIdx = activeColors[changeItemIdx];
    practiceTrialData.probeColorIdx = changeColorIdx;
    practiceTrialData.labelMap = JSON.stringify(labelMap);
    practiceTrialData.trialLabels = JSON.stringify(trialLabels.map(i => LABEL_CHARS[i]));
    practiceTrialData.labelChars = LABEL_CHARS.join('');
    practiceTrialData.accuracy = (responseNum === correctLabel) ? 1 : 0;

    practiceAcc.push(practiceTrialData.accuracy);
    practiceData.push(Object.assign({}, practiceTrialData));

    drawBackground(); drawFixation();
    practiceTrialIdx++;
    setTimeout(() => runPracticeTrial(), 50);
}

function endPractice() {
    let accPct = Math.round(practiceAcc.reduce((a, b) => a + b, 0) / practiceAcc.length * 100);
    experimentPhase = 'practice_end';
    drawBackground();

    ctx.fillStyle = 'rgb(255,255,255)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.fillText('练习结束', canvas.width / 2, canvas.height / 2 - 80);
    ctx.font = '28px Inter, sans-serif';
    ctx.fillText(`正确率：${accPct}%`, canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '20px Inter, sans-serif';
    ctx.fillStyle = 'rgb(255,235,59)';
    ctx.fillText('按 空格键(Space) 开始正式实验', canvas.width / 2, canvas.height / 2 + 60);
}

// ============================================================
//  正式实验阶段
// ============================================================
function startFormal() {
    // 预生成 140 trial（SS4×70 + SS6×70，随机顺序），全部 change
    let allSS = [];
    let nEachSS = prefs.nEachSS;
    for (let ss of prefs.setSizes) {
        for (let i = 0; i < nEachSS; i++) allSS.push(ss);
    }
    shuffleArray(allSS);

    allFormalTrials = [];
    for (let b = 0; b < prefs.numBlocks; b++) {
        for (let t = 0; t < prefs.numTrials; t++) {
            let idx = b * prefs.numTrials + t;
            if (idx < allSS.length) {
                allFormalTrials.push({ setSize: allSS[idx], change: 1 });
            }
        }
    }

    currentBlock = 1;
    startBlock();
}

let allFormalTrials = [];
let formalTrialGlobalIdx = 0;

function startBlock() {
    blockTrials = allFormalTrials.slice(
        (currentBlock - 1) * prefs.numTrials,
        currentBlock * prefs.numTrials
    );
    currentTrial = 0;
    formalTrialGlobalIdx = (currentBlock - 1) * prefs.numTrials;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    switchScreen('experiment');
    runTrial();
}

async function runTrial() {
    if (currentTrial >= blockTrials.length) {
        endBlock();
        return;
    }

    experimentPhase = 'trial_running';
    let condition = blockTrials[currentTrial];
    currentNItems = condition.setSize;
    trialData = {
        subjectID: p.subjectID,
        subName: p.subName,
        block: currentBlock,
        trial: currentTrial + 1,
        setSize: condition.setSize,
        isChange: 1,
        experimentType: 'CLT'
    };

    // ITI
    drawBackground(); drawFixation();
    await wait(prefs.ITI);

    await showStudyArray(condition);
}

async function showStudyArray(condition) {
    // 一次算好并冻结本试次的视觉计划：记忆阵列 / 探测阵列 / 位置 / 标签
    // 计划内已保证「有且只有一个方块变色」且「新颜色不在记忆阵列中出现」
    const plan = buildProbePlan(condition.setSize);
    trialPlan = plan;
    applyPlanToGlobals(plan);

    trialData.itemLocs = JSON.stringify(plan.locs.map(l => [Math.round(l.x), Math.round(l.y)]));
    trialData.itemColors = JSON.stringify(plan.memColors);

    // 学习阵列（仅方块，无标签）
    drawBackground(); drawFixation();
    drawPlanSquares(plan, plan.memColors);
    await wait(prefs.studyDuration);

    // 保留间隔（注视点全程固定显示，不消失）
    drawBackground(); drawFixation();
    await wait(prefs.retentionInterval);

    trialData.changeItem = plan.changeIdx;
    trialData.origColorIdx = plan.origColor;
    trialData.probeColorIdx = plan.newColor;
    trialData.labelMap = JSON.stringify(plan.labelMap);
    trialData.trialLabels = JSON.stringify(plan.trialLabels.map(i => LABEL_CHARS[i]));
    trialData.labelChars = LABEL_CHARS.join('');
    trialData.correctResponse = plan.correctLabel;

    // 探测阵列：直接用同一个 plan 的 probeColors，任何情况下都只有一个方块变色
    showTestArray(plan);
}

function showTestArray(plan) {
    drawBackground(); drawFixation();

    // 绘制全部方块（变化方块使用新颜色）
    drawPlanSquares(plan, plan.probeColors);

    experimentPhase = 'trial_response';
    canvas.style.cursor = 'crosshair';
    responseStartTime = performance.now();
}

function recordResponse(responseNum, mouseButton) {
    // 立即锁定反应阶段：防止鼠标连击在同一试次内触发第二次响应
    if (experimentPhase !== 'trial_response') return;
    experimentPhase = 'trial_locked';
    canvas.style.cursor = 'default';

    let rt = (performance.now() - responseStartTime) / 1000;
    trialData.rt = rt;
    trialData.response = responseNum;                  // 兼容旧数据的标签槽编号（1..nItems）
    trialData.responseKey = mouseButton;               // left=确定，right=不确定
    trialData.accuracy = (responseNum === correctLabel) ? 1 : 0;

    const completedTrial = Object.assign({}, trialData);
    stimData.push(completedTrial);
    if (storage) {
        storage.saveTrial(prepareStorageRow(completedTrial)).catch(error => {
            console.error('[CLT storage] trial save failed:', error);
        });
    }

    drawBackground(); drawFixation();
    currentTrial++;
    formalTrialGlobalIdx++;
    setTimeout(() => runTrial(), 50);
}

// ============================================================
//  Block 间休息（强制 ≥30 秒倒计时，倒计时结束后按 SPACE 进入下一组）
// ============================================================
let breakTimer = null;
const BREAK_MIN_SECONDS = 30;   // block 间强制休息至少 30 秒

// 计算某个 block 的正确率（%）
function blockAccuracyPct(blockNo) {
    let rows = stimData.filter(d => d.block === blockNo);
    if (rows.length === 0) return 0;
    return Math.round(rows.reduce((s, d) => s + d.accuracy, 0) / rows.length * 100);
}

// set size = 4 的平均正确率（%）；没有 SS4 数据时返回 null
function ss4AccuracyPct() {
    const rows = stimData.filter(d => d.setSize === 4);
    if (rows.length === 0) return null;
    return rows.reduce((s, d) => s + d.accuracy, 0) / rows.length * 100;
}

// 低正确率标记：set size = 4 的平均正确率低于 50%
// 只影响导出文件名（前面加 F），不改变实验流程
function computeLowAccuracyFlag() {
    const acc = ss4AccuracyPct();
    return acc !== null && acc < 50;
}

function endBlock() {
    const blockAcc = blockAccuracyPct(currentBlock);

    // 只统计正确率低于 50% 的 block 数量（写入结果表备查）。
    // 已取消「累计 2 个 block 低于 50% 自动结束实验」的规则：
    // 无论正确率高低，实验都完整跑完 4 个 block，低正确率只在导出文件名上加 F。
    if (blockAcc < 50) lowAccBlockCount++;

    if (storage) {
        storage.saveCheckpoint({
            subjectID: p.subjectID,
            block: currentBlock,
            blockAccuracy: blockAcc,
            completedTrials: stimData.length,
            nextBlock: currentBlock < prefs.numBlocks ? currentBlock + 1 : null
        }).catch(error => {
            console.error('[CLT storage] checkpoint save failed:', error);
        });
    }

    if (currentBlock < prefs.numBlocks) {
        showBreakScreen(blockAcc);
    } else {
        finishExperiment();
    }
}

function showBreakScreen(blockAcc) {
    switchScreen('break');
    experimentPhase = 'break_countdown';
    document.getElementById('rest-acc').innerText = `您的正确率为 ${blockAcc}%`;
    startBreakCountdown();
}

// 强制休息倒计时（结束后显示等待提示，按 SPACE 进入下一组）
function startBreakCountdown() {
    clearInterval(breakTimer);
    breakTimer = null;

    const cdEl = document.getElementById('rest-countdown');
    const waitEl = document.getElementById('rest-wait');
    let timeLeft = Math.max(BREAK_MIN_SECONDS, Math.round(prefs.breakLength * 60));

    experimentPhase = 'break_countdown';
    cdEl.innerText = timeLeft;
    cdEl.classList.remove('hidden');
    waitEl.classList.add('hidden');

    breakTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(breakTimer);
            breakTimer = null;
            cdEl.classList.add('hidden');
            waitEl.classList.remove('hidden');
            experimentPhase = 'break_wait';   // 此时按 SPACE 进入下一组
        } else {
            cdEl.innerText = timeLeft;
        }
    }, 1000);
}

// “继续休息 30 秒”按钮与其 ESC 退出实验功能已删除：
// 倒计时结束后只有「按 SPACE 进入下一组」一种操作。

function nextBlock() {
    clearInterval(breakTimer);
    breakTimer = null;
    currentBlock++;
    startBlock();
}

// 保存前统一补齐被试信息（保证每一行都带完整的被试信息）
function enrichRows(rows) {
    for (let d of rows) {
        Object.assign(d, prepareStorageRow(d));
    }
    return rows;
}

function prepareStorageRow(row) {
    return {
        ...row,
        subName: p.subName,
        subGender: p.subGender,
        subAge: p.subAge,
        subIdCard: maskIdCard(p.subIdCard),
        subPhone: p.subPhone,
        subjectID: p.subjectID,
        rndSeed: p.rndSeed
    };
}

// ============================================================
//  数据保存
// ============================================================
async function finishExperiment() {
    switchScreen('upload');
    experimentPhase = 'upload';

    let uploadMsg = "";
    let uploadFailed = false;

    enrichRows(stimData);
    ss4LowAccuracyFlag = computeLowAccuracyFlag();

    if (storage && stimData.length > 0) {
        try {
            const saveResult = await storage.saveFinalResult({
                trials: stimData,
                probePlanViolations: probePlanViolations,
                lowAccuracyFlag: ss4LowAccuracyFlag,
                lowAccuracyBlockCount: lowAccBlockCount
            });
            uploadMsg += saveResult && saveResult.message ? saveResult.message : '数据保存成功。';
            await storage.finishExperiment({ successful: true, message: 'CLT mouse completed' });
        } catch (error) {
            console.error('[CLT storage] final save failed:', error);
            uploadFailed = true;
            uploadMsg += '服务器上传失败: ' + error.message + '。';
            try {
                await storage.finishExperiment({ successful: false, message: 'CLT mouse persistence failed' });
            } catch (finishError) {
                console.error('[CLT storage] failed to close unsuccessful study:', finishError);
            }
        }
    } else if (!storage) {
        uploadMsg += "本版本未配置服务器上传，仅生成本地 Excel。";
    }

    if (p.saveLocal && stimData.length > 0) {
        try {
            downloadXLSX();
            uploadMsg += "本地 Excel 已生成下载。";
        } catch (e) {
            console.error('[CLT] 本地导出失败:', e);
            uploadFailed = true;
            uploadMsg += "本地 Excel 导出失败：" + e.message + "。";
        }
    }

    document.getElementById('upload-status').innerText = uploadMsg;

    // 结束语画面保持干净：仅在异常时显示状态说明
    const statusEl = document.getElementById('finished-text');
    if (statusEl) {
        if (uploadFailed) {
            statusEl.innerText = uploadMsg;
            statusEl.classList.remove('hidden');
        } else {
            statusEl.innerText = '';
            statusEl.classList.add('hidden');
        }
    }

    setTimeout(() => { switchScreen('finished'); }, 2000);

    try {
        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    } catch (e) {}
}

function downloadXLSX() {
    if (stimData.length === 0) return;

    // 低正确率标记：set size = 4 的平均正确率 < 50% → 导出文件名前面加 F
    // （实验流程不受影响，永远跑完 4 个 block）
    ss4LowAccuracyFlag = computeLowAccuracyFlag();

    // ============================================================
    //  Sheet 1：被试信息
    // ============================================================
    const infoRows = [{
        姓名: p.subName,
        性别: p.subGender,
        年龄: p.subAge,
        身份证号: maskIdCard(p.subIdCard),   // 掩蔽后导出（前4位 + * + 后6位）
        手机号: p.subPhone
    }];
    const infoSheet = XLSX.utils.json_to_sheet(infoRows, {
        header: ['姓名', '性别', '年龄', '身份证号', '手机号']
    });
    infoSheet['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 26 }, { wch: 16 }];

    // ============================================================
    //  Sheet 2：实验数据（所有 trial）
    //  SetSize / 正确色块 / 被试选择色块 / 鼠标判断 / 反应时 / 是否正确(1正确,0错误)
    // ============================================================
    const trialRows = stimData.map(d => {
        let map = [];
        try { map = JSON.parse(d.labelMap || '[]'); } catch (e) { map = []; }
        const correctItem = Number.isInteger(map[d.correctResponse - 1])
            ? map[d.correctResponse - 1] + 1 : d.correctResponse;
        const selectedItem = Number.isInteger(map[d.response - 1])
            ? map[d.response - 1] + 1 : d.response;
        const mouseDecision = d.responseKey === 'left' ? '左键-确定'
            : d.responseKey === 'right' ? '右键-不确定'
            : (d.responseKey || '');
        return {
            被试编号: p.subjectID,
            Block: d.block,
            Trial: d.trial,
            SetSize: d.setSize,
            正确色块序号: correctItem,
            被试选择色块序号: selectedItem,
            鼠标判断: mouseDecision,
            反应时: (typeof d.rt === 'number') ? Math.round(d.rt * 10000) / 10000 : '',
            是否正确: d.accuracy
        };
    });
    const trialSheet = XLSX.utils.json_to_sheet(trialRows, {
        header: ['被试编号', 'Block', 'Trial', 'SetSize', '正确色块序号', '被试选择色块序号', '鼠标判断', '反应时', '是否正确']
    });
    trialSheet['!cols'] = [
        { wch: 12 }, { wch: 7 }, { wch: 7 }, { wch: 9 },
        { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 10 }
    ];

    // ============================================================
    //  Sheet 3：实验结果（按 set size 分别汇总）
    //  Acc = 正确率；RT = 平均反应时（正确试次，秒）
    //  K   = (Acc * N^2 - N) / (N - 1)
    // ============================================================
    const resRows = [];
    for (let ss of prefs.setSizes) {
        const rows = stimData.filter(d => d.setSize === ss);
        const nTotal = rows.length;
        const nCorrect = rows.filter(d => d.accuracy === 1).length;
        const acc = nTotal > 0 ? nCorrect / nTotal : 0;

        const correctRTs = rows.filter(d => d.accuracy === 1 && typeof d.rt === 'number').map(d => d.rt);
        const rtMean = correctRTs.length > 0
            ? correctRTs.reduce((s, v) => s + v, 0) / correctRTs.length
            : '';

        const N = ss;
        const K = N > 1 ? (acc * N * N - N) / (N - 1) : '';

        resRows.push({
            被试编号: p.subjectID,
            SetSize: ss,
            试次数: nTotal,
            正确数: nCorrect,
            Acc: Math.round(acc * 10000) / 10000,
            RT: rtMean === '' ? '' : Math.round(rtMean * 10000) / 10000,
            K: K === '' ? '' : Math.round(K * 10000) / 10000,
            // 1 = SS4 平均正确率低于 50%（导出文件名前面带 F）；0 = 正常
            低正确率标记: ss4LowAccuracyFlag ? 1 : 0,
            低正确率Block数: lowAccBlockCount
        });
    }
    const resSheet = XLSX.utils.json_to_sheet(resRows, {
        header: ['被试编号', 'SetSize', '试次数', '正确数', 'Acc', 'RT', 'K', '低正确率标记', '低正确率Block数']
    });
    resSheet['!cols'] = [
        { wch: 12 }, { wch: 9 }, { wch: 8 }, { wch: 8 },
        { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 13 }, { wch: 15 }
    ];

    // ============================================================
    //  文本列保护：被试编号 / 手机号 / 身份证号 一律按文本写入
    //  （否则 Excel 会把纯数字当成数值，前导 0 被省略）
    // ============================================================
    function forceTextCells(sheet, headerList, colNames) {
        if (!sheet['!ref']) return;
        const range = XLSX.utils.decode_range(sheet['!ref']);
        for (const name of colNames) {
            const c = headerList.indexOf(name);
            if (c < 0) continue;
            for (let r = range.s.r + 1; r <= range.e.r; r++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                const cell = sheet[addr];
                if (!cell || cell.v === undefined || cell.v === null || cell.v === '') continue;
                cell.t = 's';
                cell.v = String(cell.v);
                cell.z = '@';   // 文本格式
                delete cell.w;
            }
        }
    }
    forceTextCells(infoSheet, ['姓名', '性别', '年龄', '身份证号', '手机号'], ['身份证号', '手机号']);

    // === 生成 Excel 文件 ===
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, infoSheet, '被试信息');
    XLSX.utils.book_append_sheet(wb, trialSheet, '实验数据');
    XLSX.utils.book_append_sheet(wb, resSheet, '实验结果');

    forceTextCells(trialSheet, ['被试编号', 'Block', 'Trial', 'SetSize', '正确色块序号', '被试选择色块序号', '鼠标判断', '反应时', '是否正确'], ['被试编号', '鼠标判断']);
    forceTextCells(resSheet, ['被试编号', 'SetSize', '试次数', '正确数', 'Acc', 'RT', 'K', '低正确率标记', '低正确率Block数'], ['被试编号']);

    // 文件名：
    //   正式实验：实验日期_被试编号（编号为原始数字字符串，前导 0 完整保留）；
    //             set size = 4 的平均正确率低于 50% 时，最前面加 F
    //   调试模式：固定为 1111.xlsx（编号与随机种子也都是 1111，不加 F）
    //             （导出内容仍按正式实验规则：3 个 sheet、同样的表头与指标）
    let fileName;
    if (p.debugMode) {
        fileName = '1111.xlsx';
    } else {
        const dateStr = p.expDate || formatDateYYYYMMDD(new Date());
        const filePrefix = ss4LowAccuracyFlag ? 'F' : '';
        fileName = `${filePrefix}${dateStr}_${p.subjectID}.xlsx`;
    }
    console.log(`[CLT] 导出模式=${p.debugMode ? '调试' : '正式'} 被试编号=${p.subjectID}` +
        ` SS4平均正确率=${ss4AccuracyPct() === null ? '无数据' : ss4AccuracyPct().toFixed(1) + '%'}` +
        ` 文件名=${fileName}`);
    saveWorkbookFile(wb, fileName);
}

// ============================================================
//  写出 Excel 文件
//  用正确的 xlsx MIME + 明确的文件名触发下载；同时在结束界面保留一个
//  手动下载链接（某些浏览器/内嵌预览不遵循 download 属性，会把文件存成
//  随机名或没有扩展名，看起来「不是 Excel 文件」，此时可用该链接另存）
// ============================================================
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
let lastExport = null;   // { url, fileName, size }

function saveWorkbookFile(wb, fileName) {
    if (typeof XLSX === 'undefined') {
        throw new Error('Excel 导出库 (xlsx) 未加载');
    }
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const u8 = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes);
    // 校验 zip 魔数 'PK'，确保写出的是合法 xlsx（而不是被当成其它格式）
    if (u8[0] !== 0x50 || u8[1] !== 0x4B) {
        throw new Error('生成的 Excel 内容异常');
    }

    const blob = new Blob([u8], { type: XLSX_MIME });
    const url = URL.createObjectURL(blob);
    lastExport = { url: url, fileName: fileName, size: u8.length };

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();

    console.log(`[CLT] 已导出 ${fileName}（${u8.length} 字节，${wb.SheetNames.length} 个 sheet）`);
    showManualDownload(fileName, url);
}

// 结束界面上的手动下载入口（文件名与自动下载一致）
function showManualDownload(fileName, url) {
    const box = document.getElementById('manual-download');
    if (!box) return;
    const link = document.getElementById('manual-download-link');
    if (link) {
        link.href = url;
        link.download = fileName;
        link.innerText = fileName;
    }
    box.classList.remove('hidden');
}

// ============================================================
//  Canvas 绘图工具
// ============================================================
function drawBackground() {
    ctx.fillStyle = 'rgb(128,128,128)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawFixation() {
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, prefs.fixationSize, 0, Math.PI * 2);
    ctx.fill();
}

function drawSquare(x, y, colorArr) {
    ctx.fillStyle = `rgb(${colorArr[0]},${colorArr[1]},${colorArr[2]})`;
    const half = prefs.stimSize / 2;
    ctx.fillRect(x - half, y - half, prefs.stimSize, prefs.stimSize);
}

// ============================================================
//  getStimLocs — 极坐标四象限位置生成（对应 MATLAB getStimLocs）
// ============================================================
function getStimLocs(nItems, cx, cy) {
    const S = prefs.stimSize;
    const canvasSize = 768;
    const canvasR = canvasSize / 2;
    const ringCenter = 220;
    const ringHalfWidth = 20;
    let minR = ringCenter - ringHalfWidth;
    let maxR = ringCenter + ringHalfWidth;
    if (maxR > canvasR - S) maxR = canvasR - S;
    if (minR < S * 2.0) minR = S * 2.0;

    const minDist = S * 2.5;
    const relaxDist = S * 2.0;
    const axisMargin = 20 * Math.PI / 180;

    const quadPatterns6 = [
        [2,2,1,1], [1,2,1,2], [1,1,2,2], [1,2,2,1], [2,1,1,2], [2,1,2,1]
    ];

    let perQuad;
    if (nItems === 4) {
        perQuad = [1, 1, 1, 1];
    } else if (nItems === 6) {
        perQuad = quadPatterns6[randInt(0, 5)];
    } else {
        throw new Error('getStimLocs: nItems must be 4 or 6, got ' + nItems);
    }

    const qLo = [
        axisMargin, Math.PI / 2 + axisMargin,
        Math.PI + axisMargin, 3 * Math.PI / 2 + axisMargin
    ];
    const qHi = [
        Math.PI / 2 - axisMargin, Math.PI - axisMargin,
        3 * Math.PI / 2 - axisMargin, 2 * Math.PI - axisMargin
    ];

    const nCandidates = 30;
    let bestScore = -Infinity;
    let bestXPos = [], bestYPos = [];

    for (let cand = 0; cand < nCandidates; cand++) {
        let xPos_c = new Array(nItems).fill(0);
        let yPos_c = new Array(nItems).fill(0);
        let idx = 0;

        for (let q = 0; q < 4; q++) {
            const k = perQuad[q];
            if (k === 0) continue;
            const qRange = qHi[q] - qLo[q];

            for (let i = 0; i < k; i++) {
                let thetaC, subLo, subHi;
                if (k === 1) {
                    thetaC = qLo[q] + qRange * 0.5;
                    let jit = qRange * 0.15 * (random() - 0.5) * 2;
                    subLo = thetaC + jit - qRange * 0.05;
                    subHi = thetaC + jit + qRange * 0.05;
                } else {
                    thetaC = qLo[q] + qRange * (0.15 + 0.70 * i / (k - 1));
                    let jit = qRange * 0.05 * (random() - 0.5) * 2;
                    subLo = thetaC + jit - qRange * 0.03;
                    subHi = thetaC + jit + qRange * 0.03;
                }

                let placed = false;

                for (let att = 0; att < 500 && !placed; att++) {
                    let r = minR + (maxR - minR) * Math.sqrt(random());
                    let theta = subLo + (subHi - subLo) * random();
                    let xi = cx + r * Math.cos(theta);
                    let yi = cy + r * Math.sin(theta);
                    if (Math.abs(xi - cx) < S || Math.abs(yi - cy) < S) continue;
                    let tooClose = false;
                    for (let j = 0; j < idx; j++) {
                        if (Math.hypot(xi - xPos_c[j], yi - yPos_c[j]) < minDist) { tooClose = true; break; }
                    }
                    if (!tooClose) { xPos_c[idx] = xi; yPos_c[idx] = yi; placed = true; }
                }

                if (!placed) {
                    for (let att = 0; att < 800 && !placed; att++) {
                        let r = minR + (maxR - minR) * Math.sqrt(random());
                        let theta = qLo[q] + qRange * random();
                        let xi = cx + r * Math.cos(theta);
                        let yi = cy + r * Math.sin(theta);
                        if (Math.abs(xi - cx) < S || Math.abs(yi - cy) < S) continue;
                        let tooClose = false;
                        for (let j = 0; j < idx; j++) {
                            if (Math.hypot(xi - xPos_c[j], yi - yPos_c[j]) < minDist) { tooClose = true; break; }
                        }
                        if (!tooClose) { xPos_c[idx] = xi; yPos_c[idx] = yi; placed = true; }
                    }
                }

                if (!placed) {
                    for (let att = 0; att < 1000 && !placed; att++) {
                        let r = minR + (maxR - minR) * Math.sqrt(random());
                        let theta = qLo[q] + qRange * random();
                        let xi = cx + r * Math.cos(theta);
                        let yi = cy + r * Math.sin(theta);
                        if (Math.abs(xi - cx) < S || Math.abs(yi - cy) < S) continue;
                        let tooClose = false;
                        for (let j = 0; j < idx; j++) {
                            if (Math.hypot(xi - xPos_c[j], yi - yPos_c[j]) < relaxDist) { tooClose = true; break; }
                        }
                        if (!tooClose) { xPos_c[idx] = xi; yPos_c[idx] = yi; placed = true; }
                    }
                }

                if (!placed) {
                    let bestMinD = -1, bestXi = 0, bestYi = 0;
                    for (let att = 0; att < 2000; att++) {
                        let r = minR + (maxR - minR) * Math.sqrt(random());
                        let theta = qLo[q] + qRange * random();
                        let xi = cx + r * Math.cos(theta);
                        let yi = cy + r * Math.sin(theta);
                        if (Math.abs(xi - cx) < S || Math.abs(yi - cy) < S) continue;
                        let minD = Infinity;
                        for (let j = 0; j < idx; j++) {
                            let d = Math.hypot(xi - xPos_c[j], yi - yPos_c[j]);
                            if (d < minD) minD = d;
                        }
                        if (minD > bestMinD) { bestMinD = minD; bestXi = xi; bestYi = yi; }
                    }
                    xPos_c[idx] = bestXi; yPos_c[idx] = bestYi;
                }
                idx++;
            }
        }

        let dists = [];
        for (let a = 0; a < nItems - 1; a++) {
            for (let b = a + 1; b < nItems; b++) {
                dists.push(Math.hypot(xPos_c[a] - xPos_c[b], yPos_c[a] - yPos_c[b]));
            }
        }
        let angles = [];
        for (let i = 0; i < nItems; i++) {
            angles.push(Math.atan2(yPos_c[i] - cy, xPos_c[i] - cx));
        }
        angles = angles.map(a => (a + 2 * Math.PI) % (2 * Math.PI));
        angles.sort((a, b) => a - b);
        let angularGaps = [];
        for (let i = 0; i < nItems; i++) {
            let next = i < nItems - 1 ? angles[i + 1] : angles[0] + 2 * Math.PI;
            angularGaps.push(next - angles[i]);
        }

        let minD = Math.min(...dists);
        let meanD = dists.reduce((s, d) => s + d, 0) / dists.length;
        let stdD = Math.sqrt(dists.reduce((s, d) => s + (d - meanD) ** 2, 0) / (dists.length - 1));
        let meanG = angularGaps.reduce((s, g) => s + g, 0) / angularGaps.length;
        let stdG = Math.sqrt(angularGaps.reduce((s, g) => s + (g - meanG) ** 2, 0) / (angularGaps.length - 1));

        let score = minD - 0.4 * stdD - 40 * stdG;
        if (score > bestScore) {
            bestScore = score;
            bestXPos = [...xPos_c];
            bestYPos = [...yPos_c];
        }
    }

    let locs = [];
    for (let i = 0; i < nItems; i++) {
        locs.push({ x: bestXPos[i], y: bestYPos[i] });
    }
    return locs;
}
