"use client";

import { useState } from "react";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
} from "firebase/firestore";
import app from "../firebase";

const auth = getAuth(app);
const db = getFirestore(app);

export default function ShopkeeperLoginPage() {
  const [isSignup, setIsSignup] = useState(false);

  const [shopName, setShopName] = useState("");
  const [shopType, setShopType] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  function getFirebaseEmail(phoneNumber) {
    const cleanMobile = phoneNumber.replace(/\D/g, "");

    return `${cleanMobile}@shopkeeper.generalstore.app`;
  }

  async function handleSignup() {
    if (!shopName || !shopType || !mobile || !password) {
      alert("براہِ کرم تمام معلومات درج کریں۔");
      return;
    }

    if (password.length < 6) {
      alert("پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔");
      return;
    }

    try {
      const firebaseEmail = getFirebaseEmail(mobile);

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          firebaseEmail,
          password
        );

      const user = userCredential.user;

      await setDoc(doc(db, "shopkeepers", user.uid), {
        uid: user.uid,
        shopName: shopName.trim(),
        shopType: shopType,
        mobile: mobile.trim(),
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem(
        "shopkeeper",
        JSON.stringify({
          uid: user.uid,
          shopName: shopName.trim(),
          shopType: shopType,
          mobile: mobile.trim(),
        })
      );

      localStorage.setItem("shopkeeperLogin", "true");

      alert("Shopkeeper اکاؤنٹ کامیابی سے بن گیا!");

      window.location.href = "/shopkeeper-dashboard";
    } catch (error) {
      console.log("Firebase Signup Error:", error);

      if (error.code === "auth/email-already-in-use") {
        alert(
          "یہ موبائل نمبر پہلے سے کسی account کے لیے استعمال ہو چکا ہے۔ براہِ کرم نیا موبائل نمبر استعمال کریں۔"
        );
      } else if (error.code === "auth/invalid-email") {
        alert("موبائل نمبر درست درج کریں۔");
      } else if (error.code === "auth/weak-password") {
        alert("پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔");
      } else if (error.code === "permission-denied") {
        alert(
          "Firestore میں data save کرنے کی اجازت نہیں ہے۔"
        );
      } else {
        alert(
          "اکاؤنٹ بنانے میں مسئلہ آیا۔ براہِ کرم دوبارہ کوشش کریں۔"
        );
      }
    }
  }

  async function handleLogin() {
    if (!mobile || !password) {
      alert("موبائل نمبر اور پاس ورڈ درج کریں۔");
      return;
    }

    try {
      const firebaseEmail = getFirebaseEmail(mobile);

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          firebaseEmail,
          password
        );

      const user = userCredential.user;

      const savedShopkeeper =
        localStorage.getItem("shopkeeper");

      if (savedShopkeeper) {
        try {
          const shopkeeper = JSON.parse(savedShopkeeper);

          localStorage.setItem(
            "shopkeeper",
            JSON.stringify({
              ...shopkeeper,
              uid: user.uid,
              mobile: mobile.trim(),
            })
          );
        } catch (error) {
          console.log("Local shopkeeper data error");
        }
      } else {
        localStorage.setItem(
          "shopkeeper",
          JSON.stringify({
            uid: user.uid,
            mobile: mobile.trim(),
          })
        );
      }

      localStorage.setItem("shopkeeperLogin", "true");

      alert("Shopkeeper Login کامیاب!");

      window.location.href = "/shopkeeper-dashboard";
    } catch (error) {
      console.log("Firebase Login Error:", error);

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        alert("موبائل نمبر یا پاس ورڈ غلط ہے۔");
      } else {
        alert(
          "Login میں مسئلہ آیا۔ براہِ کرم دوبارہ کوشش کریں۔"
        );
      }
    }
  }

  function goToSignup() {
    setIsSignup(true);
    setShowPassword(false);
  }

  function goToLogin() {
    setIsSignup(false);
    setShowPassword(false);
  }

  return (
    <main
      style={{
        maxWidth: 450,
        margin: "60px auto",
        padding: 20,
        fontFamily: "Arial",
        direction: "rtl",
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
          🏪 Shopkeeper
        </h1>

        <h2 style={{ textAlign: "center" }}>
          {isSignup
            ? "نیا Shopkeeper اکاؤنٹ"
            : "Shopkeeper Login"}
        </h2>

        {isSignup && (
          <>
            <label>دکان کا نام</label>

            <input
              type="text"
              placeholder="مثلاً Hadi Raza General Store"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              style={inputStyle}
            />

            <label>دکان کی قسم</label>

            <select
              value={shopType}
              onChange={(e) => setShopType(e.target.value)}
              style={selectStyle}
            >
              <option value="">
                دکان کی قسم منتخب کریں
              </option>

              <option value="general-store">
                🛒 جنرل سٹور / کریانہ
              </option>

              <option value="clothing">
                👕 کپڑوں کی دکان
              </option>

              <option value="shoes">
                👟 جوتوں کی دکان
              </option>

              <option value="mobile">
                📱 موبائل شاپ
              </option>

              <option value="electronics">
                💻 الیکٹرانکس / کمپیوٹر
              </option>

              <option value="hardware">
                🛠️ ہارڈویئر
              </option>

              <option value="stationery">
                📚 اسٹیشنری
              </option>

              <option value="cosmetics">
                💄 کاسمیٹکس
              </option>

              <option value="bakery">
                🍞 بیکری / فوڈ
              </option>

              <option value="fruits-vegetables">
                🥬 سبزی / پھل
              </option>

              <option value="other">
                🏪 دوسری دکان
              </option>
            </select>
          </>
        )}

        <label>موبائل نمبر</label>

        <input
          type="tel"
          placeholder="03XXXXXXXXX"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          style={{
            ...inputStyle,
            direction: "ltr",
            textAlign: "left",
          }}
        />

        <label>پاس ورڈ</label>

        <input
          type={showPassword ? "text" : "password"}
          placeholder="کم از کم 6 حروف"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            ...inputStyle,
            direction: "ltr",
            textAlign: "left",
          }}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            marginBottom: 15,
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {showPassword
            ? "🙈 پاس ورڈ چھپائیں"
            : "👁️ پاس ورڈ دکھائیں"}
        </button>

        <button
          onClick={isSignup ? handleSignup : handleLogin}
          style={{
            width: "100%",
            padding: 13,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 16,
            background: "#16a34a",
            color: "white",
          }}
        >
          {isSignup
            ? "اکاؤنٹ بنائیں"
            : "Shopkeeper Login"}
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
          }}
        >
          {isSignup
            ? "پہلے سے Shopkeeper اکاؤنٹ موجود ہے؟"
            : "نئی دکان رجسٹر کرنی ہے؟"}
        </p>

        <button
          onClick={isSignup ? goToLogin : goToSignup}
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
            : "Shopkeeper Signup"}
        </button>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: 12,
  marginTop: 6,
  marginBottom: 15,
  boxSizing: "border-box",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 15,
  fontFamily: "Arial",
};

const selectStyle = {
  width: "100%",
  padding: 12,
  marginTop: 6,
  marginBottom: 15,
  boxSizing: "border-box",
  borderRadius: 8,
  background: "white",
  fontSize: 15,
  fontFamily: "Arial",
};