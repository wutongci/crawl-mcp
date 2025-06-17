/**
 * CrawlMCPServer 集成测试
 * 测试MCP服务器的基本功能和组件集成
 */

describe('基础组件导入测试', () => {
    test('应该能导入所有核心组件', () => {
        expect(() => {
            require('../../src/core/CrawlMCPServer');
            require('../../src/core/CallOrchestrator');
            require('../../src/core/StateManager');
            require('../../src/adapters/MCPOutputAdapter');
            require('../../src/adapters/FileOutputAdapter');
        }).not.toThrow();
    });

    test('应该能创建基础实例', () => {
        const { MCPOutputAdapter } = require('../../src/adapters/MCPOutputAdapter');
        const { FileOutputAdapter } = require('../../src/adapters/FileOutputAdapter');
        const { StateManager } = require('../../src/core/StateManager');
        
        expect(() => {
            new MCPOutputAdapter();
            new FileOutputAdapter();
            new StateManager();
        }).not.toThrow();
    });
});

describe('工具定义验证测试', () => {
    test('应该正确导入工具定义', () => {
        const { CRAWL_TOOLS } = require('../../src/tools/toolDefinitions');
        
        expect(CRAWL_TOOLS).toBeDefined();
        expect(Array.isArray(CRAWL_TOOLS)).toBe(true);
        expect(CRAWL_TOOLS.length).toBe(3);
    });

    test('工具定义应该有正确的结构', () => {
        const { CRAWL_TOOLS } = require('../../src/tools/toolDefinitions');
        
        CRAWL_TOOLS.forEach((tool: any) => {
            expect(tool).toHaveProperty('name');
            expect(tool).toHaveProperty('description');
            expect(tool).toHaveProperty('inputSchema');
            expect(typeof tool.name).toBe('string');
            expect(typeof tool.description).toBe('string');
            expect(typeof tool.inputSchema).toBe('object');
        });
    });

    test('应该包含所有必需的工具', () => {
        const { CRAWL_TOOLS } = require('../../src/tools/toolDefinitions');
        const toolNames = CRAWL_TOOLS.map((tool: any) => tool.name);
        
        expect(toolNames).toContain('crawl_wechat_article');
        expect(toolNames).toContain('crawl_wechat_batch');
        expect(toolNames).toContain('crawl_get_status');
    });
});

describe('MCPOutputAdapter 功能测试', () => {
    let adapter: any;

    beforeEach(() => {
        const { MCPOutputAdapter } = require('../../src/adapters/MCPOutputAdapter');
        adapter = new MCPOutputAdapter();
    });

    test('应该正确转换文本为MCP格式', () => {
        const result = adapter.convertToMCPFormat('测试文本 🎯');
        
        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0]).toHaveProperty('type', 'text');
        expect(result.content[0]).toHaveProperty('text', '测试文本 🎯');
    });

    test('应该正确处理错误响应', () => {
        const result = adapter.createErrorResponse('测试错误');
        
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('isError', true);
        expect(result.content[0].text).toContain('❌');
        expect(result.content[0].text).toContain('测试错误');
    });

    test('应该验证MCP格式', () => {
        const validFormat = {
            content: [
                { type: 'text', text: '测试' }
            ]
        };
        
        const invalidFormat = {
            content: 'invalid'
        };
        
        expect(adapter.validateMCPFormat(validFormat)).toBe(true);
        expect(adapter.validateMCPFormat(invalidFormat)).toBe(false);
    });
});

describe('配置文件验证测试', () => {
    test('默认配置应该正确加载', () => {
        const { DEFAULT_CONFIG } = require('../../src/config/defaultConfig');
        
        expect(DEFAULT_CONFIG).toBeDefined();
        expect(DEFAULT_CONFIG).toHaveProperty('crawl');
        expect(DEFAULT_CONFIG).toHaveProperty('server');
        expect(DEFAULT_CONFIG).toHaveProperty('logging');
    });

    test('微信选择器配置应该正确加载', () => {
        const { WECHAT_SELECTORS } = require('../../src/config/wechatSelectors');
        
        expect(WECHAT_SELECTORS).toBeDefined();
        expect(WECHAT_SELECTORS).toHaveProperty('title');
        expect(WECHAT_SELECTORS).toHaveProperty('author');
        expect(WECHAT_SELECTORS).toHaveProperty('mainContent');
        expect(typeof WECHAT_SELECTORS.title).toBe('string');
        expect(typeof WECHAT_SELECTORS.author).toBe('string');
    });

    test('抓取策略应该正确加载', () => {
        const strategies = require('../../src/config/crawlStrategies');
        
        expect(strategies.BASIC_STRATEGY).toBeDefined();
        expect(strategies.CONSERVATIVE_STRATEGY).toBeDefined();
        expect(strategies.FAST_STRATEGY).toBeDefined();
        
        // 验证策略结构
        [strategies.BASIC_STRATEGY, strategies.CONSERVATIVE_STRATEGY, strategies.FAST_STRATEGY].forEach(strategy => {
            expect(strategy).toHaveProperty('name');
            expect(strategy).toHaveProperty('timeouts');
            expect(strategy).toHaveProperty('delays');
            expect(strategy).toHaveProperty('retries');
        });
    });
});

describe('工具导入验证测试', () => {
    test('单篇抓取工具应该正确导入', () => {
        expect(() => {
            require('../../src/tools/crawlArticleTool');
        }).not.toThrow();
    });

    test('批量抓取工具应该正确导入', () => {
        expect(() => {
            require('../../src/tools/crawlBatchTool');
        }).not.toThrow();
    });

    test('状态查询工具应该正确导入', () => {
        expect(() => {
            require('../../src/tools/crawlStatusTool');
        }).not.toThrow();
    });
});

describe('工具类功能验证测试', () => {
    test('FileManager 应该正确工作', () => {
        const { FileManager } = require('../../src/utils/FileManager');
        const fileManager = new FileManager();
        
        expect(fileManager).toBeDefined();
        expect(typeof fileManager.ensureDirectory).toBe('function');
        expect(typeof fileManager.writeFile).toBe('function');
    });

    test('UrlValidator 应该正确工作', () => {
        const { UrlValidator } = require('../../src/utils/UrlValidator');
        const validator = new UrlValidator();
        
        expect(validator).toBeDefined();
        expect(typeof validator.isValidWechatUrl).toBe('function');
        expect(typeof validator.normalizeUrl).toBe('function');
    });

    test('Logger 应该正确工作', () => {
        const { Logger } = require('../../src/utils/Logger');
        const logger = new Logger('test');
        
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.warn).toBe('function');
    });
});

describe('类型定义验证测试', () => {
    test('应该能导入所有类型定义', () => {
        expect(() => {
            require('../../src/types/crawl.types');
            require('../../src/types/mcp.types');
            require('../../src/types/playwright.types');
        }).not.toThrow();
    });
}); 