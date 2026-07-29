export const convertKeyNames = <T extends object>(obj: T[]) => {
  const keys = Object.keys(obj[0]);
  return obj.map((item) => {
    const newItem = keys.reduce<T>((acc, key) => {
      const transformedKey = key.charAt(0).toLowerCase() + key.slice(1);
      return {
        ...acc,
        [transformedKey]: item[key as keyof T],
      };
    }, {} as T);
    return {
      ...newItem,
    };
  });
};
