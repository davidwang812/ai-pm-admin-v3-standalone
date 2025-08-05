/**
 * DOM Mock Helpers
 * DOM测试辅助工具
 */

// Create mock DOM element with full API
export function createMockElement(tagName = 'div', options = {}) {
  const element = {
    tagName: tagName.toUpperCase(),
    id: options.id || '',
    className: options.className || '',
    classList: createClassList(options.className),
    style: options.style || {},
    attributes: new Map(),
    children: [],
    parentElement: null,
    innerHTML: options.innerHTML || '',
    textContent: options.textContent || '',
    value: options.value || '',
    checked: options.checked || false,
    disabled: options.disabled || false,
    dataset: options.dataset || {},
    
    // Methods
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(function(child) {
      this.children.push(child);
      child.parentElement = this;
      return child;
    }),
    removeChild: jest.fn(function(child) {
      const index = this.children.indexOf(child);
      if (index > -1) {
        this.children.splice(index, 1);
        child.parentElement = null;
      }
      return child;
    }),
    querySelector: jest.fn(function(selector) {
      // Simple selector implementation
      if (selector.startsWith('#')) {
        const id = selector.slice(1);
        return this.children.find(child => child.id === id);
      }
      if (selector.startsWith('.')) {
        const className = selector.slice(1);
        return this.children.find(child => 
          child.classList.contains(className)
        );
      }
      return this.children.find(child => 
        child.tagName.toLowerCase() === selector
      );
    }),
    querySelectorAll: jest.fn(function(selector) {
      if (selector.startsWith('.')) {
        const className = selector.slice(1);
        return this.children.filter(child => 
          child.classList.contains(className)
        );
      }
      return this.children.filter(child => 
        child.tagName.toLowerCase() === selector
      );
    }),
    getAttribute: jest.fn(function(name) {
      return this.attributes.get(name);
    }),
    setAttribute: jest.fn(function(name, value) {
      this.attributes.set(name, value);
      if (name === 'class') {
        this.className = value;
        this.classList = createClassList(value);
      }
    }),
    removeAttribute: jest.fn(function(name) {
      this.attributes.delete(name);
    }),
    click: jest.fn(function() {
      const event = { type: 'click', target: this };
      this.addEventListener.mock.calls
        .filter(call => call[0] === 'click')
        .forEach(call => call[1](event));
    }),
    focus: jest.fn(),
    blur: jest.fn(),
    scrollIntoView: jest.fn()
  };
  
  // Add custom properties
  Object.entries(options).forEach(([key, value]) => {
    if (!element.hasOwnProperty(key)) {
      element[key] = value;
    }
  });
  
  return element;
}

// Create classList object
function createClassList(className = '') {
  const classes = className.split(' ').filter(Boolean);
  
  return {
    classes,
    add: jest.fn(function(...names) {
      names.forEach(name => {
        if (!this.classes.includes(name)) {
          this.classes.push(name);
        }
      });
    }),
    remove: jest.fn(function(...names) {
      names.forEach(name => {
        const index = this.classes.indexOf(name);
        if (index > -1) {
          this.classes.splice(index, 1);
        }
      });
    }),
    toggle: jest.fn(function(name) {
      if (this.contains(name)) {
        this.remove(name);
      } else {
        this.add(name);
      }
    }),
    contains: jest.fn(function(name) {
      return this.classes.includes(name);
    })
  };
}

// Create mock document
export function createMockDocument() {
  const elements = new Map();
  const body = createMockElement('body');
  const head = createMockElement('head');
  
  return {
    body,
    head,
    documentElement: createMockElement('html', {
      children: [head, body]
    }),
    
    getElementById: jest.fn((id) => {
      return elements.get(`#${id}`) || null;
    }),
    
    querySelector: jest.fn((selector) => {
      if (selector.startsWith('#')) {
        return elements.get(selector) || null;
      }
      // Return first matching element
      for (const [key, element] of elements) {
        if (matchesSelector(element, selector)) {
          return element;
        }
      }
      return null;
    }),
    
    querySelectorAll: jest.fn((selector) => {
      const matches = [];
      for (const [key, element] of elements) {
        if (matchesSelector(element, selector)) {
          matches.push(element);
        }
      }
      return matches;
    }),
    
    createElement: jest.fn((tagName) => {
      return createMockElement(tagName);
    }),
    
    createTextNode: jest.fn((text) => ({
      nodeType: 3,
      textContent: text,
      parentElement: null
    })),
    
    createDocumentFragment: jest.fn(() => ({
      children: [],
      appendChild: function(child) {
        this.children.push(child);
      }
    })),
    
    // Helper to register elements
    _registerElement: (selector, element) => {
      elements.set(selector, element);
      if (selector.startsWith('#')) {
        element.id = selector.slice(1);
      }
    },
    
    // Helper to clear all elements
    _reset: () => {
      elements.clear();
      body.children = [];
      body.innerHTML = '';
    }
  };
}

