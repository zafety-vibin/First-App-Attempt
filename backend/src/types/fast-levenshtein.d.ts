declare module 'fast-levenshtein' {
  const levenshtein: {
    get(str1: string, str2: string, options?: any): number;
  };
  export default levenshtein;
}
