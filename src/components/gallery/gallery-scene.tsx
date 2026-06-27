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

// ============ 房间尺寸（缩小20%：14×11） ============
const ROOM_W = 14     // 宽（x）
const ROOM_D = 11     // 深（z）
const WALL_H = 4.2    // 墙高
const ART_Y = 2.1     // 画作中心高度

// ============ 风格配置（简洁、明亮） ============
const STYLE_CONFIG: Record<Style, {
  wall: string
  floor: string
  ceiling: string
  frame: string
  frameAccent: string
  lightColor: string
  ambient: number
  hemi: number
  spot: number
  carpet?: string
}> = {
  modern: {
    wall: '#f2efe8',
    floor: '#cfc0a0',
    ceiling: '#faf8f3',
    frame: '#1a1a1a',
    frameAccent: '#c89b5a',
    lightColor: '#fff8ec',
    ambient: 0.55,
    hemi: 0.5,
    spot: 8,
  },
  cozy: {
    wall: '#e8d8be',
    floor: '#9a7548',
    ceiling: '#f3e8d2',
    frame: '#5a3a1f',
    frameAccent: '#d4a560',
    lightColor: '#ffe8c0',
    ambient: 0.6,
    hemi: 0.55,
    spot: 7.5,
    carpet: '#b8825a',
  },
}

// ============ 画作墙位槽位（14幅，间距3m） ============
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

// ============ 房间（简洁：只保留墙/地/顶，无多余线条） ============
function Room({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  const halfW = ROOM_W / 2
  const halfD = ROOM_D / 2

  return (
    <group>
      {/* 地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color={cfg.floor} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* cozy 风格加地毯 */}
      {cfg.carpet && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <planeGeometry args={[7, 5]} />
          <meshStandardMaterial color={cfg.carpet} roughness={0.95} />
        </mesh>
      )}

      {/* 天花板 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_H, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color={cfg.ceiling} roughness={0.95} />
      </mesh>

      {/* 四面墙（单色，无分色无腰线） */}
      <mesh position={[0, WALL_H / 2, -halfD]} receiveShadow>
        <planeGeometry args={[ROOM_W, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, WALL_H / 2, halfD]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} />
      </mesh>
      <mesh position={[-halfW, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} />
      </mesh>
      <mesh position={[halfW, WALL_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} />
      </mesh>
    </group>
  )
}

// ============ 带框画作 + 专有射灯（真正射出光束） ============
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

  // 把 spotLight 的 target 挂到画作中心
  useEffect(() => {
    if (spotRef.current) {
      spotRef.current.target = targetObj
    }
  }, [targetObj])

  // 画作尺寸（4:5）
  const W = 1.5
  const H = 1.88
  const frameW = W + 0.12
  const frameH = H + 0.12
  // 射灯位置：画作上方 1.1m，前方 0.75m
  const lampY = H / 2 + 1.1
  const lampZ = 0.75
  // 光束参数
  const beamLen = Math.sqrt(lampY * lampY + lampZ * lampZ)
  const beamAngle = 0.32
  const beamR = beamLen * Math.tan(beamAngle)

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
      {/* 画框 */}
      <mesh position={[0, 0, -0.04]} castShadow>
        <boxGeometry args={[frameW, frameH, 0.08]} />
        <meshStandardMaterial color={cfg.frame} roughness={0.45} metalness={style === 'modern' ? 0.35 : 0.15} />
      </mesh>
      {/* 金色内框线 */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[frameW - 0.04, frameH - 0.04]} />
        <meshStandardMaterial color={cfg.frameAccent} metalness={0.75} roughness={0.25} />
      </mesh>
      {/* 卡纸 */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[W + 0.06, H + 0.06]} />
        <meshStandardMaterial color="#f8f5ee" roughness={0.9} />
      </mesh>

      {/* 画作贴图 */}
      <Suspense fallback={null}>
        <ArtworkPlane url={artwork.imageUrl} W={W} H={H} hovered={hovered} />
      </Suspense>

      {/* ===== 专有射灯：灯具 + 可见光束 + 光源 ===== */}
      {/* 连接杆到天花板 */}
      <mesh position={[0, WALL_H - slot.pos[1] - 0.15, lampZ]}>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* 灯头本体（朝画作倾斜） */}
      <group position={[0, lampY, lampZ]} rotation={[Math.PI / 2 - Math.atan2(lampZ, lampY), 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.11, 0.22, 20]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* 灯口金色环 */}
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.115, 0.115, 0.04, 20]} />
          <meshStandardMaterial color={cfg.frameAccent} metalness={0.85} roughness={0.15} emissive={cfg.lightColor} emissiveIntensity={0.6} />
        </mesh>
        {/* 灯泡发光球 */}
        <mesh position={[0, -0.1, 0]}>
          <sphereGeometry args={[0.07, 20, 20]} />
          <meshStandardMaterial color={cfg.lightColor} emissive={cfg.lightColor} emissiveIntensity={1.5} />
        </mesh>
      </group>

      {/* 可见光束（半透明圆锥，从灯头到画作） */}
      <mesh
        position={[0, lampY / 2, lampZ / 2]}
        rotation={[-Math.atan2(lampZ, lampY), 0, 0]}
      >
        <coneGeometry args={[beamR, beamLen, 24, 1, true]} />
        <meshBasicMaterial
          color={cfg.lightColor}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 聚光灯光源（真正照亮画作） */}
      <spotLight
        ref={spotRef}
        position={[0, lampY - 0.05, lampZ]}
        angle={beamAngle}
        penumbra={0.4}
        intensity={cfg.spot}
        color={cfg.lightColor}
        distance={6}
        decay={0.8}
      />
      {/* spotLight target（画作中心，通过 primitive 加入场景） */}
      <primitive object={targetObj} position={[0, 0, 0]} />

      {/* hover 时画作名 */}
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

