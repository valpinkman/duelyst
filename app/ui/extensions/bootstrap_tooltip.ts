/*
 * bootstrap 3 tooltips/popovers throw when an element is re-tooltipped while a
 * previous teardown is still in flight:
 *
 *     Uncaught TypeError: Cannot read properties of null (reading 'trigger')
 *         at complete (bootstrap Tooltip.prototype.show)
 *
 * `Tooltip#destroy` nulls `$element` -- but it does so INSIDE the callback it
 * hands to `hide()`, which for a faded tip does not run until the 150ms
 * transition ends. `removeData('bs.<type>')` is deferred with it. So for those
 * 150ms the element still carries the dying instance, and bootstrap's plugin
 * entry point reuses whatever it finds:
 *
 *     var data = $this.data('bs.tooltip')
 *     if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)))
 *
 * which makes the client's usual chain reuse the corpse:
 *
 *     $el.tooltip('destroy').tooltip({...}).tooltip('show')
 *
 * The re-init is a silent no-op (data is truthy, so the new options are
 * dropped) and `show()` runs on the instance being torn down. Both callbacks
 * are then queued on the same tip, teardown first: it nulls `$element`, and
 * show's completion immediately dereferences it. `hide()`'s completion guards
 * this exact case with `if (that.$element)` -- carrying an upstream TODO asking
 * whether the guard is really necessary -- while `show()`'s does not.
 *
 * Dropping the data synchronously is what breaks the chain: a later re-init
 * finds nothing, builds a fresh instance with its own element and tip, and the
 * old one finishes dying against its own state. The deferred teardown still
 * runs and is harmless -- `removeData` is idempotent, and bootstrap's own
 * `if (!data && /destroy|hide/.test(option)) return` turns any second
 * destroy/hide into a no-op.
 *
 * Patched rather than fixed in place because bootstrap is an npm dependency,
 * and applied to BOTH constructors because `Popover.prototype` is a COPY of
 * `Tooltip.prototype` ($.extend({}, ...)), not a descendant of it -- patching
 * only the tooltip would leave every popover broken, and popovers are what
 * deck selection uses.
 *
 * Reproduced in a real browser by test/e2e/bootstrap_popover_destroy.spec.mjs;
 * jsdom cannot see it, because the race needs `$.support.transition`.
 */
function patchDestroy(Constructor) {
  if (!Constructor || !Constructor.prototype || Constructor.prototype.__duelystDestroyPatched) {
    return false;
  }

  const originalDestroy = Constructor.prototype.destroy;
  if (typeof originalDestroy !== 'function') return false;

  Constructor.prototype.destroy = function () {
    // `this.type` is 'tooltip' or 'popover'; bootstrap keys its data the same way
    if (this.$element) this.$element.removeData('bs.' + this.type);
    return originalDestroy.apply(this, arguments);
  };
  Constructor.prototype.__duelystDestroyPatched = true;

  return true;
}

if (typeof $ !== 'undefined' && $.fn) {
  patchDestroy($.fn.tooltip && $.fn.tooltip.Constructor);
  patchDestroy($.fn.popover && $.fn.popover.Constructor);
}
