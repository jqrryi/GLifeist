# Overview 
## A gamified life task system. Major features include:
- Gamified level and experience design
- Four task views: list, kanban, calendar, card 
- Awarding game items to self-owned private game server with GM privileges
- Game items backpack, shop, crafting plant
- Markdown editor with rich features

# 概述 
## Glifeist游戏化人生任务系统，主要功能包含：
- 游戏化等级与经验
- 任务模块含列表视图、看板视图、日历视图、卡片视图
- 可将任务完成奖励设为支持GM权限的自建游戏私服中的游戏道具
- 游戏道具背包、商店、合成工坊
- 功能丰富的Markdown编辑器
- 
## 预览
### 角色属性
<img width="1257" height="831" alt="Pasted image 20251109221335" src="https://github.com/user-attachments/assets/0a00a5b1-21db-4168-be1b-19be1025dc67" />

### 任务看板视图
<img width="1305" height="784" alt="Pasted image 20251110004137" src="https://github.com/user-attachments/assets/f418d881-e32b-4bcc-9d8b-3cb0131e6fdd" />

### 任务日历视图
<img width="1843" height="897" alt="Pasted image 20251110004306" src="https://github.com/user-attachments/assets/786c6c8d-2371-4f0f-898c-8a4a642617f5" />

### 任务卡片视图
<img width="1890" height="911" alt="Pasted image 20251110004041" src="https://github.com/user-attachments/assets/c262f87d-c236-41a5-a0b4-a92253e30e05" />

### 道具商店
<img width="1164" height="864" alt="Pasted image 20251110012649" src="https://github.com/user-attachments/assets/12319e5a-6288-49b4-ab46-7df67b38f0eb" />



# 安装部署
## 源码部署(Ubuntu)
1) 新建环境变量文件（文件名为".env"），添加以下内容：
```env
FRONTEND_PORT=3300
REACT_APP_API_URL=http://localhost:5000

BACKEND_PORT=5000
JWT_SECRET=jwt-secret-key-in-production-for-glifeist
FLASK_ENV=production
FLASK_DEBUG=False
FLASK_APP=app.py

PROJECT_DIR=/path/to/your/GLifeist_main
LOG_DIR=/var/log/glifeist
PID_DIR=/var/run/glifeist
```
*注意修改相应内容，尤其是JWT_SECRET和PROJECT_DIR

2) 项目目录下执行以下命令进行部署：
```bash
chmod +x deploy.sh #若存在文件权限问题须先赋权，以下同

./deploy.sh
```

3) 项目目录下执行以下命令进行服务管理：
```bash
./service.sh start #启动前端+后端服务
./service.sh stop #停止所有服务
./service.sh restart #重启所有服务
./service.sh status #检查服务状态
./service.sh start-frontend #启动前端服务
./service.sh start-backend #启动后端服务
./service.sh stop-frontend #停止前端服务
./service.sh stop-backend #停止后端服务
```

4) 运行开机自启脚本以设置开机自启：
```bash
./setup-autostart.sh
```
## Docker部署
- 检查docker文件并进行相应配置修改：docerk-compose.yml, Dockerfile.backend, Dockerfile.frontend
- 项目目录下执行: docker-compose up


