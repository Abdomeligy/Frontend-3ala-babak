// src/screens/Customer/MapPickerScreen.native.js

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
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  FlatList,
  Keyboard,
} from 'react-native';

import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';

import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

// ============================================================
// CONFIG
// ============================================================

const TILE_SIZE = 256;

const MIN_ZOOM = 3;
const MAX_ZOOM = 19;

const DEFAULT_ZOOM = 15;
const CURRENT_LOCATION_ZOOM = 16;

// ============================================================
// IMPORTANT
// Exact location supplied by user:
//
// 30°38'20.7"N 31°04'34.2"E
//
// Decimal:
//
// Latitude  = 30.6389167
// Longitude = 31.0761667
// ============================================================

const DEFAULT_REGION = {
  latitude: 30.6389167,
  longitude: 31.0761667,
};

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

const OSM_TILE_URL =
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// ============================================================
// SERVICE AREA
// ============================================================

const MONOUFIA_BOUNDS = {
  south: 30.28,
  west: 30.68,
  north: 30.82,
  east: 31.25,
};

// ============================================================
// HELPERS
// ============================================================

const showAlert = (title, message) => {
  Alert.alert(title, message);
};

const isValidCoordinates = (latitude, longitude) => {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

const isPointInsideServiceArea = (latitude, longitude) => {
  if (!isValidCoordinates(latitude, longitude)) {
    return false;
  }

  return (
    latitude >= MONOUFIA_BOUNDS.south &&
    latitude <= MONOUFIA_BOUNDS.north &&
    longitude >= MONOUFIA_BOUNDS.west &&
    longitude <= MONOUFIA_BOUNDS.east
  );
};

// ============================================================
// NOMINATIM
// ============================================================

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'ar,en',
  'User-Agent': '3alaBabakFresh/1.0',
};

// ============================================================
// FORMAT ARABIC ADDRESS
// ============================================================
// Nominatim قد يعيد اسم المركز الإداري في county مع اسم المدينة
// في city/town. نعرض المدينة الفعلية أولاً ولا نكرر المركز الإداري
// كأنه مدينة أخرى.
const formatArabicAddress = (data, latitude, longitude) => {
  const address = data?.address || {};
  const parts = [];

  // الحدود التقريبية لمدينة/مركز بركة السبع بمحافظة المنوفية.
  // نستخدمها لتصحيح أخطاء بيانات Nominatim التي قد تعيد الغربية
  // أو شبين الكوم كأنها المدينة الحالية.
  const isInsideBerketElsabaa =
    Number(latitude) >= 30.58 &&
    Number(latitude) <= 30.70 &&
    Number(longitude) >= 31.02 &&
    Number(longitude) <= 31.14;
  const addUnique = (value) => {
    const clean = String(value ?? '').trim();
    if (clean && !parts.includes(clean)) {
      parts.push(clean);
    }
  };

  const poiName = data?.namedetails?.name || data?.name;
  const road = address.road || address.pedestrian || address.footway;
  const neighbourhood =
    address.neighbourhood || address.quarter || address.suburb;

  // ترتيب المدينة مهم: city ثم town ثم village ثم municipality.
  // في بيانات بركة السبع قد يظهر الاسم في city أو town حسب النقطة.
  const detectedCity =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.hamlet;

  // في نطاق بركة السبع لا نأخذ أسماء المدينة/المحافظة من Nominatim؛
  // نثبت الاسم الصحيح المطلوب للتطبيق.
  const city = isInsideBerketElsabaa
    ? 'بركة السبع'
    : detectedCity;
  const state = isInsideBerketElsabaa
    ? 'محافظة المنوفية'
    : address.state;
  const cityText = String(city ?? '').trim();
  const countyText = String(address.county ?? '').trim();

  if (poiName && poiName !== road && poiName !== cityText) {
    addUnique(poiName);
  }

  addUnique(road);
  addUnique(neighbourhood);
  addUnique(city);

  // لا نضيف county إذا كان مختلفاً فقط في المستوى الإداري لكنه
  // ليس جزءاً ضرورياً من عنوان المدينة (مثل شبين الكوم مع بركة السبع).
  // نضيف المحافظة فقط عند عدم وجودها ضمن العناصر السابقة.
  const isAdministrativeParent =
    cityText &&
    countyText &&
    countyText !== cityText &&
    (
      countyText.includes(cityText) ||
      cityText.includes(countyText) ||
      (cityText.includes('بركة السبع') && countyText.includes('شبين الكوم'))
    );

  // لا نعرض county داخل عنوان بركة السبع؛ لأنه قد يظهر «شبين الكوم»
  // أو اسم محافظة خاطئ. المحافظة الصحيحة المضمونة هي المنوفية.
  if (countyText && !isInsideBerketElsabaa && !isAdministrativeParent) {
    addUnique(countyText);
  }

  if (state && parts.length < 5) {
    addUnique(state);
  }

  return (
    parts.join('، ') ||
    data?.display_name ||
    `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
  );
};

// ============================================================
// ESCAPE HTML
// ============================================================

const escapeHtml = (value) => {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
};

// ============================================================
// MAP HTML
// ============================================================

const createMapHtml = (
  initialLatitude,
  initialLongitude,
  initialZoom
) => {
  const safeLatitude = Number.isFinite(initialLatitude)
    ? initialLatitude
    : DEFAULT_REGION.latitude;

  const safeLongitude = Number.isFinite(initialLongitude)
    ? initialLongitude
    : DEFAULT_REGION.longitude;

  const safeZoom = Number.isFinite(initialZoom)
    ? initialZoom
    : DEFAULT_ZOOM;

  return `
<!DOCTYPE html>

<html>
<head>

<meta
  name="viewport"
  content="width=device-width,
  initial-scale=1.0,
  maximum-scale=1.0,
  minimum-scale=1.0,
  user-scalable=no"
/>

<style>

html,
body {

  margin: 0;
  padding: 0;

  width: 100%;
  height: 100%;

  overflow: hidden;

  background: #e5e7eb;

  -webkit-user-select: none;
  user-select: none;

  touch-action: none;
}

#map {

  position: relative;

  width: 100%;
  height: 100%;

  overflow: hidden;

  background: #e5e7eb;

  touch-action: none;

  cursor: grab;
}

#map.dragging {

  cursor: grabbing;
}

#tiles {

  position: absolute;

  left: 0;
  top: 0;

  width: 100%;
  height: 100%;

  pointer-events: none;

  will-change: transform;
}

.tile {

  position: absolute;

  width: ${TILE_SIZE}px;
  height: ${TILE_SIZE}px;

  pointer-events: none;

  user-select: none;

  -webkit-user-drag: none;

  image-rendering: auto;
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

  background: rgba(220, 38, 38, 0.35);

  pointer-events: none;

  z-index: 20;
}

#loading {

  position: absolute;

  left: 50%;
  top: 50%;

  transform: translate(-50%, -50%);

  padding: 10px 16px;

  border-radius: 12px;

  background: rgba(17, 24, 39, 0.78);

  color: white;

  font-family: Arial, sans-serif;

  font-size: 13px;

  z-index: 100;

  pointer-events: none;
}

#copyright {

  position: absolute;

  left: 8px;
  bottom: 7px;

  padding: 3px 7px;

  background: rgba(255, 255, 255, 0.85);

  border-radius: 5px;

  color: #374151;

  font-family: Arial, sans-serif;

  font-size: 10px;

  z-index: 40;

  pointer-events: none;
}

</style>

</head>

<body>

<div id="map">

  <div id="tiles"></div>

  <div id="centerDot"></div>

  <div id="loading">
    جاري تحميل الخريطة...
  </div>

  <div id="copyright">
    © OpenStreetMap contributors
  </div>

</div>

<script>

