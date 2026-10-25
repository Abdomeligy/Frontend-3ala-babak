
// src/screens/Customer/MapPickerScreen.web.js

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';

// ============================================================
// CONFIG
// ============================================================

const TILE_SIZE = 256;

const DEFAULT_ZOOM = 13;
const CURRENT_LOCATION_ZOOM = 15;

const MIN_ZOOM = 3;
const MAX_ZOOM = 19;

const OSM_TILE_URL =
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// ============================================================
// FALLBACK CENTER
// ============================================================
// ده مجرد مكان احتياطي لو الـ GPS فشل.
// الموقع الحقيقي يتم أخذه تلقائيًا عند فتح الشاشة.

const DEFAULT_CENTER = {
  latitude: 30.638934,
  longitude: 31.076838,
};

// ============================================================
// SERVICE AREA
// ============================================================

const MONOUFIA_BOUNDS = {
  south: 30.28,
  west: 30.68,
  north: 30.82,
  east: 31.25,
};

const MONOUFIA_SERVICE_POLYGON = [
  {
    latitude: MONOUFIA_BOUNDS.north,
    longitude: MONOUFIA_BOUNDS.west,
  },
  {
    latitude: MONOUFIA_BOUNDS.north,
    longitude: MONOUFIA_BOUNDS.east,
  },
  {
    latitude: MONOUFIA_BOUNDS.south,
    longitude: MONOUFIA_BOUNDS.east,
  },
  {
    latitude: MONOUFIA_BOUNDS.south,
    longitude: MONOUFIA_BOUNDS.west,
  },
];

// ============================================================
// HELPERS
// ============================================================

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

const normalizeLongitude = (longitude) => {
  let value = Number(longitude);

  while (value > 180) value -= 360;
  while (value < -180) value += 360;

  return value;
};

// ============================================================
// GEOJSON HELPERS
// ============================================================

const convertRingToPolygon = (ring) => {
  if (!Array.isArray(ring)) {
    return [];
  }

  return ring
    .map((coordinate) => {
      if (
        !Array.isArray(coordinate) ||
        coordinate.length < 2
      ) {
        return null;
      }

      const longitude = Number(coordinate[0]);
      const latitude = Number(coordinate[1]);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return null;
      }

      return {
        latitude,
        longitude,
      };
    })
    .filter(Boolean);
};

const getGeoJSONPolygons = (geoJSON) => {
  if (!geoJSON) {
    return [];
  }

  try {
    const geometry =
      geoJSON.type === 'FeatureCollection'
        ? null
        : geoJSON.type === 'Feature'
          ? geoJSON.geometry
          : geoJSON;

    if (geoJSON.type === 'FeatureCollection') {
      const polygons = [];

      for (const feature of geoJSON.features || []) {
        if (!feature?.geometry) continue;

        const featureGeometry = feature.geometry;

        if (featureGeometry.type === 'Polygon') {
          const outerRing =
            featureGeometry.coordinates?.[0];

          const polygon =
            convertRingToPolygon(outerRing);

          if (polygon.length >= 3) {
            polygons.push(polygon);
          }
        }

        if (featureGeometry.type === 'MultiPolygon') {
          for (const polygonCoordinates of
            featureGeometry.coordinates || []) {
            const outerRing =
              polygonCoordinates?.[0];

            const polygon =
              convertRingToPolygon(outerRing);

            if (polygon.length >= 3) {
              polygons.push(polygon);
            }
          }
        }
      }

      return polygons;
    }

    if (!geometry) {
      return [];
    }

    if (geometry.type === 'Polygon') {
      const polygon =
        convertRingToPolygon(
          geometry.coordinates?.[0]
        );

      return polygon.length >= 3
        ? [polygon]
        : [];
    }

    if (geometry.type === 'MultiPolygon') {
      return (geometry.coordinates || [])
        .map((polygonCoordinates) =>
          convertRingToPolygon(
            polygonCoordinates?.[0]
          )
        )
        .filter(
          (polygon) => polygon.length >= 3
        );
    }

    return [];
  } catch (error) {
    console.warn(
      'GeoJSON parsing failed:',
      error
    );

    return [];
  }
};

// ============================================================
// POINT IN POLYGON
// ============================================================

const isPointInPolygon = (
  latitude,
  longitude,
  polygon
) => {
  if (
    !Array.isArray(polygon) ||
    polygon.length < 3
  ) {
    return false;
  }

  let inside = false;

  for (
    let i = 0, j = polygon.length - 1;
    i < polygon.length;
    j = i++
  ) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;

    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect =
      yi > latitude !== yj > latitude &&
      longitude <
        ((xj - xi) *
          (latitude - yi)) /
          (yj - yi) +
          xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
};

const isPointInsideServiceArea = (
  latitude,
  longitude,
  polygons
) => {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return false;
  }

  // ----------------------------------------------------------
  // Main service polygon
  // ----------------------------------------------------------

  if (
    isPointInPolygon(
      latitude,
      longitude,
      MONOUFIA_SERVICE_POLYGON
    )
  ) {
    return true;
  }

  // ----------------------------------------------------------
  // Additional polygons if available
  // ----------------------------------------------------------

  for (const polygon of polygons || []) {
    if (
      isPointInPolygon(
        latitude,
        longitude,
        polygon
      )
    ) {
      return true;
    }
  }

  return false;
};

