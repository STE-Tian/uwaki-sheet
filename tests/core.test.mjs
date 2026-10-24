import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({});
for (const file of ['data.js', 'core.js']) vm.runInContext(await readFile(new URL(`../public/${file}`, import.meta.url), 'utf8'), context);
const { SHEET_DATA: D, SheetCore: C } = context;

test('40 paired questions match the three original page boundaries', () => {
  assert.equal(D.questions.length, 40);
  assert.equal(new Set(D.questions.map(q => q[0])).size, 40);
  assert.equal(new Set(D.questions.map(q => q[1])).size, 40);
  for (const pair of D.questions) assert.ok(pair.length === 2 && pair.every(text => typeof text === 'string' && text.trim()));
  assert.deepEqual(Array.from(D.groups, g => [g.start, g.end]), [[0, 13], [13, 27], [27, 40]]);
});
test('Chinese uses the requested mainland expressions while Japanese preserves source terms', () => {
  const chinese = D.questions.map(q => q[1]).join('\n');
  assert.doesNotMatch(chinese, /LINE|SNS|卡拉|貼文|追蹤/);
  assert.match(D.questions[7][1], /微信/);
  assert.match(D.questions[33][1], /微信/);
  assert.match(D.questions[14][1], /社交媒体/);
  assert.match(D.questions[30][1], /社交媒体/);
  assert.match(D.questions[7][0], /LINE/);
  assert.match(D.questions[30][0], /SNS/);
});
test('all interface keys are translated in both languages', () => {
  assert.deepEqual(Object.keys(D.ui.zh).sort(), Object.keys(D.ui.ja).sort());
  for (const lang of ['zh', 'ja']) for (const [key, value] of Object.entries(D.ui[lang])) assert.ok(Array.isArray(value) ? value.length === 3 && value.every(Boolean) : typeof value === 'string' && value.length, `${lang}.${key}`);
});
test('saved malformed data cannot manufacture a completed result', () => {
  const raw = { version: 1, answers: Array(40).fill('3'), reflection: 'false', view: 'result', index: 999, lang: 'xx' };
  const state = C.normalizeState(raw);
  assert.equal(C.answered(state), 0);
  assert.equal(state.reflection, null);
  assert.equal(state.view, 'intro');
  assert.equal(state.index, 39);
  assert.equal(state.lang, 'zh');
  assert.equal(C.normalizeState(null).answers.length, 40);
});
test('reflection is separate from the 40 answers and false is a valid response', () => {
  const state = C.initialState();
  state.answers = Array.from({ length: 40 }, (_, i) => i % 3 + 1);
  assert.deepEqual(Array.from(C.counts(state)), [14, 13, 13]);
  assert.equal(C.isComplete(state), false);
  state.reflection = false;
  assert.equal(C.isComplete(state), true);
  assert.equal(C.firstUnanswered(state), -1);
  state.answers[17] = 0;
  assert.equal(C.firstUnanswered(state), 17);
  assert.equal(C.isComplete(state), false);
});
test('language switch and restoration preserve answers and current question', () => {
  const state = C.initialState();
  state.answers[0] = 2; state.answers[39] = 3; state.index = 39; state.view = 'question'; state.lang = 'ja';
  const restored = C.normalizeState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.answers[0], 2);
  assert.equal(restored.answers[39], 3);
  assert.equal(restored.index, 39);
  assert.equal(restored.lang, 'ja');
  assert.equal(C.groupIndex(12), 0);
  assert.equal(C.groupIndex(13), 1);
  assert.equal(C.groupIndex(26), 1);
  assert.equal(C.groupIndex(27), 2);
});

test('result categories follow the reference site at all score boundaries', () => {
  for (const [score, type] of [[0,0],[15,0],[16,1],[35,1],[36,2],[55,2],[56,3],[80,3]]) {
    const state = C.initialState();
    state.answers = Array(40).fill(3);
    for (let i=0;i<Math.floor(score/2);i++) state.answers[i]=1;
    if (score%2) state.answers[Math.floor(score/2)]=2;
    assert.equal(C.resultIndex(state), type, `score ${score}`);
    assert.equal(D.types[type].max, [15,35,55,80][type]);
  }
});
