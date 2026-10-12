// ============================================================
// exp1_clt.js
// 变化定位任务 (Change Localization Task, CLT)
// 基于 CLT.m (0630版) 实验规则
//
// 实验设计：
//   3×5 设计：set size (3, 4, 6) × 记忆阵列呈现时长 (50, 200, 500, 1000, 2000 ms)
//   15 种条件各 30 trial，共 450 trial，整体随机后均分到 9 个 block（每 block 50 trial）
//   练习 15 trial（3 种 set size × 5），每个试次随机分配一档呈现时长
//
// 试次结构：
//   1. ITI              (500 ms)           显示注视点
//   2. 学习阵列         (50～2000 ms)      显示注视点，时长由当前试次条件决定
//   3. 保留间隔         (1000 ms)          显示注视点（注视点全程固定显示，不消失）
//   4. 测试阵列         (无时间限制)        显示注视点
//
// Block 规则：
//   9 个 block，每 block 50 trial；block 间强制休息至少 30 秒（含倒计时），
//   倒计时结束后显示「您可以继续休息或按【SPACE】开始下一组实验」，按 SPACE 进入下一组
//   不设「低正确率自动结束」：无论正确率高低，实验都完整跑完 9 个 block
//   低正确率只做标记（详见下方「低正确率标记」段）
//
// 调试模式（被试信息四个输入框全部填 1，隐藏触发）：
//   正式实验只运行 1 个 block、5 个 trial；练习仍为 15 trial，跳过 block 间休息
//   被试编号与随机种子固定为 1111，导出文件名固定为 exp1_clt_1111.xlsx
//
// 低正确率标记（导出文件名前加 F，不改变实验流程）：
//   判定条件：set size = 3 或 4 时，「呈现时长 ≥ 200 ms」试次的正确率低于 50%
//   （set size 3 和 4 分别计算，任一低于 50% 即触发；set size = 6 不参与判定）
//   触发的条件行会在 K 值表中以「LowAccRed = 1」标记（标红功能受 XLSX 版本所限，见下）
//
// 导出（Excel，3 个 sheet，调试模式与正式实验规则完全一致）：
//   文件名：实验名称_被试编号（exp1_clt_编号）；
//           存在低正确率条件时在最前面加 F（如 Fexp1_clt_0112345678.xlsx）；
//           调试模式不加 F（实验名称仍为 exp1_clt）
//   Sheet1「Trial Data」：全部 trial，按实验实际发生顺序排列
//                        （含计划呈现时长 studyDuration 与实测值 studyDurationActual）
//   Sheet2「K Values」：按「set size × 呈现时长」拆分的 15 个条件各一行，
//                      给出正确率、正确试次平均反应时与容量 K；
//                      末尾再附每个 set size 的汇总行（StudyDuration 记为「汇总」）；
//                      低正确率条件行以 LowAccRed = 1 标记（标红受 XLSX 版本限制）
//   Sheet3「Grouped Trials」：列与 Sheet1 相同，但按「呈现时长 → set size」分组重排，
//                            同一条件的试次在表中连续排列，便于逐条件核对原始数据
//   K = (Acc * N^2 - N) / (N - 1)
//
// 标红能力说明：
//   当前 vendor 内嵌的 SheetJS 0.18.5 不支持单元格样式写入，
//   K 值表用「LowAccRed」列记录判定结果（1 = 应标红），将来升级 XLSX 或
//   改用 ExcelJS 后 markKRowsRed() 会自动生效，调用方无需改动。
//
// 颜色规则（每个试次由 buildProbePlan 一次算好并冻结，drawPlanSquares 只按计划绘制）：
//   记忆阵列：从 9 色调色板中不重复地随机取 setSize 个颜色
//   探测阵列：复制记忆阵列颜色，只替换「变化方块」一个 → 有且只有一个色块变色
//   新颜色  ：只能从「记忆阵列中没出现过的颜色」里挑（严格排除，无兜底放宽）
//   计划生成后立即自检 verifyProbePlan()，违反则 console.error 报警（probePlanViolations）
//   探测阵列直接使用记忆阵列那一份 plan，不会因重入/并发读到别的试次的数据
//
// 鼠标反应：只用鼠标左键直接点击探测阵列中的色块
//   只有左键点击落在色块范围内才算作反应。
//   实验画布仍禁用右键菜单，仅用于防止菜单遮挡刺激，与作答无关。
//
// 变化颜色规则：
//   被选方块变为一个未在阵列中出现过的新颜色。
// ============================================================

// 实验名称：仅用于导出 Excel 的文件名前缀（exp1_clt_被试编号.xlsx）
// 改名只需改这一处，文件名与结束页的手动下载链接会同步生效
const EXPERIMENT_NAME = 'exp1_clt';

// 运行版本标记（与 exp1_clt.html 中 exp1_clt.js?v= 保持一致）：
// 用于确认浏览器实际加载的是最新代码，而非缓存里的旧版本
const EXP1_CLT_BUILD = '20261011mj1';
console.log('[exp1_clt] build ' + EXP1_CLT_BUILD + ' loaded');

// 在设置页显示当前 build（确认浏览器加载的是最新代码，而非缓存中的旧版）
(function showBuildTag() {
    const tag = document.getElementById('build-tag');
    if (tag) tag.innerText = 'exp1_clt.js build ' + EXP1_CLT_BUILD;
})();