// ============ 灯光（环境光适中，让射灯效果突出） ============
function Lights({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  return (
    <>
      <ambientLight intensity={cfg.ambient} color={cfg.lightColor} />
      <hemisphereLight args={[cfg.ceiling, cfg.floor, cfg.hemi]} />
      {/* 中央暖光吊灯 */}
      <pointLight position={[0, WALL_H - 0.5, 0]} intensity={0.25} color={cfg.lightColor} distance={16} decay={2} />
      <mesh position={[0, WALL_H - 0.35, 0]}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color={cfg.lightColor} emissive={cfg.lightColor} emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, WALL_H - 0.18, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.3, 8]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
      </mesh>
    </>
  )
}

// ============ 相机控制（反转滑动方向 + 缩小后的边界） ============
function CameraRig({ isMobile }: { isMobile: boolean }) {
  const controlsRef = useRef<any>(null)
  const { camera } = useThree()
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    if (isMobile) {
      camera.position.set(0, 1.6, 0.5)
    } else {
      camera.position.set(0, 1.6, 4)
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

    // 限制相机在缩小的房间内
    camera.position.set(
      THREE.MathUtils.clamp(camera.position.x, -6.4, 6.4),
      1.6,
      THREE.MathUtils.clamp(camera.position.z, -4.9, 4.9)
    )
  })

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, ART_Y, isMobile ? 0 : -1.5]}
      enablePan={!isMobile}
      enableZoom={!isMobile}
      enableRotate
      minDistance={isMobile ? 0.01 : 0.5}
      maxDistance={isMobile ? 0.01 : 10}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI - 0.2}
      // 反转旋转方向：负值让"向右滑→视角向右转"（符合直觉）
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
      }}
      camera={{ fov: isMobile ? 75 : 68, near: 0.1, far: 100, position: [0, 1.6, 4] }}
      onPointerMissed={() => {}}
      className="!absolute inset-0"
    >
      <color attach="background" args={[STYLE_CONFIG[style].ceiling]} />
      <fog attach="fog" args={[STYLE_CONFIG[style].ceiling, 10, 24]} />

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
