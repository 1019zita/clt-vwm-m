'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'clt.js'), 'utf8');

function fakeElement(id) {
    return {
        id, value: '', innerText: '', style: {},
        classList: { add() {}, remove() {} },
        addEventListener() {}, appendChild() {}, remove() {}, reportValidity() { return true; },
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
    body: { appendChild() {} }, exitFullscreen() { return Promise.resolve(); }
};
const window = {
    document, CLT_PAGE_BUILD: '20260917mj1', CLTStorage: null,
    innerWidth: 1280, innerHeight: 720, addEventListener() {}
};
const context = vm.createContext({
    window, document, console, performance: { now: () => 0 },
    requestAnimationFrame() {}, setTimeout() {}, clearInterval() {}, setInterval() {},
    URL: { createObjectURL: () => 'blob:test' }, Blob, Math, Date, JSON, Promise, Error, Set
});
vm.runInContext(source, context, { filename: 'clt.js' });

const prefs = vm.runInContext('prefs', context);
assert.deepEqual(Array.from(prefs.setSizes), [4, 6]);
assert.equal(prefs.numBlocks, 4);
assert.equal(prefs.numTrials, 35);
assert.equal(prefs.nEachSS, 70);
assert.equal(prefs.nPractice, 10);
assert.equal(prefs.ITI, 500);
assert.equal(prefs.studyDuration, 250);
assert.equal(prefs.retentionInterval, 1000);
assert.match(source, /const K = N > 1 \? \(acc \* N \* N - N\) \/ \(N - 1\) : '';/);
assert.match(source, /shuffleArray\(allSS\);[\s\S]*allFormalTrials = \[\];/);
assert.match(source, /trialData\.responseKey = mouseButton;/);
assert.match(source, /e\.button === 0 \? 'left' : 'right'/);

vm.runInContext('canvas.width = 1280; canvas.height = 720; seedRandom(1111);', context);
for (const setSize of [4, 6]) {
    for (let i = 0; i < 500; i++) {
        const plan = vm.runInContext(`buildProbePlan(${setSize})`, context);
        assert.equal(new Set(plan.memColors).size, setSize);
        const differences = plan.memColors.map((color, index) => color !== plan.probeColors[index] ? index : -1)
            .filter(index => index >= 0);
        assert.deepEqual(Array.from(differences), [plan.changeIdx]);
        assert.ok(!plan.memColors.includes(plan.probeColors[plan.changeIdx]));
        assert.ok(plan.correctLabel >= 1 && plan.correctLabel <= setSize);
    }
}
assert.equal(vm.runInContext('probePlanViolations', context), 0);
console.log('scientific-invariants.test.js: PASS');
