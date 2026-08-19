# backfire (vendored)

`backfire.min.js` v0.4.0 — Firebase's Backbone binding, unmaintained since 2015.
It is concatenated into `dist/src/vendor.js` and used through the global
`Backbone.Firebase` (see `app/ui/extensions/duelyst_firebase.ts`).

It used to live in `packages/backfire` as a workspace package, but nothing ever
imported it by name — only this built file was ever shipped, while the package's
23 unused devDependencies (grunt, karma and their trees) accounted for 60 of the
repository's security advisories. The package is gone; the file it produced is
here, with its original licence.

Replacing it is bound up with the Firebase 2.x → modular decision, since its
entire purpose is binding Backbone models to the Firebase 2.x API.
