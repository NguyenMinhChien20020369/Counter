// ==========================================
// Ý TƯỞNG 1: VÒNG XOÁY THỜI GIAN (ĐỒNG HỒ & BỘ ĐẾM)
// ==========================================
export const TimeSpiralLogo = ({ size = 120 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://w3.org">
    <defs>
      <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
    </defs>
    {/* Vòng tròn quỹ đạo thời gian bên ngoài */}
    <circle cx="50" cy="50" r="42" stroke="url(#gradient1)" strokeWidth="3" strokeDasharray="6 4" />
    {/* Trục đồng hồ cát / Lịch cách điệu bên trong */}
    <path d="M35 30H65L50 50L35 30Z" fill="url(#gradient1)" opacity="0.8" />
    <path d="M35 70H65L50 50L35 70Z" fill="url(#gradient1)" />
    {/* Dấu cộng tăng trưởng ở trung tâm */}
    <path d="M50 45V55M45 50H55" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ==========================================
// Ý TƯỞNG 2: KHỐI LẬP PHƯƠNG TÍCH LŨY (3D ISOMETRIC)
// ==========================================
export const IsometricCubeLogo = ({ size = 120 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://w3.org">
    {/* Mặt trên (Top) - Tờ lịch */}
    <path d="M50 15L80 32L50 49L20 32L50 15Z" fill="#e9d5ff" stroke="#c084fc" strokeWidth="2" />
    {/* Các hàng kẻ sọc trên mặt tờ lịch */}
    <path d="M35 28L50 37M50 24L65 33M42 22L57 31" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
    
    {/* Mặt bên trái (Left) - Các nấc thang giảm */}
    <path d="M20 32V65L50 82V49L20 32Z" fill="#a855f7" />
    <path d="M25 45H35M25 55H35" stroke="#ffffff" strokeWidth="2" opacity="0.6" />

    {/* Mặt bên phải (Right) - Các nấc thang tăng */}
    <path d="M50 49V82L80 65V32L50 49Z" fill="#7e22ce" />
    <path d="M58 52V68M66 57V73M74 61V69" stroke="#c084fc" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ==========================================
// Ý TƯỞNG 3: CHỮ C CÁCH ĐIỆU (RIBBON & TIMELINE)
// ==========================================
export const RibbonCLogo = ({ size = 120 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://w3.org">
    <defs>
      <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6b21a8" />
        <stop offset="50%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#f3e8ff" />
      </linearGradient>
    </defs>
    {/* Vòng chữ C uốn lượn mềm mại */}
    <path 
      d="M70 25C50 10 25 25 25 50C25 75 50 90 70 75" 
      stroke="url(#gradient3)" 
      strokeWidth="12" 
      strokeLinecap="round" 
    />
    {/* Các vạch chia ngày (Timeline) trên lưng chữ C */}
    <circle cx="32" cy="33" r="3" fill="#ffffff" />
    <circle cx="26" cy="50" r="3" fill="#ffffff" />
    <circle cx="32" cy="67" r="3" fill="#ffffff" />
    
    {/* Điểm nhấn hiển thị mục tiêu số ở đầu mút */}
    <circle cx="70" cy="25" r="5" fill="#f43f5e" />
  </svg>
);

// ==========================================
// COMPONENT ĐỂ BẠN XEM TRỰC TIẾP CẢ 3 ICON
// ==========================================
export default function LogoViewer() {
  return (
    <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', padding: '30px', background: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <TimeSpiralLogo size={100} />
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>1. Vòng xoáy Thời gian</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <IsometricCubeLogo size={100} />
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>2. Khối lập phương 3D</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <RibbonCLogo size={100} />
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>3. Chữ C cách điệu</p>
      </div>
    </div>
  );
}
