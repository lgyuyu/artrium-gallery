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

// ============ 风格配置 ============
const STYLE_CONFIG: Record<Style, {
  wall: string
  floor: string
  ceiling: string
  frame: string
  frameAccent: string
  lightColor: string
  ambientIntensity: number
  spotIntensity: number
  carpet?: string
}> = {
  modern: {
    wall: '#f0ede6',
    floor: '#c9b896',
    ceiling: '#faf8f3',
    frame: '#1a1a1a',
    frameAccent: '#b8895a',
    lightColor: '#ffffff',
    ambientIntensity: 0.45,
    spotIntensity: 2.2,
  },
  cozy: {
    wall: '#e6d6bc',
    floor: '#8b6a43',
    ceiling: '#f2e8d4',
    frame: '#5a3a1f',
    frameAccent: '#c89b5a',
    lightColor: '#ffe2b0',
    ambientIntensity: 0.55,
    spotIntensity: 2.0,
    carpet: '#a8825a',
  },
}

// ============ 画作墙位槽位 ============
// 房间内壁: x[-6,6] z[-5,5] y[0,4]，画作中心 y=2
const WALL_SLOTS: Array<{ pos: [number, number, number]; rot: [number, number, number] }> = [
  // 后墙 z=-4.92 朝 +z
  { pos: [-3.6, 2, -4.92], rot: [0, 0, 0] },
  { pos: [0, 2, -4.92], rot: [0, 0, 0] },
  { pos: [3.6, 2, -4.92], rot: [0, 0, 0] },
  // 右墙 x=5.92 朝 -x
  { pos: [5.92, 2, -2.5], rot: [0, -Math.PI / 2, 0] },
  { pos: [5.92, 2, 2.5], rot: [0, -Math.PI / 2, 0] },
  // 前墙 z=4.92 朝 -z
  { pos: [3.6, 2, 4.92], rot: [0, Math.PI, 0] },
  { pos: [0, 2, 4.92], rot: [0, Math.PI, 0] },
  { pos: [-3.6, 2, 4.92], rot: [0, Math.PI, 0] },
  // 左墙 x=-5.92 朝 +x
  { pos: [-5.92, 2, 2.5], rot: [0, Math.PI / 2, 0] },
  { pos: [-5.92, 2, -2.5], rot: [0, Math.PI / 2, 0] },
]

