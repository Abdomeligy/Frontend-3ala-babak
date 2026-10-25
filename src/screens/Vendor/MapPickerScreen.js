// src/screens/Vendor/MapPickerScreen.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

// ============================================================
// COLORS
// ============================================================

const SKY_BLUE = '#03A9F4';
const SKY_BLUE_DARK = '#0288D1';
const SKY_BLUE_LIGHT = '#E1F5FE';
const SKY_BLUE_SOFT = '#F0FAFF';

const WHITE = '#FFFFFF';
const BLACK = '#111827';
const GRAY = '#6B7280';
const LIGHT_GRAY = '#E5E7EB';
const DARK_GRAY = '#374151';

const GREEN = '#16A34A';
const RED = '#DC2626';

// ============================================================
// DEFAULT LOCATION
// بركة السبع - المنوفية
// ============================================================

const DEFAULT_LOCATION = {
  latitude: 30.636226,
  longitude: 31.09569,
};

// ============================================================
// HELPERS
// ============================================================

const isValidCoordinate = (latitude, longitude) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
};

const normalizeLocation = (location) => {
  if (!location) {
    return null;
  }

  const latitude = Number(
    location.latitude ??
      location.lat
  );

  const longitude = Number(
    location.longitude ??
      location.lng ??
      location.lon
  );

  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
};

// ============================================================
// ADDRESS BUILDER
// ============================================================

const buildArabicAddress = (place) => {
  if (!place) {
    return '';
  }

  const values = [
    place.name,
    place.street,
    place.streetNumber,
    place.district,
    place.subregion,
    place.city,
    place.region,
    place.country,
  ];

  const cleaned = values
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const unique = [...new Set(cleaned)];

  return unique.join('، ');
};

// ============================================================
// NOMINATIM FALLBACK
// ============================================================

const reverseGeocodeWithNominatim = async (
  latitude,
  longitude
) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!isValidCoordinate(lat, lon)) {
    return '';
  }

  try {
    const url =
      'https://nominatim.openstreetmap.org/reverse' +
      '?format=jsonv2' +
      `&lat=${encodeURIComponent(lat)}` +
      `&lon=${encodeURIComponent(lon)}` +
      '&zoom=18' +
      '&addressdetails=1' +
      '&accept-language=ar';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': '3alababak-fresh/1.0',
      },
    });

    if (!response.ok) {
      return '';
    }

    const data = await response.json();

    if (data?.display_name) {
      return String(data.display_name).trim();
    }

    const address = data?.address;

    if (!address) {
      return '';
    }

    const values = [
      address.road,
      address.neighbourhood,
      address.suburb,
      address.village,
      address.town,
      address.city_district,
      address.city,
      address.state_district,
      address.state,
      address.country,
    ];

    const cleaned = values
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    return [...new Set(cleaned)].join('، ');
  } catch (_) {
    return '';
  }
};

// ============================================================
// FINAL FALLBACK ADDRESS
// ============================================================

const buildFallbackAddress = (
  latitude,
  longitude
) => {
  return (
    `موقع محدد على الخريطة (` +
    `${Number(latitude).toFixed(6)}, ` +
    `${Number(longitude).toFixed(6)})`
  );
};

// ============================================================
// WEB MAP HTML
// OSM + VANILLA JS
// بدون Leaflet / MapLibre / Google Maps
// ============================================================

const MAP_HTML = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
/>

<style>

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #eaf6fb;
  font-family: Arial, sans-serif;
  touch-action: none;
}

#map {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #dceff6;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

#tiles {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.tile {
  position: absolute;
  width: 256px;
  height: 256px;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  object-fit: cover;
}

#marker {
  position: absolute;
  z-index: 50;

  width: 52px;
  height: 52px;

  margin-left: -26px;
  margin-top: -50px;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: grab;

  touch-action: none;

  filter:
    drop-shadow(0px 3px 3px rgba(0,0,0,0.30));

  transform-origin: center bottom;
}

#marker.dragging {
  cursor: grabbing;
  transform: scale(1.12);
}

.marker-pin {
  width: 44px;
  height: 44px;

  border-radius: 50% 50% 50% 0;

  background: #03A9F4;

  border: 4px solid white;

  box-shadow:
    0 4px 12px rgba(0,0,0,.30);

  transform: rotate(-45deg);

  display: flex;
  align-items: center;
  justify-content: center;
}

.marker-pin span {
  transform: rotate(45deg);
  font-size: 22px;
}

#controls {
  position: absolute;

  right: 14px;
  top: 14px;

  z-index: 100;

  display: flex;
  flex-direction: column;

  gap: 8px;
}

.map-btn {
  width: 44px;
  height: 44px;

  border: 0;
  border-radius: 14px;

  background: white;

  box-shadow:
    0 3px 12px rgba(0,0,0,.18);

  color: #374151;

  font-size: 24px;

  display: flex;
  align-items: center;
  justify-content: center;

  font-weight: bold;

  padding: 0;
}

.map-btn:active {
  transform: scale(.94);
  background: #f0faff;
}

#locationBtn {
  color: #0288D1;
  font-size: 25px;
}

#zoomIn,
#zoomOut {
  font-size: 26px;
}

#attribution {
  position: absolute;

  left: 7px;
  bottom: 7px;

  z-index: 90;

  padding: 4px 7px;

  background: rgba(255,255,255,.88);

  border-radius: 5px;

  font-size: 10px;

  color: #444;

  pointer-events: none;
}

#centerDot {
  position: absolute;

  left: 50%;
  top: 50%;

  width: 7px;
  height: 7px;

  margin-left: -3.5px;
  margin-top: -3.5px;

  border-radius: 50%;

  background: rgba(3,169,244,.18);

  pointer-events: none;
}