(function () {

  'use strict';

  // ============================================================
  // STATE
  // ============================================================

  const map = document.getElementById('map');
  const tiles = document.getElementById('tiles');
  const loading = document.getElementById('loading');

  const TILE_SIZE = ${TILE_SIZE};

  let centerLat = ${safeLatitude};
  let centerLng = ${safeLongitude};
  let zoom = ${safeZoom};

  let mapWidth = window.innerWidth;
  let mapHeight = window.innerHeight;

  let isDragging = false;

  let dragStartX = 0;
  let dragStartY = 0;

  let dragStartCenterLat = 0;
  let dragStartCenterLng = 0;

  let lastSentLat = null;
  let lastSentLng = null;
  let lastSentZoom = null;

  let renderFrame = null;

  // ------------------------------------------------------------
  // PAN (SMOOTH DRAG) STATE
  //
  // بدل ما نعيد بناء كل الـ tiles من الصفر مع كل حركة صغيرة
  // (وده اللي كان بيكسر السلاسة)، إحنا بنحرك طبقة الـ tiles
  // بالكامل بـ CSS transform (شغال على الـ GPU وسريع جدًا)
  // وبس لما نبعد عن آخر رسم بمقدار بلاطة كاملة تقريبًا، نعمل
  // إعادة بناء حقيقية للـ tiles.
  // ------------------------------------------------------------

  let renderedCenterWorldX = null;
  let renderedCenterWorldY = null;

  let panRafId = null;

  const tileCache = new Map();

  // ============================================================
  // LIMITS
  // ============================================================

  const MIN_ZOOM = ${MIN_ZOOM};
  const MAX_ZOOM = ${MAX_ZOOM};

  // ============================================================
  // HELPERS
  // ============================================================

  function clamp(value, min, max) {

    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  function clampLatitude(lat) {

    return clamp(
      lat,
      -85.05112878,
      85.05112878
    );
  }

  function normalizeLongitude(lng) {

    let value = lng;

    while (value > 180) {
      value -= 360;
    }

    while (value < -180) {
      value += 360;
    }

    return value;
  }

  // ============================================================
  // WEB MERCATOR
  // ============================================================

  function longitudeToWorldX(lng, worldSize) {

    return (
      ((lng + 180) / 360) *
      worldSize
    );
  }

  function latitudeToWorldY(lat, worldSize) {

    const sinLat =
      Math.sin(
        clampLatitude(lat) *
        Math.PI /
        180
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

    return y * worldSize;
  }

  function worldXToLongitude(x, worldSize) {

    return (
      (x / worldSize) * 360
    ) - 180;
  }

  function worldYToLatitude(y, worldSize) {

    const n =
      Math.PI -
      (
        2 *
        Math.PI *
        y /
        worldSize
      );

    return (
      180 /
      Math.PI *
      Math.atan(
        Math.sinh(n)
      )
    );
  }

  // ============================================================
  // SEND CENTER TO REACT NATIVE
  // ============================================================

  function sendCenter(force) {

    const changedEnough =
      force ||
      lastSentLat === null ||
      Math.abs(centerLat - lastSentLat) > 0.000001 ||
      Math.abs(centerLng - lastSentLng) > 0.000001 ||
      zoom !== lastSentZoom;

    if (!changedEnough) {
      return;
    }

    lastSentLat = centerLat;
    lastSentLng = centerLng;
    lastSentZoom = zoom;

    if (
      window.ReactNativeWebView &&
      window.ReactNativeWebView.postMessage
    ) {

      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'mapCenterChanged',
          latitude: centerLat,
          longitude: centerLng,
          zoom: zoom,
        })
      );

    }
  }

  // ============================================================
  // TILE
  // ============================================================

  function getTileKey(z, x, y) {

    return (
      z +
      '_' +
      x +
      '_' +
      y
    );
  }

  function createTile(z, x, y, screenX, screenY) {

    const key = getTileKey(
      z,
      x,
      y
    );

    let img = tileCache.get(key);

    if (!img) {

      img = document.createElement('img');

      img.className = 'tile';

      img.draggable = false;

      img.alt = '';

      const tileUrl =
        '${OSM_TILE_URL}'
          .replace('{z}', z)
          .replace('{x}', x)
          .replace('{y}', y);

      img.src = tileUrl;

      img.onerror = function () {
        img.style.opacity = '0';
      };

      tileCache.set(
        key,
        img
      );
    }

    img.style.left =
      Math.round(screenX) + 'px';

    img.style.top =
      Math.round(screenY) + 'px';

    return img;
  }

  // ============================================================
  // RENDER
  // ============================================================

  function renderMap() {

    if (renderFrame) {

      cancelAnimationFrame(
        renderFrame
      );
    }

    renderFrame =
      requestAnimationFrame(
        function () {

          // إلغاء أي إزاحة CSS متبقية من السحب السريع
          // قبل ما نعيد بناء الشبكة من الصفر بإحداثيات دقيقة
          tiles.style.transform =
            'translate3d(0px, 0px, 0px)';

          const worldSize =
            TILE_SIZE *
            Math.pow(2, zoom);

          const centerWorldX =
            longitudeToWorldX(
              centerLng,
              worldSize
            );

          const centerWorldY =
            latitudeToWorldY(
              centerLat,
              worldSize
            );

          const startTileX =
            Math.floor(
              (
                centerWorldX -
                mapWidth / 2
              ) /
              TILE_SIZE
            ) - 1;

          const endTileX =
            Math.floor(
              (
                centerWorldX +
                mapWidth / 2
              ) /
              TILE_SIZE
            ) + 1;

          const startTileY =
            Math.floor(
              (
                centerWorldY -
                mapHeight / 2
              ) /
              TILE_SIZE
            ) - 1;

          const endTileY =
            Math.floor(
              (
                centerWorldY +
                mapHeight / 2
              ) /
              TILE_SIZE
            ) + 1;

          const frag =
            document.createDocumentFragment();

          const maxTile =
            Math.pow(2, zoom);

          for (
            let ty = startTileY;
            ty <= endTileY;
            ty++
          ) {

            if (
              ty < 0 ||
              ty >= maxTile
            ) {
              continue;
            }

            for (
              let tx = startTileX;
              tx <= endTileX;
              tx++
            ) {

              let normalizedTx = tx;

              while (
                normalizedTx < 0
              ) {
                normalizedTx += maxTile;
              }

              while (
                normalizedTx >= maxTile
              ) {
                normalizedTx -= maxTile;
              }

              const x =
                centerWorldX -
                mapWidth / 2 +
                (
                  tx * TILE_SIZE
                ) -
                (
                  (
                    Math.floor(
                      centerWorldX /
                      TILE_SIZE
                    ) *
                    TILE_SIZE
                  )
                ) +
                (
                  centerWorldX -
                  Math.floor(
                    centerWorldX /
                    TILE_SIZE
                  ) *
                  TILE_SIZE
                );

              const y =
                centerWorldY -
                mapHeight / 2 +
                (
                  ty * TILE_SIZE
                ) -
                (
                  (
                    Math.floor(
                      centerWorldY /
                      TILE_SIZE
                    ) *
                    TILE_SIZE
                  )
                ) +
                (
                  centerWorldY -
                  Math.floor(
                    centerWorldY /
                    TILE_SIZE
                  ) *
                  TILE_SIZE
                );

              const tileScreenX =
                mapWidth / 2 +
                (
                  tx -
                  Math.floor(
                    centerWorldX /
                    TILE_SIZE
                  )
                ) *
                TILE_SIZE -
                (
                  centerWorldX %
                  TILE_SIZE
                );

              const tileScreenY =
                mapHeight / 2 +
                (
                  ty -
                  Math.floor(
                    centerWorldY /
                    TILE_SIZE
                  )
                ) *
                TILE_SIZE -
                (
                  centerWorldY %
                  TILE_SIZE
                );

              const tile =
                createTile(
                  zoom,
                  normalizedTx,
                  ty,
                  tileScreenX,
                  tileScreenY
                );

              frag.appendChild(
                tile
              );

            }
          }

          tiles.innerHTML = '';

          tiles.appendChild(
            frag
          );

          loading.style.display =
            'none';

          renderedCenterWorldX =
            centerWorldX;

          renderedCenterWorldY =
            centerWorldY;

        }
      );
  }

  // ============================================================
  // SCHEDULE PAN UPDATE (SMOOTH DRAG WITHOUT REBUILDING TILES)
  // ============================================================

  function schedulePanUpdate() {

    if (panRafId) {
      return;
    }

    panRafId =
      requestAnimationFrame(
        function () {

          panRafId = null;

          if (
            renderedCenterWorldX === null ||
            renderedCenterWorldY === null
          ) {

            renderMap();

            return;
          }

          const worldSize =
            TILE_SIZE *
            Math.pow(2, zoom);

          const centerWorldX =
            longitudeToWorldX(
              centerLng,
              worldSize
            );

          const centerWorldY =
            latitudeToWorldY(
              centerLat,
              worldSize
            );

          const dx =
            centerWorldX -
            renderedCenterWorldX;

          const dy =
            centerWorldY -
            renderedCenterWorldY;

          // لو اتحركنا مسافة كبيرة (أكتر من بلاطة ونص) لازم
          // نعيد بناء الشبكة عشان مفيش فراغات فاضية تظهر
          if (
            Math.abs(dx) > TILE_SIZE * 1.5 ||
            Math.abs(dy) > TILE_SIZE * 1.5
          ) {

            renderMap();

          } else {

            tiles.style.transform =
              'translate3d(' +
              (-dx) +
              'px, ' +
              (-dy) +
              'px, 0px)';

          }

        }
      );
  }

  // ============================================================
  // MAP CENTER FROM SCREEN
  // ============================================================

  function screenToLatLng(
    screenX,
    screenY
  ) {

    const worldSize =
      TILE_SIZE *
      Math.pow(2, zoom);

    const centerWorldX =
      longitudeToWorldX(
        centerLng,
        worldSize
      );

    const centerWorldY =
      latitudeToWorldY(
        centerLat,
        worldSize
      );

    const worldX =
      centerWorldX +
      (
        screenX -
        mapWidth / 2
      );

    const worldY =
      centerWorldY +
      (
        screenY -
        mapHeight / 2
      );

    return {
      latitude:
        clampLatitude(
          worldYToLatitude(
            worldY,
            worldSize
          )
        ),

      longitude:
        normalizeLongitude(
          worldXToLongitude(
            worldX,
            worldSize
          )
        ),
    };
  }

  // ============================================================
  // CENTER TO LOCATION
  // ============================================================

  window.centerTo =
    function (
      latitude,
      longitude,
      newZoom
    ) {

      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number'
      ) {
        return;
      }

      centerLat =
        clampLatitude(
          latitude
        );

      centerLng =
        normalizeLongitude(
          longitude
        );

      if (
        typeof newZoom === 'number'
      ) {

        zoom =
          clamp(
            Math.round(
              newZoom
            ),
            MIN_ZOOM,
            MAX_ZOOM
          );

      }

      renderMap();

      sendCenter(true);
    };

  // ============================================================
  // ZOOM AROUND SCREEN POINT
  // ============================================================

  function zoomAt(
    screenX,
    screenY,
    delta
  ) {

    const before =
      screenToLatLng(
        screenX,
        screenY
      );

    const newZoom =
      clamp(
        Math.round(
          zoom + delta
        ),
        MIN_ZOOM,
        MAX_ZOOM
      );

    if (
      newZoom === zoom
    ) {
      return;
    }

    zoom = newZoom;

    const afterWorldSize =
      TILE_SIZE *
      Math.pow(
        2,
        zoom
      );

    const beforeWorldX =
      longitudeToWorldX(
        before.longitude,
        afterWorldSize
      );

    const beforeWorldY =
      latitudeToWorldY(
        before.latitude,
        afterWorldSize
      );

    const centerWorldX =
      beforeWorldX -
      (
        screenX -
        mapWidth / 2
      );

    const centerWorldY =
      beforeWorldY -
      (
        screenY -
        mapHeight / 2
      );

    centerLng =
      normalizeLongitude(
        worldXToLongitude(
          centerWorldX,
          afterWorldSize
        )
      );

    centerLat =
      clampLatitude(
        worldYToLatitude(
          centerWorldY,
          afterWorldSize
        )
      );

    renderMap();

    sendCenter(true);
  }

  // ============================================================
  // ZOOM BUTTONS
  // ============================================================

  window.zoomIn =
    function () {

      zoomAt(
        mapWidth / 2,
        mapHeight / 2,
        1
      );
    };

  window.zoomOut =
    function () {

      zoomAt(
        mapWidth / 2,
        mapHeight / 2,
        -1
      );
    };

  // ============================================================
  // TOUCH STATE
  // ============================================================

  let activeTouches = {};

  let pinchStartDistance = 0;
  let pinchStartZoom = zoom;

  let pinchStartCenterLat = 0;
  let pinchStartCenterLng = 0;

  let pinchAnchorLat = 0;
  let pinchAnchorLng = 0;

  let pinchMidX = 0;
  let pinchMidY = 0;

  // ============================================================
  // DISTANCE
  // ============================================================

  function getDistance(
    a,
    b
  ) {

    const dx =
      b.clientX -
      a.clientX;

    const dy =
      b.clientY -
      a.clientY;

    return Math.sqrt(
      dx * dx +
      dy * dy
    );
  }

  // ============================================================
  // TOUCH START
  // ============================================================

  map.addEventListener(
    'touchstart',
    function (event) {

      event.preventDefault();

      for (
        let i = 0;
        i < event.changedTouches.length;
        i++
      ) {

        const touch =
          event.changedTouches[i];

        activeTouches[
          touch.identifier
        ] = touch;

      }

      const touches =
        Object.values(
          activeTouches
        );

      if (
        touches.length === 1
      ) {

        const touch =
          touches[0];

        isDragging = true;

        map.classList.add(
          'dragging'
        );

        dragStartX =
          touch.clientX;

        dragStartY =
          touch.clientY;

        dragStartCenterLat =
          centerLat;

        dragStartCenterLng =
          centerLng;

      } else if (
        touches.length >= 2
      ) {

        const a =
          touches[0];

        const b =
          touches[1];

        pinchStartDistance =
          Math.max(
            1,
            getDistance(
              a,
              b
            )
          );

        pinchStartZoom =
          zoom;

        pinchStartCenterLat =
          centerLat;

        pinchStartCenterLng =
          centerLng;

        pinchMidX =
          (
            a.clientX +
            b.clientX
          ) / 2;

        pinchMidY =
          (
            a.clientY +
            b.clientY
          ) / 2;

        const anchor =
          screenToLatLng(
            pinchMidX,
            pinchMidY
          );

        pinchAnchorLat =
          anchor.latitude;

        pinchAnchorLng =
          anchor.longitude;

        isDragging = false;
      }

    },
    {
      passive: false,
    }
  );

  // ============================================================
  // TOUCH MOVE
  // ============================================================

  map.addEventListener(
    'touchmove',
    function (event) {

      event.preventDefault();

      for (
        let i = 0;
        i < event.changedTouches.length;
        i++
      ) {

        const touch =
          event.changedTouches[i];

        activeTouches[
          touch.identifier
        ] = touch;

      }

      const touches =
        Object.values(
          activeTouches
        );

      // --------------------------------------------------------
      // ONE FINGER PAN
      // --------------------------------------------------------

      if (
        touches.length === 1 &&
        isDragging
      ) {

        const touch =
          touches[0];

        const dx =
          touch.clientX -
          dragStartX;

        const dy =
          touch.clientY -
          dragStartY;

        const worldSize =
          TILE_SIZE *
          Math.pow(
            2,
            zoom
          );

        const startWorldX =
          longitudeToWorldX(
            dragStartCenterLng,
            worldSize
          );

        const startWorldY =
          latitudeToWorldY(
            dragStartCenterLat,
            worldSize
          );

        const newWorldX =
          startWorldX -
          dx;

        const newWorldY =
          startWorldY -
          dy;

        centerLng =
          normalizeLongitude(
            worldXToLongitude(
              newWorldX,
              worldSize
            )
          );

        centerLat =
          clampLatitude(
            worldYToLatitude(
              newWorldY,
              worldSize
            )
          );

        schedulePanUpdate();

        sendCenter(false);

        return;
      }

      // --------------------------------------------------------
      // PINCH ZOOM
      // --------------------------------------------------------

      if (
        touches.length >= 2
      ) {

        const a =
          touches[0];

        const b =
          touches[1];

        const currentDistance =
          Math.max(
            1,
            getDistance(
              a,
              b
            )
          );

        const ratio =
          currentDistance /
          pinchStartDistance;

        const zoomDelta =
          Math.log(
            ratio
          ) /
          Math.log(2);

        const newZoom =
          Math.round(
            clamp(
              pinchStartZoom +
              zoomDelta,
              MIN_ZOOM,
              MAX_ZOOM
            )
          );

        zoom = newZoom;

        const worldSize =
          TILE_SIZE *
          Math.pow(
            2,
            zoom
          );

        const anchorWorldX =
          longitudeToWorldX(
            pinchAnchorLng,
            worldSize
          );

        const anchorWorldY =
          latitudeToWorldY(
            pinchAnchorLat,
            worldSize
          );

        const midX =
          (
            a.clientX +
            b.clientX
          ) / 2;

        const midY =
          (
            a.clientY +
            b.clientY
          ) / 2;

        centerLng =
          normalizeLongitude(
            worldXToLongitude(
              anchorWorldX -
              (
                midX -
                mapWidth / 2
              ),
              worldSize
            )
          );

        centerLat =
          clampLatitude(
            worldYToLatitude(
              anchorWorldY -
              (
                midY -
                mapHeight / 2
              ),
              worldSize
            )
          );

        schedulePanUpdate();

        sendCenter(false);
      }

    },
    {
      passive: false,
    }
  );

  // ============================================================
  // TOUCH END
  // ============================================================

  map.addEventListener(
    'touchend',
    function (event) {

      event.preventDefault();

      for (
        let i = 0;
        i < event.changedTouches.length;
        i++
      ) {

        const touch =
          event.changedTouches[i];

        delete activeTouches[
          touch.identifier
        ];
      }

      const touches =
        Object.values(
          activeTouches
        );

      if (
        touches.length === 0
      ) {

        isDragging = false;

        map.classList.remove(
          'dragging'
        );

        renderMap();

        sendCenter(true);
      }

    },
    {
      passive: false,
    }
  );

  // ============================================================
  // TOUCH CANCEL
  // ============================================================

  map.addEventListener(
    'touchcancel',
    function () {

      activeTouches = {};

      isDragging = false;

      map.classList.remove(
        'dragging'
      );

      renderMap();

      sendCenter(true);

    },
    {
      passive: false,
    }
  );

  // ============================================================
  // MOUSE DRAG
  // ============================================================

  let mouseDown = false;

  map.addEventListener(
    'mousedown',
    function (event) {

      if (
        event.button !== 0
      ) {
        return;
      }

      event.preventDefault();

      mouseDown = true;

      isDragging = true;

      map.classList.add(
        'dragging'
      );

      dragStartX =
        event.clientX;

      dragStartY =
        event.clientY;

      dragStartCenterLat =
        centerLat;

      dragStartCenterLng =
        centerLng;

    }
  );

  window.addEventListener(
    'mousemove',
    function (event) {

      if (
        !mouseDown ||
        !isDragging
      ) {
        return;
      }

      event.preventDefault();

      const dx =
        event.clientX -
        dragStartX;

      const dy =
        event.clientY -
        dragStartY;

      const worldSize =
        TILE_SIZE *
        Math.pow(
          2,
          zoom
        );

      const startWorldX =
        longitudeToWorldX(
          dragStartCenterLng,
          worldSize
        );

      const startWorldY =
        latitudeToWorldY(
          dragStartCenterLat,
          worldSize
        );

      const newWorldX =
        startWorldX -
        dx;

      const newWorldY =
        startWorldY -
        dy;

      centerLng =
        normalizeLongitude(
          worldXToLongitude(
            newWorldX,
            worldSize
          )
        );

      centerLat =
        clampLatitude(
          worldYToLatitude(
            newWorldY,
            worldSize
          )
        );

      schedulePanUpdate();

      sendCenter(false);

    }
  );

  window.addEventListener(
    'mouseup',
    function () {

      if (!mouseDown) {
        return;
      }

      mouseDown = false;

      isDragging = false;

      map.classList.remove(
        'dragging'
      );

      renderMap();

      sendCenter(true);

    }
  );

  // ============================================================
  // WHEEL
  // ============================================================

  map.addEventListener(
    'wheel',
    function (event) {

      event.preventDefault();

      const rect =
        map.getBoundingClientRect();

      const x =
        event.clientX -
        rect.left;

      const y =
        event.clientY -
        rect.top;

      zoomAt(
        x,
        y,
        event.deltaY < 0
          ? 1
          : -1
      );

    },
    {
      passive: false,
    }
  );

  // ============================================================
  // DOUBLE CLICK / DOUBLE TAP
  // ============================================================

  let lastTapTime = 0;

  map.addEventListener(
    'click',
    function (event) {

      const now =
        Date.now();

      if (
        now - lastTapTime <
        280
      ) {

        const rect =
          map.getBoundingClientRect();

        zoomAt(
          event.clientX -
            rect.left,
          event.clientY -
            rect.top,
          1
        );
      }

      lastTapTime = now;

    }
  );

  // ============================================================
  // RESIZE
  // ============================================================

  window.addEventListener(
    'resize',
    function () {

      mapWidth =
        window.innerWidth;

      mapHeight =
        window.innerHeight;

      renderMap();

    }
  );

  // ============================================================
  // INITIAL
  // ============================================================

  renderMap();

  setTimeout(
    function () {

      sendCenter(true);

    },
    350
  );

})();

