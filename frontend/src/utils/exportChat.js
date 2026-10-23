/**
 * InsanexAI Chat Export Utilities
 * Supports exporting conversations to Plain Text (.txt), Markdown (.md), and PDF.
 */

function sanitizeFilename(title) {
  const safe = (title || 'conversation').replace(/[\\/*?:"<>| ]/g, '_').slice(0, 40)
  return `insanexai_${safe}`
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportChatAsTxt(chat) {
  if (!chat || !chat.messages) return
  const title = chat.title || 'Untitled Conversation'
  const dateStr = new Date().toLocaleString()

  const lines = [
    '==================================================',
    `InsanexAI Conversation: ${title}`,
    `Exported: ${dateStr}`,
    '==================================================',
    '',
  ]

  chat.messages.forEach((m) => {
    const role = m.role === 'user' ? 'User' : 'InsanexAI'
    lines.push(`[${role}]:`)
    lines.push(m.text || '')
    if (m.sources && m.sources.length > 0) {
      lines.push('Sources:')
      m.sources.forEach((s) => {
        lines.push(`  - ${s.title || s.domain || 'Source'}: ${s.url || ''}`)
      })
    }
    lines.push('--------------------------------------------------')
    lines.push('')
  })

  const content = lines.join('\n')
  triggerDownload(content, `${sanitizeFilename(title)}.txt`, 'text/plain;charset=utf-8')
}

export function exportChatAsMarkdown(chat) {
  if (!chat || !chat.messages) return
  const title = chat.title || 'Untitled Conversation'
  const dateStr = new Date().toLocaleString()

  const lines = [
    `# ${title}`,
    `*Exported from InsanexAI on ${dateStr}*`,
    '',
    '---',
    '',
  ]

  chat.messages.forEach((m) => {
    const role = m.role === 'user' ? 'User' : 'InsanexAI'
    lines.push(`### ${role}`)
    lines.push('')
    lines.push(m.text || '')
    lines.push('')
    if (m.sources && m.sources.length > 0) {
      lines.push('**Sources:**')
      m.sources.forEach((s) => {
        lines.push(`- [${s.title || s.domain || 'Source'}](${s.url || '#'})`)
      })
      lines.push('')
    }
  })

  const content = lines.join('\n')
  triggerDownload(content, `${sanitizeFilename(title)}.md`, 'text/markdown;charset=utf-8')
}

export function exportChatAsPdf(chat) {
  if (!chat || !chat.messages) return
  const title = chat.title || 'Untitled Conversation'
  const dateStr = new Date().toLocaleString()

  const printWindow = window.open('', '_blank', 'width=800,height=900')
  if (!printWindow) {
    alert('Please allow popups to export as PDF.')
    return
  }

  const messagesHtml = chat.messages
    .map((m) => {
      const isUser = m.role === 'user'
      const roleTitle = isUser ? 'You' : 'InsanexAI'
      const bgClass = isUser ? '#f4f4f5' : '#ffffff'
      const borderClass = isUser ? '#e4e4e7' : '#e5e7eb'
      const textHtml = (m.text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>')

      let sourcesHtml = ''
      if (m.sources && m.sources.length > 0) {
        sourcesHtml = `
          <div style="margin-top: 10px; font-size: 11px; color: #52525b;">
            <strong>Sources:</strong>
            <ul style="margin: 4px 0 0 16px; padding: 0;">
              ${m.sources
                .map(
                  (s) =>
                    `<li><a href="${s.url || '#'}" target="_blank" style="color: #2563eb;">${
                      s.title || s.domain || 'Source'
                    }</a></li>`
                )
                .join('')}
            </ul>
          </div>
        `
      }

      return `
        <div style="margin-bottom: 16px; padding: 12px 16px; background-color: ${bgClass}; border: 1px solid ${borderClass}; border-radius: 8px;">
          <div style="font-size: 12px; font-weight: 600; color: #18181b; margin-bottom: 6px;">${roleTitle}</div>
          <div style="font-size: 13px; color: #27272a; line-height: 1.6;">${textHtml}</div>
          ${sourcesHtml}
        </div>
      `
    })
    .join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - InsanexAI</title>
        <style>
          @page { margin: 20mm; size: A4; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #18181b;
            margin: 0;
            padding: 24px;
          }
          h1 { font-size: 20px; margin-bottom: 4px; font-weight: 600; }
          .meta { font-size: 12px; color: #71717a; margin-bottom: 24px; border-bottom: 1px solid #e4e4e7; padding-bottom: 12px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Exported from InsanexAI on ${dateStr}</div>
        ${messagesHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
