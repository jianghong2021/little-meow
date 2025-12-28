
export const getFileName = (file?: string) => {
    const temp = file?.split(/[\/\\]/)||[];
    const fileName = temp[temp.length - 1].replaceAll(/\s/g, '')||'';
    return fileName.substring(fileName.length - 16)
}