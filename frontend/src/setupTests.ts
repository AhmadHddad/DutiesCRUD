import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

class ResizeObserverMock {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

window.ResizeObserver = ResizeObserverMock;
Element.prototype.scrollIntoView = jest.fn();
