# Console到Logger迁移计划

## 当前状态
- 发现407个console语句
- 分布在34个文件中
- 主要集中在：router.js (60个), app.js (42个), unified-config.js (53个)

## 安全迁移策略

### 第一阶段：监控和收集（不修改代码）
1. 在入口文件添加console代理
2. 收集所有console调用的统计信息
3. 在生产环境自动禁用console输出
4. 保持所有现有功能不变

### 第二阶段：渐进式替换（2-4周后）
1. 先替换新增代码中的console
2. 对每个模块单独测试后再替换
3. 保留关键调试信息
4. 添加日志级别控制

### 第三阶段：完全迁移（经过充分测试后）
1. 使用Logger完全替代console
2. 添加日志持久化
3. 实现日志分析功能

## 立即可以做的安全改进

1. **添加日志级别控制**
   ```javascript
   // 在生产环境自动禁用debug日志
   if (process.env.NODE_ENV === 'production') {
     console.debug = () => {};
   }
   ```

2. **添加错误收集**
   ```javascript
   window.addEventListener('error', (event) => {
     // 收集错误信息但不影响原有行为
     if (window.errorCollector) {
       window.errorCollector.collect(event);
     }
   });
   ```

3. **性能监控**
   - 使用Performance API
   - 不修改现有代码
   - 只添加监控层

## 风险评估
- 直接替换console：高风险，可能破坏现有功能
- 添加代理层：低风险，完全向后兼容
- 渐进式迁移：最安全，可控可回滚

## 建议
1. 先运行监控1-2周，收集数据
2. 根据实际使用情况制定详细替换计划
3. 每次只替换一个模块，充分测试
4. 保持紧急回滚方案
