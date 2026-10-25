/**
 * التحقق من صحة البريد الإلكتروني
 * @param {string} email 
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * التحقق من صحة رقم الهاتف المصري (فودافون، أورانج، اتصالات، وي)
 * @param {string} phone 
 * @returns {boolean}
 */
export const isValidEgyptPhone = (phone) => {
  if (typeof phone !== 'string' && typeof phone !== 'number') return false;
  // تحويل الأرقام إلى String وإزالة الفواصل أو المسافات قبل الاختبار
  const cleanPhone = String(phone).replace(/\s+/g, '');
  return /^01[0125][0-9]{8}$/.test(cleanPhone);
};

/**
 * التحقق من أن القيمة ليست فارغة
 * @param {any} value 
 * @returns {boolean}
 */
export const isNotEmpty = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};