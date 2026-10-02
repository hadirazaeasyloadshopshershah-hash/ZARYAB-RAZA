"use client";

import { useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import app from "../firebase";

const auth = getAuth(app);
const db = getFirestore(app);

export default function ShopkeeperDashboard() {
  const [shopkeeper, setShopkeeper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [latestNewOrder, setLatestNewOrder] = useState(null);
  const [storeLink, setStoreLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (mounted) setLoading(false);
        window.location.href = "/shopkeeper-login";
        return;
      }

      try {
        const shopkeeperRef = doc(db, "shopkeepers", user.uid);
        const shopkeeperSnap = await getDoc(shopkeeperRef);

        let finalData = shopkeeperSnap.exists()
          ? shopkeeperSnap.data()
          : {};

        if (!finalData.storeId) {
          finalData.storeId =
            "GS-" +
            user.uid
              .replace(/[^a-zA-Z0-9]/g, "")
              .slice(-8)
              .toUpperCase();

          await setDoc(
            shopkeeperRef,
            { storeId: finalData.storeId },
            { merge: true }
          );
        }

        const savedShopkeeper = localStorage.getItem("shopkeeper");

        if (savedShopkeeper) {
          try {
            finalData = {
              ...JSON.parse(savedShopkeeper),
              ...finalData,
              uid: user.uid,
            };
          } catch (error) {
            console.log("Local shopkeeper data error:", error);
          }
        }

        const savedShopSettings =
          localStorage.getItem("shopSettings");

        if (savedShopSettings) {
          try {
            const shopSettings = JSON.parse(savedShopSettings);

            finalData = {
              ...finalData,
              shopName:
                shopSettings.shopName ||
                shopSettings.receiptName ||
                finalData.shopName ||
                "میری دکان",
              shopType:
                shopSettings.shopType ||
                finalData.shopType ||
                "",
              mobile:
                shopSettings.mobile ||
                shopSettings.receiptMobile ||
                finalData.mobile ||
                "",
              address:
                shopSettings.address ||
                shopSettings.receiptAddress ||
                finalData.address ||
                "",
              shopImage:
                shopSettings.shopImage ||
                finalData.shopImage ||
                "",
            };
          } catch (error) {
            console.log("Shop Settings data error:", error);
          }
        }

        if (!finalData.shopName) {
          finalData.shopName = "میری دکان";
        }

        await setDoc(
          shopkeeperRef,
          {
            uid: user.uid,
            storeId: finalData.storeId,
            shopName: finalData.shopName,
            shopType: finalData.shopType || "",
            mobile: finalData.mobile || "",
            address: finalData.address || "",
            shopImage: finalData.shopImage || "",
          },
          { merge: true }
        );

        try {
          await setDoc(
            doc(db, "publicStores", finalData.storeId),
            {
              storeId: finalData.storeId,
              shopName: finalData.shopName || "میری دکان",
              shopType: finalData.shopType || "",
              mobile: finalData.mobile || "",
              address: finalData.address || "",
              shopImage: finalData.shopImage || "",
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (error) {
          console.log("Public Store Update Error:", error);
        }

        localStorage.setItem(
          "shopkeeper",
          JSON.stringify(finalData)
        );

        const link =
          `${window.location.origin}/?store=${encodeURIComponent(
            finalData.storeId
          )}`;

        if (mounted) {
          setStoreLink(link);
          setShopkeeper(finalData);
          setLoading(false);
        }

        updateNewOrders(finalData.storeId, mounted);
      } catch (error) {
        console.log("Dashboard Error:", error);

        try {
          const savedShopkeeper =
            localStorage.getItem("shopkeeper");

          const savedShopSettings =
            localStorage.getItem("shopSettings");

          let fallbackData = {};

          if (savedShopkeeper) {
            fallbackData = JSON.parse(savedShopkeeper);
          }

          if (savedShopSettings) {
            const settings = JSON.parse(savedShopSettings);

            fallbackData = {
              ...fallbackData,
              shopName:
                settings.shopName ||
                settings.receiptName ||
                fallbackData.shopName ||
                "میری دکان",
              shopType:
                settings.shopType ||
                fallbackData.shopType ||
                "",
              mobile:
                settings.mobile ||
                settings.receiptMobile ||
                fallbackData.mobile ||
                "",
              address:
                settings.address ||
                settings.receiptAddress ||
                fallbackData.address ||
                "",
              shopImage:
                settings.shopImage ||
                fallbackData.shopImage ||
                "",
            };
          }

          if (fallbackData.storeId) {
            setStoreLink(
              `${window.location.origin}/?store=${encodeURIComponent(
                fallbackData.storeId
              )}`
            );
          }

          updateNewOrders(fallbackData.storeId, mounted);

          if (mounted) {
            setShopkeeper(fallbackData);
            setLoading(false);
          }
        } catch (fallbackError) {
          console.log("Fallback Error:", fallbackError);

          if (mounted) {
            setLoading(false);
          }
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  function updateNewOrders(currentStoreId, mounted) {
    try {
      if (!currentStoreId) {
        if (mounted) {
          setNewOrdersCount(0);
          setLatestNewOrder(null);
        }
        return;
      }

      const savedOrders = localStorage.getItem("orders");

      if (!savedOrders) {
        if (mounted) {
          setNewOrdersCount(0);
          setLatestNewOrder(null);
        }
        return;
      }

      const orders = JSON.parse(savedOrders);
      const storageKey = `seenNewOrders_${currentStoreId}`;

      let seenIds = [];

      try {
        const savedSeen = localStorage.getItem(storageKey);

        if (savedSeen) {
          const parsed = JSON.parse(savedSeen);

          if (Array.isArray(parsed)) {
            seenIds = parsed;
          }
        }
      } catch (error) {
        seenIds = [];
      }

      const seenSet = new Set(seenIds);

      const newOrders = Array.isArray(orders)
        ? orders.filter((order) => {
            if (!order) return false;

            if (order.storeId !== currentStoreId) {
              return false;
            }

            const isNew =
              order.status === "نیا" ||
              !order.status;

            if (!isNew) return false;

            const orderId = String(
              order.orderNumber ||
                order.id ||
                ""
            );

            return orderId && !seenSet.has(orderId);
          })
        : [];

      newOrders.sort((a, b) => {
        const dateA = new Date(
          a.createdAt ||
            a.created_at ||
            a.date ||
            0
        ).getTime();

        const dateB = new Date(
          b.createdAt ||
            b.created_at ||
            b.date ||
            0
        ).getTime();

        return dateB - dateA;
      });

      if (mounted) {
        setNewOrdersCount(newOrders.length);
        setLatestNewOrder(
          newOrders.length ? newOrders[0] : null
        );
      }
    } catch (error) {
      console.log("New Orders Error:", error);

      if (mounted) {
        setNewOrdersCount(0);
        setLatestNewOrder(null);
      }
    }
  }

  function markNewOrdersAsSeen(storeId) {
    try {
      const savedOrders = localStorage.getItem("orders");

      if (!storeId || !savedOrders) return;

      const orders = JSON.parse(savedOrders);

      if (!Array.isArray(orders)) return;

      const ids = orders
        .filter(
          (order) =>
            order &&
            order.storeId === storeId &&
            (order.status === "نیا" ||
              !order.status)
        )
        .map((order) =>
          String(
            order.orderNumber ||
              order.id ||
              ""
          )
        )
        .filter(Boolean);

      const key = `seenNewOrders_${storeId}`;

      let oldIds = [];

      try {
        const saved = localStorage.getItem(key);

        if (saved) {
          const parsed = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            oldIds = parsed;
          }
        }
      } catch (error) {
        oldIds = [];
      }

      localStorage.setItem(
        key,
        JSON.stringify(
          Array.from(
            new Set([...oldIds, ...ids])
          )
        )
      );

      setNewOrdersCount(0);
      setLatestNewOrder(null);
    } catch (error) {
      console.log("Mark Orders Error:", error);
    }
  }

  function openOrders() {
    markNewOrdersAsSeen(shopkeeper?.storeId);
    window.location.href = "/orders";
  }

  async function copyStoreLink() {
    try {
      if (!storeLink) return;

      await navigator.clipboard.writeText(storeLink);

      setLinkCopied(true);

      setTimeout(() => {
        setLinkCopied(false);
      }, 2000);
    } catch (error) {
      alert("Link Copy نہیں ہو سکا۔");
    }
  }

  function printQRCode() {
    if (!storeLink) return;

    const qrUrl =
      `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
        storeLink
      )}`;

    const printWindow = window.open(
      "",
      "_blank",
      "width=600,height=800"
    );

    if (!printWindow) {
      alert("Print window نہیں کھل سکی۔");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer QR Code</title>
          <meta charset="UTF-8" />
          <style>
            body {
              font-family: Arial;
              text-align: center;
              padding: 30px;
            }

            img {
              width: 300px;
              height: 300px;
            }

            h1 {
              margin-bottom: 10px;
            }

            p {
              color: #555;
            }
          </style>
        </head>

        <body>
          <h1>
            ${shopkeeper?.shopName || "میری دکان"}
          </h1>

          <p>
            Customer Order کرنے کے لیے QR Code Scan کریں
          </p>

          <img
            src="${qrUrl}"
            alt="Customer QR Code"
            onload="window.print()"
          />

          <p>
            موبائل Camera سے Scan کریں
          </p>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  async function logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.log("Logout Error:", error);
    }

    localStorage.removeItem("shopkeeperLogin");
    localStorage.removeItem("shopkeeper");

    window.location.href = "/shopkeeper-login";
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingBoxStyle}>
          <h2>🏪 Shopkeeper Dashboard</h2>
          <p>
            دکان کی معلومات لوڈ ہو رہی ہیں...
          </p>
        </div>
      </main>
    );
  }

  if (!shopkeeper) {
    return (
      <main style={pageStyle}>
        <div style={loadingBoxStyle}>
          <h2>🏪 Shopkeeper Dashboard</h2>

          <p>
            Shopkeeper کی معلومات نہیں مل سکیں۔
          </p>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/shopkeeper-login")
            }
            style={primaryButtonStyle}
          >
            Login پر جائیں
          </button>
        </div>
      </main>
    );
  }

  const latestOrderNumber =
    latestNewOrder?.orderNumber || "—";

  const latestOrderTotal = Number(
    latestNewOrder?.grandTotal ??
      latestNewOrder?.total ??
      latestNewOrder?.subtotal ??
      0
  );

  const latestCustomerName =
    latestNewOrder?.customerName ||
    "Customer";

  const qrImageUrl = storeLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        storeLink
      )}`
    : "";

  return (
    <main style={pageStyle}>
      <div style={dashboardStyle}>
        <div
          style={{
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 25,
            }}
          >
            🏪 Shopkeeper Dashboard
          </h1>

          <p
            style={{
              color: "#666",
              margin: "5px 0 0",
              fontSize: 14,
            }}
          >
            اپنی دکان manage کریں
          </p>
        </div>

        {newOrdersCount > 0 && (
          <button
            type="button"
            onClick={openOrders}
            style={newOrderNotificationStyle}
          >
            <span style={{ fontSize: 24 }}>
              🔔
            </span>

            <span
              style={{
                flex: 1,
                textAlign: "right",
              }}
            >
              <strong style={{ display: "block" }}>
                {newOrdersCount === 1
                  ? "نیا Order آیا ہے"
                  : `${newOrdersCount} نئے Orders آئے ہیں`}
              </strong>

              {latestNewOrder && (
                <span
                  style={{
                    display: "block",
                    fontSize: 12,
                    marginTop: 3,
                  }}
                >
                  Order #{latestOrderNumber} •{" "}
                  {latestCustomerName} • Rs.{" "}
                  {latestOrderTotal}
                </span>
              )}
            </span>

            <span style={newOrderCountStyle}>
              {newOrdersCount}
            </span>
          </button>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1fr) 150px",
            gap: 12,
            marginBottom: 15,
          }}
        >
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              padding: 13,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {shopkeeper.shopImage ? (
                <img
                  src={shopkeeper.shopImage}
                  alt="Shop"
                  style={{
                    width: 58,
                    height: 58,
                    objectFit: "cover",
                    borderRadius: 10,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 10,
                    background: "#dcfce7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 30,
                  }}
                >
                  🏪
                </div>
              )}

              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 19,
                  }}
                >
                  {shopkeeper.shopName ||
                    "میری دکان"}
                </h2>

                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#555",
                    fontSize: 13,
                  }}
                >
                  {shopkeeper.shopType ||
                    "دکان کی قسم مقرر نہیں"}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 10,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  background: "white",
                  padding: "5px 8px",
                  borderRadius: 6,
                }}
              >
                📞 {shopkeeper.mobile || "مقرر نہیں"}
              </span>

              {shopkeeper.address && (
                <span
                  style={{
                    background: "white",
                    padding: "5px 8px",
                    borderRadius: 6,
                  }}
                >
                  📍 {shopkeeper.address}
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 10,
              padding: 10,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "#555",
                marginBottom: 5,
              }}
            >
              🆔 Store ID
            </div>

            <div
              style={{
                fontSize: 15,
                fontWeight: "bold",
                direction: "ltr",
                wordBreak: "break-all",
              }}
            >
              {shopkeeper.storeId}
            </div>
          </div>
        </div>

        {storeLink && (
          <div style={storeLinkBoxStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: 16,
                    marginBottom: 8,
                  }}
                >
                  🔗 Customer Store Link
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    value={storeLink}
                    readOnly
                    dir="ltr"
                    onClick={(e) =>
                      e.target.select()
                    }
                    style={storeLinkInputStyle}
                  />

                  <button
                    type="button"
                    onClick={copyStoreLink}
                    style={copyLinkButtonStyle}
                  >
                    {linkCopied
                      ? "✓ Copied"
                      : "Copy Link"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  width: 145,
                  flexShrink: 0,
                  textAlign: "center",
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 8,
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  📱 QR Code
                </div>

                <img
                  src={qrImageUrl}
                  alt="Customer QR Code"
                  style={{
                    width: 115,
                    height: 115,
                    display: "block",
                    margin: "0 auto",
                  }}
                />

                <button
                  type="button"
                  onClick={printQRCode}
                  style={{
                    marginTop: 7,
                    padding: "6px 10px",
                    border: "none",
                    borderRadius: 7,
                    background: "#2563eb",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                >
                  🖨️ Print
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: 10,
            marginBottom: 15,
          }}
        >
          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/shop-settings")
            }
            style={dashboardButtonStyle}
          >
            <div style={dashboardIconStyle}>
              ⚙️
            </div>
            <span>Shop Settings</span>
          </button>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/products")
            }
            style={dashboardButtonStyle}
          >
            <div style={dashboardIconStyle}>
              📦
            </div>
            <span>Products</span>
          </button>

          <button
            type="button"
            onClick={openOrders}
            style={{
              ...dashboardButtonStyle,
              position: "relative",
            }}
          >
            <div style={dashboardIconStyle}>
              🧾
            </div>

            <span>Orders</span>

            {newOrdersCount > 0 && (
              <span style={ordersBadgeStyle}>
                {newOrdersCount}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={logout}
          style={{
            width: "100%",
            padding: 10,
            border: "none",
            borderRadius: 8,
            background: "#dc2626",
            color: "white",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          🚪 Logout
        </button>
      </div>
    </main>
  );
}

const dashboardButtonStyle = {
  width: "100%",
  padding: "12px 6px",
  minHeight: 75,
  border: "1px solid #ddd",
  borderRadius: 10,
  background: "#f8fafc",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: "bold",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const dashboardIconStyle = {
  fontSize: 25,
  marginBottom: 5,
};

const newOrderNotificationStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
  padding: "10px 12px",
  border: "1px solid #fde68a",
  borderRadius: 10,
  background: "#fffbeb",
  cursor: "pointer",
  textAlign: "right",
  direction: "rtl",
  boxSizing: "border-box",
};

const newOrderCountStyle = {
  minWidth: 32,
  height: 32,
  padding: "0 7px",
  borderRadius: 50,
  background: "#dc2626",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 15,
  fontWeight: "bold",
};

const ordersBadgeStyle = {
  position: "absolute",
  top: 6,
  right: 7,
  minWidth: 22,
  height: 22,
  padding: "0 5px",
  borderRadius: 50,
  background: "#dc2626",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: "bold",
};

const storeLinkBoxStyle = {
  background: "#fefce8",
  border: "1px solid #fde68a",
  borderRadius: 10,
  padding: 10,
  marginBottom: 15,
  direction: "rtl",
};

const storeLinkInputStyle = {
  flex: 1,
  minWidth: 0,
  border: "1px solid #d4d4d4",
  borderRadius: 7,
  padding: "8px",
  fontSize: 12,
  background: "white",
  color: "#333",
  boxSizing: "border-box",
};

const copyLinkButtonStyle = {
  border: "none",
  borderRadius: 7,
  padding: "0 12px",
  background: "#16a34a",
  color: "white",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const pageStyle = {
  minHeight: "100vh",
  padding: "15px 10px",
  boxSizing: "border-box",
  fontFamily: "Arial",
  direction: "rtl",
  background: "#f8fafc",
};

const dashboardStyle = {
  maxWidth: 800,
  margin: "0 auto",
  padding: 18,
  background: "white",
  borderRadius: 14,
  boxShadow:
    "0 2px 10px rgba(0,0,0,0.08)",
};

const loadingBoxStyle = {
  maxWidth: 600,
  margin: "50px auto",
  padding: 25,
  background: "white",
  borderRadius: 14,
  textAlign: "center",
  boxShadow:
    "0 2px 10px rgba(0,0,0,0.08)",
};

const primaryButtonStyle = {
  padding: 11,
  border: "none",
  borderRadius: 8,
  background: "#16a34a",
  color: "white",
  cursor: "pointer",
  fontSize: 15,
};