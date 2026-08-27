import { MapPin, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type WheelEvent,
} from "react";
import {
  clampVerticalPosition,
  clientToMapPoint,
  countries,
  countryLabel,
  countryLabelPoint,
  countryName,
  initialTransform,
  mapCopyOffsets,
  mapHeight,
  mapPath,
  mapWidth,
  maximumScale,
  minimumScale,
  wrapHorizontalPosition,
  type CountryFeature,
  type MapPoint,
  type MapTransform,
} from "./visitedMapData";

interface VisitedMapCanvasProps {
  readonly visitedCountries: readonly CountryFeature[];
}

interface WorldMapProps extends VisitedMapCanvasProps {
  readonly glowFilterId: string;
  readonly mapTransform: MapTransform;
  readonly visitedIds: ReadonlySet<string>;
  readonly onWheel: (event: WheelEvent<SVGSVGElement>) => void;
  readonly onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
  readonly onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  readonly onPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => void;
}

interface WorldMapCopyProps extends VisitedMapCanvasProps {
  readonly copyOffset: number;
  readonly glowFilterId: string;
  readonly scale: number;
  readonly visitedIds: ReadonlySet<string>;
}

interface CountryShapesProps {
  readonly glowFilterId: string;
  readonly visitedIds: ReadonlySet<string>;
}

interface CountryLabelsProps extends VisitedMapCanvasProps {
  readonly scale: number;
}

interface MapZoomControlsProps {
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onReset: () => void;
}

export default function VisitedMapCanvas({
  visitedCountries,
}: VisitedMapCanvasProps): ReactElement {
  const glowFilterId = `country-glow-${useId().replaceAll(":", "")}`;
  const [mapTransform, setMapTransform] = useState<MapTransform>(initialTransform);
  const dragPoint = useRef<MapPoint | null>(null);
  const visitedIds = useMemo(
    () => new Set(visitedCountries.map((country) => String(country.id))),
    [visitedCountries],
  );

  const zoomAt = useCallback((factor: number, point: MapPoint) => {
    setMapTransform((current) => zoomTransform(current, factor, point));
  }, []);

  const zoomFromCenter = useCallback((factor: number) => {
    zoomAt(factor, { x: mapWidth / 2, y: mapHeight / 2 });
  }, [zoomAt]);

  const handleWheel = useCallback(
    (event: WheelEvent<SVGSVGElement>) => {
      event.preventDefault();
      const point = clientToMapPoint(event.currentTarget, event.clientX, event.clientY);
      zoomAt(Math.exp(-event.deltaY * 0.0015), point);
    },
    [zoomAt],
  );

  const handlePointerDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragPoint.current = clientToMapPoint(event.currentTarget, event.clientX, event.clientY);
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragPoint.current === null) {
      return;
    }

    const nextPoint = clientToMapPoint(event.currentTarget, event.clientX, event.clientY);
    const deltaX = nextPoint.x - dragPoint.current.x;
    const deltaY = nextPoint.y - dragPoint.current.y;
    dragPoint.current = nextPoint;
    setMapTransform((current) => panTransform(current, deltaX, deltaY));
  }, []);

  const handlePointerUp = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    dragPoint.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <div className="visited-map-frame">
      <WorldMap
        glowFilterId={glowFilterId}
        mapTransform={mapTransform}
        visitedCountries={visitedCountries}
        visitedIds={visitedIds}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <MapZoomControls
        onZoomIn={() => zoomFromCenter(1.5)}
        onZoomOut={() => zoomFromCenter(1 / 1.5)}
        onReset={() => setMapTransform(initialTransform)}
      />
      <div className="map-navigation-hint">Drag to move · Scroll to zoom</div>
      {visitedCountries.length === 0 ? <EmptyMapMessage /> : null}
    </div>
  );
}

