#!/bin/bash

# 项目部署脚本 - 仅用于构建和初始设置
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "项目目录: $PROJECT_DIR"

# 加载环境变量（过滤注释行）
load_env_file() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        # 逐行处理，只处理非注释且包含等号的行
        while IFS= read -r line || [ -n "$line" ]; do
            # 跳过空行和注释行
            if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*# ]] && [[ "$line" == *"="* ]]; then
                # 去除前后空格并导出
                trimmed_line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
                export "$trimmed_line"
            fi
        done < "$env_file"
    fi
}

load_env_file ".env"


# 设置默认值
FRONTEND_PORT="${FRONTEND_PORT:-3300}"
BACKEND_PORT="${BACKEND_PORT:-5000}"

# 检查是否安装了必要的工具
check_prerequisites() {
    # 尝试获取命令的绝对路径
    NODE_PATH=$(command -v node || which node)
    if [ -z "$NODE_PATH" ]; then
        echo "错误: Node.js 未安装或不在 PATH 中"
        exit 1
    fi

    NPM_PATH=$(command -v npm || which npm)
    if [ -z "$NPM_PATH" ]; then
        echo "错误: npm 未安装或不在 PATH 中"
        exit 1
    fi

    PYTHON_PATH=$(command -v python || which python)
    if [ -z "$PYTHON_PATH" ]; then
        echo "错误: Python 未安装或不在 PATH 中"
        exit 1
    fi

    PIP_PATH=$(command -v pip || which pip)
    if [ -z "$PIP_PATH" ]; then
        echo "错误: pip 未安装或不在 PATH 中"
        exit 1
    fi

    # 使用绝对路径进行检查
    if ! "$NODE_PATH" --version &> /dev/null; then
        echo "错误: Node.js 无法运行"
        exit 1
    fi

    if ! "$NPM_PATH" --version &> /dev/null; then
        echo "错误: npm 无法运行"
        exit 1
    fi

    if ! "$PYTHON_PATH" --version &> /dev/null; then
        echo "错误: Python 无法运行"
        exit 1
    fi

    if ! "$PIP_PATH" --version &> /dev/null; then
        echo "错误: pip 无法运行"
        exit 1
    fi

    # 检查是否安装了 serve（用于前端静态文件服务）
    SERVE_PATH=$(command -v serve || which serve)
    if [ -z "$SERVE_PATH" ]; then
        echo "安装 serve 以服务前端静态文件..."
        npm install -g serve
    fi

    echo "所有依赖检查通过"
}

# 安装前端依赖并构建
build_frontend() {
    echo "开始构建前端..."
    cd "$PROJECT_DIR"

    if [ ! -f "package.json" ]; then
        echo "错误: package.json 不存在"
        exit 1
    fi

    npm install
    if [ $? -ne 0 ]; then
        echo "npm install 失败"
        exit 1
    fi

    # 设置前端环境变量
    export REACT_APP_API_URL="http://localhost:$BACKEND_PORT"

    npm run build
    if [ $? -ne 0 ]; then
        echo "前端构建失败"
        exit 1
    fi

    echo "前端构建完成"
}

# 主函数
main() {
    echo "开始部署项目..."

    check_prerequisites
    build_frontend

    echo "构建完成！"
    echo "使用 ./service-manager.sh start 启动服务"
    echo "访问地址: http://localhost:$FRONTEND_PORT"
}

# 根据参数执行相应操作
case "$1" in
    *)
        main
        ;;
esac
