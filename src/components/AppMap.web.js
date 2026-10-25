// الجزء المعدل فقط من fetchAddress داخل AppMap.js (نسخة الويب - Leaflet)

const fetchAddress = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=ar`
      );
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        
        // استخراج أقرب التفاصيل وأكثرها دقة للمكان الحالي
        const road = addr.road || addr.pedestrian || addr.footway || '';
        const neighborhood = addr.neighbourhood || addr.suburb || addr.residential || '';
        const cityOrTown = addr.city || addr.town || addr.village || addr.county || 'بركة السبع';
        const state = addr.state || 'المنوفية'; // كانت فاضية بالكامل قبل كده

        // تجميع العناصر المتوفرة فقط لتكوين عنوان تفصيلي صحيح ودقيق
        let parts = [road, neighborhood, cityOrTown, state].filter(Boolean);
        
        if (parts.length > 0) {
          let formatted = parts.join('، ');
          // تصحيح أي محافظة غلط راجعة من نوميناتيم لمنطقة بركة السبع
          formatted = formatted.replace(/الغربية/g, 'المنوفية');
          return formatted;
        }
      }
      
      let fallback = data.display_name || "بركة السبع، المنوفية";
      fallback = fallback.replace(/الغربية/g, 'المنوفية');
      return fallback;
    } catch (error) { 
      return "بركة السبع، المنوفية"; 
    }
  };