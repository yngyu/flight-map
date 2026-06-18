import type { ReactElement } from "react";
import { useEffect, useMemo, useRef } from "react";
import {
  AmbientLight,
  DirectionalLight,
  Group,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Flight } from "../lib/flights";
import {
  createAtmosphereMesh,
  createEarthMesh,
  createMapLineMesh,
  createRouteMeshes,
  createStars,
  latLonToVector3,
} from "../lib/globe";

interface GlobeViewProps {
  readonly flights: readonly Flight[];
  readonly selectedAirline: string;
  readonly selectedYear: string;
  readonly onHoverFlight: (flight: Flight | null) => void;
}

interface PointerState {
  readonly x: number;
  readonly y: number;
}

interface InitialGlobeView {
  readonly cameraPosition: Vector3;
  readonly globeQuaternion: Quaternion;
}

export default function GlobeView({
  flights,
  selectedAirline,
  selectedYear,
  onHoverFlight,
}: GlobeViewProps): ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<PointerState | null>(null);

  const visibleFlights = useMemo(() => {
    return flights.filter((flight) => {
      const matchesAirline = selectedAirline === "All" || flight.airline === selectedAirline;
      const matchesYear = selectedYear === "All" || flight.year === selectedYear;

      return matchesAirline && matchesYear;
    });
  }, [flights, selectedAirline, selectedYear]);

  useEffect(() => {
    const container = containerRef.current;

    if (container === null) {
      return undefined;
    }

    const scene = new Scene();
    const initialGlobeView = calculateInitialGlobeView(flights);
    const camera = new PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.copy(initialGlobeView.cameraPosition);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.045;
    controls.rotateSpeed = 0.46;
    controls.minDistance = 3.25;
    controls.maxDistance = 9;
    controls.autoRotate = false;

    const globeGroup = new Group();
    globeGroup.quaternion.copy(initialGlobeView.globeQuaternion);
    globeGroup.add(createEarthMesh());
    const mapLineMesh = createMapLineMesh();
    globeGroup.add(mapLineMesh);
    globeGroup.add(createAtmosphereMesh());

    const routeObjects = visibleFlights.map((flight) => {
      const routeMeshes = createRouteMeshes(flight);
      routeMeshes.line.userData = { flight };
      routeMeshes.glow.userData = { flight };
      globeGroup.add(routeMeshes.line);
      globeGroup.add(routeMeshes.glow);
      globeGroup.add(routeMeshes.traveler);
      globeGroup.add(routeMeshes.startMarker);
      globeGroup.add(routeMeshes.destinationMarker);

      return routeMeshes;
    });

    scene.add(globeGroup);
    scene.add(createStars());
    scene.add(new AmbientLight("#88d8ff", 1.1));

    const keyLight = new DirectionalLight("#9ad7ff", 2.2);
    keyLight.position.set(-4, 3, 5);
    scene.add(keyLight);

    const raycaster = new Raycaster();
    let animationFrameId = 0;
    let lastHoveredFlightId = "";

    const onResize = (): void => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    const renderFrame = (): void => {
      animationFrameId = window.requestAnimationFrame(renderFrame);
      controls.update();

      routeObjects.forEach((routeObject, index) => {
        const pulse = 0.68 + Math.sin(performance.now() * 0.002 + index * 0.45) * 0.24;
        routeObject.startMarker.material.opacity = pulse;
        const elapsedSeconds = performance.now() / 1000 + routeObject.travelOffsetSeconds;
        const progress =
          (elapsedSeconds % routeObject.travelDurationSeconds) / routeObject.travelDurationSeconds;
        routeObject.traveler.position.copy(routeObject.curve.getPointAt(progress));
      });

      const pointer = pointerRef.current;

      if (pointer !== null) {
        const normalizedPointer = new Vector2(
          (pointer.x / container.clientWidth) * 2 - 1,
          -(pointer.y / container.clientHeight) * 2 + 1,
        );
        raycaster.setFromCamera(normalizedPointer, camera);
        const intersections = raycaster.intersectObjects(
          routeObjects.flatMap((routeObject) => [routeObject.line, routeObject.glow]),
          false,
        );
        const firstFlight = intersections[0]?.object.userData.flight;

        if (isFlight(firstFlight)) {
          if (firstFlight.id !== lastHoveredFlightId) {
            lastHoveredFlightId = firstFlight.id;
            onHoverFlight(firstFlight);
          }
        } else {
          if (lastHoveredFlightId !== "") {
            lastHoveredFlightId = "";
            onHoverFlight(null);
          }
        }
      }

      renderer.render(scene, camera);
    };

    window.addEventListener("resize", onResize);
    renderFrame();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      mapLineMesh.geometry.dispose();
      mapLineMesh.material.dispose();
      routeObjects.forEach((routeObject) => {
        routeObject.line.geometry.dispose();
        routeObject.glow.geometry.dispose();
        routeObject.traveler.geometry.dispose();
        routeObject.traveler.material.dispose();
        routeObject.startMarker.material.dispose();
        routeObject.destinationMarker.material.dispose();
      });
    };
  }, [flights, onHoverFlight, visibleFlights]);

  return (
    <div
      ref={containerRef}
      className="globe-canvas"
      onPointerLeave={() => {
        pointerRef.current = null;
        onHoverFlight(null);
      }}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        pointerRef.current = {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        };
      }}
    />
  );
}

function isFlight(value: unknown): value is Flight {
  return typeof value === "object" && value !== null && "start" in value && "destination" in value;
}

function calculateInitialGlobeView(flights: readonly Flight[]): InitialGlobeView {
  const centroid = calculateAirportCentroid(flights);
  const fallbackCameraPosition = new Vector3(0, 1.1, 6.3);

  if (centroid === null) {
    return {
      cameraPosition: fallbackCameraPosition,
      globeQuaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 2.25),
    };
  }

  const cameraPosition = calculateCentroidCameraPosition(centroid, fallbackCameraPosition.length());

  return {
    cameraPosition,
    globeQuaternion: calculateInitialGlobeQuaternion(centroid, cameraPosition),
  };
}

function calculateInitialGlobeQuaternion(centroid: Vector3, cameraPosition: Vector3): Quaternion {
  const centroidDirection = new Vector3(centroid.x, 0, centroid.z);
  const cameraDirection = new Vector3(cameraPosition.x, 0, cameraPosition.z);

  if (centroidDirection.lengthSq() < 0.000001 || cameraDirection.lengthSq() < 0.000001) {
    return new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 2.25);
  }

  return new Quaternion().setFromUnitVectors(
    centroidDirection.normalize(),
    cameraDirection.normalize(),
  );
}

function calculateCentroidCameraPosition(centroid: Vector3, cameraDistance: number): Vector3 {
  const horizontalLength = Math.sqrt(Math.max(0, 1 - centroid.y * centroid.y));

  return new Vector3(0, centroid.y * cameraDistance, horizontalLength * cameraDistance);
}

function calculateAirportCentroid(flights: readonly Flight[]): Vector3 | null {
  const centroid = new Vector3();

  flights.forEach((flight) => {
    centroid.add(latLonToVector3(flight.start.lat, flight.start.lon, 1).normalize());
    centroid.add(latLonToVector3(flight.destination.lat, flight.destination.lon, 1).normalize());
  });

  if (centroid.lengthSq() < 0.000001) {
    return null;
  }

  return centroid.normalize();
}