// 版本自检：页面（exp1_clt.html）与脚本（exp1_clt.js）版本号必须一致。
// 不一致说明浏览器缓存了旧的 exp1_clt.js（实验会跑出旧规则、旧导出文件名），
// 在设置页直接给出告警，避免又用旧代码跑一整轮实验。
(function checkBuildMatch() {
    const pageBuild = window.EXP1_CLT_PAGE_BUILD;
    if (pageBuild && pageBuild !== EXP1_CLT_BUILD) {
        console.warn('[exp1_clt] 版本不一致：页面 ' + pageBuild + ' / 脚本 ' + EXP1_CLT_BUILD +
            ' —— 浏览器可能缓存了旧 exp1_clt.js，请 Ctrl+F5 强制刷新');
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

// --- 断点续做：PRNG 基准与续做状态（2026-10-10，与 exp1_fcdt 结构一致）---
// buildFormalTrials 每次都先把 PRNG 重置回正式试次基准起点，
// 这样无论是否跳过练习，450 试次的顺序都完全一致。
let formalPrngBaseSeed = 0;
let isResumedSession = false;
let resumedFromBlock = 0;   // 0 = 非续做；N = 从第 N 组（block）续做
let resumeCount = 0;        // 本被试累计续做次数（第 1 次续做 = 1）
// 续做起点：若检测到上次未完成的进度，从第 N 组（block）继续；首次（或重新开始）为 1。
let resumeStartBlock = 1;
let currentNItems = 4; // 当前试次的 set size，用于鼠标命中范围判断
let lowAccBlockCount = 0;        // 正确率低于 50% 的 block 累计数（只统计，不终止实验）
// 低正确率标记：set size = 4 的平均正确率低于 50% 时为 true，导出文件名最前面加 F。
// 注意：实验本身不再因低正确率提前结束，永远跑完 9 个 block。
let ss4LowAccuracyFlag = false;  // 实际语义：低正确率标记（SS3/SS4 在 ≥200ms 正确率 < 50%）
let lowAccDetail = { triggered: false, details: [] };  // 各 set size 的判定明细，供 K 值表标红使用

// --- 实验参数（对应 CLT.m getPreferences） ---
const prefs = {
    setSizes: [3, 4, 6],
    studyDurations: [50, 200, 500, 1000, 2000],
    numBlocks: 9,
    numTrials: 50,
    nEachCondition: 30,      // 每个 set size × 呈现时长组合 30 trial
    nPractice: 15,          // 练习 15 trial，3 种 set size 各 5 trial
    ITI: 500,               // ms
    retentionInterval: 1000,// ms
    stimSize: 51,
    minDist: 51 * 2.5,
    fixationSize: 8,
    breakLength: 0.5,
    labelFontSize: 18
};

// 调试模式只缩短实际运行的正式实验；prefs 始终保留完整科研设计参数，便于自检。
let runtimeNumBlocks = prefs.numBlocks;
let runtimeNumTrials = prefs.numTrials;
let runtimeBreakLength = prefs.breakLength;

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
// 调试模式复选框监听：勾选时自动填充默认调试信息
const debugModeCheckbox = document.getElementById('debugMode');
if (debugModeCheckbox) {
    debugModeCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            const nameEl = document.getElementById('subName');
            const genderEl = document.getElementById('subGender');
            const ageEl = document.getElementById('subAge');
            if (nameEl) nameEl.value = '1';
            if (genderEl) genderEl.value = '女';
            if (ageEl) ageEl.value = '1';
            realIdCard = '111111111111111111';
            if (idCardInput) idCardInput.value = '1111********111111';
            if (phoneInput) phoneInput.value = '11111111111';
            if (subjectIDInput) subjectIDInput.value = '1111';
        }
    });
}

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

