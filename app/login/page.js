"use client";

import { useState } from "react";

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [isForgot, setIsForgot] = useState(false);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  function handleSignup() {
    if (!name || !mobile || !password) {
      alert("براہ کرم تمام معلومات درج کریں۔");
      return;
    }

    localStorage.setItem(
      "customer",
      JSON.stringify({
        name: name,
        mobile: mobile,
        password: password,
      })
    );

    alert("اکاؤنٹ کامیابی سے بن گیا!");

    setIsSignup(false);
    setName("");
    setMobile("");
    setPassword("");
    setShowPassword(false);
  }

  function handleLogin() {
    if (!mobile || !password) {
      alert("موبائل نمبر اور پاس ورڈ درج کریں۔");
      return;
    }

    const savedCustomer = localStorage.getItem("customer");

    if (!savedCustomer) {
      alert("پہلے Signup کریں۔");
      return;
    }

    const customer = JSON.parse(savedCustomer);

if (
  customer.mobile === mobile &&
  customer.password === password
) {
  alert("Login کامیاب!");
  window.location.href = "/";
    } else {
      alert("موبائل نمبر یا پاس ورڈ غلط ہے۔");
    }
  }

  function handleResetPassword() {
    if (!mobile || !newPassword) {
      alert("موبائل نمبر اور نیا پاس ورڈ درج کریں۔");
      return;
    }

    const savedCustomer = localStorage.getItem("customer");

    if (!savedCustomer) {
      alert("اس وقت کوئی Customer اکاؤنٹ موجود نہیں۔");
      return;
    }

    const customer = JSON.parse(savedCustomer);

    if (customer.mobile !== mobile) {
      alert("یہ موبائل نمبر کسی اکاؤنٹ سے موجود نہیں ہے۔");
      return;
    }

    customer.password = newPassword;

    localStorage.setItem(
      "customer",
      JSON.stringify(customer)
    );

    alert("پاس ورڈ کامیابی سے تبدیل ہوگیا!");

    setIsForgot(false);
    setNewPassword("");
    setPassword("");
  }

  function goToSignup() {
    setIsSignup(true);
    setIsForgot(false);
    setShowPassword(false);
  }

  function goToLogin() {
    setIsSignup(false);
    setIsForgot(false);
    setShowPassword(false);
    setShowNewPassword(false);
  }

  return (
    <main
      style={{
        maxWidth: 450,
        margin: "60px auto",
        padding: 20,
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          background: "white",
          padding: 30,
          borderRadius: 15,
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ textAlign: "center" }}>
          🛒 جنرل سٹور
        </h1>

        {isForgot ? (
          <>
            <h2 style={{ textAlign: "center" }}>
              🔑 پاس ورڈ ری سیٹ کریں
            </h2>

            <p style={{ textAlign: "center" }}>
              اپنا رجسٹرڈ موبائل نمبر اور نیا پاس ورڈ درج کریں۔
            </p>

            <input
              type="tel"
              placeholder="موبائل نمبر"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 12,
                boxSizing: "border-box",
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />

            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="نیا پاس ورڈ"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 10,
                boxSizing: "border-box",
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />

            <button
              type="button"
              onClick={() =>
                setShowNewPassword(!showNewPassword)
              }
              style={{
                marginBottom: 15,
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {showNewPassword
                ? "🙈 پاس ورڈ چھپائیں"
                : "👁️ پاس ورڈ دکھائیں"}
            </button>

            <button
              onClick={handleResetPassword}
              style={{
                width: "100%",
                padding: 13,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              🔐 نیا پاس ورڈ محفوظ کریں
            </button>

            <button
              onClick={goToLogin}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 10,
                background: "transparent",
                border: "1px solid #ccc",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Login پر واپس جائیں
            </button>
          </>
        ) : (
          <>
            <h2 style={{ textAlign: "center" }}>
              {isSignup
                ? "نیا اکاؤنٹ بنائیں"
                : "Customer Login"}
            </h2>

            {isSignup && (
              <input
                type="text"
                placeholder="اپنا نام"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  marginBottom: 12,
                  boxSizing: "border-box",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                }}
              />
            )}

            <input
              type="tel"
              placeholder="موبائل نمبر"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 12,
                boxSizing: "border-box",
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="پاس ورڈ"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 10,
                boxSizing: "border-box",
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              style={{
                marginBottom: 15,
                padding: "8px 12px",
                border: "1px solid #ccc",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {showPassword
                ? "🙈 Password چھپائیں"
                : "👁️ Password دکھائیں"}
            </button>

            <button
              onClick={
                isSignup ? handleSignup : handleLogin
              }
              style={{
                width: "100%",
                padding: 13,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              {isSignup ? "اکاؤنٹ بنائیں" : "Login"}
            </button>

            {!isSignup && (
              <button
                onClick={() => {
                  setIsForgot(true);
                  setPassword("");
                  setShowPassword(false);
                }}
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: 10,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                🔑 Forgot Password?
              </button>
            )}

            <p
              style={{
                textAlign: "center",
                marginTop: 20,
              }}
            >
              {isSignup
                ? "پہلے سے اکاؤنٹ موجود ہے؟"
                : "نیا Customer ہیں؟"}
            </p>

            <button
              onClick={
                isSignup ? goToLogin : goToSignup
              }
              style={{
                width: "100%",
                padding: 10,
                background: "transparent",
                border: "1px solid #ccc",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {isSignup
                ? "Login پر جائیں"
                : "Signup کریں"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}