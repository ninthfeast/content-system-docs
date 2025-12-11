/**
 * 批量转换Markdown文件到Docusaurus格式
 *
 * 功能：
 * 1. 自动为markdown文件添加frontmatter
 * 2. 处理文件夹结构和层级
 * 3. 转换内部链接格式
 * 4. 保持原有文件组织结构
 */

import * as fs from 'fs';
import * as path from 'path';

interface FrontMatter {
  title: string;
  sidebar_position?: number;
  sidebar_label?: string;
  description?: string;
  tags?: string[];
}

interface FileMapping {
  sourcePath: string;
  targetPath: string;
  title: string;
  category?: string;
}

// 配置源文件夹和目标文件夹
const SOURCE_DIR = path.join(__dirname, '../../持续内容生成系统');
const TARGET_DIR = path.join(__dirname, '../docs');

// 文件夹到分类的映射
const FOLDER_CATEGORIES: Record<string, { label: string; position: number; description: string }> = {
  '案例研究': {
    label: '案例研究',
    position: 20,
    description: '深度解析真实系统的技术架构与设计思路'
  },
  '技术深度': {
    label: '技术深度',
    position: 30,
    description: '专项技术攻略与深入探讨'
  },
  '行业应用': {
    label: '行业应用',
    position: 40,
    description: '垂直领域的实践应用'
  },
  '商业与变现': {
    label: '商业与变现',
    position: 50,
    description: '产品化策略与商业模式'
  },
  '视觉与设计': {
    label: '视觉与设计',
    position: 60,
    description: '用户体验与界面设计'
  },
  '进阶专题': {
    label: '进阶专题',
    position: 70,
    description: '前沿技术与高级话题'
  },
  '实战方案': {
    label: '实战方案',
    position: 80,
    description: '可落地执行的完整方案'
  }
};

// 提取标题（从文件名或第一行）
function extractTitle(content: string, filename: string): string {
  const firstLine = content.split('\n')[0];
  if (firstLine.startsWith('# ')) {
    return firstLine.replace(/^#\s+/, '').trim();
  }
  // 从文件名提取标题
  return filename.replace(/^\d+-/, '').replace(/\.md$/, '');
}

// 提取描述（从内容的前几行）
function extractDescription(content: string): string {
  const lines = content.split('\n');
  for (let i = 1; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#') && !line.startsWith('---')) {
      return line.substring(0, 150);
    }
  }
  return '';
}

// 转义YAML字符串
function escapeYamlString(str: string): string {
  // 移除或替换可能导致YAML解析错误的字符
  return str
    .replace(/"/g, '\\"')  // 转义双引号
    .replace(/\n/g, ' ')   // 移除换行
    .replace(/\r/g, '')    // 移除回车
    .replace(/\t/g, ' ')   // 替换制表符
    .trim();
}

// 生成frontmatter
function generateFrontMatter(data: FrontMatter): string {
  const lines = ['---'];

  // 标题必须转义
  lines.push(`title: "${escapeYamlString(data.title)}"`);

  if (data.sidebar_position !== undefined) {
    lines.push(`sidebar_position: ${data.sidebar_position}`);
  }

  if (data.sidebar_label) {
    lines.push(`sidebar_label: "${escapeYamlString(data.sidebar_label)}"`);
  }

  if (data.description) {
    const cleanDesc = escapeYamlString(data.description);
    if (cleanDesc) {
      lines.push(`description: "${cleanDesc}"`);
    }
  }

  // 只有当tags非空时才添加
  if (data.tags && data.tags.length > 0) {
    lines.push('tags:');
    data.tags.forEach(tag => {
      lines.push(`  - "${escapeYamlString(tag)}"`);
    });
  }

  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

// 转换链接格式
function convertLinks(content: string): string {
  // 转换 ./文件名.md 格式的链接
  content = content.replace(/\]\(\.\/([^)]+)\.md\)/g, '](../$1)');

  // 转换 文件夹/文件名.md 格式的链接
  content = content.replace(/\]\(([^/]+)\/([^)]+)\.md\)/g, '](../$1/$2)');

  return content;
}

