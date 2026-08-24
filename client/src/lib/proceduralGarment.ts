/**
 * proceduralGarment.ts
 *
 * Procedural Dynamic 3D Garment Engine for Three.js.
 * Generates deformable 3D shirts, t-shirts, and hoodies that adapt
 * elastically to real-time MediaPipe Pose Landmarks.
 */

import * as THREE from "three";

export interface GarmentStyleOptions {
  type?: "tshirt" | "polo" | "longsleeve" | "hoodie" | "vneck";
  colorHex?: string;
  secondaryColorHex?: string;
  fitStyle?: "regular" | "oversized" | "slim";
  sleeveLength?: "short" | "three_quarter" | "long";
  roughness?: number;
  sheen?: number;
}

export interface ProceduralGarment {
  group: THREE.Group;
  torsoMesh: THREE.Mesh;
  collarMesh: THREE.Mesh;
  leftSleeveMesh: THREE.Mesh;
  rightSleeveMesh: THREE.Mesh;
  bottomHemMesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  trimMaterial: THREE.MeshStandardMaterial;
  options: GarmentStyleOptions;
  setColors: (primary: string, secondary?: string) => void;
  setFitStyle: (fit: "regular" | "oversized" | "slim") => void;
  dispose: () => void;
}

/**
 * Creates a procedural canvas texture with subtle fabric cotton weave pattern.
 */
function createProceduralFabricTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // Micro cross-hatch fabric weave
    ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }

    // Diagonal subtle knit texture
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    for (let i = -size; i < size * 2; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

/**
 * Generates an initial customizable 3D Torso BufferGeometry with ring subdivision.
 */
function createTorsoGeometry(rings = 8, segments = 16): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= rings; r++) {
    const v = r / rings;
    const y = 0.5 - v * 1.35; // From collar top (y = 0.5) to bottom hem (y = -0.85)

    // Base radius contour from chest to waist to hem
    let rx = 0.55;
    let rz = 0.32;
    if (r === 0) {
      // Collar ring opening
      rx = 0.28;
      rz = 0.22;
    } else if (r === 1) {
      // Shoulders peak
      rx = 0.62;
      rz = 0.35;
    } else if (r <= 3) {
      // Chest
      rx = 0.58;
      rz = 0.34;
    } else if (r <= 5) {
      // Waist
      rx = 0.52;
      rz = 0.30;
    } else {
      // Bottom hem
      rx = 0.54;
      rz = 0.31;
    }

    for (let s = 0; s <= segments; s++) {
      const u = s / segments;
      const theta = u * Math.PI * 2;

      const x = Math.sin(theta) * rx;
      const z = Math.cos(theta) * rz;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  // Triangulate cylindrical strips
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s;
      const b = (r + 1) * (segments + 1) + s;
      const c = (r + 1) * (segments + 1) + (s + 1);
      const d = r * (segments + 1) + (s + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

/**
 * Creates a complete Procedural 3D Garment.
 */
export function createProceduralGarment(options: GarmentStyleOptions = {}): ProceduralGarment {
  const opt: GarmentStyleOptions = {
    type: options.type || "tshirt",
    colorHex: options.colorHex || "#2563eb",
    secondaryColorHex: options.secondaryColorHex || "#1d4ed8",
    fitStyle: options.fitStyle || "regular",
    sleeveLength: options.sleeveLength || (options.type === "longsleeve" || options.type === "hoodie" ? "long" : "short"),
    roughness: options.roughness || 0.72,
    sheen: options.sheen || 0.35,
  };

  const garmentGroup = new THREE.Group();
  garmentGroup.name = "ProceduralGarmentGroup";

  const fabricTexture = createProceduralFabricTexture();

  // Primary Fabric Material
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(opt.colorHex),
    roughness: opt.roughness,
    metalness: 0.05,
    bumpMap: fabricTexture,
    bumpScale: 0.003,
    side: THREE.DoubleSide,
  });

  // Secondary Trim Material (Collar & Cuffs)
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(opt.secondaryColorHex),
    roughness: 0.85,
    metalness: 0.02,
    bumpMap: fabricTexture,
    bumpScale: 0.005,
    side: THREE.DoubleSide,
  });

  // 1. Torso Mesh
  const torsoGeom = createTorsoGeometry(8, 20);
  const torsoMesh = new THREE.Mesh(torsoGeom, material);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  garmentGroup.add(torsoMesh);

  // 2. Collar Trim Mesh (Ribbed Torus Ring)
  const collarGeom = new THREE.TorusGeometry(0.26, 0.035, 12, 32);
  collarGeom.rotateX(Math.PI / 2);
  const collarMesh = new THREE.Mesh(collarGeom, trimMaterial);
  collarMesh.position.set(0, 0.48, 0);
  garmentGroup.add(collarMesh);

  // 3. Left & Right Sleeve Meshes
  const sleeveLen = opt.sleeveLength === "long" ? 0.85 : opt.sleeveLength === "three_quarter" ? 0.60 : 0.38;
  const sleeveTopRadius = 0.22;
  const sleeveBottomRadius = opt.sleeveLength === "long" ? 0.14 : 0.19;

  // Left Sleeve
  const leftSleeveGeom = new THREE.CylinderGeometry(sleeveBottomRadius, sleeveTopRadius, sleeveLen, 20, 4, true);
  leftSleeveGeom.translate(0, -sleeveLen / 2, 0); // Origin at top shoulder
  const leftSleeveMesh = new THREE.Mesh(leftSleeveGeom, material);
  leftSleeveMesh.castShadow = true;
  leftSleeveMesh.position.set(0.55, 0.36, 0);
  leftSleeveMesh.rotation.z = -0.42; // default down-angle
  garmentGroup.add(leftSleeveMesh);

  // Right Sleeve
  const rightSleeveGeom = new THREE.CylinderGeometry(sleeveBottomRadius, sleeveTopRadius, sleeveLen, 20, 4, true);
  rightSleeveGeom.translate(0, -sleeveLen / 2, 0); // Origin at top shoulder
  const rightSleeveMesh = new THREE.Mesh(rightSleeveGeom, material);
  rightSleeveMesh.castShadow = true;
  rightSleeveMesh.position.set(-0.55, 0.36, 0);
  rightSleeveMesh.rotation.z = 0.42; // default down-angle
  garmentGroup.add(rightSleeveMesh);

  // 4. Bottom Hem Ribbed Trim
  const bottomHemGeom = new THREE.TorusGeometry(0.52, 0.03, 10, 32);
  bottomHemGeom.rotateX(Math.PI / 2);
  const bottomHemMesh = new THREE.Mesh(bottomHemGeom, trimMaterial);
  bottomHemMesh.position.set(0, -0.85, 0);
  garmentGroup.add(bottomHemMesh);

  // 5. Optional Hoodie Pocket / Detail
  if (opt.type === "hoodie") {
    const pocketGeom = new THREE.PlaneGeometry(0.48, 0.32, 8, 8);
    // curve pocket outwards slightly
    const pos = pocketGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = Math.cos(pos.getX(i) * 3) * 0.04;
      pos.setZ(i, z);
    }
    pocketGeom.computeVertexNormals();
    const pocketMesh = new THREE.Mesh(pocketGeom, trimMaterial);
    pocketMesh.position.set(0, -0.42, 0.33);
    garmentGroup.add(pocketMesh);
  }

  // Update Colors Utility
  const setColors = (primary: string, secondary?: string) => {
    material.color.set(primary);
    material.needsUpdate = true;
    if (secondary) {
      trimMaterial.color.set(secondary);
    } else {
      // Auto dark-toned secondary trim
      const c = new THREE.Color(primary);
      c.multiplyScalar(0.75);
      trimMaterial.color.copy(c);
    }
    trimMaterial.needsUpdate = true;
  };

  // Update Fit Style Utility
  const setFitStyle = (fit: "regular" | "oversized" | "slim") => {
    opt.fitStyle = fit;
    const factor = fit === "oversized" ? 1.15 : fit === "slim" ? 0.90 : 1.0;
    torsoMesh.scale.set(factor, 1.0, factor);
    collarMesh.scale.set(factor, 1.0, factor);
    bottomHemMesh.scale.set(factor, 1.0, factor);
  };

  const dispose = () => {
    torsoGeom.dispose();
    collarGeom.dispose();
    leftSleeveGeom.dispose();
    rightSleeveGeom.dispose();
    bottomHemGeom.dispose();
    material.dispose();
    trimMaterial.dispose();
    fabricTexture.dispose();
  };

  return {
    group: garmentGroup,
    torsoMesh,
    collarMesh,
    leftSleeveMesh,
    rightSleeveMesh,
    bottomHemMesh,
    material,
    trimMaterial,
    options: opt,
    setColors,
    setFitStyle,
    dispose,
  };
}

/**
 * Dynamically deforms and animates the procedural garment according to 33 Pose Landmarks.
 */
