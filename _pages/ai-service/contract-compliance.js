/**
 * 契约合规性管理模块
 * 确保统一配置与数据库契约的一致性
 */

export class ContractCompliance {
    constructor() {
        this.contractVersion = '1.0';
        this.lastUpdated = '2025-08-05';
    }

    /**
     * AI服务契约映射 - 基于数据表结构契约
     * 参考: knowledge_graph_system（进阶版）数据表结构.mermaid
     */
    getAIServiceContracts() {
        return {
            // 契约定义的核心服务 (符合 AI_SERVICES.service_type)
            question: {
                configKey: 'questionAI',
                displayName: '提问AI',
                contractType: 'question',
                tableField: 'question',      // 对应数据表中的service_type
                required: true,
                status: 'active',
                description: '基于大语言模型的智能问答服务'
            },
            
            assist: {
                configKey: 'assistantAI', 
                displayName: '协助AI',
                contractType: 'assist',
                tableField: 'assist',
                required: true,
                status: 'active',
                description: '全能AI助手，处理各种任务和问题'
            },
            
            draw: {
                configKey: 'drawingAI',
                displayName: '绘图AI',
                contractType: 'draw',
                tableField: 'draw',
                required: true,
                status: 'active',
                description: '基于AI的图像生成和编辑服务'
            },
            
            voice: {
                configKey: 'voiceAI',
                displayName: '语音AI',
                contractType: 'voice',
                tableField: 'voice',
                required: false,
                status: 'planned',
                description: '语音合成与识别服务',
                estimatedLaunch: '2025-Q2'
            },
            
            video: {
                configKey: 'videoAI',
                displayName: '视频AI',
                contractType: 'video',
                tableField: 'video',
                required: false,
                status: 'planned',
                description: '视频生成与处理服务',
                estimatedLaunch: '2025-Q3'
            }
        };
    }

    /**
     * 废弃服务管理 - 不在数据库契约中定义的服务
     */
    getDeprecatedServices() {
        return {
            translationAI: {
                configKey: 'translationAI',
                displayName: '翻译AI',
                contractType: null,
                reason: '不在数据库契约中定义，功能已整合到assistantAI',
                deprecationDate: '2025-08-05',
                migrationGuide: '请使用协助AI的翻译功能',
                autoMigrateTo: 'assistantAI'
            },
            
            ratingAI: {
                configKey: 'ratingAI',
                displayName: '评分AI',
                contractType: null,
                reason: '不在数据库契约中定义，功能已整合到assistantAI',
                deprecationDate: '2025-08-05',
                migrationGuide: '请使用协助AI的评估功能',
                autoMigrateTo: 'assistantAI'
            }
        };
    }

    /**
     * 支持的AI服务提供商 - 基于数据库契约
     * 参考: AI_SERVICES.provider 字段定义
     */
    getSupportedProviders() {
        return {
            openai: {
                displayName: 'OpenAI',
                contractName: 'openai',
                supportedServices: ['question', 'assist'],
                costModel: 'token',
                defaultCostPerToken: 0.01
            },
            
            anthropic: {
                displayName: 'Anthropic',
                contractName: 'anthropic', 
                supportedServices: ['question', 'assist'],
                costModel: 'token',
                defaultCostPerToken: 0.012
            },
            
            google: {
                displayName: 'Google AI',
                contractName: 'google',
                supportedServices: ['question', 'assist', 'draw'],
                costModel: 'mixed',
                defaultCostPerToken: 0.008
            },
            
            moonshot: {
                displayName: 'Moonshot AI',
                contractName: 'moonshot',
                supportedServices: ['question', 'assist'],
                costModel: 'token', 
                defaultCostPerToken: 0.009
            }
        };
    }

