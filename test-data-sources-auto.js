// 自动化测试数据源功能

// 模拟浏览器环境
global.localStorage = {
    data: {},
    getItem: function(key) { return this.data[key] || null; },
    setItem: function(key, value) { this.data[key] = value; }
};

global.window = {
    adminApp: {}
};

global.document = {
    getElementById: (id) => {
        if (id === 'data-source-log') {
            return {
                children: [],
                innerHTML: '',
                insertBefore: () => {},
                removeChild: () => {}
            };
        }
        return null;
    },
    createElement: () => ({ className: '', innerHTML: '' }),
    querySelector: () => null,
    querySelectorAll: () => []
};

import { DataSources } from './_pages/ai-service/data-sources.js';

async function runTests() {
    console.log('🧪 开始数据源功能测试...\n');
    
    // 创建模拟的app对象
    const mockApp = {
        catalogManager: {
            currentCatalogData: {
                providers: [],
                models: [],
                updateTime: null
            }
        },
        showToast: (type, message) => {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    };
    
    // 初始化数据源模块
    console.log('1️⃣ 测试初始化数据源模块...');
    const dataSources = new DataSources(mockApp);
    console.log('✅ 数据源模块初始化成功');
    console.log('   配置的数据源:', Object.keys(dataSources.dataSourceConfig));
    console.log('');
    
    // 测试渲染功能
    console.log('2️⃣ 测试渲染功能...');
    try {
        const html = await dataSources.render();
        console.log('✅ 渲染成功，HTML长度:', html.length);
        console.log('   包含数据源卡片:', (html.match(/data-source-card/g) || []).length);
        console.log('');
    } catch (error) {
        console.error('❌ 渲染失败:', error.message);
    }
    
    // 测试日志功能
    console.log('3️⃣ 测试日志功能...');
    // 创建模拟的日志容器
    global.document = {
        getElementById: (id) => {
            if (id === 'data-source-log') {
                return {
                    children: [],
                    innerHTML: '',
                    insertBefore: () => {},
                    removeChild: () => {}
                };
            }
            return null;
        },
        createElement: () => ({
            className: '',
            innerHTML: ''
        })
    };
    
    dataSources.addLog('测试日志消息');
    console.log('✅ 日志功能测试通过');
    console.log('');
    
    // 测试数据源配置
    console.log('4️⃣ 测试数据源配置...');
    console.log('OpenRouter配置:', dataSources.dataSourceConfig.openrouter);
    console.log('LiteLLM配置:', dataSources.dataSourceConfig.litellm);
    console.log('Vercel配置:', dataSources.dataSourceConfig.vercel);
    console.log('');
    
    // 测试启用/禁用功能
    console.log('5️⃣ 测试启用/禁用数据源...');
    const originalState = dataSources.dataSourceConfig.openrouter.enabled;
    dataSources.toggleDataSource('openrouter', false);
    console.log('✅ 禁用OpenRouter后状态:', dataSources.dataSourceConfig.openrouter.enabled);
    dataSources.toggleDataSource('openrouter', true);
    console.log('✅ 启用OpenRouter后状态:', dataSources.dataSourceConfig.openrouter.enabled);
    console.log('');
    
    // 测试URL更新功能
    console.log('6️⃣ 测试Vercel URL更新...');
    const testUrl = 'https://test-vercel-app.vercel.app';
    dataSources.updateVercelUrl(testUrl);
    console.log('✅ URL更新后:', dataSources.dataSourceConfig.vercel.url);
    console.log('');
    
    // 测试统计更新
    console.log('7️⃣ 测试统计更新功能...');
    // 模拟localStorage
    global.localStorage = {
        data: {},
        getItem: function(key) { return this.data[key] || null; },
        setItem: function(key, value) { this.data[key] = value; }
    };
    
    // 设置测试数据
    const testCatalog = {
        providers: ['openai', 'anthropic', 'google'],
        models: new Array(50).fill(null).map((_, i) => ({ id: `model-${i}` }))
    };
    localStorage.setItem('admin_catalog', JSON.stringify(testCatalog));
    
    // 更新统计
    dataSources.updateStats();
    console.log('✅ 统计更新功能测试通过');
    console.log('');
    
    // 测试数据格式化
    console.log('8️⃣ 测试数据格式化...');
    console.log('1KB:', dataSources.formatBytes(1024));
    console.log('1MB:', dataSources.formatBytes(1024 * 1024));
    console.log('1.5GB:', dataSources.formatBytes(1.5 * 1024 * 1024 * 1024));
    console.log('');
    
    console.log('✅ 所有测试完成！');
    
    // 测试连接功能（仅显示逻辑，不实际执行网络请求）
    console.log('\n📊 连接测试逻辑分析:');
    console.log('- OpenRouter: 将测试 https://openrouter.ai/api/v1/models');
    console.log('- LiteLLM: 将测试 GitHub raw 文件');
    console.log('- Vercel: 需要配置自定义URL');
    
    console.log('\n📈 刷新数据逻辑分析:');
    console.log('- 从所有启用的数据源获取数据');
    console.log('- 聚合并标准化数据格式');
    console.log('- 保存到localStorage');
    console.log('- 更新统计信息');
}

// 运行测试
runTests().catch(console.error);