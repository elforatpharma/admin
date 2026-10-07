module.exports = {
  content: [
    "./*.html",
    "./*.js",
    "./android-app/**/*.java",
    "./android-app/**/*.xml"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-variant":"#dae2fd","surface-container-highest":"#dae2fd","secondary":"#6a00e1","outline":"#777587","warning-surface":"#fffbeb","secondary-fixed":"#ebdcff","outline-variant":"#c7c4d9","text-secondary":"#64748b","background":"#faf8ff","tertiary-fixed":"#6ffbbe","error-container":"#ffdad6","surface-container-lowest":"#ffffff","on-surface":"#131b2e","inverse-primary":"#c4c0ff","on-secondary-fixed":"#260059","surface-container":"#eaedff","on-surface-variant":"#464556","primary-border":"#ddd6fe","danger":"#ef4444","surface-container-high":"#e2e7ff","on-primary":"#ffffff","tertiary":"#004f35","accent-glow":"rgba(77,60,235,0.3)","secondary-fixed-dim":"#d3bbff","on-error-container":"#93000a","warning":"#f59e0b","on-tertiary-container":"#60eeb1","inverse-surface":"#283044","surface-container-low":"#f2f3ff","tertiary-container":"#006a48","surface-tint":"#4f3eed","secondary-container":"#8434fe","primary":"#3312d5","border-strong":"#cbd5e1","success-surface":"#ecfdf5","surface":"#faf8ff","inverse-on-surface":"#eef0ff","on-tertiary":"#ffffff","danger-surface":"#fef2f2","on-primary-fixed-variant":"#3517d6","on-background":"#131b2e","success":"#10b981","surface-card":"#ffffff","on-primary-container":"#d5d1ff","border-subtle":"#e2e8f0","primary-fixed":"#e3dfff","on-secondary-fixed-variant":"#5c00c4","surface-dim":"#d2d9f4","primary-container":"#4d3ceb","on-tertiary-fixed":"#002113","primary-surface":"#f5f3ff","primary-fixed-dim":"#c4c0ff","on-error":"#ffffff","primary-deep":"#3312d5",
        "brand-gradient-hover":"linear-gradient(90deg,#3f2fd4 0%,#7624f2 100%)","brand-gradient":"linear-gradient(90deg,#4d3ceb 0%,#8536ff 100%)"
      },
      borderRadius: { DEFAULT:"1rem", lg:"2rem", xl:"3rem", full:"9999px" },
      spacing: {"space-xs":"0.25rem",gutter:"1rem","space-sm":"0.5rem","space-xl":"2rem","margin-lg":"2rem","space-lg":"1.5rem","gutter-lg":"1.5rem","space-md":"1rem",margin:"1rem","margin-md":"1.5rem"},
      fontFamily: {
        "data-tabular":["Tajawal"],"headline-sm":["Cairo"],"body-md":["Tajawal"],"label-lg":["Tajawal"],"label-sm":["Tajawal"],"headline-lg":["Cairo"],"body-sm":["Tajawal"],"headline-xl":["Cairo"],"display-lg":["Cairo"],"display-lg-mobile":["Cairo"],"label-md":["Tajawal"],"body-lg":["Tajawal"]
      },
      fontSize: {
        "data-tabular":["13px",{lineHeight:"18px",letterSpacing:"-0.01em",fontWeight:"500"}],
        "headline-sm":["16px",{lineHeight:"24px",letterSpacing:"0",fontWeight:"600"}],
        "body-md":["14px",{lineHeight:"22px",letterSpacing:"0",fontWeight:"400"}],
        "label-lg":["14px",{lineHeight:"20px",letterSpacing:"0",fontWeight:"600"}],
        "label-sm":["11px",{lineHeight:"14px",letterSpacing:"0.02em",fontWeight:"700"}],
        "headline-lg":["20px",{lineHeight:"28px",letterSpacing:"0",fontWeight:"600"}],
        "body-sm":["13px",{lineHeight:"20px",letterSpacing:"0",fontWeight:"400"}],
        "headline-xl":["24px",{lineHeight:"32px",letterSpacing:"0",fontWeight:"700"}],
        "display-lg":["32px",{lineHeight:"42px",letterSpacing:"0",fontWeight:"700"}],
        "label-md":["12px",{lineHeight:"16px",letterSpacing:"0",fontWeight:"500"}],
        "body-lg":["16px",{lineHeight:"26px",letterSpacing:"0",fontWeight:"400"}]
      }
    }
  },
  plugins: []
};