export function animateProceduralGarment(
  garment: ProceduralGarment,
  landmarks: any[],
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number,
  userOffsetY = 0,
  userOffsetZ = 0,
  userScaleMultiplier = 100
): void {
  if (!landmarks || landmarks.length < 25) return;

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  if (!leftShoulder || !rightShoulder) return;

  const cw = containerWidth;
  const ch = containerHeight;
  const vw = videoWidth || 1280;
  const vh = videoHeight || 720;

  const videoAspect = vw / vh;
  const containerAspect = cw / ch;

  let renderedWidth = cw;
  let renderedHeight = ch;
  let offsetX = 0;
  let offsetYPixel = 0;

  if (containerAspect > videoAspect) {
    renderedHeight = ch;
    renderedWidth = ch * videoAspect;
    offsetX = (cw - renderedWidth) / 2;
  } else {
    renderedWidth = cw;
    renderedHeight = cw / videoAspect;
    offsetYPixel = (ch - renderedHeight) / 2;
  }

  // 1. Anatomical midpoint of shoulders (Collar / Neck Base)
  const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
  const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

  // Screen Pixel Coordinates (Mirrored Video Feed: 1 - X)
  const screenX = offsetX + (1 - midShoulderX) * renderedWidth;
  const screenY = offsetYPixel + midShoulderY * renderedHeight;

  // Three.js NDC (-1 to +1)
  const ndcX = (screenX / cw) * 2 - 1;
  const ndcY = 1 - (screenY / ch) * 2;

  // Camera Frustum Dimensions at Z = 0 (Camera Z = 4.0, FOV = 45 deg)
  const halfH = Math.tan((45 * Math.PI) / 360) * 4.0;
  const halfW = halfH * (cw / ch);

  const worldX = ndcX * halfW;
  const worldY = ndcY * halfH + userOffsetY * 0.012 - 0.26;
  const worldZ = (((leftShoulder.z || 0) + (rightShoulder.z || 0)) / 2) * -3.0 + userOffsetZ * 0.015;

  // Screen Positions of Both Shoulders
  const screenLeftShoulderX = offsetX + (1 - leftShoulder.x) * renderedWidth;
  const screenLeftShoulderY = offsetYPixel + leftShoulder.y * renderedHeight;
  const screenRightShoulderX = offsetX + (1 - rightShoulder.x) * renderedWidth;
  const screenRightShoulderY = offsetYPixel + rightShoulder.y * renderedHeight;

  const dx = screenRightShoulderX - screenLeftShoulderX;
  const dy = screenRightShoulderY - screenLeftShoulderY;
  const pixelDist = Math.sqrt(dx * dx + dy * dy);

  // Roll: Shoulder tilt
  const rollAngle = Math.atan2(dy, dx);
  const safeRoll = THREE.MathUtils.clamp(rollAngle, -0.65, 0.65);

  // Yaw: Torso rotation around Y
  const depthDiff = (leftShoulder.z || 0) - (rightShoulder.z || 0);
  const yawAngle = Math.atan2(depthDiff * 2.2, Math.abs(dx) / (renderedWidth || 1) + 0.001);
  const safeYaw = THREE.MathUtils.clamp(yawAngle, -0.75, 0.75);

  // Pitch: Leaning forward / backward
  let safePitch = 0;
  if (leftHip && rightHip) {
    const midHipZ = ((leftHip.z || 0) + (rightHip.z || 0)) / 2;
    const midShoulderZ = ((leftShoulder.z || 0) + (rightShoulder.z || 0)) / 2;
    const pitchDelta = (midShoulderZ - midHipZ) * 1.8;
    safePitch = THREE.MathUtils.clamp(pitchDelta, -0.45, 0.45);
  }

  // World Space Scale
  const worldShoulderSpan = (pixelDist / cw) * (2 * halfW);
  const baseScale = worldShoulderSpan * 1.75 * (userScaleMultiplier / 100);

  const group = garment.group;
  group.position.x = THREE.MathUtils.lerp(group.position.x, worldX, 0.5);
  group.position.y = THREE.MathUtils.lerp(group.position.y, worldY, 0.5);
  group.position.z = THREE.MathUtils.lerp(group.position.z, worldZ, 0.5);

  group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, safeRoll, 0.5);
  group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, safeYaw, 0.5);
  group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, safePitch, 0.5);

  group.scale.lerp(new THREE.Vector3(baseScale, baseScale, baseScale), 0.5);

  // Dynamic Sleeve Kinematics (Left & Right Arms)
  if (leftElbow) {
    const ldx = (1 - leftElbow.x) - (1 - leftShoulder.x);
    const ldy = leftElbow.y - leftShoulder.y;
    const leftArmAngle = Math.atan2(ldy, ldx);
    const leftElevation = THREE.MathUtils.clamp(-(leftArmAngle + Math.PI / 2), -1.3, 1.3);

    garment.leftSleeveMesh.rotation.z = THREE.MathUtils.lerp(
      garment.leftSleeveMesh.rotation.z,
      -0.42 + leftElevation * 0.8,
      0.35
    );
  }

  if (rightElbow) {
    const rdx = (1 - rightElbow.x) - (1 - rightShoulder.x);
    const rdy = rightElbow.y - rightShoulder.y;
    const rightArmAngle = Math.atan2(rdy, rdx);
    const rightElevation = THREE.MathUtils.clamp(rightArmAngle - Math.PI / 2, -1.3, 1.3);

    garment.rightSleeveMesh.rotation.z = THREE.MathUtils.lerp(
      garment.rightSleeveMesh.rotation.z,
      0.42 + rightElevation * 0.8,
      0.35
    );
  }
}
