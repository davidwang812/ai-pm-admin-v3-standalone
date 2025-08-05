/**
 * Browser Compatibility Check
 * 检查浏览器兼容性并提供降级方案
 */

export class BrowserCompatibility {
  constructor() {
    this.features = {
      // ES6+ 特性
      es6: this.checkES6Support(),
      modules: this.checkModuleSupport(),
      asyncAwait: this.checkAsyncAwaitSupport(),
      promises: this.checkPromiseSupport(),
      
      // Web APIs
      fetch: this.checkFetchSupport(),
      localStorage: this.checkLocalStorageSupport(),
      sessionStorage: this.checkSessionStorageSupport(),
      webWorkers: this.checkWebWorkerSupport(),
      serviceWorkers: this.checkServiceWorkerSupport(),
      
      // CSS 特性
      cssGrid: this.checkCSSGridSupport(),
      cssVariables: this.checkCSSVariablesSupport(),
      flexbox: this.checkFlexboxSupport(),
      
      // 性能相关
      performanceAPI: this.checkPerformanceAPISupport(),
      intersectionObserver: this.checkIntersectionObserverSupport(),
      resizeObserver: this.checkResizeObserverSupport()
    };

    this.browser = this.detectBrowser();
    this.isCompatible = this.checkOverallCompatibility();
  }