</style>

</head>

<body>

<div id="map">

  <div id="tiles"></div>

  <div id="marker">
    <div class="marker-pin">
      <span>📍</span>
    </div>
  </div>

  <div id="centerDot"></div>

  <div id="controls">

    <button
      id="locationBtn"
      class="map-btn"
      type="button"
      aria-label="تحديد موقعي"
    >
      ⌖
    </button>

    <button
      id="zoomIn"
      class="map-btn"
      type="button"
      aria-label="تكبير"
    >
      +
    </button>

    <button
      id="zoomOut"
      class="map-btn"
      type="button"
      aria-label="تصغير"
    >
      −
    </button>

  </div>

  <div id="attribution">
    © OpenStreetMap contributors
  </div>

</div>

<script>

(function () {

  // ==========================================================
  // CONSTANTS
  // ==========================================================

  const TILE_SIZE = 256;

  const MIN_ZOOM = 3;
  const MAX_ZOOM = 19;

  let zoom = 15;

  let centerLat = 30.636226;
  let centerLon = 31.09569;

  let markerLat = 30.636226;
  let markerLon = 31.09569;

  let width = window.innerWidth;
  let height = window.innerHeight;

  let isDraggingMap = false;
  let isDraggingMarker = false;

  let dragStartX = 0;
  let dragStartY = 0;

  let dragStartCenterX = 0;
  let dragStartCenterY = 0;

  let pointerId = null;

  // ==========================================================
  // ELEMENTS
  // ==========================================================

  const map = document.getElementById('map');
  const tiles = document.getElementById('tiles');
  const marker = document.getElementById('marker');

  const zoomIn =
    document.getElementById('zoomIn');

  const zoomOut =
    document.getElementById('zoomOut');

  const locationBtn =
    document.getElementById('locationBtn');

  // ==========================================================
  // BRIDGE
  // ==========================================================

  function sendMessage(payload) {

    try {

      if (
        window.ReactNativeWebView &&
        typeof window.ReactNativeWebView.postMessage ===
          'function'
      ) {

        window.ReactNativeWebView.postMessage(
          JSON.stringify(payload)
        );

      }

    } catch (_) {}

  }

  // ==========================================================
  // HELPERS
  // ==========================================================

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  function lonToX(lon, z) {

    const scale =
      TILE_SIZE * Math.pow(2, z);

    return (
      (lon + 180) / 360
    ) * scale;

  }

  function latToY(lat, z) {

    const safeLat =
      clamp(lat, -85.05112878, 85.05112878);

    const scale =
      TILE_SIZE * Math.pow(2, z);

    const sinLat =
      Math.sin(
        safeLat * Math.PI / 180
      );

    const y =
      0.5 -
      (
        Math.log(
          (1 + sinLat) /
          (1 - sinLat)
        ) /
        (4 * Math.PI)
      );

    return y * scale;

  }

  function xToLon(x, z) {

    const scale =
      TILE_SIZE * Math.pow(2, z);

    return (
      x / scale
    ) * 360 - 180;

  }

  function yToLat(y, z) {

    const scale =
      TILE_SIZE * Math.pow(2, z);

    const n =
      Math.PI -
      (
        2 *
        Math.PI *
        y /
        scale
      );

    return (
      180 / Math.PI *
      Math.atan(
        0.5 *
        (
          Math.exp(n) -
          Math.exp(-n)
        )
      )
    );

  }

  // ==========================================================
  // RENDER MAP
  // ==========================================================

  function render() {

    width = map.clientWidth;
    height = map.clientHeight;

    if (
      width <= 0 ||
      height <= 0
    ) {
      return;
    }

    const centerX =
      lonToX(centerLon, zoom);

    const centerY =
      latToY(centerLat, zoom);

    const left =
      centerX -
      width / 2;

    const top =
      centerY -
      height / 2;

    tiles.innerHTML = '';

    const tileCount =
      Math.pow(2, zoom);

    const startTileX =
      Math.floor(
        left / TILE_SIZE
      ) - 1;

    const endTileX =
      Math.floor(
        (left + width) /
          TILE_SIZE
      ) + 1;

    const startTileY =
      Math.floor(
        top / TILE_SIZE
      ) - 1;

    const endTileY =
      Math.floor(
        (top + height) /
          TILE_SIZE
      ) + 1;

    for (
      let tx = startTileX;
      tx <= endTileX;
      tx++
    ) {

      for (
        let ty = startTileY;
        ty <= endTileY;
        ty++
      ) {

        if (
          ty < 0 ||
          ty >= tileCount
        ) {
          continue;
        }

        const wrappedX =
          (
            (
              tx %
              tileCount
            ) +
            tileCount
          ) %
          tileCount;

        const img =
          document.createElement(
            'img'
          );

        img.className =
          'tile';

        img.draggable = false;

        img.alt = '';

        img.src =
          'https://tile.openstreetmap.org/' +
          zoom +
          '/' +
          wrappedX +
          '/' +
          ty +
          '.png';

        img.style.left =
          (
            tx * TILE_SIZE -
            left
          ) + 'px';

        img.style.top =
          (
            ty * TILE_SIZE -
            top
          ) + 'px';

        tiles.appendChild(img);

      }

    }

    // ========================================================
    // MARKER
    // ========================================================

    const markerX =
      lonToX(
        markerLon,
        zoom
      );

    const markerY =
      latToY(
        markerLat,
        zoom
      );

    const screenX =
      markerX - left;

    const screenY =
      markerY - top;

    marker.style.left =
      screenX + 'px';

    marker.style.top =
      screenY + 'px';

  }

  // ==========================================================
  // SCREEN -> GEO
  // ==========================================================

  function screenToGeo(x, y) {

    const centerX =
      lonToX(
        centerLon,
        zoom
      );

    const centerY =
      latToY(
        centerLat,
        zoom
      );

    const mapX =
      centerX -
      width / 2 +
      x;

    const mapY =
      centerY -
      height / 2 +
      y;

    let lat =
      yToLat(
        mapY,
        zoom
      );

    let lon =
      xToLon(
        mapX,
        zoom
      );

    lat =
      clamp(
        lat,
        -85,
        85
      );

    while (lon > 180) {
      lon -= 360;
    }

    while (lon < -180) {
      lon += 360;
    }

    return {
      latitude: lat,
      longitude: lon,
    };

  }

  // ==========================================================
  // SET LOCATION
  // ==========================================================

  function setLocation(
    lat,
    lon,
    notify
  ) {

    const latitude =
      Number(lat);

    const longitude =
      Number(lon);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    centerLat =
      clamp(
        latitude,
        -85,
        85
      );

    centerLon =
      longitude;

    markerLat =
      centerLat;

    markerLon =
      centerLon;

    render();

    if (notify !== false) {

      sendMessage({
        type: 'location_changed',
        latitude: markerLat,
        longitude: markerLon,
      });

    }

  }

  // ==========================================================
  // MAP POINTER DOWN
  // ==========================================================

  map.addEventListener(
    'pointerdown',
    function (event) {

      if (
        event.target === marker ||
        marker.contains(event.target)
      ) {
        return;
      }

      if (
        event.target.closest &&
        event.target.closest('.map-btn')
      ) {
        return;
      }

      isDraggingMap = true;

      pointerId =
        event.pointerId;

      dragStartX =
        event.clientX;

      dragStartY =
        event.clientY;

      dragStartCenterX =
        lonToX(
          centerLon,
          zoom
        );

      dragStartCenterY =
        latToY(
          centerLat,
          zoom
        );

      try {
        map.setPointerCapture(
          pointerId
        );
      } catch (_) {}

    }
  );

  // ==========================================================
  // MAP POINTER MOVE
  // ==========================================================

  map.addEventListener(
    'pointermove',
    function (event) {

      if (
        !isDraggingMap ||
        isDraggingMarker
      ) {
        return;
      }

      const dx =
        event.clientX -
        dragStartX;

      const dy =
        event.clientY -
        dragStartY;

      const newCenterX =
        dragStartCenterX -
        dx;

      const newCenterY =
        dragStartCenterY -
        dy;

      centerLon =
        xToLon(
          newCenterX,
          zoom
        );

      centerLat =
        yToLat(
          newCenterY,
          zoom
        );

      centerLat =
        clamp(
          centerLat,
          -85,
          85
        );

      render();

    }
  );

  // ==========================================================
  // MAP POINTER UP
  // ==========================================================

  map.addEventListener(
    'pointerup',
    function (event) {

      if (!isDraggingMap) {
        return;
      }

      isDraggingMap = false;

      try {
        map.releasePointerCapture(
          pointerId
        );
      } catch (_) {}

      const rect =
        map.getBoundingClientRect();

      const x =
        event.clientX -
        rect.left;

      const y =
        event.clientY -
        rect.top;

      const point =
        screenToGeo(
          x,
          y
        );

      setLocation(
        point.latitude,
        point.longitude,
        true
      );

      sendMessage({
        type: 'map_press',
        latitude:
          point.latitude,
        longitude:
          point.longitude,
      });

    }
  );

  map.addEventListener(
    'pointercancel',
    function () {

      if (!isDraggingMap) {
        return;
      }

      isDraggingMap = false;

      try {
        map.releasePointerCapture(
          pointerId
        );
      } catch (_) {}

    }
  );

  // ==========================================================
  // MARKER POINTER DOWN
  // ==========================================================

  marker.addEventListener(
    'pointerdown',
    function (event) {

      event.stopPropagation();

      isDraggingMarker = true;

      pointerId =
        event.pointerId;

      marker.classList.add(
        'dragging'
      );

      try {
        marker.setPointerCapture(
          pointerId
        );
      } catch (_) {}

    }
  );

  // ==========================================================
  // MARKER POINTER MOVE
  // ==========================================================

  marker.addEventListener(
    'pointermove',
    function (event) {

      if (!isDraggingMarker) {
        return;
      }

      const rect =
        map.getBoundingClientRect();

      const x =
        event.clientX -
        rect.left;

      const y =
        event.clientY -
        rect.top;

      const point =
        screenToGeo(
          x,
          y
        );

      markerLat =
        point.latitude;

      markerLon =
        point.longitude;

      render();

    }
  );

  // ==========================================================
  // MARKER POINTER UP
  // ==========================================================

  marker.addEventListener(
    'pointerup',
    function () {

      if (!isDraggingMarker) {
        return;
      }

      isDraggingMarker = false;

      marker.classList.remove(
        'dragging'
      );

      try {
        marker.releasePointerCapture(
          pointerId
        );
      } catch (_) {}

      sendMessage({
        type: 'marker_drag_end',
        latitude:
          markerLat,
        longitude:
          markerLon,
      });

    }
  );

  marker.addEventListener(
    'pointercancel',
    function () {

      isDraggingMarker = false;

      marker.classList.remove(
        'dragging'
      );

      try {
        marker.releasePointerCapture(
          pointerId
        );
      } catch (_) {}

    }
  );

  // ==========================================================
  // ZOOM
  // ==========================================================

  function changeZoom(nextZoom) {

    const previousZoom =
      zoom;

    nextZoom =
      clamp(
        Number(nextZoom),
        MIN_ZOOM,
        MAX_ZOOM
      );

    if (
      nextZoom === previousZoom
    ) {
      return;
    }

    zoom =
      nextZoom;

    render();

  }

  zoomIn.addEventListener(
    'click',
    function (event) {

      event.stopPropagation();

      changeZoom(
        zoom + 1
      );

    }
  );

  zoomOut.addEventListener(
    'click',
    function (event) {

      event.stopPropagation();

      changeZoom(
        zoom - 1
      );

    }
  );

  // ==========================================================
  // LOCATION BUTTON
  // ==========================================================

  locationBtn.addEventListener(
    'click',
    function (event) {

      event.stopPropagation();

      sendMessage({
        type:
          'request_current_location',
      });

    }
  );

  // ==========================================================
  // WHEEL ZOOM
  // ==========================================================

  map.addEventListener(
    'wheel',
    function (event) {

      event.preventDefault();

      if (
        event.deltaY < 0
      ) {

        changeZoom(
          zoom + 1
        );

      } else {

        changeZoom(
          zoom - 1
        );

      }

    },
    {
      passive: false,
    }
  );

  // ==========================================================
  // MESSAGE FROM RN
  // ==========================================================

  function receiveMessage(event) {

    try {

      let data =
        event.data;

      if (
        typeof data === 'string'
      ) {

        data =
          JSON.parse(data);

      }

      if (!data) {
        return;
      }

      // ------------------------------------------------------
      // SET LOCATION
      // ------------------------------------------------------

      if (
        data.type ===
        'SET_LOCATION'
      ) {

        const lat =
          Number(
            data.latitude
          );

        const lon =
          Number(
            data.longitude
          );

        if (
          Number.isFinite(lat) &&
          Number.isFinite(lon)
        ) {

          const requestedZoom =
            Number(
              data.zoom
            );

          if (
            Number.isFinite(
              requestedZoom
            )
          ) {

            zoom =
              clamp(
                requestedZoom,
                MIN_ZOOM,
                MAX_ZOOM
              );

          }

          setLocation(
            lat,
            lon,
            false
          );

        }

      }

      // ------------------------------------------------------
      // SET CENTER
      // ------------------------------------------------------

      if (
        data.type ===
        'SET_CENTER'
      ) {

        const lat =
          Number(
            data.latitude
          );

        const lon =
          Number(
            data.longitude
          );

        if (
          Number.isFinite(lat) &&
          Number.isFinite(lon)
        ) {

          centerLat =
            clamp(
              lat,
              -85,
              85
            );

          centerLon =
            lon;

          render();

        }

      }

    } catch (_) {}

  }

  document.addEventListener(
    'message',
    receiveMessage
  );

  window.addEventListener(
    'message',
    receiveMessage
  );

  // ==========================================================
  // RESIZE
  // ==========================================================

  window.addEventListener(
    'resize',
    function () {
      render();
    }
  );

  // ==========================================================
  // INITIAL RENDER
  // ==========================================================

  render();

  sendMessage({
    type: 'map_ready',
  });

})();

