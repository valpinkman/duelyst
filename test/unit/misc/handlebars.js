const Handlebars = require('handlebars');
const { expect } = require('chai');

class TestClass {}
TestClass.prototype.accessMe = 'I am a prototype property';

/*
 * Handlebars 4.6 stopped resolving properties that live on an object's
 * prototype. This codebase relies on prototype properties in view data, so the
 * build restores the old behaviour explicitly (see the hbs plugin in
 * vite.config.client.mjs) rather than pinning handlebars to the vulnerable
 * 4.5.3, which is what upstream did.
 *
 * This test pins BOTH halves: the default is still locked down, and the
 * options the build passes do restore access.
 */
describe('Handlebars.UnitTests', () => {
  it('does not expose prototype properties by default (handlebars >= 4.6)', () => {
    const template = Handlebars.compile('{{accessMe}}');
    expect(template(new TestClass())).to.eql('');
  });

  it('exposes them with the options the client build passes', () => {
    const template = Handlebars.compile('{{accessMe}}');
    const result = template(new TestClass(), {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    });
    expect(result).to.eql('I am a prototype property');
  });
});
