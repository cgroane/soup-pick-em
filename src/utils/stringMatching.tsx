export const stripAndReplaceSpace = (value: string) => {
  value = value?.replace(/[^a-zA-Z0-9]/g, '');
  return value?.toLowerCase();
}