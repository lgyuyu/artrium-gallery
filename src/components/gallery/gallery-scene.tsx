'use client'

import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, useTexture, Html, useProgress, ContactShadows } from '@react-three/drei'
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

type LegacyStyle = 'modern' | 'cozy'
type Style = LegacyStyle | 'museum'

interface GallerySlot {
  pos: [number, number, number]
  rot: [number, number, number]
  featured?: boolean
}

// ============ 房间尺寸 ============
const ROOM_W = 14     // 宽（x）
const ROOM_D = 11     // 深（z）
const WALL_H = 4.62   // 墙高 (+10%)

// ============ 风格配置（参考视频：明亮简洁，木地板，白框，轨道射灯有光斑） ============
// ============ 风格配置（参考图：灰色墙+浅灰顶+白地+黑色画框+暖白聚光+墙顶灯带） ============
const BASE_STYLE_CONFIG: Record<LegacyStyle, {
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
const STYLE_CONFIG = {
  modern: {
    ...BASE_STYLE_CONFIG.modern,
    baseboard: '#9d9a94',
    bench: '#596460',
    benchBase: '#242321',
    track: '#20201f',
  },
  cozy: {
    ...BASE_STYLE_CONFIG.cozy,
    baseboard: '#806a55',
    bench: '#52635b',
    benchBase: '#483b31',
    track: '#3a332c',
  },
  museum: {
    ...BASE_STYLE_CONFIG.modern,
    wall: '#d8d7d3',
    ceiling: '#eeede9',
    floor: '#c7c5bf',
    floorStripe: '#b8b6b0',
    frame: '#171717',
    frameAccent: '#a8845d',
    lightColor: '#fff3df',
    ledColor: '#fffaf2',
    baseboard: '#9d9a94',
    bench: '#596460',
    benchBase: '#242321',
    track: '#20201f',
    ambient: 0.5,
    hemi: 0.58,
    spot: 5.5,
  },
} satisfies Record<Style, typeof BASE_STYLE_CONFIG.modern & {
  baseboard: string
  bench: string
  benchBase: string
  track: string
}>

const ART_Y = 2.0
const MUSEUM_WALL_SLOTS: GallerySlot[] = [
  // 后墙 z=-5.42 朝 +z （4幅）
  { pos: [0, 1.92, -5.38], rot: [0, 0, 0], featured: true },
  { pos: [-4.15, ART_Y, -5.42], rot: [0, 0, 0] },
  { pos: [4.15, ART_Y, -5.42], rot: [0, 0, 0] },
  // 右墙 x=6.92 朝 -x （3幅）
  { pos: [6.92, ART_Y, -3.55], rot: [0, -Math.PI / 2, 0] },
  { pos: [6.92, ART_Y, -1.15], rot: [0, -Math.PI / 2, 0] },
  { pos: [6.92, ART_Y, 1.25], rot: [0, -Math.PI / 2, 0] },
  { pos: [6.92, ART_Y, 3.65], rot: [0, -Math.PI / 2, 0] },
  // 前墙 z=5.42 朝 -z （4幅）
  { pos: [4.6, ART_Y, 5.42], rot: [0, Math.PI, 0] },
  { pos: [1.55, ART_Y, 5.42], rot: [0, Math.PI, 0] },
  { pos: [-1.55, ART_Y, 5.42], rot: [0, Math.PI, 0] },
  { pos: [-4.6, ART_Y, 5.42], rot: [0, Math.PI, 0] },
  // 左墙 x=-6.92 朝 +x （3幅）
  { pos: [-6.92, ART_Y, 3.3], rot: [0, Math.PI / 2, 0] },
  { pos: [-6.92, ART_Y, 0], rot: [0, Math.PI / 2, 0] },
  { pos: [-6.92, ART_Y, -3.3], rot: [0, Math.PI / 2, 0] },
]

const LEGACY_WALL_SLOTS: GallerySlot[] = [
  { pos: [-4.5, ART_Y, -5.42], rot: [0, 0, 0] },
  { pos: [-1.5, ART_Y, -5.42], rot: [0, 0, 0] },
  { pos: [1.5, ART_Y, -5.42], rot: [0, 0, 0] },
  { pos: [4.5, ART_Y, -5.42], rot: [0, 0, 0] },
  { pos: [6.92, ART_Y, -2.5], rot: [0, -Math.PI / 2, 0] },
  { pos: [6.92, ART_Y, 0], rot: [0, -Math.PI / 2, 0] },
  { pos: [6.92, ART_Y, 2.5], rot: [0, -Math.PI / 2, 0] },
  { pos: [4.5, ART_Y, 5.42], rot: [0, Math.PI, 0] },
  { pos: [1.5, ART_Y, 5.42], rot: [0, Math.PI, 0] },
  { pos: [-1.5, ART_Y, 5.42], rot: [0, Math.PI, 0] },
  { pos: [-4.5, ART_Y, 5.42], rot: [0, Math.PI, 0] },
  { pos: [-6.92, ART_Y, 2.5], rot: [0, Math.PI / 2, 0] },
  { pos: [-6.92, ART_Y, 0], rot: [0, Math.PI / 2, 0] },
  { pos: [-6.92, ART_Y, -2.5], rot: [0, Math.PI / 2, 0] },
]

// ============ 白色地面（简洁哑光，带轻微自发光） ============
function Floor({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  if (style !== 'museum') {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color={cfg.floor} roughness={0.6} metalness={0.05} emissive={cfg.floor} emissiveIntensity={0.2} />
      </mesh>
    )
  }

  const seamPositions = [-5, -3, -1, 1, 3, 5]

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color={cfg.floor} roughness={0.72} metalness={0.02} />
      </mesh>
      {seamPositions.map((x) => (
        <mesh key={`floor-x-${x}`} position={[x, 0.006, 0]} receiveShadow>
          <boxGeometry args={[0.012, 0.008, ROOM_D]} />
          <meshStandardMaterial color={cfg.floorStripe} roughness={0.9} />
        </mesh>
      ))}
      {[-3.5, -1.5, 0.5, 2.5, 4.5].map((z) => (
        <mesh key={`floor-z-${z}`} position={[0, 0.006, z]} receiveShadow>
          <boxGeometry args={[ROOM_W, 0.008, 0.012]} />
          <meshStandardMaterial color={cfg.floorStripe} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ============ 房间（墙+顶+地面+墙顶灯带） ============
function Room({ style, isMobile }: { style: Style; isMobile: boolean }) {
  const cfg = STYLE_CONFIG[style]
  const halfW = ROOM_W / 2
  const halfD = ROOM_D / 2

  return (
    <group>
      <Floor style={style} />

      {/* 天花板（浅灰，稍带自发光） */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_H, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial
          color={cfg.ceiling}
          roughness={style === 'museum' ? 0.94 : 0.95}
          emissive={style === 'museum' ? '#000000' : cfg.ceiling}
          emissiveIntensity={style === 'museum' ? 0 : 0.15}
        />
      </mesh>

      {/* 四面墙（中灰，带轻微自发光提升亮度） */}
      <mesh position={[0, WALL_H / 2, -halfD]} receiveShadow>
        <planeGeometry args={[ROOM_W, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={style === 'museum' ? 0.88 : 0.95} emissive={style === 'museum' ? '#000000' : cfg.wall} emissiveIntensity={style === 'museum' ? 0 : 0.2} />
      </mesh>
      <mesh position={[0, WALL_H / 2, halfD]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={style === 'museum' ? 0.88 : 0.95} emissive={style === 'museum' ? '#000000' : cfg.wall} emissiveIntensity={style === 'museum' ? 0 : 0.2} />
      </mesh>
      <mesh position={[-halfW, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={style === 'museum' ? 0.88 : 0.95} emissive={style === 'museum' ? '#000000' : cfg.wall} emissiveIntensity={style === 'museum' ? 0 : 0.2} />
      </mesh>
      <mesh position={[halfW, WALL_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, WALL_H]} />
        <meshStandardMaterial color={cfg.wall} roughness={style === 'museum' ? 0.88 : 0.95} emissive={style === 'museum' ? '#000000' : cfg.wall} emissiveIntensity={style === 'museum' ? 0 : 0.2} />
      </mesh>

      {/* ===== 墙顶灯带（4条，沿墙顶交界处，发光线条分隔墙和顶）===== */}
      <WallLEDStrip style={style} />
      {style === 'museum' ? (
        <>
          <Baseboards style={style} />
          <CeilingTracks style={style} />
          <GalleryBench style={style} isMobile={isMobile} />
        </>
      ) : (
        <LegacyTeaTable style={style} />
      )}
    </group>
  )
}

// ============ 墙顶灯带（4条发光条，沿墙顶交界） ============
function Baseboards({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  const halfW = ROOM_W / 2
  const halfD = ROOM_D / 2

  return (
    <group>
      <mesh position={[0, 0.09, -halfD + 0.04]} castShadow>
        <boxGeometry args={[ROOM_W, 0.18, 0.08]} />
        <meshStandardMaterial color={cfg.baseboard} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.09, halfD - 0.04]} castShadow>
        <boxGeometry args={[ROOM_W, 0.18, 0.08]} />
        <meshStandardMaterial color={cfg.baseboard} roughness={0.72} />
      </mesh>
      <mesh position={[-halfW + 0.04, 0.09, 0]} castShadow>
        <boxGeometry args={[0.08, 0.18, ROOM_D]} />
        <meshStandardMaterial color={cfg.baseboard} roughness={0.72} />
      </mesh>
      <mesh position={[halfW - 0.04, 0.09, 0]} castShadow>
        <boxGeometry args={[0.08, 0.18, ROOM_D]} />
        <meshStandardMaterial color={cfg.baseboard} roughness={0.72} />
      </mesh>
    </group>
  )
}

function CeilingTracks({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]
  const fixtures: Array<[number, number, number]> = [
    [-4.15, WALL_H - 0.2, -4.45],
    [0, WALL_H - 0.2, -4.45],
    [4.15, WALL_H - 0.2, -4.45],
    [-4.15, WALL_H - 0.2, 4.45],
    [0, WALL_H - 0.2, 4.45],
    [4.15, WALL_H - 0.2, 4.45],
    [-5.85, WALL_H - 0.2, -2.6],
    [-5.85, WALL_H - 0.2, 2.6],
    [5.85, WALL_H - 0.2, -2.6],
    [5.85, WALL_H - 0.2, 2.6],
  ]

  return (
    <group>
      {[-4.45, 4.45].map((z) => (
        <mesh key={`track-z-${z}`} position={[0, WALL_H - 0.1, z]}>
          <boxGeometry args={[12, 0.055, 0.065]} />
          <meshStandardMaterial color={cfg.track} metalness={0.6} roughness={0.28} />
        </mesh>
      ))}
      {[-5.85, 5.85].map((x) => (
        <mesh key={`track-x-${x}`} position={[x, WALL_H - 0.1, 0]}>
          <boxGeometry args={[0.065, 0.055, 9]} />
          <meshStandardMaterial color={cfg.track} metalness={0.6} roughness={0.28} />
        </mesh>
      ))}
      {fixtures.map((position, index) => (
        <group key={`fixture-${index}`} position={position}>
          <mesh>
            <cylinderGeometry args={[0.075, 0.095, 0.22, 18]} />
            <meshStandardMaterial color={cfg.track} metalness={0.55} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.115, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.068, 18]} />
            <meshStandardMaterial color={cfg.lightColor} emissive={cfg.lightColor} emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

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
              emissiveIntensity={style === 'museum' ? 0.9 : 2.5}
              toneMapped={false}
            />
          </mesh>
          {/* 条形光源（向下照亮墙面） */}
          <rectAreaLight
            position={[0, -0.1, 0.1]}
            width={s.w}
            height={0.3}
            intensity={style === 'museum' ? 0.75 : 3}
            color={cfg.ledColor}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        </group>
      ))}
    </group>
  )
}

// ============ 中央观展长凳 ============
function GalleryBench({ style, isMobile }: { style: Style; isMobile: boolean }) {
  const cfg = STYLE_CONFIG[style]
  const seatY = 0.5
  const seatW = 2.7
  const seatD = 0.72

  return (
    <group
      position={[0, 0, isMobile ? -0.35 : 0.55]}
      scale={isMobile ? 0.72 : 1}
    >
      <mesh position={[0, seatY, 0]} castShadow receiveShadow>
        <boxGeometry args={[seatW, 0.18, seatD]} />
        <meshStandardMaterial color={cfg.bench} roughness={0.66} metalness={0.02} />
      </mesh>
      <mesh position={[0, seatY + 0.095, 0]}>
        <boxGeometry args={[seatW - 0.08, 0.012, seatD - 0.08]} />
        <meshStandardMaterial color={style === 'modern' ? '#6b7672' : '#64766d'} metalness={0.06} roughness={0.62} />
      </mesh>
      {[-0.92, 0.92].map((x) => (
        <mesh key={x} position={[x, 0.23, 0]} castShadow>
          <boxGeometry args={[0.18, 0.46, 0.58]} />
          <meshStandardMaterial color={cfg.benchBase} roughness={0.58} metalness={0.12} />
        </mesh>
      ))}
    </group>
  )
}

function LegacyTeaTable({ style }: { style: LegacyStyle }) {
  const cfg = STYLE_CONFIG[style]
  const tableColor = style === 'modern' ? '#5a4530' : '#7a5a3a'
  const topY = 0.42
  const topW = 1.8
  const topD = 1.0
  const topT = 0.06

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <boxGeometry args={[topW, topT, topD]} />
        <meshStandardMaterial color={tableColor} roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, topY + topT / 2, 0]}>
        <boxGeometry args={[topW, 0.005, topD]} />
        <meshStandardMaterial color={cfg.frameAccent} metalness={0.7} roughness={0.25} />
      </mesh>
      {[
        [topW / 2 - 0.08, topD / 2 - 0.08],
        [-(topW / 2 - 0.08), topD / 2 - 0.08],
        [topW / 2 - 0.08, -(topD / 2 - 0.08)],
        [-(topW / 2 - 0.08), -(topD / 2 - 0.08)],
      ].map(([x, z], index) => (
        <mesh key={index} position={[x, topY / 2, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, topY, 12]} />
          <meshStandardMaterial color={tableColor} roughness={0.5} metalness={0.1} />
        </mesh>
      ))}
      <mesh position={[0, topY + topT / 2 + 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.24, 16]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, topY + topT / 2 + 0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.04, 16]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.3} metalness={0.1} />
      </mesh>
      {[
        [0, topY + topT / 2 + 0.32, 0],
        [0.05, topY + topT / 2 + 0.30, 0.02],
        [-0.04, topY + topT / 2 + 0.31, -0.02],
      ].map(([x, y, z], index) => (
        <mesh key={`flower-${index}`} position={[x, y, z]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color={index === 0 ? '#d4655a' : index === 1 ? '#e8a050' : '#c84860'} roughness={0.6} />
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
  slot: GallerySlot
  style: Style
  onSelect: (a: Artwork3D) => void
}) {
  const [hovered, setHovered] = useState(false)

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
      <Suspense fallback={null}>
        {style === 'museum' ? (
          <ArtworkPresentation
            artwork={artwork}
            style={style}
            hovered={hovered}
            featured={Boolean(slot.featured)}
            wallY={slot.pos[1]}
          />
        ) : (
          <LegacyArtworkPresentation
            artwork={artwork}
            style={style}
            hovered={hovered}
            wallY={slot.pos[1]}
          />
        )}
      </Suspense>
    </group>
  )
}

function ArtworkPresentation({
  artwork,
  style,
  hovered,
  featured,
  wallY,
}: {
  artwork: Artwork3D
  style: Style
  hovered: boolean
  featured: boolean
  wallY: number
}) {
  const cfg = STYLE_CONFIG[style]
  const texture = useTexture(artwork.imageUrl, (loadedTexture) => {
    loadedTexture.colorSpace = THREE.SRGBColorSpace
    loadedTexture.anisotropy = 8
    loadedTexture.needsUpdate = true
  })
  const spotRef = useRef<THREE.SpotLight>(null)
  const targetObj = useMemo(() => new THREE.Object3D(), [])
  const image = texture.image as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number } | undefined
  const imageWidth = image?.naturalWidth || image?.width || 4
  const imageHeight = image?.naturalHeight || image?.height || 5
  const aspect = imageWidth / imageHeight
  const maxW = featured ? 2.1 : 1.72
  const maxH = featured ? 2.34 : 1.88
  let artworkW = maxW
  let artworkH = artworkW / aspect
  if (artworkH > maxH) {
    artworkH = maxH
    artworkW = artworkH * aspect
  }
  const matWidth = featured ? 0.11 : 0.075
  const frameThickness = 0.055
  const frameW = artworkW + (matWidth + frameThickness) * 2
  const frameH = artworkH + (matWidth + frameThickness) * 2
  const lampY = WALL_H - wallY - 0.18
  const lampZ = 0.58

  useEffect(() => {
    if (spotRef.current) spotRef.current.target = targetObj
  }, [targetObj])

  return (
    <group>
      <mesh position={[0, 0, -0.045]} castShadow receiveShadow>
        <boxGeometry args={[frameW, frameH, 0.09]} />
        <meshStandardMaterial color={cfg.frame} roughness={0.42} metalness={0.16} />
      </mesh>
      <mesh position={[0, 0, 0.006]} receiveShadow>
        <planeGeometry args={[artworkW + matWidth * 2, artworkH + matWidth * 2]} />
        <meshStandardMaterial color="#f3f0e9" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[artworkW, artworkH]} />
        <meshStandardMaterial
          map={texture}
          color="#ffffff"
          roughness={0.62}
          metalness={0}
          emissive={hovered ? '#ffffff' : '#000000'}
          emissiveIntensity={hovered ? 0.055 : 0}
          emissiveMap={texture}
        />
      </mesh>
      <mesh position={[0, -frameH / 2 - 0.11, 0.015]} castShadow>
        <boxGeometry args={[Math.min(frameW * 0.48, 0.72), 0.075, 0.025]} />
        <meshStandardMaterial color="#dedbd4" roughness={0.76} />
      </mesh>
      <spotLight
        ref={spotRef}
        position={[0, lampY, lampZ]}
        angle={featured ? 0.46 : 0.42}
        penumbra={0.78}
        intensity={featured ? cfg.spot * 1.15 : cfg.spot}
        color={cfg.lightColor}
        distance={7}
        decay={1.25}
        castShadow={featured}
      />
      <primitive object={targetObj} position={[0, 0, 0]} />
      {hovered && (
        <Html center position={[0, -frameH / 2 - 0.26, 0.12]} distanceFactor={9} occlude={false}>
          <div className="px-3 py-1 rounded-md bg-black/85 text-white text-xs whitespace-nowrap backdrop-blur-sm pointer-events-none border border-white/10">
            {artwork.title}
          </div>
        </Html>
      )}
    </group>
  )
}

function LegacyArtworkPresentation({
  artwork,
  style,
  hovered,
  wallY,
}: {
  artwork: Artwork3D
  style: LegacyStyle
  hovered: boolean
  wallY: number
}) {
  const cfg = STYLE_CONFIG[style]
  const texture = useTexture(artwork.imageUrl, (loadedTexture) => {
    loadedTexture.colorSpace = THREE.SRGBColorSpace
    loadedTexture.anisotropy = 8
    loadedTexture.needsUpdate = true
  })
  const spotRef = useRef<THREE.SpotLight>(null)
  const targetObj = useMemo(() => new THREE.Object3D(), [])
  const artworkW = 1.5
  const artworkH = 1.88
  const frameThickness = 0.05
  const frameW = artworkW + frameThickness * 2
  const frameH = artworkH + frameThickness * 2
  const lampY = WALL_H - wallY - 0.05
  const lampZ = 0.15

  useEffect(() => {
    if (spotRef.current) spotRef.current.target = targetObj
  }, [targetObj])

  return (
    <group>
      <mesh position={[0, 0, -0.03]} castShadow>
        <boxGeometry args={[frameW, frameH, 0.06]} />
        <meshStandardMaterial color={cfg.frame} roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[artworkW, artworkH]} />
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
      <mesh position={[0, lampY, lampZ]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <spotLight
        ref={spotRef}
        position={[0, lampY, lampZ]}
        angle={0.576}
        penumbra={0.5}
        intensity={cfg.spot}
        color={cfg.lightColor}
        distance={8}
        decay={0.8}
      />
      <primitive object={targetObj} position={[0, 0, 0]} />
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

function WelcomeWall({
  style,
  studentName,
  orgName,
}: {
  style: Style
  studentName: string
  orgName: string
}) {
  const cfg = STYLE_CONFIG[style]

  return (
    <group>
      <mesh position={[0, 2.35, -5.445]} receiveShadow>
        <boxGeometry args={[5.55, 4.12, 0.08]} />
        <meshStandardMaterial color={style === 'modern' ? '#e5e3de' : '#e7ded2'} roughness={0.8} />
      </mesh>
      <mesh position={[-2.77, 2.35, -5.39]} castShadow>
        <boxGeometry args={[0.035, 4.12, 0.035]} />
        <meshStandardMaterial color={cfg.frameAccent} metalness={0.28} roughness={0.48} />
      </mesh>
      <mesh position={[2.77, 2.35, -5.39]} castShadow>
        <boxGeometry args={[0.035, 4.12, 0.035]} />
        <meshStandardMaterial color={cfg.frameAccent} metalness={0.28} roughness={0.48} />
      </mesh>
      <Html center position={[0, 3.72, -5.33]} distanceFactor={8} occlude={false}>
        <div className="w-[260px] select-none text-center text-stone-800 pointer-events-none">
          <p className="text-[10px] uppercase tracking-[0.32em] text-stone-500">{orgName} · Young Artist Exhibition</p>
          <p className="mt-1 font-serif text-2xl font-semibold">{studentName}的个人画展</p>
          <div className="mx-auto mt-2 h-px w-10 bg-[#a8845d]" />
        </div>
      </Html>
    </group>
  )
}

// ============ 灯光（环境光适中，突出射灯光斑） ============
function Lights({ style }: { style: Style }) {
  const cfg = STYLE_CONFIG[style]

  if (style !== 'museum') {
    return (
      <>
        <ambientLight intensity={cfg.ambient} color={cfg.lightColor} />
        <hemisphereLight args={[cfg.ceiling, cfg.floor, cfg.hemi]} />
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

  return (
    <>
      <ambientLight intensity={cfg.ambient} color={cfg.lightColor} />
      <hemisphereLight args={[cfg.ceiling, cfg.floor, cfg.hemi]} />
      <directionalLight
        position={[3.5, 7, 4.5]}
        intensity={0.52}
        color={cfg.lightColor}
        castShadow
        shadow-radius={3}
        shadow-normalBias={0.025}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={22}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <pointLight position={[0, WALL_H - 0.45, 1]} intensity={0.28} color={cfg.lightColor} distance={12} decay={2} />
    </>
  )
}

// ============ 相机控制（反转滑动方向） ============
function CameraRig({ isMobile, style }: { isMobile: boolean; style: Style }) {
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
      target={style === 'museum' ? [0, isMobile ? 1.3 : 1.45, -1.5] : [0, 1.6, -1.5]}
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
  studentName,
  orgName,
}: {
  artworks: Artwork3D[]
  style: Style
  onSelect: (a: Artwork3D) => void
  isMobile: boolean
  studentName: string
  orgName: string
}) {
  const isMuseum = style === 'museum'
  const slots = isMuseum ? MUSEUM_WALL_SLOTS : LEGACY_WALL_SLOTS
  const placed = useMemo(() => {
    return artworks.slice(0, slots.length).map((a, i) => ({
      artwork: a,
      slot: slots[i],
    }))
  }, [artworks, slots])

  return (
    <Canvas
      shadows={isMuseum ? 'soft' : false}
      dpr={[1, isMobile ? (isMuseum ? 1.4 : 1.5) : (isMuseum ? 1.75 : 2)]}
      gl={{
        antialias: !isMobile,
        powerPreference: 'high-performance',
        alpha: false,
        toneMapping: isMuseum ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping,
      }}
      onCreated={({ gl }) => {
        if (isMuseum) gl.toneMappingExposure = 1.08
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
      camera={{
        fov: isMobile ? (isMuseum ? 74 : 85) : (isMuseum ? 62 : 70),
        near: 0.1,
        far: 100,
        position: [0, 1.6, 4],
      }}
      onPointerMissed={() => {}}
      className="!absolute inset-0"
    >
      <color attach="background" args={[STYLE_CONFIG[style].ceiling]} />
      <fog attach="fog" args={[STYLE_CONFIG[style].ceiling, 18, 35]} />

      <Suspense fallback={<SceneLoader />}>
        <Lights style={style} />
        <Room style={style} isMobile={isMobile} />
        {isMuseum && <WelcomeWall style={style} studentName={studentName} orgName={orgName} />}
        {isMuseum && (
          <ContactShadows
            position={[0, 0.012, 0]}
            opacity={0.24}
            scale={12}
            blur={2.4}
            far={3.2}
            resolution={isMobile ? 256 : 512}
            frames={1}
          />
        )}
        {placed.map(({ artwork, slot }) => (
          <FramedArtwork
            key={artwork.id}
            artwork={artwork}
            slot={slot}
            style={style}
            onSelect={onSelect}
          />
        ))}
        <CameraRig isMobile={isMobile} style={style} />
      </Suspense>
    </Canvas>
  )
}
