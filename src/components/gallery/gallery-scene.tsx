'use client'

import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, useTexture, Html, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { useState, useRef, useEffect, useMemo, Suspense } from 'react'

// ============ 类型 ============
export interface Artwork3D {
  id: string
  title: string
  imageUrl: string
  artworkDate: string | null
  description: string | null
  order: number
}

type Style = 'modern' | 'cozy'

// ============ 房间尺寸 ============
const ROOM_W = 14     // 宽（x）
const ROOM_D = 11     // 深（z）
const WALL_H = 4.62   // 墙高 (+10%)

// ============ 风格配置（参考视频：明亮简洁，木地板，白框，轨道射灯有光斑） ============
// ============ 风格配置（参考图：灰色墙+浅灰顶+白地+黑色画框+暖白聚光+墙顶灯带） ============
const STYLE_CONFIG: Record<Style, {
  wall: string           // 墙面（中灰）
  ceiling: string        // 天花板（浅灰）
  floor: string          // 地面（白）
  floorStripe: string
  frame: string          // 画框（黑）
  frameAccent: string
  lightColor: string     // 射灯暖白光
  ledColor: string       // 灯带颜色
  ambient: number
  hemi: number
  spot: number
  beamOpacity: number
}> = {
  modern: {
    wall: '#d0d0d0',        // 中灰墙面 +20%亮度
    ceiling: '#e8e8e8',     // 浅灰天花板 +20%
    floor: '#f8f8f8',       // 白色地面 +20%
    floorStripe: '#e0e0e0',
    frame: '#1a1a1a',       // 黑色画框
    frameAccent: '#888888',
    lightColor: '#fff5e0',  // 暖白射灯光
    ledColor: '#ffffff',    // 纯白灯带
    ambient: 0.54,          // +20% (0.45→0.54)
    hemi: 0.48,             // +20% (0.4→0.48)
    spot: 14,
    beamOpacity: 0.18,
  },
  cozy: {
    wall: '#d0d0d0',        // +20%
    ceiling: '#e8e8e8',     // +20%
    floor: '#f8f8f8',       // +20%
    floorStripe: '#e0e0e0',
    frame: '#1a1a1a',
    frameAccent: '#888888',
    lightColor: '#fff0d8',  // cozy 略暖
    ledColor: '#fff5e8',
    ambient: 0.6,           // +20% (0.5→0.6)
    hemi: 0.54,             // +20% (0.45→0.54)
    spot: 13,
    beamOpacity: 0.18,
  },
}

// ============ 画作墙位槽位（单排，画作居中悬挂 y=2.0） ============
const ART_Y = 2.0
const WALL_SLOTS: Array<{ pos: [number, number, number]; rot: [number, number, number] }> = [
  // 后墙 z=-5.42 朝 +z （4幅）
  { pos: [-4.5, ART_Y, -5.42], rot: [0, 0, 0] },
  { pos: [-1.5, ART_Y, -5.42], rot: [0, 0, 0] },
  { pos: [1.5, ART_Y, -5.42], rot: [0, 0, 0] },
  { pos: [4.5, ART_Y, -5.42], rot: [0, 0, 0] },
  // 右墙 x=6.92 朝 -x （3幅）
  { pos: [6.92, ART_Y, -2.5], rot: [0, -Math.PI / 2, 0] },
  { pos: [6.92, ART_Y, 0], rot: [0, -Math.PI / 2, 0] },
  { pos: [6.92, ART_Y, 2.5], rot: [0, -Math.PI / 2, 0] },
  // 前墙 z=5.42 朝 -z （4幅）
  { pos: [4.5, ART_Y, 5.42], rot: [0, Math.PI, 0] },
  { pos: [1.5, ART_Y, 5.42], rot: [0, Math.PI, 0] },
  { pos: [-1.5, ART_Y, 5.42], rot: [0, Math.PI, 0] },
  { pos: [-4.5, ART_Y, 5.42], rot: [0, Math.PI, 0] },
  // 左墙 x=-6.92 朝 +x （3幅）
  { pos: [-6.92, ART_Y, 2.5], rot: [0, Math.PI / 2, 0] },
  { pos: [-6.92, ART_Y, 0], rot: [0, Math.PI / 2, 0] },
  { pos: [-6.92, ART_Y, -2.5], rot: [0, Math.PI / 2, 0] },
]

