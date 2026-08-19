// Registers tsx's CommonJS hook so the require() chain inside the tests can
// resolve and compile .ts files during the JS -> TypeScript migration.
// (vitest transforms the test file itself through Vite, but these tests then
// use plain require() for the app modules.)
import 'tsx/cjs';