// ============================================================
// WORLD MAP MATH
// ============================================================

const longitudeToWorldX = (
  longitude,
  zoom
) => {
  const scale =
    TILE_SIZE * Math.pow(2, zoom);

  const normalizedLongitude =
    normalizeLongitude(longitude);

  return (
    ((normalizedLongitude + 180) / 360) *
    scale
  );
};

const latitudeToWorldY = (
  latitude,
  zoom
) => {
  const scale =
    TILE_SIZE * Math.pow(2, zoom);

  const clampedLatitude = clamp(
    latitude,
    -85.05112878,
    85.05112878
  );

  const radians =
    (clampedLatitude * Math.PI) / 180;

  const mercator =
    Math.log(
      Math.tan(Math.PI / 4 + radians / 2)
    );

  return (
    (1 -
      mercator / Math.PI) /
    2 *
    scale
  );
};

const worldXToLongitude = (
  worldX,
  zoom
) => {
  const scale =
    TILE_SIZE * Math.pow(2, zoom);

  const normalizedX =
    ((worldX % scale) + scale) % scale;

  return (
    (normalizedX / scale) * 360 -
    180
  );
};

const worldYToLatitude = (
  worldY,
  zoom
) => {
  const scale =
    TILE_SIZE * Math.pow(2, zoom);

  const y =
    Math.PI -
    (2 * Math.PI * worldY) / scale;

  return (
    (180 / Math.PI) *
    Math.atan(
      Math.sinh(y)
    )
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MapPickerScreen({
  navigation,
  route,
}) {
  // ==========================================================
  // ROUTE PARAMS
  // ==========================================================

  const initialLocation =
    route?.params?.initialLocation ||
    null;

  const returnTo =
    route?.params?.returnTo ||
    null;

  // ==========================================================
  // INITIAL COORDINATES
  // ==========================================================

  const getInitialCoordinates =
    useCallback(() => {
      if (
        initialLocation?.latitude != null &&
        initialLocation?.longitude != null
      ) {
        const latitude = Number(
          initialLocation.latitude
        );

        const longitude = Number(
          initialLocation.longitude
        );

        if (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude)
        ) {
          return {
            latitude,
            longitude,
          };
        }
      }

      return {
        ...DEFAULT_CENTER,
      };
    }, [initialLocation]);

  const initialCoords =
    getInitialCoordinates();

  const initialZoom =
    initialLocation
      ? CURRENT_LOCATION_ZOOM
      : DEFAULT_ZOOM;

  // ==========================================================
  // STATE
  // ==========================================================

  const [mapCenter, setMapCenter] =
    useState(initialCoords);

  const [zoom, setZoom] =
    useState(initialZoom);

  const [mapSize, setMapSize] =
    useState({
      width: 0,
      height: 0,
    });

  const [selectedCoords, setSelectedCoords] =
    useState(initialCoords);

  const [mapReady, setMapReady] =
    useState(false);

  const [loadingLocation, setLoadingLocation] =
    useState(false);

  const [zoneStatus, setZoneStatus] =
    useState({
      isInside:
        isPointInsideServiceArea(
          initialCoords.latitude,
          initialCoords.longitude,
          [MONOUFIA_SERVICE_POLYGON]
        ),
    });

  // ==========================================================
  // REFS
  // ==========================================================

  const mapRef = useRef(null);

  const mapStateRef = useRef({
    centerX: longitudeToWorldX(
      initialCoords.longitude,
      initialZoom
    ),

    centerY: latitudeToWorldY(
      initialCoords.latitude,
      initialZoom
    ),

    zoom: initialZoom,

    width: 0,
    height: 0,
  });

  const pointerRef = useRef({
    active: false,
    moved: false,

    startX: 0,
    startY: 0,

    startCenterX: 0,
    startCenterY: 0,
  });

  const markerDragRef = useRef({
    active: false,
  });

  const servicePolygons =
    [MONOUFIA_SERVICE_POLYGON];

  // ==========================================================
  // ALERT HELPER
  // ==========================================================

  const showAlert = useCallback(
    (title, message) => {
      if (Platform.OS === 'web') {
        window.alert(
          `${title}\n\n${message}`
        );
      } else {
        Alert.alert(
          title,
          message
        );
      }
    },
    []
  );

  // ==========================================================
  // UPDATE MAP STATE
  // ==========================================================

  const syncMapState = useCallback(
    (
      center,
      nextZoom,
      width,
      height
    ) => {
      const centerX =
        longitudeToWorldX(
          center.longitude,
          nextZoom
        );

      const centerY =
        latitudeToWorldY(
          center.latitude,
          nextZoom
        );

      mapStateRef.current = {
        centerX,
        centerY,
        zoom: nextZoom,
        width,
        height,
      };
    },
    []
  );

  // ==========================================================
  // UPDATE SELECTED LOCATION
  // ==========================================================

  const updateSelectedLocation =
    useCallback(
      (latitude, longitude) => {
        const nextCoords = {
          latitude: Number(latitude),
          longitude: Number(longitude),
        };

        setSelectedCoords(
          nextCoords
        );

        const inside =
          isPointInsideServiceArea(
            nextCoords.latitude,
            nextCoords.longitude,
            servicePolygons
          );

        setZoneStatus({
          isInside: inside,
        });
      },
      [servicePolygons]
    );

  // ==========================================================
  // SCREEN -> LAT/LNG
  // ==========================================================

  const screenToLatLng = useCallback(
    (screenX, screenY) => {
      const state =
        mapStateRef.current;

      const worldX =
        state.centerX -
        state.width / 2 +
        screenX;

      const worldY =
        state.centerY -
        state.height / 2 +
        screenY;

      return {
        latitude:
          worldYToLatitude(
            worldY,
            state.zoom
          ),

        longitude:
          worldXToLongitude(
            worldX,
            state.zoom
          ),
      };
    },
    []
  );

  // ==========================================================
  // MAP LAYOUT
  // ==========================================================

  const handleMapLayout =
    useCallback(
      (event) => {
        const {
          width,
          height,
        } = event.nativeEvent.layout;

        setMapSize({
          width,
          height,
        });

        syncMapState(
          mapCenter,
          zoom,
          width,
          height
        );

        setMapReady(true);
      },
      [
        mapCenter,
        zoom,
        syncMapState,
      ]
    );

  // ==========================================================
  // UPDATE CENTER
  // ==========================================================

  const updateCenterFromWorld =
    useCallback(
      (
        worldX,
        worldY,
        nextZoom
      ) => {
        const center = {
          latitude:
            worldYToLatitude(
              worldY,
              nextZoom
            ),

          longitude:
            worldXToLongitude(
              worldX,
              nextZoom
            ),
        };

        setMapCenter(center);

        mapStateRef.current = {
          ...mapStateRef.current,

          centerX: worldX,
          centerY: worldY,
          zoom: nextZoom,
        };
      },
      []
    );

  // ==========================================================
  // ZOOM AT POINT
  // ==========================================================

  const zoomAtPoint = useCallback(
    (
      screenX,
      screenY,
      targetZoom
    ) => {
      const state =
        mapStateRef.current;

      const oldZoom =
        state.zoom;

      const nextZoom = clamp(
        targetZoom,
        MIN_ZOOM,
        MAX_ZOOM
      );

      if (nextZoom === oldZoom) {
        return;
      }

      const pointWorldX =
        state.centerX -
        state.width / 2 +
        screenX;

      const pointWorldY =
        state.centerY -
        state.height / 2 +
        screenY;

      const zoomFactor =
        Math.pow(
          2,
          nextZoom - oldZoom
        );

      const nextCenterX =
        pointWorldX -
        (screenX - state.width / 2) *
          zoomFactor;

      const nextCenterY =
        pointWorldY -
        (screenY - state.height / 2) *
          zoomFactor;

      updateCenterFromWorld(
        nextCenterX,
        nextCenterY,
        nextZoom
      );

      setZoom(nextZoom);
    },
    [updateCenterFromWorld]
  );

  // ==========================================================
  // WHEEL ZOOM
  // ==========================================================

  const handleWheel =
    useCallback(
      (event) => {
        event.preventDefault();

        const rect =
          mapRef.current?.getBoundingClientRect?.();

        if (!rect) {
          return;
        }

        const screenX =
          event.clientX -
          rect.left;

        const screenY =
          event.clientY -
          rect.top;

        const direction =
          event.deltaY > 0
            ? -1
            : 1;

        const nextZoom =
          mapStateRef.current.zoom +
          direction;

        zoomAtPoint(
          screenX,
          screenY,
          nextZoom
        );
      },
      [zoomAtPoint]
    );

  // ==========================================================
  // POINTER DOWN
  // ==========================================================

  const handlePointerDown =
    useCallback(
      (event) => {
        if (
          markerDragRef.current
            .active
        ) {
          return;
        }

        const state =
          mapStateRef.current;

        pointerRef.current = {
          active: true,
          moved: false,

          startX:
            event.clientX,

          startY:
            event.clientY,

          startCenterX:
            state.centerX,

          startCenterY:
            state.centerY,
        };

        try {
          event.currentTarget?.setPointerCapture?.(
            event.pointerId
          );
        } catch (error) {}
      },
      []
    );

  // ==========================================================
  // POINTER MOVE
  // ==========================================================

  const handlePointerMove =
    useCallback(
      (event) => {
        const pointer =
          pointerRef.current;

        if (!pointer.active) {
          return;
        }

        const dx =
          event.clientX -
          pointer.startX;

        const dy =
          event.clientY -
          pointer.startY;

        if (
          Math.abs(dx) > 4 ||
          Math.abs(dy) > 4
        ) {
          pointer.moved = true;
        }

        const nextCenterX =
          pointer.startCenterX -
          dx;

        const nextCenterY =
          pointer.startCenterY -
          dy;

        updateCenterFromWorld(
          nextCenterX,
          nextCenterY,
          mapStateRef.current.zoom
        );
      },
      [updateCenterFromWorld]
    );

  // ==========================================================
  // POINTER UP
  // ==========================================================

  const handlePointerUp =
    useCallback(
      (event) => {
        const pointer =
          pointerRef.current;

        if (!pointer.active) {
          return;
        }

        pointer.active = false;

        try {
          event.currentTarget?.releasePointerCapture?.(
            event.pointerId
          );
        } catch (error) {}

        // ----------------------------------------------------
        // If user only clicked without dragging,
        // select location at click point.
        // ----------------------------------------------------

        if (!pointer.moved) {
          const rect =
            mapRef.current?.getBoundingClientRect?.();

          if (!rect) {
            return;
          }

          const screenX =
            event.clientX -
            rect.left;

          const screenY =
            event.clientY -
            rect.top;

          const coords =
            screenToLatLng(
              screenX,
              screenY
            );

          updateSelectedLocation(
            coords.latitude,
            coords.longitude
          );
        }
      },
      [
        screenToLatLng,
        updateSelectedLocation,
      ]
    );

  // ==========================================================
  // MARKER DRAG START
  // ==========================================================

  const handleMarkerPointerDown =
    useCallback(
      (event) => {
        event.stopPropagation();

        markerDragRef.current = {
          active: true,
        };

        try {
          event.currentTarget?.setPointerCapture?.(
            event.pointerId
          );
        } catch (error) {}
      },
      []
    );

  // ==========================================================
  // MARKER DRAG MOVE
  // ==========================================================

  const handleMarkerPointerMove =
    useCallback(
      (event) => {
        if (
          !markerDragRef.current
            .active
        ) {
          return;
        }

        const rect =
          mapRef.current?.getBoundingClientRect?.();

        if (!rect) {
          return;
        }

        const screenX =
          event.clientX -
          rect.left;

        const screenY =
          event.clientY -
          rect.top;

        const coords =
          screenToLatLng(
            screenX,
            screenY
          );

        updateSelectedLocation(
          coords.latitude,
          coords.longitude
        );
      },
      [
        screenToLatLng,
        updateSelectedLocation,
      ]
    );

  // ==========================================================
  // MARKER DRAG END
  // ==========================================================

  const handleMarkerPointerUp =
    useCallback(
      (event) => {
        markerDragRef.current = {
          active: false,
        };

        try {
          event.currentTarget?.releasePointerCapture?.(
            event.pointerId
          );
        } catch (error) {}
      },
      []
    );

  // ==========================================================
  // ZOOM BUTTONS
  // ==========================================================

  const handleZoomIn =
    useCallback(() => {
      zoomAtPoint(
        mapSize.width / 2,
        mapSize.height / 2,
        mapStateRef.current.zoom + 1
      );
    }, [
      mapSize,
      zoomAtPoint,
    ]);

  const handleZoomOut =
    useCallback(() => {
      zoomAtPoint(
        mapSize.width / 2,
        mapSize.height / 2,
        mapStateRef.current.zoom - 1
      );
    }, [
      mapSize,
      zoomAtPoint,
    ]);

  // ==========================================================
  // GPS - REAL CURRENT LOCATION
  // ==========================================================

  const centerOnCurrentLocation =
    useCallback(() => {
      if (
        typeof navigator === 'undefined' ||
        !navigator.geolocation
      ) {
        showAlert(
          'الموقع غير متاح',
          'المتصفح لا يدعم تحديد الموقع.'
        );

        return;
      }

      setLoadingLocation(true);

      console.log(
        '📍 Requesting REAL GPS location...'
      );

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude =
            Number(
              position.coords.latitude
            );

          const longitude =
            Number(
              position.coords.longitude
            );

          const accuracy =
            Number(
              position.coords.accuracy
            );

          console.log(
            '📍 REAL GPS:',
            {
              latitude,
              longitude,
              accuracy,
            }
          );

          if (
            !Number.isFinite(
              latitude
            ) ||
            !Number.isFinite(
              longitude
            )
          ) {
            setLoadingLocation(false);

            showAlert(
              'خطأ في الموقع',
              'تم الحصول على بيانات غير صالحة من GPS.'
            );

            return;
          }

          // --------------------------------------------------
          // Center map on REAL GPS
          // --------------------------------------------------

          setMapCenter({
            latitude,
            longitude,
          });

          // --------------------------------------------------
          // Zoom in around current location
          // --------------------------------------------------

          setZoom(
            CURRENT_LOCATION_ZOOM
          );

          // --------------------------------------------------
          // Update marker
          // --------------------------------------------------

          updateSelectedLocation(
            latitude,
            longitude
          );

          // --------------------------------------------------
          // Keep internal map state synchronized
          // --------------------------------------------------

          mapStateRef.current = {
            ...mapStateRef.current,

            centerX:
              longitudeToWorldX(
                longitude,
                CURRENT_LOCATION_ZOOM
              ),

            centerY:
              latitudeToWorldY(
                latitude,
                CURRENT_LOCATION_ZOOM
              ),

            zoom:
              CURRENT_LOCATION_ZOOM,
          };

          // --------------------------------------------------
          // Service area check
          // --------------------------------------------------

          const inside =
            isPointInsideServiceArea(
              latitude,
              longitude,
              servicePolygons
            );

          setZoneStatus({
            isInside: inside,
          });

          if (!inside) {
            showAlert(
              'خارج نطاق الخدمة',
              'موقعك الحالي خارج نطاق التوصيل. يمكنك تحريك الخريطة بحرية، لكن تأكيد العنوان يتطلب موقعًا داخل منطقة الخدمة.'
            );
          }

          setLoadingLocation(false);
        },
        (error) => {
          console.warn(
            '❌ GPS ERROR:',
            {
              code: error?.code,
              message:
                error?.message,
            }
          );

          setLoadingLocation(false);

          let message =
            'تأكد من السماح للموقع من إعدادات المتصفح.';

          if (
            error?.code === 1
          ) {
            message =
              'تم رفض صلاحية الموقع. اسمح للموقع من إعدادات المتصفح ثم حاول مرة أخرى.';
          } else if (
            error?.code === 2
          ) {
            message =
              'تعذر الحصول على موقعك الحالي. تأكد من تشغيل خدمات الموقع.';
          } else if (
            error?.code === 3
          ) {
            message =
              'استغرق تحديد موقعك وقتًا طويلًا. حاول مرة أخرى.';
          }

          showAlert(
            'تعذر تحديد الموقع',
            message
          );
        },
        {
          enableHighAccuracy: true,

          // مهم جدًا:
          // لا تستخدم موقعًا قديمًا من الكاش.
          maximumAge: 0,

          timeout: 15000,
        }
      );
    }, [
      servicePolygons,
      showAlert,
      updateSelectedLocation,
    ]);

  // ==========================================================
  // AUTO GPS ON SCREEN OPEN
  // ==========================================================
  //
  // أول ما الشاشة تفتح:
  // 1. نطلب GPS الحقيقي.
  // 2. نعمل Center عليه.
  // 3. نحرك Marker عليه.
  //
  // DEFAULT_CENTER مجرد fallback لو GPS فشل.

  useEffect(() => {
    centerOnCurrentLocation();
  }, [
    centerOnCurrentLocation,
  ]);

  // ==========================================================
  // KEEP MAP STATE IN SYNC WHEN SIZE CHANGES
  // ==========================================================

  useEffect(() => {
    if (
      mapSize.width <= 0 ||
      mapSize.height <= 0
    ) {
      return;
    }

    const state =
      mapStateRef.current;

    state.width =
      mapSize.width;

    state.height =
      mapSize.height;
  }, [mapSize]);

  // ==========================================================
  // TILE RENDERING
  // ==========================================================

  const renderTiles = () => {
    if (
      mapSize.width <= 0 ||
      mapSize.height <= 0
    ) {
      return null;
    }

    const state =
      mapStateRef.current;

    const currentZoom =
      Math.round(state.zoom);

    const scale =
      Math.pow(
        2,
        currentZoom
      );

    const worldSize =
      TILE_SIZE * scale;

    const startX =
      Math.floor(
        (state.centerX -
          state.width / 2) /
          TILE_SIZE
      ) - 1;

    const endX =
      Math.floor(
        (state.centerX +
          state.width / 2) /
          TILE_SIZE
      ) + 1;

    const startY =
      Math.floor(
        (state.centerY -
          state.height / 2) /
          TILE_SIZE
      ) - 1;

    const endY =
      Math.floor(
        (state.centerY +
          state.height / 2) /
          TILE_SIZE
      ) + 1;

    const tiles = [];

    for (
      let tileY = startY;
      tileY <= endY;
      tileY++
    ) {
      // ------------------------------------------------------
      // OSM does not wrap vertically.
      // ------------------------------------------------------

      if (
        tileY < 0 ||
        tileY >= scale
      ) {
        continue;
      }

      for (
        let tileX = startX;
        tileX <= endX;
        tileX++
      ) {
        const wrappedX =
          ((tileX % scale) +
            scale) %
          scale;

        const left =
          tileX * TILE_SIZE -
          state.centerX +
          state.width / 2;

        const top =
          tileY * TILE_SIZE -
          state.centerY +
          state.height / 2;

        const uri =
          OSM_TILE_URL
            .replace(
              '{z}',
              String(currentZoom)
            )
            .replace(
              '{x}',
              String(wrappedX)
            )
            .replace(
              '{y}',
              String(tileY)
            );

        tiles.push(
          <img
            key={`${currentZoom}-${tileX}-${tileY}`}
            src={uri}
            alt=""
            draggable={false}
            style={{
              position:
                'absolute',

              width:
                TILE_SIZE,

              height:
                TILE_SIZE,

              left,
              top,

              userSelect:
                'none',

              pointerEvents:
                'none',

              maxWidth:
                'none',
            }}
            onError={(event) => {
              event.currentTarget.style.opacity =
                '0';
            }}
          />
        );
      }
    }

    return (
      <View
        pointerEvents="none"
        style={{
          position:
            'absolute',

          left: 0,
          top: 0,
          right: 0,
          bottom: 0,

          overflow:
            'hidden',
        }}
      >
        {tiles}
      </View>
    );
  };

  // ==========================================================
  // MARKER POSITION
  // ==========================================================

  const getMarkerPosition =
    () => {
      if (
        mapSize.width <= 0 ||
        mapSize.height <= 0
      ) {
        return {
          left: 0,
          top: 0,
        };
      }

      const state =
        mapStateRef.current;

      const markerX =
        longitudeToWorldX(
          selectedCoords.longitude,
          state.zoom
        );

      const markerY =
        latitudeToWorldY(
          selectedCoords.latitude,
          state.zoom
        );

      return {
        left:
          markerX -
          state.centerX +
          state.width / 2,

        top:
          markerY -
          state.centerY +
          state.height / 2,
      };
    };

  const markerPosition =
    getMarkerPosition();

  // ==========================================================
  // CENTER ON SELECTED LOCATION
  // ==========================================================

  const centerOnSelectedLocation =
    useCallback(() => {
      setMapCenter({
        latitude:
          selectedCoords.latitude,

        longitude:
          selectedCoords.longitude,
      });

      const currentZoom =
        Math.max(
          mapStateRef.current.zoom,
          CURRENT_LOCATION_ZOOM
        );

      setZoom(currentZoom);

      mapStateRef.current = {
        ...mapStateRef.current,

        centerX:
          longitudeToWorldX(
            selectedCoords.longitude,
            currentZoom
          ),

        centerY:
          latitudeToWorldY(
            selectedCoords.latitude,
            currentZoom
          ),

        zoom: currentZoom,
      };
    }, [
      selectedCoords,
    ]);

  // ==========================================================
  // CONFIRM LOCATION
  // ==========================================================

  const handleConfirm =
    useCallback(() => {
      const latitude =
        Number(
          selectedCoords.latitude
        );

      const longitude =
        Number(
          selectedCoords.longitude
        );

      // ------------------------------------------------------
      // Validate coordinates
      // ------------------------------------------------------

      if (
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        )
      ) {
        showAlert(
          'الموقع غير صالح',
          'من فضلك حدد موقعك على الخريطة.'
        );

        return;
      }

      // ------------------------------------------------------
      // Validate service area
      // ------------------------------------------------------

      const inside =
        isPointInsideServiceArea(
          latitude,
          longitude,
          servicePolygons
        );

      if (!inside) {
        showAlert(
          'خارج نطاق الخدمة',
          'الموقع الذي اخترته خارج نطاق التوصيل.'
        );

        return;
      }

      // ------------------------------------------------------
      // Selected location object
      // ------------------------------------------------------

      const selectedLocation = {
        latitude,
        longitude,

        isInsideCity: true,

        addressText: '',

        formattedAddress: '',
      };

      // ------------------------------------------------------
      // Return to previous screen
      // ------------------------------------------------------

      if (returnTo) {
        navigation.navigate({
          name: returnTo,

          params: {
            selectedLocation,
          },

          merge: true,
        });

        return;
      }

      // ------------------------------------------------------
      // Default destination
      // ------------------------------------------------------

      navigation.navigate({
        name: 'AddAddressScreen',

        params: {
          selectedLocation,
        },
      });
    }, [
      navigation,
      returnTo,
      selectedCoords,
      servicePolygons,
      showAlert,
    ]);

  // ==========================================================
  // ZONE TEXT
  // ==========================================================

  const zoneText =
    zoneStatus.isInside
      ? 'داخل نطاق الخدمة'
      : 'خارج نطاق الخدمة';

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <View style={styles.container}>
      {/* =====================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="arrow-forward"
            size={24}
            color="#222"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          حدد موقع التوصيل
        </Text>

        <View
          style={{
            width: 44,
          }}
        />
      </View>

      {/* =====================================================
          MAP
      ====================================================== */}

      <View
        ref={mapRef}
        style={styles.map}
        onLayout={handleMapLayout}
        onWheel={handleWheel}
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          handlePointerUp
        }
        onPointerCancel={
          handlePointerUp
        }
      >
        {/* ===================================================
            TILES
        ==================================================== */}

        {renderTiles()}

        {/* ===================================================
            MARKER
        ==================================================== */}

        {mapReady && (
          <View
            style={[
              styles.markerWrapper,
              {
                left:
                  markerPosition.left -
                  65,

                top:
                  markerPosition.top -
                  75,
              },
            ]}
            onPointerDown={
              handleMarkerPointerDown
            }
            onPointerMove={
              handleMarkerPointerMove
            }
            onPointerUp={
              handleMarkerPointerUp
            }
            onPointerCancel={
              handleMarkerPointerUp
            }
          >
            <View
              style={
                styles.markerBubble
              }
            >
              <Text
                style={
                  styles.markerText
                }
              >
                📍
              </Text>

              <Text
                style={
                  styles.markerLabel
                }
              >
                موقعك المحدد
              </Text>
            </View>

            <View
              style={
                styles.markerPin
              }
            />
          </View>
        )}

        {/* ===================================================
            ZOOM CONTROLS
        ==================================================== */}

        <View
          style={styles.zoomControls}
        >
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={
              handleZoomIn
            }
          >
            <Ionicons
              name="add"
              size={24}
              color="#222"
            />
          </TouchableOpacity>

          <View
            style={
              styles.zoomDivider
            }
          />

          <TouchableOpacity
            style={styles.zoomButton}
            onPress={
              handleZoomOut
            }
          >
            <Ionicons
              name="remove"
              size={24}
              color="#222"
            />
          </TouchableOpacity>
        </View>

        {/* ===================================================
            CURRENT LOCATION
        ==================================================== */}

        <TouchableOpacity
          style={
            styles.currentLocationButton
          }
          onPress={
            centerOnCurrentLocation
          }
          disabled={
            loadingLocation
          }
        >
          {loadingLocation ? (
            <ActivityIndicator
              size="small"
              color={
                COLORS?.primary ||
                '#D89B25'
              }
            />
          ) : (
            <Ionicons
              name="locate"
              size={24}
              color={
                COLORS?.primary ||
                '#D89B25'
              }
            />
          )}
        </TouchableOpacity>

        {/* ===================================================
            CENTER SELECTED
        ==================================================== */}

        <TouchableOpacity
          style={
            styles.centerSelectedButton
          }
          onPress={
            centerOnSelectedLocation
          }
        >
          <Ionicons
            name="navigate"
            size={20}
            color="#fff"
          />

          <Text
            style={
              styles.centerSelectedText
            }
          >
            توسيط الموقع
          </Text>
        </TouchableOpacity>

        {/* ===================================================
            ZONE STATUS
        ==================================================== */}

        <View
          style={[
            styles.zoneBadge,
            zoneStatus.isInside
              ? styles.zoneInside
              : styles.zoneOutside,
          ]}
        >
          <View
            style={[
              styles.zoneDot,
              {
                backgroundColor:
                  zoneStatus.isInside
                    ? '#22C55E'
                    : '#EF4444',
              },
            ]}
          />

          <Text
            style={styles.zoneText}
          >
            {zoneText}
          </Text>
        </View>

        {/* ===================================================
            OSM ATTRIBUTION
        ==================================================== */}

        <View
          style={
            styles.attribution
          }
          pointerEvents="none"
        >
          <Text
            style={
              styles.attributionText
            }
          >
            © OpenStreetMap contributors
          </Text>
        </View>

        {/* ===================================================
            GPS LOADING OVERLAY
        ==================================================== */}

        {loadingLocation && (
          <View
            style={
              styles.gpsLoadingOverlay
            }
            pointerEvents="none"
          >
            <View
              style={
                styles.gpsLoadingCard
              }
            >
              <ActivityIndicator
                size="large"
                color={
                  COLORS?.primary ||
                  '#D89B25'
                }
              />

              <Text
                style={
                  styles.gpsLoadingTitle
                }
              >
                جارِ تحديد موقعك الحالي...
              </Text>

              <Text
                style={
                  styles.gpsLoadingSubtitle
                }
              >
                سيتم وضع العلامة على موقع GPS الحقيقي
              </Text>
            </View>
          </View>
        )}

        {/* ===================================================
            INITIAL MAP LOADING
        ==================================================== */}

        {!mapReady && (
          <View
            style={
              styles.initialLoadingOverlay
            }
          >
            <ActivityIndicator
              size="large"
              color={
                COLORS?.primary ||
                '#D89B25'
              }
            />

            <Text
              style={
                styles.initialLoadingText
              }
            >
              جارِ تحميل الخريطة...
            </Text>
          </View>
        )}
      </View>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <View style={styles.footer}>
        <View
          style={
            styles.footerLocationRow
          }
        >
          <View
            style={
              styles.footerIcon
            }
          >
            <Ionicons
              name="location"
              size={22}
              color={
                COLORS?.primary ||
                '#D89B25'
              }
            />
          </View>

          <View
            style={
              styles.footerLocationInfo
            }
          >
            <Text
              style={
                styles.footerTitle
              }
            >
              الموقع المحدد
            </Text>

            <Text
              style={
                styles.coordinatesText
              }
              numberOfLines={1}
            >
              {selectedCoords.latitude.toFixed(
                6
              )}
              {' , '}
              {selectedCoords.longitude.toFixed(
                6
              )}
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.footerHint
          }
        >
          اسحب الخريطة أو حرّك العلامة لتحديد موقع التوصيل بدقة
        </Text>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            !zoneStatus.isInside &&
              styles.confirmButtonDisabled,
          ]}
          onPress={
            handleConfirm
          }
        >
          <Ionicons
            name="checkmark-circle"
            size={22}
            color="#fff"
          />

          <Text
            style={
              styles.confirmButtonText
            }
          >
            تأكيد الموقع
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    height: 64,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    paddingHorizontal: 16,

    backgroundColor: '#fff',

    borderBottomWidth: 1,

    borderBottomColor:
      '#E5E7EB',

    zIndex: 20,

    elevation: 5,
  },

  backButton: {
    width: 44,
    height: 44,

    borderRadius: 22,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      '#F5F5F5',
  },

  headerTitle: {
    fontSize: 18,

    fontWeight: '700',

    color: '#222',

    textAlign: 'center',
  },

  // ==========================================================
  // MAP
  // ==========================================================

  map: {
    flex: 1,

    position: 'relative',

    overflow: 'hidden',

    backgroundColor:
      '#E5E7EB',

    cursor: 'grab',

    touchAction: 'none',
  },

  // ==========================================================
  // MARKER
  // ==========================================================

  markerWrapper: {
    position: 'absolute',

    width: 130,

    alignItems: 'center',

    zIndex: 10,

    cursor: 'grab',

    userSelect: 'none',
  },

  markerBubble: {
    minWidth: 116,

    paddingHorizontal: 10,
    paddingVertical: 7,

    borderRadius: 12,

    backgroundColor: '#fff',

    alignItems: 'center',

    justifyContent: 'center',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.2,

    shadowRadius: 5,

    elevation: 5,
  },

  markerText: {
    fontSize: 26,

    lineHeight: 30,
  },

  markerLabel: {
    fontSize: 11,

    fontWeight: '700',

    color: '#333',

    marginTop: 1,

    textAlign: 'center',
  },

  markerPin: {
    width: 4,

    height: 18,

    backgroundColor:
      '#E58F16',

    borderRadius: 3,

    marginTop: -1,
  },

  // ==========================================================
  // ZOOM
  // ==========================================================

  zoomControls: {
    position: 'absolute',

    right: 16,

    top: 18,

    width: 46,

    backgroundColor: '#fff',

    borderRadius: 12,

    overflow: 'hidden',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.18,

    shadowRadius: 5,

    elevation: 5,

    zIndex: 15,
  },

  zoomButton: {
    width: 46,
    height: 46,

    alignItems: 'center',
    justifyContent: 'center',
  },

  zoomDivider: {
    height: 1,

    backgroundColor:
      '#E5E7EB',

    marginHorizontal: 7,
  },

  // ==========================================================
  // CURRENT LOCATION
  // ==========================================================

  currentLocationButton: {
    position: 'absolute',

    left: 16,

    bottom: 22,

    width: 50,
    height: 50,

    borderRadius: 25,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#fff',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.2,

    shadowRadius: 5,

    elevation: 5,

    zIndex: 15,
  },

  // ==========================================================
  // CENTER BUTTON
  // ==========================================================

  centerSelectedButton: {
    position: 'absolute',

    right: 16,

    bottom: 22,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 7,

    paddingHorizontal: 14,

    height: 44,

    borderRadius: 22,

    backgroundColor:
      COLORS?.primary ||
      '#D89B25',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.2,

    shadowRadius: 5,

    elevation: 5,

    zIndex: 15,
  },

  centerSelectedText: {
    color: '#fff',

    fontSize: 13,

    fontWeight: '700',
  },

  // ==========================================================
  // ZONE BADGE
  // ==========================================================

  zoneBadge: {
    position: 'absolute',

    top: 18,

    left: 16,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 12,

    height: 36,

    borderRadius: 18,

    backgroundColor: '#fff',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.15,

    shadowRadius: 5,

    elevation: 4,

    zIndex: 15,
  },

  zoneInside: {
    borderWidth: 1,

    borderColor:
      '#BBF7D0',
  },

  zoneOutside: {
    borderWidth: 1,

    borderColor:
      '#FECACA',
  },

  zoneDot: {
    width: 8,

    height: 8,

    borderRadius: 4,

    marginRight: 7,
  },

  zoneText: {
    fontSize: 12,

    fontWeight: '700',

    color: '#333',
  },

  // ==========================================================
  // ATTRIBUTION
  // ==========================================================

  attribution: {
    position: 'absolute',

    right: 6,

    bottom: 5,

    backgroundColor:
      'rgba(255,255,255,0.85)',

    paddingHorizontal: 5,

    paddingVertical: 2,

    borderRadius: 3,

    zIndex: 12,
  },

  attributionText: {
    fontSize: 10,

    color: '#444',
  },

  // ==========================================================
  // GPS LOADING
  // ==========================================================

  gpsLoadingOverlay: {
    position: 'absolute',

    left: 0,
    right: 0,
    top: 0,
    bottom: 0,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      'rgba(255,255,255,0.18)',

    zIndex: 30,

    pointerEvents: 'none',
  },

  gpsLoadingCard: {
    width: 280,

    paddingHorizontal: 22,

    paddingVertical: 20,

    borderRadius: 18,

    backgroundColor:
      'rgba(255,255,255,0.96)',

    alignItems: 'center',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.2,

    shadowRadius: 10,

    elevation: 8,
  },

  gpsLoadingTitle: {
    marginTop: 12,

    fontSize: 16,

    fontWeight: '700',

    color: '#222',

    textAlign: 'center',
  },

  gpsLoadingSubtitle: {
    marginTop: 6,

    fontSize: 12,

    color: '#666',

    textAlign: 'center',

    lineHeight: 18,
  },

  // ==========================================================
  // INITIAL LOADING
  // ==========================================================

  initialLoadingOverlay: {
    position: 'absolute',

    left: 0,
    right: 0,
    top: 0,
    bottom: 0,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      'rgba(255,255,255,0.7)',

    zIndex: 25,
  },

  initialLoadingText: {
    marginTop: 10,

    fontSize: 14,

    color: '#444',

    fontWeight: '600',
  },

  // ==========================================================
  // FOOTER
  // ==========================================================

  footer: {
    backgroundColor: '#fff',

    paddingHorizontal: 18,

    paddingTop: 14,

    paddingBottom: 18,

    borderTopWidth: 1,

    borderTopColor:
      '#E5E7EB',

    zIndex: 20,
  },

  footerLocationRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 8,
  },

  footerIcon: {
    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor:
      '#FFF7E8',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  footerLocationInfo: {
    flex: 1,
  },

  footerTitle: {
    fontSize: 14,

    fontWeight: '700',

    color: '#222',

    marginBottom: 3,
  },

  coordinatesText: {
    fontSize: 12,

    color: '#777',

    fontFamily:
      Platform.OS === 'web'
        ? 'monospace'
        : undefined,
  },

  footerHint: {
    fontSize: 12,

    color: '#777',

    lineHeight: 18,

    marginBottom: 12,

    textAlign: 'center',
  },

  confirmButton: {
    height: 50,

    borderRadius: 14,

    backgroundColor:
      COLORS?.primary ||
      '#D89B25',

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 8,
  },

  confirmButtonDisabled: {
    opacity: 0.85,
  },

  confirmButtonText: {
    color: '#fff',

    fontSize: 15,

    fontWeight: '800',
  },
});

