import { afterEach, describe, expect, it } from 'vitest';
import { LitElement, html } from 'lit';
import { createRequire } from 'node:module';
import { BackboneController } from '../../../apps/client/ui/components/backbone-controller';

const require = createRequire(import.meta.url);
const Backbone = require('backbone');

// the smallest host: renders a model attribute and counts its renders
class BackboneControllerProbe extends LitElement {
  static properties = { model: { attribute: false } };

  declare model: any;
  renders = 0;
  seen: any[][] = [];

  constructor() {
    super();
    new BackboneController(
      this,
      () => this.model,
      'change',
      (...args) => this.seen.push(args),
    );
  }

  createRenderRoot() {
    return this;
  }

  render() {
    this.renders += 1;
    return html`<span>${this.model ? this.model.get('label') : ''}</span>`;
  }
}
customElements.define('backbone-controller-probe', BackboneControllerProbe);

function mount(model) {
  const el = document.createElement('backbone-controller-probe') as BackboneControllerProbe;
  el.model = model;
  document.body.appendChild(el);
  return el;
}

const listenerCount = (model) => Object.keys(model._events || {}).length;

describe('BackboneController', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('re-renders the host on a Backbone change', async () => {
    const model = new Backbone.Model({ label: 'one' });
    const el = mount(model);
    await el.updateComplete;
    expect(el.textContent).toBe('one');

    model.set('label', 'two');
    await el.updateComplete;
    expect(el.textContent).toBe('two');
    expect(el.seen[0][0]).toBe(model);
  });

  it('moves its listener when the host swaps the target', async () => {
    const first = new Backbone.Model({ label: 'first' });
    const second = new Backbone.Model({ label: 'second' });
    const el = mount(first);
    await el.updateComplete;

    el.model = second;
    await el.updateComplete;
    expect(el.textContent).toBe('second');
    expect(listenerCount(first)).toBe(0);
    expect(listenerCount(second)).toBe(1);

    const renders = el.renders;
    first.set('label', 'stale');
    await el.updateComplete;
    expect(el.renders).toBe(renders);

    second.set('label', 'live');
    await el.updateComplete;
    expect(el.textContent).toBe('live');
  });

  it('removes its listener when the host disconnects, and restores it on reconnect', async () => {
    const model = new Backbone.Model({ label: 'one' });
    const el = mount(model);
    await el.updateComplete;
    expect(listenerCount(model)).toBe(1);

    el.remove();
    expect(listenerCount(model)).toBe(0);

    document.body.appendChild(el);
    expect(listenerCount(model)).toBe(1);
    model.set('label', 'back');
    await el.updateComplete;
    expect(el.textContent).toBe('back');
  });

  it('tolerates a missing target', async () => {
    const el = mount(null);
    await el.updateComplete;
    expect(el.textContent).toBe('');
  });
});
