#!/bin/bash

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Crawl-MCP 模拟发布流程 (仅测试，不实际发布)${NC}"

# 检查参数
if [ $# -eq 0 ]; then
    echo -e "${RED}错误: 请指定版本类型 (patch|minor|major)${NC}"
    echo "使用方法: ./scripts/simulate-publish.sh <patch|minor|major>"
    exit 1
fi

VERSION_TYPE=$1

echo -e "${YELLOW}📋 模拟发布 $VERSION_TYPE 版本...${NC}"

# 1. 检查项目结构
echo -e "${YELLOW}1. 检查项目结构...${NC}"
REQUIRED_FILES=("package.json" "README.md" "LICENSE" "src/" "dist/")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -e "$file" ]; then
        echo -e "${GREEN}✓ $file 存在${NC}"
    else
        echo -e "${RED}✗ $file 缺失${NC}"
    fi
done

# 2. 安装依赖
echo -e "${YELLOW}2. 安装依赖...${NC}"
pnpm install

# 3. 运行测试
echo -e "${YELLOW}3. 运行测试...${NC}"
pnpm test

# 4. 构建项目
echo -e "${YELLOW}4. 构建项目...${NC}"
pnpm build

# 5. 检查构建结果
echo -e "${YELLOW}5. 检查构建结果...${NC}"
if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✓ 构建成功: dist/index.js${NC}"
    echo -e "${BLUE}  文件大小: $(ls -lh dist/index.js | awk '{print $5}')${NC}"
else
    echo -e "${RED}✗ 构建失败${NC}"
    exit 1
fi

# 6. 预览发布内容
echo -e "${YELLOW}6. 预览发布内容...${NC}"
echo -e "${BLUE}将要发布的文件:${NC}"
npm pack --dry-run

# 7. 模拟版本更新
echo -e "${YELLOW}7. 模拟版本更新 ($VERSION_TYPE)...${NC}"
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}当前版本: $CURRENT_VERSION${NC}"

# 计算新版本号
if [ "$VERSION_TYPE" = "patch" ]; then
    NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')
elif [ "$VERSION_TYPE" = "minor" ]; then
    NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$(NF-1) = $(NF-1) + 1; $NF = 0;} 1' | sed 's/ /./g')
elif [ "$VERSION_TYPE" = "major" ]; then
    NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$1 = $1 + 1; $2 = 0; $3 = 0;} 1' | sed 's/ /./g')
fi

echo -e "${GREEN}新版本: $NEW_VERSION${NC}"

# 8. 模拟npm发布
echo -e "${YELLOW}8. 模拟npm发布...${NC}"
echo -e "${BLUE}模拟命令: npm publish${NC}"
echo -e "${GREEN}✓ 模拟发布成功！${NC}"

# 9. 显示使用说明
echo -e "\n${GREEN}🎉 模拟发布完成！${NC}"
echo -e "${BLUE}如果这是真实发布，用户将可以通过以下方式使用:${NC}"
echo -e "   ${YELLOW}npx crawl-mcp-server@$NEW_VERSION${NC}"
echo -e "   ${YELLOW}npx crawl-mcp-server@latest${NC}"

echo -e "\n${BLUE}📋 Cursor MCP 配置示例:${NC}"
cat << EOF
{
  "mcpServers": {
    "crawl-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "crawl-mcp-server@$NEW_VERSION"
      ],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
EOF

echo -e "\n${YELLOW}⚠️ 注意：这只是模拟流程，没有实际发布到npm${NC}"
echo -e "${BLUE}要进行实际发布，请先运行: npm login${NC}"
echo -e "${BLUE}然后运行: ./scripts/publish.sh $VERSION_TYPE${NC}" 