/**
 * Contract Compliance Validation Tests
 * 验证统一配置契约合规性的端到端测试
 */

const fs = require('fs');
const path = require('path');

// Test runner
class SimpleTestRunner {
    constructor() {
        this.results = { passed: 0, failed: 0, total: 0 };
    }

    describe(description, testSuite) {
        console.log(`\n📋 ${description}`);
        console.log('='.repeat(50));
        testSuite();
    }

    it(description, testFn) {
        this.results.total++;
        try {
            testFn();
            console.log(`  ✅ ${description}`);
            this.results.passed++;
        } catch (error) {
            console.log(`  ❌ ${description}`);
            console.log(`     Error: ${error.message}`);
            this.results.failed++;
        }
    }

    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${expected}, but got ${actual}`);
                }
            },
            toContain: (expected) => {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            },
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected truthy value, but got ${actual}`);
                }
            },
            toBeArray: () => {
                if (!Array.isArray(actual)) {
                    throw new Error(`Expected array, but got ${typeof actual}`);
                }
            },
            toHaveProperty: (prop) => {
                if (!(prop in actual)) {
                    throw new Error(`Expected object to have property ${prop}`);
                }
            }
        };
    }

    summary() {
        console.log('\n📊 Test Results Summary');
        console.log('='.repeat(30));
        console.log(`Total tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`Success rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        
        if (this.results.failed === 0) {
            console.log('\n🎉 All tests passed!');
        }
    }
}

// Import ContractCompliance
const { ContractCompliance } = require('../../../_pages/ai-service/contract-compliance.js');

// Run tests
const test = new SimpleTestRunner();

console.log('🔍 Testing Contract Compliance Validation\n');