// Simple selector matcher
function matchesSelector(element, selector) {
  if (selector.startsWith('#')) {
    return element.id === selector.slice(1);
  }
  if (selector.startsWith('.')) {
    return element.classList.contains(selector.slice(1));
  }
  if (selector.includes('[')) {
    // Attribute selector
    const match = selector.match(/\[(.+?)(?:=(.+?))?\]/);
    if (match) {
      const [, attr, value] = match;
      if (value) {
        return element.getAttribute(attr) === value.replace(/["']/g, '');
      }
      return element.hasAttribute(attr);
    }
  }
  return element.tagName.toLowerCase() === selector;
}

// Create mock window
export function createMockWindow(options = {}) {
  return {
    location: {
      href: options.href || 'http://localhost/',
      hostname: options.hostname || 'localhost',
      pathname: options.pathname || '/',
      search: options.search || '',
      hash: options.hash || '',
      assign: jest.fn(),
      reload: jest.fn(),
      replace: jest.fn()
    },
    
    history: {
      pushState: jest.fn(),
      replaceState: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      go: jest.fn()
    },
    
    localStorage: createMockStorage(),
    sessionStorage: createMockStorage(),
    
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    
    requestAnimationFrame: jest.fn((cb) => {
      setTimeout(cb, 16);
      return 1;
    }),
    
    cancelAnimationFrame: jest.fn(),
    
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
    
    innerWidth: options.innerWidth || 1024,
    innerHeight: options.innerHeight || 768,
    
    scrollTo: jest.fn(),
    scrollBy: jest.fn(),
    
    getComputedStyle: jest.fn(() => ({
      getPropertyValue: jest.fn(() => '')
    })),
    
    matchMedia: jest.fn((query) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
  };
}

// Create mock storage
export function createMockStorage() {
  const store = new Map();
  
  return {
    getItem: jest.fn((key) => store.get(key) || null),
    setItem: jest.fn((key, value) => store.set(key, String(value))),
    removeItem: jest.fn((key) => store.delete(key)),
    clear: jest.fn(() => store.clear()),
    get length() { return store.size; },
    key: jest.fn((index) => {
      const keys = Array.from(store.keys());
      return keys[index] || null;
    })
  };
}

// Event helpers
export function fireEvent(element, eventName, eventData = {}) {
  const event = {
    type: eventName,
    target: element,
    currentTarget: element,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    ...eventData
  };
  
  // Trigger registered event listeners
  const listeners = element.addEventListener.mock.calls
    .filter(call => call[0] === eventName)
    .map(call => call[1]);
  
  listeners.forEach(listener => listener(event));
  
  return event;
}

// Form helpers
export function createMockForm(fields = {}) {
  const form = createMockElement('form');
  const elements = {};
  
  Object.entries(fields).forEach(([name, value]) => {
    const input = createMockElement('input', {
      name,
      value,
      type: 'text'
    });
    elements[name] = input;
    form.appendChild(input);
  });
  
  form.elements = elements;
  form.submit = jest.fn();
  form.reset = jest.fn();
  
  return form;
}

// Canvas mock
export function createMockCanvas() {
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '10px sans-serif',
    
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    clearRect: jest.fn(),
    
    beginPath: jest.fn(),
    closePath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arc: jest.fn(),
    
    fill: jest.fn(),
    stroke: jest.fn(),
    
    save: jest.fn(),
    restore: jest.fn(),
    
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    
    drawImage: jest.fn(),
    
    measureText: jest.fn(() => ({ width: 100 })),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1
    })),
    
    putImageData: jest.fn(),
    createImageData: jest.fn()
  };
  
  const canvas = createMockElement('canvas', {
    width: 300,
    height: 150,
    getContext: jest.fn((type) => {
      if (type === '2d') return context;
      return null;
    })
  });
  
  return { canvas, context };
}

// Testing utilities
export function waitForDOM(condition, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('DOM condition timeout'));
      } else {
        setTimeout(check, 10);
      }
    };
    
    check();
  });
}

export default {
  createMockElement,
  createMockDocument,
  createMockWindow,
  createMockStorage,
  fireEvent,
  createMockForm,
  createMockCanvas,
  waitForDOM
};