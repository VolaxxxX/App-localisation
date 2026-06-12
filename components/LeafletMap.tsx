import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  emoji: string;
  color: string;
  /** Rendered semi-transparent (e.g. offline contact / sharing paused). */
  dimmed?: boolean;
  /** Draws a subtle "you" ring; also kept on top. */
  isMe?: boolean;
}

export interface LeafletMapHandle {
  centerOn: (lat: number, lng: number, zoom?: number) => void;
  fitAll: () => void;
}

interface LeafletMapProps {
  markers: MapMarker[];
  initialCenter: { lat: number; lng: number; zoom: number };
  dark?: boolean;
  onMarkerPress?: (id: string) => void;
  /** Optional breadcrumb trail to draw as a polyline. */
  path?: Array<{ lat: number; lng: number }>;
  pathColor?: string;
}

/**
 * Zero-API-key map: Leaflet + OpenStreetMap tiles rendered inside a WebView.
 * Works in Expo Go (no native map module) and on iOS + Android alike.
 *
 * Communication:
 *   RN → page  : injectJavaScript() calls window.__setMarkers / __centerOn / __fitAll
 *   page → RN  : window.ReactNativeWebView.postMessage(JSON) → onMessage
 */
export const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(
  function LeafletMap(
    { markers, initialCenter, dark, onMarkerPress, path, pathColor },
    ref,
  ) {
    const webRef = useRef<WebView>(null);
    const readyRef = useRef(false);
    const [, force] = useState(0);

    const inject = useCallback((js: string) => {
      webRef.current?.injectJavaScript(`${js}; true;`);
    }, []);

    const pushMarkers = useCallback(
      (list: MapMarker[]) => {
        if (!readyRef.current) return;
        inject(`window.__setMarkers(${JSON.stringify(list)})`);
      },
      [inject],
    );

    // Re-inject whenever the marker set changes (after the page is ready).
    const markersKey = useMemo(
      () =>
        markers
          .map((m) => `${m.id}:${m.lat.toFixed(5)}:${m.lng.toFixed(5)}:${m.emoji}:${m.color}:${m.dimmed ? 1 : 0}`)
          .join('|'),
      [markers],
    );
    const lastKey = useRef<string>('');
    if (markersKey !== lastKey.current) {
      lastKey.current = markersKey;
      pushMarkers(markers);
    }

    // Re-inject the path whenever it changes (after the page is ready).
    const pushPath = useCallback(
      (pts: Array<{ lat: number; lng: number }> | undefined, color: string) => {
        if (!readyRef.current) return;
        inject(`window.__setPath(${JSON.stringify(pts ?? [])}, ${JSON.stringify(color)})`);
      },
      [inject],
    );
    const pathKey = useMemo(
      () => `${pathColor ?? ''}#${(path ?? []).length}:${path?.[path.length - 1]?.lat ?? ''}`,
      [path, pathColor],
    );
    const lastPathKey = useRef<string>('');
    if (pathKey !== lastPathKey.current) {
      lastPathKey.current = pathKey;
      pushPath(path, pathColor ?? '#2563EB');
    }

    useImperativeHandle(
      ref,
      () => ({
        centerOn: (lat, lng, zoom) =>
          inject(`window.__centerOn(${lat}, ${lng}, ${zoom ?? 16})`),
        fitAll: () => inject('window.__fitAll()'),
      }),
      [inject],
    );

    const onMessage = useCallback(
      (e: WebViewMessageEvent) => {
        let msg: any;
        try {
          msg = JSON.parse(e.nativeEvent.data);
        } catch {
          return;
        }
        if (msg?.type === 'ready') {
          readyRef.current = true;
          pushMarkers(markers);
          pushPath(path, pathColor ?? '#2563EB');
          force((n) => n + 1);
        } else if (msg?.type === 'marker' && msg.id) {
          onMarkerPress?.(msg.id);
        }
      },
      [markers, onMarkerPress, pushMarkers, pushPath, path, pathColor],
    );

    const html = useMemo(
      () => buildHtml(initialCenter, !!dark),
      // initialCenter only matters for first render; intentionally stable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [dark],
    );

    return (
      <View style={StyleSheet.absoluteFill}>
        <WebView
          ref={webRef}
          style={styles.web}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          androidLayerType="hardware"
          // The map is interactive; let it handle its own gestures.
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: 'transparent' },
});