    /**
     * 构建符合数据库契约的配置结构
     * 参考: AI_SERVICES 表结构
     */
    buildContractCompliantConfig(currentConfig = {}) {
        const contracts = this.getAIServiceContracts();
        const providers = this.getSupportedProviders();
        const deprecated = this.getDeprecatedServices();
        
        const compliantConfig = {
            // 全局参数 (与契约兼容)
            globalParams: {
                temperature: currentConfig.globalParams?.temperature || 0.7,
                topP: currentConfig.globalParams?.topP || 0.9,
                maxTokens: currentConfig.globalParams?.maxTokens || 2000
            },
            
            // 符合 AI_SERVICES 表结构的配置
            aiServices: {},
            
            // 预留服务配置
            plannedServices: {},
            
            // 废弃服务处理
            deprecatedServices: {},
            
            // 契约元信息
            contractInfo: {
                version: this.contractVersion,
                lastUpdated: new Date().toISOString(),
                complianceStatus: 'compliant',
                tableVersion: '1.0'
            }
        };

        // 处理活跃服务
        let serviceId = 1;
        for (const [contractType, contract] of Object.entries(contracts)) {
            if (contract.status === 'active') {
                const currentService = currentConfig.aiServices?.[contract.configKey] || {};
                const provider = providers[currentService.provider] || providers.openai;
                
                compliantConfig.aiServices[contract.configKey] = {
                    // AI_SERVICES 表字段
                    service_id: serviceId++,                     // bigint service_id PK
                    service_name: contract.configKey.toLowerCase(), // varchar service_name UK
                    service_type: contract.tableField,           // varchar service_type
                    provider: currentService.provider || 'openai', // varchar provider
                    api_endpoint: this.getAPIEndpoint(currentService.provider, contract.contractType), // varchar api_endpoint
                    config_params: {                             // json config_params
                        temperature: currentService.temperature || contract.defaultTemperature || 0.7,
                        topP: currentService.topP || 0.9,
                        maxTokens: currentService.maxTokens || 2000,
                        prompt: currentService.prompt || this.getDefaultPrompt(contract.contractType)
                    },
                    status: 'active',                            // enum status
                    priority: serviceId,                         // int priority  
                    cost_per_token: provider.defaultCostPerToken, // decimal cost_per_token
                    
                    // 扩展字段 (兼容当前实现)
                    enabled: currentService.enabled !== false,
                    displayName: contract.displayName,
                    contractType: contract.contractType,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            }
        }

        // 处理计划中的服务
        for (const [contractType, contract] of Object.entries(contracts)) {
            if (contract.status === 'planned') {
                compliantConfig.plannedServices[contract.configKey] = {
                    service_type: contract.tableField,
                    display_name: contract.displayName,
                    status: 'planned',
                    estimated_launch: contract.estimatedLaunch,
                    description: contract.description
                };
            }
        }

        // 处理废弃的服务
        for (const [key, service] of Object.entries(deprecated)) {
            const currentService = currentConfig.aiServices?.[service.configKey];
            if (currentService) {
                compliantConfig.deprecatedServices[service.configKey] = {
                    ...service,
                    currentConfig: currentService,
                    migrationRequired: true,
                    autoMigrationDate: this.getAutoMigrationDate()
                };
            }
        }

        return compliantConfig;
    }

    /**
     * 验证配置是否符合数据库契约
     */
    validateContractCompliance(config) {
        const errors = [];
        const warnings = [];
        
        // 验证必需的服务
        const contracts = this.getAIServiceContracts();
        const requiredServices = Object.values(contracts).filter(c => c.required);
        
        for (const service of requiredServices) {
            if (!config.aiServices?.[service.configKey]) {
                errors.push(`缺少必需的服务: ${service.displayName}`);
            }
        }
        
        // 验证服务类型
        for (const [key, service] of Object.entries(config.aiServices || {})) {
            const validTypes = Object.values(contracts).map(c => c.tableField);
            if (!validTypes.includes(service.service_type)) {
                errors.push(`服务 ${key} 的类型 ${service.service_type} 不在契约定义中`);
            }
        }
        
        // 检查废弃服务
        const deprecated = this.getDeprecatedServices();
        for (const [key, service] of Object.entries(config.aiServices || {})) {
            if (deprecated[key]) {
                warnings.push(`服务 ${key} 已废弃: ${deprecated[key].reason}`);
            }
        }
        
        return {
            isCompliant: errors.length === 0,
            errors,
            warnings,
            complianceScore: this.calculateComplianceScore(config),
            recommendations: this.getComplianceRecommendations(config)
        };
    }

    /**
     * 从旧配置格式迁移到契约合规格式
     */
    migrateFromOldConfig(oldConfig) {
        console.log('🔄 正在迁移配置到契约合规格式...');
        
        const migratedConfig = this.buildContractCompliantConfig(oldConfig);
        const deprecated = this.getDeprecatedServices();
        
        // 处理废弃服务的自动迁移 
        for (const [key, service] of Object.entries(oldConfig.aiServices || {})) {
            if (deprecated[key]) {
                const targetService = deprecated[key].autoMigrateTo;
                if (targetService && migratedConfig.aiServices[targetService]) {
                    // 合并配置到目标服务
                    migratedConfig.aiServices[targetService].config_params = {
                        ...migratedConfig.aiServices[targetService].config_params,
                        [`${key}_migrated_prompt`]: service.prompt,
                        [`${key}_migrated_settings`]: {
                            temperature: service.temperature,
                            topP: service.topP,
                            maxTokens: service.maxTokens
                        }
                    };
                }
            }
        }
        
        console.log('✅ 配置迁移完成');
        return migratedConfig;
    }

    /**
     * 获取默认提示词
     */
    getDefaultPrompt(serviceType) {
        const prompts = {
            question: '你是一个专业的问答助手，请提供准确、详细的回答。',
            assist: '你是一个全能助手，可以帮助用户处理各种任务和问题。',
            draw: '你是一个图像生成助手，请根据用户描述生成高质量的图像。',
            voice: '你是一个语音助手，请提供自然流畅的语音交互。',
            video: '你是一个视频生成助手，请根据需求创建高质量的视频内容。'
        };
        
        return prompts[serviceType] || '你是一个AI助手，请为用户提供帮助。';
    }

    /**
     * 获取API端点
     */
    getAPIEndpoint(provider, serviceType) {
        const endpoints = {
            openai: {
                question: 'https://api.openai.com/v1/chat/completions',
                assist: 'https://api.openai.com/v1/chat/completions'
            },
            anthropic: {
                question: 'https://api.anthropic.com/v1/messages',
                assist: 'https://api.anthropic.com/v1/messages'
            },
            google: {
                question: 'https://generativelanguage.googleapis.com/v1/models',
                assist: 'https://generativelanguage.googleapis.com/v1/models',
                draw: 'https://generativelanguage.googleapis.com/v1/models'
            }
        };
        
        return endpoints[provider]?.[serviceType] || '';
    }

    /**
     * 计算合规性分数
     */
    calculateComplianceScore(config) {
        const contracts = this.getAIServiceContracts();
        const requiredServices = Object.values(contracts).filter(c => c.required);
        
        let score = 0;
        const maxScore = 100;
        
        // 必需服务存在性 (40分)
        const existingRequired = requiredServices.filter(service => 
            config.aiServices?.[service.configKey]
        );
        score += (existingRequired.length / requiredServices.length) * 40;
        
        // 服务类型正确性 (30分) 
        let correctTypes = 0;
        let totalServices = 0;
        for (const service of Object.values(config.aiServices || {})) {
            totalServices++;
            const validTypes = Object.values(contracts).map(c => c.tableField);
            if (validTypes.includes(service.service_type)) {
                correctTypes++;
            }
        }
        if (totalServices > 0) {
            score += (correctTypes / totalServices) * 30;
        }
        
        // 配置完整性 (30分)
        let completeConfigs = 0;
        for (const service of Object.values(config.aiServices || {})) {
            const hasRequired = service.service_id && service.service_name && 
                              service.service_type && service.provider;
            if (hasRequired) completeConfigs++;
        }
        if (totalServices > 0) {
            score += (completeConfigs / totalServices) * 30;
        }
        
        return Math.round(score);
    }

    /**
     * 获取合规性建议
     */
    getComplianceRecommendations(config) {
        const recommendations = [];
        const validation = this.validateContractCompliance(config);
        
        if (validation.errors.length > 0) {
            recommendations.push({
                type: 'error',
                priority: 'high',
                message: '修复配置错误',
                actions: validation.errors.map(err => `解决: ${err}`)
            });
        }
        
        if (validation.warnings.length > 0) {
            recommendations.push({
                type: 'warning',
                priority: 'medium', 
                message: '处理废弃服务',
                actions: ['迁移废弃服务到推荐的替代方案']
            });
        }
        
        const score = this.calculateComplianceScore(config);
        if (score < 80) {
            recommendations.push({
                type: 'improvement',
                priority: 'low',
                message: '提升配置完整性',
                actions: ['添加缺失的配置字段', '完善服务元信息']
            });
        }
        
        return recommendations;
    }

    /**
     * 获取自动迁移日期
     */
    getAutoMigrationDate() {
        const date = new Date();
        date.setDate(date.getDate() + 30); // 30天后自动迁移
        return date.toISOString();
    }
}

export default ContractCompliance;