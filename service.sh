#!/bin/bash

# 服务管理脚本 - 仅用于启动、重启、停止服务
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

load_env_file "$SCRIPT_DIR/.env"

# 设置默认值
FRONTEND_PORT="${FRONTEND_PORT:-3300}"
BACKEND_PORT="${BACKEND_PORT:-5000}"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
LOG_DIR="${LOG_DIR:-$PROJECT_DIR/logs}"
PID_DIR="${PID_DIR:-$PROJECT_DIR/pids}"

# 创建必要的目录
mkdir -p "$LOG_DIR" "$PID_DIR"

FRONTEND_PID_FILE="$PID_DIR/frontend.pid"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_LOG="$LOG_DIR/backend.log"

# 检查服务状态
check_status() {
    echo "检查服务状态..."

    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo "前端服务运行中，PID: $FRONTEND_PID，端口: $FRONTEND_PORT"
        else
            echo "前端服务PID文件存在但进程未运行"
        fi
    else
        echo "前端服务未启动"
    fi

    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo "后端服务运行中，PID: $BACKEND_PID，端口: $BACKEND_PORT"
        else
            echo "后端服务PID文件存在但进程未运行"
        fi
    else
        echo "后端服务未启动"
    fi
}

# 启动前端服务
start_frontend() {
    echo "启动前端服务 (端口 $FRONTEND_PORT)..."

    if [ ! -d "$PROJECT_DIR/build" ]; then
        echo "错误: build 目录不存在，请先构建前端"
        return 1
    fi

    cd "$PROJECT_DIR"

    # 设置环境变量
    export REACT_APP_API_URL="http://localhost:$BACKEND_PORT"

    # 启动前端服务
    nohup serve -s build -l $FRONTEND_PORT > "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!

    echo $FRONTEND_PID > "$FRONTEND_PID_FILE"
    echo "前端服务启动，PID: $FRONTEND_PID，日志: $FRONTEND_LOG"
}

# 启动后端服务
start_backend() {
    echo "启动后端服务 (端口 $BACKEND_PORT)..."

    if [ ! -f "$PROJECT_DIR/requirements.txt" ]; then
        echo "错误: requirements.txt 不存在"
        return 1
    fi

    cd "$PROJECT_DIR"

    # 设置后端环境变量
    export FLASK_APP="${FLASK_APP:-app.py}"
    export FLASK_ENV="${FLASK_ENV:-production}"
    export FLASK_DEBUG="${FLASK_DEBUG:-False}"
    export JWT_SECRET="${JWT_SECRET:-jwt-secret-key-in-production-for-glifeist}"
    export PORT="$BACKEND_PORT"

    # 安装依赖（如果需要）
    pip install -r requirements.txt > /dev/null 2>&1

    # 启动后端服务
    nohup python app.py > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!

    echo $BACKEND_PID > "$BACKEND_PID_FILE"
    echo "后端服务启动，PID: $BACKEND_PID，日志: $BACKEND_LOG"
}

# 停止前端服务
stop_frontend() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        kill $PID 2>/dev/null
        rm -f "$FRONTEND_PID_FILE"
        echo "前端服务已停止 (PID: $PID)"
    else
        echo "前端服务未启动"
    fi
}

# 停止后端服务
stop_backend() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        kill $PID 2>/dev/null
        rm -f "$BACKEND_PID_FILE"
        echo "后端服务已停止 (PID: $PID)"
    else
        echo "后端服务未启动"
    fi
}

# 启动所有服务
start_all() {
    echo "启动所有服务..."
    start_backend
    sleep 2  # 等待后端启动
    start_frontend
    echo "所有服务启动完成"
}

# 停止所有服务
stop_all() {
    echo "停止所有服务..."
    stop_frontend
    stop_backend
    echo "所有服务已停止"
}

# 重启所有服务
restart_all() {
    echo "重启所有服务..."
    stop_all
    sleep 3
    start_all
    echo "所有服务重启完成"
}

# 主函数
case "$1" in
    "start")
        start_all
        ;;
    "start-frontend")
        start_frontend
        ;;
    "start-backend")
        start_backend
        ;;
    "stop")
        stop_all
        ;;
    "stop-frontend")
        stop_frontend
        ;;
    "stop-backend")
        stop_backend
        ;;
    "restart")
        restart_all
        ;;
    "status")
        check_status
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|start-frontend|start-backend|stop-frontend|stop-backend}"
        echo "  start          - 启动所有服务"
        echo "  stop           - 停止所有服务"
        echo "  restart        - 重启所有服务"
        echo "  status         - 检查服务状态"
        echo "  start-frontend - 仅启动前端服务"
        echo "  start-backend  - 仅启动后端服务"
        echo "  stop-frontend  - 仅停止前端服务"
        echo "  stop-backend   - 仅停止后端服务"
        exit 1
        ;;
esac
