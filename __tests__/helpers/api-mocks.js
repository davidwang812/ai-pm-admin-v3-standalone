/**
 * API Mock Helpers
 * 统一的API模拟工具
 */

// Mock data factories
export const mockProviders = {
  questionAI: {
    id: 'provider-1',
    name: '提问AI',
    type: 'question',
    status: 'active',
    api_key: 'encrypted-key',
    models: ['gpt-4', 'gpt-3.5-turbo'],
    config: {
      endpoint: 'https://api.openai.com/v1',
      timeout: 30000,
      max_retries: 3
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  drawingAI: {
    id: 'provider-2',
    name: '绘图AI',
    type: 'drawing',
    status: 'active',
    api_key: 'encrypted-key',
    models: ['dall-e-3', 'dall-e-2'],
    config: {
      endpoint: 'https://api.openai.com/v1',
      timeout: 60000,
      max_retries: 2
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
};

export const mockUnifiedConfig = {
  globalParams: {
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2000,
    frequencyPenalty: 0,
    presencePenalty: 0
  },
  aiServices: {
    questionAI: {
      enabled: true,
      provider: 'openai',
      providerId: 'provider-1',
      prompt: '你是一个专业的问答助手',
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2000
    },
    drawingAI: {
      enabled: true,
      provider: 'openai',
      providerId: 'provider-2',
      prompt: '你是一个专业的绘图助手',
      temperature: 0.8,
      topP: 0.95,
      maxTokens: 1000
    }
  },
  lastUpdated: '2025-01-01T00:00:00Z'
};

export const mockCostData = {
  totalCost: 156.78,
  totalRequests: 1234,
  avgCost: 0.127,
  topService: 'questionAI',
  trends: [
    { date: '2025-01-01', cost: 20.5, requests: 150 },
    { date: '2025-01-02', cost: 25.3, requests: 200 },
    { date: '2025-01-03', cost: 30.1, requests: 250 }
  ],
  providers: [
    { name: 'OpenAI', cost: 100.5, percentage: 64.1 },
    { name: 'Google', cost: 56.28, percentage: 35.9 }
  ],
  details: [
    {
      service: 'questionAI',
      provider: 'OpenAI',
      model: 'gpt-4',
      requests: 500,
      tokens: 50000,
      cost: 50.0
    }
  ]
};

export const mockLoadBalancingConfig = {
  pools: [
    {
      id: 'pool-1',
      name: '问答服务池',
      serviceType: 'question',
      algorithm: 'round-robin',
      providers: ['provider-1', 'provider-3'],
      weights: { 'provider-1': 0.6, 'provider-3': 0.4 },
      healthCheck: {
        enabled: true,
        interval: 60000,
        timeout: 5000
      }
    }
  ],
  strategies: {
    'round-robin': { enabled: true },
    'weighted-round-robin': { enabled: true },
    'least-connections': { enabled: false },
    'response-time': { enabled: true }
  }
};

// API response builders
export function createSuccessResponse(data) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

export function createErrorResponse(message, code = 'ERROR') {
  return {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString()
    }
  };
}

// Mock API client
export class MockApiClient {
  constructor() {
    this.responses = new Map();
    this.calls = [];
    this.delays = new Map();
  }

  // Set mock response for a specific endpoint
  setMockResponse(method, endpoint, response, options = {}) {
    const key = `${method}:${endpoint}`;
    this.responses.set(key, { response, options });
    if (options.delay) {
      this.delays.set(key, options.delay);
    }
  }

  // Record API call
  recordCall(method, endpoint, data) {
    this.calls.push({
      method,
      endpoint,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Get mock response
  async getMockResponse(method, endpoint) {
    const key = `${method}:${endpoint}`;
    const mockData = this.responses.get(key);
    
    if (!mockData) {
      return createErrorResponse('No mock defined for ' + key, 'NO_MOCK');
    }

    const delay = this.delays.get(key) || 0;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const { response, options } = mockData;
    
    if (options.throwError) {
      throw new Error(options.errorMessage || 'Mock error');
    }

    return typeof response === 'function' ? response() : response;
  }

  // Create mock API methods
  async get(endpoint) {
    this.recordCall('GET', endpoint);
    return this.getMockResponse('GET', endpoint);
  }

  async post(endpoint, data) {
    this.recordCall('POST', endpoint, data);
    return this.getMockResponse('POST', endpoint);
  }

  async put(endpoint, data) {
    this.recordCall('PUT', endpoint, data);
    return this.getMockResponse('PUT', endpoint);
  }

  async delete(endpoint) {
    this.recordCall('DELETE', endpoint);
    return this.getMockResponse('DELETE', endpoint);
  }

  // Test helpers
  getCallCount(method, endpoint) {
    return this.calls.filter(call => 
      call.method === method && call.endpoint === endpoint
    ).length;
  }

  getLastCall(method, endpoint) {
    const calls = this.calls.filter(call => 
      call.method === method && call.endpoint === endpoint
    );
    return calls[calls.length - 1];
  }

  reset() {
    this.responses.clear();
    this.delays.clear();
    this.calls = [];
  }
}

// Pre-configured mock scenarios
export function setupCommonMocks(apiClient) {
  // Providers
  apiClient.setMockResponse('GET', '/admin/providers', 
    createSuccessResponse({ providers: mockProviders })
  );
  
  apiClient.setMockResponse('POST', '/admin/providers',
    createSuccessResponse({ provider: mockProviders.questionAI })
  );
  
  // Unified Config
  apiClient.setMockResponse('GET', '/admin/config/unified',
    createSuccessResponse({ config: mockUnifiedConfig })
  );
  
  apiClient.setMockResponse('POST', '/admin/config/unified',
    createSuccessResponse({ message: 'Configuration saved' })
  );
  
  // Cost Analysis
  apiClient.setMockResponse('GET', '/admin/cost-analysis',
    createSuccessResponse(mockCostData)
  );
  
  // Load Balancing
  apiClient.setMockResponse('GET', '/admin/load-balancing/config',
    createSuccessResponse({ config: mockLoadBalancingConfig })
  );
}

// Mock fetch implementation
export function createMockFetch() {
  const mockClient = new MockApiClient();
  
  return jest.fn(async (url, options = {}) => {
    const method = options.method || 'GET';
    const endpoint = url.replace(/^https?:\/\/[^\/]+/, '');
    
    try {
      const response = await mockClient.getMockResponse(method, endpoint);
      
      return {
        ok: response.success !== false,
        status: response.success !== false ? 200 : 400,
        statusText: response.success !== false ? 'OK' : 'Bad Request',
        json: async () => response,
        text: async () => JSON.stringify(response),
        headers: new Map([['content-type', 'application/json']])
      };
    } catch (error) {
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: error.message }),
        text: async () => error.message
      };
    }
  });
}

// Test data builders
export const builders = {
  provider: (overrides = {}) => ({
    ...mockProviders.questionAI,
    ...overrides
  }),
  
  config: (overrides = {}) => ({
    ...mockUnifiedConfig,
    ...overrides
  }),
  
  costData: (overrides = {}) => ({
    ...mockCostData,
    ...overrides
  }),
  
  user: (overrides = {}) => ({
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'admin',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides
  }),
  
  authToken: (overrides = {}) => ({
    token: 'test-jwt-token',
    expires_in: 3600,
    user: builders.user(),
    ...overrides
  })
};

export default {
  MockApiClient,
  createSuccessResponse,
  createErrorResponse,
  setupCommonMocks,
  createMockFetch,
  builders,
  mockProviders,
  mockUnifiedConfig,
  mockCostData,
  mockLoadBalancingConfig
};