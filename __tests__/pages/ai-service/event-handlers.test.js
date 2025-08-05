/**
 * Event Handlers Tests
 * 测试事件处理模块
 */

import { EventHandlers } from '../../../_pages/ai-service/events/event-handlers.js';
import { createMockDocument, fireEvent } from '../../helpers/dom-mocks.js';
import { MockApiClient } from '../../helpers/api-mocks.js';

describe('EventHandlers', () => {
  let handlers;
  let mockDocument;
  let mockApi;
  let mockApp;

  beforeEach(() => {
    // Setup DOM
    mockDocument = createMockDocument();
    global.document = mockDocument;
    
    // Setup API
    mockApi = new MockApiClient();
    
    // Setup app context
    mockApp = {
      api: mockApi,
      showToast: jest.fn(),
      showModal: jest.fn(),
      closeModal: jest.fn(),
      showLoading: jest.fn(),
      hideLoading: jest.fn()
    };
    
    // Create handlers instance
    handlers = new EventHandlers(mockApp);
  });

  afterEach(() => {
    handlers.destroy();
    mockDocument._reset();
  });

  describe('initialization', () => {
    it('should initialize with app context', () => {
      expect(handlers.app).toBe(mockApp);
      expect(handlers.handlers).toBeDefined();
      expect(handlers.listeners).toBeDefined();
    });

    it('should register default handlers', () => {
      expect(handlers.handlers.has('click')).toBe(true);
      expect(handlers.handlers.has('submit')).toBe(true);
      expect(handlers.handlers.has('change')).toBe(true);
      expect(handlers.handlers.has('input')).toBe(true);
    });
  });

  describe('event registration', () => {
    it('should register event listener', () => {
      const button = mockDocument.createElement('button');
      const handler = jest.fn();
      
      handlers.on(button, 'click', handler);
      
      fireEvent(button, 'click');
      
      expect(handler).toHaveBeenCalled();
    });

    it('should support event delegation', () => {
      const container = mockDocument.createElement('div');
      const button = mockDocument.createElement('button');
      button.className = 'delegated-btn';
      container.appendChild(button);
      
      const handler = jest.fn();
      handlers.delegate(container, 'click', '.delegated-btn', handler);
      
      fireEvent(button, 'click');
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ target: button })
      );
    });

    it('should remove event listener', () => {
      const button = mockDocument.createElement('button');
      const handler = jest.fn();
      
      const off = handlers.on(button, 'click', handler);
      off(); // Remove listener
      
      fireEvent(button, 'click');
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('form handling', () => {
    let form;

    beforeEach(() => {
      form = mockDocument.createElement('form');
      form.innerHTML = `
        <input name="username" value="testuser" />
        <input name="email" value="test@example.com" />
        <button type="submit">Submit</button>
      `;
      mockDocument.body.appendChild(form);
    });

    it('should handle form submission', () => {
      const submitHandler = jest.fn();
      handlers.handleForm(form, submitHandler);
      
      fireEvent(form, 'submit');
      
      expect(submitHandler).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com'
      });
    });

    it('should prevent default form submission', () => {
      const submitHandler = jest.fn();
      handlers.handleForm(form, submitHandler);
      
      const event = fireEvent(form, 'submit');
      
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should validate form before submission', () => {
      const validator = jest.fn().mockReturnValue(['Username is required']);
      const submitHandler = jest.fn();
      
      handlers.handleForm(form, submitHandler, { validator });
      
      fireEvent(form, 'submit');
      
      expect(validator).toHaveBeenCalled();
      expect(submitHandler).not.toHaveBeenCalled();
      expect(mockApp.showToast).toHaveBeenCalledWith(
        'error',
        'Username is required'
      );
    });

    it('should handle async form submission', async () => {
      const submitHandler = jest.fn().mockResolvedValue({ success: true });
      handlers.handleForm(form, submitHandler);
      
      await handlers.submitForm(form);
      
      expect(mockApp.showLoading).toHaveBeenCalled();
      expect(submitHandler).toHaveBeenCalled();
      expect(mockApp.hideLoading).toHaveBeenCalled();
    });
  });

  describe('input handling', () => {
    it('should debounce input events', () => {
      jest.useFakeTimers();
      
      const input = mockDocument.createElement('input');
      const handler = jest.fn();
      
      handlers.handleInput(input, handler, { debounce: 300 });
      
      fireEvent(input, 'input', { target: { value: 'a' } });
      fireEvent(input, 'input', { target: { value: 'ab' } });
      fireEvent(input, 'input', { target: { value: 'abc' } });
      
      expect(handler).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(300);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('abc');
      
      jest.useRealTimers();
    });

    it('should validate input on change', () => {
      const input = mockDocument.createElement('input');
      input.type = 'email';
      
      const validator = jest.fn((value) => {
        return value.includes('@') ? null : 'Invalid email';
      });
      
      handlers.handleInput(input, jest.fn(), { validator });
      
      fireEvent(input, 'input', { target: { value: 'invalid' } });
      expect(input.classList.contains('error')).toBe(true);
      
      fireEvent(input, 'input', { target: { value: 'valid@email.com' } });
      expect(input.classList.contains('error')).toBe(false);
    });
  });

  describe('button handling', () => {
    it('should handle button clicks with confirmation', () => {
      const button = mockDocument.createElement('button');
      const handler = jest.fn();
      
      global.confirm = jest.fn().mockReturnValue(true);
      
      handlers.handleButton(button, handler, {
        confirm: 'Are you sure?'
      });
      
      fireEvent(button, 'click');
      
      expect(global.confirm).toHaveBeenCalledWith('Are you sure?');
      expect(handler).toHaveBeenCalled();
    });

    it('should not execute handler if confirmation cancelled', () => {
      const button = mockDocument.createElement('button');
      const handler = jest.fn();
      
      global.confirm = jest.fn().mockReturnValue(false);
      
      handlers.handleButton(button, handler, {
        confirm: 'Are you sure?'
      });
      
      fireEvent(button, 'click');
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should disable button during async operation', async () => {
      const button = mockDocument.createElement('button');
      const handler = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      handlers.handleButton(button, handler);
      
      const clickPromise = fireEvent(button, 'click');
      
      expect(button.disabled).toBe(true);
      
      await clickPromise;
      
      expect(button.disabled).toBe(false);
    });
  });

  describe('modal handling', () => {
    it('should open modal on trigger click', () => {
      const trigger = mockDocument.createElement('button');
      trigger.dataset.modal = 'test-modal';
      
      const modal = mockDocument.createElement('div');
      modal.id = 'test-modal';
      mockDocument._registerElement('#test-modal', modal);
      
      handlers.handleModal(trigger);
      
      fireEvent(trigger, 'click');
      
      expect(mockApp.showModal).toHaveBeenCalledWith('test-modal');
    });

    it('should close modal on close button click', () => {
      const modal = mockDocument.createElement('div');
      const closeBtn = mockDocument.createElement('button');
      closeBtn.className = 'modal-close';
      modal.appendChild(closeBtn);
      
      handlers.bindModalEvents(modal);
      
      fireEvent(closeBtn, 'click');
      
      expect(mockApp.closeModal).toHaveBeenCalled();
    });

    it('should close modal on backdrop click', () => {
      const modal = mockDocument.createElement('div');
      modal.className = 'modal';
      
      handlers.bindModalEvents(modal);
      
      fireEvent(modal, 'click', { target: modal });
      
      expect(mockApp.closeModal).toHaveBeenCalled();
    });
  });

  describe('drag and drop', () => {
    let dropzone;

    beforeEach(() => {
      dropzone = mockDocument.createElement('div');
      dropzone.className = 'dropzone';
      mockDocument.body.appendChild(dropzone);
    });

    it('should handle file drop', () => {
      const handler = jest.fn();
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      handlers.handleDropzone(dropzone, handler);
      
      const event = fireEvent(dropzone, 'drop', {
        dataTransfer: { files: [file] }
      });
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith([file]);
    });

    it('should add hover class on dragover', () => {
      handlers.handleDropzone(dropzone, jest.fn());
      
      fireEvent(dropzone, 'dragover');
      
      expect(dropzone.classList.contains('dragover')).toBe(true);
    });

    it('should remove hover class on dragleave', () => {
      handlers.handleDropzone(dropzone, jest.fn());
      
      dropzone.classList.add('dragover');
      fireEvent(dropzone, 'dragleave');
      
      expect(dropzone.classList.contains('dragover')).toBe(false);
    });

    it('should validate file types', () => {
      const handler = jest.fn();
      const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const invalidFile = new File([''], 'test.exe', { type: 'application/exe' });
      
      handlers.handleDropzone(dropzone, handler, {
        accept: ['image/jpeg', 'image/png']
      });
      
      fireEvent(dropzone, 'drop', {
        dataTransfer: { files: [validFile, invalidFile] }
      });
      
      expect(handler).toHaveBeenCalledWith([validFile]);
      expect(mockApp.showToast).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('不支持的文件类型')
      );
    });
  });

  describe('keyboard shortcuts', () => {
    it('should register keyboard shortcut', () => {
      const handler = jest.fn();
      
      handlers.registerShortcut('ctrl+s', handler);
      
      fireEvent(document, 'keydown', {
        key: 's',
        ctrlKey: true
      });
      
      expect(handler).toHaveBeenCalled();
    });

    it('should prevent default for registered shortcuts', () => {
      handlers.registerShortcut('ctrl+s', jest.fn());
      
      const event = fireEvent(document, 'keydown', {
        key: 's',
        ctrlKey: true
      });
      
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should support multiple modifier keys', () => {
      const handler = jest.fn();
      
      handlers.registerShortcut('ctrl+shift+k', handler);
      
      fireEvent(document, 'keydown', {
        key: 'k',
        ctrlKey: true,
        shiftKey: true
      });
      
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove all listeners on destroy', () => {
      const button1 = mockDocument.createElement('button');
      const button2 = mockDocument.createElement('button');
      
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      handlers.on(button1, 'click', handler1);
      handlers.on(button2, 'click', handler2);
      
      handlers.destroy();
      
      fireEvent(button1, 'click');
      fireEvent(button2, 'click');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should clear all shortcuts', () => {
      const handler = jest.fn();
      
      handlers.registerShortcut('ctrl+s', handler);
      handlers.destroy();
      
      fireEvent(document, 'keydown', {
        key: 's',
        ctrlKey: true
      });
      
      expect(handler).not.toHaveBeenCalled();
    });
  });
});