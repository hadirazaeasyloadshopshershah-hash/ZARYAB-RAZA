"use client";

import { useEffect, useState } from "react";
import products from "./products";
import defaultShopSettings from "./shopSettings";
import app from "./firebase";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

const db = getFirestore(app);

function formatQuantity(qty, unit) {
  if (!qty) return "";

  if (unit === "kg") {
    if (qty < 1) return `${qty * 1000} گرام`;
    return `${qty} کلو`;
  }

  if (unit === "liter") {
    return `${qty} لیٹر`;
  }

  if (unit === "pack") {
    return `${qty} پیک`;
  }

  return `${qty} عدد`;
}

function ProductTile({ product, cart, setCart }) {
  const selected = cart[product.id] || {
    qty: 0,
    amount: "",
  };

  function updateQty(qty) {
    setCart((prev) => ({
      ...prev,
      [product.id]: {
        ...selected,
        qty,
      },
    }));
  }

  function addAmount() {
    const amount = Number(selected.amount);

    if (!amount || amount <= 0) return;

    const qty = amount / product.price;

    setCart((prev) => ({
      ...prev,
      [product.id]: {
        qty,
        amount: "",
      },
    }));
  }

  function removeProduct() {
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[product.id];
      return updated;
    });
  }

  const total = selected.qty * product.price;

  return (
    <div className="product-tile">
      <h3>{product.name}</h3>

      <div className="price">
        Rs {product.price} / {product.unit}
      </div>

      <div className="qty-buttons">
        {product.unit === "kg" && (
          <>
            <button type="button" onClick={() => updateQty(0.25)}>
              250g
            </button>

            <button type="button" onClick={() => updateQty(0.5)}>
              500g
            </button>

            <button type="button" onClick={() => updateQty(1)}>
              1kg
            </button>

            <button type="button" onClick={() => updateQty(2)}>
              2kg
            </button>
          </>
        )}

        {product.unit === "liter" && (
          <>
            <button type="button" onClick={() => updateQty(0.5)}>
              0.5L
            </button>

            <button type="button" onClick={() => updateQty(1)}>
              1L
            </button>

            <button type="button" onClick={() => updateQty(2)}>
              2L
            </button>
          </>
        )}

        {(product.unit === "pack" ||
          product.unit === "piece") && (
          <>
            <button type="button" onClick={() => updateQty(1)}>
              1
            </button>

            <button type="button" onClick={() => updateQty(2)}>
              2
            </button>

            <button type="button" onClick={() => updateQty(3)}>
              3
            </button>

            <button type="button" onClick={() => updateQty(5)}>
              5
            </button>
          </>
        )}
      </div>

      <div className="amount-box">
        <input
          type="number"
          placeholder="روپے"
          value={selected.amount}
          onChange={(e) =>
            setCart((prev) => ({
              ...prev,
              [product.id]: {
                ...selected,
                amount: e.target.value,
              },
            }))
          }
        />

        <button type="button" onClick={addAmount}>
          +
        </button>
      </div>

      {selected.qty > 0 && (
        <div className="selected-box">
          <div>
            {formatQuantity(
              selected.qty,
              product.unit
            )}
          </div>

          <div>
            Rs {Math.round(total)}
          </div>

          <button type="button" onClick={removeProduct}>
            ختم کریں
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [cart, setCart] = useState({});
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [setupComplete, setSetupComplete] =
    useState(false);

  const [shopSettings, setShopSettings] =
    useState(defaultShopSettings);

  const [shopImage, setShopImage] = useState("");

  const [customer, setCustomer] = useState({
    name: "",
    mobile: "",
    address: "",
    message: "",
  });

  const [deliveryAccepted, setDeliveryAccepted] =
    useState(false);

  const [order, setOrder] = useState(null);

  // --------------------------------
  // LOAD SHOP SETTINGS
  // LOCAL + FIRESTORE
  // --------------------------------

  useEffect(() => {
    async function loadShopSettings() {
      let localSettings = null;

      // -----------------------------
      // LOCAL STORAGE
      // -----------------------------

      const savedShop =
        localStorage.getItem("shopSettings");

      if (savedShop) {
        try {
          localSettings = JSON.parse(savedShop);

          setShopSettings({
            ...defaultShopSettings,
            ...localSettings,
          });

          setShopImage(
            localSettings.shopImage || ""
          );

          setSetupComplete(true);
        } catch (error) {
          console.log(
            "Local shop settings error:",
            error
          );
        }
      }

      // -----------------------------
      // FIND STORE ID
      // -----------------------------

      let storeId = "";

      // 1. URL ?store=GS-XXXXXXXX
      try {
        const params =
          new URLSearchParams(
            window.location.search
          );

        storeId =
          params.get("store") ||
          params.get("storeId") ||
          "";
      } catch (error) {
        console.log(
          "URL Store ID error:",
          error
        );
      }

      // 2. Shopkeeper localStorage fallback
      if (!storeId) {
        try {
          const shopkeeper =
            JSON.parse(
              localStorage.getItem(
                "shopkeeper"
              ) || "null"
            );

          storeId =
            shopkeeper?.storeId || "";
        } catch (error) {
          console.log(
            "Shopkeeper Store ID error:",
            error
          );
        }
      }

      // 3. Existing shop settings fallback
      if (!storeId) {
        storeId =
          localSettings?.storeId ||
          "";
      }

      // -----------------------------
      // FIRESTORE SHOP SETTINGS
      // -----------------------------

      if (storeId) {
        try {
          const shopRef = doc(
            db,
            "shopSettings",
            String(storeId)
          );

          const shopSnap =
            await getDoc(shopRef);

          if (shopSnap.exists()) {
            const firestoreSettings =
              shopSnap.data();

            const mergedSettings = {
              ...defaultShopSettings,
              ...(localSettings || {}),
              ...firestoreSettings,
              storeId,
            };

            setShopSettings(
              mergedSettings
            );

            setShopImage(
              firestoreSettings.shopImage ||
                localSettings?.shopImage ||
                ""
            );

            setSetupComplete(true);

            // Customer device پر بھی save
            // کر دیں تاکہ اگلی بار فوراً
            // settings دستیاب ہوں
            try {
              localStorage.setItem(
                "shopSettings",
                JSON.stringify(
                  mergedSettings
                )
              );
            } catch (error) {
              console.log(
                "Shop settings local save error:",
                error
              );
            }

            console.log(
              "Shop Settings loaded from Firestore:",
              storeId
            );
          } else {
            console.log(
              "Firestore Shop Settings not found:",
              storeId
            );
          }
        } catch (error) {
          console.log(
            "Firestore Shop Settings Load Error:",
            error
          );
        }
      }

      // -----------------------------
      // CUSTOMER PROFILE
      // -----------------------------

      const savedCustomer =
        localStorage.getItem(
          "customerProfile"
        );

      if (savedCustomer) {
        try {
          const parsed =
            JSON.parse(savedCustomer);

          setCustomer((prev) => ({
            ...prev,
            name:
              parsed.name || "",
            mobile:
              parsed.mobile || "",
          }));
        } catch (error) {
          console.log(
            "Customer profile error"
          );
        }
      }
    }

    loadShopSettings();
  }, []);

  // --------------------------------
  // SELECTED PRODUCTS
  // --------------------------------

  const selectedProducts = products
    .filter(
      (product) =>
        cart[product.id]?.qty > 0
    )
    .map((product) => ({
      ...product,
      qty: cart[product.id].qty,
      total:
        cart[product.id].qty *
        product.price,
    }));

  const filteredProducts =
    products.filter((product) =>
      product.name
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  const subtotal =
    selectedProducts.reduce(
      (sum, product) =>
        sum + product.total,
      0
    );

  // --------------------------------
  // CALCULATE DELIVERY CHARGES
  // --------------------------------

  function calculateDeliveryCharges(
    amount
  ) {
    const subtotalAmount =
      Number(amount) || 0;

    const ranges =
      Array.isArray(
        shopSettings.deliveryRanges
      )
        ? shopSettings.deliveryRanges
        : [];

    // --------------------------------
    // OLD SETTINGS FALLBACK
    // --------------------------------

    if (ranges.length === 0) {
      const limit = Number(
        shopSettings.deliveryLimit
      );

      const firstCharge =
        Number(
          shopSettings.deliveryCharge
        ) || 0;

      const aboveLimitFree =
        shopSettings.aboveLimitFree !==
        false;

      const aboveLimitCharge =
        Number(
          shopSettings.aboveLimitDelivery
        ) || 0;

      if (
        !Number.isFinite(limit) ||
        subtotalAmount <= limit
      ) {
        return Math.max(
          0,
          firstCharge
        );
      }

      if (aboveLimitFree) {
        return 0;
      }

      return Math.max(
        0,
        aboveLimitCharge
      );
    }

    // --------------------------------
    // PREPARE ACTIVE RANGES
    // --------------------------------

    const validRanges =
      ranges
        .filter(
          (range) =>
            range &&
            range.enabled !== false
        )
        .map((range) => {
          const isUnlimited =
            range.limit === "" ||
            range.limit === null ||
            range.limit ===
              undefined;

          const limit =
            isUnlimited
              ? null
              : Number(
                  range.limit
                );

          const charge =
            range.free === true
              ? 0
              : range.charge ===
                    "" ||
                range.charge ===
                    null ||
                range.charge ===
                    undefined
              ? 0
              : Number(
                  range.charge
                );

          return {
            limit:
              limit === null ||
              Number.isFinite(limit)
                ? limit
                : null,

            charge:
              Number.isFinite(
                charge
              )
                ? Math.max(
                    0,
                    charge
                  )
                : 0,

            free:
              range.free === true,
          };
        });

    // --------------------------------
    // SORT RANGES
    // --------------------------------

    const sortedRanges = [
      ...validRanges.filter(
        (range) =>
          range.limit !== null
      ),
    ].sort(
      (a, b) =>
        Number(a.limit) -
        Number(b.limit)
    );

    const unlimitedRanges =
      validRanges.filter(
        (range) =>
          range.limit === null
      );

    const orderedRanges = [
      ...sortedRanges,
      ...unlimitedRanges,
    ];

    // --------------------------------
    // FIND MATCHING RANGE
    // --------------------------------

    for (const range of
      orderedRanges) {
      if (range.limit === null) {
        return range.free
          ? 0
          : Math.max(
              0,
              Number(
                range.charge
              ) || 0
            );
      }

      if (
        subtotalAmount <=
        Number(range.limit)
      ) {
        return range.free
          ? 0
          : Math.max(
              0,
              Number(
                range.charge
              ) || 0
            );
      }
    }

    return 0;
  }

  const deliveryCharges =
    calculateDeliveryCharges(
      subtotal
    );

  const grandTotal =
    subtotal +
    deliveryCharges;

  // --------------------------------
  // STEP 1 → BILL
  // --------------------------------

  function goToBill() {
    if (
      selectedProducts.length ===
      0
    ) {
      alert(
        "پہلے کوئی چیز منتخب کریں۔"
      );
      return;
    }

    setStep(2);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // --------------------------------
  // STEP 2 → CUSTOMER
  // --------------------------------

  function goToCustomer() {
    setDeliveryAccepted(false);

    setStep(3);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function editOrder() {
    setStep(1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // --------------------------------
  // SUBMIT ORDER
  // --------------------------------

  async function submitOrder() {
    if (!customer.name.trim()) {
      alert(
        "براہِ کرم اپنا نام لکھیں۔"
      );
      return;
    }

    if (!customer.mobile.trim()) {
      alert(
        "براہِ کرم موبائل نمبر لکھیں۔"
      );
      return;
    }

    if (!customer.address.trim()) {
      alert(
        "براہِ کرم ڈیلیوری ایڈریس لکھیں۔"
      );
      return;
    }

    if (!deliveryAccepted) {
      alert(
        "براہِ کرم Delivery Charges سے اتفاق کریں۔"
      );
      return;
    }

    const orderNumber =
      new Date()
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", "") +
      Math.floor(
        1000 +
          Math.random() * 9000
      );

    let shopkeeperData = null;

    try {
      shopkeeperData =
        JSON.parse(
          localStorage.getItem(
            "shopkeeper"
          ) || "null"
        );
    } catch (error) {
      console.log(
        "Shopkeeper data error"
      );
    }

    // URL Store ID کو سب سے زیادہ ترجیح
    let urlStoreId = "";

    try {
      const params =
        new URLSearchParams(
          window.location.search
        );

      urlStoreId =
        params.get("store") ||
        params.get("storeId") ||
        "";
    } catch (error) {
      console.log(
        "Order URL Store ID error:",
        error
      );
    }

    const storeId =
      urlStoreId ||
      shopkeeperData?.storeId ||
      shopSettings.storeId ||
      "";

    const orderItems =
      selectedProducts.map(
        (item) => ({
          id: item.id,
          productName:
            item.name,
          name: item.name,
          quantity:
            item.qty,
          qty: item.qty,
          unit:
            item.unit,
          price:
            item.price,
          total:
            item.total,
        })
      );

    // --------------------------------
    // FINAL ORDER
    // --------------------------------

    const newOrder = {
      orderNumber,

      storeId,

      shop: shopSettings,

      customer,
      customerName:
        customer.name,
      customerMobile:
        customer.mobile,
      customerAddress:
        customer.address,
      message:
        customer.message,

      items:
        orderItems,

      subtotal,

      total: subtotal,

      deliveryCharges,
      deliveryCharge:
        deliveryCharges,

      grandTotal,

      deliveryAccepted:
        true,

      status: "نیا",

      date:
        new Date().toLocaleString(
          "ur-PK"
        ),

      createdAt:
        new Date().toISOString(),
    };

    setOrder(newOrder);

    // --------------------------------
    // LOCAL ORDER
    // --------------------------------

    const localOrder = {
      ...newOrder,

      shop: {
        ...shopSettings,
        shopImage: "",
      },
    };

    localStorage.setItem(
      "lastOrder",
      JSON.stringify(
        localOrder
      )
    );

    let savedOrders = [];

    try {
      savedOrders =
        JSON.parse(
          localStorage.getItem(
            "orders"
          ) || "[]"
        );

      if (
        !Array.isArray(
          savedOrders
        )
      ) {
        savedOrders = [];
      }
    } catch (error) {
      savedOrders = [];
    }

    savedOrders.push(
      localOrder
    );

    let savedSuccessfully =
      false;

    while (
      savedOrders.length >
        0 &&
      !savedSuccessfully
    ) {
      try {
        localStorage.setItem(
          "orders",
          JSON.stringify(
            savedOrders
          )
        );

        savedSuccessfully =
          true;
      } catch (error) {
        if (
          error?.name ===
            "QuotaExceededError" ||
          error?.code === 22
        ) {
          if (
            savedOrders.length >
            1
          ) {
            savedOrders.shift();
          } else {
            console.log(
              "Orders storage is full."
            );
            break;
          }
        } else {
          console.log(
            "Orders localStorage error:",
            error
          );
          break;
        }
      }
    }

    // --------------------------------
    // CUSTOMER PROFILE
    // --------------------------------

    localStorage.setItem(
      "customerProfile",
      JSON.stringify({
        name:
          customer.name,
        mobile:
          customer.mobile,
      })
    );

    // --------------------------------
    // FIRESTORE ORDER
    // --------------------------------

    try {
      if (storeId) {
        await setDoc(
          doc(
            db,
            "orders",
            orderNumber
          ),
          {
            ...newOrder,
            syncedAt:
              new Date().toISOString(),
          }
        );

        console.log(
          "Order saved to Firestore:",
          orderNumber
        );
      } else {
        console.log(
          "Firestore Order Skip: Store ID موجود نہیں۔"
        );
      }
    } catch (error) {
      console.log(
        "Firestore Order Save Error:",
        error
      );
    }

    setStep(4);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // --------------------------------
  // SETUP PAGE
  // --------------------------------

  if (!setupComplete) {
    return (
      <>
        <div className="setup-page">
          <div className="setup-box">
            <div className="setup-icon">
              🏪
            </div>

            <h1>
              اپنی دکان سیٹ کریں
            </h1>

            <p className="setup-subtitle">
              پہلی بار استعمال کرنے سے پہلے اپنی
              دکان کی معلومات درج کریں۔
            </p>

            <div className="shop-image-area">
              {shopImage ? (
                <img
                  src={shopImage}
                  alt="Shop"
                  className="shop-image-preview"
                />
              ) : (
                <div className="shop-image-placeholder">
                  🏪
                </div>
              )}

              <label className="image-button">
                📷 دکان کی تصویر لگائیں

                <input
                  type="file"
                  accept="image/*"
                  hidden
                />
              </label>

              <p className="image-note">
                تصویر زیادہ سے زیادہ 2MB
              </p>
            </div>

            <label>
              دکان کا نام *
            </label>

            <input
              type="text"
              value={
                shopSettings.shopName
              }
              onChange={(e) =>
                setShopSettings({
                  ...shopSettings,
                  shopName:
                    e.target.value,
                })
              }
              placeholder="مثلاً Hadi Raza General Store"
            />

            <label>
              دکان کا موبائل نمبر *
            </label>

            <input
              type="tel"
              value={
                shopSettings.mobile
              }
              onChange={(e) =>
                setShopSettings({
                  ...shopSettings,
                  mobile:
                    e.target.value,
                })
              }
              placeholder="03XXXXXXXXX"
            />

            <label>
              دکان کا پتہ
            </label>

            <textarea
              value={
                shopSettings.address
              }
              onChange={(e) =>
                setShopSettings({
                  ...shopSettings,
                  address:
                    e.target.value,
                })
              }
              placeholder="دکان کا مکمل پتہ"
              rows={3}
            />

            <div className="setup-note">
              💡 Delivery Charges اب Shop Settings
              سے manage کیے جاتے ہیں۔
            </div>
          </div>
        </div>
      </>
    );
  }

  // --------------------------------
  // RECEIPT
  // --------------------------------

  if (
    step === 4 &&
    order
  ) {
    return (
      <>
        <div className="page">
          <div
            className="receipt"
            id="receipt"
          >
            {order.shop.shopImage && (
              <img
                src={
                  order.shop
                    .shopImage
                }
                alt="Shop"
                className="receipt-shop-image"
              />
            )}

            <h1>
              {order.shop
                .receiptName ||
                order.shop
                  .shopName}
            </h1>

            {order.shop
              .receiptMobile && (
              <p className="receipt-shop-info">
                {
                  order.shop
                    .receiptMobile
                }
              </p>
            )}

            {order.shop
              .receiptAddress && (
              <p className="receipt-shop-info">
                {
                  order.shop
                    .receiptAddress
                }
              </p>
            )}

            <p className="receipt-title">
              کسٹمر رسید
            </p>

            <div className="receipt-line" />

            <p>
              <strong>
                آرڈر نمبر:
              </strong>{" "}
              {
                order.orderNumber
              }
            </p>

            <p>
              <strong>
                نام:
              </strong>{" "}
              {
                order.customer
                  .name
              }
            </p>

            <p>
              <strong>
                موبائل:
              </strong>{" "}
              {
                order.customer
                  .mobile
              }
            </p>

            <p>
              <strong>
                ایڈریس:
              </strong>{" "}
              {
                order.customer
                  .address
              }
            </p>

            {order.customer
              .message && (
              <p>
                <strong>
                  پیغام:
                </strong>{" "}
                {
                  order.customer
                    .message
                }
              </p>
            )}

            <div className="receipt-line" />

            {order.items.map(
              (item) => (
                <div
                  className="receipt-item"
                  key={item.id}
                >
                  <span>
                    {item.name} ×{" "}
                    {formatQuantity(
                      item.qty,
                      item.unit
                    )}
                  </span>

                  <span>
                    Rs{" "}
                    {Math.round(
                      item.total
                    )}
                  </span>
                </div>
              )
            )}

            <div className="receipt-line" />

            <div className="receipt-item">
              <strong>
                سامان
              </strong>

              <strong>
                Rs{" "}
                {Math.round(
                  order.subtotal
                )}
              </strong>
            </div>

            <div className="receipt-item">
              <span>
                ڈیلیوری
              </span>

              <span>
                {Number(
                  order.deliveryCharges
                ) === 0
                  ? "Free"
                  : `Rs ${Number(
                      order.deliveryCharges
                    )}`}
              </span>
            </div>

            <div className="receipt-line" />

            <div className="receipt-item grand-total">
              <strong>
                کل رقم
              </strong>

              <strong>
                Rs{" "}
                {Math.round(
                  order.grandTotal
                )}
              </strong>
            </div>

            <div className="receipt-line" />

            <p className="thanks">
              شکریہ! دوبارہ ضرور تشریف لائیں۔
            </p>
          </div>

          <div className="receipt-actions no-print">
            <button
              type="button"
              onClick={() =>
                window.print()
              }
            >
              🖨️ رسید پرنٹ کریں
            </button>

            <button
              type="button"
              onClick={() => {
                setCart({});
                setOrder(null);
                setStep(1);
                setSearch("");
                setDeliveryAccepted(
                  false
                );
              }}
            >
              🛒 نیا آرڈر
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href =
                  `/order-status?order=${encodeURIComponent(
                    order.orderNumber
                  )}`;
              }}
            >
              📦 Order Status چیک کریں
            </button>
          </div>
        </div>

        <style jsx global>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #f3f4f6;
            direction: rtl;
          }

          .page {
            max-width: 900px;
            margin: 30px auto;
            padding: 20px;
          }

          .receipt {
            width: 100%;
            max-width: 420px;
            margin: auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow:
              0 2px 10px
              rgba(0, 0, 0, 0.08);
          }

          .receipt-shop-image {
            width: 70px;
            height: 70px;
            object-fit: cover;
            border-radius: 10px;
            display: block;
            margin: 0 auto 8px;
          }

          .receipt h1 {
            text-align: center;
            font-size: 20px;
            margin: 0 0 5px;
          }

          .receipt-shop-info {
            text-align: center;
            font-size: 12px;
            margin: 3px 0;
            color: #555;
          }

          .receipt-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
          }

          .receipt-line {
            border-top: 1px dashed #555;
            margin: 12px 0;
          }

          .receipt-item {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 7px 0;
            font-size: 14px;
          }

          .grand-total {
            font-size: 17px;
          }

          .thanks {
            text-align: center;
            font-size: 13px;
          }

          .receipt-actions {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
          }

          .receipt-actions button {
            border: none;
            padding: 12px 18px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 15px;
          }

          @media (max-width: 600px) {
            .receipt-actions {
              flex-direction: column;
            }

            .receipt-actions button {
              width: 100%;
            }
          }

          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }

            body {
              background: white;
            }

            .no-print {
              display: none !important;
            }

            .page {
              margin: 0;
              padding: 0;
              width: 80mm;
            }

            .receipt {
              width: 80mm;
              max-width: 80mm;
              box-shadow: none;
              border-radius: 0;
              padding: 8px;
            }
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <div className="page">
        <div className="store-header">
          {shopSettings.shopImage && (
            <img
              src={
                shopSettings.shopImage
              }
              alt="Shop"
              className="shop-header-image"
            />
          )}

          <h1 className="shop-title">
            {
              shopSettings.shopName
            }
          </h1>

          {shopSettings.address && (
            <p className="shop-address">
              {
                shopSettings.address
              }
            </p>
          )}
        </div>

        {/* STEP 1 */}

        {step === 1 && (
          <>
            <p className="subtitle">
              اپنی پسند کی چیزیں منتخب کریں
            </p>

            <div className="search-box">
              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="🔎 پراڈکٹ کا نام تلاش کریں..."
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                >
                  ✕
                </button>
              )}
            </div>

            {search && (
              <p className="search-result">
                {
                  filteredProducts.length
                }{" "}
                چیزیں ملیں
              </p>
            )}

            {filteredProducts.length >
            0 ? (
              <div className="products-grid">
                {filteredProducts.map(
                  (product) => (
                    <ProductTile
                      key={
                        product.id
                      }
                      product={
                        product
                      }
                      cart={cart}
                      setCart={
                        setCart
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <div className="no-results">
                😕 اس نام کی کوئی چیز نہیں ملی۔
              </div>
            )}

            <div className="bill-box">
              <div>
                <strong>
                  سامان:
                </strong>{" "}
                Rs{" "}
                {Math.round(
                  subtotal
                )}
              </div>

              <div>
                <strong>
                  ڈیلیوری:
                </strong>{" "}
                {deliveryCharges ===
                0
                  ? "Free"
                  : `Rs ${deliveryCharges}`}
              </div>

              <div className="big-total">
                <strong>
                  کل:
                </strong>{" "}
                Rs{" "}
                {Math.round(
                  grandTotal
                )}
              </div>

              <button
                type="button"
                className="main-button"
                onClick={
                  goToBill
                }
              >
                بل فائنل کریں
              </button>
            </div>
          </>
        )}

        {/* STEP 2 */}

        {step === 2 && (
          <div className="box compact-order-box">
            <h2>
              🧾 آرڈر چیک کریں
            </h2>

            <div className="compact-items">
              {selectedProducts.map(
                (item) => (
                  <div
                    className="order-row"
                    key={
                      item.id
                    }
                  >
                    <span>
                      {item.name}
                      <small>
                        {" "}
                        —{" "}
                        {formatQuantity(
                          item.qty,
                          item.unit
                        )}
                      </small>
                    </span>

                    <strong>
                      Rs{" "}
                      {Math.round(
                        item.total
                      )}
                    </strong>
                  </div>
                )
              )}
            </div>

            <hr />

            <div className="order-row summary-row">
              <strong>
                سامان
              </strong>

              <strong>
                Rs{" "}
                {Math.round(
                  subtotal
                )}
              </strong>
            </div>

            <div className="order-row summary-row">
              <strong>
                ڈیلیوری
              </strong>

              <strong>
                {deliveryCharges ===
                0
                  ? "Free"
                  : `Rs ${deliveryCharges}`}
              </strong>
            </div>

            <div className="order-row big-total summary-total">
              <strong>
                کل رقم
              </strong>

              <strong>
                Rs{" "}
                {Math.round(
                  grandTotal
                )}
              </strong>
            </div>

            <div className="buttons">
              <button
                type="button"
                onClick={
                  editOrder
                }
              >
                ✏️ تبدیلی کریں
              </button>

              <button
                type="button"
                className="main-button"
                onClick={
                  goToCustomer
                }
              >
                OK، آگے جائیں
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}

        {step === 3 && (
          <div className="box compact-customer-box">
            <h2>
              📦 کسٹمر کی معلومات
            </h2>

            <label>
              نام
            </label>

            <input
              type="text"
              value={
                customer.name
              }
              onChange={(e) =>
                setCustomer({
                  ...customer,
                  name:
                    e.target.value,
                })
              }
              placeholder="اپنا نام لکھیں"
            />

            <label>
              موبائل نمبر
            </label>

            <input
              type="tel"
              value={
                customer.mobile
              }
              onChange={(e) =>
                setCustomer({
                  ...customer,
                  mobile:
                    e.target.value,
                })
              }
              placeholder="03XXXXXXXXX"
            />

            <label>
              ڈیلیوری ایڈریس
            </label>

            <textarea
              value={
                customer.address
              }
              onChange={(e) =>
                setCustomer({
                  ...customer,
                  address:
                    e.target.value,
                })
              }
              placeholder="مکمل ایڈریس لکھیں"
              rows={3}
            />

            <label>
              اضافی پیغام (اختیاری)
            </label>

            <textarea
              value={
                customer.message
              }
              onChange={(e) =>
                setCustomer({
                  ...customer,
                  message:
                    e.target.value,
                })
              }
              placeholder="اگر کوئی خاص ہدایت ہو"
              rows={2}
            />

            <div className="compact-delivery-confirmation">
              <h3>
                🚚 Delivery Charges
              </h3>

              <div className="compact-delivery-price">
                {deliveryCharges ===
                0
                  ? "FREE DELIVERY"
                  : `Rs ${deliveryCharges}`}
              </div>

              <p>
                اس آرڈر پر اوپر دی گئی Delivery Charges لاگو ہوں گی۔
              </p>

              <div className="compact-delivery-total">
                <span>
                  کل آرڈر:
                </span>

                <strong>
                  Rs{" "}
                  {Math.round(
                    grandTotal
                  )}
                </strong>
              </div>

              <label className="compact-agree-row">
                <input
                  type="checkbox"
                  checked={
                    deliveryAccepted
                  }
                  onChange={(e) =>
                    setDeliveryAccepted(
                      e.target
                        .checked
                    )
                  }
                />

                <span>
                  میں Delivery Charges سے اتفاق کرتا/کرتی ہوں۔
                </span>
              </label>
            </div>

            <div className="buttons compact-customer-buttons">
              <button
                type="button"
                onClick={() => {
                  setDeliveryAccepted(
                    false
                  );
                  setStep(2);
                }}
              >
                ⬅️ واپس
              </button>

              <button
                type="button"
                className="main-button"
                onClick={
                  submitOrder
                }
                disabled={
                  !deliveryAccepted
                }
                style={{
                  opacity:
                    deliveryAccepted
                      ? 1
                      : 0.5,
                  cursor:
                    deliveryAccepted
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                آرڈر جمع کریں
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #f3f4f6;
          direction: rtl;
        }

        button,
        input,
        textarea {
          font-family: inherit;
        }

        .page {
          max-width: 1200px;
          margin: auto;
          padding: 20px;
        }

        .store-header {
          text-align: center;
        }

        .shop-header-image {
          width: 90px;
          height: 90px;
          object-fit: cover;
          border-radius: 15px;
          display: block;
          margin: 0 auto 10px;
        }

        .shop-title {
          text-align: center;
          margin-bottom: 5px;
        }

        .shop-address {
          color: #666;
          margin-top: 0;
        }

        .subtitle {
          text-align: center;
          color: #666;
          margin-bottom: 20px;
        }

        .search-box {
          display: flex;
          gap: 8px;
          max-width: 600px;
          margin: 0 auto 12px;
        }

        .search-box input {
          flex: 1;
          border: 2px solid #ddd;
          border-radius: 9px;
          padding: 12px;
          font-size: 16px;
          outline: none;
        }

        .search-box input:focus {
          border-color: #16a34a;
        }

        .search-box button {
          width: 45px;
          border: none;
          background: #dc2626;
          color: white;
          border-radius: 9px;
          cursor: pointer;
          font-size: 17px;
        }

        .search-result {
          text-align: center;
          color: #666;
          margin: 8px 0 14px;
          font-size: 14px;
        }

        .no-results {
          background: white;
          border-radius: 10px;
          padding: 30px;
          text-align: center;
          margin-top: 15px;
          color: #666;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(
            5,
            minmax(0, 1fr)
          );
          gap: 12px;
          width: 100%;
        }

        .product-tile {
          background: white;
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 10px;
          box-shadow:
            0 2px 6px
            rgba(0, 0, 0, 0.06);
          min-width: 0;
        }

        .product-tile h3 {
          margin: 0 0 6px;
          font-size: 17px;
        }

        .price {
          font-size: 13px;
          color: #555;
          margin-bottom: 8px;
        }

        .qty-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .qty-buttons button {
          flex: 1;
          min-width: 40px;
          border: 1px solid #ddd;
          background: #f8f8f8;
          padding: 6px 3px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        }

        .amount-box {
          display: flex;
          gap: 4px;
          margin-top: 7px;
        }

        .amount-box input {
          width: 100%;
          min-width: 0;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 6px;
        }

        .amount-box button {
          width: 32px;
          border: none;
          background: #16a34a;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 18px;
        }

        .selected-box {
          margin-top: 8px;
          padding: 7px;
          background: #ecfdf5;
          border-radius: 7px;
          font-size: 13px;
        }

        .selected-box button {
          margin-top: 5px;
          border: none;
          background: #dc2626;
          color: white;
          border-radius: 5px;
          padding: 4px 7px;
          cursor: pointer;
        }

        .bill-box,
        .box {
          background: white;
          border-radius: 10px;
          padding: 18px;
          margin-top: 20px;
          box-shadow:
            0 2px 8px
            rgba(0, 0, 0, 0.07);
        }

        .compact-order-box {
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
          padding: 14px;
        }

        .compact-order-box h2 {
          font-size: 18px;
          margin: 0 0 10px;
        }

        .compact-items {
          max-height: 320px;
          overflow-y: auto;
        }

        .compact-order-box .order-row {
          padding: 6px 0;
          font-size: 13px;
          line-height: 1.4;
        }

        .compact-order-box .order-row small {
          font-size: 12px;
          color: #666;
        }

        .compact-order-box .big-total {
          font-size: 17px;
        }

        .summary-row {
          padding: 5px 0 !important;
        }

        .summary-total {
          margin-top: 5px;
        }

        .big-total {
          font-size: 19px;
          margin-top: 10px;
        }

        .main-button {
          background: #16a34a !important;
          color: white !important;
          border: none !important;
          border-radius: 8px;
          padding: 11px 18px;
          cursor: pointer;
          font-size: 15px;
        }

        .bill-box .main-button {
          width: 100%;
          margin-top: 12px;
        }

        .order-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px solid #eee;
        }

        .buttons {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 20px;
        }

        .buttons button {
          flex: 1;
          border: 1px solid #ddd;
          background: #f8f8f8;
          padding: 11px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 15px;
        }

        .compact-customer-box {
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
          padding: 14px;
        }

        .compact-customer-box h2 {
          font-size: 18px;
          margin: 0 0 8px;
        }

        .compact-customer-box label {
          display: block;
          margin-top: 9px;
          margin-bottom: 4px;
          font-weight: bold;
          font-size: 13px;
        }

        .compact-customer-box input,
        .compact-customer-box textarea {
          width: 100%;
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 8px;
          font-size: 14px;
        }

        .compact-customer-box textarea {
          resize: vertical;
        }

        .compact-delivery-confirmation {
          margin-top: 12px;
          padding: 11px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 9px;
        }

        .compact-delivery-confirmation h3 {
          margin: 0;
          text-align: center;
          font-size: 16px;
        }

        .compact-delivery-price {
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          margin: 6px 0;
        }

        .compact-delivery-confirmation p {
          text-align: center;
          color: #555;
          font-size: 12px;
          line-height: 1.4;
          margin: 5px 0;
        }

        .compact-delivery-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 8px;
          border-radius: 6px;
          margin-top: 7px;
          font-size: 13px;
        }

        .compact-delivery-total strong {
          font-size: 16px;
        }

        .compact-agree-row {
          display: flex !important;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          background: white;
          padding: 7px;
          border-radius: 6px;
          margin-top: 7px !important;
          font-weight: bold;
          font-size: 12px !important;
        }

        .compact-agree-row input {
          width: 18px !important;
          height: 18px;
          flex-shrink: 0;
          padding: 0 !important;
        }

        .compact-agree-row span {
          line-height: 1.4;
        }

        .compact-customer-buttons {
          margin-top: 13px;
        }

        .setup-page {
          min-height: 100vh;
          padding: 25px 15px;
          display: flex;
          justify-content: center;
        }

        .setup-box {
          width: 100%;
          max-width: 600px;
          background: white;
          padding: 25px;
          border-radius: 14px;
          box-shadow:
            0 3px 15px
            rgba(0, 0, 0, 0.08);
        }

        .setup-icon {
          text-align: center;
          font-size: 50px;
        }

        .setup-box h1 {
          text-align: center;
          margin: 8px 0;
        }

        .setup-subtitle {
          text-align: center;
          color: #666;
          line-height: 1.6;
        }

        .shop-image-area {
          text-align: center;
          margin: 20px 0;
        }

        .shop-image-preview,
        .shop-image-placeholder {
          width: 120px;
          height: 120px;
          border-radius: 15px;
          object-fit: cover;
          margin: auto;
          display: block;
        }

        .shop-image-placeholder {
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 55px;
        }

        .image-button {
          display: inline-block;
          margin-top: 12px;
          background: #2563eb;
          color: white;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
        }

        .image-note {
          font-size: 12px;
          color: #777;
        }

        .setup-box label {
          display: block;
          margin-top: 15px;
          margin-bottom: 6px;
          font-weight: bold;
        }

        .setup-box input,
        .setup-box textarea {
          width: 100%;
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 11px;
          font-size: 15px;
        }

        .setup-note {
          background: #eff6ff;
          padding: 12px;
          border-radius: 8px;
          margin-top: 18px;
          line-height: 1.6;
          color: #444;
        }

        @media (max-width: 1000px) {
          .products-grid {
            grid-template-columns: repeat(
              4,
              minmax(0, 1fr)
            );
          }
        }

        @media (max-width: 700px) {
          .page {
            padding: 10px;
          }

          .products-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
            gap: 8px;
          }

          .product-tile {
            padding: 8px;
          }

          .product-tile h3 {
            font-size: 15px;
          }

          .buttons {
            flex-direction: column;
          }

          .compact-order-box {
            padding: 12px;
          }

          .compact-order-box .order-row {
            font-size: 12px;
          }

          .compact-customer-box {
            padding: 12px;
          }

          .compact-customer-box h2 {
            font-size: 17px;
          }

          .compact-customer-box label {
            margin-top: 8px;
            font-size: 12px;
          }

          .compact-customer-box input,
          .compact-customer-box textarea {
            padding: 7px;
            font-size: 13px;
          }

          .compact-delivery-confirmation {
            padding: 9px;
          }
        }
      `}</style>
    </>
  );
}