  /**
   * 检查ES6支持
   */
  checkES6Support() {
    try {
      // 箭头函数
      eval('() => {}');
      // 模板字符串
      eval('`test`');
      // let/const
      eval('let a = 1; const b = 2;');
      // 解构
      eval('const {a, b} = {a: 1, b: 2}');
      // 类
      eval('class Test {}');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 检查ES模块支持
   */
  checkModuleSupport() {
    const script = document.createElement('script');
    return 'noModule' in script;
  }

  /**
   * 检查async/await支持
   */
  checkAsyncAwaitSupport() {
    try {
      eval('async function test() { await Promise.resolve(); }');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 检查Promise支持
   */
  checkPromiseSupport() {
    return typeof Promise !== 'undefined';
  }

  /**
   * 检查Fetch API支持
   */
  checkFetchSupport() {
    return typeof fetch !== 'undefined';
  }

  /**
   * 检查LocalStorage支持
   */
  checkLocalStorageSupport() {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 检查SessionStorage支持
   */
  checkSessionStorageSupport() {
    try {
      const test = 'test';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 检查Web Worker支持
   */
  checkWebWorkerSupport() {
    return typeof Worker !== 'undefined';
  }

  /**
   * 检查Service Worker支持
   */
  checkServiceWorkerSupport() {
    return 'serviceWorker' in navigator;
  }

  /**
   * 检查CSS Grid支持
   */
  checkCSSGridSupport() {
    const el = document.createElement('div');
    return typeof el.style.display !== 'undefined' && (
      el.style.display === 'grid' || 
      'grid' in el.style
    );
  }

  /**
   * 检查CSS变量支持
   */
  checkCSSVariablesSupport() {
    const el = document.createElement('div');
    el.style.setProperty('--test', '1');
    return el.style.getPropertyValue('--test') === '1';
  }

  /**
   * 检查Flexbox支持
   */
  checkFlexboxSupport() {
    const el = document.createElement('div');
    return 'flex' in el.style || 'webkitFlex' in el.style;
  }

  /**
   * 检查Performance API支持
   */
  checkPerformanceAPISupport() {
    return typeof performance !== 'undefined' && 
           typeof performance.now === 'function';
  }

  /**
   * 检查Intersection Observer支持
   */
  checkIntersectionObserverSupport() {
    return typeof IntersectionObserver !== 'undefined';
  }

  /**
   * 检查Resize Observer支持
   */
  checkResizeObserverSupport() {
    return typeof ResizeObserver !== 'undefined';
  }

  /**
   * 检测浏览器信息
   */
  detectBrowser() {
    const ua = navigator.userAgent;
    const browser = {
      name: 'Unknown',
      version: 'Unknown',
      engine: 'Unknown',
      os: this.detectOS()
    };

    // Chrome
    if (/Chrome\/(\d+)/.test(ua) && !/Edge|OPR/.test(ua)) {
      browser.name = 'Chrome';
      browser.version = RegExp.$1;
      browser.engine = 'Blink';
    }
    // Firefox
    else if (/Firefox\/(\d+)/.test(ua)) {
      browser.name = 'Firefox';
      browser.version = RegExp.$1;
      browser.engine = 'Gecko';
    }
    // Safari
    else if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua)) {
      browser.name = 'Safari';
      browser.version = /Version\/(\d+)/.test(ua) ? RegExp.$1 : 'Unknown';
      browser.engine = 'WebKit';
    }
    // Edge
    else if (/Edg\/(\d+)/.test(ua)) {
      browser.name = 'Edge';
      browser.version = RegExp.$1;
      browser.engine = 'Blink';
    }
    // IE
    else if (/Trident/.test(ua)) {
      browser.name = 'Internet Explorer';
      browser.version = /rv:(\d+)/.test(ua) ? RegExp.$1 : 'Unknown';
      browser.engine = 'Trident';
    }

    return browser;
  }

  /**
   * 检测操作系统
   */
  detectOS() {
    const ua = navigator.userAgent;
    const platform = navigator.platform;

    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(platform)) return 'macOS';
    if (/Linux/.test(platform)) return 'Linux';
    if (/Android/.test(ua)) return 'Android';
    if (/iOS|iPhone|iPad|iPod/.test(ua)) return 'iOS';
    
    return 'Unknown';
  }

  /**
   * 检查整体兼容性
   */
  checkOverallCompatibility() {
    // 必需的特性
    const required = [
      'es6',
      'modules',
      'promises',
      'fetch',
      'localStorage'
    ];

    return required.every(feature => this.features[feature]);
  }

  /**
   * 获取兼容性报告
   */
  getReport() {
    return {
      browser: this.browser,
      features: this.features,
      isCompatible: this.isCompatible,
      missingFeatures: this.getMissingFeatures(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * 获取缺失的特性
   */
  getMissingFeatures() {
    return Object.entries(this.features)
      .filter(([feature, supported]) => !supported)
      .map(([feature]) => feature);
  }

  /**
   * 获取建议
   */
  getRecommendations() {
    const recommendations = [];

    if (!this.isCompatible) {
      recommendations.push('您的浏览器版本过旧，建议升级到最新版本');
    }

    if (this.browser.name === 'Internet Explorer') {
      recommendations.push('Internet Explorer 已不再受支持，请使用 Chrome、Firefox、Safari 或 Edge');
    }

    if (!this.features.modules) {
      recommendations.push('您的浏览器不支持 ES 模块，某些功能可能无法正常工作');
    }

    if (!this.features.serviceWorkers && this.features.webWorkers) {
      recommendations.push('您的浏览器不支持 Service Workers，离线功能将不可用');
    }

    return recommendations;
  }

  /**
   * 显示兼容性警告
   */
  showCompatibilityWarning() {
    if (!this.isCompatible) {
      const warning = document.createElement('div');
      warning.id = 'browser-compatibility-warning';
      warning.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff6b6b;
        color: white;
        padding: 15px;
        text-align: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      
      warning.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
          <strong>浏览器兼容性警告</strong>
          <p style="margin: 5px 0;">
            您的浏览器 (${this.browser.name} ${this.browser.version}) 可能不支持本应用的某些功能。
            建议使用最新版本的 Chrome、Firefox、Safari 或 Edge 浏览器。
          </p>
          <button onclick="this.parentElement.parentElement.remove()" style="
            background: white;
            color: #ff6b6b;
            border: none;
            padding: 5px 15px;
            border-radius: 3px;
            cursor: pointer;
            margin-top: 5px;
          ">
            我知道了
          </button>
        </div>
      `;
      
      document.body.insertBefore(warning, document.body.firstChild);
    }
  }

  /**
   * 加载polyfills
   */
  async loadPolyfills() {
    const polyfills = [];

    // Promise polyfill
    if (!this.features.promises) {
      polyfills.push(
        this.loadScript('https://cdn.jsdelivr.net/npm/promise-polyfill@8/dist/polyfill.min.js')
      );
    }

    // Fetch polyfill
    if (!this.features.fetch) {
      polyfills.push(
        this.loadScript('https://cdn.jsdelivr.net/npm/whatwg-fetch@3/dist/fetch.umd.js')
      );
    }

    // Intersection Observer polyfill
    if (!this.features.intersectionObserver) {
      polyfills.push(
        this.loadScript('https://cdn.jsdelivr.net/npm/intersection-observer@0.12/intersection-observer.js')
      );
    }

    await Promise.all(polyfills);
  }

  /**
   * 动态加载脚本
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * 检查是否为移动设备
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * 检查是否为触摸设备
   */
  isTouchDevice() {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (navigator.msMaxTouchPoints > 0);
  }

  /**
   * 获取视口信息
   */
  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      isMobile: this.isMobile(),
      isTouch: this.isTouchDevice()
    };
  }
}

// 创建单例
const browserCheck = new BrowserCompatibility();

// 自动检查并显示警告
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    browserCheck.showCompatibilityWarning();
  });
} else {
  browserCheck.showCompatibilityWarning();
}

// 导出
export default browserCheck;