// 实验日期（YYYYMMDD），随数据一起保存；不再用于导出文件名
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
        console.warn('[exp1_clt] 被试编号无法按规则生成（身份证号需 ≥6 位、手机号需 ≥4 位），' +
            '已退回时间戳：' + p.subjectID);
    }
    // 随机种子：用字符串编号派生（Number 转换仅用于 PRNG 内部，不影响编号本身）
    const seedNum = Number(p.subjectID);
    p.rndSeed = Number.isFinite(seedNum) ? seedNum : Date.now();
    p.saveLocal = true; // 保存到本地始终开启（复选框已隐藏，网页端数据库 + 本地均保存）
    p.expDate = formatDateYYYYMMDD(new Date()); // 实验日期（随数据保存，不参与文件名）

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
    const checkDebugBox = document.getElementById('debugMode') ? document.getElementById('debugMode').checked : false;
    p.debugMode = checkDebugBox || (isAllOnes(p.subName) && isAllOnes(p.subAge)
        && isAllOnes(p.subIdCard) && isAllOnes(p.subPhone));
    if (p.debugMode) {
        console.log('[exp1_clt] 调试模式已触发（姓名/年龄/身份证号/手机号 全为 1）');
    } else {
        console.log(`[exp1_clt] 正式模式（姓名="${p.subName}" 年龄="${p.subAge}" ` +
            `身份证号长度=${String(p.subIdCard || '').length} 手机号="${p.subPhone}"）`);
    }

    // 调试模式：练习仍使用完整的 15 个试次；正式实验缩短为 1 个 block × 5 trial，
    // 并跳过 block 间休息。prefs 保留完整设计参数，避免调试设置干扰正式试次生成自检；
    // 被试编号与随机种子一并固定为 1111（导出文件名为 exp1_clt_1111.xlsx），便于识别与复现。
    runtimeNumBlocks = prefs.numBlocks;
    runtimeNumTrials = prefs.numTrials;
    runtimeBreakLength = prefs.breakLength;
    if (p.debugMode) {
        runtimeNumBlocks = 1;
        runtimeNumTrials = 5;
        runtimeBreakLength = 0;
        p.subjectID = '1111';
        p.rndSeed = 1111;
        subjectIDInput.value = '1111'; // 设置页同步显示，与导出文件名中的被试编号一致
    }

    seedRandom(p.rndSeed);

    // 正式试次序列使用专属 PRNG 种子，与练习阶段完全解耦（与 exp1_fcdt 一致）：
    // 无论练习是否执行 / 跳过，buildFormalTrials 输出的试次顺序恒定，
    // 续做时跳过练习直接从第 N 组继续，被试看到的 450 试次序列与首次完全一致。
    formalPrngBaseSeed = p.rndSeed + 7919;

    try {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
    } catch (err) { console.log("Fullscreen denied."); }

    try {
        if (!storage) throw new Error('Storage adapter is unavailable');
        // experiment 决定 Batch Session 的进度键名（exp1_clt:<workerId>），
        // 必须传，否则续做会退化成所有实验共用一个键
        await storage.initializeStorage({
            participant: { ...p }, build: EXP1_CLT_BUILD, experiment: EXPERIMENT_NAME
        });
    } catch (err) {
        console.error('[CLT storage] initialization failed:', err);
        if (storage && storage.backendName === 'jatos') {
            showSetupError('JATOS 初始化失败，实验尚未开始。请联系实验管理员。');
            return;
        }
    }

    switchScreen('instructions');
    experimentPhase = 'instructions';

    // 检查是否有可续做的进度（仅 JATOS Batch Session 后端提供；其它后端返回 null，
    // 等价于"从头开始"，不影响正常流程）。续做从上次完成后的下一组继续，
    // 试次序列因 PRNG 基准固定而与首次完全一致。
    // 归属校验（这条进度是否属于当前被试）已在存储层完成：不属于、或无法校验时返回 null。
    let resumable = null;
    try {
        resumable = await storage.loadProgress();
    } catch (err) {
        console.warn('[' + EXPERIMENT_NAME + '] 读取续做进度失败，将从头开始：', err);
    }
    if (resumable && resumable.completedBlocks > 0 && resumable.completedBlocks < runtimeNumBlocks) {
        resumeStartBlock = resumable.completedBlocks + 1;
        isResumedSession = true;
        resumedFromBlock = resumeStartBlock;
        // 本次续做计入累计次数：进度里记的是"此前续做过几次"，本次 +1 后再随进度
        // 写回；导出时该被试的每一行都带同一数值（一次做完的被试为 0）
        resumeCount = (resumable.resumeCount || 0) + 1;
        console.log('[' + EXPERIMENT_NAME + '] 检测到未完成的进度（已完成 ' +
            resumable.completedBlocks + ' 组），将从第 ' + resumeStartBlock + ' 组续做。');
    }

    // 检测到可续做进度时，显示"继续 / 重新开始"选择条；否则隐藏。
    const resumeNotice = document.getElementById('resume-notice');
    if (resumeNotice) {
        if (resumeStartBlock > 1) resumeNotice.classList.remove('hidden');
        else resumeNotice.classList.add('hidden');
    }
    const btnResume = document.getElementById('btn-resume');
    if (btnResume) btnResume.addEventListener('click', () => {
        resumeNotice.classList.add('hidden');
        // 保持 resumeStartBlock 不变，指导语读完后 SPACE 键按续做起点分流
    });
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.addEventListener('click', () => {
        resumeStartBlock = 1;
        isResumedSession = false;
        resumedFromBlock = 0;
        resumeCount = 0;
        if (storage) storage.clearProgress();
        resumeNotice.classList.add('hidden');
        console.log('[' + EXPERIMENT_NAME + '] 被试选择从头重新开始，已清除线上进度。');
    });
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
        // 续做（resumeStartBlock > 1）：被试已在首次做过练习，跳过直接进正式；
        // 否则正常走练习 → 正式流程。
        if (resumeStartBlock > 1) startFormal();
        else startPractice();
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

// ============================================================
//  防误触层（guard rails）
//  目的：避免被试或浏览器在实验进行中触发以下操作导致实验中断 / 数据丢失：
//   1) 浏览器刷新、关闭、离开（beforeunload）
//   2) 浏览器后退 / 前进（Backspace、Alt+← / Alt+→、popstate）
//   3) 快捷键被劫持（F5 / Ctrl+R / Ctrl+W / Ctrl+T / F12 / DevTools）
//   4) Esc 退出全屏（屏蔽 Esc）
//   5) 鼠标长按 → 系统右键菜单 / 拖拽（mousedown 持续触发、dragstart、selectstart）
//   6) 触屏 / 滚轮 / 缩放（touchstart、wheel、gesturestart）
//   7) 页面失焦 / 切到后台（visibilitychange 给出告警但不清空数据）
//   8) 页面被 resize（仅在 #experiment-phase 锁住尺寸，避免破坏注视点位置）
//  实验进行中：仅按每个阶段规定的"有效键"（SPACE / 鼠标左键）才生效；
//  其他任何键 / 鼠标 / 触屏 / 系统事件一律被静默 preventDefault，实验流程不受影响。
// ============================================================

