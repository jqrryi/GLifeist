# -*- coding: utf-8 -*-
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os, csv, json, shutil, glob,io
from datetime import datetime,timedelta, date
import threading
import time
from urllib.parse import unquote
import requests
from io import BytesIO
import base64
import re
import math
import uuid
from werkzeug.utils import secure_filename
import csv


app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {"origins": "*"},
    r"/files/images/*": {"origins": "*"}
})
app.config['JSON_AS_ASCII'] = False # 解决中文乱码
app.url_map.charset = 'utf-8'
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

# 数据文件路径
DATA_FILE = "./master_data.json"
LOGS_FILE = 'logs.json'

# 在 DATA_FILE 定义之后添加文件存储相关常量
MARKDOWN_FILES_DIR = "./files"
os.makedirs(MARKDOWN_FILES_DIR, exist_ok=True)
MARKDOWN_TREE_FILE = os.path.join(MARKDOWN_FILES_DIR, "file_tree.json")
# 图片images文件夹
IMAGES_DIR = os.path.join(MARKDOWN_FILES_DIR, "images")
os.makedirs(IMAGES_DIR, exist_ok=True)
# 日历日志文件夹
JOURNALS_DIR = os.path.join(MARKDOWN_FILES_DIR, "journals")
os.makedirs(JOURNALS_DIR, exist_ok=True)
# safe_save时检查数据完整性参数
MAX_DIFFERENT_FIELDS=2
MAX_DIFFERENT_ITEMS_PER_FIELD=10

# 备份配置
_last_backup_time = None
_backup_interval = 300  # 5分钟间隔
_max_backups = 10  # 最多保留10个备份

default_settings = {
    "defaultTaskViewMode": "list",
    "defaultBoardGroupBy": "category",
    "taskFieldSettings": {
        "category": True,
        "domain": True,
        "priority": True
    },
    "moduleOrder": ["积分", "商店", "包裹", "使用日志", "道具管理", "任务","设置"],
    "itemCategories": ["经验类", "属性类", "消耗类", "装备类", "材料类", "任务类", "未分类"],
    "taskCategories": ["主线任务", "辅线任务", "支线任务", "特殊任务"],
    "taskPriorities": ["重要且紧急", "重要不紧急", "不重要但紧急", "不重要不紧急"],
    "taskDomains": ["学习", "工作", "运动", "生活", "社交", "自修"],
    "creditTypes": ["水晶", "星钻", "魂玉", "骨贝", "源石", "灵石", "金币", "元宝"],
    "taskStatuses": ["未完成", "进行中", "重复中", "已完成"],
    "propertyCategories": ['智力','力量', '体质', '活力', '敏捷', '灵力'],  # 默认属性类别
    "characterSettings": [],  # 角色设置：积分类型、任务领域与属性类别的映射关系
}

default_tasks = []
SETTINGS_FILE = "settings.json"
_settings_cache = None
_executing_auto_tasks = False # 添加一个全局变量来防止递归调用

def generate_default_stats():
    """根据设置动态生成默认角色数据"""
    stats = ["level", "exp"]
    return {stats[0]:1, stats[1]:0}


def generate_default_credits():
    """根据设置动态生成默认积分数据"""
    settings = load_settings()
    credit_types = settings.get("creditTypes", ["水晶", "星钻", "魂玉", "骨贝", "源石", "灵石", "金币", "元宝"])
    return {credit_type: 0 for credit_type in credit_types}

def generate_default_properties():
    """根据设置动态生成默认属性数据"""
    settings = load_settings()
    property_categories = settings.get("propertyCategories", ['智力','力量', '体质', '活力', '敏捷', '灵力'])
    return {property_category : 0 for property_category in property_categories}


def generate_default_tasks():
    """根据设置动态生成默认任务数据"""
    settings = load_settings()
    # 添加默认任务
    default_tasks = [{
        "id": 1,
        "name": "初始任务",
        "description": "完成此初始任务可领取奖励",
        "task_type": "无循环",
        "max_completions": 1,
        "completed_count": 0,
        "category": "主线任务",
        "domain": "学习",
        "priority": "重要且紧急",
        "credits_reward": {credit_type: 10 for credit_type in settings["creditTypes"]},
        "items_reward": {},
        "status": "未完成",
        "start_time": datetime.now().strftime("%Y/%m/%d %H:%M:%S"),
        "complete_time": None,
        "archived": False,
        "total_completion_count": 0,
    }]
    return default_tasks


def generate_default_items():
    """根据设置动态生成默认道具数据"""
    settings = load_settings()
    credit_types = settings.get("creditTypes", ["水晶", "星钻", "魂玉", "骨贝", "源石", "灵石", "金币", "元宝"])
    item_categories = settings.get("itemCategories",
                                   ["经验类", "属性类", "消耗类", "装备类", "材料类", "任务类", "未分类"])

    # 创建默认道具，使其与实际使用的积分类型匹配
    items = {
        "经验书": {"id": 8888, "price": {credit_types[0]: 10.0}, "description": "增加经验值", "category": item_categories[0],
                   "icon": ""},
        "力量丹": {"id": 11302, "price": {credit_types[1]: 8.0}, "description": "增加力量属性", "category": item_categories[1],
                   "icon": ""},
        "生命药水": {"id": 11303, "price": {credit_types[2]: 6.0}, "description": "恢复生命值", "category": item_categories[5],
                     "icon": ""},
        "活力卷轴": {"id": 11304, "price": {credit_types[3]: 9.0}, "description": "增加活力", "category": item_categories[1],
                     "icon": ""},
        "灵魂石": {"id": 11306, "price": {credit_types[5]: 15.0}, "description": "增加灵力", "category": item_categories[1],
                   "icon": ""},
        "幸运符": {"id": 11307, "price": {credit_types[6]: 5.0}, "description": "增加幸运值", "category": item_categories[2],
                   "icon": ""},
        "魔法石": {"id": 11308, "price": {credit_types[7]: 7.0}, "description": "增加魔法能量", "category": item_categories[4],
                   "icon": ""},
        "超级经验书": {"id": 11309, "price": {credit_types[0]: 8.0, credit_types[6]: 4.0},
                       "description": "大幅增加经验值",
                       "category": item_categories[3], "icon": ""},
        "全能药水": {"id": 11310, "price": {credit_types[2]: 5.0, credit_types[3]: 5.0},
                     "description": "同时恢复生命和活力",
                     "category": item_categories[4], "icon": ""}
    }

    return items


def generate_default_conversion_rates():
    """根据设置动态生成默认转换比率"""
    settings = load_settings()
    credit_types = settings.get("creditTypes", ["智", "武", "体", "活", "敏", "灵", "A", "B"])

    # 如果积分类型数量不足，使用默认值
    if len(credit_types) < 8:
        return {
            "智→A": 1, "武→A": 1, "体→A": 1,
            "活→B": 1, "敏→B": 1, "灵→B": 1,
            "A→智": 1, "A→武": 1, "A→体": 1,
            "B→活": 1, "B→敏": 1, "B→灵": 1
        }

    # 动态生成转换比率
    rates = {}
    # 前3个转换为第7个(A)
    for i in range(3):
        rates[f"{credit_types[i]}→{credit_types[6]}"] = 1
    # 第4-6个转换为第8个(B)
    for i in range(3, 6):
        rates[f"{credit_types[i]}→{credit_types[7]}"] = 1
    # 反向转换
    rates[f"{credit_types[6]}→{credit_types[0]}"] = 1
    rates[f"{credit_types[6]}→{credit_types[1]}"] = 1
    rates[f"{credit_types[6]}→{credit_types[2]}"] = 1
    rates[f"{credit_types[7]}→{credit_types[3]}"] = 1
    rates[f"{credit_types[7]}→{credit_types[4]}"] = 1
    rates[f"{credit_types[7]}→{credit_types[5]}"] = 1

    return rates


def load_settings():
    """从文件加载设置"""
    global _settings_cache

    # 如果已有缓存，直接返回
    if _settings_cache is not None:
        return _settings_cache
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                _settings_cache = json.load(f)
                return _settings_cache
        else:
            # 如果设置文件不存在，创建默认设置文件
            save_settings(default_settings)
            _settings_cache = default_settings
            return _settings_cache
    except Exception as e:
        print(f"加载设置失败: {str(e)}")
        _settings_cache = default_settings
        return _settings_cache

def clear_settings_cache():
    """清除设置缓存，用于需要重新加载设置的场景"""
    global _settings_cache
    _settings_cache = None


def save_settings(settings):
    """保存设置到文件"""
    try:
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存设置失败: {str(e)}")
        return False



def get_default_data():
    """生成默认数据"""
    dynamic_items = generate_default_items()
    return {
        "stats": generate_default_stats(),
        "properties": generate_default_properties(),
        "credits": generate_default_credits(),
        "items": dynamic_items,
        "backpack": {item: 0 for item in dynamic_items},
        # "use_logs": [],
        "conversion_rates": generate_default_conversion_rates(),
        "tasks": generate_default_tasks()
    }



def load_data(allow_default=True):
    """从文件加载数据"""
    global _executing_auto_tasks
    try:
        data = None
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # 确保所有必需的字段都存在
            stats = data.get("stats", generate_default_stats())
            properties = data.get("properties", generate_default_properties())
            credits = data.get("credits", generate_default_credits())
            items = data.get("items", generate_default_items())
            backpack = data.get("backpack", {item: 0 for item in items})
            # use_logs = data.get("use_logs", [])
            conversion_rates = data.get("conversion_rates", generate_default_conversion_rates())
            tasks = data.get("tasks", generate_default_tasks())
            lootbox_miss_counts = data.get("lootbox_miss_counts", {})

            # 处理旧数据兼容性
            for task in tasks:
                if "task_type" not in task:
                    task["task_type"] = "无循环"
                if "completed_count" not in task:
                    task["completed_count"] = 0
                if "max_completions" not in task:
                    task["max_completions"] = 0

            result = {
                "stats": stats,
                "properties": properties,
                "credits": credits,
                "items": items,
                "backpack": backpack,
                # "use_logs": use_logs,
                # "conversion_rates": conversion_rates,
                "tasks": tasks,
                "lootbox_miss_counts":lootbox_miss_counts
            }

            # 在加载数据后执行自动任务检查（仅在非递归调用时执行）

            if not _executing_auto_tasks:
                _executing_auto_tasks = True
                try:
                    execute_daily_auto_tasks()
                finally:
                    _executing_auto_tasks = False

            return result
        else:
            # 使用动态生成的默认数据
            if allow_default:
                print("数据文件不存在，已启用默认数据")
                result = get_default_data()
                # 对于新数据也执行自动任务检查
                if not _executing_auto_tasks:
                    _executing_auto_tasks = True
                    try:
                        execute_daily_auto_tasks()
                    finally:
                        _executing_auto_tasks = False
                return result
            else:
                print(f"数据文件不存在: {DATA_FILE}")
                raise FileNotFoundError

    except Exception as e:
        # 使用动态生成的默认数据
        if allow_default:
            print(f"加载数据失败: {str(e)}\n 已启用默认数据")
            result = get_default_data()
            # 对于出错情况也执行自动任务检查
            if not _executing_auto_tasks:
                _executing_auto_tasks = True
                try:
                    execute_daily_auto_tasks()
                finally:
                    _executing_auto_tasks = False
            return result
        else:
            print(f"加载数据失败: {str(e)}")
            raise e


def get_auto_task_status():
    """获取自动任务执行状态"""
    try:
        # 使用 allow_default=False 避免递归调用
        data = load_data(allow_default=False)

        # 检查是否存在自动任务日志字段
        if "auto_task_log" not in data:
            return {}

        return data["auto_task_log"]
    except Exception as e:
        print(f"获取自动任务状态失败: {str(e)}")
        return {}


def update_auto_task_status(task_type):
    """更新自动任务执行状态"""
    try:
        data = load_data()

        # 确保自动任务日志字段存在
        if "auto_task_log" not in data:
            data["auto_task_log"] = {}

        # 更新对应任务的执行时间
        current_date = date.today().isoformat()
        if task_type == "archive":
            data["auto_task_log"]["last_archive_date"] = current_date
        elif task_type == "recycle":
            data["auto_task_log"]["last_recycle_date"] = current_date

        # 保存数据
        if safe_save_data(data):
            print(f"自动任务状态已更新: {task_type} 任务执行时间已设置为 {current_date}")
            return True
        else:
            print("保存自动任务状态失败")
            return False
    except Exception as e:
        print(f"更新自动任务状态失败: {str(e)}")
        return False


def should_execute_auto_task(task_type):
    """检查是否应该执行自动任务"""
    try:
        auto_task_log = get_auto_task_status()
        current_date = date.today().isoformat()

        # 检查对应任务的最后执行日期
        if task_type == "archive":
            last_execution_date = auto_task_log.get("last_archive_date")
        elif task_type == "recycle":
            last_execution_date = auto_task_log.get("last_recycle_date")
        else:
            return False

        # 如果最后执行日期不等于今天，则应该执行
        # 注意：这里需要判断 last_execution_date 是否存在，如果不存在则应该执行
        if last_execution_date is None:
            return True  # 从未执行过，应该执行

        return last_execution_date != current_date
    except Exception as e:
        print(f"检查自动任务执行条件失败: {str(e)}")
        # 出错时默认不执行，防止重复执行
        return False


