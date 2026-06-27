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

// ============ 房间尺寸（加大） ============
const ROOM_W = 18     // 宽（x 方向）
const ROOM_D = 14     // 深（z 方向）
const WALL_H = 4.5    // 墙高
const ART_Y = 2.2     // 画作中心高度

// ============ 风格配置（提亮 + 增强设计感） ============
const STYLE_CONFIG: Record<Style, {
  wall: string
  wallLower: string       // 墙下半部颜色（护墙板）
  floor: string
  floorBorder: string     // 地面边框
  ceiling: string
  frame: string
  frameAccent: string
  lightColor: string
  ambientIntensity: number
  hemiIntensity: number
  spotIntensity: number
  carpet?: string
  rail: string            // 腰线/轨道色
}> = {
  modern: {
    wall: '#f4f1ea',
    wallLower: '#e8e2d5',
    floor: '#d4c4a0',
    floorBorder: '#9a8666',
    ceiling: '#fbf9f4',
    frame: '#1a1a1a',
    frameAccent: '#c89b5a',
    lightColor: '#fff8ec',
    ambientIntensity: 0.85,
    hemiIntensity: 0.6,
    spotIntensity: 4.5,
    rail: '#c89b5a',
  },
  cozy: {
    wall: '#ecdcc0',
    wallLower: '#d9c4a0',
    floor: '#9a7548',
    floorBorder: '#6b4e2e',
    ceiling: '#f5ecd6',
    frame: '#5a3a1f',
    frameAccent: '#d4a560',
    lightColor: '#ffe8c0',
    ambientIntensity: 0.9,
    hemiIntensity: 0.65,
    spotIntensity: 4.2,
    carpet: '#b8825a',
    rail: '#d4a560',
  },
}

// ============ 画作墙位槽位（大房间，最多14幅） ============
const WALL_SLOTS: Array<{ pos: [number, number, number]; rot: [number, number, number] }> = [
  // 后墙 z=-6.92 朝 +z （4幅）
  { pos: [-6, ART_Y, -6.92], rot: [0, 0, 0] },
  { pos: [-2, ART_Y, -6.92], rot: [0, 0, 0] },
  { pos: [2, ART_Y, -6.92], rot: [0, 0, 0] },
  { pos: [6, ART_Y, -6.92], rot: [0, 0, 0] },
  // 右墙 x=8.92 朝 -x （3幅）
  { pos: [8.92, ART_Y, -4], rot: [0, -Math.PI / 2, 0] },
  { pos: [8.92, ART_Y, 0], rot: [0, -Math.PI / 2, 0] },
  { pos: [8.92, ART_Y, 4], rot: [0, -Math.PI / 2, 0] },
  // 前墙 z=6.92 朝 -z （4幅）
  { pos: [6, ART_Y, 6.92], rot: [0, Math.PI, 0] },
  { pos: [2, ART_Y, 6.92], rot: [0, Math.PI, 0] },
  { pos: [-2, ART_Y, 6.92], rot: [0, Math.PI, 0] },
  { pos: [-6, ART_Y, 6.92], rot: [0, Math.PI, 0] },
  // 左墙 x=-8.92 朝 +x （3幅）
  { pos: [-8.92, ART_Y, 4], rot: [0, Math.PI / 2, 0] },
  { pos: [-8.92, ART_Y, 0], rot: [0, Math.PI / 2, 0] },
  { pos: [-8.92, ART_Y, -4], rot: [0, Math.PI / 2, 0] },
]