// 每个阶段被允许的键盘按键集合（其他键一律屏蔽）
const ALLOWED_KEYS = new Set([' ', 'Space', 'Spacebar']);

// 实验中需要拦截的系统级组合键（不拦截时浏览器会触发默认行为）
const BLOCKED_SHORTCUTS = new Set([
    'F5', 'F12',                                                  // 刷新 / 开发者工具
    'F1', 'F2', 'F3', 'F4', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11' // 其他功能键
]);
function isBlockedShortcut(e) {
    if (BLOCKED_SHORTCUTS.has(e.key)) return true;
    if (e.ctrlKey || e.metaKey) {
        // 拦截 Ctrl/Cmd + R / W / T / N / P / F / S / Shift+Delete 等
        if (/^[rwnpfst]$/i.test(e.key)) return true;
        if (e.key === 'F4' && e.altKey) return true;   // Alt+F4 关窗
    }
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Backspace')) {
        return true;                                       // Alt+←/→ 浏览器后退 / 前进
    }
    return false;
}

// (1) 全局 keydown 第二层：仅放行 ALLOWED_KEYS，其余静默屏蔽
window.addEventListener('keydown', (e) => {
    if (e.repeat) return;                                 // 防止长按重复触发

    // 关键例外：焦点落在输入框 / 下拉框里时（setup 阶段填姓名 / 性别 / 年龄 /
    // 身份证 / 手机号），防误触层必须放行普通按键——在 capture 阶段对 keydown
    // 调用 preventDefault() 会阻止字符被插入输入框，被试将一个字都打不进去。
    const inFormField = (e.target instanceof HTMLInputElement)
        || (e.target instanceof HTMLTextAreaElement)
        || (e.target instanceof HTMLSelectElement);

    if (isBlockedShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    if (inFormField) return;                               // 表单输入：放行所有普通按键
    if (e.key === 'Escape') {                              // 屏蔽 Esc 退出全屏
        e.preventDefault();
        return;
    }
    if (e.key === 'Backspace' && !(e.target instanceof HTMLInputElement)) {
        // Backspace 在非输入框下被浏览器解读为"后退" → 屏蔽
        e.preventDefault();
        return;
    }
    // 其他所有非放行键：静默屏蔽
    if (!ALLOWED_KEYS.has(e.key) && !ALLOWED_KEYS.has(e.code) && e.key !== 'Tab') {
        e.preventDefault();
    }
}, true);                                                  // capture 阶段优先

// (2) 屏蔽所有元素的右键菜单（不仅 canvas）
//     实验阶段 canvas 上的右键必须屏蔽（菜单会遮挡刺激、干扰作答）；
//     但 setup 阶段表单里的右键菜单保留（便于粘贴身份证号 / 手机号），
//     文本输入框的右键菜单里没有任何导航项，不会导致实验中断。
window.addEventListener('contextmenu', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
    e.preventDefault();
});

// (3) 屏蔽拖拽 / 选中 / 复制（避免误选文字拖出浏览器）
window.addEventListener('dragstart', (e) => e.preventDefault());
window.addEventListener('selectstart', (e) => {
    // 允许在 setup 阶段（输入框）选中文字；其他阶段屏蔽
    const phase = experimentPhase;
    if (phase !== 'setup' && phase !== 'instructions') {
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
        }
    }
});
window.addEventListener('copy', (e) => {
    if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
    }
});

// (4) 屏蔽滚轮 / 触屏手势（避免页面缩放 / 滚动 / 系统菜单）
window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) e.preventDefault();                    // Ctrl+滚轮 = 缩放
}, { passive: false });
window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();         // 多指 = 缩放手势
}, { passive: false });
window.addEventListener('gesturestart', (e) => e.preventDefault());

// (5) 屏蔽全屏切换 / 重新加载（beforeunload）：实验进行中给出离开提示
window.addEventListener('beforeunload', (e) => {
    const phase = experimentPhase;
    if (phase === 'setup' || phase === 'finished') return;  // 未开始 / 已结束：允许直接离开
    e.preventDefault();
    e.returnValue = '实验正在进行中，关闭或刷新页面将导致数据丢失。确定要离开吗？';
    return e.returnValue;
});

// (6) 页面失焦 / 切到后台：给出告警，但**不**清空数据、不终止试次
let visibilityWarned = false;
document.addEventListener('visibilitychange', () => {
    if (document.hidden && !visibilityWarned) {
        visibilityWarned = true;
        console.warn('[' + EXPERIMENT_NAME + '] 页面失焦：被试切到其他窗口 / 标签页。');
    } else if (!document.hidden) {
        visibilityWarned = false;
    }
});
window.addEventListener('blur', () => {
    if (experimentPhase === 'trial_response' || experimentPhase === 'practice_response') {
        console.warn('[' + EXPERIMENT_NAME + '] 实验进行中窗口失焦，请保持页面在前台。');
    }
});

// (7) popstate（浏览器后退 / 前进）：压入 dummy 历史项并屏蔽后退
history.pushState({ phase: 'experiment' }, '');
window.addEventListener('popstate', () => {
    const phase = experimentPhase;
    if (phase !== 'setup' && phase !== 'finished') {
        // 实验进行中：阻止后退，立即推回一项
        history.pushState({ phase: 'experiment' }, '');
        console.warn('[' + EXPERIMENT_NAME + '] 浏览器后退被屏蔽（实验进行中）。');
    }
});