_execute_auto_task_cnt = 0
# _should_execute_auto_task = False
# def get_bool_for_auto_task():
#     global _should_execute_auto_task
#     _should_execute_auto_task = {"bool_auto_task_archive":should_execute_auto_task("archive"),"bool_auto_task_recycle":should_execute_auto_task("recycle")}
#     return _should_execute_auto_task

def execute_daily_auto_tasks():
    """执行每日自动任务"""
    global _execute_auto_task_cnt
    try:
        if _execute_auto_task_cnt > 0:
            print("已执行过自动任务，请勿重复执行")
            return
        print("开始检查并执行每日自动任务...")


        # 标记本次执行中哪些任务被执行了
        archive_executed = False
        recycle_executed = False

        # 检查并执行批量归档任务
        if should_execute_auto_task("archive"):
            print("执行批量归档任务...")
            # 直接调用函数而不是使用API端点
            archived_count = batch_archive_tasks()
            if archived_count >= 0:  # batch_archive_tasks 返回数字
                update_auto_task_status("archive")
                archive_executed = True
                print(f"批量归档任务完成，共归档 {archived_count} 个任务")
            else:
                print("批量归档任务执行失败")
        else:
            print("今日已执行过批量归档任务，跳过执行")

        # 检查并执行循环任务刷新
        if should_execute_auto_task("recycle"):
            print("执行循环任务刷新...")
            # 直接调用函数而不是使用API端点
            updated_count = check_and_update_cycle_tasks()
            if updated_count >= 0:  # check_and_update_cycle_tasks 返回数字
                update_auto_task_status("recycle")
                recycle_executed = True
                print(f"循环任务刷新完成，共更新 {updated_count} 个任务")
            else:
                print("循环任务刷新执行失败")
        else:
            print("今日已执行过循环任务刷新，跳过执行")
        # 如果今天执行了任何任务，可以记录日志
        if archive_executed or recycle_executed:
            print(f"今日自动任务执行完成: 归档={archive_executed}, 循环刷新={recycle_executed}")

        _execute_auto_task_cnt += 1

    except Exception as e:
        print(f"执行每日自动任务时出错: {str(e)}")


def save_data(data):
    """保存数据到文件"""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存数据失败: {str(e)}")
        return False


def safe_save_data(data,max_different_fields=2, max_different_items_per_field=10, enable_single_field_max_check=True,skip_check=False):
    """带内容完整性检查的安全数据保存"""
    try:
        max_different_fields = MAX_DIFFERENT_FIELDS if MAX_DIFFERENT_FIELDS else max_different_fields
        max_different_items_per_field = MAX_DIFFERENT_ITEMS_PER_FIELD if MAX_DIFFERENT_ITEMS_PER_FIELD else max_different_items_per_field

        # 加载原始数据用于对比
        original_data = load_data(allow_default=False)

        # 验证数据结构完整性
        validate_data_structure(data)

        # 验证内容完整性
        is_valid, info = check_content_integrity(original_data, data,max_different_fields=max_different_fields, max_different_items_per_field=max_different_items_per_field,enable_single_field_max_check=enable_single_field_max_check,skip_check=skip_check)
        if not is_valid:
            error_msg = f"数据内容完整性验证失败: 超过阈值的字段数量={info['different_fields_count']}, " \
                        f"最大允许字段数={info['max_allowed_different_fields']}"
            raise ValueError(error_msg)

        # 智能备份
        backup_file = smart_backup_data()

        # 保存数据
        if save_data(data):
            return True
        else:
            # 如果保存失败，尝试从备份恢复
            if backup_file:
                restore_data_from_backup(backup_file)
            return False

    except ValueError as e:
        print(f"数据验证失败: {str(e)}")
        return False
    except Exception as e:
        print(f"保存数据时发生错误: {str(e)}")
        return False

# 数据备份机制

def backup_data():
    """创建数据备份"""
    try:
        if os.path.exists(DATA_FILE):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = f"{DATA_FILE}.backup_{timestamp}"
            shutil.copy2(DATA_FILE, backup_file)
            print(f"数据备份创建成功: {backup_file}")
            return backup_file
        return None
    except Exception as e:
        print(f"创建数据备份失败: {str(e)}")
        return None

def smart_backup_data():
    """智能备份：结合时间间隔控制和数量限制"""
    global _last_backup_time

    try:
        if not os.path.exists(DATA_FILE):
            return None

        current_time = time.time()

        # 检查是否需要创建新备份
        should_backup = False
        if _last_backup_time is None:
            should_backup = True  # 首次备份
        elif (current_time - _last_backup_time) >= _backup_interval:
            should_backup = True  # 超过时间间隔
        else:
            print("跳过备份：距离上次备份时间不足")
            return None

        if should_backup:
            # 创建新备份
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = f"{DATA_FILE}.backup_{timestamp}"
            shutil.copy2(DATA_FILE, backup_file)
            _last_backup_time = current_time
            print(f"数据备份创建成功: {backup_file}")

            # 清理旧备份
            cleanup_old_backups()

            return backup_file

    except Exception as e:
        print(f"创建数据备份失败: {str(e)}")
        return None


def cleanup_old_backups():
    """清理旧的备份文件"""
    try:
        backup_pattern = f"{DATA_FILE}.backup_*"
        backup_files = glob.glob(backup_pattern)

        # 按修改时间排序（最新的在前）
        backup_files.sort(key=os.path.getmtime, reverse=True)

        # 删除超过最大数量的旧备份
        for old_backup in backup_files[_max_backups:]:
            try:
                os.remove(old_backup)
                print(f"删除旧备份文件: {old_backup}")
            except Exception as e:
                print(f"删除备份文件失败 {old_backup}: {str(e)}")

    except Exception as e:
        print(f"清理旧备份文件时出错: {str(e)}")


def restore_data_from_backup(backup_file):
    """从备份恢复数据"""
    try:
        if os.path.exists(backup_file):
            shutil.copy2(backup_file, DATA_FILE)
            print(f"数据从备份恢复成功: {backup_file}")
            return True
        return False
    except Exception as e:
        print(f"从备份恢复数据失败: {str(e)}")
        return False

# 在 load_data 函数之后添加文件管理相关函数
def load_file_tree():
    """加载文件树结构"""
    try:
        if os.path.exists(MARKDOWN_TREE_FILE):
            with open(MARKDOWN_TREE_FILE, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:  # 检查文件是否为空
                    return json.loads(content)
                else:
                    # 文件存在但为空，创建默认结构
                    default_tree = create_default_file_tree()
                    save_file_tree(default_tree)
                    return default_tree
        else:
            # 文件不存在，创建默认文件树
            default_tree = create_default_file_tree()
            save_file_tree(default_tree)
            return default_tree
    except json.JSONDecodeError as e:
        print(f"文件树JSON格式错误: {str(e)}")
        # 创建新的默认文件树
        default_tree = create_default_file_tree()

        save_file_tree(default_tree)
        return default_tree
    except Exception as e:
        print(f"加载文件树失败: {str(e)}")
        # 返回默认文件树结构
        return create_default_file_tree()

def create_default_file_tree():
    """创建默认文件树结构"""
    return [
        {
            "id": "root",
            "name": "备忘录",
            "type": "folder",
            "children": [
                {
                    "id": "welcome",
                    "name": "欢迎使用.md",
                    "type": "file",
                    "content": "# 欢迎使用笔记备忘录\n\n这是一个功能强大的 Markdown 编辑器，开始创建您的第一个文档吧！",
                    "createdAt": datetime.now().isoformat(),
                    "updatedAt": datetime.now().isoformat()
                }
            ],
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }
    ]



# 如果文件树文件不存在，创建一个空的
if not os.path.exists(MARKDOWN_TREE_FILE):
    default_tree = create_default_file_tree()
    try:
        with open(MARKDOWN_TREE_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_tree, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"创建默认文件树文件失败: {str(e)}")

def save_file_tree(tree):
    """保存文件树结构"""
    try:
        print("正在保存文件树结构...")
        with open(MARKDOWN_TREE_FILE, 'w', encoding='utf-8') as f:
            json.dump(tree, f, ensure_ascii=False, indent=2)
        print("文件树保存成功")
        return True
    except Exception as e:
        print(f"保存文件树失败: {str(e)}")
        return False

def get_file_path(file_id):
    """获取文件在磁盘上的路径"""
    return os.path.join(MARKDOWN_FILES_DIR, f"{file_id}.md")

def get_journal_path(file_id):
    """获取JNL文件在磁盘上的路径"""
    return os.path.join(JOURNALS_DIR, f"{file_id}.md")


def load_file_content(file_id):
    """加载文件内容"""
    try:
        file_path = get_file_path(file_id)
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        return ""
    except Exception as e:
        print(f"加载文件内容失败: {str(e)}")
        return ""

def save_file_content(file_id, content):
    """保存文件内容"""
    try:
        file_path = get_file_path(file_id)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"保存文件内容失败: {str(e)}")
        return False

def delete_file_content(file_id):
    """删除文件内容"""
    try:
        file_path = get_file_path(file_id)
        if os.path.exists(file_path):
            os.remove(file_path)
        return True
    except Exception as e:
        print(f"删除文件内容失败: {str(e)}")
        return False

# 添加数据完整性检查函数
def validate_data_structure(data):
    """验证数据结构的完整性"""
    required_fields = ["stats", "properties", "credits", "items", "backpack",  "tasks"]

    # 检查必需字段是否存在
    for field in required_fields:
        if field not in data:
            raise ValueError(f"缺少必需字段: {field}")

    # 验证 properties 是否为列表
    if not isinstance(data.get("properties", {}), dict):
        raise ValueError("properties 必须是字典类型")

    # 验证 credits 是否为字典
    if not isinstance(data.get("credits", {}), dict):
        raise ValueError("credits 必须是字典类型")

    # 验证 tasks 是否为列表
    if not isinstance(data.get("tasks", []), list):
        raise ValueError("tasks 必须是列表类型")

    return True

# 添加图片文件管理函数
def get_used_images_in_notes():
    """获取所有笔记中引用的图片文件名"""
    try:
        used_images = set()
        tree = load_file_tree()

        def extract_images_from_node(node):
            if node["type"] == "file":
                content = load_file_content(node["id"])
                # 查找Markdown图片语法 ![alt](url)
                import re
                image_patterns = re.findall(r'!\[.*?\]\((.*?)\)', content)
                for url in image_patterns:
                    # 如果是本地图片URL，提取文件名
                    if '/files/images/' in url:
                        filename = url.split('/')[-1]
                        used_images.add(filename)
            elif node["type"] == "folder" and "children" in node:
                for child in node["children"]:
                    extract_images_from_node(child)

        for node in tree:
            extract_images_from_node(node)

        return list(used_images)
    except Exception as e:
        print(f"获取使用中的图片失败: {str(e)}")
        return []

def get_all_image_files():
    """获取所有图片文件"""
    try:
        image_files = []
        if os.path.exists(IMAGES_DIR):
            for filename in os.listdir(IMAGES_DIR):
                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp')):
                    file_path = os.path.join(IMAGES_DIR, filename)
                    image_files.append({
                        "name": filename,
                        "size": os.path.getsize(file_path),
                        "modified": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                    })
        return image_files
    except Exception as e:
        print(f"获取图片文件列表失败: {str(e)}")
        return []


# def check_content_integrity(original_data, new_data):
#     """检查数据内容完整性，通过关键字段对比验证"""
#
#     # 提取原始数据的关键内容
#     original_items_keys = set(original_data.get("items", {}).keys())
#     original_task_names = set(task.get("name", "") for task in original_data.get("tasks", []))
#
#     # 提取新数据的关键内容
#     new_items_keys = set(new_data.get("items", {}).keys())
#     new_task_names = set(task.get("name", "") for task in new_data.get("tasks", []))
#
#     # 计算相似度（简单对比方法）
#     items_similarity = calculate_simple_similarity(original_items_keys, new_items_keys)
#     tasks_similarity = calculate_simple_similarity(original_task_names, new_task_names)
#
#     # 设定阈值（可根据需要调整）
#     threshold = 0.8
#
#     if items_similarity < threshold or tasks_similarity < threshold:
#         return False, {
#             "items_similarity": items_similarity,
#             "tasks_similarity": tasks_similarity,
#             "threshold": threshold
#         }
#
#     return True, {
#         "items_similarity": items_similarity,
#         "tasks_similarity": tasks_similarity
#     }
#
# def calculate_simple_similarity(set1, set2):
#     """计算两个集合的简单相似度"""
#     if not set1 and not set2:
#         return 1.0
#
#     if not set1 or not set2:
#         return 0.0
#
#     # 使用交集与并集的比例作为相似度
#     intersection = len(set1.intersection(set2))
#     union = len(set1.union(set2))
#
#     return intersection / union if union > 0 else 0.0


