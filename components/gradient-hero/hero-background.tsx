export function HeroBackground() {
  return (
    <div className="absolute inset-0" style={{ backgroundColor: "#0A0A12" }}>
      {/*
        ┌─ Figma Frame 46 (1920×948) 背景层级（从下到上）──────────────────────────────────────────┐
        │ 1. 蓝色椭圆  347:8011  1726×1120  blur=342  #3253D4  group×ellipse=0.80×0.50=0.40      │
        │ 2. 紫色椭圆  347:8009  1654×1120  blur=342  #7B33C7  group×ellipse=0.80×0.50=0.40      │
        │ 3. 紫色渐变带 368:8181  2415×492  blur=242  #9F68FF→transparent  layer opacity=0.70    │
        │ 4. Mask group 368:8198  白色渐变遮罩，覆盖顶部 56%，group opacity=0.20                 │
        │ 5. 中心毛玻璃 347:8013  1380×1380  BACKGROUND_BLUR=32px  group op=0.50 × fill a=0.08   │
        │ 6. 中心毛玻璃 347:8014  1141×1141  BACKGROUND_BLUR=32px  group op=0.50 × fill a=0.12   │
        └─────────────────────────────────────────────────────────────────────────────────────────┘
      */}

      {/* ① 蓝色大椭圆 347:8011  #3253D4
           center_x≈25%: left=-20%+width/2=45%→25% ✓
           center_y≈30%: top=-29%+height/2=59%→30% ✓  */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "90%",
          height: "118%",
          left: "-20%",
          top: "-29%",
          borderRadius: "50%",
          background: "#2845C0",
          opacity: 0.7,
          filter: "blur(280px)",
        }}
      />

      {/* ② 紫色大椭圆 347:8009  #7B33C7
           center_x≈75%: left=32%+width/2=43%→75% ✓
           center_y≈30%: top=-29%+height/2=59%→30% ✓  */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "86%",
          height: "118%",
          left: "32%",
          top: "-29%",
          borderRadius: "50%",
          background: "#5C18A8",
          opacity: 0.7,
          filter: "blur(280px)",
        }}
      />

      {/* ③ 紫色渐变带 368:8181  #9F68FF→transparent  opacity=0.70 */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "126%",
          height: "52%",
          left: "50%",
          transform: "translateX(-50%)",
          top: "-18%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 40%, rgba(110,50,210,1) 0%, rgba(110,50,210,0.5) 40%, transparent 70%)",
          opacity: 0.7,
          filter: "blur(242px)",
        }}
      />

      {/* ④ Mask group 368:8198：白色渐变遮罩，group opacity=0.20，覆盖顶部 56% */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "56%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.10) 50%, transparent 100%)",
        }}
      />

      {/* ⑤ 中心毛玻璃大椭圆 347:8013  fill a=0.20，backdrop-blur=32px */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "72%",
          aspectRatio: "1",
          left: "50%",
          transform: "translateX(-50%)",
          top: "10%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 55%, transparent 70%)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
        }}
      />

      {/* ⑥ 中心毛玻璃小椭圆 347:8014  fill a=0.28，backdrop-blur=32px */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "59%",
          aspectRatio: "1",
          left: "50%",
          transform: "translateX(-50%)",
          top: "22%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 55%, transparent 70%)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
        }}
      />

      {/* 网格纹理：60px 方格，白色 8% */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "60px 60px",
        }}
      />

      {/* 底部渐变收尾 */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, #0A0A12, transparent)",
        }}
      />
    </div>
  )
}
