import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Clock, ExternalLink } from 'lucide-react';

// Fix default icon issue in some build setups (Vite-friendly URL resolution)
const markerIcon2x = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href;
const markerIcon = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href;
const markerShadow = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href;

try { delete (L.Icon.Default.prototype as any)._getIconUrl; } catch {}
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

type Branch = typeof branches[number];

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  const pointsKey = points.map(p => `${p.lat},${p.lng}`).join('|');

  useEffect(() => {
    if (!points || !points.length) return;
    try {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } catch {}
  }, [pointsKey, map]);

  return null;
}

function FlyToBranch({ active }: { active: Branch | null }) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;
    try {
      map.flyTo([active.lat, active.lng], 14, { duration: 0.8 });
    } catch {}
  }, [active, map]);

  return null;
}

export default function BranchesPage() {
  const { t } = useTranslation();

  const regions = useMemo(() => {
    const set = new Set(branches.map(b => b.region));
    return [t('all'), ...Array.from(set)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeRegion, setActiveRegion] = useState<string>(t('all'));
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);

  const filtered = useMemo(() => {
    const list = (activeRegion === t('all'))
      ? branches
      : branches.filter(b => b.region === activeRegion);

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRegion]);

  useEffect(() => {
    setActiveBranch(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRegion]);

  const openInMapUrl = (b: Branch) => `https://www.google.com/maps?q=${b.lat},${b.lng}`;
  const directionsUrl = (b: Branch) => `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{t('branchesPage.title')}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('branchesPage.subtitle') || 'Choose a branch and open it on the map.'}
          </p>
        </div>
      </div>

      {/* Region pills */}
      <div className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {regions.map(r => {
            const active = activeRegion === r;
            return (
              <button
                key={r}
                onClick={() => setActiveRegion(r)}
                className={[
                  'whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition border',
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                ].join(' ')}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl shadow-sm border mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">
            {activeBranch ? activeBranch.name : (t('branchesPage.mapTitle') || 'Branches Map')}
          </div>

          {activeBranch && (
            <a
              href={openInMapUrl(activeBranch)}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              {t('openInMap')}
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        <div className="h-[320px] sm:h-[380px] md:h-[420px]">
          <MapContainer center={[40.4, 49.8]} zoom={10} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <FitBounds points={filtered} />
            <FlyToBranch active={activeBranch} />

            {filtered.map(b => (
              <Marker key={b.id} position={[Number(b.lat), Number(b.lng)]}>
                <Popup>
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-sm">{b.address}</div>
                  <div className="text-sm mt-1">{t('branchesPage.hours')}: {b.hours}</div>

                  <div className="mt-2 flex gap-2">
                    <a
                      href={openInMapUrl(b)}
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

      {/* Branch cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(b => {
          const isActive = activeBranch?.id === b.id;

          return (
            <button
              key={b.id}
              onClick={() => setActiveBranch(b)}
              className={[
                'text-left bg-white rounded-2xl border p-4 transition shadow-sm hover:shadow-md',
                isActive ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">{b.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{b.region}</div>
                </div>

                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  <Clock size={14} />
                  {b.hours}
                </span>
              </div>

              <div className="mt-3 flex items-start gap-2 text-sm text-gray-700">
                <MapPin size={16} className="mt-[2px] text-gray-500" />
                <span className="line-clamp-2">{b.address}</span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <a
                  href={openInMapUrl(b)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {t('openInMap')}
                  <ExternalLink size={14} />
                </a>

              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
