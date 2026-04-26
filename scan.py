#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Windows 文件夹扫描工具
扫描指定目录下所有 .ts / .html / .vue / .css 文件，
将文件树和每个文件的完整内容输出到一个文本文件中。
"""

import argparse
from pathlib import Path
from typing import Set, List, TextIO

# 需要匹配的文件扩展名（不区分大小写）
TARGET_EXTENSIONS: Set[str] = {'.ts', '.html', '.vue', '.css','.yml','.json'}

def has_matching_files(path: Path, extensions: Set[str]) -> bool:
    """
    判断目录或文件下是否存在匹配扩展名的文件（递归）。
    """
    if path.is_file():
        return path.suffix.lower() in extensions

    # 目录：遍历所有子项
    try:
        for child in path.iterdir():
            if child.is_dir():
                if has_matching_files(child, extensions):
                    return True
            elif child.suffix.lower() in extensions:
                return True
    except PermissionError:
        # 忽略无权限访问的目录
        pass
    return False


def print_tree(
    dir_path: Path,
    extensions: Set[str],
    file_handle: TextIO,
    collected_files: List[Path],
    prefix: str = ''
):
    """
    递归打印树形结构到文件句柄，同时按出现顺序收集所有匹配文件。
    """
    entries: List[Path] = []
    # 收集当前目录下需要显示的项：目录（内部有匹配文件）或匹配文件
    try:
        for child in dir_path.iterdir():
            if child.is_dir():
                if has_matching_files(child, extensions):
                    entries.append(child)
            elif child.suffix.lower() in extensions:
                entries.append(child)
    except PermissionError:
        return

    # 排序：目录在前，文件在后，同类型按名称排序
    entries.sort(key=lambda p: (not p.is_dir(), p.name.lower()))

    for i, entry in enumerate(entries):
        is_last = (i == len(entries) - 1)
        connector = '└── ' if is_last else '├── '
        file_handle.write(prefix + connector + entry.name + '\n')

        if entry.is_dir():
            extension = '    ' if is_last else '│   '
            print_tree(entry, extensions, file_handle, collected_files, prefix + extension)
        else:
            # 文件：加入收集列表，用于后续输出内容
            collected_files.append(entry)


def read_file_content(path: Path) -> str:
    """
    读取文本文件内容，自动尝试 UTF-8 和 GBK 编码。
    若都失败，则返回错误提示。
    """
    encodings = ['utf-8', 'gbk']
    for enc in encodings:
        try:
            with open(path, 'r', encoding=enc) as f:
                return f.read()
        except (UnicodeDecodeError, LookupError):
            continue
        except Exception as e:
            return f"<读取文件时出错: {e}>"
    return "<无法解码文件内容，请检查文件编码>"


def main():
    parser = argparse.ArgumentParser(
        description='扫描目录下的 TypeScript/HTML/Vue/CSS 文件，生成文件树并输出全部文件内容到文本文件'
    )
    parser.add_argument(
        'directory', nargs='?', default='.',
        help='要扫描的目录路径（默认为当前目录）'
    )
    parser.add_argument(
        '-o', '--output', default='scan_result.txt',
        help='输出文本文件名（默认为 scan_result.txt）'
    )
    args = parser.parse_args()

    root = Path(args.directory).resolve()
    if not root.exists():
        print(f'错误：路径不存在 - {root}')
        return
    if not root.is_dir():
        print(f'错误：路径不是目录 - {root}')
        return

    # 打开输出文件（UTF-8 编码）
    with open(args.output, 'w', encoding='utf-8') as out_f:
        # 写入根目录名
        out_f.write(root.name if root.name else str(root) + '\n')

        # 收集所有匹配文件（按树遍历顺序）
        matched_files: List[Path] = []
        print_tree(root, TARGET_EXTENSIONS, out_f, matched_files)

        # 如果没有匹配的文件，给出提示
        if not matched_files:
            out_f.write('\n未找到任何 .ts / .html / .vue / .css 文件。\n')
            print(f'未找到任何匹配文件，结果已写入 {args.output}')
            return

        # 写入分隔线
        out_f.write('\n' + '=' * 80 + '\n')
        out_f.write('以下为各文件的完整内容（按文件树顺序）\n')
        out_f.write('=' * 80 + '\n\n')

        # 逐个输出文件路径和内容
        for file_path in matched_files:
            out_f.write(f'文件: {file_path}\n')
            out_f.write('-' * 60 + '\n')
            content = read_file_content(file_path)
            out_f.write(content)
            out_f.write('\n\n' + '-' * 60 + '\n\n')

    print(f'扫描完成！结果已保存到 {args.output}')


if __name__ == '__main__':
    main()