// (8) 屏蔽浏览器对鼠标的默认处理（防止长按出系统菜单、拖拽光标、指针变化）。
//     mousedown 一次按下只触发一次，浏览器在按住期间不会自动 repeat mousedown；
//     右键菜单已由 (2) contextmenu preventDefault 屏蔽；
//     这里额外阻止 mousedown 的默认光标变化 / 文本选中，并屏蔽 canvas dragstart。
canvas.addEventListener('mousedown', (e) => {
    // 在所有阶段都阻止默认行为（除 setup 阶段输入框，但 canvas 不在输入框里）
    e.preventDefault();
}, true);
canvas.addEventListener('dragstart', (e) => e.preventDefault());
canvas.addEventListener('drag', (e) => e.preventDefault());

// 与作答无关，仅为防止浏览器右键菜单遮挡刺激。
// （已由上面的 (2) 全局 contextmenu 屏蔽；这里保留 canvas 上的显式监听便于阅读）

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
    if (e.button !== 0) return;
    e.preventDefault();

    const itemIdx = clickedItemIndex(e);
    if (itemIdx < 0) return;

    // response/correctResponse 沿用旧版标签槽编号，确保既有数据结构兼容；
    // 实际选择的是 itemIdx 对应的色块，导出时再转换为 1 起始的色块序号。
    const mappedSlot = labelMap.indexOf(itemIdx);
    const responseNum = mappedSlot >= 0 ? mappedSlot + 1 : itemIdx + 1;

    if (phase === 'practice_response') recordPracticeResponse(responseNum);
    else recordResponse(responseNum);
});

// ============================================================
//  练习阶段（15 trial，3 种 set size × 5，呈现时长逐试次随机，全部 change）
// ============================================================
let practiceTrials = [];
let practiceTrialIdx = 0;
let practiceAcc = [];

