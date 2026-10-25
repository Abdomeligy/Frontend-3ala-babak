import React from 'react';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

// إحداثيات بركة السبع - المنوفية (نفس القيمة المستخدمة في DriverHomeScreen)
const BERKET_ELSAB_CENTER = {
  latitude: 30.636226,
  longitude: 31.09569,
};

export default React.forwardRef(function AppMap({ location, style, onLocationChange }, ref) {
  return (
    <MapView
      ref={ref}
      provider={PROVIDER_DEFAULT}
      style={style}
      initialRegion={{
        latitude: location?.latitude || BERKET_ELSAB_CENTER.latitude,
        longitude: location?.longitude || BERKET_ELSAB_CENTER.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }}
      showsUserLocation
    >
      {location && (
        <Marker 
          coordinate={location} 
          title="موقعك الحالي" 
          description="اسحب الماركر لتغيير موقعك"
          draggable // تفعيل السحب والإفلات
          onDragEnd={(e) => {
            // يتم استدعاؤها عند ترك الماركر في المكان الجديد
            const newCoord = e.nativeEvent.coordinate;
            if (onLocationChange) {
              onLocationChange(newCoord);
            }
          }}
        />
      )}
    </MapView>
  );
});