import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import heroImg from './assets/hero.png'
import cLogo from './assets/c_logo.png'
import rubicLogo from './assets/rubic_logo.png'
import timeLogo from './assets/time_logo.png'
import './App.css'
import api, { clearAuthToken, hasAuthToken, saveAuthToken } from './services/axiosClient'

type ApiErrorPayload = {
  message?: unknown;
  error?: unknown;
  detail?: unknown;
};

const getRequestErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const payload = error.response?.data;
    const backendMessage = [payload?.message, payload?.error, payload?.detail]
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0);

    if (backendMessage) return backendMessage;
    if (error.response?.status === 401) return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.response?.status === 403) return 'Backend từ chối quyền thực hiện thao tác (403). Hãy kiểm tra quyền tài khoản hoặc thời hạn JWT.';
    if (error.response?.status) return `${fallback} (HTTP ${error.response.status}).`;
  }

  return error instanceof Error ? error.message : fallback;
};

function App() {
  const curDate = new Date().toISOString().split('T')[0];
  const [isAuthenticated, setIsAuthenticated] = useState(hasAuthToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentYear, setCurrentYear] = useState<number>(Number(curDate.split('-')[0]));
  const [currentMonth, setCurrentMonth] = useState<number>(Number(curDate.split('-')[1])); // Tháng trong đời thực (1 - 12)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(curDate);
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);

  // 2. State lưu dữ liệu số lần đếm theo TỪNG NGÀY ĐẦY ĐỦ (Dạng key-value: { "2026-10-01": 3, "2026-10-05": 1 })
  const [dailyCounts, setDailyCounts] = useState<{ [key: string]: number }>({
    "2026-10-01": 0, // Dữ liệu mẫu ngày hiện tại trên ảnh của bạn
  });
  const [isSavingCount, setIsSavingCount] = useState(false);

  const currentDayCount = dailyCounts[selectedDateStr] || 0;

  // 3. THUẬT TOÁN TẠO DANH SÁCH CÁC NGÀY TRONG THÁNG
  const getDaysInMonth = (year: number, month: number) => {
    // Tháng trong đối tượng Date của JS chạy từ 0 - 11
    const jsMonth = month - 1;

    // Tìm thứ của ngày đầu tiên trong tháng (0: Chủ Nhật, 1: Thứ Hai, ..., 6: Thứ Bảy)
    const firstDayIndex = new Date(year, jsMonth, 1).getDay();

    // Tìm tổng số ngày của tháng đó
    const totalDays = new Date(year, month, 0).getDate();

    const daysArray = [];

    // Tạo các ô trống đại diện cho các ngày thuộc tháng trước (để lịch lùi đúng thứ)
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(null);
    }

    // Điền các ngày thực tế của tháng hiện tại vào mảng
    for (let day = 1; day <= totalDays; day++) {
      // Định dạng chuỗi ngày chuẩn YYYY-MM-DD (Ví dụ: "2026-10-05")
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      daysArray.push({ day, dateString });
    }

    return daysArray;
  };

  const allDays = getDaysInMonth(currentYear, currentMonth);
  const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const notifyError = (message: string) => {
    // Gọi hàm thông báo lỗi của thư viện
    toast.error(message, {
      position: "top-right", // Vị trí hiển thị
      autoClose: 3000,       // Tự động đóng sau 3 giây
    });
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);

    try {
      const response = await api.post<{ accessToken: string; tokenType: string }>('/auth/login', {
        email,
        password,
      });
      const { accessToken, tokenType } = response.data;

      if (!accessToken || !tokenType) {
        throw new Error('Phản hồi đăng nhập không có accessToken hoặc tokenType.');
      }

      saveAuthToken(accessToken, tokenType);
      setIsAuthenticated(true);
      setPassword('');
    } catch (error: unknown) {
      notifyError(getRequestErrorMessage(error, 'Đăng nhập thất bại.'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 4. Hàm tăng/giảm lượt đếm của ngày đang chọn
  const handleCounterChange = async (amount: number) => {
    const currentCount = dailyCounts[selectedDateStr] || 0;
    const nextCount = Math.max(0, currentCount + amount);
    const actualChange = nextCount - currentCount;

    if (actualChange === 0) return;

    setIsSavingCount(true);
    try {
      const response = await api.post<{ status: string }>('/count', {
        date: selectedDateStr,
        count: String(actualChange),
      });

      if (response.data.status !== 'success') {
        throw new Error('Backend không xác nhận lưu dữ liệu.');
      }

      setDailyCounts(prev => ({
        ...prev,
        [selectedDateStr]: nextCount,
      }));
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearAuthToken();
        setIsAuthenticated(false);
      }
      notifyError(getRequestErrorMessage(error, 'Không thể cập nhật số đếm.'));
    } finally {
      setIsSavingCount(false);
    }
  };

  // 5. Hàm chuyển đổi tháng (Khi ấn nút mũi tên Tới/Lùi)
  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <main className="login-page">
          <div className="login-glow login-glow-one" />
          <div className="login-glow login-glow-two" />
          <section className="login-card" aria-labelledby="login-title">
            <aside className="login-aside">
              <div className="login-brand">
                <span className="login-brand-mark" aria-hidden="true">
                  <svg viewBox="0 0 32 32" fill="none">
                    <rect x="4.5" y="6.5" width="23" height="22" rx="6" stroke="currentColor" strokeWidth="2" />
                    <path d="M10 3.5v6M22 3.5v6M5 12h22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="m12.5 20 2.2 2.2 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>Counter</span>
              </div>
              <div className="login-aside-copy">
                <p className="login-eyebrow">MỖI NGÀY, MỘT BƯỚC TIẾN</p>
                <h2>Theo dõi hành trình của bạn.</h2>
                <p>Ghi lại từng lần tích lũy và nhìn thấy sự tiến bộ của bạn qua từng ngày.</p>
              </div>
              <div className="login-visual" aria-hidden="true">
                <div className="login-orbit login-orbit-outer" />
                <div className="login-orbit login-orbit-inner" />
                <div className="login-visual-card">
                  <span className="login-visual-label">HÔM NAY</span>
                  <strong>+1</strong>
                  <span className="login-visual-check">✓</span>
                </div>
                <span className="login-spark login-spark-one">✦</span>
                <span className="login-spark login-spark-two">✧</span>
              </div>
              <p className="login-aside-footer">Bắt đầu từ những điều nhỏ bé.</p>
            </aside>

            <div className="login-content">
              <div className="login-mobile-brand">
                <span className="login-brand-mark" aria-hidden="true">
                  <svg viewBox="0 0 32 32" fill="none">
                    <rect x="4.5" y="6.5" width="23" height="22" rx="6" stroke="currentColor" strokeWidth="2" />
                    <path d="M10 3.5v6M22 3.5v6M5 12h22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="m12.5 20 2.2 2.2 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>Counter</span>
              </div>
              <div className="login-heading">
                <span className="login-welcome">CHÀO MỪNG BẠN TRỞ LẠI</span>
                <h1 id="login-title" className="login-title">Đăng nhập</h1>
                <p>Đăng nhập để tiếp tục hành trình tích lũy của bạn.</p>
              </div>

              <form className="login-form" onSubmit={handleLogin}>
                <div className="login-field">
                  <label htmlFor="login-email">Địa chỉ email</label>
                  <div className="login-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="3.5" y="5" width="17" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
                      <path d="m5 7 7 5 7-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="username"
                      placeholder="ten@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="login-field">
                  <div className="login-label-row">
                    <label htmlFor="login-password">Mật khẩu</label>
                  </div>
                  <div className="login-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="4" y="10" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Nhập mật khẩu"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <button
                      className="login-password-toggle"
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>
                <button className="login-submit" type="submit" disabled={isLoggingIn}>
                  <span>{isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
                  {!isLoggingIn && <span className="login-submit-arrow" aria-hidden="true">→</span>}
                </button>
              </form>
              <div className="login-secure-note">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 2.5 3.5 5v4.2c0 4.1 2.7 6.9 6.5 8.3 3.8-1.4 6.5-4.2 6.5-8.3V5L10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="m7.5 9.8 1.7 1.7 3.4-3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Kết nối an toàn, thông tin của bạn được bảo vệ
              </div>
              <p className="login-copyright">© {new Date().getFullYear()} Counter. Tiến bộ mỗi ngày.</p>
            </div>
          </section>
        </main>
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <div className="main">
        <section>
          <div className="hero">
            <img src={heroImg} className="base" width="170" height="179" alt="" />
            <img src={cLogo} className="framework" alt="React logo" />
            <img src={timeLogo} className="vite" alt="Vite logo" />
          </div>
        </section>
        <section id="center">

          <div>
            <h1>Counter</h1>
            <button
              type="button"
              className="counter"
              onClick={() => {
                clearAuthToken();
                setIsAuthenticated(false);
              }}
            >
              Đăng xuất
            </button>
          </div>

          {/* Hiển thị ngày đã chọn ra màn hình để kiểm tra */}
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#64748b' }}>
            Tổng tích lũy trong tháng: <strong style={{ color: '#c084fc' }}>{currentMonthTotal}</strong>
          </p>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#64748b' }}>
            Ngày bạn đã chọn: <strong style={{ color: '#c084fc' }}>{selectedDateStr}</strong>
          </p>
          <button
            type="button"
            className="counter"
          // onClick={() => setCount((count) => count + 1)}
          >
            Đã tích lũy được {currentDayCount} lần
          </button>
          <button
            type="button"
            className="counter"
            disabled={isSavingCount}
            onClick={() => handleCounterChange(1)}
          >
            {isSavingCount ? 'Đang lưu...' : 'Tăng'}
          </button>
          <button
            type="button"
            className="counter"
            disabled={isSavingCount}
            onClick={() => {
              // if (count > 0) {
              handleCounterChange(-1)
              // } else {
              //   notifyError("Không thể giảm thêm!")
              // }
            }}
          >
            Giảm
          </button>
          <div style={{ marginTop: '30px', padding: '15px', borderTop: '1px dashed #e2e8f0' }}>
            <label htmlFor="date-picker" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Chọn ngày:
            </label>

            {/* <input
              id="date-picker"
              type="date"
              value={selectedDateStr}
              onChange={(e) => setSelectedDateStr(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #c084fc',
                fontSize: '16px',
                outline: 'none',
                cursor: 'pointer'
              }}
            /> */}



          {/* <div className="ticks"></div> */}

          {/* --- GIAO DIỆN BẢNG LỊCH TRỰC QUAN --- */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>

            {/* Bộ chuyển đổi Tháng / Năm */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <button onClick={() => handleMonthChange('prev')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#a855f7', fontWeight: 'bold' }}>&lt;</button>
              <h2 style={{ fontSize: '18px', margin: 0, color: '#1e293b' }}>Tháng {String(currentMonth).padStart(2, '0')} - {currentYear}</h2>
              <button onClick={() => handleMonthChange('next')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#a855f7', fontWeight: 'bold' }}>&gt;</button>
            </div>

            {/* Các cột tiêu đề Thứ trong tuần (T2 -> CN) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '10px' }}>
              {weekdays.map(day => (
                <div key={day} style={{ fontWeight: 'bold', color: '#94a3b8', fontSize: '12px', paddingBottom: '5px' }}>{day}</div>
              ))}
            </div>

            {/* Lưới các ô ngày */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {allDays.map((item, index) => {
                // Nếu là ô trống (ngày thuộc tháng trước)
                if (!item) return <div key={`empty-${index}`} />;

                const isSelected = selectedDateStr === item.dateString;
                const dayCount = dailyCounts[item.dateString] || 0;

                return (
                  <button
                    key={item.dateString}
                    onClick={() => setSelectedDateStr(item.dateString)}
                    style={{
                      aspectRatio: '1',
                      backgroundColor: isSelected ? '#a855f7' : '#f8fafc',
                      color: isSelected ? '#ffffff' : '#334155',
                      border: isSelected ? '1px solid #a855f7' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      padding: '4px', // Thêm chút padding để đẩy số đếm xuống dưới
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* 1. Hiển thị số ngày (Ví dụ: 1, 2, 3...) */}
                    <span style={{ fontSize: '14px', marginBottom: '2px' }}>{item.day}</span>

                    {/* 2. THAY THẾ DẤU CHẤM CŨ BẰNG ĐOẠN HIỂN THỊ SỐ LẦN ĐẾM TRỰC QUAN */}
                    {dayCount > 0 && (
                      <span style={{
                        fontSize: '10px',                /* Thu nhỏ kích thước số đếm */
                        lineHeight: '1',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        backgroundColor: isSelected ? '#ffffff' : '#f3e8ff', /* Đổi màu nền linh hoạt theo trạng thái click chọn */
                        color: isSelected ? '#a855f7' : '#a855f7',           /* Giữ màu chữ tím chủ đạo */
                        fontWeight: 'bold',
                        marginTop: '2px'
                      }}>
                        {dayCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

          </div>
          </div>

        </section>

        <section>
          <div>
            <img src={rubicLogo} className="rubic" alt="Vite logo" />
          </div>
        </section>

        {/* <div className="ticks"></div> */}
        {/* <section id="spacer"></section> */}
      </div>
      <ToastContainer />
    </>
  )
}

export default App
