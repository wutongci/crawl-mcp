#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Crawl-MCP 发布前检查${NC}"

# 检查npm登录状态
echo -e "${YELLOW}1. 检查npm登录状态...${NC}"
if npm whoami > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 已登录npm: $(npm whoami)${NC}"
else
    echo -e "${RED}✗ 未登录npm，请运行: npm login${NC}"
    exit 1
fi

# 检查包名是否可用
echo -e "${YELLOW}2. 检查包名可用性...${NC}"
PACKAGE_NAME=$(node -p "require('./package.json').name")
if npm view $PACKAGE_NAME > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ 包名已存在: $PACKAGE_NAME${NC}"
    echo -e "${BLUE}当前版本: $(npm view $PACKAGE_NAME version)${NC}"
else
    echo -e "${GREEN}✓ 包名可用: $PACKAGE_NAME${NC}"
fi

# 检查必要文件
echo -e "${YELLOW}3. 检查必要文件...${NC}"
REQUIRED_FILES=("package.json" "README.md" "LICENSE")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file 存在${NC}"
    else
        echo -e "${RED}✗ $file 缺失${NC}"
    fi
done

# 检查构建结果
echo -e "${YELLOW}4. 检查构建结果...${NC}"
if [ -d "dist" ] && [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✓ 构建产物存在${NC}"
    echo -e "${BLUE}  构建时间: $(stat -f %Sm dist/index.js)${NC}"
else
    echo -e "${RED}✗ 构建产物缺失，请运行: pnpm build${NC}"
fi

# 检查依赖
echo -e "${YELLOW}5. 检查依赖安装...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ 依赖已安装${NC}"
else
    echo -e "${RED}✗ 依赖未安装，请运行: pnpm install${NC}"
fi

# 运行测试
echo -e "${YELLOW}6. 运行快速测试...${NC}"
if pnpm test > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 测试通过${NC}"
else
    echo -e "${RED}✗ 测试失败${NC}"
    echo -e "${BLUE}详细信息请运行: pnpm test${NC}"
fi

# 检查Git状态
echo -e "${YELLOW}7. 检查Git状态...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠ 工作目录有未提交的更改${NC}"
    git status --short
else
    echo -e "${GREEN}✓ 工作目录干净${NC}"
fi

# 预览发布内容
echo -e "${YELLOW}8. 预览发布内容...${NC}"
echo -e "${BLUE}将要发布的文件:${NC}"
npm pack --dry-run | head -20

echo -e "\n${BLUE}📋 检查完成！${NC}"
echo -e "${YELLOW}如果一切正常，可以运行发布脚本:${NC}"
echo -e "   ${GREEN}./scripts/publish.sh patch${NC} (bug修复)"
echo -e "   ${GREEN}./scripts/publish.sh minor${NC} (新功能)"  
echo -e "   ${GREEN}./scripts/publish.sh major${NC} (重大更新)" 