function WorldMap({
  glowFilterId,
  mapTransform,
  visitedCountries,
  visitedIds,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: WorldMapProps): ReactElement {
  return (
    <svg
      className="visited-map"
      viewBox={`0 0 ${mapWidth} ${mapHeight}`}
      role="img"
      aria-label={`Dark world map showing ${visitedCountries.length} visited countries`}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <MapGlowFilter id={glowFilterId} />
      <g
        transform={`translate(${mapTransform.x} ${mapTransform.y}) scale(${mapTransform.scale})`}
      >
        {mapCopyOffsets.map((copyOffset) => (
          <WorldMapCopy
            key={copyOffset}
            copyOffset={copyOffset}
            glowFilterId={glowFilterId}
            scale={mapTransform.scale}
            visitedCountries={visitedCountries}
            visitedIds={visitedIds}
          />
        ))}
      </g>
    </svg>
  );
}

function MapGlowFilter({ id }: { readonly id: string }): ReactElement {
  return (
    <defs>
      <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

function WorldMapCopy({
  copyOffset,
  glowFilterId,
  scale,
  visitedCountries,
  visitedIds,
}: WorldMapCopyProps): ReactElement {
  return (
    <g transform={`translate(${copyOffset} 0)`}>
      <CountryShapes glowFilterId={glowFilterId} visitedIds={visitedIds} />
      <CountryLabels scale={scale} visitedCountries={visitedCountries} />
    </g>
  );
}

function CountryShapes({ glowFilterId, visitedIds }: CountryShapesProps): ReactElement {
  return (
    <g className="country-shapes">
      {countries.map((country) => {
        const id = String(country.id);
        const name = countryName(country);
        const isVisited = visitedIds.has(id);

        return (
          <path
            key={id}
            d={mapPath(country) ?? undefined}
            className={isVisited ? "country visited" : "country"}
            style={isVisited ? { filter: `url(#${glowFilterId})` } : undefined}
          >
            <title>
              {name}
              {isVisited ? " — visited" : ""}
            </title>
          </path>
        );
      })}
    </g>
  );
}

function CountryLabels({ scale, visitedCountries }: CountryLabelsProps): ReactElement {
  return (
    <g className="country-labels">
      {visitedCountries.map((country) => {
        const name = countryName(country);
        const [x, y] = countryLabelPoint(country, name);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return null;
        }

        return (
          <g
            key={String(country.id)}
            transform={`translate(${x} ${y}) scale(${1 / scale})`}
          >
            <text className="country-label">{countryLabel(name)}</text>
          </g>
        );
      })}
    </g>
  );
}

function MapZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
}: MapZoomControlsProps): ReactElement {
  return (
    <div className="map-zoom-controls" aria-label="Map zoom controls">
      <button type="button" onClick={onZoomIn} aria-label="Zoom in">
        <ZoomIn size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={onZoomOut} aria-label="Zoom out">
        <ZoomOut size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={onReset} aria-label="Reset map view">
        <RotateCcw size={17} aria-hidden="true" />
      </button>
    </div>
  );
}

function EmptyMapMessage(): ReactElement {
  return (
    <div className="visited-map-empty">
      <MapPin size={20} aria-hidden="true" />
      <span>No visited countries found in the loaded CSV.</span>
    </div>
  );
}

function zoomTransform(current: MapTransform, factor: number, point: MapPoint): MapTransform {
  const scale = Math.min(maximumScale, Math.max(minimumScale, current.scale * factor));

  if (scale === minimumScale) {
    return initialTransform;
  }

  const ratio = scale / current.scale;

  return {
    scale,
    x: wrapHorizontalPosition(point.x - (point.x - current.x) * ratio, scale),
    y: clampVerticalPosition(point.y - (point.y - current.y) * ratio, scale),
  };
}

function panTransform(current: MapTransform, deltaX: number, deltaY: number): MapTransform {
  if (current.scale === minimumScale) {
    return {
      ...current,
      x: wrapHorizontalPosition(current.x + deltaX, current.scale),
      y: initialTransform.y,
    };
  }

  return {
    ...current,
    x: wrapHorizontalPosition(current.x + deltaX, current.scale),
    y: clampVerticalPosition(current.y + deltaY, current.scale),
  };
}
