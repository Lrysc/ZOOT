/**
 * 简单的 Markdown 渲染器
 */
export function renderMarkdown(text: string): string {
  if (!text) return ''

  const maxLength = 300
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text

  let html = truncatedText

  // 处理标题
  html = html.replace(/^#### (.*$)/gim, '<h4 class="md-h4">$1</h4>')
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>')

  // 处理格式
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="md-strong">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em class="md-em">$1</em>')
  html = html.replace(/```(.*?)```/gs, '<pre class="md-code-block"><code>$1</code></pre>')
  html = html.replace(/`(.+?)`/g, '<code class="md-inline-code">$1</code>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="md-link">$1</a>')

  // 处理列表
  html = html.replace(/^[\-\*] (.+)$/gim, '<li class="md-li">$1</li>')
  html = html.replace(/(<li class="md-li">.*<\/li>)/s, '<ul class="md-ul">$1</ul>')
  html = html.replace(/^\d+\. (.+)$/gim, '<li class="md-li-ol">$1</li>')
  html = html.replace(/(<li class="md-li-ol">.*<\/li>)/s, '<ol class="md-ol">$1</ol>')

  // 处理换行
  html = html.replace(/\n\n/g, '</p><p class="md-p">')
  html = '<p class="md-p">' + html + '</p>'
  html = html.replace(/<p class="md-p"><\/p>/g, '')
  html = html.replace(/<p class="md-p">(.*?)<\/p>/g, (_, p1) => {
    if (p1.trim() === '') return ''
    if (p1.includes('<h') || p1.includes('<ul') || p1.includes('<ol') || p1.includes('<pre')) {
      return p1
    }
    return '<p class="md-p">' + p1 + '</p>'
  })

  return html
}

/**
 * 格式化关于内容
 */
export function formatAboutContent(content: string): string {
  return content
    .replace(/^# (.+)$/gm, '<h1 class="about-h1">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="about-h2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="about-h3">$1</h3>')
    .replace(/^\*\*(.+?)\*\*:/gm, '<strong class="about-strong">$1</strong>:')
    .replace(/^\* (.+)$/gm, '<li class="about-li">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="about-li">$1</li>')
    .replace(/\n\n/g, '</p><p class="about-p">')
    .replace(/^/, '<p class="about-p">')
    .replace(/$/, '</p>')
    .replace(/<li class="about-li">/g, '<ul class="about-ul"><li class="about-li">')
    .replace(/<\/li>/g, '</li></ul>')
    .replace(/<\/ul><ul class="about-ul">/g, '')
    .replace(/https:\/\/github\.com\/Lrysc\/prts/g, '<a href="https://github.com/Lrysc/prts" target="_blank" class="about-link">https://github.com/Lrysc/prts</a>')
}
