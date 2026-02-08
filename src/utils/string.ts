// ts生一个与时间戳,随机字符相关的uuid @cat 
export function generateUUID(): string {
    const timestamp = Date.now().toString(16).padStart(12, '0');
    const randomPart = Math.random().toString(16).substring(2, 10);
    const randomPart2 = Math.random().toString(16).substring(2, 10);
    
    return `${timestamp.substring(0, 8)}-${timestamp.substring(8)}-4${randomPart.substring(0, 3)}-${(Math.random() * 4 + 8).toString(16)[0]}${randomPart.substring(3)}-${randomPart2}`;
}