#!/usr/bin/env node
/**
 * 统一配置契约迁移脚本
 * 将现有配置迁移到符合数据库契约的格式
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 统一配置契约迁移工具');
console.log('========================\n');

// 读取本地存储的配置
function loadLocalConfig() {
    try {
        // 模拟从localStorage读取
        const configPath = path.join(__dirname, '../localStorage-backup.json');
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            const parsed = JSON.parse(data);
            return parsed.unified_config ? JSON.parse(parsed.unified_config) : null;
        }
    } catch (error) {
        console.error('❌ 读取本地配置失败:', error.message);
    }
    return null;
}

// 契约定义的服务映射
const SERVICE_CONTRACT_MAP = {
    // 现有服务 -> 契约服务的映射
    'questionAI': {
        contractType: 'question',
        displayName: '提问AI',
        keepOriginal: true
    },
    'assistantAI': {
        contractType: 'assist',
        displayName: '协助AI',
        keepOriginal: true
    },
    'drawingAI': {
        contractType: 'draw',
        displayName: '绘图AI',
        keepOriginal: true
    },
    'translationAI': {
        contractType: 'assist',
        displayName: '翻译AI (已合并到协助AI)',
        keepOriginal: false,
        migrateTo: 'assistantAI',
        migrationNote: '翻译功能已整合到协助AI'
    },
    'ratingAI': {
        contractType: 'assist',
        displayName: '评分AI (已合并到协助AI)',
        keepOriginal: false,
        migrateTo: 'assistantAI',
        migrationNote: '评分功能已整合到协助AI'
    }
};

// 未来计划的服务
const PLANNED_SERVICES = {
    'voiceAI': {
        contractType: 'voice',
        displayName: '语音AI',
        status: 'planned',
        estimatedLaunch: '2025-Q2',
        defaultConfig: {
            enabled: false,
            provider: 'openai',
            temperature: 0.5,
            topP: 0.9,
            maxTokens: 1000,
            prompt: '你是一个语音助手，请提供自然流畅的语音交互。'
        }
    },
    'videoAI': {
        contractType: 'video',
        displayName: '视频AI',
        status: 'planned',
        estimatedLaunch: '2025-Q3',
        defaultConfig: {
            enabled: false,
            provider: 'google',
            temperature: 0.7,
            topP: 0.95,
            maxTokens: 3000,
            prompt: '你是一个视频生成助手，请根据需求创建高质量的视频内容。'
        }
    }
};

// 执行迁移
function migrateConfig(oldConfig) {
    console.log('📋 开始迁移配置...\n');
    
    const newConfig = {
        // 保留全局参数
        globalParams: oldConfig.globalParams || {
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 2000,
            frequencyPenalty: 0,
            presencePenalty: 0,
            stream: true
        },
        
        // 迁移后的AI服务配置
        aiServices: {},
        
        // 计划中的服务
        plannedServices: {},
        
        // 迁移记录
        migrationHistory: [],
        
        // 契约信息
        contractInfo: {
            version: '1.0',
            migrationDate: new Date().toISOString(),
            complianceStatus: 'compliant',
            originalConfigBackup: {}
        },
        
        // 更新时间戳
        lastUpdated: new Date().toISOString()
    };
    
    // 处理现有服务
    for (const [serviceKey, serviceConfig] of Object.entries(oldConfig.aiServices || {})) {
        const mapping = SERVICE_CONTRACT_MAP[serviceKey];
        
        if (!mapping) {
            console.warn(`⚠️  未知服务: ${serviceKey}，跳过`);
            continue;
        }
        
        if (mapping.keepOriginal) {
            // 保留原始服务，但更新结构
            console.log(`✅ 保留服务: ${serviceKey} -> ${mapping.displayName}`);
            newConfig.aiServices[serviceKey] = {
                ...serviceConfig,
                contractType: mapping.contractType,
                displayName: mapping.displayName,
                service_type: mapping.contractType, // 契约字段
                lastMigrated: new Date().toISOString()
            };
        } else {
            // 需要迁移的服务
            console.log(`🔄 迁移服务: ${serviceKey} -> ${mapping.migrateTo}`);
            
            // 记录迁移历史
            newConfig.migrationHistory.push({
                from: serviceKey,
                to: mapping.migrateTo,
                timestamp: new Date().toISOString(),
                reason: mapping.migrationNote,
                originalConfig: serviceConfig
            });
            
            // 合并配置到目标服务
            if (!newConfig.aiServices[mapping.migrateTo]) {
                newConfig.aiServices[mapping.migrateTo] = oldConfig.aiServices[mapping.migrateTo] || {};
            }
            
            // 保存迁移的配置作为备用
            newConfig.aiServices[mapping.migrateTo][`${serviceKey}_migrated`] = {
                prompt: serviceConfig.prompt,
                temperature: serviceConfig.temperature,
                topP: serviceConfig.topP,
                maxTokens: serviceConfig.maxTokens,
                migratedAt: new Date().toISOString()
            };
        }
    }
    
    // 添加计划中的服务
    for (const [serviceKey, plannedService] of Object.entries(PLANNED_SERVICES)) {
        console.log(`📅 添加计划服务: ${serviceKey} (${plannedService.estimatedLaunch})`);
        newConfig.plannedServices[serviceKey] = plannedService;
        
        // 预创建配置结构
        newConfig.aiServices[serviceKey] = {
            ...plannedService.defaultConfig,
            contractType: plannedService.contractType,
            displayName: plannedService.displayName,
            service_type: plannedService.contractType,
            status: 'planned',
            estimatedLaunch: plannedService.estimatedLaunch
        };
    }
    
    // 保存原始配置备份
    newConfig.contractInfo.originalConfigBackup = oldConfig;
    
    return newConfig;
}

// 验证迁移后的配置
function validateMigratedConfig(config) {
    console.log('\n🔍 验证迁移后的配置...');
    
    const requiredServices = ['question', 'assist', 'draw'];
    const issues = [];
    
    // 检查必需的服务类型
    const serviceTypes = Object.values(config.aiServices)
        .map(s => s.contractType || s.service_type)
        .filter(Boolean);
    
    for (const required of requiredServices) {
        if (!serviceTypes.includes(required)) {
            issues.push(`缺少必需的服务类型: ${required}`);
        }
    }
    
    // 检查服务结构
    for (const [key, service] of Object.entries(config.aiServices)) {
        if (!service.service_type && !service.contractType) {
            issues.push(`服务 ${key} 缺少 service_type 字段`);
        }
    }
    
    if (issues.length === 0) {
        console.log('✅ 配置验证通过！');
        return true;
    } else {
        console.log('❌ 配置验证失败:');
        issues.forEach(issue => console.log(`   - ${issue}`));
        return false;
    }
}

// 保存迁移后的配置
function saveMigratedConfig(config) {
    try {
        // 保存为JSON文件
        const outputPath = path.join(__dirname, '../unified-config-migrated.json');
        fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
        console.log(`\n✅ 迁移后的配置已保存到: ${outputPath}`);
        
        // 生成迁移报告
        const report = {
            migrationDate: new Date().toISOString(),
            originalServices: Object.keys(config.contractInfo.originalConfigBackup.aiServices || {}),
            migratedServices: Object.keys(config.aiServices),
            migrationHistory: config.migrationHistory,
            plannedServices: Object.keys(config.plannedServices)
        };
        
        const reportPath = path.join(__dirname, '../migration-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 迁移报告已保存到: ${reportPath}`);
        
        return true;
    } catch (error) {
        console.error('❌ 保存配置失败:', error.message);
        return false;
    }
}

// 主函数
function main() {
    console.log('1️⃣ 加载现有配置...');
    const oldConfig = loadLocalConfig();
    
    if (!oldConfig) {
        console.log('⚠️  未找到现有配置，创建默认配置...');
        // 创建默认的符合契约的配置
        const defaultConfig = {
            globalParams: {
                temperature: 0.7,
                topP: 0.9,
                maxTokens: 2000
            },
            aiServices: {
                questionAI: {
                    enabled: true,
                    provider: 'openai',
                    contractType: 'question',
                    service_type: 'question',
                    temperature: 0.7,
                    topP: 0.9,
                    maxTokens: 2000,
                    prompt: '你是一个专业的问答助手，请提供准确、详细的回答。'
                },
                assistantAI: {
                    enabled: true,
                    provider: 'moonshot',
                    contractType: 'assist',
                    service_type: 'assist',
                    temperature: 0.7,
                    topP: 0.9,
                    maxTokens: 2000,
                    prompt: '你是一个全能助手，可以帮助用户处理各种任务和问题。'
                },
                drawingAI: {
                    enabled: true,
                    provider: 'google',
                    contractType: 'draw',
                    service_type: 'draw',
                    temperature: 0.8,
                    topP: 0.95,
                    maxTokens: 1000,
                    prompt: '你是一个图像生成助手，请根据用户描述生成高质量的图像。'
                }
            }
        };
        
        const migratedConfig = migrateConfig(defaultConfig);
        if (validateMigratedConfig(migratedConfig)) {
            saveMigratedConfig(migratedConfig);
        }
        return;
    }
    
    console.log('✅ 加载成功，发现以下服务:');
    Object.keys(oldConfig.aiServices || {}).forEach(service => {
        console.log(`   - ${service}`);
    });
    
    console.log('\n2️⃣ 执行契约迁移...');
    const migratedConfig = migrateConfig(oldConfig);
    
    console.log('\n3️⃣ 验证迁移结果...');
    if (validateMigratedConfig(migratedConfig)) {
        console.log('\n4️⃣ 保存迁移配置...');
        saveMigratedConfig(migratedConfig);
        
        console.log('\n🎉 迁移完成！');
        console.log('\n📊 迁移统计:');
        console.log(`   - 原始服务数: ${Object.keys(oldConfig.aiServices || {}).length}`);
        console.log(`   - 迁移后服务数: ${Object.keys(migratedConfig.aiServices).length}`);
        console.log(`   - 迁移记录数: ${migratedConfig.migrationHistory.length}`);
        console.log(`   - 计划服务数: ${Object.keys(migratedConfig.plannedServices).length}`);
    } else {
        console.log('\n❌ 迁移验证失败，请检查配置');
    }
}

// 运行迁移
main();