import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { soundManager } from '../utils/audio';

// 珠光與陶瓷質感彩球配色表（多彩繽紛，每次開獎隨機切換不同顏色）
const BALL_PALETTE = [
  { hex: 0xd95338, name: 'terracotta-coral' }, // 原圖磚紅珊瑚
  { hex: 0x228795, name: 'peacock-teal' },     // 孔雀青藍
  { hex: 0xf5b722, name: 'honey-gold' },       // 亮麗蜜黃
  { hex: 0x2b6aa6, name: 'cobalt-blue' },      // 寶石海藍
  { hex: 0xdf7450, name: 'vintage-peach' },    // 復古蜜桃橙
  { hex: 0x3da88c, name: 'jade-mint' },        // 翡翠薄荷綠
  { hex: 0x8b5cf6, name: 'lavender-purple' },  // 薰衣草紫
  { hex: 0xf43f5e, name: 'rose-red' },         // 玫瑰亮紅
  { hex: 0x0ea5e9, name: 'sky-azure' },        // 天空青
  { hex: 0xf6f0e4, name: 'pearl-cream' },      // 象牙白
  { hex: 0xd97706, name: 'warm-amber' }        // 暖琥珀
];

export default function LotteryScene3D({
  isRolling,
  drawnWinner,
  onBallLanded,
  isFirstPrize = false,
  candidates = [],
  allWinners = [],
  collectingWinner = null,
  onBallCollectedToJar = null,
  onHoldStart = null,
  onHoldEnd = null,
  isSpreadView = false,
  onToggleSpreadView = null
}) {
  const containerRef = useRef(null);
  const stateRef = useRef({
    isRolling: false,
    drawnWinner: null,
    isFirstPrize: false,
    isSpreadView: false,
    wasSpreadView: false,
    chuteProgress: 0,
    isAnimatingChute: false,
    chuteStartTime: 0,
    onBallLanded: null,
    triggerChute: null,
    triggerCollectToJar: null,
    syncJarBalls: null,
    syncPoolBalls: null,
    updateSpreadTargets: null,
    onBallCollectedToJar: null,
    onHoldStart: null,
    onHoldEnd: null
  });

  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;

  const allWinnersRef = useRef(allWinners);
  allWinnersRef.current = allWinners;

  const collectingWinnerRef = useRef(collectingWinner);
  collectingWinnerRef.current = collectingWinner;

  // 隨時同步回調與狀態
  stateRef.current.onBallLanded = onBallLanded;
  stateRef.current.isFirstPrize = isFirstPrize;
  stateRef.current.onBallCollectedToJar = onBallCollectedToJar;
  stateRef.current.onHoldStart = onHoldStart;
  stateRef.current.onHoldEnd = onHoldEnd;

  useEffect(() => {
    stateRef.current.isRolling = isRolling;
  }, [isRolling]);

  // 同步平攤展示狀態
  useEffect(() => {
    stateRef.current.isSpreadView = isSpreadView;
    if (stateRef.current.updateSpreadTargets) {
      stateRef.current.updateSpreadTargets();
    }
  }, [isSpreadView]);

  // 同步獎池候選人名單（動態 1:1，出來一個少一個）
  useEffect(() => {
    candidatesRef.current = candidates;
    if (stateRef.current.syncPoolBalls) {
      stateRef.current.syncPoolBalls(candidates);
    }
  }, [candidates]);

  // 當中獎者抽出或重置時，同步狀態並觸發出球動畫
  useEffect(() => {
    stateRef.current.drawnWinner = drawnWinner;
    if (drawnWinner) {
      if (stateRef.current.triggerChute) {
        stateRef.current.triggerChute(drawnWinner);
      }
    } else {
      if (stateRef.current.hideChuteBall) {
        stateRef.current.hideChuteBall();
      }
    }
  }, [drawnWinner]);

  // 當外部觸發「收入名單」時，觸發彩球從前端托座凌空飛入右側存球罐
  useEffect(() => {
    stateRef.current.collectingWinner = collectingWinner;
    if (collectingWinner && stateRef.current.triggerCollectToJar) {
      stateRef.current.triggerCollectToJar(collectingWinner);
    }
  }, [collectingWinner]);

  // 當獲獎總名冊變更或出球狀態切換時，同步存球罐內部常態球
  useEffect(() => {
    if (stateRef.current.syncJarBalls) {
      // 只有當前「確實有正在出球座上或正在飛行」的中獎者時才暫時排除，
      // 否則（切換獎項、已收納完成），罐子必須 100% 全量展示該獎項的所有中獎球！
      const activePendingId = (drawnWinner?.id || collectingWinner?.id) || null;
      stateRef.current.syncJarBalls(allWinners, activePendingId);
    }
  }, [allWinners, drawnWinner, collectingWinner]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    // --- 1. Three.js 場景與相機設定 ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x16171b);
    scene.fog = new THREE.FogExp2(0x16171b, 0.025);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    // 最佳視角：相機正面平視球機，舞台底部完全展露
    camera.position.set(0, 1.95, 9.8);
    camera.lookAt(0, 1.45, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    // --- 2. 攝影棚級溫暖背景光板 (漫射漸層讓玻璃折射晶瑩剔透) ---
    const backdropCanvas = document.createElement('canvas');
    backdropCanvas.width = 1024;
    backdropCanvas.height = 1024;
    const bdCtx = backdropCanvas.getContext('2d');
    const bdGrad = bdCtx.createRadialGradient(512, 512, 50, 512, 512, 512);
    bdGrad.addColorStop(0, '#38322a'); // 中心溫暖漫射光
    bdGrad.addColorStop(0.45, '#242328');
    bdGrad.addColorStop(1, '#111215');
    bdCtx.fillStyle = bdGrad;
    bdCtx.fillRect(0, 0, 1024, 1024);

    const backdropTex = new THREE.CanvasTexture(backdropCanvas);
    const backdropMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 20),
      new THREE.MeshBasicMaterial({ map: backdropTex, depthWrite: false })
    );
    backdropMesh.position.set(0, 2.5, -6);
    scene.add(backdropMesh);

    // --- 3. 攝影棚級 HDR 環境貼圖 (PMREMGenerator) ---
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const envCanvas = document.createElement('canvas');
    envCanvas.width = 1024;
    envCanvas.height = 512;
    const envCtx = envCanvas.getContext('2d');

    const envBg = envCtx.createLinearGradient(0, 0, 0, 512);
    envBg.addColorStop(0, '#15171d');
    envBg.addColorStop(0.35, '#232732');
    envBg.addColorStop(0.5, '#352d24'); // 金屬反射地平線
    envBg.addColorStop(1, '#0e0f13');
    envCtx.fillStyle = envBg;
    envCtx.fillRect(0, 0, 1024, 512);

    // 頂部主柔光箱
    const topSoft = envCtx.createRadialGradient(512, 110, 10, 512, 110, 220);
    topSoft.addColorStop(0, 'rgba(255, 252, 245, 1.0)');
    topSoft.addColorStop(0.3, 'rgba(255, 240, 215, 0.9)');
    topSoft.addColorStop(1, 'rgba(255, 225, 180, 0)');
    envCtx.fillStyle = topSoft;
    envCtx.beginPath();
    envCtx.arc(512, 110, 220, 0, Math.PI * 2);
    envCtx.fill();

    // 兩側條形反光條
    const leftStrip = envCtx.createLinearGradient(100, 40, 220, 320);
    leftStrip.addColorStop(0, 'rgba(200, 235, 255, 0.95)');
    leftStrip.addColorStop(0.5, 'rgba(160, 210, 255, 0.6)');
    leftStrip.addColorStop(1, 'rgba(120, 180, 255, 0)');
    envCtx.fillStyle = leftStrip;
    envCtx.fillRect(90, 40, 140, 300);

    const rightStrip = envCtx.createLinearGradient(800, 40, 930, 320);
    rightStrip.addColorStop(0, 'rgba(255, 225, 140, 0.95)');
    rightStrip.addColorStop(0.5, 'rgba(245, 195, 95, 0.6)');
    rightStrip.addColorStop(1, 'rgba(210, 140, 40, 0)');
    envCtx.fillStyle = rightStrip;
    envCtx.fillRect(790, 40, 140, 300);

    const envTex = new THREE.CanvasTexture(envCanvas);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    const envMap = pmremGenerator.fromEquirectangular(envTex).texture;
    scene.environment = envMap;

    // --- 4. 實體燈光 ---
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.9);
    scene.add(ambientLight);

    const mainSpot = new THREE.SpotLight(0xfff8ee, 4.2);
    mainSpot.position.set(0, 8.5, 5.5);
    mainSpot.angle = Math.PI / 4;
    mainSpot.penumbra = 0.5;
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.width = 2048;
    mainSpot.shadow.mapSize.height = 2048;
    scene.add(mainSpot);

    const rimLeft = new THREE.DirectionalLight(0xa5f3fc, 1.8);
    rimLeft.position.set(-6, 4.5, -2);
    scene.add(rimLeft);

    const rimRight = new THREE.DirectionalLight(0xfde047, 2.2);
    rimRight.position.set(6, 4.0, -1);
    scene.add(rimRight);

    const stageGlowLight = new THREE.PointLight(0xd97706, 1.8, 6);
    stageGlowLight.position.set(0, -0.05, 1.8);
    scene.add(stageGlowLight);

    const grandPrizeLight = new THREE.SpotLight(0xffd700, 0, 14, Math.PI / 3, 0.5);
    grandPrizeLight.position.set(0, 7.5, 2.5);
    scene.add(grandPrizeLight);

    // 接球托杯專屬聚光燈
    const cupSpotLight = new THREE.SpotLight(0xfffbeb, 0, 6, Math.PI / 5, 0.3);
    cupSpotLight.position.set(2.45, 3.0, 2.4);
    cupSpotLight.target.position.set(2.45, 0.15, 1.85);
    scene.add(cupSpotLight);
    scene.add(cupSpotLight.target);

    // --- 5. Cannon-es 剛體物理引擎定位 ---
    // 球體中心 SPHERE_CENTER 在 y = 2.02，半徑 R = 1.95 -> 球底懸空在 y = 0.07
    // 舞台頂面在 y = -0.15，所有球體完全懸空在舞台上方，絕不被金屬底座埋沒！
    const world = new CANNON.World();
    world.gravity.set(0, -18.5, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 12;
    world.allowSleep = true;

    const ballPhysMat = new CANNON.Material('ball');
    const contactMat = new CANNON.ContactMaterial(ballPhysMat, ballPhysMat, {
      friction: 0.15,
      restitution: 0.76
    });
    world.addContactMaterial(contactMat);

    const SPHERE_CENTER = new CANNON.Vec3(0, 2.02, 0);
    const SPHERE_RADIUS = 1.95;
    const BALL_RADIUS = 0.20;

    // --- 6. PBR 材質 ---
    const brushedBrassMat = new THREE.MeshStandardMaterial({
      color: 0xdfb466,
      metalness: 0.92,
      roughness: 0.18,
      envMapIntensity: 2.2
    });

    const polishedGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffce54,
      metalness: 0.95,
      roughness: 0.1,
      envMapIntensity: 2.5
    });

    const darkBronzeStageMat = new THREE.MeshStandardMaterial({
      color: 0x24201c,
      metalness: 0.88,
      roughness: 0.32,
      envMapIntensity: 1.5
    });

    // 高透清水晶玻璃 (超透光學晶體，depthWrite: false 避免任何遮擋與黑斑，fog: false 消除暗霧)
    const crystalGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.995,
      opacity: 1,
      transparent: true,
      roughness: 0.005,
      ior: 1.18,
      thickness: 0.015,
      specularIntensity: 0.85,
      specularColor: 0xffffff,
      envMapIntensity: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.01,
      depthWrite: false,
      fog: false
    });

    // --- 7. 3D 舞台多層結構 (完全下移，不擋球) ---
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    const baseCyl1 = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.4, 0.32, 64),
      darkBronzeStageMat
    );
    baseCyl1.position.y = -0.75;
    baseCyl1.receiveShadow = true;
    stageGroup.add(baseCyl1);

    const baseGoldTorus = new THREE.Mesh(
      new THREE.TorusGeometry(5.22, 0.07, 16, 64),
      polishedGoldMat
    );
    baseGoldTorus.rotation.x = Math.PI / 2;
    baseGoldTorus.position.y = -0.58;
    stageGroup.add(baseGoldTorus);

    const midStageCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(4.35, 4.5, 0.35, 64),
      darkBronzeStageMat
    );
    midStageCyl.position.y = -0.42;
    midStageCyl.receiveShadow = true;
    stageGroup.add(midStageCyl);

    const midGoldTorus = new THREE.Mesh(
      new THREE.TorusGeometry(4.36, 0.06, 16, 64),
      brushedBrassMat
    );
    midGoldTorus.rotation.x = Math.PI / 2;
    midGoldTorus.position.y = -0.25;
    stageGroup.add(midGoldTorus);

    const topStageDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(3.3, 3.4, 0.2, 64),
      darkBronzeStageMat
    );
    topStageDisc.position.y = -0.22;
    topStageDisc.receiveShadow = true;
    stageGroup.add(topStageDisc);

    // 球體下方空心金屬承托環 (Hollow Cradle Ring)
    const sphereCradleRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 16, 48),
      polishedGoldMat
    );
    sphereCradleRing.rotation.x = Math.PI / 2;
    sphereCradleRing.position.set(0, 0.08, 0);
    stageGroup.add(sphereCradleRing);

    const cradleSupportRing = new THREE.Mesh(
      new THREE.CylinderGeometry(1.28, 1.35, 0.18, 48, 1, true),
      brushedBrassMat
    );
    cradleSupportRing.position.set(0, -0.02, 0);
    stageGroup.add(cradleSupportRing);

    // --- 8. 兩側重型雙立柱黃銅邊架 (原圖造型) ---
    const createSideBracket = (xPos, isRight) => {
      const bracket = new THREE.Group();
      bracket.position.set(xPos, 0, 0);

      const footPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.12, 0.85),
        brushedBrassMat
      );
      footPlate.position.set(0, -0.06, 0);
      bracket.add(footPlate);

      const boltGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.05, 6);
      [[-0.22, -0.28], [0.22, -0.28], [-0.22, 0.28], [0.22, 0.28]].forEach(([bx, bz]) => {
        const bolt = new THREE.Mesh(boltGeo, polishedGoldMat);
        bolt.position.set(bx, 0.02, bz);
        bracket.add(bolt);
      });

      const pillarGeo = new THREE.CylinderGeometry(0.085, 0.095, 2.05, 32);
      const pillarFront = new THREE.Mesh(pillarGeo, brushedBrassMat);
      pillarFront.position.set(0, 0.98, 0.18);
      pillarFront.castShadow = true;
      bracket.add(pillarFront);

      const pillarBack = new THREE.Mesh(pillarGeo, brushedBrassMat);
      pillarBack.position.set(0, 0.98, -0.18);
      pillarBack.castShadow = true;
      bracket.add(pillarBack);

      const crossBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.07, 0.42),
        brushedBrassMat
      );
      crossBar.position.set(0, 0.65, 0);
      bracket.add(crossBar);

      const bearingCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.24, 48),
        brushedBrassMat
      );
      bearingCollar.rotation.z = Math.PI / 2;
      bearingCollar.position.set(0, 2.02, 0);
      bracket.add(bearingCollar);

      const capCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.24, 0.07, 32),
        polishedGoldMat
      );
      capCollar.rotation.z = Math.PI / 2;
      capCollar.position.set(isRight ? 0.15 : -0.15, 2.02, 0);
      bracket.add(capCollar);

      const domeNut = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        polishedGoldMat
      );
      domeNut.rotation.z = isRight ? -Math.PI / 2 : Math.PI / 2;
      domeNut.position.set(isRight ? 0.19 : -0.19, 2.02, 0);
      bracket.add(domeNut);

      const innerAxle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.5, 32),
        brushedBrassMat
      );
      innerAxle.rotation.z = Math.PI / 2;
      innerAxle.position.set(isRight ? -0.22 : 0.22, 2.02, 0);
      bracket.add(innerAxle);

      return bracket;
    };

    stageGroup.add(createSideBracket(-2.4, false));
    stageGroup.add(createSideBracket(2.4, true));

    // --- 8.5 左側原圖同款【黃銅機械手搖把手】(Rotary Crank Handle) ---
    const crankGroup = new THREE.Group();
    crankGroup.position.set(-2.62, 2.02, 0);
    scene.add(crankGroup);

    // 中心輪轂端蓋
    const crankHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.12, 32),
      polishedGoldMat
    );
    crankHub.rotation.z = Math.PI / 2;
    crankGroup.add(crankHub);

    // 實心黃銅搖臂（向下懸垂）
    const crankArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.72, 0.05),
      brushedBrassMat
    );
    crankArm.position.set(0, -0.36, 0);
    crankGroup.add(crankArm);

    // 把手肘軸（垂直向外伸出）
    const crankPeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.16, 16),
      polishedGoldMat
    );
    crankPeg.rotation.z = Math.PI / 2;
    crankPeg.position.set(-0.08, -0.72, 0);
    crankGroup.add(crankPeg);

    // 人體工學手搖把柄（微弧飽滿輪廓）
    const crankGrip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.075, 0.42, 24),
      brushedBrassMat
    );
    crankGrip.rotation.z = Math.PI / 2;
    crankGrip.position.set(-0.25, -0.72, 0);
    crankGroup.add(crankGrip);

    const crankGripCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 16, 16),
      polishedGoldMat
    );
    crankGripCap.position.set(-0.46, -0.72, 0);
    crankGroup.add(crankGripCap);

    // --- 9. 核心玻璃搖獎球體 ---
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const glassSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.96, 64, 48),
      crystalGlassMat
    );
    glassSphere.position.copy(SPHERE_CENTER);
    glassSphere.renderOrder = 10;
    globeGroup.add(glassSphere);

    // 玻璃球內部專屬補光燈（使內部彩球明亮剔透、字跡清晰醒目）
    const globeInnerLight = new THREE.PointLight(0xfff7ed, 1.8, 4.2);
    globeInnerLight.position.set(0, 2.2, 0);
    scene.add(globeInnerLight);

    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.48, 3.95, 0),
      new THREE.Vector3(-0.3, 4.22, 0),
      new THREE.Vector3(0.3, 4.22, 0),
      new THREE.Vector3(0.48, 3.95, 0)
    ]);
    const topHandleMesh = new THREE.Mesh(
      new THREE.TubeGeometry(handleCurve, 32, 0.045, 16, false),
      crystalGlassMat
    );
    topHandleMesh.renderOrder = 11;
    globeGroup.add(topHandleMesh);

    const hingeL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16), polishedGoldMat);
    hingeL.position.set(-0.48, 3.96, 0);
    globeGroup.add(hingeL);
    const hingeR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16), polishedGoldMat);
    hingeR.position.set(0.48, 3.96, 0);
    globeGroup.add(hingeR);

    const hatchCircle = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.035, 16, 48),
      crystalGlassMat
    );
    hatchCircle.rotation.x = Math.PI / 2;
    hatchCircle.position.set(0, 3.96, 0);
    hatchCircle.renderOrder = 11;
    globeGroup.add(hatchCircle);

    const equatorRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.97, 0.025, 16, 64),
      polishedGoldMat
    );
    equatorRing.rotation.x = Math.PI / 2;
    equatorRing.position.copy(SPHERE_CENTER);
    globeGroup.add(equatorRing);

    // --- 10. 右側雙導軌透明滑道與開放式托球環 (徹底去除會造成光學扭曲的玻璃筒) ---
    const chuteCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.6, 1.35, 0.15),
      new THREE.Vector3(2.1, 0.95, 0.65),
      new THREE.Vector3(2.45, 0.55, 1.25),
      new THREE.Vector3(2.45, 0.28, 1.85) // 抵達托環正上方
    ]);

    const railGeo = new THREE.TubeGeometry(chuteCurve, 40, 0.035, 12, false);
    const rail1 = new THREE.Mesh(railGeo, crystalGlassMat);
    rail1.position.x += 0.055;
    rail1.renderOrder = 9;
    scene.add(rail1);

    const rail2 = new THREE.Mesh(railGeo, crystalGlassMat);
    rail2.position.x -= 0.055;
    rail2.renderOrder = 9;
    scene.add(rail2);

    const chutePost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.65, 16),
      brushedBrassMat
    );
    chutePost.position.set(2.35, 0.1, 1.05);
    scene.add(chutePost);

    // 【重要改進】前端托球座改為「原圖同款開放式黃銅托環」，絕不用玻璃桶阻隔或造成折射變形！
    const catcherGroup = new THREE.Group();
    catcherGroup.position.set(2.45, -0.15, 1.85);
    scene.add(catcherGroup);

    // 金色實心底盤
    const cupBaseGold = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.38, 0.08, 32),
      polishedGoldMat
    );
    cupBaseGold.position.y = 0.04;
    catcherGroup.add(cupBaseGold);

    // 開放式黃銅收口托環（中空矮環，球體端坐其上，100% 露出完整球形）
    const cupCollarRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.12, 32, 1, true),
      polishedGoldMat
    );
    cupCollarRing.position.y = 0.1;
    catcherGroup.add(cupCollarRing);

    const cupRimTorus = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.025, 16, 32),
      polishedGoldMat
    );
    cupRimTorus.rotation.x = Math.PI / 2;
    cupRimTorus.position.y = 0.16;
    catcherGroup.add(cupRimTorus);

    // --- 11. 繪製帶有真實【工號】與【姓名】的高清撞球/彩票球紋理 ---
    const createBilliardTex = (empId, empName, bgHex) => {
      const cv = document.createElement('canvas');
      cv.width = 512;
      cv.height = 256;
      const c = cv.getContext('2d');

      // 背景色（真實純粹彩球自然色彩，一等獎維持真實球色，不再變金黃）
      c.fillStyle = new THREE.Color(bgHex).getStyle();
      c.fillRect(0, 0, 512, 256);

      // 動態自適應字體大小計算函數：確保文字嚴格居中、永不溢出白色徽章圓圈（支援超長工號、4~6字中文、英文姓名）
      const fitText = (text, maxWidth, baseSize, fontFamily) => {
        let size = baseSize;
        c.font = `bold ${size}px ${fontFamily}`;
        let w = c.measureText(text).width;
        if (w > maxWidth) {
          size = Math.max(13, Math.floor(baseSize * (maxWidth / w)));
          c.font = `bold ${size}px ${fontFamily}`;
        }
        return size;
      };

      // 在正反兩面 (cx = 128 與 cx = 384) 各畫一個圓形工號徽章
      [128, 384].forEach(cx => {
        // 白底徽章圓圈
        c.beginPath();
        c.arc(cx, 128, 74, 0, Math.PI * 2);
        c.fillStyle = '#ffffff';
        c.fill();
        c.lineWidth = 5;
        c.strokeStyle = '#1e293b';
        c.stroke();

        // 內圈裝飾細線
        c.beginPath();
        c.arc(cx, 128, 67, 0, Math.PI * 2);
        c.lineWidth = 1.5;
        c.strokeStyle = '#94a3b8';
        c.stroke();

        // 繪製工號 (上排文字，自動適應 106px 最大寬度)
        const displayId = String(empId || '888').trim();
        fitText(displayId, 106, 28, '"Arial", "Consolas", sans-serif');
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#334155';
        c.fillText(displayId, cx, 102);

        // 繪製姓名 (下排大字，自動適應 114px 最大寬度，杜絕紅字！使用高貴曜石深藍黑)
        const displayName = String(empName || '幸运儿').trim();
        fitText(displayName, 114, 36, '"Noto Sans SC", "Microsoft YaHei", sans-serif');
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#0f172a'; // 絕對不使用紅字，任何紅/橘球上均清晰無比
        c.fillText(displayName, cx, 148);
      });

      const tex = new THREE.CanvasTexture(cv);
      return tex;
    };

    // --- 12. 動態獎池彩球生成（嚴格 1:1 對應實際候選人數，出來一個少一個；支援罐內平攤展示名單） ---
    let poolBallItems = [];
    const sphereGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 28);

    // 計算所有球體在玻璃罐內「平攤半環形階梯展台 (Amphitheater)」的三維展示座標與正面朝向
    const updateSpreadTargets = () => {
      const N = poolBallItems.length;
      if (N === 0) return;

      const numRows = N <= 4 ? 1 : N <= 12 ? 2 : N <= 24 ? 3 : N <= 36 ? 4 : N <= 55 ? 5 : N <= 75 ? 6 : 7;
      const rowCounts = [];
      let rem = N;
      for (let r = 0; r < numRows; r++) {
        const c = Math.ceil(rem / (numRows - r));
        rowCounts.push(c);
        rem -= c;
      }

      const yTotalSpan = numRows === 1 ? 0 : Math.min(1.7, (numRows - 1) * (N > 50 ? 0.32 : 0.40));
      const yStart = SPHERE_CENTER.y + yTotalSpan / 2;
      const yStep = numRows > 1 ? yTotalSpan / (numRows - 1) : 0;
      const scale = N > 55 ? 0.76 : N > 36 ? 0.88 : 1.0;

      let itemIdx = 0;
      for (let r = 0; r < numRows; r++) {
        const countInRow = rowCounts[r];
        const y = yStart - r * yStep;
        const dy = y - SPHERE_CENTER.y;
        const maxRadiusAtY = Math.sqrt(Math.max(0.2, 1.65 * 1.65 - dy * dy));
        const xSpan = Math.min(1.42, maxRadiusAtY * 0.88);

        for (let c = 0; c < countInRow; c++) {
          if (itemIdx >= poolBallItems.length) break;
          const item = poolBallItems[itemIdx];
          const u = countInRow > 1 ? (c / (countInRow - 1)) * 2 - 1 : 0;
          const x = u * xSpan;
          const zOffset = Math.sqrt(Math.max(0.1, 1.62 * 1.62 - x * x - dy * dy)) * 0.65 + 0.35;
          const z = Math.min(1.35, Math.max(0.35, zOffset));

          item.targetSpreadPos.set(x, y, z);
          item.targetScale = scale;

          // 讓每個球上的白底工號/姓名徽章直接面朝主相機
          const angleY = Math.atan2(-x, 9.8 - z);
          const angleX = Math.atan2(y - 1.95, 9.8 - z) - 0.04;
          item.targetSpreadRot.setFromEuler(new THREE.Euler(angleX, angleY, 0));

          itemIdx++;
        }
      }
    };
    stateRef.current.updateSpreadTargets = updateSpreadTargets;

    // 建立單一候選人員專屬彩球
    const createPoolBallItem = (cand, index) => {
      const pal = BALL_PALETTE[index % BALL_PALETTE.length];
      const texture = createBilliardTex(cand.id, cand.name, pal.hex);

      const bMat = new THREE.MeshPhysicalMaterial({
        color: pal.hex,
        map: texture,
        roughness: 0.08,
        metalness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        reflectivity: 0.85,
        envMapIntensity: 2.0
      });

      const mesh = new THREE.Mesh(sphereGeo, bMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.renderOrder = 1;
      globeGroup.add(mesh);

      const body = new CANNON.Body({
        mass: 0.3,
        material: ballPhysMat,
        shape: new CANNON.Sphere(BALL_RADIUS),
        linearDamping: 0.25,
        angularDamping: 0.35
      });
      body.sleepSpeedLimit = 0.25;
      body.sleepTimeLimit = 0.35;

      const r = 0.2 + Math.random() * 1.25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.PI * 0.48 + Math.random() * 0.42;
      body.position.set(
        SPHERE_CENTER.x + r * Math.sin(phi) * Math.cos(theta),
        SPHERE_CENTER.y - 0.9 + (Math.random() * 0.75),
        SPHERE_CENTER.z + r * Math.sin(phi) * Math.sin(theta)
      );

      world.addBody(body);

      return {
        id: cand.id,
        name: cand.name,
        colorHex: pal.hex,
        mesh,
        body,
        texture,
        targetSpreadPos: new THREE.Vector3(),
        targetSpreadRot: new THREE.Quaternion(),
        targetScale: 1.0
      };
    };

    // 同步獎池所有球體（出來一個少一個，動態嚴格 1:1 對應剩餘候選人）
    const syncPoolBalls = (newCandidates = []) => {
      const targetCands = Array.isArray(newCandidates) ? newCandidates : [];
      const targetIdSet = new Set(targetCands.map(c => c.id));

      // 1. 移除已不在名單中的球
      for (let i = poolBallItems.length - 1; i >= 0; i--) {
        const item = poolBallItems[i];
        if (!targetIdSet.has(item.id)) {
          globeGroup.remove(item.mesh);
          world.removeBody(item.body);
          item.mesh.material.dispose();
          item.texture.dispose();
          poolBallItems.splice(i, 1);
        }
      }

      // 2. 更新現有球體（若姓名有變動立即重繪貼圖）或補足新球體
      const currentItemMap = new Map(poolBallItems.map(item => [item.id, item]));
      targetCands.forEach((cand, idx) => {
        const existingItem = currentItemMap.get(cand.id);
        if (existingItem) {
          // 若工號相同但姓名發生變更，即刻重新繪製高清紋理貼圖
          if (existingItem.name !== cand.name) {
            existingItem.name = cand.name;
            const oldTex = existingItem.texture;
            const newTex = createBilliardTex(cand.id, cand.name, existingItem.colorHex);
            existingItem.texture = newTex;
            existingItem.mesh.material.map = newTex;
            existingItem.mesh.material.needsUpdate = true;
            if (oldTex) oldTex.dispose();
          }
        } else {
          // 全新候選人，動態生成專屬彩球
          const newItem = createPoolBallItem(cand, idx);
          poolBallItems.push(newItem);
        }
      });

      // 3. 重新計算平攤排布座標
      updateSpreadTargets();
    };
    stateRef.current.syncPoolBalls = syncPoolBalls;

    // 初次掛載全量生成對應候選人
    syncPoolBalls(candidatesRef.current || []);

    // --- 13. 滑道專用出球 (高光球體，完全保留清晰圓形外觀) ---
    const chuteBallTex = createBilliardTex('中奖', '等待中', 0xd95338);
    const chuteBallMesh = new THREE.Mesh(
      sphereGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0xd95338,
        map: chuteBallTex,
        roughness: 0.06,
        metalness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
        envMapIntensity: 2.2
      })
    );
    chuteBallMesh.visible = false;
    chuteBallMesh.renderOrder = 20; // 最優先顯示，永不受干擾
    scene.add(chuteBallMesh);

    stateRef.current.hideChuteBall = () => {
      chuteBallMesh.visible = false;
      stateRef.current.isAnimatingChute = false;
    };

    // --- 14. 背景奢華 3D 飄帶與金箔亮片 ---
    const ribbonGroup = new THREE.Group();
    scene.add(ribbonGroup);

    const createRibbon = (startPos, points, colorHex) => {
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
      const ribbonGeo = new THREE.TubeGeometry(curve, 60, 0.08, 12, false);
      const ribbonMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness: 0.92,
        roughness: 0.18,
        envMapIntensity: 2.0,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(ribbonGeo, ribbonMat);
      mesh.position.set(...startPos);
      return mesh;
    };

    ribbonGroup.add(createRibbon([-3.7, 1.4, -0.6], [
      [0, 2.6, 0], [-0.6, 1.3, 0.5], [0.5, 0.1, -0.4], [-0.4, -1.6, 0.3]
    ], 0xfbcfe8));

    ribbonGroup.add(createRibbon([-4.4, 1.6, -1.3], [
      [0, 2.3, 0], [0.7, 0.9, -0.5], [-0.6, -0.5, 0.6], [0.3, -2.1, -0.2]
    ], 0xfde047));

    ribbonGroup.add(createRibbon([3.9, 1.5, -0.8], [
      [0, 2.5, 0], [0.7, 1.2, -0.5], [-0.5, 0.2, 0.4], [0.6, -1.7, -0.3]
    ], 0x6ee7b7));

    ribbonGroup.add(createRibbon([4.3, 1.7, -1.5], [
      [0, 2.1, 0], [-0.6, 0.7, 0.5], [0.6, -0.6, -0.6], [-0.3, -2.0, 0.1]
    ], 0xfcd34d));

    // 金箔亮片
    const confettiCount = 80;
    const confettiGeo = new THREE.PlaneGeometry(0.12, 0.12);
    const confettiMeshes = [];
    for (let i = 0; i < confettiCount; i++) {
      const cMat = new THREE.MeshBasicMaterial({
        color: [0xfef08a, 0xfbcfe8, 0xa7f3d0, 0xbae6fd, 0xfcd34d][i % 5],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const cMesh = new THREE.Mesh(confettiGeo, cMat);
      cMesh.position.set(
        (Math.random() - 0.5) * 15,
        Math.random() * 8 - 1,
        (Math.random() - 0.5) * 8 - 2
      );
      cMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      cMesh.userData.speedY = 0.003 + Math.random() * 0.006;
      cMesh.userData.rotSpeed = (Math.random() - 0.5) * 0.035;
      scene.add(cMesh);
      confettiMeshes.push(cMesh);
    }

    // --- 15. 一等獎金色光暈粒子環 ---
    const auraCount = 60;
    const auraGeo = new THREE.BufferGeometry();
    const auraPositions = new Float32Array(auraCount * 3);
    for (let i = 0; i < auraCount; i++) {
      const angle = (i / auraCount) * Math.PI * 2;
      const dist = 2.4 + Math.random() * 0.25;
      auraPositions[i * 3] = SPHERE_CENTER.x + Math.cos(angle) * dist;
      auraPositions[i * 3 + 1] = SPHERE_CENTER.y + (Math.random() - 0.5) * 1.5;
      auraPositions[i * 3 + 2] = SPHERE_CENTER.z + Math.sin(angle) * dist;
    }
    auraGeo.setAttribute('position', new THREE.BufferAttribute(auraPositions, 3));
    const auraMat = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.14,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    const auraParticles = new THREE.Points(auraGeo, auraMat);
    scene.add(auraParticles);

    // --- 16. 右側專屬【3D 水晶集球罐】(榮耀存球罐，修窄通透柱型設計，確保所有球完整露出) ---
    // 坐落於右側中層舞台金屬環盤表面 (x = 3.6, y = -0.22, z = 0.95)
    const JAR_POS = new THREE.Vector3(3.6, -0.22, 0.95);
    const jarGroup = new THREE.Group();
    jarGroup.position.copy(JAR_POS);
    scene.add(jarGroup);

    // 1. 精緻雙層黃銅金屬底座（尺寸修窄至比例優美）
    const jarBaseFoot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.50, 0.10, 40),
      darkBronzeStageMat
    );
    jarBaseFoot.position.y = 0.05;
    jarBaseFoot.receiveShadow = true;
    jarGroup.add(jarBaseFoot);

    const jarGoldRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.47, 0.025, 16, 40),
      polishedGoldMat
    );
    jarGoldRing.rotation.x = Math.PI / 2;
    jarGoldRing.position.y = 0.10;
    jarGroup.add(jarGoldRing);

    const jarUpperCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.40, 0.44, 0.06, 40),
      brushedBrassMat
    );
    jarUpperCollar.position.y = 0.13;
    jarGroup.add(jarUpperCollar);

    const jarFloorPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.37, 0.37, 0.02, 40),
      brushedBrassMat
    );
    jarFloorPlate.position.y = 0.16;
    jarGroup.add(jarFloorPlate);

    // 2. 晶瑩剔透無霧感超白水晶圓柱 (FrontSide 單面渲染徹底消滅灰濛雙壁疊加，fog: false 徹底防暗霧，極致通透)
    const jarGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.995,
      opacity: 1,
      transparent: true,
      roughness: 0.0,
      ior: 1.08,
      thickness: 0.003,
      specularIntensity: 0.45,
      specularColor: 0xffffff,
      envMapIntensity: 0.2,
      clearcoat: 0.7,
      clearcoatRoughness: 0.0,
      depthWrite: false,
      side: THREE.FrontSide,
      fog: false
    });

    const jarCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 2.2, 48, 1, true),
      jarGlassMat
    );
    jarCylinder.position.y = 0.16 + 1.10; // 底在 0.16，頂在 2.36
    jarCylinder.renderOrder = 16;
    jarGroup.add(jarCylinder);

    // 3. 頂部黃金外翻唇緣與收口加固環
    const jarTopCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.38, 0.06, 40, 1, true),
      polishedGoldMat
    );
    jarTopCollar.position.y = 2.34;
    jarGroup.add(jarTopCollar);

    const jarTopTorus = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.025, 16, 40),
      polishedGoldMat
    );
    jarTopTorus.rotation.x = Math.PI / 2;
    jarTopTorus.position.y = 2.38;
    jarGroup.add(jarTopTorus);

    // 4. 底座金屬微弧浮雕銘牌「🏆 荣耀存球罐」
    const plaqueTex = (() => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 512, 128);
      g.addColorStop(0, '#fef08a');
      g.addColorStop(0.5, '#f59e0b');
      g.addColorStop(1, '#92400e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 128);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#fffbeb';
      ctx.strokeRect(6, 6, 500, 116);
      ctx.font = 'bold 44px sans-serif';
      ctx.fillStyle = '#1c1917';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏆 荣耀存球罐', 256, 64);
      return new THREE.CanvasTexture(c);
    })();

    const plaqueGeo = new THREE.PlaneGeometry(0.52, 0.13);
    const plaqueMesh = new THREE.Mesh(
      plaqueGeo,
      new THREE.MeshStandardMaterial({
        map: plaqueTex,
        metalness: 0.82,
        roughness: 0.22,
        envMapIntensity: 2.0
      })
    );
    plaqueMesh.position.set(0, 0.06, 0.49);
    plaqueMesh.rotation.y = -0.15;
    jarGroup.add(plaqueMesh);

    // 5. 存球罐專屬攝影棚柔光照明（均勻照射罐內所有球體，無刺眼局部白斑，字跡無比清晰生動）
    const jarStudioLight = new THREE.DirectionalLight(0xfff8ee, 1.8);
    jarStudioLight.position.set(JAR_POS.x, JAR_POS.y + 3.2, JAR_POS.z + 2.4);
    jarStudioLight.target.position.set(JAR_POS.x, JAR_POS.y + 1.0, JAR_POS.z);
    scene.add(jarStudioLight);
    scene.add(jarStudioLight.target);

    const jarTopSpot = new THREE.SpotLight(0xfff7ed, 1.5, 6.0, Math.PI / 3, 0.4);
    jarTopSpot.position.set(JAR_POS.x, JAR_POS.y + 3.6, JAR_POS.z);
    jarTopSpot.target.position.set(JAR_POS.x, JAR_POS.y + 0.8, JAR_POS.z);
    scene.add(jarTopSpot);
    scene.add(jarTopSpot.target);

    // --- 17. 罐內常態已中獎彩球與垂直單列階梯堆疊（確保前 5 顆球自下而上全部正面完整可見！） ---
    const BALL_JAR_RADIUS = 0.22;
    const jarBallGeo = new THREE.SphereGeometry(BALL_JAR_RADIUS, 32, 24);
    const jarBallMeshes = [];

    // 計算每個幸運球在玻璃罐內的穩定三維堆疊座標（單列垂直微交錯堆疊，絕無前後遮擋，前 5 顆球一目了然！）
    const getJarSlotPosition = (index) => {
      const staggerX = (index % 2 === 0 ? -0.03 : 0.03);
      const yBase = JAR_POS.y + 0.16 + BALL_JAR_RADIUS;
      const y = yBase + index * 0.36;
      const x = JAR_POS.x + staggerX;
      const z = JAR_POS.z;
      return new THREE.Vector3(x, y, z);
    };

    // 同步歷史已入罐彩球
    const syncJarBalls = (winnersList = [], excludedWinnerId = null) => {
      while (jarBallMeshes.length > 0) {
        const mesh = jarBallMeshes.pop();
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      }

      // 只有當明確指定需要排除（正在滑道或正在飛行）的人員時才過濾，其餘時刻全量展示存球罐中獎球
      const settledWinners = excludedWinnerId
        ? winnersList.filter(w => w.id !== excludedWinnerId)
        : winnersList;

      settledWinners.forEach((w, idx) => {
        const hex = w.ballColor ? parseInt(w.ballColor.replace('#', ''), 16) : 0xd95338;
        const tex = createBilliardTex(w.id, w.name, hex);

        const mat = new THREE.MeshPhysicalMaterial({
          color: hex,
          map: tex,
          roughness: 0.06,
          metalness: 0.08,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
          envMapIntensity: 2.2,
          fog: false
        });

        const mesh = new THREE.Mesh(jarBallGeo, mat);
        const slotPos = getJarSlotPosition(idx);
        mesh.position.copy(slotPos);

        // 正面直視攝影機，工號與姓名一眼清晰可辨
        mesh.rotation.y = 0;
        mesh.rotation.x = -0.05;
        mesh.renderOrder = 13; // 先於玻璃外殼渲染，保證通透清晰
        mesh.castShadow = true;

        scene.add(mesh);
        jarBallMeshes.push(mesh);
      });
    };

    stateRef.current.syncJarBalls = syncJarBalls;

    // 初次掛載同步歷史入罐名單
    if (allWinnersRef.current && allWinnersRef.current.length > 0) {
      const activePendingId = (stateRef.current.drawnWinner?.id || stateRef.current.collectingWinner?.id) || null;
      syncJarBalls(allWinnersRef.current, activePendingId);
    }

    // --- 18. 彩球凌空拋物線入罐專用飛行球體 ---
    const flyingBallMesh = new THREE.Mesh(
      jarBallGeo,
      new THREE.MeshPhysicalMaterial({
        color: 0xd95338,
        map: chuteBallTex,
        roughness: 0.06,
        metalness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
        envMapIntensity: 2.2,
        fog: false
      })
    );
    flyingBallMesh.visible = false;
    flyingBallMesh.renderOrder = 22; // 飛行於全場最高圖層
    scene.add(flyingBallMesh);

    // 拋物線飛行狀態機
    const collectFlightState = {
      active: false,
      winner: null,
      startTime: 0,
      startPos: new THREE.Vector3(2.45, 0.14, 1.85),
      apexPos: new THREE.Vector3(2.95, 2.70, 1.45),
      jarMouthPos: new THREE.Vector3(JAR_POS.x, JAR_POS.y + 2.38, JAR_POS.z),
      targetPos: new THREE.Vector3(),
      hasClinked: false
    };

    // 拍打大玻璃球互動彩蛋：清脆叩擊音 + 內部彩球瞬間向上歡躍散射
    const tapSphereBalls = () => {
      soundManager.playGlassTapSound();
      for (let i = 0; i < poolBallItems.length; i++) {
        const b = poolBallItems[i].body;
        if (b.sleepState === CANNON.Body.SLEEPING) {
          b.wakeUp();
        }
        const impY = 3.6 + Math.random() * 3.6;
        const impX = (Math.random() - 0.5) * 3.8;
        const impZ = (Math.random() - 0.5) * 3.8;
        b.applyImpulse(new CANNON.Vec3(impX, impY, impZ), b.position);
        b.angularVelocity.x += (Math.random() - 0.5) * 4.5;
        b.angularVelocity.y += (Math.random() - 0.5) * 4.5;
        b.angularVelocity.z += (Math.random() - 0.5) * 4.5;
      }
    };

    stateRef.current.triggerCollectToJar = (winner) => {
      if (!winner) return;

      // 隱藏出球座上的靜態球
      chuteBallMesh.visible = false;

      // 設置飛行球體材質與紋理
      const hex = winner.ballColor ? parseInt(winner.ballColor.replace('#', ''), 16) : 0xd95338;

      flyingBallMesh.material.color.setHex(hex);
      flyingBallMesh.material.metalness = 0.08;
      flyingBallMesh.material.map = createBilliardTex(winner.id, winner.name, hex);
      flyingBallMesh.material.needsUpdate = true;
      flyingBallMesh.position.copy(collectFlightState.startPos);
      flyingBallMesh.visible = true;

      // 計算在罐內的最終目標位置
      const targetIndex = jarBallMeshes.length;
      collectFlightState.targetPos = getJarSlotPosition(targetIndex);
      collectFlightState.winner = winner;
      collectFlightState.startTime = performance.now();
      collectFlightState.active = true;
      collectFlightState.hasClinked = false;
    };

    // --- 19. 出球觸發：隨機色彩 + 真實工號姓名印於球上 ---
    stateRef.current.triggerChute = (winner) => {
      // 若有上一顆未完成飛行的球，立刻強制定形歸入存球罐
      if (collectFlightState.active) {
        collectFlightState.active = false;
        flyingBallMesh.visible = false;
        syncJarBalls(allWinnersRef.current, null);
      }

      // 【核心亮點】：真正從大玻璃球獎池中移除該中獎球，出來一個少一個！
      if (winner?.id) {
        const itemIdx = poolBallItems.findIndex(item => item.id === winner.id);
        if (itemIdx !== -1) {
          const [removed] = poolBallItems.splice(itemIdx, 1);
          globeGroup.remove(removed.mesh);
          world.removeBody(removed.body);
          removed.mesh.material.dispose();
          removed.texture.dispose();
          updateSpreadTargets();
        }
      }

      stateRef.current.isAnimatingChute = true;
      stateRef.current.chuteProgress = 0;
      stateRef.current.chuteStartTime = performance.now();
      chuteBallMesh.visible = true;

      // 隨機或指定真實彩球色彩（不強制變為金色，回歸真實彩球）
      const randomCol = BALL_PALETTE[Math.floor(Math.random() * BALL_PALETTE.length)].hex;
      const targetHex = winner?.ballColor ? parseInt(winner.ballColor.replace('#', ''), 16) : randomCol;

      chuteBallMesh.material.color.setHex(targetHex);
      chuteBallMesh.material.metalness = 0.08;

      // 【核心亮點】：真正將中獎者的工號與姓名印在球上！
      chuteBallMesh.material.map = createBilliardTex(
        winner?.id || 'F1007748',
        winner?.name || '幸运儿',
        targetHex
      );
      chuteBallMesh.material.needsUpdate = true;

      soundManager.playChuteRollSound();
    };

    // --- 20. 動畫主循環 ---
    let animId;
    let startTime = performance.now();
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const time = (now - startTime) / 1000;

      world.step(1 / 60, delta, 3);

      const rolling = stateRef.current.isRolling;
      const isFirst = stateRef.current.isFirstPrize;

      if (isFirst) {
        auraMat.opacity = THREE.MathUtils.lerp(auraMat.opacity, 0.85, 0.05);
        grandPrizeLight.intensity = THREE.MathUtils.lerp(grandPrizeLight.intensity, 3.5, 0.05);
        auraParticles.rotation.y += delta * 0.45;
      } else {
        auraMat.opacity = THREE.MathUtils.lerp(auraMat.opacity, 0, 0.05);
        grandPrizeLight.intensity = THREE.MathUtils.lerp(grandPrizeLight.intensity, 0, 0.05);
      }

      // 8.5 手搖把手旋轉動態（搖獎時高速旋轉，空閒時垂落自然靜止）
      if (rolling) {
        crankGroup.rotation.x += delta * 15;
      } else {
        crankGroup.rotation.x = THREE.MathUtils.lerp(crankGroup.rotation.x, 0, 0.1);
      }

      const isSpread = stateRef.current.isSpreadView;

      // 檢測是否剛從平攤模式切回物理模擬模式：喚醒所有球體使其自然墜落回底座
      if (stateRef.current.wasSpreadView && !isSpread) {
        poolBallItems.forEach(item => {
          item.body.wakeUp();
          item.body.velocity.set(
            (Math.random() - 0.5) * 0.8,
            -1.6 - Math.random() * 0.8,
            (Math.random() - 0.5) * 0.8
          );
        });
      }
      stateRef.current.wasSpreadView = isSpread;

      if (isSpread) {
        // 平攤展示模式：停用剛體重力翻滾，柔和插值至階梯展台排布座標，工號正面朝相機
        for (let i = 0; i < poolBallItems.length; i++) {
          const item = poolBallItems[i];
          const { mesh, body, targetSpreadPos, targetSpreadRot, targetScale } = item;

          // 平滑插值位置與旋轉
          body.position.x = THREE.MathUtils.lerp(body.position.x, targetSpreadPos.x, 0.08);
          body.position.y = THREE.MathUtils.lerp(body.position.y, targetSpreadPos.y, 0.08);
          body.position.z = THREE.MathUtils.lerp(body.position.z, targetSpreadPos.z, 0.08);
          body.velocity.set(0, 0, 0);
          body.angularVelocity.set(0, 0, 0);

          mesh.position.copy(body.position);
          mesh.quaternion.slerp(targetSpreadRot, 0.10);
          body.quaternion.copy(mesh.quaternion);

          mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, targetScale || 1.0, 0.08));
        }
      } else {
        // 物理模擬模式：狂暴翻滾或空閒沉底
        for (let i = 0; i < poolBallItems.length; i++) {
          const item = poolBallItems[i];
          const body = item.body;
          const mesh = item.mesh;

          mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, 1.0, 0.1));

          if (rolling) {
            // 搖獎中：喚醒休眠，低阻尼狂暴翻滾
            if (body.sleepState === CANNON.Body.SLEEPING) {
              body.wakeUp();
            }
            body.linearDamping = 0.15;
            body.angularDamping = 0.25;

            const relX = body.position.x - SPHERE_CENTER.x;
            const relZ = body.position.z - SPHERE_CENTER.z;
            const swirlStrength = isFirst ? 11.5 : 9.5;
            const fx = -relZ * swirlStrength + (Math.random() - 0.5) * 16;
            const fz = relX * swirlStrength + (Math.random() - 0.5) * 16;
            const fy = 19 + Math.random() * 23;

            body.applyForce(new CANNON.Vec3(fx, fy, fz), body.position);
            body.angularVelocity.x += (Math.random() - 0.5) * 2.5;
            body.angularVelocity.y += (Math.random() - 0.5) * 3.5;
            body.angularVelocity.z += (Math.random() - 0.5) * 2.5;
          } else {
            // 空閒 / 沉降狀態：
            // 若球還在半空中（y >= 1.35），絕不允許休眠！強制喚醒並給予自然低阻尼，讓重力把它拉回底層，絕不懸浮空中！
            if (body.position.y >= 1.35) {
              if (body.sleepState === CANNON.Body.SLEEPING) {
                body.wakeUp();
              }
              body.linearDamping = 0.2;
              body.angularDamping = 0.3;
            } else {
              // 已落入底部托碗堆疊區：加強阻尼消散動能，平穩沉降
              body.linearDamping = 0.8;
              body.angularDamping = 0.88;

              const speedSq = body.velocity.lengthSquared();
              // 只有真正沉入底部且速度極低時，才鎖定休眠，達成 100% 絕對沉底靜止
              if (speedSq < 0.04) {
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);
                body.sleep();
              }
            }
          }

          // 核心防穿模
          const dx = body.position.x - SPHERE_CENTER.x;
          const dy = body.position.y - SPHERE_CENTER.y;
          const dz = body.position.z - SPHERE_CENTER.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const maxDist = SPHERE_RADIUS - BALL_RADIUS;

          if (dist > maxDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            const nz = dz / dist;

            body.position.x = SPHERE_CENTER.x + nx * maxDist;
            body.position.y = SPHERE_CENTER.y + ny * maxDist;
            body.position.z = SPHERE_CENTER.z + nz * maxDist;

            const dot = body.velocity.x * nx + body.velocity.y * ny + body.velocity.z * nz;
            if (dot > 0) {
              const restitution = 0.76;
              body.velocity.x -= (1 + restitution) * dot * nx;
              body.velocity.y -= (1 + restitution) * dot * ny;
              body.velocity.z -= (1 + restitution) * dot * nz;
            }
          }

          mesh.position.copy(body.position);
          mesh.quaternion.copy(body.quaternion);
        }
      }

      // --- 導軌出球動畫：沿軌道向前滾動，落杯後將工號正面朝向觀眾！ ---
      if (stateRef.current.isAnimatingChute) {
        const elapsedChuteSec = (now - stateRef.current.chuteStartTime) / 1000;
        const totalRollSec = 3.0;
        const rawProgress = Math.min(elapsedChuteSec / totalRollSec, 1.0);

        // Quad Ease-In 滾落
        const easeProgress = rawProgress * rawProgress;
        stateRef.current.chuteProgress = easeProgress;

        if (rawProgress < 1.0) {
          const curvePt = chuteCurve.getPoint(easeProgress);
          chuteBallMesh.position.copy(curvePt);
          chuteBallMesh.rotation.x += delta * 8;
          chuteBallMesh.rotation.z += delta * 10;
        } else {
          // 抵達托座
          const dropElapsed = elapsedChuteSec - totalRollSec;
          const dropDuration = 0.4;

          if (dropElapsed < dropDuration) {
            const dropRatio = dropElapsed / dropDuration;
            const bounceY = Math.abs(Math.cos(dropRatio * Math.PI * 2.5)) * (1 - dropRatio) * 0.12;
            chuteBallMesh.position.set(2.45, 0.14 + bounceY, 1.85);
          } else {
            // 平穩落定在金色托座上（y = 0.14）
            chuteBallMesh.position.set(2.45, 0.14, 1.85);

            // 【關鍵對齊】：旋轉歸零，使正面印有「工號」與「姓名」的徽章直視相機！
            chuteBallMesh.rotation.x = THREE.MathUtils.lerp(chuteBallMesh.rotation.x, 0, 0.15);
            chuteBallMesh.rotation.y = THREE.MathUtils.lerp(chuteBallMesh.rotation.y, 0, 0.15);
            chuteBallMesh.rotation.z = THREE.MathUtils.lerp(chuteBallMesh.rotation.z, 0, 0.15);
          }

          cupSpotLight.intensity = THREE.MathUtils.lerp(cupSpotLight.intensity, 2.5, 0.08);

          // 停頓 0.75 秒讓全場觀眾看清球上的工號，再彈出大卡片！
          if (dropElapsed >= 0.75 && stateRef.current.isAnimatingChute) {
            stateRef.current.isAnimatingChute = false;
            if (stateRef.current.onBallLanded) {
              stateRef.current.onBallLanded();
            }
          }
        }
      } else {
        if (!drawnWinner) {
          cupSpotLight.intensity = THREE.MathUtils.lerp(cupSpotLight.intensity, 0, 0.1);
        }
      }

      // --- 凌空入罐飛行拋物線動畫 ---
      if (collectFlightState.active) {
        const flightElapsed = (now - collectFlightState.startTime) / 1000;
        const totalDuration = 1.15; // 1.15 秒完整飛行與落定
        const progress = Math.min(flightElapsed / totalDuration, 1.0);

        const start = collectFlightState.startPos;
        const apex = collectFlightState.apexPos;
        const mouth = collectFlightState.jarMouthPos;
        const target = collectFlightState.targetPos;

        if (progress < 0.65) {
          // 階段 1：空中優雅拋物線弧線 (0.0 -> 0.65)
          const u = progress / 0.65;
          const pX = (1 - u) * (1 - u) * start.x + 2 * (1 - u) * u * apex.x + u * u * mouth.x;
          const pY = (1 - u) * (1 - u) * start.y + 2 * (1 - u) * u * apex.y + u * u * mouth.y;
          const pZ = (1 - u) * (1 - u) * start.z + 2 * (1 - u) * u * apex.z + u * u * mouth.z;
          flyingBallMesh.position.set(pX, pY, pZ);

          flyingBallMesh.rotation.x += delta * 14;
          flyingBallMesh.rotation.y += delta * 12;
          flyingBallMesh.rotation.z += delta * 8;
        } else if (progress < 0.88) {
          // 階段 2：從罐口垂直直墜入罐內目標位置 (0.65 -> 0.88)
          const u = (progress - 0.65) / 0.23;
          const easeFall = u * u;

          const pX = THREE.MathUtils.lerp(mouth.x, target.x, u);
          const pZ = THREE.MathUtils.lerp(mouth.z, target.z, u);
          const pY = THREE.MathUtils.lerp(mouth.y, target.y, easeFall);
          flyingBallMesh.position.set(pX, pY, pZ);

          flyingBallMesh.rotation.x = THREE.MathUtils.lerp(flyingBallMesh.rotation.x, -0.1, 0.15);
        } else {
          // 階段 3：落底清脆彈跳入位 (0.88 -> 1.0)
          if (!collectFlightState.hasClinked) {
            collectFlightState.hasClinked = true;
            soundManager.playJarClinkSound();
          }

          const u = (progress - 0.88) / 0.12;
          const bounceY = Math.sin(u * Math.PI) * (1 - u) * 0.08;
          flyingBallMesh.position.set(target.x, target.y + bounceY, target.z);

          const dx = camera.position.x - target.x;
          const dz = camera.position.z - target.z;
          flyingBallMesh.rotation.y = THREE.MathUtils.lerp(flyingBallMesh.rotation.y, Math.atan2(dx, dz), 0.25);
          flyingBallMesh.rotation.x = -0.1;
        }

        if (progress >= 1.0) {
          collectFlightState.active = false;
          flyingBallMesh.visible = false;

          // 正式轉入罐內固定球體
          if (stateRef.current.syncJarBalls) {
            stateRef.current.syncJarBalls(allWinnersRef.current, null);
          }
          if (stateRef.current.onBallCollectedToJar) {
            stateRef.current.onBallCollectedToJar();
          }
        }
      }

      // 飄帶與亮片
      ribbonGroup.children.forEach((r, idx) => {
        r.rotation.y = Math.sin(time * 0.7 + idx) * 0.08;
      });

      confettiMeshes.forEach(c => {
        c.position.y -= c.userData.speedY;
        c.rotation.x += c.userData.rotSpeed;
        c.rotation.y += c.userData.rotSpeed;
        if (c.position.y < -1.5) {
          c.position.y = 6.2;
          c.position.x = (Math.random() - 0.5) * 15;
        }
      });

      // 鏡頭極微幅呼吸
      camera.position.x = Math.sin(time * 0.1) * 0.25;
      camera.position.y = 1.95 + Math.cos(time * 0.15) * 0.06;
      camera.lookAt(0, 1.45, 0);

      renderer.render(scene, camera);
    };

    // 點擊事件：支援拍打玻璃彈球與點擊 3D 手搖把手
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // 1. 檢測是否點擊到 3D 金色手搖把手
      const crankHits = raycaster.intersectObjects(crankGroup.children, true);
      if (crankHits.length > 0) {
        if (stateRef.current.onHoldStart) {
          stateRef.current.onHoldStart();
        }
        return;
      }

      // 2. 檢測是否點擊中間大玻璃球（拍打玻璃彈球互動彩蛋）
      const sphereHits = raycaster.intersectObject(glassSphere, false);
      if (sphereHits.length > 0) {
        tapSphereBalls();
      }
    };

    const handlePointerUp = () => {
      if (stateRef.current.onHoldEnd) {
        stateRef.current.onHoldEnd();
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    animate();

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      }
      window.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(animId);
      while (poolBallItems.length > 0) {
        const item = poolBallItems.pop();
        globeGroup.remove(item.mesh);
        world.removeBody(item.body);
        item.mesh.material.dispose();
        item.texture.dispose();
      }
      sphereGeo.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0 overflow-hidden pointer-events-auto"
      style={{ zIndex: 1 }}
    />
  );
}
