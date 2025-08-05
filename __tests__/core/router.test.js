/**
 * Router Tests
 * 测试路由系统核心功能
 */

import { Router } from '../../_core/router.js';

describe('Router', () => {
  let router;
  let contentElement;

  beforeEach(() => {
    router = new Router();
    
    // Setup DOM
    contentElement = document.createElement('div');
    contentElement.id = 'app-content';
    document.body.appendChild(contentElement);
    
    // Reset window.location
    window.location.hash = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    router.reset();
  });

  describe('init()', () => {
    it('should initialize router with routes', () => {
      const routes = [
        { path: '/test', component: () => 'Test Component' },
        { path: '/another', component: () => 'Another Component' }
      ];
      
      router.init(routes, { contentElement });
      
      expect(router.routes.size).toBe(2);
      expect(router.routes.has('/test')).toBe(true);
      expect(router.routes.has('/another')).toBe(true);
      expect(router.initialized).toBe(true);
    });

    it('should handle re-initialization', () => {
      const routes1 = [{ path: '/test1', component: () => 'Test1' }];
      const routes2 = [{ path: '/test2', component: () => 'Test2' }];
      
      router.init(routes1);
      router.init(routes2);
      
      expect(router.routes.size).toBe(1);
      expect(router.routes.has('/test2')).toBe(true);
      expect(router.routes.has('/test1')).toBe(false);
    });

    it('should register before/after hooks', () => {
      const beforeHook = jest.fn();
      const afterHook = jest.fn();
      
      router.init([], {
        beforeEach: beforeHook,
        afterEach: afterHook
      });
      
      expect(router.beforeEachHooks).toContain(beforeHook);
      expect(router.afterEachHooks).toContain(afterHook);
    });
  });

  describe('navigate()', () => {
    beforeEach(() => {
      router.init([
        { path: '/home', component: () => '<div>Home</div>' },
        { path: '/about', component: () => '<div>About</div>' },
        { path: '/user/:id', component: () => '<div>User</div>' }
      ], { contentElement });
    });

    it('should navigate to route successfully', async () => {
      const result = await router.navigate('/home');
      
      expect(result).toBe(true);
      expect(router.currentRoute).toBe('/home');
      expect(contentElement.innerHTML).toContain('Home');
    });

    it('should handle navigation guards', async () => {
      router.beforeEach((to, from) => {
        if (to === '/about') return false;
        return true;
      });
      
      const result = await router.navigate('/about');
      
      expect(result).toBe(false);
      expect(router.currentRoute).not.toBe('/about');
    });

    it('should queue navigation when already navigating', async () => {
      // Start first navigation
      const nav1 = router.navigate('/home');
      
      // Try second navigation while first is in progress
      router.navigate('/about');
      
      await nav1;
      
      expect(router.navigationQueue.length).toBeGreaterThan(0);
    });

    it('should handle 404 routes', async () => {
      const result = await router.navigate('/non-existent');
      
      expect(result).toBe(false);
      expect(contentElement.innerHTML).toContain('404');
      expect(contentElement.innerHTML).toContain('/non-existent');
    });

    it('should update URL hash', async () => {
      await router.navigate('/about');
      
      expect(window.location.hash).toBe('#/about');
    });
  });

  describe('Dynamic Routes', () => {
    beforeEach(() => {
      router.init([
        { path: '/user/:id', component: ({ params }) => `User ${params?.id}` },
        { path: '/post/:id/comment/:cid', component: () => 'Comment' }
      ], { contentElement });
    });

    it('should match dynamic route patterns', () => {
      const route = router.findRoute('/user/123');
      
      expect(route).toBeTruthy();
      expect(route.path).toBe('/user/:id');
    });

    it('should match multiple dynamic segments', () => {
      const route = router.findRoute('/post/456/comment/789');
      
      expect(route).toBeTruthy();
      expect(route.path).toBe('/post/:id/comment/:cid');
    });
  });

  describe('Component Loading', () => {
    it('should load function components', async () => {
      const component = jest.fn(() => '<div>Function Component</div>');
      router.init([
        { path: '/test', component }
      ], { contentElement });
      
      await router.navigate('/test');
      
      expect(component).toHaveBeenCalled();
      expect(contentElement.innerHTML).toContain('Function Component');
    });

    it('should load class components', async () => {
      class TestComponent {
        render() {
          return '<div>Class Component</div>';
        }
      }
      
      router.init([
        { path: '/test', component: TestComponent }
      ], { contentElement });
      
      await router.navigate('/test');
      
      expect(contentElement.innerHTML).toContain('Class Component');
    });

    it('should call component lifecycle methods', async () => {
      const mounted = jest.fn();
      const destroy = jest.fn();
      
      class TestComponent {
        render() {
          return '<div>Lifecycle Test</div>';
        }
        mounted() {
          mounted();
        }
        destroy() {
          destroy();
        }
      }
      
      router.init([
        { path: '/test', component: TestComponent },
        { path: '/other', component: () => 'Other' }
      ], { contentElement });
      
      await router.navigate('/test');
      
      // Wait for mounted to be called
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mounted).toHaveBeenCalled();
      
      // Navigate away
      await router.navigate('/other');
      expect(destroy).toHaveBeenCalled();
    });
  });

  describe('getCurrentPath()', () => {
    it('should return current hash path', () => {
      window.location.hash = '#/test';
      
      expect(router.getCurrentPath()).toBe('/test');
    });

    it('should return null for empty hash', () => {
      window.location.hash = '';
      
      expect(router.getCurrentPath()).toBeNull();
    });
  });

  describe('Route Preloading', () => {
    it('should preload adjacent routes', async () => {
      const loadSpy = jest.spyOn(router, 'loadRouteComponent');
      
      router.init([
        { path: '/dashboard', component: () => 'Dashboard' },
        { path: '/ai-service', component: () => 'AI Service' }
      ], { contentElement });
      
      // Mock requestIdleCallback
      window.requestIdleCallback = (cb) => setTimeout(cb, 0);
      
      await router.navigate('/dashboard');
      
      // Wait for preloading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should attempt to preload adjacent routes
      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      router.init([
        { path: '/home', component: () => 'Home' },
        { path: '/about', component: () => 'About' }
      ], { contentElement });
    });

    it('should handle link clicks', () => {
      const link = document.createElement('a');
      link.href = '#/about';
      document.body.appendChild(link);
      
      const navigateSpy = jest.spyOn(router, 'navigate');
      
      link.click();
      
      expect(navigateSpy).toHaveBeenCalledWith('/about');
    });

    it('should handle popstate events', async () => {
      await router.navigate('/home');
      await router.navigate('/about');
      
      const navigateSpy = jest.spyOn(router, 'navigate');
      
      window.history.back();
      window.dispatchEvent(new PopStateEvent('popstate'));
      
      expect(navigateSpy).toHaveBeenCalled();
    });
  });

  describe('reset()', () => {
    it('should reset router state', () => {
      router.init([
        { path: '/test', component: () => 'Test' }
      ]);
      
      router.currentRoute = '/test';
      router.reset();
      
      expect(router.routes.size).toBe(0);
      expect(router.currentRoute).toBeNull();
      expect(router.beforeEachHooks.length).toBe(0);
      expect(router.afterEachHooks.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      router.init([], { contentElement });
    });

    it('should show error when component fails to load', async () => {
      router.register({
        path: '/error',
        component: () => { throw new Error('Component error'); }
      });
      
      await router.navigate('/error');
      
      expect(contentElement.innerHTML).toContain('加载失败');
      expect(contentElement.innerHTML).toContain('Component error');
    });

    it('should handle component destruction errors gracefully', async () => {
      const component = {
        render: () => 'Test',
        destroy: () => { throw new Error('Destroy error'); }
      };
      
      router.register({ path: '/test', component: () => component });
      router.register({ path: '/other', component: () => 'Other' });
      
      await router.navigate('/test');
      
      // Should not throw when navigating away
      await expect(router.navigate('/other')).resolves.toBe(true);
    });
  });
});