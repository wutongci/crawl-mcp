/**
 * Jest 测试设置文件
 */

// 设置测试超时时间
jest.setTimeout(30000);

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.CRAWL_LOG_LEVEL = 'error'; // 测试时减少日志输出
process.env.CRAWL_OUTPUT_DIR = './test-output';

// 全局测试钩子
beforeAll(() => {
    // 测试开始前的全局设置
});

afterAll(() => {
    // 测试结束后的全局清理
});

// 每个测试前的设置
beforeEach(() => {
    // 清除控制台输出（可选）
    jest.clearAllMocks();
});

// 每个测试后的清理
afterEach(() => {
    // 测试后清理
}); 