function startPractice() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const nPerSzPractice = prefs.nPractice / prefs.setSizes.length;
    practiceTrials = [];
    for (let ss of prefs.setSizes) {
        for (let i = 0; i < nPerSzPractice; i++) {
            const durationIdx = randInt(0, prefs.studyDurations.length - 1);
            practiceTrials.push({
                setSize: ss,
                studyDuration: prefs.studyDurations[durationIdx],
                change: 1
            }); // CLT 全部 change
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
        console.error('[exp1_clt] 探测阵列自检未通过（不应发生）：', {
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
        block: 0,
        trial: practiceTrialIdx + 1,
        setSize: condition.setSize,
        studyDuration: condition.studyDuration,
        isChange: 1
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
    const studyStartTime = performance.now();
    await wait(condition.studyDuration);
    practiceTrialData.studyDurationActual = (performance.now() - studyStartTime).toFixed(2);

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
    canvas.style.cursor = 'default';
    responseStartTime = performance.now();
}

function recordPracticeResponse(responseNum) {
    // 立即锁定反应阶段：防止鼠标连击在同一试次内触发第二次响应
    if (experimentPhase !== 'practice_response') return;
    experimentPhase = 'practice_locked';
    canvas.style.cursor = 'default';

    let rt = (performance.now() - responseStartTime) / 1000;
    practiceTrialData.rt = rt;
    practiceTrialData.response = responseNum;          // 兼容旧数据的标签槽编号（1..nItems）
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
// 生成完整正式试次序列：15 种条件各 30 次，整体只洗牌一次。
// 关键不变量（与 exp1_fcdt 一致）：函数开头把 PRNG 重置回 formalPrngBaseSeed，
// 因此"跳过练习直接续做"与"正常做完练习再进正式"得到的 450 试次序列完全相同。
// 若正式基准起点尚未捕获（formalPrngBaseSeed 为 0），退回用 p.rndSeed 作为起点；
// p.rndSeed 未设置时（如测试沙箱直接调用 buildFormalTrials）再用 Date.now() 兜底，
// 避免 seedRandom(undefined) 污染 PRNG 状态导致 shuffle 无位移。
function buildFormalTrials() {
    const baseSeed = formalPrngBaseSeed !== 0 ? formalPrngBaseSeed : (p.rndSeed || Date.now());
    seedRandom(baseSeed);
    const trials = [];
    for (let ss of prefs.setSizes) {
        for (let duration of prefs.studyDurations) {
            for (let i = 0; i < prefs.nEachCondition; i++) {
                trials.push({ setSize: ss, studyDuration: duration, change: 1 });
            }
        }
    }
    shuffleArray(trials);
    return trials;
}

// 生成后自检：总数、各条件计数和按 50 个切分的 block 结构都必须符合设计。
function verifyFormalTrials(trials) {
    const expectedTotal = prefs.setSizes.length * prefs.studyDurations.length * prefs.nEachCondition;
    const conditionCounts = new Map();
    for (let trial of trials) {
        const key = trial.setSize + '|' + trial.studyDuration;
        conditionCounts.set(key, (conditionCounts.get(key) || 0) + 1);
    }

    let conditionsValid = true;
    for (let ss of prefs.setSizes) {
        for (let duration of prefs.studyDurations) {
            const key = ss + '|' + duration;
            if (conditionCounts.get(key) !== prefs.nEachCondition) conditionsValid = false;
        }
    }

    const blocks = [];
    for (let start = 0; start < trials.length; start += prefs.numTrials) {
        blocks.push(trials.slice(start, start + prefs.numTrials));
    }
    const blocksValid = blocks.length === prefs.numBlocks &&
        blocks.every(block => block.length === prefs.numTrials);
    const valid = trials.length === expectedTotal && conditionsValid && blocksValid;

    if (!valid) {
        console.error('[exp1_clt] 正式试次生成自检未通过（不应发生）：', {
            total: trials.length,
            expectedTotal: expectedTotal,
            conditionCounts: Object.fromEntries(conditionCounts),
            blockSizes: blocks.map(block => block.length),
            expectedBlocks: prefs.numBlocks,
            expectedTrialsPerBlock: prefs.numTrials
        });
    } else {
        console.log('[exp1_clt] 正式试次生成自检通过：15 种条件各 30 次，共 450 次，9 个 block × 50 次');
    }
    return valid;
}

function startFormal() {
    allFormalTrials = buildFormalTrials();
    verifyFormalTrials(allFormalTrials);

    // 续做：跳过练习、从上次完成后的下一组开始；否则正常从第 1 组开始。
    currentBlock = Math.min(resumeStartBlock, runtimeNumBlocks);
    if (currentBlock > 1) {
        console.log('[' + EXPERIMENT_NAME + '] 从第 ' + currentBlock + ' 组续做（上次已完成 ' + (currentBlock - 1) + ' 组）');
    }
    startBlock();
}

let allFormalTrials = [];
let formalTrialGlobalIdx = 0;

function startBlock() {
    blockTrials = allFormalTrials.slice(
        (currentBlock - 1) * runtimeNumTrials,
        currentBlock * runtimeNumTrials
    );
    currentTrial = 0;
    formalTrialGlobalIdx = (currentBlock - 1) * runtimeNumTrials;

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
        studyDuration: condition.studyDuration,
        isChange: 1,
        experimentType: EXPERIMENT_NAME
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
    const studyStartTime = performance.now();
    await wait(condition.studyDuration);
    trialData.studyDurationActual = (performance.now() - studyStartTime).toFixed(2);

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
    canvas.style.cursor = 'default';
    responseStartTime = performance.now();
}

function recordResponse(responseNum) {
    // 立即锁定反应阶段：防止鼠标连击在同一试次内触发第二次响应
    if (experimentPhase !== 'trial_response') return;
    experimentPhase = 'trial_locked';
    canvas.style.cursor = 'default';

    let rt = (performance.now() - responseStartTime) / 1000;
    trialData.rt = rt;
    trialData.response = responseNum;                  // 兼容旧数据的标签槽编号（1..nItems）
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

// 低正确率判定（决定文件名是否加 F，也在 K 值表中标红对应行）：
// 对 set size = 3 和 4 分别统计「呈现时长 ≥ 200 ms」试次的正确率，
// 任一个低于 50% 即触发；set size = 6 不参与判定。
// 返回 { triggered, details: [{ setSize, accuracyPct, low, nTotal }] }；
// 数据不足时 triggered 为 false（details 中 nTotal 记 0），调用方据此不触发
const LOW_ACC_MIN_DURATION_MS = 200;   // 低正确率判定只看呈现时长 ≥ 200 ms 的试次
const LOW_ACC_MIN_SET_SIZE = 4;        // 判定只覆盖 set size 3 和 4（不超过 4）
const LOW_ACC_THRESHOLD_PCT = 50;      // 正确率低于 50% 触发

function computeLowAccuracyFlag() {
    const details = [];
    for (const ss of [3, 4]) {
        const rows = stimData.filter(
            d => d.setSize === ss && Number(d.studyDuration) >= LOW_ACC_MIN_DURATION_MS
        );
        const n = rows.length;
        const accPct = n > 0 ? rows.reduce((s, d) => s + d.accuracy, 0) / n * 100 : 0;
        details.push({
            setSize: ss,
            accuracyPct: n > 0 ? accPct : null,
            nTotal: n,
            low: n > 0 ? accPct < LOW_ACC_THRESHOLD_PCT : false
        });
    }
    return { triggered: details.some(d => d.low), details: details };
}

function endBlock() {
    const blockAcc = blockAccuracyPct(currentBlock);

    // 只统计正确率低于 50% 的 block 数量（写入结果表备查）。
    // 已取消「累计 2 个 block 低于 50% 自动结束实验」的规则：
    // 无论正确率高低，实验都完整跑完预定 block，低正确率只在导出文件名上加 F。
    if (blockAcc < 50) lowAccBlockCount++;

    if (storage) {
        storage.saveCheckpoint({
            subjectID: p.subjectID,
            block: currentBlock,
            blockAccuracy: blockAcc,
            completedTrials: stimData.length,
            nextBlock: currentBlock < runtimeNumBlocks ? currentBlock + 1 : null
        }).catch(error => {
            console.error('[CLT storage] checkpoint save failed:', error);
        });

        // 线上暂存：每完成一个 block 把进度写进 JATOS Batch Session（仅 JATOS 后端实现）。
        // 只存"完成到第几组"；身份哈希由存储层自己注入，这里不传任何个人信息。
        if (currentBlock < runtimeNumBlocks) {
            storage.saveProgress({
                completedBlocks: currentBlock,
                resumeCount: isResumedSession ? resumeCount : 0,
                updatedAt: new Date().toISOString()
            });
        }
    }

    if (currentBlock < runtimeNumBlocks) {
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
    let timeLeft = Math.max(BREAK_MIN_SECONDS, Math.round(runtimeBreakLength * 60));

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
        rndSeed: p.rndSeed,
        // 断点续做标记（append-only，不改现有字段语义；与 exp1_fcdt 一致）：
        //   resumedFromBlock = 本次从第几组续做（0 表示非续做，从头开始）
        //   resumeCount      = 该被试历史上第几次续做（未续做 = 0，第 1 次续做 = 1）
        resumedFromBlock: isResumedSession ? resumedFromBlock : 0,
        resumeCount: isResumedSession ? resumeCount : 0
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
            // 实验正常完成：清掉 Batch Session 里的进度，避免下次误判为"上次没做完"
            await storage.clearProgress();
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
            console.error('[exp1_clt] 本地导出失败:', e);
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

// ============================================================
//  给 K 值表的「低正确率条件行」标红
//  逐单元格写 style（font color: #C00000 深红），避免整行高亮被
//  部分查看器误判为「整行脏数据」。
//
//  当前 vendor 内嵌的 SheetJS 0.18.5 不支持单元格样式写入，
//  此函数在 0.18.5 下是 no-op（函数开头的 canStyle 检查会直接 return）。
//  K 值表里仍写有「LowAccRed」列记录判定结果（1 = 应标红），
//  将来升级 XLSX 到 0.19+ 或改用 ExcelJS 时本函数会自动生效，
//  调用方（downloadXLSX 内的一行调用）无需改动。
// ============================================================
function markKRowsRed(sheet) {
    // 0.18.5 没有样式能力：不写 cell.s，避免污染数据
    const canStyle = false; // XLSX.utils.sheetStyles 在 0.18.5 下 undefined
    if (!canStyle) return;

    const range = XLSX.utils.decode_range(sheet['!ref']);
    // 找 LowAccRed 列与 K 列的相对索引
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: c })];
        headers[c] = cell && cell.v !== undefined ? String(cell.v) : '';
    }
    const redCol = headers.indexOf('LowAccRed');
    const kCol = headers.indexOf('K');
    if (redCol === -1) return;

    for (let r = 1; r <= range.e.r; r++) {
        const flagCell = sheet[XLSX.utils.encode_cell({ r: r, c: redCol })];
        const isLow = flagCell && Number(flagCell.v) === 1;
        if (!isLow) continue;
        // K 值为负的条件行排除（避免把 50ms 拉低正确率导致的负 K 误判为「低正确率」）
        if (kCol !== -1) {
            const kCell = sheet[XLSX.utils.encode_cell({ r: r, c: kCol })];
            if (kCell && Number(kCell.v) < 0) continue;
        }
        // 整行标红
        for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r: r, c: c });
            if (sheet[addr] && sheet[addr].t !== 'z') {
                sheet[addr].s = { font: { color: { rgb: 'C00000' } } };
            }
        }
    }
}

