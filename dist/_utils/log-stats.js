
// 日志统计工具 - 不影响现有功能
window.logStats = {
  counts: {
    log: 0,
    error: 0,
    warn: 0,
    info: 0,
    debug: 0
  },
  
  init() {
    const methods = ['log', 'error', 'warn', 'info', 'debug'];
    methods.forEach(method => {
      const original = console[method];
      console[method] = function(...args) {
        window.logStats.counts[method]++;
        return original.apply(console, args);
      };
    });
  },
  
  report() {
    console.table(this.counts);
    const total = Object.values(this.counts).reduce((a, b) => a + b, 0);
    console.log(`Total console calls: ${total}`);
  }
};

// 自动初始化（仅开发环境）
if (window.location.hostname === 'localhost') {
  window.logStats.init();
}
