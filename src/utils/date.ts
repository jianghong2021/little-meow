
/**
 * 格式化时间
 * @param time 
 * @returns 
 */
export function formatDate(time: number) {
    const now = new Date(time);
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  
  if (diff < 60) {return `${diff}秒前`;}
  if (diff < 3600) {return `${Math.floor(diff / 60)}分钟前`;}
  if (diff < 86400) {return `${Math.floor(diff / 3600)}小时前`;}
  
  return `${Math.floor(diff / 86400)}天前`;
}