// ============ 房间 ============
function Room({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]

  return (
    <group>
      {/* 地板 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial color={cfg.floor} roughness={0.8} metalness={0.05} />
      </mesh>
      {/* cozy 风格加地毯 */}
      {cfg.carpet && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <planeGeometry args={[6, 5]} />
          <meshStandardMaterial color={cfg.carpet} roughness={0.95} />
        </mesh>
      )}

      {/* 天花板 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4, 0]} receiveShadow>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial color={cfg.ceiling} roughness={0.95} />
      </mesh>

      {/* 后墙 z=-5 */}
      <mesh position={[0, 2, -5]} receiveShadow>
        <planeGeometry args={[12, 4]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} />
      </mesh>
      {/* 前墙 z=5 (朝 -z) */}
      <mesh position={[0, 2, 5]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[12, 4]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} />
      </mesh>
      {/* 左墙 x=-6 (朝 +x) */}
      <mesh position={[-6, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 4]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} />
      </mesh>
      {/* 右墙 x=6 (朝 -x) */}
      <mesh position={[6, 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 4]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} />
      </mesh>

      {/* 踢脚线（金色细条） */}
      {[-5, 5].map((z) => (
        <mesh key={`kick-z${z}`} position={[0, 0.08, z]}>
          <boxGeometry args={[12, 0.16, 0.02]} />
          <meshStandardMaterial color={cfg.frameAccent} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {[-6, 6].map((x) => (
        <mesh key={`kick-x${x}`} position={[x, 0.08, 0]}>
          <boxGeometry args={[0.02, 0.16, 10]} />
          <meshStandardMaterial color={cfg.frameAccent} metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

// ============ 带框画作 ============
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

  // 画作宽高比 4:5 纵向
  const W = 1.3
  const H = 1.65
  const frameW = W + 0.12
  const frameH = H + 0.12

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
      {/* 画框（Box 薄板） */}
      <mesh position={[0, 0, -0.03]} castShadow>
        <boxGeometry args={[frameW, frameH, 0.06]} />
        <meshStandardMaterial color={cfg.frame} roughness={0.5} metalness={style === 'modern' ? 0.3 : 0.1} />
      </mesh>
      {/* 金色内框线 */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[frameW - 0.02, frameH - 0.02]} />
        <meshStandardMaterial color={cfg.frameAccent} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* 画作贴图 */}
      <Suspense fallback={null}>
        <ArtworkPlane url={artwork.imageUrl} W={W} H={H} hovered={hovered} />
      </Suspense>

      {/* 聚光灯（每幅画独立） */}
      <spotLight
        position={[0, H / 2 + 1.2, 1.2]}
        target-position={[0, 0, 0]}
        angle={0.5}
        penumbra={0.6}
        intensity={cfg.spotIntensity}
        color={cfg.lightColor}
        distance={6}
        decay={1.5}
      />
      {/* 小射灯灯罩 */}
      <mesh position={[0, H / 2 + 1.1, 1.1]}>
        <cylinderGeometry args={[0.06, 0.08, 0.12, 12]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* hover 时画作名（Html 浮标） */}
      {hovered && (
        <Html center position={[0, -frameH / 2 - 0.25, 0.1]} distanceFactor={8} occlude={false}>
          <div className="px-3 py-1 rounded-full bg-black/75 text-white text-xs whitespace-nowrap backdrop-blur-sm pointer-events-none">
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
  // useTexture 第二参数是 onLoad 回调，texture 在此配置不会触发 immutability 规则
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
        roughness={0.6}
        metalness={0}
        emissive={hovered ? '#ffffff' : '#000000'}
        emissiveIntensity={hovered ? 0.08 : 0}
        emissiveMap={texture}
      />
    </mesh>
  )
}

// ============ 灯光 ============
function Lights({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  return (
    <>
      <ambientLight intensity={cfg.ambientIntensity} color={cfg.lightColor} />
      <hemisphereLight args={[cfg.ceiling, cfg.floor, 0.4]} />
      {/* 入口处暖光 */}
      <pointLight position={[0, 3.5, 0]} intensity={0.3} color={cfg.lightColor} distance={12} decay={2} />
    </>
  )
}

// ============ 相机控制 ============
function CameraRig({ isMobile }: { isMobile: boolean }) {
  const controlsRef = useRef<any>(null)
  const { camera, gl } = useThree()
  const keys = useRef<Record<string, boolean>>({})

  // 初始相机位置
  useEffect(() => {
    if (isMobile) {
      // 手机：站在中心，环顾四周
      camera.position.set(0, 1.6, 0.01)
    } else {
      // PC：站在入口处（前墙附近），看向后墙
      camera.position.set(0, 1.6, 3.5)
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
    const speed = 3.5 * delta
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

    // 限制相机在房间内（留出墙距）—— 用 set() 方法避免 lint immutability 误报
    camera.position.set(
      THREE.MathUtils.clamp(camera.position.x, -5.4, 5.4),
      1.6,
      THREE.MathUtils.clamp(camera.position.z, -4.4, 4.4)
    )
  })

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 1.6, isMobile ? 0 : -1]}
      enablePan={!isMobile}
      enableZoom={!isMobile}
      enableRotate
      minDistance={isMobile ? 0.01 : 0.5}
      maxDistance={isMobile ? 0.01 : 8}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 1.8}
      rotateSpeed={isMobile ? 0.5 : 0.6}
      zoomSpeed={0.8}
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
        <div className="w-10 h-10 border-2 border-white/30 border-t-gold rounded-full animate-spin" style={{ borderTopColor: 'var(--gold)' }} />
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
      camera={{ fov: isMobile ? 75 : 65, near: 0.1, far: 100, position: [0, 1.6, 3.5] }}
      onPointerMissed={() => {}}
      className="!absolute inset-0"
    >
      <color attach="background" args={[STYLE_CONFIG[style].ceiling]} />
      <fog attach="fog" args={[STYLE_CONFIG[style].ceiling, 8, 20]} />

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