def check_content_integrity(original_data, new_data, max_different_fields=2, max_different_items_per_field=100, enable_single_field_max_check=True, skip_check=False):
    """检查数据内容完整性，通过字段数据项数量差异验证"""

    # 如果明确要求跳过检查，则直接返回True
    if skip_check:
        return True, {
            "message": "检查已跳过",
            "different_fields_count": 0,
            "overdifferent_fields_count": 0
        }

    # 定义需要检查的关键字段
    key_fields = ["items", "tasks"]

    # 定义阈值
    max_different_fields = max_different_fields  # A阈值: 允许有差异的字段数量
    max_different_items_per_field = max_different_items_per_field  # B阈值: 单个字段下允许的最大差异数

    # 统计各字段的数据项数量
    field_differences = {}

    # 通用字段检查逻辑
    for field in key_fields:
        original_field_data = original_data.get(field, {})
        new_field_data = new_data.get(field, {})

        # 根据数据类型计算数量
        if isinstance(original_field_data, dict):
            original_count = len(original_field_data.keys())
        elif isinstance(original_field_data, list):
            original_count = len(original_field_data)
        else:
            original_count = 1 if original_field_data else 0

        if isinstance(new_field_data, dict):
            new_count = len(new_field_data.keys())
        elif isinstance(new_field_data, list):
            new_count = len(new_field_data)
        else:
            new_count = 1 if new_field_data else 0

        # 计算差异
        difference = abs(original_count - new_count)
        field_differences[field] = {
            "original_count": original_count,
            "new_count": new_count,
            "difference": difference
        }

    # 统计有差异的字段数量
    different_fields_count = 0
    overdifferent_fields_count = 0

    for field in key_fields:
        difference = field_differences[field]["difference"]
        if difference > 0:
            different_fields_count += 1
        if enable_single_field_max_check:
            if difference > max_different_items_per_field:
                overdifferent_fields_count += 1

    # 检查是否违反阈值规则
    # 条件1: 有差异的字段数量超过A阈值（差异大于0的字段数超过A）
    # 条件2: 单字段差异数超过B阈值（差异大于B阈值的字段数超过1）
    if different_fields_count > max_different_fields or overdifferent_fields_count > 0:
        return False, {
            "field_differences": field_differences,
            "different_fields_count": different_fields_count,
            "overdifferent_fields_count": overdifferent_fields_count,
            "max_allowed_different_fields": max_different_fields,
            "max_allowed_difference_per_field": max_different_items_per_field
        }

    return True, {
        "field_differences": field_differences,
        "different_fields_count": different_fields_count,
        "overdifferent_fields_count": overdifferent_fields_count
    }

# API路由

# @app.route('/')
# def index():
#     return send_from_directory('build', 'index.html')
#
#
# @app.route('/static/<path:path>')
# def serve_static(path):
#     return send_from_directory('build/static', path)


@app.route('/api/settings', methods=['GET'])
def get_settings():
    """获取设置"""
    settings = load_settings()
    # 确保文件存储配置存在
    if "fileStorage" not in settings:
        settings["fileStorage"] = {"mountPath": "/files"}
    return jsonify(settings)

@app.route('/api/settings', methods=['PUT'])
def update_settings():
    """更新设置"""
    settings_data = request.json
    print("接收到的设置数据:", settings_data)  # 添加调试日志
    if save_settings(settings_data):
        # 清除缓存以确保下次加载的是最新设置
        clear_settings_cache()
        return jsonify({"message": "设置已保存"})
    else:
        return jsonify({"error": "保存设置失败"}), 500

@app.route('/')
def index():
    return jsonify({"message": "Points&Props API Server is running"})


@app.route('/api/data', methods=['GET'])
def get_data():
    """获取所有数据"""
    data = load_data()
    return jsonify(data)


@app.route('/api/character/info', methods=['PUT'])
def update_character_info():
    """更新角色信息（名称和图标）"""
    try:
        data = load_data()
        character_info = request.json

        # 确保 stats 存在
        if "stats" not in data:
            data["stats"] = {}

        # 更新角色名称
        if "name" in character_info:
            data["stats"]["name"] = character_info["name"]

        # 更新角色图标
        if "avatar" in character_info:
            data["stats"]["avatar"] = character_info["avatar"]

        # 保存数据
        if safe_save_data(data):
            return jsonify({"message": "角色信息已更新"})
        else:
            return jsonify({"error": "保存数据失败"}), 500

    except Exception as e:
        print(f"更新角色信息时发生错误: {str(e)}")
        return jsonify({"error": f"服务器内部错误: {str(e)}"}), 500

@app.route('/api/character/exp', methods=['POST'])
def add_character_exp():
    """增加角色经验值"""
    data = load_data()
    amount = request.json.get('amount', 0)

    if amount <= 0:
        return jsonify({"error": "经验值必须大于0"}), 400

    # 假设经验值存储在 credits 中的 "经验" 类型里
    if "exp" not in data["stats"]:
        data["stats"]["exp"] = 0

    exp = data["stats"]["exp"] + amount

    # 计算等级
    settings = load_settings()
    a = settings['expFormulas'].get('levelUpA',100)
    n = settings['expFormulas'].get('levelUpN', 2.5)
    level = math.floor((exp / a) ** (1 / n)) + 1

    data["stats"]["exp"] = exp
    data["stats"]["level"] = level

    if safe_save_data(data):
        return jsonify({"message": f"经验值增加{amount}点，当前总计{data['stats']['exp']}点"})
    else:
        return jsonify({"error": "保存数据失败"}), 500


