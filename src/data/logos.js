export const LOGOS = Array.from({ length: 50 }, (_, i) => {
  const num = String(i + 1).padStart(2, '0');
  return {
    id: `L-${num}`,
    imagePath: `/logos/L-${num}.png`,
  };
});
