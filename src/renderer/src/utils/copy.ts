/**
 * 复制到剪贴板工具函数
 * 提供高可靠性的复制功能
 */

/**
 * 高可靠性的复制到剪贴板函数
 * 结合多种方法确保复制成功
 * @param text 要复制的文本
 * @param itemName 复制项的名称（用于日志）
 * @returns 是否复制成功
 */
export async function copyToClipboard(
  text: string,
  itemName: string = '内容'
): Promise<boolean> {
  if (!text || text.trim() === '') {
    console.warn('复制内容为空');
    return false;
  }

  // 方法1: 使用现代 Clipboard API（首选）
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`使用Clipboard API复制${itemName}成功`);
      return true;
    } catch (error) {
      console.warn(`Clipboard API失败:`, error);
      // 继续尝试其他方法
    }
  }

  // 方法2: 使用textarea元素和execCommand（兼容方案）
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // 确保元素在视口外但可聚焦
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.style.zIndex = '-1';

    document.body.appendChild(textArea);

    // 选择文本 - 使用更兼容的方式
    textArea.focus();
    textArea.select();

    // 尝试使用setSelectionRange作为备选
    try {
      textArea.setSelectionRange(0, textArea.value.length);
    } catch (e) {
      console.warn('setSelectionRange失败:', e);
    }

    // 执行复制命令
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      console.log(`使用execCommand复制${itemName}成功`);
      return true;
    } else {
      console.warn(`使用execCommand复制${itemName}失败`);
      return false;
    }
  } catch (error) {
    console.error(`execCommand复制失败:`, error);
    // 继续尝试最后的方法
  }

  // 方法3: 使用contenteditable div作为最后手段
  try {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.textContent = text;
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.opacity = '0';
    div.style.zIndex = '-1';
    document.body.appendChild(div);

    // 选择div内容
    const range = document.createRange();
    range.selectNodeContents(div);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // 尝试复制
    const successful = document.execCommand('copy');
    if (selection) {
      selection.removeAllRanges();
    }
    document.body.removeChild(div);

    if (successful) {
      console.log(`✅ 使用contenteditable复制${itemName}成功`);
      return true;
    }
  } catch (error) {
    console.error(`contenteditable复制失败:`, error);
  }

  console.error(`❌ 所有复制方法都失败了`);
  return false;
}