@app.route('/api/character/properties/<property_category>', methods=['POST'])
def add_character_property(property_category):
    """增加角色属性点"""
    try:
        # URL解码中文字符
        property_category = unquote(property_category)
        print(f"接收到更新属性请求: {property_category}")

        data = load_data()
        amount = request.json.get('amount', 0)
        print(f"更新量: {amount}")

        if amount <= 0:
            return jsonify({"error": "属性点必须大于0"}), 400


        # 确保 properties 是一个字典
        if "properties" not in data or not isinstance(data["properties"], dict):
            data["properties"] = generate_default_properties()
            print("初始化 properties 为字典")

        # 更新属性值
        if property_category in data["properties"]:
            data["properties"][property_category] += amount
            print(f"找到属性并更新: {property_category} = {data['properties'][property_category]}")
        else:
            print(f"未找到属性，创建新属性: {property_category}")
            data["properties"][property_category] = amount

        #
        # # 确保 properties 是一个列表
        # if "properties" not in data or not isinstance(data["properties"], list):
        #     data["properties"] = []
        #     print("初始化 properties 为列表")
        #
        # # 查找匹配的属性类别
        # property_found = False
        # for prop in data["properties"]:
        #     # 确保 prop 是字典类型
        #     if isinstance(prop, dict) and prop.get("name") == property_category:
        #         prop["value"] = prop.get("value", 0) + amount
        #         property_found = True
        #         print(f"找到属性并更新: {prop}")
        #         break
        #
        # # 如果没找到该属性类别，创建一个新的
        # if not property_found:
        #     print(f"未找到属性，创建新属性: {property_category}")
        #     data["properties"].append({
        #         "name": property_category,
        #         "value": amount,
        #         "icon": ""
        #     })

        if safe_save_data(data):
            return jsonify({"message": f"{property_category}属性增加{amount}点"})
        else:
            return jsonify({"error": "保存数据失败"}), 500
    except Exception as e:
        print(f"更新属性时发生错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"服务器内部错误: {str(e)}"}), 500


@app.route('/api/credits', methods=['GET'])
def get_credits():
    """获取积分数据"""
    data = load_data()
    return jsonify(data["credits"])

# 通过url参数更新积分数据
@app.route('/api/credits/add/<credit_type>/<amount>', methods=['POST'])
def add_credit(credit_type, amount):
    """通过URL参数新增积分"""
    try:
        # URL解码中文字符
        credit_type = unquote(credit_type)

        # 尝试转换为浮点数
        amount_value = float(amount)
    except ValueError:
        return jsonify({"error": "积分数量必须是有效数字"}), 400
    except UnicodeDecodeError:
        return jsonify({"error": "积分类型字符编码错误"}), 400

    data = load_data()

    # 验证积分类型是否存在
    if credit_type not in data["credits"]:
        # 如果是新的积分类型，初始化为0
        data["credits"][credit_type] = 0.0

    # 新增积分（而不是直接设置）
    data["credits"][credit_type] += amount_value

    if safe_save_data(data):
        return jsonify({
            "message": f"{credit_type}积分新增{amount_value}点，当前总计{data['credits'][credit_type]}点"
        })
    else:
        return jsonify({"error": "保存数据失败"}), 500

@app.route('/api/credits/<credit_type>', methods=['PUT'])
def update_credit(credit_type):
    """更新积分"""
    data = load_data()
    amount = request.json.get('amount')

    if amount < 0:
        return jsonify({"error": "积分不能为负数"}), 400

    data["credits"][credit_type] = amount

    if safe_save_data(data):
        # 打印
        return jsonify({"message": f"{credit_type}积分已更新为{amount}"})
    else:
        return jsonify({"error": "保存数据失败"}), 500


@app.route('/api/credits/conversion', methods=['POST'])
def convert_credits():
    """转换积分"""
    data = load_data()
    convert_type = request.json.get('convert_type')
    amount = request.json.get('amount')

    if "→" in convert_type:
        src_type, dest_type = convert_type.split("→")
        rate = data["conversion_rates"].get(convert_type, 1)
        required_amount = amount * rate

        if data["credits"][src_type] < required_amount:
            return jsonify({"error": f"{src_type}积分不足，需要{required_amount}个"}), 400

        data["credits"][src_type] -= required_amount
        data["credits"][dest_type] += amount

        if safe_save_data(data):
            return jsonify({"message": f"成功将{required_amount}个{src_type}积分转换为{amount}个{dest_type}积分"})
        else:
            return jsonify({"error": "保存数据失败"}), 500
    else:
        return jsonify({"error": "转换类型无效"}), 400


@app.route('/api/credits/conversion-rates', methods=['GET'])
def get_conversion_rates():
    """获取转换比率"""
    data = load_data()
    return jsonify(data["conversion_rates"])


@app.route('/api/credits/conversion-rates', methods=['PUT'])
def update_conversion_rates():
    """更新转换比率"""
    data = load_data()
    rates = request.json.get('rates')

    for convert_type, rate in rates.items():
        try:
            rate_int = int(rate)
            if rate_int <= 0:
                return jsonify({"error": f"{convert_type}的比率必须大于0"}), 400
            data["conversion_rates"][convert_type] = rate_int
        except ValueError:
            return jsonify({"error": f"请输入有效的数字作为{convert_type}的比率"}), 400

    if safe_save_data(data):
        return jsonify({"message": "转换比率设置已保存"})
    else:
        return jsonify({"error": "保存数据失败"}), 500


@app.route('/api/items', methods=['GET'])
def get_items():
    """获取道具列表"""
    data = load_data()
    return jsonify(data["items"])


@app.route('/api/items', methods=['POST'])
def add_item():
    """添加新道具"""
    data = load_data()
    item_data = request.json
    if "icon" not in item_data:
        item_data["icon"] = ""

    item_name = item_data.get('name')
    if item_name in data["items"]:
        return jsonify({"error": "道具名称已存在"}), 400

    data["items"][item_name] = {
        "id": item_data.get('id'),
        "description": item_data.get('description'),
        "category": item_data.get('category'),
        "price": item_data.get('price'),
        "icon": item_data.get('icon'),
        "parallelWorld": item_data.get('parallelWorld'),
        "recipes": item_data.get('recipes', []),  # 添加配方数据
        "gmCommand": item_data.get('gmCommand', ''),  # 添加GM命令字段
        "lootBoxes": item_data.get('lootBoxes', [])
    }

    data["backpack"][item_name] = 0

    if safe_save_data(data):
        return jsonify({"message": f"道具{item_name}添加成功"})
    else:
        return jsonify({"error": "保存数据失败"}), 500


@app.route('/api/items/<item_name>', methods=['PUT'])
def update_item(item_name):
    """更新道具"""
    data = load_data()
    item_data = request.json
    if "icon" not in item_data:
        item_data["icon"] = ""

    if item_name not in data["items"]:
        return jsonify({"error": "找不到指定的道具"}), 404

    data["items"][item_name] = {
        "id": item_data.get('id'),
        "description": item_data.get('description'),
        "category": item_data.get('category'),
        "price": item_data.get('price'),
        "icon": item_data.get('icon'),
        "parallelWorld": item_data.get('parallelWorld'),
        "recipes": item_data.get('recipes', []),  # 添加配方数据
        "gmCommand": item_data.get('gmCommand', ''),  # 添加GM命令字段
        "lootBoxes": item_data.get('lootBoxes', [])
    }

    if safe_save_data(data):
        return jsonify({"message": f"道具{item_name}更新成功"})
    else:
        return jsonify({"error": "保存数据失败"}), 500


@app.route('/api/items/<item_name>', methods=['DELETE'])
def delete_item(item_name):
    """删除道具"""
    data = load_data()

    if item_name in data["items"]:
        del data["items"][item_name]

    if item_name in data["backpack"]:
        del data["backpack"][item_name]

    if safe_save_data(data):
        return jsonify({"message": f"道具{item_name}已删除"})
    else:
        return jsonify({"error": "保存数据失败"}), 500


@app.route('/api/items/batch-delete', methods=['POST'])
def batch_delete_items():
    """批量删除道具"""
    try:
        data = load_data()
        request_data = request.json
        item_names = request_data.get('item_names', [])

        if not isinstance(item_names, list):
            return jsonify({"error": "item_names必须是一个列表"}), 400

        deleted_count = 0
        not_found_items = []

        # 批量删除道具
        for item_name in item_names:
            if item_name in data["items"]:
                # 从items中删除
                del data["items"][item_name]
                # 从backpack中删除
                if item_name in data["backpack"]:
                    del data["backpack"][item_name]
                deleted_count += 1
            else:
                not_found_items.append(item_name)

        # 保存更新后的数据
        if safe_save_data(data,enable_single_field_max_check=False):
            result = {
                "message": f"成功删除{deleted_count}个道具",
                "deleted_count": deleted_count
            }

            if not_found_items:
                result["not_found_items"] = not_found_items
                result["warning"] = f"以下{len(not_found_items)}个道具未找到: {', '.join(not_found_items)}"

            return jsonify(result)
        else:
            return jsonify({"error": "保存数据失败"}), 500

    except Exception as e:
        print(f"批量删除道具时发生错误: {str(e)}")
        return jsonify({"error": f"服务器内部错误: {str(e)}"}), 500

@app.route('/api/items/buy', methods=['POST'])
def buy_item():
    """购买道具"""
    data = load_data()
    item_name = request.json.get('item_name')
    count = request.json.get('count')

    if item_name not in data["items"]:
        return jsonify({"error": "道具不存在"}), 404

    item_info = data["items"][item_name]

    # 检查积分是否足够
    for ctype, price in item_info["price"].items():
        required = price * count
        if data["credits"][ctype] < required:
            return jsonify({"error": f"{ctype}积分不足"}), 400

    # 扣除积分
    for ctype, price in item_info["price"].items():
        data["credits"][ctype] -= price * count

    # 添加到包裹
    data["backpack"][item_name] += count

    if safe_save_data(data):
        return jsonify({"message": f"成功兑换{count}个{item_name}"})
    else:
        return jsonify({"error": "保存数据失败"}), 500


@app.route('/api/backpack', methods=['GET'])
def get_backpack():
    """获取包裹数据"""
    data = load_data()
    # 只返回拥有数量大于0的道具
    backpack = {k: v for k, v in data["backpack"].items() if v > 0}
    return jsonify(backpack)


@app.route('/api/backpack/use', methods=['POST'])
def use_item():
    """使用道具"""
    settings = load_settings()
    data = load_data()
    item_name = request.json.get('item_name')
    count = request.json.get('count')

    if count <= 0:
        return jsonify({"error": "使用数量必须大于0"}), 400

    if count > data["backpack"][item_name]:
        return jsonify({"error": "使用数量不能超过拥有数量"}), 400

    # 检查是否为宝箱道具
    item_info = data["items"][item_name]
    loot_boxes = item_info.get("lootBoxes", [])

    print('using item: ', item_info.get("category"))

    # 如果有宝箱效果，则执行开箱逻辑
    if loot_boxes and len(loot_boxes) > 0:
        import random

        # 存储开箱结果
        reward_items = []

        # 初始化连续未掉落计数器（存储在用户数据中）
        if "lootbox_miss_counts" not in data:
            data["lootbox_miss_counts"] = {}

        # 为当前宝箱创建计数器键
        miss_count_key = f"{item_name}_miss_counts"
        if miss_count_key not in data["lootbox_miss_counts"]:
            data["lootbox_miss_counts"][miss_count_key] = {}

        # 检查并删除lootbox_miss_counts中多余的items
        lbs=[]
        for lb in loot_boxes:
            for lb_dict in lb:
                lbs.append(lb_dict["itemName"])
        miss_dict=data["lootbox_miss_counts"][miss_count_key]
        lb_miss_items=list(miss_dict.keys())
        changed_items=list(set(lb_miss_items)-set(lbs))
        for i in changed_items:
            if i != "__EMPTY__":
                # print(f'deleting {miss_count_key}-{i}')
                del data["lootbox_miss_counts"][miss_count_key][i]


        # 执行指定次数的开箱
        for box_index in range(count):
            # 遍历所有开箱效果
            for loot_box_effect in loot_boxes:
                # 生成随机数用于判定掉落
                rand_value = random.random()  # 生成0-1之间的随机数
                cumulative_rate = 0.0

                # 创建当前开箱的动态掉率列表
                dynamic_rates = []
                total_base_rate = sum(item.get("dropRate", 0.0) for item in loot_box_effect)
                empty_rate = max(0.0, 1.0 - total_base_rate)  # 原始空奖励概率
                total_dynamic_rate = 0.0

                # 计算每个道具的动态掉率
                for drop_item in loot_box_effect:
                    item_key = drop_item["itemName"]
                    base_rate = drop_item.get("dropRate", 0.0)

                    # 获取连续未掉落次数
                    miss_count = data["lootbox_miss_counts"][miss_count_key].get(item_key, 0)

                    # 按公式计算动态掉率: base_rate * (1 + 0.01 * n^2)
                    dynamic_rate = base_rate * (1 + 0.01 * miss_count * miss_count)
                    dynamic_rates.append({
                        "itemName": item_key,
                        "count": drop_item["count"],
                        "baseRate": base_rate,
                        "dynamicRate": dynamic_rate,
                        "missCount": miss_count
                    })
                    total_dynamic_rate += dynamic_rate

                # 计算缩放因子以保持空奖励概率不变
                if total_dynamic_rate > 0:
                    scaling_factor = min(1.0, (1.0 - empty_rate) / total_dynamic_rate)
                else:
                    scaling_factor = 1.0

                # 归一化处理，确保总概率为1
                normalized_rates = []
                for item in dynamic_rates:
                    normalized_rate = item["dynamicRate"] * scaling_factor
                    normalized_rates.append({
                        "itemName": item["itemName"],
                        "count": item["count"],
                        "baseRate": item["baseRate"],
                        "dynamicRate": normalized_rate,
                        "missCount": item["missCount"]
                    })

                # 添加空奖励项（保持原始概率）
                if empty_rate > 0:
                    normalized_rates.append({
                        "itemName": "__EMPTY__",
                        "count": 0,
                        "baseRate": empty_rate,
                        "dynamicRate": empty_rate,
                        "missCount": 0
                    })

                # 重新计算累计概率并选择道具
                cumulative_rate = 0.0
                selected_item = None

                for drop_item in normalized_rates:
                    cumulative_rate += drop_item["dynamicRate"]

                    # 如果随机数小于等于累计概率，则获得该道具
                    if rand_value <= cumulative_rate:
                        selected_item = drop_item
                        break

                # 如果选中了道具
                if selected_item:
                    reward_item_name = selected_item["itemName"]
                    reward_item_count = selected_item["count"]

                    # 添加到奖励列表
                    reward_items.append({
                        "itemName": reward_item_name,
                        "count": reward_item_count,
                        "dropRate": selected_item["dynamicRate"],
                        "baseRate": selected_item["baseRate"],
                        "missCount": selected_item["missCount"]
                    })

                    # 添加到背包
                    if reward_item_name in data["backpack"]:
                        data["backpack"][reward_item_name] += reward_item_count
                    else:
                        data["backpack"][reward_item_name] = reward_item_count

                    # 重置该道具的连续未掉落次数
                    data["lootbox_miss_counts"][miss_count_key][reward_item_name] = 0
                else:
                    # 没有获得任何道具（空奖励）
                    pass

                # 增加未掉落道具的连续未掉落次数
                for drop_item in normalized_rates:
                    if not selected_item or drop_item["itemName"] != selected_item["itemName"]:
                        item_key = drop_item["itemName"]
                        current_miss_count = data["lootbox_miss_counts"][miss_count_key].get(item_key, 0)
                        data["lootbox_miss_counts"][miss_count_key][item_key] = current_miss_count + 1
                        # print(f"{item_key}连续未掉落次数: {current_miss_count}")

        # 减少包裹中的道具数量
        data["backpack"][item_name] -= count

        # 添加到使用日志
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        item_summary = {}
        for item in reward_items:
            itm_name = item['itemName']
            if itm_name != "__EMPTY__":
                if itm_name in item_summary:
                    item_summary[itm_name] += item['count']
                else:
                    item_summary[itm_name] = item['count']
        log_message = f"开箱获得: " + ", ".join([f"{name}x{count}" for name, count in item_summary.items()])
        # log_message = f"开箱获得: " + ", ".join([f"{item['itemName']}x{item['count']}" for item in reward_items])
        # data["use_logs"].append((current_time, item_name, count, log_message))

        if safe_save_data(data):
            return jsonify({
                "message": log_message,#f"成功开启{count}个{item_name}",
                "reward_items": reward_items
            })
        else:
            return jsonify({"error": "保存数据失败"}), 500
    elif "实物" in item_info.get("category"):
        data["backpack"][item_name] -= count
        if safe_save_data(data):
            return jsonify({"message": f"恭喜获得{item_name}", "description": f"{item_info.get('description')}"})
        else:
            return jsonify({"error": "保存数据失败"}), 500
        # print(f"恭喜获得{item_name}")
        # return jsonify({"error": f"恭喜获得{item_name}"}), 400
    else:
        # 原有的GM命令逻辑
        gmcmd_template = item_info.get("gmCommand", "")

        if len(gmcmd_template) <= 1:
            return jsonify({"error": "缺少GM命令，无法使用"}), 400

        keywords = ['count', '数量', '个数', '数目', 'cnt', 'num']

        # 创建一个正则表达式模式，匹配包含关键词的尖括号内容
        def replace_keyword_placeholders(text, keywords, replacement):
            # 转义关键词以防止特殊字符影响正则表达式
            escaped_keywords = [re.escape(keyword) for keyword in keywords]
            # 构建正则表达式：匹配以<开头、以>结尾，中间包含任一关键词的内容
            pattern = f"<.*?(?:{'|'.join(escaped_keywords)}).*?>"
            return re.sub(pattern, str(replacement), text, count=1)

        gm_command = replace_keyword_placeholders(gmcmd_template, keywords, count)

        # 减少包裹中的道具数量
        data["backpack"][item_name] -= count

        # # 添加到使用日志
        # current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        # data["use_logs"].append((current_time, item_name, count, gm_command))

        if safe_save_data(data):
            return jsonify({
                "message": f"已使用{count}个{item_name}",
                "gm_command": gm_command
            })
        else:
            return jsonify({"error": "保存数据失败"}), 500
# def use_item():
#     """使用道具"""
#     settings = load_settings()
#     data = load_data()
#     item_name = request.json.get('item_name')
#     count = request.json.get('count')
#
#     if count <= 0:
#         return jsonify({"error": "使用数量必须大于0"}), 400
#
#     if count > data["backpack"][item_name]:
#         return jsonify({"error": "使用数量不能超过拥有数量"}), 400
#
#     # 检查是否为宝箱道具
#     item_info = data["items"][item_name]
#     loot_boxes = item_info.get("lootBoxes", [])
#
#     # 如果有宝箱效果，则执行开箱逻辑
#     if loot_boxes and len(loot_boxes) > 0:
#         import random
#
#         # 存储开箱结果
#         reward_items = []
#
#         # 执行指定次数的开箱
#         for _ in range(count):
#             # 遍历所有开箱效果
#             for loot_box_effect in loot_boxes:
#                 # 生成随机数用于判定掉落
#                 rand_value = random.random()  # 生成0-1之间的随机数
#                 cumulative_rate = 0.0
#
#                 # 遍历该效果中的所有可能掉落项
#                 for drop_item in loot_box_effect:
#                     cumulative_rate += drop_item.get("dropRate", 0.0)
#
#                     # 如果随机数小于等于累计概率，则获得该道具
#                     if rand_value <= cumulative_rate:
#                         reward_item_name = drop_item["itemName"]
#                         reward_item_count = drop_item["count"]
#
#                         # 添加到奖励列表
#                         reward_items.append({
#                             "itemName": reward_item_name,
#                             "count": reward_item_count
#                         })
#
#                         # 添加到背包
#                         if reward_item_name in data["backpack"]:
#                             data["backpack"][reward_item_name] += reward_item_count
#                         else:
#                             data["backpack"][reward_item_name] = reward_item_count
#                         break
#
#         # 减少包裹中的道具数量
#         data["backpack"][item_name] -= count
#
#         # 添加到使用日志
#         current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
#         log_message = f"开箱获得: " + ", ".join([f"{item['itemName']}x{item['count']}" for item in reward_items])
#         data["use_logs"].append((current_time, item_name, count, log_message))
#
#         if safe_save_data(data):
#             return jsonify({
#                 "message": f"成功开启{count}个{item_name}",
#                 "reward_items": reward_items
#             })
#         else:
#             return jsonify({"error": "保存数据失败"}), 500
#     else:
#         # 原有的GM命令逻辑
#         gmcmd_template = item_info.get("gmCommand", "")
#         if len(gmcmd_template) <= 1:
#             return jsonify({"error": "缺少GM命令，无法使用"}), 400
#
#         keywords = ['count', '数量', '个数', '数目', 'cnt', 'num']
#
#         # 创建一个正则表达式模式，匹配包含关键词的尖括号内容
#         def replace_keyword_placeholders(text, keywords, replacement):
#             # 转义关键词以防止特殊字符影响正则表达式
#             escaped_keywords = [re.escape(keyword) for keyword in keywords]
#             # 构建正则表达式：匹配以<开头、以>结尾，中间包含任一关键词的内容
#             pattern = f"<.*?(?:{'|'.join(escaped_keywords)}).*?>"
#             return re.sub(pattern, str(replacement), text, count=1)
#
#         gm_command = replace_keyword_placeholders(gmcmd_template, keywords, count)
#
#         # 减少包裹中的道具数量
#         data["backpack"][item_name] -= count
#
#         # 添加到使用日志
#         current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
#         data["use_logs"].append((current_time, item_name, count, gm_command))
#
#         if safe_save_data(data):
#             return jsonify({
#                 "message": f"成功使用{count}个{item_name}",
#                 "gm_command": gm_command
#             })
#         else:
#             return jsonify({"error": "保存数据失败"}), 500
# def use_item():
#     """使用道具"""
#     settings = load_settings()
#     data = load_data()
#     item_name = request.json.get('item_name')
#     count = request.json.get('count')
#
#     if count <= 0:
#         return jsonify({"error": "使用数量必须大于0"}), 400
#
#     if count > data["backpack"][item_name]:
#         return jsonify({"error": "使用数量不能超过拥有数量"}), 400
#
#
#     # 生成GM命令
#     item_info = data["items"][item_name]
#     gmcmd_template = item_info.get("gmCommand", "") #list(settings['gmCommands'].values())[0].get('gmCommand', ''))
#     if len(gmcmd_template)<=1:
#         return jsonify({"error": "缺少GM命令，无法使用"}), 400
#
#
#
#     keywords = ['count', '数量', '个数', '数目', 'cnt', 'num']  # 可以根据需要添加更多关键词
#     # 创建一个正则表达式模式，匹配包含关键词的尖括号内容
#     def replace_keyword_placeholders(text, keywords, replacement):
#         # 转义关键词以防止特殊字符影响正则表达式
#         escaped_keywords = [re.escape(keyword) for keyword in keywords]
#         # 构建正则表达式：匹配以<开头、以>结尾，中间包含任一关键词的内容
#         pattern = f"<.*?(?:{'|'.join(escaped_keywords)}).*?>"
#         return re.sub(pattern, str(replacement), text, count=1)
#
#     gm_command = replace_keyword_placeholders(gmcmd_template, keywords, count)
#
#     # if item_name == "经验书" or item_name == "超级经验书":
#     #     gm_command = f"d_c2scmd 10889 {item_info['id']}"
#     # else:
#     #     gm_command = f"d_c2scmd 10800 {item_info['id']} {count}"
#
#     # 减少包裹中的道具数量
#     data["backpack"][item_name] -= count
#
#     # 添加到使用日志
#     current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
#     data["use_logs"].append((current_time, item_name, count, gm_command))
#
#     if safe_save_data(data):
#         return jsonify({
#             "message": f"成功使用{count}个{item_name}",
#             "gm_command": gm_command
#         })
#     else:
#         return jsonify({"error": "保存数据失败"}), 500


@app.route('/api/logs', methods=['GET'])
def get_logs():
    """获取日志"""
    try:
        if os.path.exists(LOGS_FILE):
            with open(LOGS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return jsonify({'logs': data.get('logs', [])})
        else:
            return jsonify({'logs': []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/save', methods=['POST'])
def save_logs():
    """保存日志"""
    try:
        data = request.json
        with open(LOGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return jsonify({'message': '日志保存成功'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/clear', methods=['POST'])
def clear_logs():
    """清空日志"""
    try:
        if os.path.exists(LOGS_FILE):
            os.remove(LOGS_FILE)
        return jsonify({'message': '日志已清空'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# @app.route('/api/logs', methods=['GET'])
# def get_logs():
#     """获取使用日志"""
#     data = load_data()
#     return jsonify(data["use_logs"])
#
#
# @app.route('/api/logs/clear', methods=['POST'])
# def clear_logs():
#     """清空日志"""
#     data = load_data()
#     data["use_logs"] = []
#
#     if safe_save_data(data):
#         return jsonify({"message": "日志已清空"})
#     else:
#         return jsonify({"error": "保存数据失败"}), 500


@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """获取任务列表"""
    data = load_data()
    # 确保所有任务都有必要的字段（兼容旧数据）
    for task in data["tasks"]:
        if "task_type" not in task:
            task["task_type"] = "无循环"
        if "completed_count" not in task:
            task["completed_count"] = 0
        if "max_completions" not in task:
            task["max_completions"] = 0
    return jsonify(data["tasks"])

def tailor_task_name(task_name):
    """若任务名称过长则裁剪任务名称"""
    settings = load_settings()
    try:
        max_length = settings.taskNameMaxLength
    except:
        max_length = 250

    return task_name[:max_length]+"..." if len(task_name) > max_length else task_name


@app.route('/api/tasks', methods=['POST'])
def add_task():
    """添加新任务"""
    data = load_data()
    task_data = request.json

    # 生成新的任务ID
    all_ids = [task["id"] for task in data["tasks"]]
    existing_id = task_data.get('id')
    if existing_id & existing_id not in all_ids:
        new_id = task_data.get('id')
    else:
        new_id = max([task["id"] for task in data["tasks"]], default=0) + 1


    new_task = {
        "id": new_id,
        "name": tailor_task_name(task_data.get('name')),
        "description": task_data.get('description'),
        "task_type": task_data.get('task_type', '无循环'),
        "max_completions": task_data.get('max_completions', 0),
        "category": task_data.get('category', '未分类'),
        "domain": task_data.get('domain', '学习'),
        "priority": task_data.get('priority', '重要且紧急'),
        "completed_count": 0,
        "status": task_data.get('status', '未完成'),
        "start_time": task_data.get('start_time'),
        "complete_time": task_data.get('complete_time'),
        "archived": task_data.get('archived', False),
        "total_completion_count": task_data.get('total_completion_count', 0),
        "credits_reward": task_data.get('credits_reward', {}),
        "items_reward": task_data.get('items_reward', {}),
        "exp_reward": task_data.get('exp_reward', 0),
        "notes": task_data.get('notes', ''),
        "tags": task_data.get('tags', []),
    }

    data["tasks"].append(new_task)

    if safe_save_data(data):
        return jsonify({"message": f"任务'{new_task['name']}'添加成功", "task": new_task})
    else:
        return jsonify({"error": "保存数据失败"}), 500

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """更新任务"""
    data = load_data()
    task_data = request.json

    for task in data["tasks"]:
        if task["id"] == task_id:
            task["name"] = tailor_task_name(task_data.get('name'))
            task["description"] = task_data.get('description')
            task["task_type"] = task_data.get('task_type', '无循环')
            task["max_completions"] = task_data.get('max_completions', 0)
            task["category"] = task_data.get('category', '未分类')
            task["domain"] = task_data.get('domain', '学习')  # 更新领域属性
            task["priority"] = task_data.get('priority', '重要且紧急')  # 更新重要性属性
            task["credits_reward"] = task_data.get('credits_reward', {})
            task["items_reward"] = task_data.get('items_reward', {})
            # 添加新增字段的处理
            task["start_time"] = task_data.get('start_time')
            task["complete_time"] = task_data.get('complete_time')
            task["archived"] = task_data.get('archived', False)
            task['status'] = task_data.get('status', '未完成')
            task['completed_count'] = task_data.get('completed_count', 0)
            task["total_completion_count"] = task_data.get('total_completion_count', 0)
            exp_reward=task_data.get('exp_reward', 0)
            task["exp_reward"] = exp_reward
            task["notes"] = task_data.get('notes', '')
            task["tags"] = task_data.get('tags', [])
            # print(f"设置任务 {task_id} 的经验值为: {exp_reward}")


            if safe_save_data(data):
                return jsonify({"message": f"任务'{task['name']}'更新成功", "task": task})
            else:
                return jsonify({"error": "保存数据失败"}), 500

    return jsonify({"error": "任务不存在"}), 404


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """删除任务"""
    data = load_data()
    data["tasks"] = [task for task in data["tasks"] if task["id"] != task_id]

    if safe_save_data(data):
        return jsonify({"message": "任务已删除"})
    else:
        return jsonify({"error": "保存数据失败"}), 500


@app.route('/api/tasks/<int:task_id>/complete', methods=['POST'])
def complete_task(task_id):
    """完成任务并发放奖励"""
    data = load_data()
    new_data = request.json

    # 查找目标任务
    task = next((t for t in data["tasks"] if t["id"] == task_id), None)
    if not task:
        return jsonify({"error": "任务不存在"}), 404

    # 检查是否可以完成任务
    # if task["task_type"] == "无循环" and task["completed_count"] > 0:
    #     return jsonify({"error": "无循环任务已完成，无法重复完成"}), 400
    # 使用前端传入的状态、完成时间、完成次数、总完成次数（如果存在）
    if 'status' in new_data:
        task["status"] = new_data['status']
        # print("设置任务状态为：",task["status"])
    if 'complete_time' in new_data:
        task["complete_time"] = new_data['complete_time']
        #print("设置任务完成时间为：",task["complete_time"])
    elif not task["complete_time"]:
        # 完成时间若不存在则补全
        task["complete_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        #print("设置任务完成时间为：",task["complete_time"])
    if 'completed_count' in new_data:
        task["completed_count"] = new_data['completed_count']
        #print("设置任务完成次数为：",task["completed_count"])
    if 'total_completion_count' in new_data:
        task["total_completion_count"] = new_data['total_completion_count']
        #print("设置任务总完成次数为：",task["total_completion_count"])

    # 发放奖励
    reward_info = []

    # 发放奖励(若请求数据中没有items_reward项则可能是完成次数溢出的情况，不予奖励）
    if 'items_reward' in new_data:
        #print('items_reward distributing...')
        if task.get("exp_reward", 0) > 0:
            reward_info.append(f"经验奖励: {task['exp_reward']}")
        # 发放属性奖励
        if task.get("properties_reward"):
            reward_info.append("属性奖励: " + ", ".join([f"{k}{v}" for k, v in task["properties_reward"].items()]))
        # 发放积分奖励
        if task.get("credits_reward"):
            reward_info.append("积分奖励: " + ", ".join([f"{k}{v}" for k, v in task["credits_reward"].items()]))
        # 发放道具奖励
        if task.get("items_reward"):
            for item_name, count in task["items_reward"].items():
                #print(f"发放道具奖励: {item_name}x{count}")
                if item_name in data["backpack"]:
                    #print(f"{item_name}已存在背包中，数量增加: {count}")
                    data["backpack"][item_name] += count
                else:
                    #print(f"添加道具奖励: {item_name}x{count}")
                    data["backpack"][item_name] = count
            reward_info.append("道具奖励: " + ", ".join([f"{k}x{v}" for k, v in task["items_reward"].items()]))


    if safe_save_data(data):
        return jsonify({
            "message": f"任务'{task['name']}'已完成\n",
            "reward": "\n".join(reward_info) if reward_info else "无奖励"
        })
    else:
        return jsonify({"error": "保存数据失败"}), 500

    return jsonify({"error": "任务不存在"}), 404


def get_field_mapping():
    """获取中英文字段名映射表"""
    return {
        # 基本字段映射
        '道具名称': 'name',
        'name': 'name',
        '名称': 'name',

        'ID': 'id',
        'id': 'id',
        '道具ID': 'id',
        '道具id': 'id',

        '描述': 'description',
        'description': 'description',

        '分类': 'category',
        '类别': 'category',
        'category': 'category',

        '图标': 'icon',
        'icon': 'icon',

        '游戏世界': 'parallelWorld',
        'parallelWorld': 'parallelWorld',
        'parallel_world': 'parallelWorld',

        'GM指令': 'gmCommand',
        'gm指令': 'gmCommand',
        'gmCommand': 'gmCommand',
        'gm_command': 'gmCommand',

        # JSON字段
        '合成配方': 'recipes',
        'recipes': 'recipes',

        '宝箱效果': 'lootBoxes',
        'lootBoxes': 'lootBoxes',
        'loot_boxes': 'lootBoxes',
    }

@app.route('/api/items/import', methods=['POST'])
def import_items():
    """从CSV文件导入道具 - 完善版"""
    try:
        # 文件上传验证
        if 'file' not in request.files:
            return jsonify({"error": "没有上传文件"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "文件名为空"}), 400

        if not file.filename.endswith('.csv'):
            return jsonify({"error": "只支持CSV格式文件"}), 400

        # 读取文件内容
        content = file.read().decode('utf-8-sig')  # 使用 utf-8-sig 处理 BOM
        print(f"接收到CSV文件内容: {content}")

        # 使用标准库 csv 模块解析CSV
        csv_reader = csv.reader(io.StringIO(content))
        lines = list(csv_reader)

        if len(lines) < 2:
            return jsonify({"error": "CSV文件内容过少，至少需要包含表头和一行数据"}), 400

        # 解析并转换表头
        raw_headers = [h.strip() for h in lines[0]]
        field_mapping = get_field_mapping()
        headers = [field_mapping.get(header, header) for header in raw_headers]
        print(f"原始表头: {raw_headers}")
        print(f"转换后表头: {headers}")

        # 验证必需字段
        required_fields = ['name', 'id', 'description', 'category']
        missing_fields = [field for field in required_fields if field not in headers]
        if missing_fields:
            return jsonify({"error": f"缺少必需字段: {missing_fields}"}), 400

        # 获取积分类型列表，用于识别价格字段
        settings = load_settings()
        credit_types = settings.get("creditTypes", ["水晶", "星钻", "魂玉", "骨贝", "源石", "灵石", "金币", "元宝"])

        # 解析数据行
        data = load_data()
        imported_count = 0
        failed_count = 0
        errors = []
        added_count = 0
        updated_count = 0

        for i, row in enumerate(lines[1:], 1):  # 从第二行开始
            if not any(cell.strip() for cell in row):  # 跳过空行
                continue

            print(f"正在处理第{i}行数据: {row}")
            try:
                # 创建道具数据
                item_data = {}

                # 处理所有字段
                for j, header in enumerate(headers):
                    if j < len(row):
                        value = row[j].strip()
                        item_data[header] = value

                # # 特殊处理ID字段
                # if 'id' in item_data:
                #     try:
                #         item_data['id'] = int(float(item_data['id'])) if item_data['id'] else 0
                #     except ValueError:
                #         item_data['id'] = 0

                # 处理JSON字段 (增强版)
                json_fields = ['recipes', 'lootBoxes']
                for field in json_fields:
                    if field in item_data and item_data[field]:
                        try:
                            # 获取原始值
                            json_string = item_data[field]

                            # 尝试修复JSON格式问题
                            fixed_json_string = fix_json_format(json_string)

                            # 尝试解析为JSON
                            parsed_value = json.loads(fixed_json_string) if fixed_json_string else []

                            # 验证解析结果是否为列表
                            if isinstance(parsed_value, list):
                                item_data[field] = parsed_value
                            else:
                                item_data[field] = []
                        except Exception as e:
                            print(f"JSON处理错误 {field}: {str(e)}, 原始值: {item_data[field]}")
                            item_data[field] = []
                    else:
                        item_data[field] = []

                # 处理price字段
                item_data['price'] = {}

                # 设置默认值
                if 'category' not in item_data or not item_data['category']:
                    item_data['category'] = '未分类'

                if 'description' not in item_data:
                    item_data['description'] = ''

                if 'icon' not in item_data:
                    item_data['icon'] = ''

                if 'parallelWorld' not in item_data:
                    item_data['parallelWorld'] = '默认世界'

                if 'gmCommand' not in item_data:
                    item_data['gmCommand'] = ''
                print(f"1正在处理道具: {item_data}")
                # 处理积分价格字段（在最后处理，避免覆盖）
                for header in headers:
                    if header in credit_types:
                        try:
                            price_value = float(item_data[header]) if item_data[header] else 0
                            if price_value > 0:
                                item_data['price'][header] = round(price_value, 2)
                        except ValueError:
                            pass
                print(f"2正在处理道具: {item_data}")
                # 验证必需字段
                # if not item_data.get('name') or not item_data.get('id'):
                if not item_data.get('name'):
                    errors.append(f"第{i}行: 道具名称为空")
                    failed_count += 1
                    continue

                # 检查ID是否已存在
                item_name = item_data['name']
                # item_id = item_data['id']
                # print(f"3正在处理道具: {item_data}")

                # 检查是否已存在同名或同ID的道具
                item_exists = False
                existing_item_name = None
                for name, existing_item in data['items'].items():
                    if name == item_name:
                    # if name == item_name or existing_item.get('id') == item_id:
                        item_exists = True
                        existing_item_name = name
                        break
                # print(f"4正在处理道具: {item_data}")

                if item_exists:
                    # 更新现有道具
                    # print(f"5正在处理道具: {existing_item_name} ")
                    old_item = data['items'][existing_item_name].copy()
                    data['items'][existing_item_name].update(item_data)
                    # print(f"6更新道具: {data['items'][existing_item_name]} ")
                    print(f"更新道具: {item_name}")
                    updated_count += 1

                    # 如果道具名称改变，需要更新背包
                    if existing_item_name != item_name:
                        # 转移背包数量
                        if existing_item_name in data['backpack']:
                            data['backpack'][item_name] = data['backpack'].pop(existing_item_name, 0)
                        else:
                            data['backpack'][item_name] = 0
                else:
                    # 添加新道具
                    data['items'][item_name] = item_data
                    data['backpack'][item_name] = 0  # 初始化背包数量
                    print(f"新增道具: {item_name}")
                    added_count += 1

                imported_count += 1

            except Exception as e:
                errors.append(f"第{i}行解析错误: {str(e)}")
                failed_count += 1
                continue

        # 保存数据
        if safe_save_data(data,enable_single_field_max_check=False):
            message = f"成功导入{imported_count}个道具"
            if added_count > 0:
                message += f"，新增{added_count}个"
            if updated_count > 0:
                message += f"，更新{updated_count}个"
            if failed_count > 0:
                message += f"，失败{failed_count}个"

            return jsonify({
                "message": message,
                "importedCount": imported_count,
                "addedCount": added_count,
                "updatedCount": updated_count,
                "failedCount": failed_count,
                "errors": errors
            })
        else:
            return jsonify({"error": "保存数据失败"}), 500

    except Exception as e:
        print(f"导入道具时发生错误: {str(e)}")
        return jsonify({"error": f"导入失败: {str(e)}"}), 500


def fix_json_format(json_string):
    """修复JSON格式问题"""
    if not json_string:
        return json_string

    try:
        # 如果已经是有效的JSON，直接返回
        json.loads(json_string)
        return json_string
    except json.JSONDecodeError:
        pass

    # 尝试修复格式
    fixed = json_string.strip()

    # 如果被引号包围，去掉外层引号
    if fixed.startswith('"') and fixed.endswith('"'):
        fixed = fixed[1:-1]

    # 替换双重转义的引号
    fixed = fixed.replace('""', '"')

    # 修复键名缺少引号的问题
    import re

    # 修复对象开始后的键 {key: -> {"key":
    fixed = re.sub(r'\{([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'{"\1":', fixed)
    # 修复逗号后的键 ,key: -> ,"key":
    fixed = re.sub(r',\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r',"\1":', fixed)
    # 修复数组中的对象键 [{key: -> [{"key":
    fixed = re.sub(r'\[\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'[{"\1":', fixed)

    # 修复字符串值缺少引号的问题
    # 匹配 : 后面跟着非引号、非逗号、非大括号的字符序列，直到遇到逗号或大括号结束
    fixed = re.sub(r':\s*([a-zA-Z0-9_\u4e00-\u9fa5]+)(?=[,}])', r':"\1"', fixed)

    # 特殊处理数字值，移除数字周围的引号（如果被错误添加）
    fixed = re.sub(r':"(\d+\.?\d*)"', r':\1', fixed)

    # 修复布尔值和null值
    fixed = fixed.replace(':true', ':true').replace(':false', ':false').replace(':null', ':null')
    fixed = fixed.replace(':"true"', ':true').replace(':"false"', ':false').replace(':"null"', ':null')

    return fixed



@app.route('/api/tasks/import', methods=['POST'])
def import_tasks_from_csv():
    """从CSV文件导入任务"""
    try:
        # 获取上传的文件
        if 'file' not in request.files:
            return jsonify({"error": "没有上传文件"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "未选择文件"}), 400

        # 读取CSV内容
        stream = file.stream.read().decode('utf-8')
        csv_data = csv.DictReader(stream.splitlines(), delimiter=',')

        data = load_data()
        added_count = 0

        # 处理CSV数据
        for row in csv_data:
            try:
                task_name = row.get('name', '').strip()
                if not task_name:
                    continue

                task = {
                    "id": len(data["tasks"]) + 1,
                    "name": task_name,
                    "description": row.get('description', '').strip(),
                    "task_type": row.get('task_type', '无循环').strip(),
                    "max_completions": int(row.get('max_completions', 0)),
                    "completed_count": 0,
                    "category": row.get('category', '未分类').strip(),
                    "domain": row.get('domain', '学习').strip(),  # 添加领域字段
                    "priority": row.get('priority', '重要且紧急').strip(),  # 添加重要性字段
                    "credits_reward": {},
                    "items_reward": {},
                    # 添加新增字段
                    "start_time": row.get('start_time'),
                    "complete_time": row.get('complete_time'),
                    "archived": row.get('archived', 'False').lower() == 'true',
                    "total_completion_count": int(row.get('total_completion_count', 0))
                }

                # 处理积分奖励
                for key, value in row.items():
                    if key.startswith('credit_') and value.strip():
                        credit_type = key.replace('credit_', '')
                        try:
                            task["credits_reward"][credit_type] = int(value.strip())
                        except ValueError:
                            pass

                # 处理道具奖励
                for key, value in row.items():
                    if key.startswith('item_') and value.strip():
                        item_name = key.replace('item_', '')
                        try:
                            task["items_reward"][item_name] = int(value.strip())
                        except ValueError:
                            pass

                data["tasks"].append(task)
                added_count += 1

            except (ValueError, KeyError) as e:
                continue

        if safe_save_data(data,enable_single_field_max_check=False):
            return jsonify({
                "message": f"成功导入{added_count}个任务",
                "imported": added_count
            })
        else:
            return jsonify({"error": "保存数据失败"}), 500

    except Exception as e:
        return jsonify({"error": f"导入失败: {str(e)}"}), 500


# def batch_archive_tasks():
#     """批量归档已完成的任务"""
#     data = load_data()
#     archived_count = 0
#     today = datetime.now().date()
#
#     for task in data["tasks"]:
#         # 检查任务是否已完成且完成时间在今天之前
#         if task.get("status") == "已完成":
#             completion_time = task.get("completion_time")
#             if completion_time:
#                 completion_date = datetime.strptime(completion_time, "%Y-%m-%d").date()
#                 if completion_date < today:
#                     task["archived"] = "是"
#                     archived_count += 1
#
#     if safe_save_data(data):
#         return jsonify({"message": f"成功归档{archived_count}个任务"})
#     else:
#         return jsonify({"error": "保存数据失败"}), 500



def batch_archive_tasks():
    """批量归档已完成的任务"""
    try:
        data = load_data()
        updated_count = 0
        today = date.today()

        # 遍历所有任务，将已完成且未归档的任务进行归档
        for task in data.get("tasks", []):
            # 检查任务是否已完成且未归档
            if (not task.get("archived", False) and
                    task.get("status") == "已完成"):

                # 检查任务完成时间是否不是今天
                complete_time_str = task.get("complete_time")
                should_archive = False

                if complete_time_str:
                    try:
                        # 解析完成时间字符串
                        if isinstance(complete_time_str, str):
                            # 处理不同的时间格式
                            if 'T' in complete_time_str:
                                complete_date = datetime.fromisoformat(complete_time_str).date()
                            elif '/' in complete_time_str:
                                complete_date = datetime.strptime(complete_time_str, "%Y/%m/%d %H:%M:%S").date()
                            elif '-' in complete_time_str and ':' in complete_time_str:
                                complete_date = datetime.strptime(complete_time_str, "%Y-%m-%d %H:%M:%S").date()
                            else:
                                # 如果无法解析，假设需要归档
                                should_archive = True
                                complete_date = None

                            if complete_date and complete_date != today:
                                should_archive = True
                        else:
                            # 如果complete_time不是字符串，假设需要归档
                            should_archive = True
                    except (ValueError, TypeError):
                        # 解析失败，假设需要归档
                        should_archive = True
                else:
                    # 没有完成时间，假设需要归档
                    should_archive = True

                if should_archive:
                    task["archived"] = True
                    updated_count += 1

        # 保存更新后的数据
        if updated_count > 0 and safe_save_data(data):
            print(f"已归档{updated_count}个任务")
            # 返回可序列化的字典而不是Response对象
            return updated_count
        else:
            return 0

    except Exception as e:
        print(f"批量归档任务时出错: {str(e)}")
        return 0  # 返回数字而不是抛出异常

@app.route('/api/items/craft', methods=['POST'])
def craft_item():
    """合成道具"""
    data = load_data()
    request_data = request.json
    item_name = request_data.get('item_name')
    recipe_index = request_data.get('recipe_index', 0)
    count = request_data.get('count', 1)

    if item_name not in data["items"]:
        return jsonify({"error": "道具不存在"}), 404

    item_info = data["items"][item_name]

    # 检查是否有配方
    if "recipes" not in item_info or not item_info["recipes"]:
        return jsonify({"error": "该道具没有合成配方"}), 400

    # 检查配方索引是否有效
    if recipe_index >= len(item_info["recipes"]):
        return jsonify({"error": "配方索引无效"}), 400

    recipe = item_info["recipes"][recipe_index]

    # 检查材料是否足够
    for material in recipe:
        material_name = material["itemName"]
        required_amount = material["count"] * count

        # 检查材料是否在包裹中存在
        if material_name not in data["backpack"]:
            return jsonify({"error": f"缺少材料: {material_name}"}), 400

        # 检查材料数量是否足够
        if data["backpack"][material_name] < required_amount:
            return jsonify({"error": f"材料 {material_name} 数量不足，需要 {required_amount} 个"}), 400

    # 扣除材料
    for material in recipe:
        material_name = material["itemName"]
        required_amount = material["count"] * count
        data["backpack"][material_name] -= required_amount

        # 如果材料数量为0，可以从背包中移除（可选）
        if data["backpack"][material_name] == 0:
            # 可以选择删除或保留，这里选择保留为0
            pass

    # 增加合成后的道具到包裹
    if item_name not in data["backpack"]:
        data["backpack"][item_name] = 0
    data["backpack"][item_name] += count

    if safe_save_data(data):
        return jsonify({
            "message": f"成功合成 {count} 个 {item_name}",
            "crafted_item": item_name,
            "crafted_count": count,
            "materials_used": recipe
        })
    else:
        return jsonify({"error": "保存数据失败"}), 500

# 添加循环周期检查函数
def check_and_update_cycle_tasks():
    """检查并重置循环任务"""
    data = load_data()
    updated_count = 0
    now = datetime.now()
    for task in data["tasks"]:
        # 检查任务是否为循环任务（非"无循环"类型）且有开始时间
        if task["task_type"] != "无循环" and task.get("start_time"):
            start_time = task["start_time"]
            # print('c1_start_time', start_time, type(start_time))
            if isinstance(task["start_time"], str):
                start_time=start_time.split(' ')[0].split('T')[0]
                if '/' in start_time:
                    start_time = datetime.strptime(start_time, "%Y/%m/%d")
                elif '-' in start_time:
                    start_time = datetime.strptime(start_time, "%Y-%m-%d")
                else:
                    start_time = datetime.strptime(start_time, "%Y%m%d")
                print('c2_task_type', start_time)

            # 判断是否需要重置任务
            should_reset = False
            new_start_time = None

            # 根据循环周期类型检查是否需要重置
            if task["task_type"] == "日循环":
                # 如果不是今天，则需要重置
                # print("无循环：", start_time.date())
                # print("今天：", now.date())
                if start_time.date() != now.date():
                    should_reset = True
                    new_start_time = datetime(now.year, now.month, now.day, 0, 0, 0)
                    # print("无循环reset：", new_start_time)
            elif task["task_type"] == "周循环":
                # 如果不在同一周，则需要重置
                # print("周循环：", start_time.isocalendar())
                # print("今周：", now.isocalendar())
                if start_time.isocalendar()[1] != now.isocalendar()[1] or start_time.year != now.year:
                    should_reset = True
                    new_start_time = datetime(now.year, now.month, now.day - now.weekday(), 0, 0, 0)
                    # print("周循环reset：", should_reset)
            elif task["task_type"] == "月循环":
                # 如果不在同一月，则需要重置
                # print("月循环：", start_time.month)
                # print("今月：", now.month)
                if start_time.month != now.month or start_time.year != now.year:
                    should_reset = True
                    new_start_time = datetime(now.year, now.month, 1, 0, 0, 0)
                    # print("月循环reset：", should_reset)
            elif task["task_type"] == "年循环":
                # 如果不在同一年，则需要重置
                if start_time.year != now.year:
                    should_reset = True
                    new_start_time = datetime(now.year, 1, 1, 0, 0, 0)
            # 如果需要重置，则建立任务拷贝，并更新拷贝的任务状态
            if should_reset:
                # 若循环任务完成过则创建副本，以副本形式分离出已完成任务
                if task["completed_count"]>0:
                    # 创建任务副本
                    task_copy = task.copy()  # 复制原任务的所有属性
                    # 更新副本的ID，确保唯一性
                    new_id = max([t["id"] for t in data["tasks"]], default=0) + 1
                    task_copy["id"] = new_id
                    # 更新字段状态
                    task_copy["task_type"] = "无循环"
                    task_copy["total_completion_count"] = task_copy["completed_count"]
                    if not task_copy["complete_time"] in task_copy:
                        # 完成时间不存在则补全
                        task_copy["complete_time"] = now.strftime("%Y-%m-%d %H:%M:%S")
                    task_copy["status"] = "已完成"
                    task_copy['archived'] = True
                    # 保存副本到任务列表
                    data["tasks"].append(task_copy)

                # 刷新原任务的状态
                task["start_time"] = new_start_time.strftime("%Y-%m-%d %H:%M:%S")
                task["completed_count"] = 0
                task["status"] = "未完成"
                task["archived"] = False
                if "complete_time" in task:
                    del task["complete_time"]

                # 更新数+1
                updated_count += 1

    if updated_count > 0 and safe_save_data(data):
        print(f"已更新{updated_count}个循环任务")

    return updated_count


# 添加定时任务线程
def schedule_daily_tasks():
    """定时执行每日任务"""
    while True:
        now = datetime.now()
        # 计算明天凌晨1点的时间
        next_run = now.replace(hour=1, minute=0, second=0, microsecond=0) + timedelta(days=1)
        if now.hour >= 1:
            next_run = next_run.replace(day=next_run.day)

        # 等待到下次执行时间
        time_to_wait = (next_run - now).total_seconds()
        time.sleep(time_to_wait)

        # 执行批量归档
        batch_archive_tasks()

        # 执行刷新循环任务
        check_and_update_cycle_tasks()
        #refresh_cycle_tasks()

# 在应用启动时启动定时任务
# def start_scheduled_tasks():
#     """启动定时任务"""
#     thread = threading.Thread(target=schedule_daily_tasks)
#     thread.daemon = True
#     thread.start()


@app.route('/api/proxy/image', methods=['POST'])
def proxy_image():
    """图片代理接口，用于解决跨域问题"""
    try:
        data = request.json
        image_url = data.get('url')

        if not image_url:
            return jsonify({"error": "缺少图片URL"}), 400

        # 设置请求头，模拟浏览器访问
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }

        # 获取图片
        response = requests.get(image_url, headers=headers, timeout=10)
        response.raise_for_status()

        # 检查内容类型
        content_type = response.headers.get('content-type', '')
        if not content_type.startswith('image/'):
            return jsonify({"error": "URL不是有效的图片"}), 400

        # 转换为base64
        image_data = response.content
        base64_encoded = base64.b64encode(image_data).decode('utf-8')
        data_uri = f"data:{content_type};base64,{base64_encoded}"

        return jsonify({"base64": data_uri})

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"获取图片失败: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"处理图片失败: {str(e)}"}), 500


# 在其他API路由之后添加文件管理API路由
@app.route('/api/files/tree', methods=['GET'])
def get_file_tree():
    """获取文件树结构"""
    tree = load_file_tree()
    return jsonify(tree)


@app.route('/api/files', methods=['POST'])
def create_file_or_folder():
    """创建文件或文件夹"""
    try:
        data = request.json
        parent_id = data.get('parentId')
        name = data.get('name')
        node_type = data.get('type', 'file')
        content = data.get('content', '') if node_type == 'file' else None

        if not parent_id or not name:
            return jsonify({"error": "缺少必要参数"}), 400

        # 生成新的ID
        new_id = f"{node_type}_{int(datetime.now().timestamp() * 1000)}"

        # 创建节点数据
        new_node = {
            "id": new_id,
            "name": name,
            "type": node_type,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }

        if node_type == 'file':
            new_node["content"] = content
            # 保存文件内容到磁盘
            save_file_content(new_id, content if content else "")
        else:
            new_node["children"] = []

        # 添加到文件树
        tree = load_file_tree()

        def add_node(nodes):
            for node in nodes:
                if node["id"] == parent_id:
                    if node["type"] == "folder":
                        node["children"].append(new_node)
                        node["updatedAt"] = datetime.now().isoformat()
                        return True
                elif node["type"] == "folder" and "children" in node:
                    if add_node(node["children"]):
                        node["updatedAt"] = datetime.now().isoformat()
                        return True
            return False

        add_node(tree)
        save_file_tree(tree)

        return jsonify(new_node), 201

    except Exception as e:
        print(f"创建文件或文件夹失败: {str(e)}")
        return jsonify({"error": "创建失败"}), 500


@app.route('/api/files/<file_id>', methods=['GET'])
def get_file_content(file_id):
    """获取文件内容"""
    try:
        content = load_file_content(file_id)
        return jsonify({"content": content})
    except Exception as e:
        print(f"获取文件内容失败: {str(e)}")
        return jsonify({"error": "获取文件内容失败"}), 500


@app.route('/api/files/<file_id>', methods=['PUT'])
def update_file(file_id):
    """更新文件或文件夹"""
    try:
        data = request.json
        tree = load_file_tree()

        def update_node(nodes):
            for node in nodes:
                if node["id"] == file_id:
                    # 更新名称
                    if "name" in data:
                        node["name"] = data["name"]

                    # 更新文件内容
                    if "content" in data and node["type"] == "file":
                        node["content"] = data["content"]
                        save_file_content(file_id, data["content"])

                    node["updatedAt"] = datetime.now().isoformat()
                    return True
                elif node["type"] == "folder" and "children" in node:
                    if update_node(node["children"]):
                        node["updatedAt"] = datetime.now().isoformat()
                        return True
            return False

        if update_node(tree):
            save_file_tree(tree)
            return jsonify({"message": "更新成功"})
        else:
            return jsonify({"error": "文件或文件夹不存在"}), 404

    except Exception as e:
        print(f"更新文件失败: {str(e)}")
        return jsonify({"error": "更新失败"}), 500


@app.route('/api/files/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    """删除文件或文件夹"""
    try:
        tree = load_file_tree()

        def remove_node(nodes):
            for i, node in enumerate(nodes):
                if node["id"] == file_id:
                    # 删除文件内容
                    if node["type"] == "file":
                        delete_file_content(file_id)
                    # 如果是文件夹，递归删除所有子文件
                    elif node["type"] == "folder" and "children" in node:
                        def delete_children(children):
                            for child in children:
                                if child["type"] == "file":
                                    delete_file_content(child["id"])
                                elif child["type"] == "folder" and "children" in child:
                                    delete_children(child["children"])

                        delete_children(node.get("children", []))

                    nodes.pop(i)
                    return True
                elif node["type"] == "folder" and "children" in node:
                    if remove_node(node["children"]):
                        return True
            return False

        if remove_node(tree):
            save_file_tree(tree)
            return jsonify({"message": "删除成功"})
        else:
            return jsonify({"error": "文件或文件夹不存在"}), 404

    except Exception as e:
        print(f"删除文件失败: {str(e)}")
        return jsonify({"error": "删除失败"}), 500


@app.route('/api/load-markdown-file/<file_id>', methods=['GET'])
def load_markdown_file(file_id):
    """加载Markdown文件内容"""
    try:
        file_path = get_journal_path(file_id)
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({'content': content}), 200
        else:
            # 文件不存在，返回空内容
            return jsonify({'content': ''}), 200
    except Exception as e:
        print(f"加载文件失败: {str(e)}")
        return jsonify({'error': '加载文件失败'}), 500


@app.route('/api/save-markdown-file', methods=['POST'])
def save_markdown_file():
    """保存Markdown文件内容"""
    try:
        data = request.get_json()
        file_id = data.get('fileId')
        content = data.get('content')

        if not file_id or content is None:
            return jsonify({'error': '缺少必要参数'}), 400

        file_path = get_journal_path(file_id)

        # 确保目录存在
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        return jsonify({'message': '保存成功'}), 200
    except Exception as e:
        print(f"保存文件失败: {str(e)}")
        return jsonify({'error': '保存文件失败'}), 500




@app.route('/api/tasks/refresh-cycle', methods=['POST'])
def refresh_cycle_tasks():
    """手动刷新循环任务"""
    try:
        updated_count = check_and_update_cycle_tasks()
        return jsonify({"message": f"成功刷新{updated_count}个循环任务", "updated_count": updated_count}), 200
    except Exception as e:
        return jsonify({"error": f"刷新失败: {str(e)}"}), 500

# 批量归档API端点
@app.route('/api/tasks/batch-archive', methods=['POST'])
def batch_archive_tasks_api():
    """API端点：批量归档已完成的任务"""
    try:
        updated_count = batch_archive_tasks()
        return jsonify({
            "message": f"成功归档{updated_count}个任务",
            "archived_count": updated_count
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/auto-tasks/execute', methods=['POST'])
def execute_auto_tasks_manually():
    """手动触发执行自动任务"""
    try:
        execute_daily_auto_tasks()
        return jsonify({"message": "自动任务执行完成"}), 200
    except Exception as e:
        return jsonify({"error": f"执行自动任务失败: {str(e)}"}), 500


@app.route('/api/auto-tasks/status', methods=['GET'])
def get_auto_tasks_status():
    """获取自动任务状态"""
    try:
        auto_task_log = get_auto_task_status()
        current_date = date.today().isoformat()

        return jsonify({
            "last_archive_date": auto_task_log.get("last_archive_date"),
            "last_recycle_date": auto_task_log.get("last_recycle_date"),
            "today": current_date,
            "archive_executed_today": auto_task_log.get("last_archive_date") == current_date,
            "recycle_executed_today": auto_task_log.get("last_recycle_date") == current_date
        }), 200
    except Exception as e:
        return jsonify({"error": f"获取自动任务状态失败: {str(e)}"}), 500


@app.route('/api/jnl/check/<date_str>', methods=['GET'])
def check_daily_log_exists(date_str):
    """检查指定日期的日志文件是否存在"""
    try:
        # 构造日志文件名
        log_filename = f"jnl_{date_str}.md"
        log_file_path = os.path.join(JOURNALS_DIR, log_filename)

        # 检查文件是否存在
        exists = os.path.exists(log_file_path)

        return jsonify({
            "exists": exists,
            "filename": log_filename,
            "filepath": log_file_path,
            "date": date_str
        })
    except Exception as e:
        print(f"检查日志文件时出错: {str(e)}")
        return jsonify({"error": f"检查日志文件失败: {str(e)}"}), 500


@app.route('/api/jnl/list', methods=['GET'])
def list_daily_logs():
    """获取所有日志文件列表"""
    try:
        log_files = []
        if os.path.exists(JOURNALS_DIR):
            # 遍历文件夹，查找所有以jnl_开头的.md文件
            for filename in os.listdir(JOURNALS_DIR):
                if filename.startswith('jnl_') and filename.endswith('.md'):
                    # 提取日期部分 (jnl_YYYY-MM-DD.md)
                    date_part = filename[4:-3]  # 去掉'jnl_'前缀和'.md'后缀
                    log_files.append(date_part)

        return jsonify({
            "logs": log_files,
            "count": len(log_files)
        })
    except Exception as e:
        print(f"获取日志文件列表时出错: {str(e)}")
        return jsonify({"error": f"获取日志文件列表失败: {str(e)}"}), 500


@app.route('/api/jnl/delete/<filename_str>', methods=['DELETE'])
def delete_daily_log(filename_str):
    """删除指定文件名的文件"""
    try:
        log_filename = filename_str
        log_file_path = os.path.join(JOURNALS_DIR, log_filename)

        # 检查文件是否存在
        if not os.path.exists(log_file_path):
            return jsonify({"error": "文件不存在"}), 404

        # 删除文件
        os.remove(log_file_path)

        return jsonify({
            "message": f"文件 {log_filename} 已删除",
            "filename": log_filename,
            # "date": date_str
        })
    except Exception as e:
        print(f"删除文件时出错: {str(e)}")
        return jsonify({"error": f"删除文件失败: {str(e)}"}), 500


# 图片处理api #
@app.route('/api/files/upload-image', methods=['POST'])
def upload_image():
    """上传图片文件"""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "没有上传文件"}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "未选择文件"}), 400

        if file:
            # 生成安全的文件名
            filename = secure_filename(file.filename)
            name, ext = os.path.splitext(filename)
            if not ext:
                ext = '.png'
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_filename = f"img_{timestamp}_{uuid.uuid4().hex[:4]}{ext}"

            # 保存文件
            file_path = os.path.join(IMAGES_DIR, unique_filename)
            file.save(file_path)

            # 返回完整的图片URL（相对于前端的访问路径）
            image_url = f"/files/images/{unique_filename}"
            return jsonify({
                "url": image_url,
                "filename": unique_filename
            }), 200

    except Exception as e:
        print(f"上传图片失败: {str(e)}")
        return jsonify({"error": f"上传图片失败: {str(e)}"}), 500

@app.route('/api/files/images', methods=['GET'])
def get_images_list():
    """获取图片文件列表"""
    try:
        images = []
        if os.path.exists(IMAGES_DIR):
            for filename in os.listdir(IMAGES_DIR):
                file_path = os.path.join(IMAGES_DIR, filename)
                if os.path.isfile(file_path) and filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                    stat = os.stat(file_path)
                    images.append({
                        "name": filename,
                        "size": stat.st_size,
                        "createdAt": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "updatedAt": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
        return jsonify(images)
    except Exception as e:
        print(f"获取图片列表失败: {str(e)}")
        return jsonify([]), 500


@app.route('/api/files/images/unused', methods=['GET'])
def get_unused_images():
    """获取未使用的图片文件列表"""
    try:
        images = get_all_image_files()
        used_images = get_used_images_in_notes()

        unused_images = [img for img in images if img["name"] not in used_images]
        return jsonify({"images": unused_images}), 200
    except Exception as e:
        print(f"获取未使用图片列表失败: {str(e)}")
        return jsonify({"error": f"获取未使用图片列表失败: {str(e)}"}), 500


@app.route('/api/files/images/<filename>', methods=['DELETE'])
def delete_image(filename):
    """删除指定图片文件"""
    try:
        file_path = os.path.join(IMAGES_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"message": f"图片 {filename} 已删除"}), 200
        else:
            return jsonify({"error": "图片文件不存在"}), 404
    except Exception as e:
        print(f"删除图片失败: {str(e)}")
        return jsonify({"error": f"删除图片失败: {str(e)}"}), 500


@app.route('/api/files/images/delete-unused', methods=['DELETE'])
def delete_unused_images():
    """删除所有未使用的图片文件"""
    try:
        used_images = get_used_images_in_notes()
        deleted_count = 0

        if os.path.exists(IMAGES_DIR):
            for filename in os.listdir(IMAGES_DIR):
                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp')):
                    if filename not in used_images:
                        file_path = os.path.join(IMAGES_DIR, filename)
                        os.remove(file_path)
                        deleted_count += 1

        return jsonify({
            "message": f"已删除 {deleted_count} 个未使用的图片文件",
            "deleted_count": deleted_count
        }), 200
    except Exception as e:
        print(f"删除未使用图片失败: {str(e)}")
        return jsonify({"error": f"删除未使用图片失败: {str(e)}"}), 500


# 添加静态文件路由以提供图片访问
@app.route('/files/images/<filename>')
def serve_image(filename):
    """提供图片文件访问"""
    try:
        return send_from_directory(IMAGES_DIR, filename)
    except Exception as e:
        print(f"提供图片文件失败: {str(e)}")
        return jsonify({"error": "文件不存在"}), 404


@app.route('/api/files/journals', methods=['GET'])
def get_journals_list():
    """获取日志文件列表"""
    try:
        journals = []
        if os.path.exists(JOURNALS_DIR):  # 确保 JOURNALS_DIR 已定义
            for filename in os.listdir(JOURNALS_DIR):
                file_path = os.path.join(JOURNALS_DIR, filename)
                if os.path.isfile(file_path) and filename.endswith('.md'):
                    stat = os.stat(file_path)
                    journals.append({
                        "name": filename,
                        "size": stat.st_size,
                        "createdAt": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "updatedAt": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
        return jsonify(journals)
    except Exception as e:
        print(f"获取日志列表失败: {str(e)}")
        return jsonify([]), 500

@app.route('/api/files/journal/<filename>', methods=['GET'])
def get_journal_content(filename):
    """获取日志文件内容"""
    try:
        file_path = os.path.join(JOURNALS_DIR, filename)
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({
                "content": content,
                "filename": filename,
                "size": os.path.getsize(file_path),
                "createdAt": datetime.fromtimestamp(os.path.getctime(file_path)).isoformat(),
                "updatedAt": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
            })
        else:
            return jsonify({"error": "文件不存在"}), 404
    except Exception as e:
        print(f"读取日志文件失败: {str(e)}")
        return jsonify({"error": f"读取文件失败: {str(e)}"}), 500


@app.route('/api/files/journal/<filename>', methods=['DELETE'])
def delete_journal_file(filename):
    """删除日志文件"""
    try:
        file_path = os.path.join(JOURNALS_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"message": f"日志文件 {filename} 已删除"})
        else:
            return jsonify({"error": "文件不存在"}), 404
    except Exception as e:
        print(f"删除日志文件失败: {str(e)}")
        return jsonify({"error": f"删除文件失败: {str(e)}"}), 500


@app.route('/api/files/journals/batch-delete', methods=['POST'])
def batch_delete_journal_files():
    """批量删除日志文件"""
    try:
        data = request.json
        file_names = data.get('fileNames', [])

        deleted_files = []
        errors = []

        for filename in file_names:
            file_path = os.path.join(JOURNALS_DIR, filename)
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    deleted_files.append(filename)
                else:
                    errors.append(f"文件 {filename} 不存在")
            except Exception as e:
                errors.append(f"删除文件 {filename} 失败: {str(e)}")

        if errors:
            return jsonify({
                "message": f"成功删除 {len(deleted_files)} 个文件",
                "deleted_files": deleted_files,
                "errors": errors
            }), 207  # Multi-Status
        else:
            return jsonify({
                "message": f"成功删除 {len(deleted_files)} 个文件",
                "deleted_files": deleted_files
            })
    except Exception as e:
        print(f"批量删除日志文件失败: {str(e)}")
        return jsonify({"error": f"批量删除文件失败: {str(e)}"}), 500

@app.route('/api/files/images/batch-delete', methods=['POST'])
def batch_delete_images():
    """批量删除图片文件"""
    try:
        data = request.json
        file_names = data.get('fileNames', [])

        deleted_files = []
        errors = []

        for filename in file_names:
            file_path = os.path.join(IMAGES_DIR, filename)
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    deleted_files.append(filename)
                else:
                    errors.append(f"文件 {filename} 不存在")
            except Exception as e:
                errors.append(f"删除文件 {filename} 失败: {str(e)}")

        if errors:
            return jsonify({
                "message": f"成功删除 {len(deleted_files)} 个文件",
                "deleted_files": deleted_files,
                "errors": errors
            }), 207  # Multi-Status
        else:
            return jsonify({
                "message": f"成功删除 {len(deleted_files)} 个文件",
                "deleted_files": deleted_files
            })
    except Exception as e:
        print(f"批量删除图片文件失败: {str(e)}")
        return jsonify({"error": f"批量删除文件失败: {str(e)}"}), 500

@app.route('/api/files/image/<filename>', methods=['DELETE'])
def delete_image_file(filename):
    """删除图片文件"""
    try:
        file_path = os.path.join(IMAGES_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"message": f"图片文件 {filename} 已删除"})
        else:
            return jsonify({"error": "文件不存在"}), 404
    except Exception as e:
        print(f"删除图片文件失败: {str(e)}")
        return jsonify({"error": f"删除文件失败: {str(e)}"}), 500



@app.route('/api/files/<file_id>/move', methods=['PUT'])
def move_file(file_id):
    """移动文件或文件夹到指定目标文件夹"""
    try:
        data = request.json
        target_folder_id = data.get('targetFolderId')

        if not target_folder_id:
            return jsonify({"error": "缺少目标文件夹ID"}), 400

        # 加载文件树
        file_tree = load_file_tree()

        # 查找源文件/文件夹
        source_node = find_node_in_tree(file_tree, file_id)
        if not source_node:
            return jsonify({"error": "源文件或文件夹不存在"}), 404

        # 查找目标文件夹
        target_folder = find_node_in_tree(file_tree, target_folder_id)
        if not target_folder or target_folder["type"] != "folder":
            return jsonify({"error": "目标文件夹不存在或不是文件夹"}), 400

        # 检查是否尝试将文件夹移动到自身或其子文件夹中
        if source_node["type"] == "folder":
            if target_folder_id == file_id:
                return jsonify({"error": "不能将文件夹移动到自身"}), 400

            # 检查目标是否是源的子文件夹
            if is_descendant_of(target_folder, source_node):
                return jsonify({"error": "不能将文件夹移动到其子文件夹中"}), 400

        # 从原位置移除
        remove_node_from_tree(file_tree, file_id)

        # 添加到新位置
        target_folder["children"].append(source_node)

        # 保存更新后的文件树
        if save_file_tree(file_tree):
            return jsonify({"message": "移动成功"}), 200
        else:
            return jsonify({"error": "保存文件树失败"}), 500

    except Exception as e:
        print(f"移动文件时出错: {str(e)}")
        return jsonify({"error": f"移动文件失败: {str(e)}"}), 500

def find_node_in_tree(nodes, node_id):
    """在文件树中查找指定ID的节点"""
    for node in nodes:
        if node["id"] == node_id:
            return node
        if node["type"] == "folder" and "children" in node:
            found = find_node_in_tree(node["children"], node_id)
            if found:
                return found
    return None

def remove_node_from_tree(nodes, node_id):
    """从文件树中移除指定ID的节点"""
    for i, node in enumerate(nodes):
        if node["id"] == node_id:
            return nodes.pop(i)
        if node["type"] == "folder" and "children" in node:
            removed = remove_node_from_tree(node["children"], node_id)
            if removed:
                return removed
    return None

def is_descendant_of(target_folder, source_folder):
    """检查目标文件夹是否是源文件夹的后代（用于防止循环引用）"""
    # 如果目标文件夹就是源文件夹，返回True（防止移动到自身）
    if target_folder["id"] == source_folder["id"]:
        return True

    # 如果目标不是文件夹，返回False
    if target_folder["type"] != "folder":
        return False

    # 递归检查目标文件夹的所有父级路径
    # 这里需要一个辅助函数来查找目标文件夹在文件树中的路径

    # 简化实现：如果无法确定完整路径，可以只检查直接包含关系
    return False


@app.route('/api/settings/toolbar', methods=['POST'])
def update_toolbar_settings():
    """更新工具栏设置"""
    try:
        # 获取请求数据
        new_settings = request.json

        # 加载现有设置
        settings = load_settings()

        # 更新工具栏设置
        settings['toolbarSettings'] = new_settings

        # 保存设置
        if save_settings(settings):
            return jsonify({
                "message": "工具栏设置已更新",
                "settings": new_settings
            })
        else:
            return jsonify({"error": "保存设置失败"}), 500

    except Exception as e:
        print(f"更新工具栏设置时出错: {str(e)}")
        return jsonify({"error": f"更新工具栏设置失败: {str(e)}"}), 500


@app.route('/api/settings/toolbar', methods=['GET'])
def get_toolbar_settings():
    """获取工具栏设置"""
    try:
        # 加载设置
        settings = load_settings()

        # 获取工具栏设置，如果没有则返回默认设置
        toolbar_settings = settings.get('toolbarSettings', {
            "buttons": [
                {"id": "position", "type": "control", "visible": True},
                {"id": "list", "type": "view", "visible": True},
                {"id": "board", "type": "view", "visible": True},
                {"id": "calendar", "type": "view", "visible": True},
                {"id": "card", "type": "view", "visible": True},
                {"id": "scale", "type": "control", "visible": True},
                {"id": "hide", "type": "control", "visible": True},
                {"id": "logs", "type": "control", "visible": True},
                {"id": "quick", "type": "control", "visible": True},
                {"id": "refresh", "type": "control", "visible": True}
            ]
        })

        return jsonify(toolbar_settings)

    except Exception as e:
        print(f"获取工具栏设置时出错: {str(e)}")
        return jsonify({"error": f"获取工具栏设置失败: {str(e)}"}), 500

if __name__ == '__main__':
    #start_scheduled_tasks()
    app.run(host='0.0.0.0',debug=True, port=5000)
    # check_and_update_cycle_tasks()
    #complete_task('3')