</script>

</body>
</html>
`;

// ============================================================
// COMPONENT
// ============================================================

export default function MapPickerScreen({
  navigation,
  route,
}) {

  // ==========================================================
  // REFS
  // ==========================================================

  const webViewRef =
    useRef(null);

  const mountedRef =
    useRef(true);

  // ==========================================================
  // INITIAL LOCATION
  // ==========================================================

  const initialLocation =
    useMemo(() => {

      const params =
        route?.params || {};

      const normalized =
        normalizeLocation(
          params.initialLocation ||
            params.location ||
            params.selectedLocation
        );

      return (
        normalized ||
        DEFAULT_LOCATION
      );

    }, [
      route?.params,
    ]);

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    selectedLocation,
    setSelectedLocation,
  ] = useState(
    initialLocation
  );

  const [
    addressName,
    setAddressName,
  ] = useState(
    route?.params?.initialAddress ||
      'جاري تحديد الموقع...'
  );

  const [
    loadingAddress,
    setLoadingAddress,
  ] = useState(false);

  const [
    locating,
    setLocating,
  ] = useState(false);

  const [
    mapReady,
    setMapReady,
  ] = useState(false);

  // ==========================================================
  // CLEANUP
  // ==========================================================

  useEffect(() => {

    mountedRef.current = true;

    return () => {

      mountedRef.current = false;

    };

  }, []);

  // ==========================================================
  // REVERSE GEOCODING
  // ==========================================================

  const reverseGeocode =
    useCallback(
      async (
        latitude,
        longitude
      ) => {

        const lat =
          Number(latitude);

        const lon =
          Number(longitude);

        if (
          !isValidCoordinate(
            lat,
            lon
          )
        ) {

          return buildFallbackAddress(
            lat,
            lon
          );

        }

        if (mountedRef.current) {
          setLoadingAddress(true);
        }

        try {

          // ==================================================
          // EXPO LOCATION
          // ==================================================

          try {

            const results =
              await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lon,
              });

            if (
              Array.isArray(results) &&
              results.length > 0
            ) {

              const address =
                buildArabicAddress(
                  results[0]
                );

              if (
                address &&
                address.trim().length > 0
              ) {

                if (
                  mountedRef.current
                ) {

                  setAddressName(
                    address
                  );

                }

                return address;

              }

            }

          } catch (_) {}

          // ==================================================
          // NOMINATIM
          // ==================================================

          try {

            const nominatimAddress =
              await reverseGeocodeWithNominatim(
                lat,
                lon
              );

            if (
              nominatimAddress &&
              nominatimAddress.trim().length > 0
            ) {

              if (
                mountedRef.current
              ) {

                setAddressName(
                  nominatimAddress
                );

              }

              return nominatimAddress;

            }

          } catch (_) {}

          // ==================================================
          // FINAL FALLBACK
          // ==================================================

          const fallback =
            buildFallbackAddress(
              lat,
              lon
            );

          if (
            mountedRef.current
          ) {

            setAddressName(
              fallback
            );

          }

          return fallback;

        } finally {

          if (
            mountedRef.current
          ) {

            setLoadingAddress(
              false
            );

          }

        }

      },
      []
    );

  // ==========================================================
  // SEND LOCATION TO WEBVIEW
  // ==========================================================

  const sendLocationToMap =
    useCallback(
      (
        latitude,
        longitude,
        zoom = 15
      ) => {

        if (
          !webViewRef.current
        ) {
          return;
        }

        const lat =
          Number(latitude);

        const lon =
          Number(longitude);

        if (
          !isValidCoordinate(
            lat,
            lon
          )
        ) {
          return;
        }

        const message =
          JSON.stringify({
            type:
              'SET_LOCATION',
            latitude: lat,
            longitude: lon,
            zoom,
          });

        webViewRef.current.postMessage(
          message
        );

      },
      []
    );

  // ==========================================================
  // SELECT LOCATION
  // ==========================================================

  const selectLocation =
    useCallback(
      async (
        latitude,
        longitude,
        shouldReverse = true
      ) => {

        const lat =
          Number(latitude);

        const lon =
          Number(longitude);

        if (
          !isValidCoordinate(
            lat,
            lon
          )
        ) {
          return;
        }

        const location = {
          latitude: lat,
          longitude: lon,
        };

        if (
          mountedRef.current
        ) {

          setSelectedLocation(
            location
          );

        }

        sendLocationToMap(
          lat,
          lon
        );

        if (
          shouldReverse
        ) {

          await reverseGeocode(
            lat,
            lon
          );

        }

      },
      [
        reverseGeocode,
        sendLocationToMap,
      ]
    );

  // ==========================================================
  // CURRENT DEVICE LOCATION
  // ==========================================================

  const handleCurrentLocation =
    useCallback(
      async () => {

        if (locating) {
          return;
        }

        try {

          if (
            mountedRef.current
          ) {

            setLocating(
              true
            );

          }

          // ==================================================
          // GPS SERVICE
          // ==================================================

          const servicesEnabled =
            await Location.hasServicesEnabledAsync();

          if (
            !servicesEnabled
          ) {

            Alert.alert(
              'خدمة الموقع غير مفعلة',
              'من فضلك فعّل GPS / الموقع من إعدادات الهاتف ثم حاول مرة أخرى.'
            );

            return;

          }

          // ==================================================
          // PERMISSION
          // ==================================================

          let permission =
            await Location.getForegroundPermissionsAsync();

          if (
            permission.status !==
            Location.PermissionStatus.GRANTED
          ) {

            permission =
              await Location.requestForegroundPermissionsAsync();

          }

          if (
            permission.status !==
            Location.PermissionStatus.GRANTED
          ) {

            Alert.alert(
              'صلاحية الموقع',
              'يجب السماح للتطبيق بالوصول إلى موقعك الحالي حتى يتم تحديد موقعك على الخريطة.'
            );

            return;

          }

          // ==================================================
          // CURRENT POSITION
          // ==================================================

          let currentLocation = null;

          try {

            currentLocation =
              await Location.getCurrentPositionAsync({
                accuracy:
                  Location.Accuracy.High,
                mayShowUserSettingsDialog:
                  true,
              });

          } catch (_) {

            currentLocation =
              await Location.getCurrentPositionAsync({
                accuracy:
                  Location.Accuracy.Balanced,
              });

          }

          const latitude =
            currentLocation?.coords?.latitude;

          const longitude =
            currentLocation?.coords?.longitude;

          if (
            !isValidCoordinate(
              latitude,
              longitude
            )
          ) {

            throw new Error(
              'Invalid current coordinates'
            );

          }

          await selectLocation(
            latitude,
            longitude,
            true
          );

        } catch (_) {

          Alert.alert(
            'تعذر تحديد الموقع',
            'لم نتمكن من الحصول على موقعك الحالي. تأكد من تشغيل GPS ومنح التطبيق صلاحية الموقع ثم حاول مرة أخرى.'
          );

        } finally {

          if (
            mountedRef.current
          ) {

            setLocating(
              false
            );

          }

        }

      },
      [
        locating,
        selectLocation,
      ]
    );

  // ==========================================================
  // SILENT CURRENT LOCATION
  // ==========================================================

  useEffect(() => {

    let cancelled = false;

    const loadExistingPermissionLocation =
      async () => {

        try {

          const permission =
            await Location.getForegroundPermissionsAsync();

          if (
            cancelled ||
            permission.status !==
              Location.PermissionStatus.GRANTED
          ) {

            return;

          }

          const servicesEnabled =
            await Location.hasServicesEnabledAsync();

          if (
            cancelled ||
            !servicesEnabled
          ) {

            return;

          }

          const currentLocation =
            await Location.getCurrentPositionAsync({
              accuracy:
                Location.Accuracy.Balanced,
            });

          if (
            cancelled
          ) {
            return;
          }

          const latitude =
            currentLocation?.coords?.latitude;

          const longitude =
            currentLocation?.coords?.longitude;

          if (
            isValidCoordinate(
              latitude,
              longitude
            )
          ) {

            await selectLocation(
              latitude,
              longitude,
              true
            );

          }

        } catch (_) {}

      };

    loadExistingPermissionLocation();

    return () => {

      cancelled = true;

    };

  }, [
    selectLocation,
  ]);

  // ==========================================================
  // INITIAL REVERSE GEOCODE
  // ==========================================================

  useEffect(() => {

    const initial =
      initialLocation;

    if (
      !initial ||
      !isValidCoordinate(
        initial.latitude,
        initial.longitude
      )
    ) {

      return;

    }

    if (
      route?.params?.initialAddress
    ) {

      setAddressName(
        route.params.initialAddress
      );

      return;

    }

    reverseGeocode(
      initial.latitude,
      initial.longitude
    );

  }, [
    initialLocation,
    reverseGeocode,
    route?.params?.initialAddress,
  ]);

  // ==========================================================
  // MAP MESSAGE
  // ==========================================================

  const handleMapMessage =
    useCallback(
      async (event) => {

        try {

          const raw =
            event?.nativeEvent?.data;

          if (!raw) {
            return;
          }

          const data =
            JSON.parse(raw);

          if (!data) {
            return;
          }

          // ==================================================
          // MAP READY
          // ==================================================

          if (
            data.type ===
            'map_ready'
          ) {

            if (
              mountedRef.current
            ) {

              setMapReady(
                true
              );

            }

            sendLocationToMap(
              selectedLocation.latitude,
              selectedLocation.longitude,
              15
            );

            return;

          }

          // ==================================================
          // MAP PRESS
          // ==================================================

          if (
            data.type ===
            'map_press'
          ) {

            await selectLocation(
              data.latitude,
              data.longitude,
              true
            );

            return;

          }

          // ==================================================
          // MARKER DRAG
          // ==================================================

          if (
            data.type ===
            'marker_drag_end'
          ) {

            await selectLocation(
              data.latitude,
              data.longitude,
              true
            );

            return;

          }

          // ==================================================
          // CURRENT LOCATION
          // ==================================================

          if (
            data.type ===
            'request_current_location'
          ) {

            await handleCurrentLocation();

            return;

          }

        } catch (_) {}

      },
      [
        handleCurrentLocation,
        selectLocation,
        selectedLocation,
        sendLocationToMap,
      ]
    );

  // ==========================================================
  // CONFIRM LOCATION
  // ==========================================================

  const handleConfirm =
    useCallback(() => {

      if (!selectedLocation) {

        Alert.alert(
          'تنبيه',
          'من فضلك حدد موقع المتجر أولاً'
        );

        return;
      }

      // ======================================================
      // منع التأكيد قبل ما تحديد العنوان يخلص
      // (كان بيسبب رجوع عنوان قديم/غير مطابق للإحداثيات)
      // ======================================================

      if (loadingAddress) {

        Alert.alert(
          'لحظة واحدة',
          'لسه بيتم تحديد العنوان، استنى شوية وحاول تاني'
        );

        return;
      }

      const result = {
        latitude:
          Number(
            selectedLocation.latitude
          ),

        longitude:
          Number(
            selectedLocation.longitude
          ),

        address:
          String(
            addressName || ''
          ).trim(),
      };

      if (
        !Number.isFinite(
          result.latitude
        ) ||
        !Number.isFinite(
          result.longitude
        )
      ) {

        Alert.alert(
          'خطأ',
          'إحداثيات الموقع غير صحيحة'
        );

        return;
      }

      const returnTo =
        route?.params?.returnTo;

      if (!returnTo) {

        Alert.alert(
          'خطأ',
          'لم يتم تحديد الصفحة التي سيتم الرجوع إليها'
        );

        return;
      }

      // ======================================================
      // IMPORTANT
      // React Navigation
      // الطريقة الصحيحة بدون navigate({ ... })
      // وبدون أي callback داخل params
      // ======================================================

      navigation.navigate(
        returnTo,
        {
          mapPickerResult: result,
        }
      );

    }, [
      selectedLocation,
      addressName,
      loadingAddress,
      route?.params?.returnTo,
      navigation,
    ]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <View
      style={
        styles.container
      }
    >

      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          WHITE
        }
      />

      {/* =====================================================
          HEADER
      ====================================================== */}

      <View
        style={
          styles.header
        }
      >

        <TouchableOpacity
          style={
            styles.headerButton
          }
          onPress={() =>
            navigation.goBack()
          }
          activeOpacity={0.8}
        >

          <Ionicons
            name="arrow-forward"
            size={24}
            color={BLACK}
          />

        </TouchableOpacity>

        <View
          style={
            styles.headerTitleContainer
          }
        >

          <Text
            style={
              styles.headerTitle
            }
          >
            تحديد الموقع
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            حدد موقعك على الخريطة
          </Text>

        </View>

        <View
          style={
            styles.headerIcon
          }
        >

          <Ionicons
            name="location"
            size={22}
            color={
              SKY_BLUE
            }
          />

        </View>

      </View>

      {/* =====================================================
          MAP
      ====================================================== */}

      <View
        style={
          styles.mapContainer
        }
      >

        <WebView
          ref={
            webViewRef
          }

          source={{
            html:
              MAP_HTML,
          }}

          originWhitelist={[
            '*',
          ]}

          javaScriptEnabled={
            true
          }

          domStorageEnabled={
            true
          }

          startInLoadingState={
            true
          }

          scalesPageToFit={
            false
          }

          bounces={
            false
          }

          overScrollMode="never"

          scrollEnabled={
            false
          }

          showsHorizontalScrollIndicator={
            false
          }

          showsVerticalScrollIndicator={
            false
          }

          onMessage={
            handleMapMessage
          }

          onLoadEnd={() => {

            if (
              mountedRef.current
            ) {

              setMapReady(
                true
              );

            }

            setTimeout(() => {

              sendLocationToMap(
                selectedLocation.latitude,
                selectedLocation.longitude,
                15
              );

            }, 200);

          }}

          renderLoading={() => (

            <View
              style={
                styles.mapLoading
              }
            >

              <ActivityIndicator
                size="large"
                color={
                  SKY_BLUE
                }
              />

              <Text
                style={
                  styles.mapLoadingText
                }
              >
                جاري تحميل الخريطة...
              </Text>

            </View>

          )}

          onError={() => {

            if (
              mountedRef.current
            ) {

              setMapReady(
                false
              );

            }

          }}

          style={
            styles.webView
          }
        />

        {/* =================================================
            GPS OVERLAY
        ================================================== */}

        {locating && (

          <View
            style={
              styles.locatingOverlay
            }
          >

            <View
              style={
                styles.locatingCard
              }
            >

              <ActivityIndicator
                size="small"
                color={
                  SKY_BLUE
                }
              />

              <Text
                style={
                  styles.locatingText
                }
              >
                جاري تحديد موقعك الحالي...
              </Text>

            </View>

          </View>

        )}

      </View>

      {/* =====================================================
          BOTTOM PANEL
      ====================================================== */}

      <View
        style={
          styles.bottomPanel
        }
      >

        {/* ===================================================
            TITLE
        ==================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <View
            style={
              styles.sectionIcon
            }
          >

            <Ionicons
              name="location"
              size={21}
              color={
                SKY_BLUE
              }
            />

          </View>

          <View
            style={
              styles.sectionTextContainer
            }
          >

            <Text
              style={
                styles.sectionTitle
              }
            >
              الموقع المحدد
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              اضغط على الخريطة أو حرّك العلامة
            </Text>

          </View>

        </View>

        {/* ===================================================
            ADDRESS
        ==================================================== */}

        <View
          style={
            styles.addressCard
          }
        >

          <View
            style={
              styles.addressIconContainer
            }
          >

            <Ionicons
              name="navigate"
              size={20}
              color={
                SKY_BLUE
              }
            />

          </View>

          <View
            style={
              styles.addressContent
            }
          >

            <Text
              style={
                styles.addressLabel
              }
            >
              العنوان
            </Text>

            {loadingAddress ? (

              <View
                style={
                  styles.addressLoading
                }
              >

                <ActivityIndicator
                  size="small"
                  color={
                    SKY_BLUE
                  }
                />

                <Text
                  style={
                    styles.addressLoadingText
                  }
                >
                  جاري تحديد العنوان...
                </Text>

              </View>

            ) : (

              <Text
                style={
                  styles.addressText
                }
                numberOfLines={3}
              >
                {
                  addressName ||
                  buildFallbackAddress(
                    selectedLocation.latitude,
                    selectedLocation.longitude
                  )
                }
              </Text>

            )}

          </View>

        </View>

        {/* ===================================================
            COORDINATES
        ==================================================== */}

        <View
          style={
            styles.coordinatesContainer
          }
        >

          <View
            style={
              styles.coordinateItem
            }
          >

            <Text
              style={
                styles.coordinateLabel
              }
            >
              خط العرض
            </Text>

            <Text
              style={
                styles.coordinateValue
              }
            >
              {Number(
                selectedLocation.latitude
              ).toFixed(6)}
            </Text>

          </View>

          <View
            style={
              styles.coordinateDivider
            }
          />

          <View
            style={
              styles.coordinateItem
            }
          >

            <Text
              style={
                styles.coordinateLabel
              }
            >
              خط الطول
            </Text>

            <Text
              style={
                styles.coordinateValue
              }
            >
              {Number(
                selectedLocation.longitude
              ).toFixed(6)}
            </Text>

          </View>

        </View>

        {/* ===================================================
            CURRENT LOCATION BUTTON
        ==================================================== */}

        <TouchableOpacity
          style={
            styles.currentLocationButton
          }
          onPress={
            handleCurrentLocation
          }
          disabled={
            locating
          }
          activeOpacity={0.85}
        >

          {locating ? (

            <ActivityIndicator
              size="small"
              color={
                SKY_BLUE_DARK
              }
            />

          ) : (

            <Ionicons
              name="locate"
              size={21}
              color={
                SKY_BLUE_DARK
              }
            />

          )}

          <Text
            style={
              styles.currentLocationText
            }
          >
            {locating
              ? 'جاري تحديد موقعي...'
              : 'تحديد موقعي الحالي'}
          </Text>

        </TouchableOpacity>

        {/* ===================================================
            CONFIRM
        ==================================================== */}

        <TouchableOpacity
          style={[
            styles.confirmButton,
            loadingAddress && {
              opacity: 0.5,
            },
          ]}
          onPress={
            handleConfirm
          }
          disabled={
            loadingAddress
          }
          activeOpacity={0.88}
        >

          <Ionicons
            name="checkmark-circle"
            size={23}
            color={
              WHITE
            }
          />

          <Text
            style={
              styles.confirmButtonText
            }
          >
            {loadingAddress
              ? 'جاري تحديد العنوان...'
              : 'تأكيد هذا الموقع'}
          </Text>

        </TouchableOpacity>

      </View>

    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        WHITE,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      minHeight: 72,

      backgroundColor:
        WHITE,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        16,

      borderBottomWidth:
        1,

      borderBottomColor:
        '#EEF2F7',

      elevation:
        3,

      shadowColor:
        '#000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.08,

      shadowRadius:
        5,

      zIndex:
        20,
    },

    headerButton: {
      width: 44,
      height: 44,

      borderRadius: 14,

      backgroundColor:
        '#F7FAFC',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerTitleContainer: {
      flex: 1,

      alignItems:
        'center',

      marginHorizontal:
        10,
    },

    headerTitle: {
      fontSize: 18,

      fontWeight:
        '800',

      color:
        BLACK,

      textAlign:
        'center',
    },

    headerSubtitle: {
      marginTop: 3,

      fontSize: 12,

      color:
        GRAY,

      textAlign:
        'center',
    },

    headerIcon: {
      width: 44,
      height: 44,

      borderRadius: 14,

      backgroundColor:
        SKY_BLUE_LIGHT,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    // ========================================================
    // MAP
    // ========================================================

    mapContainer: {
      flex: 1,

      minHeight: 260,

      backgroundColor:
        '#EAF6FB',

      overflow:
        'hidden',
    },

    webView: {
      flex: 1,

      backgroundColor:
        '#EAF6FB',
    },

    mapLoading: {
      position:
        'absolute',

      left: 0,
      right: 0,
      top: 0,
      bottom: 0,

      backgroundColor:
        '#EAF6FB',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    mapLoadingText: {
      marginTop: 10,

      fontSize: 14,

      fontWeight:
        '600',

      color:
        DARK_GRAY,
    },

    // ========================================================
    // LOCATING
    // ========================================================

    locatingOverlay: {
      position:
        'absolute',

      top: 15,

      left: 15,

      right: 15,

      alignItems:
        'center',

      pointerEvents:
        'none',
    },

    locatingCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        15,

      paddingVertical:
        11,

      borderRadius:
        14,

      backgroundColor:
        'rgba(255,255,255,0.96)',

      elevation:
        5,

      shadowColor:
        '#000',

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity:
        0.16,

      shadowRadius:
        7,
    },

    locatingText: {
      marginLeft: 9,

      fontSize: 13,

      fontWeight:
        '700',

      color:
        DARK_GRAY,
    },

    // ========================================================
    // BOTTOM PANEL
    // ========================================================

    bottomPanel: {
      backgroundColor:
        WHITE,

      paddingHorizontal:
        16,

      paddingTop:
        15,

      paddingBottom:
        Platform.OS === 'ios'
          ? 28
          : 18,

      borderTopLeftRadius:
        24,

      borderTopRightRadius:
        24,

      elevation:
        15,

      shadowColor:
        '#000',

      shadowOffset: {
        width: 0,
        height: -3,
      },

      shadowOpacity:
        0.10,

      shadowRadius:
        10,

      zIndex:
        30,
    },

    // ========================================================
    // SECTION HEADER
    // ========================================================

    sectionHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        11,
    },

    sectionIcon: {
      width: 40,
      height: 40,

      borderRadius: 13,

      backgroundColor:
        SKY_BLUE_LIGHT,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        10,
    },

    sectionTextContainer: {
      flex: 1,
    },

    sectionTitle: {
      fontSize: 16,

      fontWeight:
        '800',

      color:
        BLACK,
    },

    sectionSubtitle: {
      marginTop: 2,

      fontSize: 11,

      color:
        GRAY,
    },

    // ========================================================
    // ADDRESS
    // ========================================================

    addressCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        SKY_BLUE_SOFT,

      borderWidth:
        1,

      borderColor:
        '#D7F1FC',

      borderRadius:
        16,

      padding:
        11,

      marginBottom:
        10,
    },

    addressIconContainer: {
      width: 38,
      height: 38,

      borderRadius: 12,

      backgroundColor:
        WHITE,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        10,
    },

    addressContent: {
      flex: 1,
    },

    addressLabel: {
      fontSize: 10,

      color:
        GRAY,

      marginBottom:
        2,

      fontWeight:
        '600',
    },

    addressText: {
      fontSize: 13,

      color:
        BLACK,

      fontWeight:
        '700',

      lineHeight:
        19,
    },

    addressLoading: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    addressLoadingText: {
      marginLeft: 7,

      fontSize: 12,

      color:
        GRAY,

      fontWeight:
        '600',
    },

    // ========================================================
    // COORDINATES
    // ========================================================

    coordinatesContainer: {
      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#FAFAFA',

      borderRadius:
        14,

      borderWidth:
        1,

      borderColor:
        '#EEEEEE',

      paddingVertical:
        9,

      marginBottom:
        10,
    },

    coordinateItem: {
      flex: 1,

      alignItems:
        'center',
    },

    coordinateLabel: {
      fontSize: 10,

      color:
        GRAY,

      marginBottom:
        3,
    },

    coordinateValue: {
      fontSize: 12,

      color:
        DARK_GRAY,

      fontWeight:
        '800',
    },

    coordinateDivider: {
      width: 1,

      height: 30,

      backgroundColor:
        LIGHT_GRAY,
    },

    // ========================================================
    // CURRENT LOCATION
    // ========================================================

    currentLocationButton: {
      height: 46,

      borderRadius: 14,

      borderWidth: 1.5,

      borderColor:
        '#B9E6FA',

      backgroundColor:
        SKY_BLUE_LIGHT,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        9,
    },

    currentLocationText: {
      marginLeft: 8,

      fontSize: 13,

      fontWeight:
        '800',

      color:
        SKY_BLUE_DARK,
    },

    // ========================================================
    // CONFIRM
    // ========================================================

    confirmButton: {
      height: 50,

      borderRadius: 15,

      backgroundColor:
        SKY_BLUE_DARK,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      elevation:
        4,

      shadowColor:
        SKY_BLUE_DARK,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity:
        0.25,

      shadowRadius:
        5,
    },

    confirmButtonText: {
      marginLeft: 8,

      fontSize: 15,

      fontWeight:
        '900',

      color:
        WHITE,
    },

  });