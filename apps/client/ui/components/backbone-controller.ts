/*
 * The bridge between the frozen Backbone state layer and Lit components
 * (docs/BACKBONE_REMOVAL_PLAN.md §3.2): a ReactiveController that re-renders
 * its host whenever a Backbone model or collection fires one of `events`.
 *
 * The target is read through a getter on every update rather than bound once,
 * because a component's model or collection is a reactive property the shell
 * may replace. When it does, the listener moves to the new target on the next
 * update; a controller bound at construction would keep listening to the old
 * one and the component would stop re-rendering without any error.
 *
 * Listeners exist only while the host is connected, so a component removed
 * from the DOM leaves nothing behind on a long-lived manager collection.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';

type BackboneEvents = {
  on(events: string, callback: (...args: any[]) => void, context?: any): any;
  off(events?: string, callback?: (...args: any[]) => void, context?: any): any;
};

export class BackboneController implements ReactiveController {
  #host: ReactiveControllerHost;
  #getTarget: () => BackboneEvents | null | undefined;
  #events: string;
  #onEvent: ((...args: any[]) => void) | undefined;
  #bound: BackboneEvents | null = null;
  #connected = false;

  /**
   * @param getTarget returns the model or collection to follow; may return null
   * @param events    space-separated Backbone event names
   * @param onEvent   optional, called with the event's arguments before the update is requested
   */
  constructor(
    host: ReactiveControllerHost,
    getTarget: () => BackboneEvents | null | undefined,
    events = 'change',
    onEvent?: (...args: any[]) => void,
  ) {
    this.#host = host;
    this.#getTarget = getTarget;
    this.#events = events;
    this.#onEvent = onEvent;
    host.addController(this);
  }

  hostConnected() {
    this.#connected = true;
    this.#bind();
  }

  // runs before every render: follows a target the host has swapped
  hostUpdate() {
    if (this.#connected) this.#bind();
  }

  hostDisconnected() {
    this.#connected = false;
    this.#unbind();
  }

  #bind() {
    const target = this.#getTarget() || null;
    if (target === this.#bound) return;
    this.#unbind();
    if (target) target.on(this.#events, this.#handle);
    this.#bound = target;
  }

  #unbind() {
    if (this.#bound) this.#bound.off(this.#events, this.#handle);
    this.#bound = null;
  }

  #handle = (...args: any[]) => {
    if (this.#onEvent) this.#onEvent(...args);
    this.#host.requestUpdate();
  };
}
