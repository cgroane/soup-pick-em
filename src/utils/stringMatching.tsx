export const stripAndReplaceSpace = (value: string) => {
  return value?.toLowerCase()?.replace(/ /g, '');
}