// ============================================================
//  统计一组试次的结果行：总数 / 正确数 / 正确率 / 正确试次平均反应时 / 容量 K
//  durationLabel：该组对应的呈现时长（ms）；传「汇总」表示跨全部时长
//  K = (Acc * N^2 - N) / (N - 1)，Acc 为 0–1 小数
// ============================================================
function buildKRow(ss, durationLabel, rows) {
    const nTotal = rows.length;
    const nCorrect = rows.filter(d => d.accuracy === 1).length;
    const acc = nTotal > 0 ? nCorrect / nTotal : 0;

    const correctRTs = rows.filter(d => d.accuracy === 1 && typeof d.rt === 'number').map(d => d.rt);
    const rtMean = correctRTs.length > 0
        ? correctRTs.reduce((s, v) => s + v, 0) / correctRTs.length
        : '';

    const N = ss;
    const K = N > 1 ? (acc * N * N - N) / (N - 1) : '';

    // 低正确率标红：仅针对「set size ≤ 4 且 呈现时长 ≥ 200 ms」的明细条件行，
    // 且该 set size 在低正确率判定中确实触发了（≥200ms 试次正确率 < 50%）。
    // 汇总行（durationLabel === '汇总'）与 K 为负的条件行都不标红，避免把时长效应混入。
    const isDetailRow = durationLabel !== '汇总' && Number(durationLabel) >= LOW_ACC_MIN_DURATION_MS;
    const setSizeInRule = ss <= LOW_ACC_MIN_SET_SIZE;
    const ssDetail = lowAccDetail.details.find(d => d.setSize === ss);
    const lowAccRed = !!(isDetailRow && setSizeInRule && ssDetail && ssDetail.low && ss4LowAccuracyFlag);

    return {
        SubjectID: p.subjectID,
        ExperimentType: EXPERIMENT_NAME,
        SetSize: ss,
        StudyDuration: durationLabel,
        TotalTrials: nTotal,
        CorrectTrials: nCorrect,
        Accuracy: acc.toFixed(4),
        MeanRT: rtMean === '' ? '' : rtMean.toFixed(4),
        K: typeof K === 'number' ? K.toFixed(4) : '',
        LowAccFlag: ss4LowAccuracyFlag ? 1 : 0,
        LowAccRed: lowAccRed ? 1 : 0,
        LowAccBlockCount: lowAccBlockCount
    };
}

