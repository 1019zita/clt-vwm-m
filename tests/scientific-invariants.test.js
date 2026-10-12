'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'exp1_clt.js'), 'utf8');

function fakeElement(id) {
    return {
        id, value: '', innerText: '', style: {},
        classList: { add() {}, remove() {} },
        addEventListener() {}, appendChild() {}, remove() {}, click() {}, reportValidity() { return true; },
        getContext() {
            return {
                fillStyle: '', font: '', textAlign: '', textBaseline: '',
                fillRect() {}, beginPath() {}, arc() {}, fill() {}, fillText() {}
            };
        }
    };
}

const elements = new Map();
const document = {
    documentElement: { requestFullscreen() {} }, fullscreenElement: null,
    getElementById(id) {
        if (!elements.has(id)) elements.set(id, fakeElement(id));
        return elements.get(id);
    },
    createElement(id) { return fakeElement(id); },
    body: { appendChild() {} }, exitFullscreen() { return Promise.resolve(); },
    addEventListener() {}   // exp1_clt.js 顶层会注册 visibilitychange，测试沙箱必须提供
};
const window = {
    document, EXP1_CLT_PAGE_BUILD: '20261011mj1', CLTStorage: null,
    innerWidth: 1280, innerHeight: 720, addEventListener() {}
};
const context = vm.createContext({
    window, document, console, performance: { now: () => 0 },
    requestAnimationFrame() {}, setTimeout() {}, clearInterval() {}, setInterval() {},
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, Blob, Math, Date, JSON, Promise, Error, Set,
    history: { pushState() {} }   // exp1_clt.js 顶层在切屏时调用 history.pushState
});
vm.runInContext(source, context, { filename: 'exp1_clt.js' });

