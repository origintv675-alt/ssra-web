import type * as THREE from "three";
import { useEffect, useRef } from "react";

/**
 * Continuous, fully automated 3D space scene. It runs on its own clock and never
 * stops: planets complete full revolutions around the sun, satellites orbit
 * those planets, an asteroid belt and loose debris wander, rockets launch from a
 * planet and cross the view, eclipses flare, solar storms sweep past, distant
 * constellations drift, supernovas flash and a black hole fires gamma-ray bursts.
 */
export function CosmicScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const THREE = await import("three");
      if (disposed || !mountRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        52,
        window.innerWidth / Math.max(1, window.innerHeight),
        0.1,
        4000,
      );
      camera.position.set(0, 46, 132);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.domElement.style.display = "block";
      mountRef.current.appendChild(renderer.domElement);

      // Viewed from the outermost planet: everything is distant and faint.
      scene.add(new THREE.AmbientLight(0x2b3765, 0.35));
      const sunLight = new THREE.PointLight(0xffd9a0, 1.5, 900, 1.6);
      scene.add(sunLight);

      // ---- Sun ------------------------------------------------------------
      const sun = new THREE.Mesh(
        new THREE.SphereGeometry(9, 48, 48),
        new THREE.MeshBasicMaterial({ color: 0xffcf7a, transparent: true, opacity: 0.5 }),
      );
      scene.add(sun);
      const corona = new THREE.Mesh(
        new THREE.SphereGeometry(15, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xff9d4d, transparent: true, opacity: 0.09 }),
      );
      scene.add(corona);

      // ---- Planets, auroras, satellites -----------------------------------
      type Planet = {
        pivot: THREE.Object3D;
        mesh: THREE.Mesh;
        aurora?: THREE.Mesh;
        speed: number;
        spin: number;
        sats: Array<{ pivot: THREE.Object3D; speed: number }>;
      };
      const planets: Planet[] = [];
      const defs = [
        { r: 2.2, d: 24, c: 0x7fd4ff, sats: 0, aurora: false, tilt: 0.1 },
        { r: 3.4, d: 38, c: 0xff7fc4, sats: 1, aurora: true, tilt: -0.18 },
        { r: 2.8, d: 54, c: 0x9fb6ff, sats: 2, aurora: true, tilt: 0.24 },
        { r: 5.2, d: 76, c: 0xffc48a, sats: 3, aurora: false, tilt: -0.1 },
        { r: 3.9, d: 98, c: 0x8affe0, sats: 2, aurora: true, tilt: 0.3 },
      ];
      for (const def of defs) {
        const pivot = new THREE.Object3D();
        pivot.rotation.x = def.tilt;
        scene.add(pivot);
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(def.r, 36, 36),
          new THREE.MeshStandardMaterial({
            color: def.c,
            roughness: 0.8,
            metalness: 0.15,
            transparent: true,
            opacity: 0.42,
          }),
        );
        mesh.position.x = def.d;
        pivot.add(mesh);

        // faint orbit ring
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(def.d - 0.08, def.d + 0.08, 160),
          new THREE.MeshBasicMaterial({
            color: 0x6ea8ff,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide,
          }),
        );
        ring.rotation.x = Math.PI / 2;
        pivot.add(ring);

        let aurora: THREE.Mesh | undefined;
        if (def.aurora) {
          aurora = new THREE.Mesh(
            new THREE.TorusGeometry(def.r * 1.06, def.r * 0.14, 12, 60),
            new THREE.MeshBasicMaterial({ color: 0x62ffc4, transparent: true, opacity: 0.2 }),
          );
          aurora.rotation.x = Math.PI / 2.4;
          mesh.add(aurora);
        }

        const sats: Planet["sats"] = [];
        for (let s = 0; s < def.sats; s += 1) {
          const sp = new THREE.Object3D();
          sp.rotation.x = Math.random() * 1.2 - 0.6;
          const moon = new THREE.Mesh(
            new THREE.SphereGeometry(def.r * 0.22, 16, 16),
            new THREE.MeshStandardMaterial({
              color: 0xdfe8ff,
              roughness: 0.9,
              transparent: true,
              opacity: 0.4,
            }),
          );
          moon.position.x = def.r * (2.1 + s * 0.7);
          sp.add(moon);
          mesh.add(sp);
          sats.push({ pivot: sp, speed: 0.9 + Math.random() * 1.4 });
        }

        planets.push({
          pivot,
          mesh,
          ...(aurora ? { aurora } : {}),
          speed: 0.34 / Math.sqrt(def.d / 20),
          spin: 0.4 + Math.random() * 0.6,
          sats,
        });
      }

      // ---- Asteroid belt ---------------------------------------------------
      const beltPivot = new THREE.Object3D();
      scene.add(beltPivot);
      const beltCount = 1200;
      const beltPos = new Float32Array(beltCount * 3);
      for (let i = 0; i < beltCount; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const rad = 118 + Math.random() * 26;
        beltPos[i * 3] = Math.cos(a) * rad;
        beltPos[i * 3 + 1] = (Math.random() - 0.5) * 6;
        beltPos[i * 3 + 2] = Math.sin(a) * rad;
      }
      const beltGeo = new THREE.BufferGeometry();
      beltGeo.setAttribute("position", new THREE.BufferAttribute(beltPos, 3));
      const belt = new THREE.Points(
        beltGeo,
        new THREE.PointsMaterial({ color: 0xc9d6ff, size: 0.8, transparent: true, opacity: 0.3 }),
      );
      beltPivot.add(belt);

      // ---- Floating debris -------------------------------------------------
      const debris: THREE.Mesh[] = [];
      for (let i = 0; i < 26; i += 1) {
        const d = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.5 + Math.random() * 1.1, 0),
          new THREE.MeshStandardMaterial({
            color: 0x9fb0d8,
            roughness: 1,
            transparent: true,
            opacity: 0.35,
          }),
        );
        d.position.set(
          (Math.random() - 0.5) * 240,
          (Math.random() - 0.5) * 90,
          (Math.random() - 0.5) * 200,
        );
        scene.add(d);
        debris.push(d);
      }

      // ---- Distant constellations -----------------------------------------
      const farCount = 900;
      const farPos = new Float32Array(farCount * 3);
      for (let i = 0; i < farCount; i += 1) {
        farPos[i * 3] = (Math.random() - 0.5) * 1800;
        farPos[i * 3 + 1] = (Math.random() - 0.5) * 900;
        farPos[i * 3 + 2] = -600 - Math.random() * 900;
      }
      const farGeo = new THREE.BufferGeometry();
      farGeo.setAttribute("position", new THREE.BufferAttribute(farPos, 3));
      const farStars = new THREE.Points(
        farGeo,
        new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0.6 }),
      );
      scene.add(farStars);

      // ---- Rocket ----------------------------------------------------------
      const rocket = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.9, 3.4, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xf2f7ff, roughness: 0.35, metalness: 0.5 }),
      );
      rocket.add(body);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 3.2, 16),
        new THREE.MeshBasicMaterial({ color: 0x7fe6ff, transparent: true, opacity: 0.85 }),
      );
      flame.position.y = -3.4;
      flame.rotation.x = Math.PI;
      rocket.add(flame);
      rocket.visible = false;
      scene.add(rocket);
      let rocketT = -1;
      let rocketDelay = 4;

      // ---- Eclipse flare ---------------------------------------------------
      const flare = new THREE.Mesh(
        new THREE.PlaneGeometry(420, 420),
        new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0 }),
      );
      flare.position.set(0, 0, -40);
      scene.add(flare);
      let eclipseT = -1;
      let eclipseDelay = 12;
      let eclipseSolar = true;

      // ---- Solar storm -----------------------------------------------------
      const stormCount = 500;
      const stormPos = new Float32Array(stormCount * 3);
      for (let i = 0; i < stormCount; i += 1) {
        stormPos[i * 3] = -220 + Math.random() * 40;
        stormPos[i * 3 + 1] = (Math.random() - 0.5) * 70;
        stormPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
      }
      const stormGeo = new THREE.BufferGeometry();
      stormGeo.setAttribute("position", new THREE.BufferAttribute(stormPos, 3));
      const storm = new THREE.Points(
        stormGeo,
        new THREE.PointsMaterial({ color: 0xffb36b, size: 1.6, transparent: true, opacity: 0 }),
      );
      scene.add(storm);
      let stormT = -1;
      let stormDelay = 9;

      // ---- Supernova -------------------------------------------------------
      const nova = new THREE.Mesh(
        new THREE.SphereGeometry(1, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0 }),
      );
      scene.add(nova);
      let novaT = -1;
      let novaDelay = 16;

      // ---- Black hole + gamma-ray bursts ----------------------------------
      const holeGroup = new THREE.Group();
      holeGroup.position.set(-140, 34, -160);
      scene.add(holeGroup);
      const hole = new THREE.Mesh(
        new THREE.SphereGeometry(6, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x05070f }),
      );
      holeGroup.add(hole);
      const disk = new THREE.Mesh(
        new THREE.RingGeometry(7, 14, 96),
        new THREE.MeshBasicMaterial({
          color: 0xff8ad8,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
        }),
      );
      disk.rotation.x = Math.PI / 2.6;
      holeGroup.add(disk);
      const jetMat = new THREE.MeshBasicMaterial({
        color: 0xbde9ff,
        transparent: true,
        opacity: 0,
      });
      const jetA = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 2.4, 90, 12, 1, true), jetMat);
      jetA.position.y = 46;
      const jetB = jetA.clone();
      jetB.position.y = -46;
      holeGroup.add(jetA, jetB);
      let gammaT = -1;
      let gammaDelay = 11;

      // ---- Daylight terminator cycle --------------------------------------
      const daylight = new THREE.DirectionalLight(0xbcd6ff, 0.22);
      scene.add(daylight);

      const onResize = () => {
        camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", onResize);

      const clock = new THREE.Clock();
      let raf = 0;
      let magnetTick = 0;
      const magnetVec = new THREE.Vector3();

      const frame = () => {
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        sun.rotation.y += dt * 0.1;
        corona.scale.setScalar(1 + Math.sin(t * 1.3) * 0.04);
        (corona.material as THREE.MeshBasicMaterial).opacity = 0.07 + Math.sin(t * 0.9) * 0.025;

        for (const p of planets) {
          p.pivot.rotation.y += dt * p.speed;
          p.mesh.rotation.y += dt * p.spin;
          if (p.aurora) {
            p.aurora.rotation.z += dt * 0.8;
            (p.aurora.material as THREE.MeshBasicMaterial).opacity =
              0.12 + Math.abs(Math.sin(t * 1.1)) * 0.18;
          }
          for (const s of p.sats) s.pivot.rotation.y += dt * s.speed;
        }

        beltPivot.rotation.y += dt * 0.045;
        farStars.rotation.y += dt * 0.004;
        farStars.rotation.x = Math.sin(t * 0.05) * 0.03;

        for (let i = 0; i < debris.length; i += 1) {
          const d = debris[i]!;
          d.rotation.x += dt * 0.4;
          d.rotation.y += dt * 0.3;
          d.position.x += dt * (2 + (i % 5));
          d.position.y += Math.sin(t + i) * dt * 1.4;
          if (d.position.x > 130) d.position.x = -130;
        }

        // rocket launch cycle
        if (rocketT < 0) {
          rocketDelay -= dt;
          if (rocketDelay <= 0) {
            rocketT = 0;
            rocket.visible = true;
            const origin = planets[2]!.mesh.getWorldPosition(new THREE.Vector3());
            rocket.position.copy(origin);
            rocket.userData["origin"] = origin.clone();
            rocket.userData["dir"] = new THREE.Vector3(
              (Math.random() - 0.5) * 0.7,
              1,
              0.35 + Math.random() * 0.4,
            ).normalize();
          }
        } else {
          rocketT += dt;
          const dir = rocket.userData["dir"] as THREE.Vector3;
          const origin = rocket.userData["origin"] as THREE.Vector3;
          const dist = rocketT * rocketT * 9;
          rocket.position.copy(origin).addScaledVector(dir, dist);
          rocket.lookAt(rocket.position.clone().add(dir));
          rocket.rotateX(Math.PI / 2);
          (flame.material as THREE.MeshBasicMaterial).opacity =
            0.6 + Math.abs(Math.sin(t * 22)) * 0.4;
          if (dist > 260) {
            rocketT = -1;
            rocket.visible = false;
            rocketDelay = 7 + Math.random() * 8;
          }
        }

        // eclipse flare cycle (solar and lunar alternating)
        if (eclipseT < 0) {
          eclipseDelay -= dt;
          if (eclipseDelay <= 0) {
            eclipseT = 0;
            eclipseSolar = !eclipseSolar;
          }
        } else {
          eclipseT += dt;
          const k = Math.sin((eclipseT / 5) * Math.PI);
          const mat = flare.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.max(0, k) * (eclipseSolar ? 0.1 : 0.05);
          mat.color.set(eclipseSolar ? 0xffe6b0 : 0xff9d9d);
          sunLight.intensity = 1.5 - Math.max(0, k) * (eclipseSolar ? 1.1 : 0.5);
          if (eclipseT > 5) {
            eclipseT = -1;
            mat.opacity = 0;
            sunLight.intensity = 1.5;
            eclipseDelay = 18 + Math.random() * 16;
          }
        }

        // solar storm sweep
        if (stormT < 0) {
          stormDelay -= dt;
          if (stormDelay <= 0) stormT = 0;
        } else {
          stormT += dt;
          const arr = stormGeo.getAttribute("position") as THREE.BufferAttribute;
          for (let i = 0; i < stormCount; i += 1) {
            arr.setX(i, arr.getX(i) + dt * (60 + (i % 7) * 8));
          }
          arr.needsUpdate = true;
          (storm.material as THREE.PointsMaterial).opacity = Math.max(
            0,
            Math.sin((stormT / 6) * Math.PI) * 0.35,
          );
          if (stormT > 6) {
            stormT = -1;
            stormDelay = 16 + Math.random() * 14;
            for (let i = 0; i < stormCount; i += 1) arr.setX(i, -220 + Math.random() * 40);
            arr.needsUpdate = true;
          }
        }

        // supernova
        if (novaT < 0) {
          novaDelay -= dt;
          if (novaDelay <= 0) {
            novaT = 0;
            nova.position.set(
              (Math.random() - 0.5) * 400,
              (Math.random() - 0.4) * 200,
              -300 - Math.random() * 300,
            );
          }
        } else {
          novaT += dt;
          nova.scale.setScalar(1 + novaT * 26);
          (nova.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.45 - novaT / 4.8);
          if (novaT > 2.4) {
            novaT = -1;
            novaDelay = 22 + Math.random() * 20;
          }
        }

        // black hole + gamma-ray burst
        disk.rotation.z += dt * 0.7;
        if (gammaT < 0) {
          gammaDelay -= dt;
          if (gammaDelay <= 0) gammaT = 0;
        } else {
          gammaT += dt;
          jetMat.opacity = Math.max(0, Math.sin((gammaT / 2.2) * Math.PI) * 0.25);
          if (gammaT > 2.2) {
            gammaT = -1;
            jetMat.opacity = 0;
            gammaDelay = 14 + Math.random() * 12;
          }
        }

        // daylight terminator cycle
        daylight.position.set(Math.cos(t * 0.06) * 200, 80, Math.sin(t * 0.06) * 200);
        daylight.intensity = 0.12 + (Math.sin(t * 0.06) * 0.5 + 0.5) * 0.2;

        camera.position.x = Math.sin(t * 0.05) * 12;
        camera.position.y = 46 + Math.sin(t * 0.07) * 5;
        camera.lookAt(0, 0, 0);

        // Publish on-screen planet positions so the comet cursor can bend its
        // tail around them like a magnetic field.
        magnetTick += dt;
        if (magnetTick > 0.12) {
          magnetTick = 0;
          const halfW = window.innerWidth / 2;
          const halfH = window.innerHeight / 2;
          const out: Array<{ x: number; y: number; r: number }> = [];
          for (const p of planets) {
            const world = p.mesh.getWorldPosition(magnetVec);
            const ndc = world.clone().project(camera);
            if (ndc.z > 1) continue;
            out.push({
              x: (ndc.x + 1) * halfW,
              y: (1 - ndc.y) * halfH,
              r: Math.max(40, 160 / Math.max(0.4, ndc.z + 1)),
            });
          }
          (window as unknown as { __ssraPlanets?: typeof out }).__ssraPlanets = out;
        }

        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };

      if (reduced) {
        renderer.render(scene, camera);
      } else {
        frame();
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        renderer.domElement.remove();
        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose?.();
          const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose?.();
        });
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-35"
    />
  );
}
