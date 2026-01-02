#!/bin/bash

# 设置开机自启脚本
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="glifeist"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "设置 $SERVICE_NAME 开机自启..."

# 检查是否有权限
if [ "$EUID" -ne 0 ]; then
    echo "请以 root 权限运行此脚本"
    exit 1
fi

# 创建服务文件
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=GLifeist Application Service
After=network.target

[Service]
Type=forking
User=www-data
WorkingDirectory=$SCRIPT_DIR
EnvironmentFile=$SCRIPT_DIR/.env
ExecStart=/bin/bash -c 'cd $SCRIPT_DIR && ./service.sh start'
ExecStop=/bin/bash -c 'cd $SCRIPT_DIR && ./service.sh stop'
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 重新加载 systemd 配置
systemctl daemon-reload

# 启用服务
systemctl enable "$SERVICE_NAME"

echo "开机自启设置完成！"
echo "服务管理命令："
echo "  systemctl start $SERVICE_NAME    - 启动服务"
echo "  systemctl stop $SERVICE_NAME     - 停止服务"
echo "  systemctl restart $SERVICE_NAME  - 重启服务"
echo "  systemctl status $SERVICE_NAME   - 查看状态"
