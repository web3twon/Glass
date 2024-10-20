// utils/formatters.ts

/**
 * Formats a number string by adding commas as thousand separators.
 *
 * @param {string} numStr - The number string to format.
 * @returns {string} - The formatted number string with commas.
 */
export const formatNumberWithCommas = (numStr: string): string => {
  if (!numStr) return '0';
  // Split the number into integer and decimal parts
  const [integerPart, decimalPart] = numStr.split('.');
  // Add commas to the integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  // Combine integer and decimal parts
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};