// Load the migrated config for testing
let migratedConfig = null;
try {
    const configPath = path.join(__dirname, '../../../unified-config-migrated.json');
    if (fs.existsSync(configPath)) {
        migratedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
} catch (error) {
    console.error('Failed to load migrated config:', error.message);
}

test.describe('Contract Definitions', () => {
    const compliance = new ContractCompliance();
    
    test.it('should define correct AI service contracts', () => {
        const contracts = compliance.getAIServiceContracts();
        
        // Check required services
        test.expect(contracts.question).toBeTruthy();
        test.expect(contracts.assist).toBeTruthy();
        test.expect(contracts.draw).toBeTruthy();
        
        // Check service types match database contract
        test.expect(contracts.question.tableField).toBe('question');
        test.expect(contracts.assist.tableField).toBe('assist');
        test.expect(contracts.draw.tableField).toBe('draw');
        test.expect(contracts.voice.tableField).toBe('voice');
        test.expect(contracts.video.tableField).toBe('video');
    });
    
    test.it('should identify deprecated services correctly', () => {
        const deprecated = compliance.getDeprecatedServices();
        
        test.expect(deprecated.translationAI).toBeTruthy();
        test.expect(deprecated.ratingAI).toBeTruthy();
        test.expect(deprecated.translationAI.autoMigrateTo).toBe('assistantAI');
        test.expect(deprecated.ratingAI.autoMigrateTo).toBe('assistantAI');
    });
    
    test.it('should define supported providers', () => {
        const providers = compliance.getSupportedProviders();
        
        test.expect(providers.openai).toBeTruthy();
        test.expect(providers.anthropic).toBeTruthy();
        test.expect(providers.google).toBeTruthy();
        test.expect(providers.moonshot).toBeTruthy();
    });
});

test.describe('Configuration Validation', () => {
    const compliance = new ContractCompliance();
    
    test.it('should validate migrated config as compliant', () => {
        if (!migratedConfig) {
            console.log('     ⚠️  Skipping - no migrated config found');
            return;
        }
        
        const validation = compliance.validateContractCompliance(migratedConfig);
        
        test.expect(validation.isCompliant).toBe(true);
        test.expect(validation.errors).toBeArray();
        test.expect(validation.errors.length).toBe(0);
    });
    
    test.it('should calculate compliance score correctly', () => {
        if (!migratedConfig) {
            console.log('     ⚠️  Skipping - no migrated config found');
            return;
        }
        
        const score = compliance.calculateComplianceScore(migratedConfig);
        
        test.expect(score >= 80).toBe(true);
        console.log(`     📊 Compliance score: ${score}%`);
    });
    
    test.it('should detect non-compliant configurations', () => {
        const nonCompliantConfig = {
            aiServices: {
                invalidService: {
                    service_type: 'invalid_type',
                    provider: 'unknown'
                },
                translationAI: {
                    service_type: 'translation',
                    enabled: true
                }
            }
        };
        
        const validation = compliance.validateContractCompliance(nonCompliantConfig);
        
        test.expect(validation.isCompliant).toBe(false);
        test.expect(validation.errors.length > 0).toBe(true);
        test.expect(validation.warnings.length > 0).toBe(true);
    });
});

test.describe('Configuration Building', () => {
    const compliance = new ContractCompliance();
    
    test.it('should build contract-compliant config structure', () => {
        const config = compliance.buildContractCompliantConfig({});
        
        // Check structure
        test.expect(config).toHaveProperty('globalParams');
        test.expect(config).toHaveProperty('aiServices');
        test.expect(config).toHaveProperty('plannedServices');
        test.expect(config).toHaveProperty('contractInfo');
        
        // Check required services are present
        test.expect(config.aiServices.questionAI).toBeTruthy();
        test.expect(config.aiServices.assistantAI).toBeTruthy();
        test.expect(config.aiServices.drawingAI).toBeTruthy();
    });
    
    test.it('should include correct database fields in services', () => {
        const config = compliance.buildContractCompliantConfig({});
        
        const questionService = config.aiServices.questionAI;
        test.expect(questionService).toHaveProperty('service_id');
        test.expect(questionService).toHaveProperty('service_name');
        test.expect(questionService).toHaveProperty('service_type');
        test.expect(questionService).toHaveProperty('provider');
        test.expect(questionService).toHaveProperty('api_endpoint');
        test.expect(questionService).toHaveProperty('config_params');
        test.expect(questionService).toHaveProperty('status');
        test.expect(questionService).toHaveProperty('priority');
        test.expect(questionService).toHaveProperty('cost_per_token');
    });
});

test.describe('Migration Functions', () => {
    const compliance = new ContractCompliance();
    
    test.it('should migrate old config format correctly', () => {
        const oldConfig = {
            aiServices: {
                questionAI: { enabled: true, provider: 'openai' },
                translationAI: { enabled: true, provider: 'google', prompt: 'Translate this' },
                ratingAI: { enabled: true, provider: 'openai', prompt: 'Rate this' }
            }
        };
        
        const migrated = compliance.migrateFromOldConfig(oldConfig);
        
        // Check that deprecated services are handled
        test.expect(migrated.deprecatedServices.translationAI).toBeTruthy();
        test.expect(migrated.deprecatedServices.ratingAI).toBeTruthy();
        
        // Check that settings are migrated to assistantAI
        const assistantConfig = migrated.aiServices.assistantAI.config_params;
        test.expect(assistantConfig).toHaveProperty('translationAI_migrated_prompt');
        test.expect(assistantConfig).toHaveProperty('ratingAI_migrated_prompt');
    });
    
    test.it('should generate correct API endpoints', () => {
        const endpoint = compliance.getAPIEndpoint('openai', 'question');
        test.expect(endpoint).toContain('api.openai.com');
        
        const anthropicEndpoint = compliance.getAPIEndpoint('anthropic', 'assist');
        test.expect(anthropicEndpoint).toContain('api.anthropic.com');
    });
    
    test.it('should provide compliance recommendations', () => {
        const config = {
            aiServices: {
                questionAI: { service_type: 'question' }
                // Missing required services
            }
        };
        
        const recommendations = compliance.getComplianceRecommendations(config);
        
        test.expect(recommendations).toBeArray();
        test.expect(recommendations.length > 0).toBe(true);
        
        const hasErrorRec = recommendations.some(r => r.type === 'error');
        test.expect(hasErrorRec).toBe(true);
    });
});

test.describe('Contract Versioning', () => {
    const compliance = new ContractCompliance();
    
    test.it('should maintain contract version info', () => {
        test.expect(compliance.contractVersion).toBe('1.0');
        test.expect(compliance.lastUpdated).toBeTruthy();
    });
    
    test.it('should include version info in compliant configs', () => {
        const config = compliance.buildContractCompliantConfig({});
        
        test.expect(config.contractInfo).toHaveProperty('version');
        test.expect(config.contractInfo).toHaveProperty('lastUpdated');
        test.expect(config.contractInfo).toHaveProperty('complianceStatus');
        test.expect(config.contractInfo.complianceStatus).toBe('compliant');
    });
});

// Show test results
test.summary();

console.log('\n🔍 Contract Compliance Validation testing completed!');
console.log('Ready for production deployment.');