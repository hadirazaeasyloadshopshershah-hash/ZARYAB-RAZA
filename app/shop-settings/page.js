"use client";

import { useEffect, useState } from "react";
import defaultShopSettings from "../shopSettings";

import app from "../firebase";
import {
  getFirestore,
  doc,
  setDoc,
} from "firebase/firestore";
import {
  getAuth,
} from "firebase/auth";

const db = getFirestore(app);
const auth = getAuth(app);

export default function ShopSettingsPage() {
  const [settings, setSettings] = useState({
    ...defaultShopSettings,

    shopType: "",

    deliveryRanges: [
      {
        enabled: true,
        limit: 150,
        charge: 50,
        free: false,
      },
      {
        enabled: true,
        limit: 500,
        charge: 30,
        free: false,
      },
      {
        enabled: true,
        limit: "",
        charge: 0,
        free: true,
      },
    ],
  });

  const [shopImage, setShopImage] = useState("");

  useEffect(() => {
    const savedShop =
      localStorage.getItem("shopSettings");

    if (!savedShop) return;

    try {
      const parsed = JSON.parse(savedShop);

      let ranges = parsed.deliveryRanges;

      if (!Array.isArray(ranges)) {
        ranges = [
          {
            enabled: true,
            limit: parsed.deliveryLimit ?? 4999,
            charge: parsed.deliveryCharge ?? 100,
            free: false,
          },
          {
            enabled: true,
            limit: "",
            charge: parsed.aboveLimitFree
              ? 0
              : parsed.aboveLimitDelivery ?? "",
            free: parsed.aboveLimitFree ?? true,
          },
          {
            enabled: false,
            limit: "",
            charge: 0,
            free: true,
          },
        ];
      }

      ranges = ranges.map((range) => ({
        enabled:
          range.enabled !== false,

        limit:
          range.limit ?? "",

        charge:
          range.free
            ? 0
            : range.charge ?? "",

        free:
          range.free === true,
      }));

      setSettings({
        ...defaultShopSettings,
        ...parsed,
        shopType: parsed.shopType || "",
        deliveryRanges: ranges,
      });

      setShopImage(parsed.shopImage || "");
    } catch (error) {
      console.log(
        "Shop settings load error:",
        error
      );
    }
  }, []);

  // --------------------------------
  // SHOP IMAGE
  // --------------------------------

  function handleImage(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(
        "براہِ کرم صرف تصویر منتخب کریں۔"
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert(
        "تصویر 2MB سے کم ہونی چاہیے۔"
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setShopImage(reader.result);
    };

    reader.readAsDataURL(file);
  }

  // --------------------------------
  // UPDATE DELIVERY RANGE
  // --------------------------------

  function updateRange(
    index,
    field,
    value
  ) {
    const updatedRanges = [
      ...settings.deliveryRanges,
    ];

    if (field === "free") {
      updatedRanges[index] = {
        ...updatedRanges[index],

        free: value,

        charge: value
          ? 0
          : updatedRanges[index].charge,
      };
    } else {
      updatedRanges[index] = {
        ...updatedRanges[index],
        [field]: value,
      };
    }

    setSettings({
      ...settings,
      deliveryRanges:
        updatedRanges,
    });
  }

  // --------------------------------
  // SAVE SETTINGS
  // --------------------------------

  async function saveSettings() {
    if (!settings.shopName?.trim()) {
      alert(
        "براہِ کرم دکان کا نام لکھیں۔"
      );
      return;
    }

    if (!settings.mobile?.trim()) {
      alert(
        "براہِ کرم دکان کا موبائل نمبر لکھیں۔"
      );
      return;
    }

    if (!settings.shopType?.trim()) {
      alert(
        "براہِ کرم دکان کی قسم منتخب کریں۔"
      );
      return;
    }

    const ranges =
      settings.deliveryRanges
        .filter(
          (range) => range.enabled
        )
        .map((range) => ({
          enabled: true,

          limit:
            range.limit === ""
              ? ""
              : Number(range.limit),

          charge:
            range.free
              ? 0
              : range.charge === ""
              ? ""
              : Number(range.charge),

          free:
            range.free === true,
        }));

    // --------------------------------
    // VALIDATE DELIVERY RANGES
    // --------------------------------

    for (
      let i = 0;
      i < ranges.length;
      i++
    ) {
      const range = ranges[i];

      if (
        range.limit !== "" &&
        (Number.isNaN(range.limit) ||
          range.limit < 0)
      ) {
        alert(
          `Delivery Range ${
            i + 1
          } کی حد درست درج کریں۔`
        );
        return;
      }

      if (
        !range.free &&
        range.charge !== "" &&
        (Number.isNaN(range.charge) ||
          range.charge < 0)
      ) {
        alert(
          `Delivery Range ${
            i + 1
          } کی Delivery رقم درست درج کریں۔`
        );
        return;
      }
    }

    // --------------------------------
    // GET SHOPKEEPER DATA
    // --------------------------------

    let shopkeeper = null;

    try {
      const savedShopkeeper =
        localStorage.getItem(
          "shopkeeper"
        );

      if (savedShopkeeper) {
        shopkeeper =
          JSON.parse(
            savedShopkeeper
          );
      }
    } catch (error) {
      console.log(
        "Shopkeeper data read error:",
        error
      );
    }

    const storeId =
      shopkeeper?.storeId ||
      settings.storeId ||
      "";

    // --------------------------------
    // FINAL SETTINGS
    // --------------------------------

    const finalSettings = {
      ...settings,

      shopName:
        settings.shopName.trim(),

      shopType:
        settings.shopType.trim(),

      mobile:
        settings.mobile.trim(),

      address:
        settings.address?.trim() || "",

      deliveryRanges:
        ranges,

      receiptName:
        settings.receiptName?.trim() ||
        settings.shopName.trim(),

      receiptMobile:
        settings.receiptMobile?.trim() ||
        settings.mobile.trim(),

      receiptAddress:
        settings.receiptAddress?.trim() ||
        settings.address?.trim() ||
        "",

      shopImage:
        shopImage || "",

      storeId,
    };

    // --------------------------------
    // SAVE LOCAL SETTINGS
    // --------------------------------

    localStorage.setItem(
      "shopSettings",
      JSON.stringify(
        finalSettings
      )
    );

    // --------------------------------
    // UPDATE LOCAL SHOPKEEPER
    // --------------------------------

    if (shopkeeper) {
      try {
        const updatedShopkeeper = {
          ...shopkeeper,

          shopName:
            finalSettings.shopName,

          shopType:
            finalSettings.shopType,

          mobile:
            finalSettings.mobile,

          address:
            finalSettings.address,

          shopImage:
            finalSettings.shopImage,

          storeId:
            storeId ||
            shopkeeper.storeId ||
            "",
        };

        localStorage.setItem(
          "shopkeeper",
          JSON.stringify(
            updatedShopkeeper
          )
        );
      } catch (error) {
        console.log(
          "Shopkeeper local data update error:",
          error
        );
      }
    }

    setSettings(
      finalSettings
    );

    // --------------------------------
    // FIRESTORE SYNC
    // --------------------------------

    if (!storeId) {
      alert(
        "معلومات محفوظ ہوگئیں، لیکن Store ID نہیں ملا اس لیے Firebase Sync نہیں ہوا۔"
      );
      return;
    }

    if (!auth.currentUser) {
      alert(
        "معلومات محفوظ ہوگئیں، لیکن Firebase Login موجود نہیں ہے۔"
      );
      return;
    }

    try {
      /*
       * IMPORTANT:
       * shopImage کو Firestore میں نہیں بھیج رہے،
       * کیونکہ Base64 تصویر Firestore document limit
       * کو بہت جلد cross کر سکتی ہے۔
       *
       * تصویر ابھی localStorage میں محفوظ رہے گی۔
       */

      const firestoreSettings = {
        ...finalSettings,

        shopImage: "",

        storeId,

        updatedAt:
          new Date().toISOString(),
      };

      await setDoc(
        doc(
          db,
          "shopSettings",
          String(storeId)
        ),
        firestoreSettings,
        {
          merge: true,
        }
      );

      alert(
        "دکان کی معلومات اور Delivery Charges کامیابی سے محفوظ ہوگئے!"
      );
    } catch (error) {
      console.error(
        "Firestore Shop Settings Sync Error:",
        error
      );

      console.error(
        "Firebase Error Code:",
        error?.code
      );

      console.error(
        "Firebase Error Message:",
        error?.message
      );

      if (
        error?.code ===
        "permission-denied"
      ) {
        alert(
          "معلومات موبائل میں محفوظ ہوگئیں، لیکن Firebase نے اجازت نہیں دی۔ Firestore Rules چیک کرنے کی ضرورت ہے۔"
        );
      } else {
        alert(
          "معلومات موبائل میں محفوظ ہوگئیں، لیکن Firebase Sync نہیں ہو سکا۔"
        );
      }
    }
  }

  // --------------------------------
  // GO TO DASHBOARD
  // --------------------------------

  function goToDashboard() {
    window.location.href =
      "/shopkeeper-dashboard";
  }

  return (
    <main
      style={{
        maxWidth: 650,
        margin: "30px auto",
        padding: 15,
        fontFamily: "Arial",
        direction: "rtl",
      }}
    >
      <div
        style={{
          background: "white",
          padding: 25,
          borderRadius: 15,
          boxShadow:
            "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        {/* HEADER */}

        <h1
          style={{
            textAlign: "center",
          }}
        >
          ⚙️ Shop Settings
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: 25,
          }}
        >
          اپنی دکان کی معلومات تبدیل کریں
        </p>

        {/* SHOP IMAGE */}

        <div
          style={{
            textAlign: "center",
            marginBottom: 25,
          }}
        >
          {shopImage ? (
            <img
              src={shopImage}
              alt="Shop"
              style={{
                width: 120,
                height: 120,
                objectFit: "cover",
                borderRadius: 15,
                display: "block",
                margin:
                  "0 auto 12px",
              }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                background: "#f3f4f6",
                borderRadius: 15,
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                fontSize: 55,
                margin:
                  "0 auto 12px",
              }}
            >
              🏪
            </div>
          )}

          <label
            style={{
              display:
                "inline-block",
              background:
                "#2563eb",
              color: "white",
              padding:
                "10px 16px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            📷 دکان کی تصویر تبدیل کریں

            <input
              type="file"
              accept="image/*"
              onChange={
                handleImage
              }
              hidden
            />
          </label>

          <p
            style={{
              fontSize: 12,
              color: "#777",
            }}
          >
            زیادہ سے زیادہ 2MB
          </p>
        </div>

        {/* SHOP NAME */}

        <label>
          دکان کا نام *
        </label>

        <input
          type="text"
          value={
            settings.shopName || ""
          }
          onChange={(e) =>
            setSettings({
              ...settings,
              shopName:
                e.target.value,
            })
          }
          placeholder="دکان کا نام"
          style={inputStyle}
        />

        {/* SHOP TYPE */}

        <label>
          دکان کی قسم *
        </label>

        <select
          value={
            settings.shopType || ""
          }
          onChange={(e) =>
            setSettings({
              ...settings,
              shopType:
                e.target.value,
            })
          }
          style={inputStyle}
        >
          <option value="">
            دکان کی قسم منتخب کریں
          </option>

          <option value="General Store">
            General Store
          </option>

          <option value="Kiryana Store">
            Kiryana Store
          </option>

          <option value="Medical Store">
            Medical Store
          </option>

          <option value="Bakery">
            Bakery
          </option>

          <option value="Milk Shop">
            Milk Shop
          </option>

          <option value="Fruit & Vegetable">
            Fruit & Vegetable
          </option>

          <option value="Mobile Shop">
            Mobile Shop
          </option>

          <option value="Garments">
            Garments
          </option>

          <option value="Cosmetics">
            Cosmetics
          </option>

          <option value="Electronics">
            Electronics
          </option>

          <option value="Other">
            Other
          </option>
        </select>

        {/* MOBILE */}

        <label>
          دکان کا موبائل نمبر *
        </label>

        <input
          type="tel"
          value={
            settings.mobile || ""
          }
          onChange={(e) =>
            setSettings({
              ...settings,
              mobile:
                e.target.value,
            })
          }
          placeholder="03XXXXXXXXX"
          style={inputStyle}
        />

        {/* ADDRESS */}

        <label>
          دکان کا پتہ
        </label>

        <textarea
          value={
            settings.address || ""
          }
          onChange={(e) =>
            setSettings({
              ...settings,
              address:
                e.target.value,
            })
          }
          placeholder="دکان کا مکمل پتہ"
          rows={3}
          style={inputStyle}
        />

        {/* DELIVERY */}

        <div
          style={{
            marginTop: 25,
            padding: 20,
            background:
              "#f8fafc",
            borderRadius: 12,
            border:
              "1px solid #e2e8f0",
          }}
        >
          <h2
            style={{
              marginTop: 0,
            }}
          >
            🚚 Delivery Charges
          </h2>

          <p
            style={{
              color: "#555",
              lineHeight: 1.7,
            }}
          >
            Shopkeeper ہر Delivery
            Range کے لیے الگ رقم
            مقرر کر سکتا ہے۔ اگر
            کسی Range میں Free
            Delivery چاہیے تو
            Free Delivery کو ON
            کریں۔
          </p>

          {settings.deliveryRanges.map(
            (range, index) => (
              <div
                key={index}
                style={{
                  marginTop: 18,
                  padding: 15,
                  background:
                    "white",
                  borderRadius: 10,
                  border:
                    "1px solid #dbeafe",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                  }}
                >
                  {index + 1}️⃣ Delivery Range
                </h3>

                <label>
                  کتنے روپے تک؟
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    range.limit
                  }
                  onChange={(e) =>
                    updateRange(
                      index,
                      "limit",
                      e.target.value
                    )
                  }
                  placeholder={
                    index ===
                    settings
                      .deliveryRanges
                      .length -
                      1
                      ? "خالی چھوڑیں = اس سے زیادہ"
                      : "مثلاً 150"
                  }
                  style={inputStyle}
                />

                <label>
                  Delivery کتنی؟
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    range.free
                      ? 0
                      : range.charge
                  }
                  onChange={(e) =>
                    updateRange(
                      index,
                      "charge",
                      e.target.value
                    )
                  }
                  disabled={
                    range.free
                  }
                  placeholder="مثلاً 50"
                  style={{
                    ...inputStyle,
                    background:
                      range.free
                        ? "#f1f5f9"
                        : "white",
                  }}
                />

                <label
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 8,
                    marginTop: 5,
                    cursor:
                      "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      range.free
                    }
                    onChange={(e) =>
                      updateRange(
                        index,
                        "free",
                        e.target
                          .checked
                      )
                    }
                    style={{
                      width: 20,
                      height: 20,
                    }}
                  />

                  Free Delivery
                </label>

                <p
                  style={{
                    fontSize: 13,
                    color: "#666",
                    marginBottom: 0,
                  }}
                >
                  {range.free
                    ? "اس Range میں Delivery بالکل Free ہوگی۔ Charges = Rs. 0"
                    : "اس Range کے آرڈر پر اوپر والی Delivery رقم لگے گی۔"}
                </p>
              </div>
            )
          )}

          {/* EXAMPLE */}

          <div
            style={{
              marginTop: 20,
              padding: 15,
              background:
                "#ecfdf5",
              borderRadius: 10,
              lineHeight: 1.9,
            }}
          >
            <strong>
              📌 موجودہ مثال:
            </strong>

            {settings.deliveryRanges.map(
              (range, index) => {
                if (
                  !range.enabled &&
                  range.limit === ""
                ) {
                  return null;
                }

                const limitText =
                  range.limit === ""
                    ? "اس سے زیادہ"
                    : `Rs ${
                        Number(
                          range.limit
                        ) || 0
                      } تک`;

                const chargeText =
                  range.free
                    ? "Free Delivery — Rs 0"
                    : range.charge === ""
                    ? "Delivery رقم درج نہیں"
                    : `Rs ${
                        Number(
                          range.charge
                        ) || 0
                      } Delivery`;

                return (
                  <div
                    key={index}
                  >
                    {index + 1}️⃣{" "}
                    {limitText}:{" "}
                    {chargeText}
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* SAVE BUTTON */}

        <button
          type="button"
          onClick={
            saveSettings
          }
          style={{
            width: "100%",
            marginTop: 20,
            padding: 14,
            border: "none",
            borderRadius: 9,
            background:
              "#16a34a",
            color: "white",
            cursor:
              "pointer",
            fontSize: 16,
          }}
        >
          💾 معلومات محفوظ کریں
        </button>

        {/* BACK BUTTON */}

        <button
          type="button"
          onClick={
            goToDashboard
          }
          style={{
            width: "100%",
            marginTop: 10,
            padding: 12,
            border:
              "1px solid #ccc",
            borderRadius: 9,
            background:
              "white",
            cursor:
              "pointer",
            fontSize: 15,
          }}
        >
          ⬅️ Dashboard پر واپس جائیں
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
  border:
    "1px solid #ccc",
  fontSize: 15,
  fontFamily: "Arial",
};