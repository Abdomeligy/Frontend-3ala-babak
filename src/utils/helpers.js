/**
 * تنسيق المبلغ المالي بالجنيه المصري
 * @param {number|string} amount 
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) return '0.00 ج.م';
  return `${numericAmount.toFixed(2)} ج.م`;
};

/**
 * تنسيق التاريخ والوقت باللغة العربية
 * @param {string|Date} dateString 
 * @returns {string}
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * حساب المسافة بين نقطتين جغرافيين بالكيلومتر (صيغة Haversine)
 * @param {number|string} lat1 
 * @param {number|string} lon1 
 * @param {number|string} lat2 
 * @param {number|string} lon2 
 * @returns {string} المسافة بالكيلومتر مقربة لأقرب رقم عشري واحد
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) {
    return '0.0';
  }

  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};