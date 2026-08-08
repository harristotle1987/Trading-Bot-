import { formatSmartPrice } from './utils/priceUtils';

export const formatPrice = (price: number, symbol?: string): string => {
  return formatSmartPrice(price, symbol);
};