// ============ 白色地面（简洁哑光，带轻微自发光） ============
function Floor({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM_W, ROOM_D]} />
      <meshStandardMaterial color={cfg.floor} roughness={0.6} metalness={0.05} emissive={cfg.floor} emissiveIntensity={0.2} />
    </mesh>
  )
}

// ============ 房间（墙+顶+地面+墙顶灯带） ============
function Room({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  const halfW = ROOM_W / 2
  const halfD = ROOM_D / 2

  return (
    <group>
      <Floor style={style} />

      {/* 天花板（浅灰，稍带自发光） */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_H, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color={cfg.ceiling} roughness={0.95} emissive={cfg.ceiling} emissiveIntensity={0.15} />
      </mesh>

      {/* 四面墙（中灰，带轻微自发光提升亮度） */}
      <mesh position={[0, WALL_H / 2, -halfD]} receiveShadow>
        <planeGeometry args={[ROOM_W, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} emissive={cfg.wall} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, WALL_H / 2, halfD]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} emissive={cfg.wall} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[-halfW, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} emissive={cfg.wall} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[halfW, WALL_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} emissive={cfg.wall} emissiveIntensity={0.2} />
      </mesh>

      {/* ===== 墙顶灯带（4条，沿墙顶交界处，发光线条分隔墙和顶）===== */}
      <WallLEDStrip style={style} />

      {/* 中央茶几 */}
      <TeaTable style={style} />
    </group>
  )
}

// ============ 墙顶灯带（4条发光条，沿墙顶交界） ============
function WallLEDStrip({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  const halfW = ROOM_W / 2
  const halfD = ROOM_D / 2
  const stripY = WALL_H - 0.05  // 灯带贴近墙顶
  // 灯带：细长发光条 + 向下照射的条形光
  const strips = [
    { pos: [0, stripY, -halfD + 0.02] as [number, number, number], rot: [0, 0, 0] as [number, number, number], w: ROOM_W },
    { pos: [0, stripY, halfD - 0.02] as [number, number, number], rot: [0, Math.PI, 0] as [number, number, number], w: ROOM_W },
    { pos: [-halfW + 0.02, stripY, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], w: ROOM_D },
    { pos: [halfW - 0.02, stripY, 0] as [number, number, number], rot: [0, -Math.PI / 2, 0] as [number, number, number], w: ROOM_D },
  ]
  return (
    <group>
      {strips.map((s, i) => (
        <group key={i} position={s.pos} rotation={s.rot}>
          {/* 发光条（薄长方体，自发光） */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[s.w, 0.04, 0.02]} />
            <meshStandardMaterial
              color={cfg.ledColor}
              emissive={cfg.ledColor}
              emissiveIntensity={2.5}
              toneMapped={false}
            />
          </mesh>
          {/* 条形光源（向下照亮墙面） */}
          <rectAreaLight
            position={[0, -0.1, 0.1]}
            width={s.w}
            height={0.3}
            intensity={3}
            color={cfg.ledColor}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        </group>
      ))}
    </group>
  )
}

// ============ 中央茶几 ============
function TeaTable({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  // 茶几颜色：modern 用深木色，cozy 用暖木色
  const tableColor = style === 'modern' ? '#5a4530' : '#7a5a3a'
  const topY = 0.42   // 桌面高度
  const topW = 1.8    // 桌面宽
  const topD = 1.0    // 桌面深
  const topT = 0.06   // 桌面厚

  return (
    <group position={[0, 0, 0]}>
      {/* 桌面 */}
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <boxGeometry args={[topW, topT, topD]} />
        <meshStandardMaterial color={tableColor} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* 桌面边缘高光条（金色） */}
      <mesh position={[0, topY + topT / 2, 0]}>
        <boxGeometry args={[topW, 0.005, topD]} />
        <meshStandardMaterial color={cfg.frameAccent} metalness={0.7} roughness={0.25} />
      </mesh>
      {/* 四条桌腿 */}
      {[
        [topW / 2 - 0.08, topD / 2 - 0.08],
        [-(topW / 2 - 0.08), topD / 2 - 0.08],
        [topW / 2 - 0.08, -(topD / 2 - 0.08)],
        [-(topW / 2 - 0.08), -(topD / 2 - 0.08)],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, topY / 2, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, topY, 12]} />
          <meshStandardMaterial color={tableColor} roughness={0.5} metalness={0.1} />
        </mesh>
      ))}
      {/* 桌上装饰：一个小花瓶 */}
      <mesh position={[0, topY + topT / 2 + 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.24, 16]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* 花瓶口 */}
      <mesh position={[0, topY + topT / 2 + 0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.04, 16]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* 花（几个小球） */}
      {[
        [0, topY + topT / 2 + 0.32, 0],
        [0.05, topY + topT / 2 + 0.30, 0.02],
        [-0.04, topY + topT / 2 + 0.31, -0.02],
      ].map(([x, y, z], i) => (
        <mesh key={`flower-${i}`} position={[x, y, z]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color={i === 0 ? '#d4655a' : i === 1 ? '#e8a050' : '#c84860'} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ============ 带框画作 + 轨道射灯（光斑打在画上） ============
function FramedArtwork({
  artwork,
  slot,
  style,
  onSelect,
}: {
  artwork: Artwork3D
  slot: { pos: [number, number, number]; rot: [number, number, number] }
  style: Style
  onSelect: (a: Artwork3D) => void
}) {
  const cfg = STYLE_CONFIG[style]
  const [hovered, setHovered] = useState(false)
  const spotRef = useRef<THREE.SpotLight>(null)
  const targetObj = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    if (spotRef.current) {
      spotRef.current.target = targetObj
    }
  }, [targetObj])

  // 画作尺寸（单排，4:5纵向）
  const W = 1.5
  const H = 1.88
  // 画框：黑色细框
  const frameThickness = 0.05
  const frameW = W + frameThickness * 2
  const frameH = H + frameThickness * 2
  // 射灯：嵌入式，从天花板斜向下照画作（光斑精准覆盖画作中心）
  // 灯在画作上方稍前方，target 对准画作中心 [0,0,0]，光斑自然落在画上
  const lampY = WALL_H - slot.pos[1] - 0.05   // 灯贴天花板
  const lampZ = 0.15                           // 灯在画作前方0.15m（小偏移，让光斜照到画面）
  const beamAngle = 0.576                      // 聚光角度（再+20%照射面积）

  return (
    <group
      position={slot.pos}
      rotation={slot.rot}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onSelect(artwork)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      {/* 画框（黑色，简约） */}
      <mesh position={[0, 0, -0.03]} castShadow>
        <boxGeometry args={[frameW, frameH, 0.06]} />
        <meshStandardMaterial color={cfg.frame} roughness={0.5} metalness={0.1} />
      </mesh>

      {/* 画作贴图 */}
      <Suspense fallback={null}>
        <ArtworkPlane url={artwork.imageUrl} W={W} H={H} hovered={hovered} />
      </Suspense>

      {/* ===== 嵌入式射灯（无可见灯具，光斑精准对准画作中心）===== */}
      {/* 天花板上极小的灯点（几乎看不见） */}
      <mesh position={[0, lampY, lampZ]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* 聚光灯光源（从天花板照向画作中心，光斑覆盖画作） */}
      <spotLight
        ref={spotRef}
        position={[0, lampY, lampZ]}
        angle={beamAngle}
        penumbra={0.5}
        intensity={cfg.spot}
        color={cfg.lightColor}
        distance={8}
        decay={0.8}
      />
      {/* spotLight target 精准对准画作中心 [0,0,0] */}
      <primitive object={targetObj} position={[0, 0, 0]} />

      {/* hover 时画作名 */}
      {hovered && (
        <Html center position={[0, -frameH / 2 - 0.25, 0.1]} distanceFactor={10} occlude={false}>
          <div className="px-3 py-1 rounded-full bg-black/80 text-white text-xs whitespace-nowrap backdrop-blur-sm pointer-events-none border border-white/10">
            {artwork.title}
          </div>
        </Html>
      )}
    </group>
  )
}

// 画作平面
function ArtworkPlane({
  url,
  W,
  H,
  hovered,
}: {
  url: string
  W: number
  H: number
  hovered: boolean
}) {
  const texture = useTexture(url, (t) => {
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
  })

  return (
    <mesh position={[0, 0, 0.005]}>
      <planeGeometry args={[W, H]} />
      <meshStandardMaterial
        map={texture}
        color="#ffffff"
        roughness={0.55}
        metalness={0}
        emissive={hovered ? '#ffffff' : '#000000'}
        emissiveIntensity={hovered ? 0.1 : 0}
        emissiveMap={texture}
      />
    </mesh>
  )
}

// ============ 灯光（环境光适中，突出射灯光斑） ============
function Lights({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  return (
    <>
      <ambientLight intensity={cfg.ambient} color={cfg.lightColor} />
      <hemisphereLight args={[cfg.ceiling, cfg.floor, cfg.hemi]} />
      {/* 中央暖光吊灯 */}
      <pointLight position={[0, WALL_H - 0.5, 0]} intensity={0.2} color={cfg.lightColor} distance={14} decay={2} />
      <mesh position={[0, WALL_H - 0.3, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={cfg.lightColor} emissive={cfg.lightColor} emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, WALL_H - 0.15, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.25, 8]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
      </mesh>
    </>
  )
}

// ============ 相机控制（反转滑动方向） ============
function CameraRig({ isMobile }: { isMobile: boolean }) {
  const controlsRef = useRef<any>(null)
  const { camera } = useThree()
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    // 移动端与 PC 端同步：站在入口处（z=4），看向后墙
    camera.position.set(0, 1.6, 4)
  }, [camera, isMobile])

  useEffect(() => {
    if (isMobile) return
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keys.current[k] = true
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [isMobile])

  useFrame((_, delta) => {
    if (isMobile) return
    const speed = 4 * delta
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    if (forward.lengthSq() > 0) forward.normalize()
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    const move = new THREE.Vector3()
    if (keys.current['w'] || keys.current['arrowup']) move.add(forward)
    if (keys.current['s'] || keys.current['arrowdown']) move.sub(forward)
    if (keys.current['a'] || keys.current['arrowleft']) move.sub(right)
    if (keys.current['d'] || keys.current['arrowright']) move.add(right)

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed)
      camera.position.add(move)
      if (controlsRef.current) {
        controlsRef.current.target.add(move)
      }
    }

    camera.position.set(
      THREE.MathUtils.clamp(camera.position.x, -6.4, 6.4),
      1.6,
      THREE.MathUtils.clamp(camera.position.z, -4.9, 4.9)
    )
  })

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 1.6, -1.5]}
      enablePan={!isMobile}
      // 移动端允许双指缩放，能在房间内移动观察
      enableZoom
      enableRotate
      minDistance={isMobile ? 0.5 : 0.5}
      maxDistance={isMobile ? 8 : 10}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI - 0.25}
      rotateSpeed={isMobile ? -0.55 : -0.65}
      zoomSpeed={0.9}
      enableDamping
      dampingFactor={0.08}
      makeDefault
    />
  )
}

