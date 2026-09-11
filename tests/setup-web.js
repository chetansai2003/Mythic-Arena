import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// jsdom does not implement the native dialog methods. Browser tests cover focus
// trapping and real modal behavior; component tests need only open/closed state.
const HTMLDialogElement = globalThis.HTMLDialogElement;
if (HTMLDialogElement) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
}
afterEach(cleanup);
