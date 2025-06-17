#!/bin/bash

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${RED}错误: 请指定版本类型 (patch|minor|major)${NC}"
    echo "使用方法: ./scripts/publish.sh <patch|minor|major>"
    exit 1
fi

VERSION_TYPE=$1

echo -e "${BLUE}🔧 开始 Crawl-MCP 发布流程...${NC}"

# 1. 检查工作目录是否干净
echo -e "${YELLOW}📋 检查Git状态...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}错误: 工作目录不干净，请先提交所有更改${NC}"
    git status
    exit 1
fi

# 2. 检查当前分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}警告: 当前不在主分支 ($CURRENT_BRANCH)${NC}"
    read -p "是否继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 3. 拉取最新代码
echo -e "${YELLOW}📥 拉取最新代码...${NC}"
git pull origin $CURRENT_BRANCH

# 4. 安装依赖
echo -e "${YELLOW}📦 安装依赖...${NC}"
pnpm install

# 5. 运行测试
echo -e "${YELLOW}🧪 运行测试...${NC}"
pnpm test

# 6. 构建项目
echo -e "${YELLOW}🏗️ 构建项目...${NC}"
pnpm build

# 7. 检查构建结果
if [ ! -f "dist/index.js" ]; then
    echo -e "${RED}错误: 构建失败，找不到 dist/index.js${NC}"
    exit 1
fi

# 8. 预览发布内容
echo -e "${YELLOW}👀 预览发布内容...${NC}"
npm pack --dry-run

# 9. 确认发布
echo -e "${YELLOW}📝 即将发布 $VERSION_TYPE 版本${NC}"
read -p "确认发布? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}取消发布${NC}"
    exit 0
fi

# 10. 更新版本
echo -e "${YELLOW}📝 更新版本...${NC}"
npm version $VERSION_TYPE

# 11. 发布到npm
echo -e "${YELLOW}🚀 发布到 npm...${NC}"
npm publish

# 12. 推送到Git
echo -e "${YELLOW}📤 推送到 Git...${NC}"
git push
git push --tags

# 13. 获取新版本号
NEW_VERSION=$(node -p "require('./package.json').version")

echo -e "${GREEN}✅ 发布完成！${NC}"
echo -e "${GREEN}📦 版本: $NEW_VERSION${NC}"
echo -e "${GREEN}🔗 NPM: https://www.npmjs.com/package/crawl-mcp-server${NC}"
echo -e "${GREEN}💾 Git: $(git config --get remote.origin.url)${NC}"

echo -e "${BLUE}📋 用户现在可以通过以下方式使用:${NC}"
echo -e "   ${YELLOW}npx crawl-mcp-server@$NEW_VERSION${NC}"
echo -e "   ${YELLOW}npx crawl-mcp-server@latest${NC}" 