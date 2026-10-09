import { useEffect, useState, type FormEvent } from 'react'
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

type MonthCountItem = {
  count: number;
  date: string;
};

type MonthCountResponse = {
  total: number;
  dateCountList: MonthCountItem[];
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

const notifyError = (message: string) => {
  toast.error(message, {
    position: 'top-right',
    autoClose: 3000,
  });
};

function App() {
  const today = new Date();
  const curDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [isAuthenticated, setIsAuthenticated] = useState(hasAuthToken);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [resendOtpCountdown, setResendOtpCountdown] = useState(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentYear, setCurrentYear] = useState<number>(Number(curDate.split('-')[0]));
  const [currentMonth, setCurrentMonth] = useState<number>(Number(curDate.split('-')[1])); // Tháng trong đời thực (1 - 12)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(curDate);

  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [isLoadingMonthCounts, setIsLoadingMonthCounts] = useState(false);
  const [isSavingCount, setIsSavingCount] = useState(false);

  const currentDayCount = dailyCounts[selectedDateStr] || 0;

  useEffect(() => {
    if (resendOtpCountdown <= 0) return;

    const timer = window.setTimeout(() => {
      setResendOtpCountdown((remaining) => Math.max(remaining - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendOtpCountdown]);

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
  const selectedDateLabel = new Intl.DateTimeFormat('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${selectedDateStr}T00:00:00`));

  useEffect(() => {
    if (!isAuthenticated) return;

    let isCurrentRequest = true;
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}-`;
    setDailyCounts(prev => Object.fromEntries(
      Object.entries(prev).filter(([date]) => !date.startsWith(monthPrefix)),
    ));
    setCurrentMonthTotal(0);
    setIsLoadingMonthCounts(true);

    const loadMonthCounts = async () => {
      try {
        const response = await api.get<MonthCountResponse>('/count', {
          params: { month: currentMonth, year: currentYear },
        });
        const { total, dateCountList } = response.data;

        if (dateCountList === null) {
          return;
        }

        if (!Number.isFinite(total) || !Array.isArray(dateCountList)) {
          throw new Error('Dữ liệu thống kê tháng từ backend không đúng định dạng.');
        }

        const countsByDate: Record<string, number> = {};
        // if (dateCountList.)
        for (const item of dateCountList) {
          const date = item.date?.slice(0, 10);
          if (!date || !Number.isFinite(item.count)) {
            throw new Error('Một mục thống kê ngày từ backend không đúng định dạng.');
          }
          countsByDate[date] = item.count;
        }

        if (isCurrentRequest) {
          setDailyCounts(prev => ({ ...prev, ...countsByDate }));
          setCurrentMonthTotal(total);
        }
      } catch (error: unknown) {
        if (!isCurrentRequest) return;

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          clearAuthToken();
          setIsAuthenticated(false);
        }
        notifyError(getRequestErrorMessage(error, 'Không thể tải dữ liệu tháng.'));
      } finally {
        if (isCurrentRequest) setIsLoadingMonthCounts(false);
      }
    };

    void loadMonthCounts();
    return () => {
      isCurrentRequest = false;
    };
  }, [isAuthenticated, currentMonth, currentYear]);

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

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      notifyError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await api.post<{ status: string }>('/auth/signup', {
        email,
        password,
        name: fullName.trim(),
      });

      if (response.data.status !== 'success') {
        throw new Error('Backend không xác nhận đăng ký tài khoản.');
      }

      toast.success('Tạo tài khoản thành công. Hãy đăng nhập để tiếp tục.', {
        position: 'top-right',
        autoClose: 3500,
      });
      setIsRegistering(false);
      setPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      notifyError(getRequestErrorMessage(error, 'Đăng ký thất bại.'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRequestPasswordOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setIsOtpSent(true);
      setResendOtpCountdown(60);
      toast.success('Nếu email tồn tại, mã OTP sẽ được gửi đến hộp thư của bạn.', {
        position: 'top-right',
        autoClose: 4500,
      });
    } catch (error: unknown) {
      notifyError(getRequestErrorMessage(error, 'Không thể gửi mã OTP.'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResendPasswordOtp = async () => {
    setIsLoggingIn(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setResendOtpCountdown(60);
      toast.success('Nếu email tồn tại và đã qua thời gian chờ, mã OTP mới sẽ được gửi.', {
        position: 'top-right',
        autoClose: 4500,
      });
    } catch (error: unknown) {
      notifyError(getRequestErrorMessage(error, 'Không thể gửi lại mã OTP.'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      notifyError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const response = await api.post<{ status: string }>('/auth/reset-password', {
        email,
        otp,
        newPassword: password,
      });

      if (response.data.status !== 'success') {
        throw new Error('Backend không xác nhận đổi mật khẩu.');
      }

      toast.success('Đổi mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.', {
        position: 'top-right',
        autoClose: 4000,
      });
      setIsForgotPassword(false);
      setIsOtpSent(false);
      setResendOtpCountdown(0);
      setPassword('');
      setConfirmPassword('');
      setOtp('');
    } catch (error: unknown) {
      notifyError(getRequestErrorMessage(error, 'Không thể đổi mật khẩu.'));
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
      if (selectedDateStr.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}-`)) {
        setCurrentMonthTotal(prev => prev + actualChange);
      }
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
    const nextMonthDate = new Date(
      currentYear,
      currentMonth - 1 + (direction === 'next' ? 1 : -1),
      1,
    );
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth() + 1;
    const todayInTargetMonth = nextYear === today.getFullYear() && nextMonth === today.getMonth() + 1;

    setCurrentYear(nextYear);
    setCurrentMonth(nextMonth);
    setSelectedDateStr(todayInTargetMonth
      ? curDate
      : `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`);
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
                  <img src={rubicLogo} alt="" />
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
                  <img src={rubicLogo} alt="" />
                </span>
                <span>Counter</span>
              </div>
              <div className="login-heading">
                <span className="login-welcome">
                  {isForgotPassword
                    ? (isOtpSent ? 'XÁC THỰC BẢO MẬT' : 'KHÔI PHỤC TÀI KHOẢN')
                    : (isRegistering ? 'BẮT ĐẦU HÀNH TRÌNH CỦA BẠN' : 'CHÀO MỪNG BẠN TRỞ LẠI')}
                </span>
                <h1 id="login-title" className="login-title">
                  {isForgotPassword
                    ? (isOtpSent ? 'Đặt mật khẩu mới' : 'Quên mật khẩu?')
                    : (isRegistering ? 'Tạo tài khoản' : 'Đăng nhập')}
                </h1>
                <p>
                  {isForgotPassword
                    ? (isOtpSent
                      ? `Nhập mã OTP đã gửi tới ${email} và tạo mật khẩu mới.`
                      : 'Nhập email của bạn. Chúng tôi sẽ gửi mã OTP để xác minh tài khoản.')
                    : (isRegistering
                      ? 'Tạo tài khoản để lưu lại từng bước tiến mỗi ngày.'
                      : 'Đăng nhập để tiếp tục hành trình tích lũy của bạn.')}
                </p>
              </div>

              <form
                className={`login-form${isRegistering || (isForgotPassword && isOtpSent) ? ' register-form' : ''}`}
                onSubmit={
                  isForgotPassword
                    ? (isOtpSent ? handleResetPassword : handleRequestPasswordOtp)
                    : (isRegistering ? handleRegister : handleLogin)
                }
              >
                {isRegistering && !isForgotPassword && (
                  <div className="login-field">
                    <label htmlFor="register-name">Họ và tên</label>
                    <div className="login-input-wrap">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
                        <path d="M5 20c.7-3.2 3.2-5 7-5s6.3 1.8 7 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                      <input
                        id="register-name"
                        type="text"
                        autoComplete="name"
                        placeholder="Tên của bạn"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
                {(!isForgotPassword || !isOtpSent) && (
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
                )}
                {isForgotPassword && isOtpSent && (
                  <div className="login-field">
                    <label htmlFor="reset-otp">Mã OTP gồm 6 chữ số</label>
                    <div className="login-input-wrap">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3.5" y="5" width="17" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
                        <path d="M7 10h.01M12 10h.01M17 10h.01M7 14h.01M12 14h.01M17 14h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      <input
                        id="reset-otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                      />
                    </div>
                    <p className="otp-help">Mã có hiệu lực trong 5 phút.</p>
                  </div>
                )}
                {(!isForgotPassword || isOtpSent) && <div className="login-field">
                  <div className="login-label-row">
                    <label htmlFor="login-password">
                      {isForgotPassword ? 'Mật khẩu mới' : 'Mật khẩu'}
                    </label>
                    {!isRegistering && !isForgotPassword && (
                      <button
                        className="forgot-password-link"
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setIsOtpSent(false);
                          setResendOtpCountdown(0);
                          setPassword('');
                          setConfirmPassword('');
                          setOtp('');
                        }}
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                  </div>
                  <div className="login-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="4" y="10" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isRegistering || isForgotPassword ? 'new-password' : 'current-password'}
                      minLength={isForgotPassword ? 8 : undefined}
                      placeholder={isForgotPassword ? 'Tạo mật khẩu mới' : 'Nhập mật khẩu'}
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
                </div>}
                {(isRegistering || (isForgotPassword && isOtpSent)) && (
                  <div className="login-field">
                    <label htmlFor="register-confirm-password">
                      {isForgotPassword ? 'Xác nhận mật khẩu mới' : 'Xác nhận mật khẩu'}
                    </label>
                    <div className="login-input-wrap">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="4" y="10" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3M9.5 15l1.7 1.7 3.5-3.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <input
                        id="register-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        minLength={isForgotPassword ? 8 : undefined}
                        placeholder="Nhập lại mật khẩu"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
                <button className="login-submit" type="submit" disabled={isLoggingIn}>
                  <span>
                    {isLoggingIn
                      ? (isForgotPassword
                        ? (isOtpSent ? 'Đang đổi mật khẩu...' : 'Đang gửi mã OTP...')
                        : (isRegistering ? 'Đang tạo tài khoản...' : 'Đang đăng nhập...'))
                      : (isForgotPassword
                        ? (isOtpSent ? 'Đổi mật khẩu' : 'Gửi mã OTP')
                        : (isRegistering ? 'Tạo tài khoản' : 'Đăng nhập'))}
                  </span>
                  {!isLoggingIn && <span className="login-submit-arrow" aria-hidden="true">→</span>}
                </button>
              </form>
              {isForgotPassword ? (
                <p className="login-switch-mode">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setIsOtpSent(false);
                      setResendOtpCountdown(0);
                      setOtp('');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    ← Quay lại đăng nhập
                  </button>
                  {isOtpSent && (
                    <button
                      type="button"
                      className="resend-otp-button"
                      disabled={isLoggingIn || resendOtpCountdown > 0}
                      onClick={() => void handleResendPasswordOtp()}
                    >
                      {resendOtpCountdown > 0
                        ? `Gửi lại mã sau ${String(Math.floor(resendOtpCountdown / 60)).padStart(2, '0')}:${String(resendOtpCountdown % 60).padStart(2, '0')}`
                        : 'Gửi lại mã'}
                    </button>
                  )}
                </p>
              ) : (
                <p className="login-switch-mode">
                  {isRegistering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering((registering) => !registering);
                      setPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    {isRegistering ? 'Đăng nhập' : 'Tạo tài khoản'}
                  </button>
                </p>
              )}
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
      <main className="dashboard-page">
        <header className="dashboard-header">
          <a className="dashboard-brand" href="#" aria-label="Counter - trang chủ">
            <span className="dashboard-brand-mark" aria-hidden="true">
              <img className="dashboard-brand-hero" src={heroImg} alt="" />
              <img className="dashboard-brand-logo dashboard-brand-c" src={cLogo} alt="" />
              <img className="dashboard-brand-logo dashboard-brand-time" src={timeLogo} alt="" />
            </span>
            <span>counter<span className="dashboard-brand-dot">.</span></span>
          </a>
          <div className="dashboard-header-actions">
            <span className="dashboard-session"><span /> Đang hoạt động</span>
            <button
              type="button"
              className="dashboard-logout"
              onClick={() => {
                clearAuthToken();
                setIsAuthenticated(false);
              }}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M8.2 3.5H4.8c-.7 0-1.3.6-1.3 1.3v10.4c0 .7.6 1.3 1.3 1.3h3.4M11.8 13.5l3.5-3.5-3.5-3.5M15.3 10H7.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="dashboard-welcome">
            <div>
              <p className="dashboard-eyebrow">KHÔNG NGỪNG TIẾN LÊN</p>
              <h1>Chào bạn, <span>hôm nay thế nào?</span></h1>
              <p className="dashboard-subtitle">Mỗi lần tích lũy là một bước gần hơn tới mục tiêu của bạn.</p>
            </div>
            <div className="dashboard-today">
              <span className="dashboard-today-icon" aria-hidden="true">✦</span>
              <span>
                <small>HÔM NAY</small>
                <strong>{new Intl.DateTimeFormat('vi-VN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }).format(new Date())}</strong>
              </span>
            </div>
            {/* <img className="dashboard-logo-calendar" src={rubicLogo} alt="" /> */}
          </section>

          <section className="dashboard-grid">
            <article className="dashboard-panel counter-panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">BỘ ĐẾM CỦA BẠN</p>
                  <h2>Tích lũy trong ngày</h2>
                </div>
                <span className="panel-date">{selectedDateLabel}</span>
              </div>
              <div className="counter-orb" aria-live="polite">
                <span className="counter-orb-ring counter-orb-ring-one" />
                <span className="counter-orb-ring counter-orb-ring-two" />
                <span className="counter-orb-content">
                  <small>SỐ LẦN</small>
                  <strong>{currentDayCount}</strong>
                  <span>đã hoàn thành</span>
                </span>
                <span className="counter-orb-spark counter-orb-spark-one" aria-hidden="true">✦</span>
                <span className="counter-orb-spark counter-orb-spark-two" aria-hidden="true">✧</span>
              </div>
              <div className="counter-actions">
                <button
                  type="button"
                  className="counter-decrement"
                  disabled={isSavingCount || isLoadingMonthCounts || currentDayCount === 0}
                  onClick={() => handleCounterChange(-1)}
                  aria-label="Giảm một lần tích lũy"
                >
                  <span aria-hidden="true">−</span>
                  <span>Giảm</span>
                </button>
                <button
                  type="button"
                  className="counter-increment"
                  disabled={isSavingCount || isLoadingMonthCounts}
                  onClick={() => handleCounterChange(1)}
                >
                  <span aria-hidden="true">{isSavingCount ? '…' : '+'}</span>
                  {isSavingCount ? 'Đang lưu' : 'Thêm một lần'}
                </button>
              </div>
              <p className="counter-hint">Chọn ngày trên lịch để xem hoặc cập nhật số lần.</p>
            </article>

            <article className="dashboard-panel calendar-panel">
              <div className="calendar-heading">
                <div>
                  <p className="panel-kicker">LỊCH TÍCH LŨY</p>
                  <h2>Hành trình của bạn</h2>
                </div>
                <div className="calendar-month-switch">
                  <button type="button" onClick={() => handleMonthChange('prev')} aria-label="Tháng trước">‹</button>
                  <strong>Tháng {String(currentMonth).padStart(2, '0')} · {currentYear}</strong>
                  <button type="button" onClick={() => handleMonthChange('next')} aria-label="Tháng sau">›</button>
                </div>
              </div>
              <div className="calendar-weekdays">
                {weekdays.map(day => <span key={day}>{day}</span>)}
              </div>
              <div className="calendar-days">
                {allDays.map((item, index) => {
                  if (!item) return <span className="calendar-empty" key={`empty-${index}`} />;

                  const isSelected = selectedDateStr === item.dateString;
                  const dayCount = dailyCounts[item.dateString] || 0;
                  const isToday = item.dateString === curDate;

                  return (
                    <button
                      key={item.dateString}
                      type="button"
                      className={`calendar-day${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}${dayCount > 0 ? ' has-count' : ''}`}
                      onClick={() => setSelectedDateStr(item.dateString)}
                      aria-pressed={isSelected}
                      aria-label={`${item.day} ${dayCount > 0 ? `, ${dayCount} lần tích lũy` : ''}${isToday ? ', hôm nay' : ''}`}
                    >
                      <span>{item.day}</span>
                      {dayCount > 0 && <small>{dayCount}</small>}
                    </button>
                  );
                })}
              </div>
              <footer className="calendar-legend">
                <span><i className="legend-today" /> Hôm nay</span>
                <span><i className="legend-count" /> Có tích lũy</span>
                <span className="calendar-selected-date">Đang chọn: {selectedDateLabel}</span>
              </footer>
            </article>
          </section>

          <section className="dashboard-summary" aria-label="Thống kê tích lũy">
            <article className="summary-card summary-card-month">
              <span className="summary-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="3.5" y="5" width="17" height="16" rx="3.5" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M8 3v4M16 3v4M4 9.5h16M8 13h2M14 13h2M8 16.5h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </span>
              <span className="summary-copy">
                <span>Tổng tháng này</span>
                <strong>{isLoadingMonthCounts ? '…' : currentMonthTotal}</strong>
                <small>lần tích lũy</small>
              </span>
              <span className="summary-card-spark" aria-hidden="true">↗</span>
            </article>
            {/* <article className="summary-card summary-card-day">
              <span className="summary-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M12 7v5l3.2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="summary-copy">
                <span>Ngày đang chọn</span>
                <strong>{currentDayCount}</strong>
                <small>{selectedDateLabel}</small>
              </span>
              <span className="summary-day-badge">
                {selectedDateStr === curDate ? 'HÔM NAY' : 'ĐANG CHỌN'}
              </span>
            </article> */}
          </section>
          <footer className="dashboard-footer">
            <span>Counter</span>
            <span>Những bước nhỏ tạo nên thay đổi lớn.</span>
          </footer>
        </div>
      </main>
      <ToastContainer />
    </>
  )
}

export default App
