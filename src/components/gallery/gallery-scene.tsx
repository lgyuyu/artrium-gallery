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
const WALL_H = 4.2    // 墙高

// ============ 风格配置（参考视频：明亮简洁，木地板，白框，轨道射灯有光斑） ============
const STYLE_CONFIG: Record<Style, {
  wall: string
  wallTop: string       // 墙上部（画作以上）
  floor: string
  floorStripe: string   // 木纹深色条
  ceiling: string
  frame: string         // 画框（modern 用白细框）
  frameAccent: string
  lightColor: string
  ambient: number
  hemi: number
  spot: number
  trackColor: string    // 轨道色
}> = {
  modern: {
    wall: '#ffffff',       // 纯白墙面
    wallTop: '#ffffff',
    floor: '#c9b083',      // 浅木色
    floorStripe: '#a8916a',// 木纹深色
    ceiling: '#ffffff',    // 纯白天花板
    frame: '#ffffff',      // 白色细框
    frameAccent: '#d4b87a',
    lightColor: '#ffffff', // 纯白光
    ambient: 0.78,         // +20% (0.65→0.78)
    hemi: 0.71,            // +20% (0.59→0.71)
    spot: 15.6,            // +20% (13→15.6)
    trackColor: '#2a2a2a',
  },
  cozy: {
    wall: '#ffffff',       // 纯白墙面
    wallTop: '#ffffff',
    floor: '#9a7548',
    floorStripe: '#7a5a32',
    ceiling: '#ffffff',    // 纯白天花板
    frame: '#5a3a1f',      // cozy 用深色框
    frameAccent: '#d4a560',
    lightColor: '#fff5e8', // cozy 略暖白
    ambient: 0.86,         // +20% (0.72→0.86)
    hemi: 0.78,            // +20% (0.65→0.78)
    spot: 14.4,            // +20% (12→14.4)
    trackColor: '#2a2a2a',
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

// ============ 木地板（程序生成纹理） ============
function WoodFloor({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 512
    const ctx = c.getContext('2d')!
    // 底色
    ctx.fillStyle = cfg.floor
    ctx.fillRect(0, 0, 512, 512)
    // 木板条（横向，每条高 64px）
    const plankH = 64
    for (let i = 0; i < 512 / plankH; i++) {
      const y = i * plankH
      // 每条木板略微变色
      const variant = (i % 3) * 8
      ctx.fillStyle = cfg.floor
      ctx.fillRect(0, y, 512, plankH)
      // 木纹线（随机深色细线）
      ctx.strokeStyle = cfg.floorStripe
      ctx.globalAlpha = 0.25
      ctx.lineWidth = 1
      for (let k = 0; k < 8; k++) {
        ctx.beginPath()
        const sy = y + 8 + Math.random() * (plankH - 16)
        ctx.moveTo(0, sy)
        // 略微波动的线
        for (let x = 0; x <= 512; x += 32) {
          ctx.lineTo(x, sy + (Math.random() - 0.5) * 2)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      // 板缝
      ctx.fillStyle = cfg.floorStripe
      ctx.globalAlpha = 0.4
      ctx.fillRect(0, y + plankH - 1, 512, 2)
      ctx.globalAlpha = 1
    }
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(4, 3)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [cfg.floor, cfg.floorStripe])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[ROOM_W, ROOM_D]} />
      <meshStandardMaterial map={texture} roughness={0.7} metalness={0.05} />
    </mesh>
  )
}

// ============ 房间（简洁：墙+顶+木地板，天花板轨道） ============
function Room({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  const halfW = ROOM_W / 2
  const halfD = ROOM_D / 2

  return (
    <group>
      <WoodFloor style={style} />

      {/* 天花板 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_H, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color={cfg.ceiling} roughness={0.95} emissive={cfg.ceiling} emissiveIntensity={0.35} />
      </mesh>

      {/* 四面墙（纯白，带轻微自发光确保不灰暗） */}
      <mesh position={[0, WALL_H / 2, -halfD]} receiveShadow>
        <planeGeometry args={[ROOM_W, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} emissive={cfg.wall} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, WALL_H / 2, halfD]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} emissive={cfg.wall} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-halfW, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} emissive={cfg.wall} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[halfW, WALL_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={0.95} emissive={cfg.wall} emissiveIntensity={0.3} />
      </mesh>

      {/* 天花板（纯白，干净，无轨道） */}

      {/* 中央茶几 */}
      <TeaTable style={style} />
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

  // 画作尺寸（单排，较大，4:5纵向）
  const W = 1.5
  const H = 1.88
  // 画框：modern 白色细框
  const frameThickness = style === 'modern' ? 0.04 : 0.06
  const frameW = W + frameThickness * 2
  const frameH = H + frameThickness * 2
  // 射灯：嵌入式小筒灯，从天花板垂直向下照画作
  const lampY = WALL_H - slot.pos[1] - 0.25   // 灯贴近天花板（嵌入式）
  const lampZ = 0.35                           // 灯在画作前方0.35m（让光斑落在画上）
  const beamLen = lampY                        // 垂直光束长度
  const beamAngle = 0.26                       // 聚焦角度
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
      {/* 画框（细框，modern白色，cozy深色） */}
      <mesh position={[0, 0, -0.03]} castShadow>
        <boxGeometry args={[frameW, frameH, 0.06]} />
        <meshStandardMaterial color={cfg.frame} roughness={0.4} metalness={style === 'modern' ? 0.1 : 0.15} />
      </mesh>
      {/* 画框内侧金线（细） */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[W + 0.01, H + 0.01]} />
        <meshStandardMaterial color={cfg.frameAccent} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* 画作贴图 */}
      <Suspense fallback={null}>
        <ArtworkPlane url={artwork.imageUrl} W={W} H={H} hovered={hovered} />
      </Suspense>

      {/* ===== 嵌入式筒灯（从天花板垂直向下照画作）===== */}
      {/* 筒灯外圈（嵌入天花板的黑色环） */}
      <mesh position={[0, lampY + 0.05, lampZ]}>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 20]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* 筒灯内圈（黑色） */}
      <mesh position={[0, lampY + 0.02, lampZ]}>
        <cylinderGeometry args={[0.085, 0.085, 0.06, 20]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* 灯泡发光球（小而亮） */}
      <mesh position={[0, lampY - 0.01, lampZ]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color={cfg.lightColor} emissive={cfg.lightColor} emissiveIntensity={3} />
      </mesh>

      {/* 可见光束（垂直向下的圆锥，锐利清晰） */}
      <mesh position={[0, lampY / 2 - 0.05, lampZ]}>
        <coneGeometry args={[beamR, beamLen - 0.1, 24, 1, true]} />
        <meshBasicMaterial
          color={cfg.lightColor}
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 聚光灯光源（从灯泡位置垂直向下照，锐利光斑） */}
      <spotLight
        ref={spotRef}
        position={[0, lampY - 0.05, lampZ]}
        angle={beamAngle}
        penumbra={0.25}
        intensity={cfg.spot}
        color={cfg.lightColor}
        distance={7}
        decay={0.5}
      />
      {/* spotLight target 在画作中心 */}
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
    if (isMobile) {
      camera.position.set(0, 1.6, 0.5)
    } else {
      camera.position.set(0, 1.6, 4)
    }
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
      target={[0, 1.6, isMobile ? 0 : -1.5]}
      enablePan={!isMobile}
      enableZoom={!isMobile}
      enableRotate
      minDistance={isMobile ? 0.01 : 0.5}
      maxDistance={isMobile ? 0.01 : 10}
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
      camera={{ fov: isMobile ? 75 : 70, near: 0.1, far: 100, position: [0, 1.6, 4] }}
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