</script>

</body>
</html>
`;
};

// ============================================================
// COMPONENT
// ============================================================

export default function MapPickerScreen({
  navigation,
  route,
}) {

  // ============================================================
  // PARAMS
  // ============================================================

  const initialLocation =
    route?.params?.initialLocation || null;

  const returnTo =
    route?.params?.returnTo || null;

  // ============================================================
  // REFS
  // ============================================================

  const webViewRef =
    useRef(null);

  const mountedRef =
    useRef(true);

  const locationRequestRef =
    useRef(false);

  const searchTimerRef =
    useRef(null);

  const reverseGeocodeTimerRef =
    useRef(null);

  const searchRequestIdRef =
    useRef(0);

  // ============================================================
  // INITIAL COORDS
  // ============================================================

  const initialCoords =
    useMemo(() => {

      if (
        initialLocation &&
        isValidCoordinates(
          Number(
            initialLocation.latitude
          ),
          Number(
            initialLocation.longitude
          )
        )
      ) {

        return {
          latitude:
            Number(
              initialLocation.latitude
            ),

          longitude:
            Number(
              initialLocation.longitude
            ),
        };

      }

      // IMPORTANT:
      // User's exact supplied location
      return {
        ...DEFAULT_REGION,
      };

    }, [initialLocation]);

  // ============================================================
  // STATE
  // ============================================================

  const [
    mapCenter,
    setMapCenter,
  ] = useState(initialCoords);

  const [
    selectedCoords,
    setSelectedCoords,
  ] = useState(
    initialLocation &&
    isValidCoordinates(
      Number(
        initialLocation.latitude
      ),
      Number(
        initialLocation.longitude
      )
    )
      ? initialCoords
      : null
  );

  const [
    selectedAddress,
    setSelectedAddress,
  ] = useState(
    initialLocation?.addressText ||
    initialLocation?.formattedAddress ||
    ''
  );

  const [
    loadingLocation,
    setLoadingLocation,
  ] = useState(false);

  const [
    loadingAddress,
    setLoadingAddress,
  ] = useState(false);

  const [
    locationAccuracy,
    setLocationAccuracy,
  ] = useState(null);

  const [
    isInsideService,
    setIsInsideService,
  ] = useState(
    isPointInsideServiceArea(
      initialCoords.latitude,
      initialCoords.longitude
    )
  );

  // ============================================================
  // SEARCH
  // ============================================================

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  const [
    searchResults,
    setSearchResults,
  ] = useState([]);

  const [
    searchLoading,
    setSearchLoading,
  ] = useState(false);

  const [
    searchFocused,
    setSearchFocused,
  ] = useState(false);

  // ============================================================
  // MAP HTML
  // ============================================================

  const mapHtml = useMemo(
    () => {

      return createMapHtml(
        initialCoords.latitude,
        initialCoords.longitude,
        DEFAULT_ZOOM
      );

    },
    [
      initialCoords.latitude,
      initialCoords.longitude,
    ]
  );

  // ============================================================
  // CLEANUP
  // ============================================================

  useEffect(() => {

    return () => {

      mountedRef.current =
        false;

      if (
        searchTimerRef.current
      ) {

        clearTimeout(
          searchTimerRef.current
        );

      }

      if (
        reverseGeocodeTimerRef.current
      ) {

        clearTimeout(
          reverseGeocodeTimerRef.current
        );
      }

    };

  }, []);

  // ============================================================
  // INJECT MAP COMMAND
  // ============================================================

  const injectMapCommand =
    useCallback(
      (command) => {

        if (
          !webViewRef.current
        ) {
          return;
        }

        webViewRef.current.injectJavaScript(
          `
            try {
              ${command}
            } catch (e) {
              console.log(
                'Map command error:',
                e
              );
            }
            true;
          `
        );

      },
      []
    );

  // ============================================================
  // REVERSE GEOCODING
  // ============================================================

  const reverseGeocode =
    useCallback(
      (
        latitude,
        longitude,
        immediate = false
      ) => {

        if (
          !isValidCoordinates(
            latitude,
            longitude
          )
        ) {
          return;
        }

        if (
          reverseGeocodeTimerRef.current
        ) {

          clearTimeout(
            reverseGeocodeTimerRef.current
          );
        }

        const run = async () => {

          try {

            if (
              mountedRef.current
            ) {

              setLoadingAddress(
                true
              );

            }

            const url =
              `${NOMINATIM_URL}/reverse?` +
              `format=jsonv2` +
              `&lat=${encodeURIComponent(
                latitude
              )}` +
              `&lon=${encodeURIComponent(
                longitude
              )}` +
              `&zoom=18` +
              `&addressdetails=1` +
              `&namedetails=1` +
              `&accept-language=ar,en`;

            const response =
              await fetch(
                url,
                {
                  headers:
                    NOMINATIM_HEADERS,
                }
              );

            if (
              !response.ok
            ) {

              throw new Error(
                `Reverse geocode failed: ${response.status}`
              );

            }

            const data =
              await response.json();

            if (
              !mountedRef.current
            ) {
              return;
            }

            const finalAddress =
              formatArabicAddress(
                data,
                latitude,
                longitude
              );

            setSelectedAddress(
              finalAddress
            );

          } catch (error) {

            console.log(
              'Reverse geocoding error:',
              error
            );

            if (
              mountedRef.current &&
              !selectedAddress
            ) {

              setSelectedAddress(
                `الموقع: ${latitude.toFixed(
                  6
                )}، ${longitude.toFixed(
                  6
                )}`
              );

            }

          } finally {

            if (
              mountedRef.current
            ) {

              setLoadingAddress(
                false
              );

            }
          }

        };

        if (immediate) {

          run();

        } else {

          reverseGeocodeTimerRef.current =
            setTimeout(
              run,
              700
            );

        }

      },
      [selectedAddress]
    );

  // ============================================================
  // GPS
  // ============================================================

  const requestAndCenterCurrentLocation =
    useCallback(
      async () => {

        if (
          locationRequestRef.current
        ) {
          return;
        }

        locationRequestRef.current =
          true;

        try {

          setLoadingLocation(
            true
          );

          const permission =
            await Location.requestForegroundPermissionsAsync();

          if (
            permission.status !==
            Location.PermissionStatus.GRANTED
          ) {

            showAlert(
              'صلاحية الموقع',
              'لازم تسمح للتطبيق باستخدام موقعك الحالي حتى نحدد مكانك على الخريطة.'
            );

            return;
          }

          let location = null;

          // ----------------------------------------------------
          // HIGH ACCURACY
          // ----------------------------------------------------

          try {

            location =
              await Location.getCurrentPositionAsync(
                {
                  accuracy:
                    Location.Accuracy.High,
                  mayShowUserSettingsDialog:
                    true,
                }
              );

          } catch (highError) {

            console.log(
              'High accuracy failed:',
              highError
            );

            // --------------------------------------------------
            // FALLBACK
            // --------------------------------------------------

            location =
              await Location.getCurrentPositionAsync(
                {
                  accuracy:
                    Location.Accuracy.Balanced,
                  mayShowUserSettingsDialog:
                    true,
                }
              );

          }

          if (
            !location?.coords
          ) {

            throw new Error(
              'GPS coordinates unavailable'
            );

          }

          const latitude =
            Number(
              location.coords.latitude
            );

          const longitude =
            Number(
              location.coords.longitude
            );

          if (
            !isValidCoordinates(
              latitude,
              longitude
            )
          ) {

            throw new Error(
              'Invalid GPS coordinates'
            );

          }

          const accuracy =
            Number(
              location.coords.accuracy
            );

          console.log(
            'REAL GPS:',
            latitude,
            longitude
          );

          console.log(
            'GPS accuracy:',
            accuracy
          );

          if (
            mountedRef.current
          ) {

            setMapCenter({
              latitude,
              longitude,
            });

            setSelectedCoords({
              latitude,
              longitude,
            });

            setIsInsideService(
              isPointInsideServiceArea(
                latitude,
                longitude
              )
            );

            if (
              Number.isFinite(
                accuracy
              )
            ) {

              setLocationAccuracy(
                accuracy
              );

            }

          }

          injectMapCommand(
            `
              window.centerTo(
                ${latitude},
                ${longitude},
                ${CURRENT_LOCATION_ZOOM}
              );
            `
          );

          reverseGeocode(
            latitude,
            longitude,
            true
          );

          if (
            !isPointInsideServiceArea(
              latitude,
              longitude
            )
          ) {

            showAlert(
              'الموقع خارج نطاق الخدمة',
              'موقعك الحالي خارج نطاق منطقة الخدمة المتاحة في التطبيق.'
            );

          }

        } catch (error) {

          console.log(
            'GPS ERROR:',
            error
          );

          showAlert(
            'تعذر تحديد الموقع',
            'لم نتمكن من تحديد موقعك الحالي. تأكد من تشغيل GPS ومنح التطبيق صلاحية الموقع.'
          );

        } finally {

          locationRequestRef.current =
            false;

          if (
            mountedRef.current
          ) {

            setLoadingLocation(
              false
            );

          }

        }

      },
      [
        injectMapCommand,
        reverseGeocode,
      ]
    );

  // ============================================================
  // AUTO GPS
  // ============================================================

  useEffect(() => {

    requestAndCenterCurrentLocation();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // MAP MESSAGE
  // ============================================================

  const handleWebViewMessage =
    useCallback(
      (event) => {

        try {

          const data =
            JSON.parse(
              event.nativeEvent.data
            );

          if (
            data?.type !==
            'mapCenterChanged'
          ) {
            return;
          }

          const latitude =
            Number(
              data.latitude
            );

          const longitude =
            Number(
              data.longitude
            );

          if (
            !isValidCoordinates(
              latitude,
              longitude
            )
          ) {
            return;
          }

          if (
            mountedRef.current
          ) {

            setMapCenter({
              latitude,
              longitude,
            });

            // IMPORTANT:
            // Because the marker is fixed in the
            // center, the center coordinate is
            // the selected location.
            setSelectedCoords({
              latitude,
              longitude,
            });

            setIsInsideService(
              isPointInsideServiceArea(
                latitude,
                longitude
              )
            );

          }

          reverseGeocode(
            latitude,
            longitude
          );

        } catch (error) {

          console.log(
            'Map message error:',
            error
          );

        }

      },
      [
        reverseGeocode,
      ]
    );

  // ============================================================
  // MAP LOAD
  // ============================================================

  const handleMapLoad =
    useCallback(() => {

      const start =
        selectedCoords ||
        initialCoords;

      injectMapCommand(
        `
          window.centerTo(
            ${start.latitude},
            ${start.longitude},
            ${selectedCoords
              ? CURRENT_LOCATION_ZOOM
              : DEFAULT_ZOOM}
          );
        `
      );

      if (
        !selectedAddress
      ) {

        reverseGeocode(
          start.latitude,
          start.longitude,
          true
        );

      }

    }, [
      selectedCoords,
      initialCoords,
      selectedAddress,
      injectMapCommand,
      reverseGeocode,
    ]);

  // ============================================================
  // SEARCH
  // ============================================================

  const searchPlaces =
    useCallback(
      async (text) => {

        const trimmed =
          String(
            text || ''
          ).trim();

        if (
          trimmed.length < 3
        ) {

          setSearchResults(
            []
          );

          setSearchLoading(
            false
          );

          return;

        }

        const requestId =
          ++searchRequestIdRef.current;

        try {

          setSearchLoading(
            true
          );

          // بيانات الحدود الجغرافية لمنطقة الخدمة (المنوفية) بترتيب
          // left,top,right,bottom اللي Nominatim محتاجه للـ viewbox
          // (west, north, east, south).
          const viewbox =
            `${MONOUFIA_BOUNDS.west},` +
            `${MONOUFIA_BOUNDS.north},` +
            `${MONOUFIA_BOUNDS.east},` +
            `${MONOUFIA_BOUNDS.south}`;

          const url =
            `${NOMINATIM_URL}/search?` +
            `format=jsonv2` +
            `&q=${encodeURIComponent(
              trimmed
            )}` +
            `&limit=15` +
            `&addressdetails=1` +
            `&countrycodes=eg` +
            `&accept-language=ar,en` +
            `&dedupe=1` +
            // bounded=0 يعني "رجّح" النتايج جوه الـ viewbox من غير
            // ما تمنع نهائي أي نتيجة برة المنطقة (لو حد كتب اسم
            // مكان بره بركة السبع لسه هيلاقيه، بس الأولوية للقريب).
            `&viewbox=${viewbox}` +
            `&bounded=0`;

          const response =
            await fetch(
              url,
              {
                headers:
                  NOMINATIM_HEADERS,
              }
            );

          if (
            !response.ok
          ) {

            throw new Error(
              `Search failed: ${response.status}`
            );

          }

          const data =
            await response.json();

          if (
            requestId !==
            searchRequestIdRef.current
          ) {
            return;
          }

          if (
            mountedRef.current
          ) {

            const rawResults =
              Array.isArray(data)
                ? data
                : [];

            // نرتّب النتايج يدويًا: اللي جوه منطقة الخدمة (المنوفية)
            // يطلعوا فوق، لأن viewbox+bounded=0 بيرجّح بس مش بيضمن
            // الترتيب. أي نتيجة برة المنطقة تفضل موجودة لكن تحت.
            const sortedResults =
              [...rawResults].sort(
                (a, b) => {

                  const aInside =
                    isPointInsideServiceArea(
                      Number(a?.lat),
                      Number(a?.lon)
                    )
                      ? 0
                      : 1;

                  const bInside =
                    isPointInsideServiceArea(
                      Number(b?.lat),
                      Number(b?.lon)
                    )
                      ? 0
                      : 1;

                  return (
                    aInside - bInside
                  );

                }
              );

            setSearchResults(
              sortedResults
            );

          }

        } catch (error) {

          console.log(
            'Search error:',
            error
          );

          if (
            mountedRef.current &&
            requestId ===
              searchRequestIdRef.current
          ) {

            setSearchResults(
              []
            );

          }

        } finally {

          if (
            mountedRef.current &&
            requestId ===
              searchRequestIdRef.current
          ) {

            setSearchLoading(
              false
            );

          }

        }

      },
      []
    );

  // ============================================================
  // SEARCH CHANGE
  // ============================================================

  const handleSearchChange =
    useCallback(
      (text) => {

        setSearchQuery(
          text
        );

        if (
          searchTimerRef.current
        ) {

          clearTimeout(
            searchTimerRef.current
          );

        }

        if (
          text.trim().length < 3
        ) {

          setSearchResults(
            []
          );

          setSearchLoading(
            false
          );

          return;

        }

        searchTimerRef.current =
          setTimeout(
            () => {

              searchPlaces(
                text
              );

            },
            800
          );

      },
      [
        searchPlaces,
      ]
    );

  // ============================================================
  // SELECT SEARCH RESULT
  // ============================================================

  const handleSelectSearchResult =
    useCallback(
      (item) => {

        Keyboard.dismiss();

        const latitude =
          Number(
            item.lat
          );

        const longitude =
          Number(
            item.lon
          );

        if (
          !isValidCoordinates(
            latitude,
            longitude
          )
        ) {

          return;
        }

        const displayName =
          item.display_name ||
          '';

        setSearchQuery(
          displayName
        );

        setSelectedAddress(
          displayName
        );

        setSearchResults(
          []
        );

        setSearchFocused(
          false
        );

        setSelectedCoords({
          latitude,
          longitude,
        });

        setMapCenter({
          latitude,
          longitude,
        });

        setIsInsideService(
          isPointInsideServiceArea(
            latitude,
            longitude
          )
        );

        injectMapCommand(
          `
            window.centerTo(
              ${latitude},
              ${longitude},
              ${CURRENT_LOCATION_ZOOM}
            );
          `
        );

        // Get a fresh structured address
        reverseGeocode(
          latitude,
          longitude,
          true
        );

      },
      [
        injectMapCommand,
        reverseGeocode,
      ]
    );

  // ============================================================
  // ZOOM
  // ============================================================

  const handleZoomIn =
    useCallback(() => {

      injectMapCommand(
        `
          window.zoomIn();
        `
      );

    }, [
      injectMapCommand,
    ]);

  const handleZoomOut =
    useCallback(() => {

      injectMapCommand(
        `
          window.zoomOut();
        `
      );

    }, [
      injectMapCommand,
    ]);

  // ============================================================
  // CURRENT LOCATION
  // ============================================================

  const handleCurrentLocation =
    useCallback(() => {

      requestAndCenterCurrentLocation();

    }, [
      requestAndCenterCurrentLocation,
    ]);

  // ============================================================
  // CENTER ON SELECTED LOCATION
  // ============================================================

  const handleCenterSelected =
    useCallback(() => {

      if (
        !selectedCoords
      ) {
        return;
      }

      injectMapCommand(
        `
          window.centerTo(
            ${selectedCoords.latitude},
            ${selectedCoords.longitude},
            ${CURRENT_LOCATION_ZOOM}
          );
        `
      );

    }, [
      selectedCoords,
      injectMapCommand,
    ]);

  // ============================================================
  // CLEAR SEARCH
  // ============================================================

  const handleClearSearch =
    useCallback(() => {

      setSearchQuery('');

      setSearchResults([]);

      setSearchFocused(
        false
      );

      Keyboard.dismiss();

    }, []);

  // ============================================================
  // CONFIRM
  // ============================================================

  const handleConfirm =
    useCallback(
      async () => {

        if (
          !selectedCoords
        ) {

          showAlert(
            'حدد الموقع',
            'حرك الخريطة بحيث تكون العلامة على المكان المطلوب أولاً.'
          );

          return;
        }

        const latitude =
          Number(
            selectedCoords.latitude
          );

        const longitude =
          Number(
            selectedCoords.longitude
          );

        if (
          !isValidCoordinates(
            latitude,
            longitude
          )
        ) {

          showAlert(
            'موقع غير صالح',
            'إحداثيات الموقع غير صحيحة.'
          );

          return;
        }

        if (
          !isPointInsideServiceArea(
            latitude,
            longitude
          )
        ) {

          showAlert(
            'الموقع خارج نطاق الخدمة',
            'الموقع المحدد خارج نطاق الخدمة المتاح حالياً.'
          );

          return;
        }

        let finalAddress =
          selectedAddress;

        if (
          !finalAddress
        ) {

          try {

            setLoadingAddress(
              true
            );

            const url =
              `${NOMINATIM_URL}/reverse?` +
              `format=jsonv2` +
              `&lat=${encodeURIComponent(
                latitude
              )}` +
              `&lon=${encodeURIComponent(
                longitude
              )}` +
              `&zoom=18` +
              `&addressdetails=1` +
              `&accept-language=ar,en`;

            const response =
              await fetch(
                url,
                {
                  headers:
                    NOMINATIM_HEADERS,
                }
              );

            const data =
              await response.json();

            finalAddress =
              formatArabicAddress(
                data,
                latitude,
                longitude
              );

          } catch (error) {

            console.log(
              'Final reverse geocode error:',
              error
            );

            finalAddress =
              `${latitude.toFixed(
                6
              )}, ${longitude.toFixed(
                6
              )}`;

          } finally {

            setLoadingAddress(
              false
            );

          }

        }

        // ======================================================
        // OBJECT SENT TO ADD ADDRESS
        // ======================================================

        const selectedLocation = {
          latitude,
          longitude,

          isInsideCity: true,

          addressText:
            finalAddress || '',

          formattedAddress:
            finalAddress || '',

        };

        // ======================================================
        // NAVIGATION
        // ======================================================

        if (
          returnTo
        ) {

          navigation.navigate(
            returnTo,
            {
              selectedLocation,
            },
            {
              merge: true,
            }
          );

          return;
        }

        navigation.navigate(
          'AddAddressScreen',
          {
            selectedLocation,
          }
        );

      },
      [
        selectedCoords,
        selectedAddress,
        navigation,
        returnTo,
      ]
    );

  // ============================================================
  // DISPLAY COORDS
  // ============================================================

  const displayLatitude =
    selectedCoords?.latitude ??
    mapCenter?.latitude ??
    DEFAULT_REGION.latitude;

  const displayLongitude =
    selectedCoords?.longitude ??
    mapCenter?.longitude ??
    DEFAULT_REGION.longitude;

  // ============================================================
  // UI
  // ============================================================

  return (
    <View style={styles.container}>

      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() =>
            navigation.goBack()
          }
        >

          <Ionicons
            name={
              Platform.OS === 'ios'
                ? 'chevron-back'
                : 'arrow-back'
            }
            size={24}
            color="#111827"
          />

        </TouchableOpacity>

        <View
          style={styles.headerCenter}
        >

          <Text
            style={styles.headerTitle}
          >
            تحديد موقع التوصيل
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            حرك الخريطة لتحديد مكانك
          </Text>

        </View>

        <View
          style={styles.headerSpacer}
        />

      </View>

      {/* ======================================================
          SEARCH
      ====================================================== */}

      <View
        style={styles.searchContainer}
      >

        <View
          style={[
            styles.searchBox,
            searchFocused &&
              styles.searchBoxFocused,
          ]}
        >

          <Ionicons
            name="search"
            size={21}
            color="#6B7280"
          />

          <TextInput
            value={searchQuery}
            onChangeText={
              handleSearchChange
            }
            placeholder="ابحث عن مكان أو شارع..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
            onFocus={() =>
              setSearchFocused(
                true
              )
            }
            onSubmitEditing={() =>
              searchPlaces(
                searchQuery
              )
            }
          />

          {searchLoading ? (

            <ActivityIndicator
              size="small"
              color={
                COLORS?.primary ||
                '#2563EB'
              }
            />

          ) : searchQuery.length > 0 ? (

            <TouchableOpacity
              onPress={
                handleClearSearch
              }
              activeOpacity={0.7}
            >

              <Ionicons
                name="close-circle"
                size={21}
                color="#9CA3AF"
              />

            </TouchableOpacity>

          ) : null}

        </View>

        {/* ==================================================
            SEARCH RESULTS
        ================================================== */}

        {searchFocused &&
        searchResults.length > 0 ? (

          <View
            style={styles.searchResults}
          >

            <FlatList
              data={searchResults}
              keyExtractor={(
                item,
                index
              ) =>
                String(
                  item.place_id ||
                  `${item.lat}-${item.lon}-${index}`
                )
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
              renderItem={({
                item,
              }) => (

                <TouchableOpacity
                  style={
                    styles.searchResultItem
                  }
                  activeOpacity={0.7}
                  onPress={() =>
                    handleSelectSearchResult(
                      item
                    )
                  }
                >

                  <View
                    style={
                      styles.searchResultIcon
                    }
                  >

                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={
                        COLORS?.primary ||
                        '#2563EB'
                      }
                    />

                  </View>

                  <View
                    style={
                      styles.searchResultText
                    }
                  >

                    <Text
                      numberOfLines={1}
                      style={
                        styles.searchResultTitle
                      }
                    >
                      {item.name ||
                        item.display_name}
                    </Text>

                    <Text
                      numberOfLines={2}
                      style={
                        styles.searchResultDescription
                      }
                    >
                      {item.display_name}
                    </Text>

                  </View>

                </TouchableOpacity>

              )}
            />

          </View>

        ) : null}

      </View>

      {/* ======================================================
          MAP
      ====================================================== */}

      <View
        style={styles.mapContainer}
      >

        <WebView
          ref={webViewRef}
          source={{
            html: mapHtml,
          }}
          style={styles.webView}
          originWhitelist={[
            '*',
          ]}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={
            false
          }
          showsHorizontalScrollIndicator={
            false
          }
          showsVerticalScrollIndicator={
            false
          }
          allowsInlineMediaPlayback
          onLoad={handleMapLoad}
          onMessage={
            handleWebViewMessage
          }
          onError={(event) => {

            console.log(
              'WebView map error:',
              event.nativeEvent
            );

          }}
          onHttpError={(event) => {

            console.log(
              'WebView HTTP error:',
              event.nativeEvent
            );

          }}
        />

        {/* ====================================================
            FIXED CENTER MARKER
            NEVER MOVES
        ==================================================== */}

        <View
          style={styles.fixedMarker}
          pointerEvents="none"
        >

          <View
            style={styles.markerBubble}
          >

            <Text
              style={
                styles.markerBubbleText
              }
            >
              موقع التوصيل
            </Text>

          </View>

          <Text
            style={styles.markerIcon}
          >
            📍
          </Text>

          <View
            style={styles.markerPointer}
          />

        </View>

        {/* ====================================================
            SERVICE BADGE
        ==================================================== */}

        <View
          style={[
            styles.serviceBadge,
            isInsideService
              ? styles.serviceBadgeSuccess
              : styles.serviceBadgeWarning,
          ]}
        >

          <Ionicons
            name={
              isInsideService
                ? 'checkmark-circle'
                : 'warning'
            }
            size={16}
            color={
              isInsideService
                ? '#15803D'
                : '#B45309'
            }
          />

          <Text
            style={[
              styles.serviceBadgeText,
              isInsideService
                ? styles.serviceBadgeTextSuccess
                : styles.serviceBadgeTextWarning,
            ]}
          >
            {isInsideService
              ? 'داخل نطاق الخدمة'
              : 'خارج نطاق الخدمة'}
          </Text>

        </View>

        {/* ====================================================
            ZOOM
        ==================================================== */}

        <View
          style={styles.zoomControls}
        >

          <TouchableOpacity
            style={
              styles.zoomButton
            }
            activeOpacity={0.8}
            onPress={
              handleZoomIn
            }
          >

            <Ionicons
              name="add"
              size={28}
              color="#111827"
            />

          </TouchableOpacity>

          <View
            style={
              styles.zoomDivider
            }
          />

          <TouchableOpacity
            style={
              styles.zoomButton
            }
            activeOpacity={0.8}
            onPress={
              handleZoomOut
            }
          >

            <Ionicons
              name="remove"
              size={28}
              color="#111827"
            />

          </TouchableOpacity>

        </View>

        {/* ====================================================
            GPS BUTTON
        ==================================================== */}

        <TouchableOpacity
          style={styles.gpsButton}
          activeOpacity={0.85}
          onPress={
            handleCurrentLocation
          }
        >

          {loadingLocation ? (

            <ActivityIndicator
              size="small"
              color={
                COLORS?.primary ||
                '#2563EB'
              }
            />

          ) : (

            <Ionicons
              name="locate"
              size={24}
              color={
                COLORS?.primary ||
                '#2563EB'
              }
            />

          )}

        </TouchableOpacity>

        {/* ====================================================
            CENTER SELECTED
        ==================================================== */}

        <TouchableOpacity
          style={styles.centerButton}
          activeOpacity={0.85}
          onPress={
            handleCenterSelected
          }
        >

          <Ionicons
            name="navigate"
            size={21}
            color="#111827"
          />

        </TouchableOpacity>

      </View>

      {/* ======================================================
          BOTTOM DETAILS
      ====================================================== */}

      <View
        style={styles.bottomPanel}
      >

        <Text
          style={styles.instruction}
        >
          حرّك الخريطة تحت العلامة لتغيير الموقع
        </Text>

        {/* ====================================================
            ADDRESS
        ==================================================== */}

        <View
          style={styles.addressCard}
        >

          <View
            style={
              styles.addressIconContainer
            }
          >

            <Ionicons
              name="location"
              size={22}
              color={
                COLORS?.primary ||
                '#2563EB'
              }
            />

          </View>

          <View
            style={styles.addressContent}
          >

            <Text
              style={
                styles.addressLabel
              }
            >
              العنوان المحدد
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
                    COLORS?.primary ||
                    '#2563EB'
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
                {selectedAddress ||
                  'حرّك الخريطة لاختيار الموقع'}
              </Text>

            )}

          </View>

        </View>

        {/* ====================================================
            COORDINATES
        ==================================================== */}

        <View
          style={styles.coordinatesRow}
        >

          <View
            style={
              styles.coordinateBox
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
              numberOfLines={1}
            >
              {displayLatitude.toFixed(
                7
              )}
            </Text>

          </View>

          <View
            style={
              styles.coordinateBox
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
              numberOfLines={1}
            >
              {displayLongitude.toFixed(
                7
              )}
            </Text>

          </View>

        </View>

        {/* ====================================================
            GPS ACCURACY
        ==================================================== */}

        {Number.isFinite(
          locationAccuracy
        ) ? (

          <Text
            style={
              styles.accuracyText
            }
          >
            دقة GPS تقريبًا:{' '}
            {Math.round(
              locationAccuracy
            )}{' '}
            متر
          </Text>

        ) : null}

        {/* ====================================================
            CONFIRM
        ==================================================== */}

        <TouchableOpacity
          style={[
            styles.confirmButton,
            !selectedCoords ||
            !isInsideService
              ? styles.confirmButtonDisabled
              : null,
          ]}
          activeOpacity={0.85}
          onPress={
            handleConfirm
          }
          disabled={
            !selectedCoords ||
            !isInsideService ||
            loadingAddress
          }
        >

          {loadingAddress ? (

            <ActivityIndicator
              color="#FFFFFF"
            />

          ) : (

            <>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.confirmButtonText
                }
              >
                تأكيد هذا الموقع
              </Text>
            </>

          )}

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
    backgroundColor: '#FFFFFF',
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    height: 68,
    backgroundColor: '#FFFFFF',

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 14,

    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',

    zIndex: 100,
    elevation: 10,
  },

  backButton: {
    width: 44,
    height: 44,

    borderRadius: 22,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: '#F3F4F6',
  },

  headerCenter: {
    flex: 1,

    alignItems: 'center',

    marginHorizontal: 10,
  },

  headerTitle: {
    fontSize:
      FONT_SIZES?.lg ||
      18,

    fontWeight: '800',

    color: '#111827',

    textAlign: 'center',
  },

  headerSubtitle: {
    marginTop: 2,

    fontSize:
      FONT_SIZES?.xs ||
      11,

    color: '#6B7280',

    textAlign: 'center',
  },

  headerSpacer: {
    width: 44,
  },

  // ==========================================================
  // SEARCH
  // ==========================================================

  searchContainer: {

    position: 'absolute',

    left: 12,
    right: 12,

    top: 78,

    zIndex: 500,
    elevation: 30,
  },

  searchBox: {

    minHeight: 52,

    backgroundColor: '#FFFFFF',

    borderRadius: 16,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 14,

    borderWidth: 1,
    borderColor: '#E5E7EB',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.14,
    shadowRadius: 8,

    elevation: 7,
  },

  searchBoxFocused: {

    borderColor:
      COLORS?.primary ||
      '#2563EB',
  },

  searchInput: {

    flex: 1,

    minHeight: 50,

    marginHorizontal: 9,

    paddingVertical: 0,

    textAlign: 'right',

    color: '#111827',

    fontSize:
      FONT_SIZES?.md ||
      15,
  },

  searchResults: {

    marginTop: 6,

    maxHeight: 310,

    backgroundColor: '#FFFFFF',

    borderRadius: 16,

    overflow: 'hidden',

    borderWidth: 1,
    borderColor: '#E5E7EB',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.15,
    shadowRadius: 10,

    elevation: 10,
  },

  searchResultItem: {

    minHeight: 68,

    paddingHorizontal: 12,

    flexDirection: 'row',

    alignItems: 'center',

    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  searchResultIcon: {

    width: 38,
    height: 38,

    borderRadius: 19,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: '#EFF6FF',
  },

  searchResultText: {

    flex: 1,

    marginLeft: 10,

    alignItems: 'flex-end',
  },

  searchResultTitle: {

    width: '100%',

    color: '#111827',

    fontSize:
      FONT_SIZES?.sm ||
      14,

    fontWeight: '700',

    textAlign: 'right',
  },

  searchResultDescription: {

    width: '100%',

    marginTop: 3,

    color: '#6B7280',

    fontSize:
      FONT_SIZES?.xs ||
      11,

    textAlign: 'right',
  },

  // ==========================================================
  // MAP
  // ==========================================================

  mapContainer: {

    flex: 1,

    position: 'relative',

    overflow: 'hidden',

    backgroundColor: '#E5E7EB',
  },

  webView: {

    flex: 1,

    backgroundColor: 'transparent',
  },

  // ==========================================================
  // FIXED MARKER
  // ==========================================================

  fixedMarker: {

    position: 'absolute',

    left: '50%',
    top: '50%',

    width: 110,

    alignItems: 'center',

    transform: [
      {
        translateX: -55,
      },
      {
        translateY: -63,
      },
    ],

    zIndex: 300,
  },

  markerBubble: {

    paddingHorizontal: 11,
    paddingVertical: 6,

    backgroundColor: '#111827',

    borderRadius: 10,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.25,
    shadowRadius: 4,

    elevation: 4,
  },

  markerBubbleText: {

    color: '#FFFFFF',

    fontSize: 11,

    fontWeight: '700',

    textAlign: 'center',
  },

  markerIcon: {

    fontSize: 40,

    marginTop: -2,

    textAlign: 'center',

    includeFontPadding: false,

    textShadowColor:
      'rgba(0,0,0,0.22)',

    textShadowOffset: {
      width: 0,
      height: 2,
    },

    textShadowRadius: 3,
  },

  markerPointer: {

    width: 0,
    height: 0,

    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,

    borderLeftColor:
      'transparent',

    borderRightColor:
      'transparent',

    borderTopColor:
      '#DC2626',

    marginTop: -7,
  },

  // ==========================================================
  // SERVICE BADGE
  // ==========================================================

  serviceBadge: {

    position: 'absolute',

    top: 142,

    left: 14,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 11,
    paddingVertical: 7,

    borderRadius: 12,

    zIndex: 250,
  },

  serviceBadgeSuccess: {

    backgroundColor: '#DCFCE7',
  },

  serviceBadgeWarning: {

    backgroundColor: '#FEF3C7',
  },

  serviceBadgeText: {

    marginLeft: 5,

    fontSize: 11,

    fontWeight: '700',
  },

  serviceBadgeTextSuccess: {

    color: '#15803D',
  },

  serviceBadgeTextWarning: {

    color: '#B45309',
  },

  // ==========================================================
  // ZOOM
  // ==========================================================

  zoomControls: {

    position: 'absolute',

    right: 16,

    bottom: 168,

    width: 48,

    backgroundColor: '#FFFFFF',

    borderRadius: 14,

    overflow: 'hidden',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.17,

    shadowRadius: 7,

    elevation: 8,

    zIndex: 200,
  },

  zoomButton: {

    width: 48,
    height: 48,

    justifyContent: 'center',
    alignItems: 'center',
  },

  zoomDivider: {

    height: 1,

    backgroundColor: '#E5E7EB',

    marginHorizontal: 8,
  },

  // ==========================================================
  // GPS
  // ==========================================================

  gpsButton: {

    position: 'absolute',

    left: 16,

    bottom: 162,

    width: 50,
    height: 50,

    borderRadius: 25,

    backgroundColor: '#FFFFFF',

    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.18,

    shadowRadius: 7,

    elevation: 8,

    zIndex: 200,
  },

  // ==========================================================
  // CENTER
  // ==========================================================

  centerButton: {

    position: 'absolute',

    right: 16,

    bottom: 106,

    width: 50,
    height: 50,

    borderRadius: 25,

    backgroundColor: '#FFFFFF',

    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.18,

    shadowRadius: 7,

    elevation: 8,

    zIndex: 200,
  },

  // ==========================================================
  // BOTTOM PANEL
  // ==========================================================

  bottomPanel: {

    backgroundColor: '#FFFFFF',

    paddingHorizontal: 14,

    paddingTop: 10,

    paddingBottom:
      Platform.OS === 'ios'
        ? 24
        : 14,

    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: -3,
    },

    shadowOpacity: 0.08,

    shadowRadius: 8,

    elevation: 12,

    zIndex: 100,
  },

  instruction: {

    marginBottom: 8,

    fontSize:
      FONT_SIZES?.xs ||
      11,

    color: '#6B7280',

    textAlign: 'center',
  },

  // ==========================================================
  // ADDRESS
  // ==========================================================

  addressCard: {

    minHeight: 70,

    flexDirection: 'row',

    alignItems: 'center',

    padding: 10,

    backgroundColor: '#F9FAFB',

    borderRadius: 15,

    borderWidth: 1,

    borderColor: '#E5E7EB',
  },

  addressIconContainer: {

    width: 42,
    height: 42,

    borderRadius: 21,

    justifyContent: 'center',
    alignItems: 'center',

    backgroundColor: '#EFF6FF',

    marginLeft: 10,
  },

  addressContent: {

    flex: 1,

    alignItems: 'flex-end',
  },

  addressLabel: {

    fontSize:
      FONT_SIZES?.xs ||
      11,

    color: '#6B7280',

    marginBottom: 3,

    textAlign: 'right',
  },

  addressText: {

    width: '100%',

    color: '#111827',

    fontSize:
      FONT_SIZES?.sm ||
      13,

    fontWeight: '600',

    lineHeight: 19,

    textAlign: 'right',
  },

  addressLoading: {

    flexDirection: 'row',

    alignItems: 'center',
  },

  addressLoadingText: {

    marginLeft: 7,

    color: '#6B7280',

    fontSize:
      FONT_SIZES?.xs ||
      11,
  },

  // ==========================================================
  // COORDINATES
  // ==========================================================

  coordinatesRow: {

    flexDirection: 'row',

    gap: 8,

    marginTop: 8,
  },

  coordinateBox: {

    flex: 1,

    paddingHorizontal: 10,

    paddingVertical: 8,

    backgroundColor: '#F9FAFB',

    borderRadius: 12,

    borderWidth: 1,

    borderColor: '#E5E7EB',
  },

  coordinateLabel: {

    color: '#6B7280',

    fontSize: 10,

    textAlign: 'center',
  },

  coordinateValue: {

    marginTop: 2,

    color: '#111827',

    fontSize: 12,

    fontWeight: '800',

    textAlign: 'center',
  },

  // ==========================================================
  // ACCURACY
  // ==========================================================

  accuracyText: {

    marginTop: 5,

    color: '#6B7280',

    fontSize: 10,

    textAlign: 'center',
  },

  // ==========================================================
  // CONFIRM
  // ==========================================================

  confirmButton: {

    height: 52,

    marginTop: 9,

    borderRadius: 15,

    backgroundColor:
      COLORS?.primary ||
      '#2563EB',

    flexDirection: 'row',

    justifyContent: 'center',
    alignItems: 'center',

    gap: 8,
  },

  confirmButtonDisabled: {

    backgroundColor: '#9CA3AF',
  },

  confirmButtonText: {

    color: '#FFFFFF',

    fontSize:
      FONT_SIZES?.md ||
      15,

    fontWeight: '800',
  },

});