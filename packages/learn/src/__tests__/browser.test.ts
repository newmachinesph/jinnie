import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {navigationScript, scrollScript, visibilityScript} from '../browser';

test('Next navigation preserves router state and reports correct Back availability', () => {
  const messages: Array<{payload: {url: string; canGoBack: boolean}}> = [];
  const listeners: Record<string, (event: {state: Record<string, unknown>}) => void> = {};
  const location = {href: 'https://learn.jinnie.ph/?embed=native'};
  const history = {
    state: {__NA: true, tree: ['root']} as Record<string, unknown>,
    pushState(state: Record<string, unknown>, _title: string, url: string) { this.state = state; location.href = url; },
    replaceState(state: Record<string, unknown>, _title: string, url: string) { this.state = state; location.href = url; },
  };
  const window = {
    ReactNativeWebView: {postMessage: (message: string) => messages.push(JSON.parse(message))},
    addEventListener: (name: string, handler: typeof listeners[string]) => { listeners[name] = handler; },
  };
  const context = vm.createContext({window, history, location});
  vm.runInContext(navigationScript(), context);
  assert.equal(messages.at(-1)?.payload.canGoBack, false);
  const rootState = history.state;
  history.replaceState({__NA: true, tree: ['onboard']}, '', 'https://learn.jinnie.ph/onboard?embed=native');
  assert.equal(messages.at(-1)?.payload.canGoBack, false);
  history.pushState({__NA: true, tree: ['paths']}, '', 'https://learn.jinnie.ph/paths?embed=native');
  assert.equal(messages.at(-1)?.payload.canGoBack, true);
  assert.equal(history.state.__NA, true);
  assert.deepEqual(history.state.tree, ['paths']);
  const pathsState = history.state;
  history.pushState({__NA: true}, '', 'https://learn.jinnie.ph/path/kids?embed=native');
  listeners.popstate({state: pathsState});
  assert.equal(messages.at(-1)?.payload.canGoBack, true);
  listeners.popstate({state: rootState});
  assert.equal(messages.at(-1)?.payload.canGoBack, false);
  const before = messages.length;
  vm.runInContext(navigationScript(), context);
  assert.equal(messages.length, before, 'installing twice must not wrap history twice');
});

test('native visibility notifies narration and pauses all document media only when hidden', () => {
  let paused = 0;
  const events: Array<{type: string; detail: {hidden: boolean}}> = [];
  class CustomEvent {
    type: string;
    options: {detail: {hidden: boolean}};
    constructor(type: string, options: {detail: {hidden: boolean}}) { this.type = type; this.options = options; }
  }
  const window = {
    dispatchEvent(event: CustomEvent) { events.push({type: event.type, detail: event.options.detail}); },
    __JINNIE_LEARN_HIDDEN__: false,
  };
  const document = {querySelectorAll: () => [{pause: () => paused++}, {pause: () => paused++}]};
  const context = vm.createContext({window, document, CustomEvent});
  vm.runInContext(visibilityScript(true), context);
  assert.equal(paused, 2);
  assert.equal(window.__JINNIE_LEARN_HIDDEN__, true);
  assert.equal(events.at(-1)?.detail.hidden, true);
  vm.runInContext(visibilityScript(false), context);
  assert.equal(paused, 2);
  assert.equal(window.__JINNIE_LEARN_HIDDEN__, false);
  assert.equal(events.at(-1)?.detail.hidden, false);
});

test('scroll observer reports direction changes from the course scroller and restarts after a route change', () => {
  const messages: Array<{type: string; payload: {direction: string; atTop: boolean}}> = [];
  const listeners: Record<string, (event: {target: unknown}) => void> = {};
  let installed = 0;
  const document = {
    scrollingElement: {scrollTop: 0},
    addEventListener: (name: string, handler: typeof listeners[string], capture: boolean) => {
      assert.equal(capture, true, 'inner scrollers only reach the document in the capture phase');
      listeners[name] = handler;
      installed += 1;
    },
  };
  const window = {ReactNativeWebView: {postMessage: (message: string) => messages.push(JSON.parse(message))}} as Record<string, unknown>;
  const context = vm.createContext({window, document});
  vm.runInContext(scrollScript(), context);
  const main = {scrollTop: 0, scrollHeight: 2000, clientHeight: 700};
  const scroll = (top: number) => { main.scrollTop = top; listeners.scroll({target: main}); };
  scroll(0);
  assert.equal(messages.length, 0, 'the first event only registers the scroller');
  scroll(40);
  assert.deepEqual(messages.at(-1)?.payload, {direction: 'down', atTop: false});
  scroll(80);
  scroll(77);
  assert.equal(messages.length, 1, 'same direction and small jitter stay quiet');
  scroll(40);
  assert.deepEqual(messages.at(-1)?.payload, {direction: 'up', atTop: false});
  scroll(0);
  assert.equal(messages.length, 2, 'reaching the top while already going up is not repeated');
  scroll(30);
  assert.equal(messages.at(-1)?.payload.direction, 'down');
  (window.__jinnieLearnScrollReset as () => void)();
  scroll(60);
  assert.equal(messages.length, 4, 'the first scroll after a route change reports again');
  assert.deepEqual(messages.at(-1)?.payload, {direction: 'down', atTop: false});
  assert.equal(messages.every(message => message.type === 'scroll'), true);
  main.scrollHeight = 800;
  scroll(0);
  const quiet = messages.length;
  scroll(60);
  assert.equal(messages.length, quiet, 'near the end there is no room for the bar to hide into');
  vm.runInContext(scrollScript(), context);
  assert.equal(installed, 1, 'installing twice must not add a second listener');
});