// ============================================================
//  按「呈现时长 × set size」分组重排试次
//  分组顺序：呈现时长升序 → set size 升序；组内保持原始实验顺序（不再排序）
//  行首附加 GroupIndex（分组序号，1 起）与 GroupLabel（如 50ms-SS3）两列
//  末尾兜底追加无法归类的行，确保不丢数据
// ============================================================
function groupTrialsByCondition(rows) {
    const durations = prefs.studyDurations.slice().sort((a, b) => a - b);
    const setSizes = prefs.setSizes.slice().sort((a, b) => a - b);

    const grouped = [];
    const placed = new Set();
    let groupIndex = 0;

    for (const duration of durations) {
        for (const ss of setSizes) {
            groupIndex++;
            const groupLabel = duration + 'ms-SS' + ss;
            for (const d of rows) {
                // 用 Number() 比较：字段恒为数字，但避免个别行被写成字符串时漏掉
                if (Number(d.studyDuration) === duration && Number(d.setSize) === ss) {
                    grouped.push(Object.assign({ GroupIndex: groupIndex, GroupLabel: groupLabel }, d));
                    placed.add(d);
                }
            }
        }
    }

    // 兜底：条件无法归类的行（正常不应发生）追加在末尾，避免静默丢数据
    for (const d of rows) {
        if (!placed.has(d)) {
            grouped.push(Object.assign({ GroupIndex: 0, GroupLabel: '未归类' }, d));
        }
    }
    return grouped;
}

function downloadXLSX() {
    // 计算低正确率标记（SS3/SS4 在 ≥200ms 正确率 < 50%）
    const lowAccResult = computeLowAccuracyFlag();
    ss4LowAccuracyFlag = lowAccResult.triggered;
    lowAccDetail = lowAccResult;

    // ============================================================
    //  Sheet 1: Trial Data（对齐 CDT 风格，包含全部试次及被试人口统计学字段）
    // ============================================================
    const trialSheet = XLSX.utils.json_to_sheet(stimData);

    // ============================================================
    //  Sheet 2: K Values（对齐 CDT 风格）
    //  呈现时长是本实验的自变量，因此不再只按 set size 汇总，
    //  而是每个 (set size × 呈现时长) 组合单独统计一行，共 15 行；
    //  末尾再补每个 set size 的跨时长汇总行，便于与旧版口径对照。
    //  CLT 公式: K = (Acc * N^2 - N) / (N - 1)
    // ============================================================
    const kData = [];
    const sortedDurations = prefs.studyDurations.slice().sort((a, b) => a - b);
    for (let ss of prefs.setSizes) {
        for (let duration of sortedDurations) {
            const rows = stimData.filter(d => d.setSize === ss && Number(d.studyDuration) === duration);
            kData.push(buildKRow(ss, duration, rows));
        }
    }
    // 每个 set size 的汇总行（跨全部呈现时长，StudyDuration 记为「汇总」）
    for (let ss of prefs.setSizes) {
        const rows = stimData.filter(d => d.setSize === ss);
        kData.push(buildKRow(ss, '汇总', rows));
    }
    const kSheet = XLSX.utils.json_to_sheet(kData);
    // 标红低正确率条件行（XLSX 0.18.5 无样式能力时为 no-op，见函数注释）
    markKRowsRed(kSheet);

    // ============================================================
    //  Sheet 3: Grouped Trials
    //  列与 Sheet1 完全相同（前面多 GroupIndex / GroupLabel 两列标识分组），
    //  但按「呈现时长 → set size」分组重排：同一条件的试次在表中连续排列，
    //  组内仍保持原始实验顺序，不做二次排序。
    // ============================================================
    const groupedSheet = XLSX.utils.json_to_sheet(groupTrialsByCondition(stimData));

    // === 生成 Excel 文件 ===
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, trialSheet, 'Trial Data');
    XLSX.utils.book_append_sheet(wb, kSheet, 'K Values');
    XLSX.utils.book_append_sheet(wb, groupedSheet, 'Grouped Trials');

    // 文件名规则：实验名称_被试编号（如 exp1_clt_0112345678.xlsx）
    // 存在低正确率条件（SS3/SS4 在 ≥200ms 正确率 < 50%）时在最前面加 F 标记；
    // 调试模式不做该判定，因此永不带 F
    const filePrefix = (!p.debugMode && ss4LowAccuracyFlag) ? 'F' : '';
    const fileName = filePrefix + EXPERIMENT_NAME + '_' + p.subjectID + '.xlsx';
    console.log(`[exp1_clt] 导出模式=${p.debugMode ? '调试' : '正式'} 被试编号=${p.subjectID} 文件名=${fileName}`);
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

    console.log(`[exp1_clt] 已导出 ${fileName}（${u8.length} 字节，${wb.SheetNames.length} 个 sheet）`);
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
    if (nItems === 3) {
        // SS3 随机空出一个象限，其余三个象限各放一个色块；沿用同一 PRNG 保证可复现。
        perQuad = [1, 1, 1, 0];
        shuffleArray(perQuad);
    } else if (nItems === 4) {
        perQuad = [1, 1, 1, 1];
    } else if (nItems === 6) {
        perQuad = quadPatterns6[randInt(0, 5)];
    } else {
        throw new Error('getStimLocs: nItems must be 3, 4, or 6, got ' + nItems);
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