// ============ 加载进度浮层 ============
function SceneLoader() {
  const { progress, active } = useProgress()
  if (!active && progress >= 100) return null
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-black/70 backdrop-blur-md text-white">
        <div className="w-10 h-10 border-2 border-white/30 rounded-full animate-spin" style={{ borderTopColor: 'var(--gold)' }} />
        <p className="text-sm">展厅布置中 · {Math.round(progress)}%</p>
      </div>
    </Html>
  )
}

// ============ 主场景 ============
export function GalleryScene({
  artworks,
  style,
  onSelect,
  isMobile,
}: {
  artworks: Artwork3D[]
  style: Style
  onSelect: (a: Artwork3D) => void
  isMobile: boolean
}) {
  const placed = useMemo(() => {
    return artworks.slice(0, WALL_SLOTS.length).map((a, i) => ({
      artwork: a,
      slot: WALL_SLOTS[i],
    }))
  }, [artworks])

  return (
    <Canvas
      shadows={false}
      dpr={[1, isMobile ? 1.5 : 2]}
      gl={{
        antialias: !isMobile,
        powerPreference: 'high-performance',
        alpha: false,
        toneMapping: THREE.NoToneMapping,
      }}
      camera={{ fov: isMobile ? 85 : 70, near: 0.1, far: 100, position: [0, 1.6, 4] }}
      onPointerMissed={() => {}}
      className="!absolute inset-0"
    >
      <color attach="background" args={[STYLE_CONFIG[style].ceiling]} />
      <fog attach="fog" args={[STYLE_CONFIG[style].ceiling, 18, 35]} />

      <Suspense fallback={<SceneLoader />}>
        <Lights style={style} />
        <Room style={style} />
        {placed.map(({ artwork, slot }) => (
          <FramedArtwork
            key={artwork.id}
            artwork={artwork}
            slot={slot}
            style={style}
            onSelect={onSelect}
          />
        ))}
        <CameraRig isMobile={isMobile} />
      </Suspense>
    </Canvas>
  )
}
