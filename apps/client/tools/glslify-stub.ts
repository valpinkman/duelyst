// Build-time stub: every glslify call site is statically replaced with
// compiled shader source by the Vite plugin (vite.config.client.mjs). If this
// function is ever actually invoked, a call site was missed.
module.exports = function glslifyStub() {
  throw new Error(
    'a glslify call reached runtime - a call site was not statically replaced at build time',
  );
};
