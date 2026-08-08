export const formatPrice = (price: number): string => {
  if (price < 10) {
    return price.toFixed(4);
  } else {
    return price.toFixed(2);
  }
};