const prefs = vm.runInContext('prefs', context);
assert.deepEqual(Array.from(prefs.setSizes), [3, 4, 6]);
assert.deepEqual(Array.from(prefs.studyDurations), [50, 200, 500, 1000, 2000]);
assert.equal(prefs.numBlocks, 9);
assert.equal(prefs.numTrials, 50);
assert.equal(prefs.nEachCondition, 30);
assert.equal(prefs.nPractice, 15);
assert.equal(prefs.ITI, 500);
assert.equal(prefs.retentionInterval, 1000);
assert.match(source, /const EXP1_CLT_BUILD = '20261011mj1';/);
assert.match(source, /const K = N > 1 \? \(acc \* N \* N - N\) \/ \(N - 1\) : '';/);
assert.match(source, /if \(e\.button !== 0\) return;/);
assert.doesNotMatch(source, /e\.button\s*===\s*2|e\.button\s*!==\s*2/);
assert.doesNotMatch(source, /['"]right['"]/);
assert.doesNotMatch(source, /responseKey/);
assert.match(source, /await wait\(condition\.studyDuration\);/);
assert.match(source, /studyDurationActual = \(performance\.now\(\) - studyStartTime\)\.toFixed\(2\);/);

vm.runInContext('canvas.width = 1280; canvas.height = 720; seedRandom(1111);', context);
let observedMinimumDistance = Infinity;
for (const setSize of [3, 4, 6]) {
    for (let i = 0; i < 500; i++) {
        const plan = vm.runInContext(`buildProbePlan(${setSize})`, context);
        assert.equal(plan.locs.length, setSize);
        assert.equal(new Set(plan.memColors).size, setSize);
        const differences = plan.memColors.map((color, index) => color !== plan.probeColors[index] ? index : -1)
            .filter(index => index >= 0);
        assert.deepEqual(Array.from(differences), [plan.changeIdx]);
        assert.ok(!plan.memColors.includes(plan.probeColors[plan.changeIdx]));
        assert.ok(plan.correctLabel >= 1 && plan.correctLabel <= setSize);

        if (setSize === 3) {
            for (let a = 0; a < plan.locs.length - 1; a++) {
                for (let b = a + 1; b < plan.locs.length; b++) {
                    const distance = Math.hypot(
                        plan.locs[a].x - plan.locs[b].x,
                        plan.locs[a].y - plan.locs[b].y
                    );
                    observedMinimumDistance = Math.min(observedMinimumDistance, distance);
                    assert.ok(
                        distance >= prefs.minDist,
                        `SS3 色块间距 ${distance.toFixed(4)} 小于最小值 ${prefs.minDist}`
                    );
                }
            }
        }
    }
}
assert.ok(Number.isFinite(observedMinimumDistance));
assert.equal(vm.runInContext('probePlanViolations', context), 0);

vm.runInContext('seedRandom(20261009);', context);
const formalTrials = vm.runInContext('buildFormalTrials()', context);
assert.equal(formalTrials.length, 450);
const conditionCounts = new Map();
for (const trial of formalTrials) {
    const key = `${trial.setSize}|${trial.studyDuration}`;
    conditionCounts.set(key, (conditionCounts.get(key) || 0) + 1);
}
for (const setSize of [3, 4, 6]) {
    for (const duration of [50, 200, 500, 1000, 2000]) {
        assert.equal(conditionCounts.get(`${setSize}|${duration}`), 30);
    }
}
const formalBlocks = [];
for (let start = 0; start < formalTrials.length; start += prefs.numTrials) {
    formalBlocks.push(formalTrials.slice(start, start + prefs.numTrials));
}
assert.equal(formalBlocks.length, 9);
assert.ok(formalBlocks.every(block => block.length === 50));
context.formalTrialsForTest = formalTrials;
assert.equal(vm.runInContext('verifyFormalTrials(formalTrialsForTest)', context), true);

// ============================================================
//  导出结构不变量（downloadXLSX 此前零覆盖，此处补最小回归保护）
//  1) 恰好 3 个 sheet：Trial Data / K Values / Grouped Trials
//  2) K Values 按「set size × 呈现时长」拆分为 15 行明细 + 3 行 set size 汇总
//  3) Grouped Trials 按「呈现时长 → set size」分组重排，组内保持原始顺序
// ============================================================
const capturedSheets = [];
const capturedSheetNames = [];
context.XLSX = {
    utils: {
        json_to_sheet(data) { capturedSheets.push(data); return {}; },
        book_new() { return { SheetNames: [] }; },
        book_append_sheet(wb, sheet, name) { wb.SheetNames.push(name); capturedSheetNames.push(name); }
    },
    write() { return new Uint8Array([0x50, 0x4B, 0, 0]); }
};

const stimData = vm.runInContext('stimData', context);
stimData.length = 0;
for (const setSize of [3, 4, 6]) {
    for (const duration of [50, 200, 500, 1000, 2000]) {
        for (let i = 0; i < 30; i++) {
            stimData.push({
                subjectID: '0112345678', setSize, studyDuration: duration,
                accuracy: i % 2, rt: 1.0, block: 1, trial: i + 1, order: i
            });
        }
    }
}
vm.runInContext("p.subjectID='0112345678'; p.expDate='20261009'; p.debugMode=false;", context);
vm.runInContext('downloadXLSX()', context);

assert.deepEqual(capturedSheetNames, ['Trial Data', 'K Values', 'Grouped Trials']);
assert.equal(capturedSheets[0].length, 450);
assert.equal(capturedSheets[2].length, 450);

const kRows = capturedSheets[1];
assert.equal(kRows.length, 18);
const kDetail = kRows.filter(row => row.StudyDuration !== '汇总');
const kSummary = kRows.filter(row => row.StudyDuration === '汇总');
assert.equal(kDetail.length, 15);
assert.equal(kSummary.length, 3);
assert.ok(kDetail.every(row => row.TotalTrials === 30));
assert.ok(kSummary.every(row => row.TotalTrials === 150));
assert.equal(new Set(kDetail.map(row => `${row.SetSize}|${row.StudyDuration}`)).size, 15);
for (const row of kRows) {
    const N = row.SetSize;
    const acc = row.TotalTrials > 0 ? row.CorrectTrials / row.TotalTrials : 0;
    const expectedK = (acc * N * N - N) / (N - 1);
    assert.ok(Math.abs(expectedK - Number(row.K)) <= 5e-5,
        `K 值不符：SS${N} ${row.StudyDuration}ms 期望 ${expectedK}，实际 ${row.K}`);
}

const groupedRows = capturedSheets[2];
const expectedOrder = [50, 200, 500, 1000, 2000].flatMap(
    duration => [3, 4, 6].map(setSize => `${duration}ms-SS${setSize}`)
);
const actualGroups = [];
for (const row of groupedRows) {
    const last = actualGroups[actualGroups.length - 1];
    if (!last || last.label !== row.GroupLabel) actualGroups.push({ label: row.GroupLabel, rows: [] });
    actualGroups[actualGroups.length - 1].rows.push(row);
}
assert.equal(actualGroups.length, 15);
assert.deepEqual(actualGroups.map(group => group.label), expectedOrder);
for (const group of actualGroups) {
    assert.equal(group.rows.length, 30);
    assert.ok(group.rows.every(row =>
        row.setSize === group.rows[0].setSize && row.studyDuration === group.rows[0].studyDuration));
    // 组内不做二次排序：仍保持原始实验顺序
    assert.ok(group.rows.every((row, i) => i === 0 || row.order > group.rows[i - 1].order));
}

// 文件名规则：实验名称_被试编号。
// 低正确率判定（新规则）：set size 3 或 4 在「呈现时长 ≥ 200ms」试次正确率 < 50% 时触发。
// stimData 的 accuracy 是 i%2（每个条件正确率恰好 50%），SS3/SS4 的 ≥200ms 部分
// 正确率都是 50%，不 < 50%，因此不触发 F，文件名应为 exp1_clt_0112345678.xlsx
assert.equal(vm.runInContext('EXPERIMENT_NAME', context), 'exp1_clt');
assert.equal(vm.runInContext('lastExport.fileName', context), 'exp1_clt_0112345678.xlsx');
// SS3/SS4 全部答错 → 各 ≥200ms 试次正确率 0% < 50%，触发 F
for (const row of stimData) {
    if (row.setSize === 3 || row.setSize === 4) row.accuracy = 0;
}
vm.runInContext('downloadXLSX()', context);
assert.equal(vm.runInContext('lastExport.fileName', context), 'Fexp1_clt_0112345678.xlsx');

console.log(`scientific-invariants.test.js: PASS（SS3 实测最小间距 ${observedMinimumDistance.toFixed(2)} px）`);