/** Build the self-contained Leaflet HTML document. */
function buildHtml(
  center: { lat: number; lng: number; zoom: number },
  dark: boolean,
): string {
  // Dark mode: invert the tile pane for a passable dark map (OSM has no native
  // dark tiles without a key).
  const tileFilter = dark
    ? 'filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9);'
    : '';
  const bg = dark ? '#0B1221' : '#F4F6FB';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${bg}; }
    .leaflet-tile-pane { ${tileFilter} }
    .leaflet-container { background: ${bg}; outline: none; }
    .gs-pin { display:flex; flex-direction:column; align-items:center; }
    .gs-bubble {
      width:40px; height:40px; border-radius:20px; border:3px solid #fff;
      display:flex; align-items:center; justify-content:center; font-size:20px;
      box-shadow:0 2px 4px rgba(0,0,0,.35);
    }
    .gs-me { box-shadow:0 0 0 3px rgba(37,99,235,.35), 0 2px 4px rgba(0,0,0,.35); }
    .gs-dim { opacity:.55; }
    .gs-pointer {
      width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent;
      border-top:9px solid #fff; margin-top:-2px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([${center.lat}, ${center.lng}], ${center.zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, crossOrigin: true
    }).addTo(map);
    L.control.attribution({ prefix: false })
      .addAttribution('© OpenStreetMap')
      .addTo(map);

    var layer = L.layerGroup().addTo(map);
    var pathLine = null;
    var markerIndex = {};

    function send(obj) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    }

    function pinHtml(m) {
      var cls = 'gs-bubble' + (m.isMe ? ' gs-me' : '') + (m.dimmed ? ' gs-dim' : '');
      return '<div class="gs-pin">'
        + '<div class="' + cls + '" style="background:' + m.color + '">' + (m.emoji || '📍') + '</div>'
        + '<div class="gs-pointer"></div></div>';
    }

    window.__setMarkers = function (list) {
      layer.clearLayers();
      markerIndex = {};
      (list || []).forEach(function (m) {
        var icon = L.divIcon({
          html: pinHtml(m),
          className: '',
          iconSize: [40, 49],
          iconAnchor: [20, 49]
        });
        var mk = L.marker([m.lat, m.lng], { icon: icon, zIndexOffset: m.isMe ? 1000 : 0 });
        mk.on('click', function () { send({ type: 'marker', id: m.id }); });
        mk.addTo(layer);
        markerIndex[m.id] = mk;
      });
    };

    window.__setPath = function (pts, color) {
      if (pathLine) { map.removeLayer(pathLine); pathLine = null; }
      if (!pts || pts.length < 2) return;
      var latlngs = pts.map(function (p) { return [p.lat, p.lng]; });
      pathLine = L.polyline(latlngs, {
        color: color || '#2563EB', weight: 4, opacity: 0.85, lineJoin: 'round'
      }).addTo(map);
    };

    window.__centerOn = function (lat, lng, zoom) {
      map.flyTo([lat, lng], zoom || 16, { duration: 0.45 });
    };

    window.__fitAll = function () {
      var pts = [];
      for (var id in markerIndex) { pts.push(markerIndex[id].getLatLng()); }
      if (pts.length === 0) return;
      if (pts.length === 1) { map.flyTo(pts[0], 16, { duration: 0.45 }); return; }
      map.flyToBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 17, duration: 0.45 });
    };

    // Signal readiness once Leaflet has laid out.
    map.whenReady(function () { setTimeout(function () { send({ type: 'ready' }); }, 50); });
  </script>
</body>
</html>`;
}
