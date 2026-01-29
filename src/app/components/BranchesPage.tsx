import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon issue in some build setups (use Vite-friendly URL resolution)
const markerIcon2x = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href;
const markerIcon = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href;
const markerShadow = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href;

// remove any existing _getIconUrl to avoid conflicts, then set merged options
try { delete (L.Icon.Default.prototype as any)._getIconUrl; } catch (e) {}
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export const branches = [
  {
    id: '28may',
    name: '28 May',
    region: 'Bakı',
    address: 'Azadlıq prospekti 54, (28 May m/st 2ci çıxışı)',
    hours: '10:00–20:00',
    lat: 40.3792056,
    lng: 49.8481658,
  },
  {
    id: 'xalqlar',
    name: 'Xalqlar Dostluğu',
    region: 'Bakı',
    address: '9 Bəhruz Nuriyev, Bakı 1119',
    hours: '10:00–20:00',
    lat: 40.3977308,
    lng: 49.9443103,
  },
  {
    id: 'sumqayit',
    name: 'Sumqayıt',
    region: 'Sumqayıt',
    address: 'Heydər Əliyev 11',
    hours: '10:00–20:00',
    lat: 40.596621,
    lng: 49.663531,
  },
  {
    id: 'gence',
    name: 'Gəncə',
    region: 'Gəncə',
    address: 'Pərviz Səmədov 60b',
    hours: '10:00–20:00',
    lat: 40.6769025,
    lng: 46.3460462,
  },
];

export default function BranchesPage() {
  const { t } = useTranslation();
  const regions = useMemo(() => {
    const set = new Set(branches.map(b => b.region));
    return [t('all'), ...Array.from(set)];
  }, []);

  const [activeRegion, setActiveRegion] = useState<string>(t('all'));
  const filtered = useMemo(() => (activeRegion === t('all') ? branches : branches.filter(b => b.region === activeRegion)), [activeRegion]);
  // view is controlled by FitBounds only to avoid double-updates

  function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
    const map = useMap();
    const pointsKey = points.map(p => `${p.lat},${p.lng}`).join('|');

    useEffect(() => {
      if (!points || !points.length) return;
      try {
        const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      } catch (e) {}
    }, [pointsKey, map]);
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">{t('branchesPage.title')}</h2>

      <div className="bg-white rounded shadow mb-6 p-4">
        <div style={{ height: 420 }}>
          <MapContainer
            center={[40.4, 49.8]}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <FitBounds points={filtered} />

            {filtered.map(b => (
              <Marker key={b.id} position={[Number(b.lat), Number(b.lng)]}>
                <Popup>
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-sm">{b.address}</div>
                  <div className="mt-2">
                    <a
                      href={`https://www.google.com/maps?q=${b.lat},${b.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 text-sm underline"
                    >
                      {t('openInMap')}
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex gap-2">
          {regions.map(r => (
            <button
              key={r}
              onClick={() => setActiveRegion(r)}
              className={`px-3 py-1 rounded ${activeRegion === r ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map(b => (
          <div key={b.id} className="bg-white rounded border p-4">
            <div className="font-semibold mb-1">{b.name}</div>
            <div className="text-sm text-gray-600 mb-2">{b.address}</div>
            <div className="text-sm text-green-600">{t('branchesPage.hours')}: {b.hours}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