// 转义MDX特殊字符
function escapeMDXContent(content: string): string {
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlockFence = '';

  return lines.map(line => {
    // 检测代码块
    const fenceMatch = line.match(/^(```+|~~~+)/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockFence = fenceMatch[1];
      } else if (line.startsWith(codeBlockFence)) {
        inCodeBlock = false;
        codeBlockFence = '';
      }
      return line;
    }

    // 在代码块内不处理
    if (inCodeBlock) {
      return line;
    }

    // 不处理已经在内联代码中的内容
    // 先保护内联代码
    const inlineCodeParts: string[] = [];
    let processedLine = line.replace(/`[^`]+`/g, (match) => {
      inlineCodeParts.push(match);
      return `__INLINE_CODE_${inlineCodeParts.length - 1}__`;
    });

    // 转义MDX特殊字符（不在代码块和内联代码中）
    // 转义 < 和 > 当它们不是HTML标签时
    processedLine = processedLine.replace(/([^\\])<(\d+)/g, '$1\\<$2');  // <1 -> \<1
    processedLine = processedLine.replace(/([^\\])>(\d+)/g, '$1\\>$2');  // >1 -> \>1

    // 转义独立的花括号
    processedLine = processedLine.replace(/([^\\])\{([^}]*)\}/g, (match, before, inside) => {
      // 如果看起来像JSX表达式，则转义
      if (!inside.includes(':') && !inside.includes('=')) {
        return `${before}\\{${inside}\\}`;
      }
      return match;
    });

    // 恢复内联代码
    processedLine = processedLine.replace(/__INLINE_CODE_(\d+)__/g, (_, index) => {
      return inlineCodeParts[parseInt(index)];
    });

    return processedLine;
  }).join('\n');
}

// 处理markdown文件
function processMarkdownFile(
  sourcePath: string,
  targetPath: string,
  position?: number,
  category?: string
): void {
  const content = fs.readFileSync(sourcePath, 'utf-8');
  const filename = path.basename(sourcePath);

  // 检查是否已有frontmatter
  const hasFrontMatter = content.startsWith('---');

  if (hasFrontMatter) {
    // 已有frontmatter，只转换链接
    const convertedContent = convertLinks(content);
    fs.writeFileSync(targetPath, convertedContent);
    return;
  }

  // 提取信息
  const title = extractTitle(content, filename);
  const description = extractDescription(content);

  // 生成tags
  const tags: string[] = [];
  if (category) tags.push(category);
  if (content.includes('实时')) tags.push('实时系统');
  if (content.includes('架构')) tags.push('架构设计');
  if (content.includes('WebSocket')) tags.push('WebSocket');
  if (content.includes('AI')) tags.push('AI');

  // 生成frontmatter
  const frontMatter = generateFrontMatter({
    title,
    sidebar_position: position,
    description,
    tags
  });

  // 移除原有的第一行标题（如果存在）
  let bodyContent = content;
  const lines = content.split('\n');
  if (lines[0].startsWith('# ')) {
    bodyContent = lines.slice(1).join('\n').trim();
  }

  // 转换链接
  bodyContent = convertLinks(bodyContent);

  // 转义MDX特殊字符
  bodyContent = escapeMDXContent(bodyContent);

  // 组合最终内容
  const finalContent = frontMatter + '\n' + bodyContent;

  // 写入文件
  fs.writeFileSync(targetPath, finalContent);
}

// 创建分类索引文件
function createCategoryIndex(
  categoryName: string,
  targetDir: string
): void {
  const config = FOLDER_CATEGORIES[categoryName];
  if (!config) return;

  const indexContent = `---
title: ${config.label}
sidebar_position: ${config.position}
description: ${config.description}
---

# ${config.label}

${config.description}

请从左侧菜单选择具体文档阅读。
`;

  fs.writeFileSync(path.join(targetDir, '_category_.json'), JSON.stringify({
    label: config.label,
    position: config.position,
    link: {
      type: 'generated-index',
      description: config.description
    }
  }, null, 2));
}

// 递归处理目录
function processDirectory(sourceDir: string, targetDir: string, category?: string): void {
  // 确保目标目录存在
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const items = fs.readdirSync(sourceDir);

  let filePosition = 1;

  items.forEach(item => {
    // 跳过隐藏文件
    if (item.startsWith('.')) return;

    const sourcePath = path.join(sourceDir, item);
    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      // 处理子目录
      const subCategory = FOLDER_CATEGORIES[item] ? item : category;
      const targetSubDir = path.join(targetDir, item);

      processDirectory(sourcePath, targetSubDir, subCategory);

      // 为分类创建索引
      if (FOLDER_CATEGORIES[item]) {
        createCategoryIndex(item, targetSubDir);
      }
    } else if (item.endsWith('.md')) {
      // 处理markdown文件
      let targetFilename = item;
      let position = filePosition++;

      // 特殊处理编号文件
      const match = item.match(/^(\d+)-(.+)\.md$/);
      if (match) {
        position = parseInt(match[1]);
        targetFilename = item; // 保持原文件名
      }

      // 特殊处理README和内容总览
      if (item === 'README.md') {
        targetFilename = 'index.md';
        position = 1;
      } else if (item === '内容总览.md') {
        position = 2;
      }

      const targetPath = path.join(targetDir, targetFilename);
      processMarkdownFile(sourcePath, targetPath, position, category);

      console.log(`✓ 已处理: ${item} -> ${targetFilename}`);
    }
  });
}

// 清空目标目录
function cleanTargetDir(): void {
  if (fs.existsSync(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true });
  }
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// 主函数
function main() {
  console.log('🚀 开始迁移文档...\n');
  console.log(`源目录: ${SOURCE_DIR}`);
  console.log(`目标目录: ${TARGET_DIR}\n`);

  // 检查源目录是否存在
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ 源目录不存在: ${SOURCE_DIR}`);
    process.exit(1);
  }

  // 清空并创建目标目录
  cleanTargetDir();

  // 开始处理
  processDirectory(SOURCE_DIR, TARGET_DIR);

  console.log('\n✅ 文档迁移完成！');
  console.log('\n下一步：');
  console.log('1. 检查生成的文档格式');
  console.log('2. 运行 pnpm start 预览效果');
  console.log('3. 调整 docusaurus.config.ts 中的配置');
}

// 运行脚本
main();
