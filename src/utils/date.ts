
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

// 格式化时间戳 @cat 
export const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
