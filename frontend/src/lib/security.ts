/**
 * Security utilities to lock the console, disable context menus,
 * block standard DevTools shortcuts, and disrupt browser inspection/debugging.
 */

export function initSecurityProtections() {
  // 1. Disable Right-click context menu (Inspect Element)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // 2. Disable DevTools keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Disable F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+Shift+I (or Cmd+Opt+I on Mac)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key?.toLowerCase() === 'i') {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+Shift+J (or Cmd+Opt+J on Mac)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key?.toLowerCase() === 'j') {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+Shift+C (or Cmd+Opt+C on Mac)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key?.toLowerCase() === 'c') {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+U / Cmd+U (View Page Source)
    if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === 'u') {
      e.preventDefault();
      return false;
    }
  });

  // 3. Prevent Console Inspection by overriding console logging functions
  // and clearing the console repeatedly.
  const noop = () => {};
  const methods = ['log', 'info', 'warn', 'error', 'debug', 'dir', 'table', 'trace', 'assert', 'clear'];
  
  methods.forEach((method) => {
    try {
      Object.defineProperty(console, method, {
        get: () => noop,
        set: () => {},
        configurable: false,
      });
    } catch (e) {
      // Fallback if defineProperty fails
      (console as any)[method] = noop;
    }
  });

  // Periodically clear console just in case
  setInterval(() => {
    try {
      // Accessing raw console.clear from iframe to bypass our overrides if needed,
      // or just call standard clear.
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      if (iframe.contentWindow) {
        (iframe.contentWindow as any).console?.clear();
      }
      document.body.removeChild(iframe);
    } catch (e) {
      // ignore
    }
  }, 1000);

  // 4. Anti-Debugger Loop
  // This causes the browser to pause execution automatically if DevTools is opened,
  // making it extremely difficult/annoying for someone to inspect code or variables.
  const antiDebugger = () => {
    try {
      const check = () => {
        (function() {
          return true;
        })
          .constructor('debugger')()
      };
      check();
    } catch (err) {
      // ignore
    }
  };

  // Run the anti-debugger immediately and continuously
  setInterval(antiDebugger, 100);
}