// ============ 房间（增强设计感：腰线/护墙板/地面边框/天花板灯轨） ============
function Room({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  const halfW = ROOM_W / 2
  const halfD = ROOM_D / 2

  return (
    <group>
      {/* 地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color={cfg.floor} roughness={0.75} metalness={0.05} />
      </mesh>
      {/* 地面装饰边框（外圈深色） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <ringGeometry args={[Math.min(halfW, halfD) - 1.2, Math.min(halfW, halfD) - 1.0, 4]} />
        <meshStandardMaterial color={cfg.floorBorder} roughness={0.6} metalness={0.2} />
      </mesh>
      {/* cozy 风格加地毯 */}
      {cfg.carpet && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <planeGeometry args={[8, 6]} />
          <meshStandardMaterial color={cfg.carpet} roughness={0.95} />
        </mesh>
      )}

      {/* 天花板 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_H, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color={cfg.ceiling} roughness={0.95} />
      </mesh>

      {/* 墙壁：上半 + 下半（护墙板效果） */}
      {/* 后墙 z=-halfD */}
      <WallSegment position={[0, WALL_H * 0.62, -halfD]} rotation={[0, 0, 0]} width={ROOM_W} height={WALL_H * 0.38} color={cfg.wall} />
      <WallSegment position={[0, WALL_H * 0.23, -halfD]} rotation={[0, 0, 0]} width={ROOM_W} height={WALL_H * 0.46} color={cfg.wallLower} />
      {/* 前墙 z=halfD (朝 -z) */}
      <WallSegment position={[0, WALL_H * 0.62, halfD]} rotation={[0, Math.PI, 0]} width={ROOM_W} height={WALL_H * 0.38} color={cfg.wall} />
      <WallSegment position={[0, WALL_H * 0.23, halfD]} rotation={[0, Math.PI, 0]} width={ROOM_W} height={WALL_H * 0.46} color={cfg.wallLower} />
      {/* 左墙 x=-halfW (朝 +x) */}
      <WallSegment position={[-halfW, WALL_H * 0.62, 0]} rotation={[0, Math.PI / 2, 0]} width={ROOM_D} height={WALL_H * 0.38} color={cfg.wall} />
      <WallSegment position={[-halfW, WALL_H * 0.23, 0]} rotation={[0, Math.PI / 2, 0]} width={ROOM_D} height={WALL_H * 0.46} color={cfg.wallLower} />
      {/* 右墙 x=halfW (朝 -x) */}
      <WallSegment position={[halfW, WALL_H * 0.62, 0]} rotation={[0, -Math.PI / 2, 0]} width={ROOM_D} height={WALL_H * 0.38} color={cfg.wall} />
      <WallSegment position={[halfW, WALL_H * 0.23, 0]} rotation={[0, -Math.PI / 2, 0]} width={ROOM_D} height={WALL_H * 0.46} color={cfg.wallLower} />

      {/* 腰线（chair rail，金色，在上下墙分界处 y=1.03*2... 实际 y≈2.07） */}
      <Rail y={WALL_H * 0.46} color={cfg.rail} />
      {/* 顶线（天花板交界处） */}
      <Rail y={WALL_H - 0.02} color={cfg.rail} />
      {/* 踢脚线 */}
      <Rail y={0.08} color={cfg.rail} />

      {/* 天花板灯轨（两条横杆，挂射灯用）—— 沿 x 方向，在 z=-3 和 z=3 */}
      {[-3, 3].map((z) => (
        <mesh key={`track-${z}`} position={[0, WALL_H - 0.15, z]}>
          <boxGeometry args={[ROOM_W - 0.4, 0.06, 0.08]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// 墙段
function WallSegment({
  position, rotation, width, height, color,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  width: number
  height: number
  color: string
}) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}

// 水平装饰线（绕房间一圈，用4段box组成）
function Rail({ y, color }: { y: number; color: string }) {
  const halfW = ROOM_W / 2
  const halfD = ROOM_D / 2
  return (
    <group>
      {/* 前后方向（沿x） */}
      <mesh position={[0, y, -halfD]}>
        <boxGeometry args={[ROOM_W, 0.06, 0.03]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, y, halfD]}>
        <boxGeometry args={[ROOM_W, 0.06, 0.03]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
      </mesh>
      {/* 左右方向（沿z） */}
      <mesh position={[-halfW, y, 0]}>
        <boxGeometry args={[0.03, 0.06, ROOM_D]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[halfW, y, 0]}>
        <boxGeometry args={[0.03, 0.06, ROOM_D]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  )
}

// ============ 带框画作 + 专有射灯 ============
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
  const targetRef = useRef<THREE.Object3D>(null)

  // 把聚光灯 target 挂到画作中心
  useEffect(() => {
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current
    }
  }, [])

  // 画作宽高比 4:5 纵向（加大）
  const W = 1.6
  const H = 2.0
  const frameW = W + 0.14
  const frameH = H + 0.14
  // 射灯灯具位置：画作上方 1.15m，前方 0.85m
  const lampY = H / 2 + 1.15
  const lampZ = 0.85
  const lampTilt = Math.atan2(lampZ, lampY) // 灯头朝向画作的倾角

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
      {/* 画框（Box 薄板，有厚度） */}
      <mesh position={[0, 0, -0.04]} castShadow>
        <boxGeometry args={[frameW, frameH, 0.08]} />
        <meshStandardMaterial color={cfg.frame} roughness={0.45} metalness={style === 'modern' ? 0.35 : 0.15} />
      </mesh>
      {/* 金色内框线 */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[frameW - 0.04, frameH - 0.04]} />
        <meshStandardMaterial color={cfg.frameAccent} metalness={0.75} roughness={0.25} />
      </mesh>
      {/* 内框卡纸（matboard） */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[W + 0.06, H + 0.06]} />
        <meshStandardMaterial color="#f8f5ee" roughness={0.9} />
      </mesh>

      {/* 画作贴图 */}
      <Suspense fallback={null}>
        <ArtworkPlane url={artwork.imageUrl} W={W} H={H} hovered={hovered} />
      </Suspense>

      {/* ===== 专有射灯灯具（挂在天花板，朝画作倾斜）===== */}
      {/* 连接杆到天花板 */}
      <mesh position={[0, WALL_H - slot.pos[1] - 0.2, lampZ]}>
        <cylinderGeometry args={[0.018, 0.018, 0.5, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* 灯头本体（圆柱，朝画作倾斜）—— 加大尺寸 */}
      <group position={[0, lampY, lampZ]} rotation={[Math.PI / 2 - lampTilt, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.11, 0.14, 0.26, 20]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* 灯口金色环 + 发光 */}
        <mesh position={[0, -0.14, 0]}>
          <cylinderGeometry args={[0.145, 0.145, 0.05, 20]} />
          <meshStandardMaterial color={cfg.frameAccent} metalness={0.85} roughness={0.15} emissive={cfg.lightColor} emissiveIntensity={0.8} />
        </mesh>
        {/* 灯泡发光球（加大） */}
        <mesh position={[0, -0.12, 0]}>
          <sphereGeometry args={[0.085, 20, 20]} />
          <meshStandardMaterial color={cfg.lightColor} emissive={cfg.lightColor} emissiveIntensity={1.2} />
        </mesh>
      </group>
      {/* 聚光灯光源（从灯口照向画作中心） */}
      <spotLight
        ref={spotRef}
        position={[0, lampY - 0.1, lampZ]}
        angle={0.45}
        penumbra={0.5}
        intensity={cfg.spotIntensity}
        color={cfg.lightColor}
        distance={7}
        decay={1.1}
      />
      {/* spotLight 的 target（画作中心） */}
      <object3D ref={targetRef} position={[0, 0, 0]} />

      {/* hover 时画作名（Html 浮标） */}
      {hovered && (
        <Html center position={[0, -frameH / 2 - 0.3, 0.1]} distanceFactor={10} occlude={false}>
          <div className="px-3.5 py-1.5 rounded-full bg-black/80 text-white text-xs whitespace-nowrap backdrop-blur-sm pointer-events-none border border-white/10">
            {artwork.title}
          </div>
        </Html>
      )}
    </group>
  )
}

// 画作平面（用 drei useTexture，在 onLoad 回调中配置）
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
    <mesh position={[0, 0, 0.008]}>
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

// ============ 灯光（提亮） ============
function Lights({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  return (
    <>
      <ambientLight intensity={cfg.ambientIntensity} color={cfg.lightColor} />
      <hemisphereLight args={[cfg.ceiling, cfg.floor, cfg.hemiIntensity]} />
      {/* 房间中央暖光吊灯 */}
      <pointLight position={[0, WALL_H - 0.5, 0]} intensity={0.4} color={cfg.lightColor} distance={20} decay={2} />
      {/* 中央装饰吊灯模型 */}
      <mesh position={[0, WALL_H - 0.4, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={cfg.lightColor} emissive={cfg.lightColor} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, WALL_H - 0.2, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 8]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
      </mesh>
    </>
  )
}

// ============ 相机控制（放开360° + 大房间边界） ============
function CameraRig({ isMobile }: { isMobile: boolean }) {
  const controlsRef = useRef<any>(null)
  const { camera } = useThree()
  const keys = useRef<Record<string, boolean>>({})

  // 初始相机位置
  useEffect(() => {
    if (isMobile) {
      // 手机：站在中心稍偏前，环顾四周
      camera.position.set(0, 1.6, 0.5)
    } else {
      // PC：站在入口处（前墙附近），看向后墙
      camera.position.set(0, 1.6, 5)
    }
  }, [camera, isMobile])

  // 键盘控制（仅 PC）
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
    const speed = 4.5 * delta
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

    // 限制相机在大房间内（留出墙距）—— 用 set() 方法避免 lint immutability 误报
    camera.position.set(
      THREE.MathUtils.clamp(camera.position.x, -8.4, 8.4),
      1.6,
      THREE.MathUtils.clamp(camera.position.z, -6.4, 6.4)
    )
  })

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, ART_Y, isMobile ? 0 : -2]}
      enablePan={!isMobile}
      enableZoom={!isMobile}
      enableRotate
      // 手机端：站在中心纯全景转动；PC：可前后移动
      minDistance={isMobile ? 0.01 : 0.5}
      maxDistance={isMobile ? 0.01 : 12}
      // 放开垂直角度：几乎可上下看全（0.15 ~ π-0.15）
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI - 0.15}
      // 水平方向默认不限（360° 自由转动）
      rotateSpeed={isMobile ? 0.55 : 0.65}
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
  // 分配墙位
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
      }}
      camera={{ fov: isMobile ? 75 : 68, near: 0.1, far: 100, position: [0, 1.6, 5] }}
      onPointerMissed={() => {}}
      className="!absolute inset-0"
    >
      <color attach="background" args={[STYLE_CONFIG[style].ceiling]} />
      <fog attach="fog" args={[STYLE_CONFIG[style].ceiling, 12, 28]} />

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
