# 项目会话记录

## 项目基本信息
- **项目名称**: obsidian-snapshot（原为obsidian_export_all，已改名）
- **项目类型**: Obsidian插件
- **主要功能**: 将Obsidian笔记导出为PNG图像或PDF文件（包含元数据、标题、正文）

## 当前问题
**PDF导出功能有bug**：导出的PDF文件大部分内容为空白，虽然最新修复后已显示property信息，但仍有其他问题待解决。

## 调试过程与修复历史

### 第一次修复尝试
- **问题**: Obsidian的图像使用`app://`协议，在iframe中无法加载
- **方案**: 添加`convertImagesToDataUrls()`方法，在导出前将所有图像转换为Data URL格式
- **结果**: 无显著改善

### 第二次修复尝试
- **问题**: iframe太小且透明度太低，导致打印时无法正确渲染
- **方案**:
  - 将iframe改为A4纸张大小（210mm × 297mm）
  - 设为可见，居中显示，用户可以看到预览
  - 增加样式等待时间从200ms到500ms
- **结果**: 白色预览窗口出现，但仍只显示标题

### 第三次修复尝试
- **问题**: 原始容器的内联样式（cssText）包含CSS变量，这些变量在iframe中未定义，导致内容不可见
- **方案**:
  - 改用`innerHTML`而不是`cloneNode(true)`
  - 不复制cssText，而是显式设置每个样式属性为具体值（如`backgroundColor='white'`）
- **结果**: 仍无改善

### 第四次修复尝试（关键发现）
- **问题**: 复制的17个Obsidian样式表中可能包含隐藏内容的CSS规则
- **方案**: 完全不复制Obsidian样式表，只使用自定义的CSS样式规则
- **结果**: **property信息已显示！** 但仍存在其他问题

## 最新代码状态

### 关键代码位置
- **主源文件**: `main.ts:172-365` - `exportAsPDF()`方法
- **新增方法**: `main.ts:367-395` - `convertImagesToDataUrls()`方法
- **调试日志**: 已添加多个console.log语句，用于追踪导出过程

### 当前CSS样式策略
- 不复制Obsidian样式表
- 使用硬编码的具体CSS值（颜色、字体、间距等）
- 对所有元素添加`visibility: visible !important`和`display: block !important`
- 详细定义各个元素样式：`.export-title`, `.metadata-container`, `.markdown-preview-view`等

## 最近的改名工作
- **时间**: 本次会话最后
- **更改内容**:
  - `manifest.json`: `id` 从 "obsidian-export-plus" 改为 "obsidian-snapshot"
  - `manifest.json`: `name` 从 "Export Plus" 改为 "Obsidian Snapshot"
  - `package.json`: `name` 从 "obsidian-export-plus" 改为 "obsidian-snapshot"
- **待完成**: 项目目录重命名（从 obsidian_export_all 改为 obsidian-snapshot）

## 测试文件信息
- **位置**: `.attachment/打印测试文件.md`
- **内容**:
  ```markdown
  ---
  Test1: Test
  Test2: Test
  ---
  你好，这里是正文内容。
  ```

## 下一步计划
1. 完成项目目录重命名（obsidian_export_all → obsidian-snapshot）
2. 继续调试PDF导出的剩余问题
3. 推送到GitHub私人仓库

## 控制台输出日志
最后一次测试的关键日志：
- Container HTML length: 1204
- Container children count: 3
- PDF Export - Original element HTML length: 1204
- PDF Export - Original element children: 3
- PDF Export - Cloned element HTML length: 1204
- PDF Export - Cloned element children: 3
- iframe body HTML: 完整包含title、properties、content三个部分

## 重要代码片段

### convertImagesToDataUrls方法
用Canvas API将Obsidian的`app://`协议图像转换为Data URL，确保在iframe中可显示。

### 样式规则覆盖
添加了全面的CSS样式，包括：
- 基本元素（html, body, *）
- 容器（.obsidian-export-plus-container）
- 标题（.export-title）
- 属性（.metadata-container, .metadata-property等）
- Markdown内容（.markdown-preview-view及其子元素）
- 打印特定规则（@media print）

---
**创建时间**: 2026-01-11
**最后更新**: 会话结束前
