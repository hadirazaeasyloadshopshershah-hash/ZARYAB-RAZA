"use client";

import { useEffect, useState } from "react";
import {
  getFirestore,
  doc,
  onSnapshot,
} from "firebase/firestore";
import app from "../firebase";

const db = getFirestore(app);

export default function OrderStatusPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Shopkeeper کی Delivery/Total updates کے لیے public live data
  // کو الگ رکھتے ہیں تاکہ Customer Bill ہمیشہ تازہ Firestore value دکھائے۔
  const [livePublicStatus, setLivePublicStatus] = useState(null);

  // =================================
  // LOAD LOCAL ORDERS
  // =================================

  useEffect(() => {
    try {
      const savedOrders = JSON.parse(
        localStorage.getItem("orders") || "[]"
      );

      if (Array.isArray(savedOrders)) {
        setOrders(savedOrders);
      }
    } catch (error) {
      console.log("Orders Load Error:", error);
    }

    setLoading(false);
  }, []);

  // =================================
  // SELECT ORDER AFTER ORDERS LOAD
  // =================================

  useEffect(() => {
    if (orders.length === 0) {
      return;
    }

    setSelectedOrder((previous) => {
      // ---------------------------------
      // اگر پہلے سے Order کھلا ہوا ہے
      // تو وہی Order برقرار رکھیں
      // ---------------------------------

      if (previous?.orderNumber) {
        const updatedOrder = orders.find(
          (item) =>
            String(item.orderNumber) ===
            String(previous.orderNumber)
        );

        if (!updatedOrder) {
          return previous;
        }

        // Live public status کو local order data پر ترجیح دیں،
        // تاکہ Shopkeeper کی Delivery/Total update دوبارہ stale
        // local order سے overwrite نہ ہو۔
        const liveDelivery =
          livePublicStatus?.deliveryCharge ??
          livePublicStatus?.deliveryCharges;

        const liveSubtotal =
          livePublicStatus?.subtotal ??
          livePublicStatus?.totalBeforeDelivery;

        const liveGrandTotal =
          livePublicStatus?.grandTotal ??
          livePublicStatus?.total;

        return {
          ...updatedOrder,
          ...(livePublicStatus
            ? {
                status:
                  livePublicStatus.status ??
                  updatedOrder.status,
                updatedAt:
                  livePublicStatus.updatedAt ??
                  updatedOrder.updatedAt,
              }
            : {}),
          ...(liveDelivery !== undefined
            ? {
                deliveryCharge:
                  Number(liveDelivery) || 0,
                deliveryChargeManual:
                  livePublicStatus.deliveryChargeManual ??
                  updatedOrder.deliveryChargeManual,
              }
            : {}),
          ...(liveSubtotal !== undefined
            ? {
                subtotal:
                  Number(liveSubtotal) || 0,
                totalBeforeDelivery:
                  Number(liveSubtotal) || 0,
              }
            : {}),
          ...(liveGrandTotal !== undefined
            ? {
                total:
                  Number(liveGrandTotal) || 0,
                grandTotal:
                  Number(liveGrandTotal) || 0,
              }
            : {}),
        };
      }

      // ---------------------------------
      // URL سے Order Number حاصل کریں
      // ---------------------------------

      try {
        const params = new URLSearchParams(
          window.location.search
        );

        const urlOrderNumber =
          params.get("order");

        if (urlOrderNumber) {
          const urlOrder = orders.find(
            (item) =>
              String(item.orderNumber) ===
              String(urlOrderNumber)
          );

          if (urlOrder) {
            return urlOrder;
          }
        }
      } catch (error) {
        console.log(
          "URL Order Load Error:",
          error
        );
      }

      // ---------------------------------
      // LocalStorage میں محفوظ Order
      // ---------------------------------

      try {
        const savedSelectedOrderNumber =
          localStorage.getItem(
            "selectedOrderNumber"
          );

        if (savedSelectedOrderNumber) {
          const savedOrder = orders.find(
            (item) =>
              String(item.orderNumber) ===
              String(savedSelectedOrderNumber)
          );

          if (savedOrder) {
            return savedOrder;
          }
        }
      } catch (error) {
        console.log(
          "Selected Order Load Error:",
          error
        );
      }

      // پہلے Order کو خودکار طور پر منتخب نہیں کریں گے۔
      return null;
    });
  }, [orders]);

  // =================================
  // LIVE ORDER DATA + STATUS SYNC
  // =================================

  useEffect(() => {
    if (!selectedOrder?.orderNumber) {
      return;
    }

    const orderNumber = String(
      selectedOrder.orderNumber
    );

    // نئے Order پر پچھلے Order کی live values استعمال نہ ہوں۔
    setLivePublicStatus(null);

    // =================================
    // SAVE SELECTED ORDER NUMBER
    // =================================

    try {
      localStorage.setItem(
        "selectedOrderNumber",
        orderNumber
      );
    } catch (error) {
      console.log(
        "Selected Order Save Error:",
        error
      );
    }

    // =================================
    // KEEP ORDER NUMBER IN URL
    // =================================

    try {
      const currentParams =
        new URLSearchParams(
          window.location.search
        );

      if (
        currentParams.get("order") !==
        orderNumber
      ) {
        currentParams.set(
          "order",
          orderNumber
        );

        const newUrl =
          `${window.location.pathname}?${currentParams.toString()}`;

        window.history.replaceState(
          {},
          "",
          newUrl
        );
      }
    } catch (error) {
      console.log(
        "URL Order Save Error:",
        error
      );
    }

    // =================================
    // FIRESTORE REFERENCES
    // =================================

    const orderRef = doc(
      db,
      "orders",
      orderNumber
    );

    const orderStatusRef = doc(
      db,
      "orderStatus",
      orderNumber
    );

    // =================================
    // LIVE MAIN ORDER SYNC
    // =================================

    const unsubscribeOrder = onSnapshot(
      orderRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          console.log(
            "Firebase Order موجود نہیں:",
            orderNumber
          );

          return;
        }

        const firebaseOrder =
          snapshot.data();

        console.log(
          "Live Order Sync:",
          firebaseOrder
        );

        setSelectedOrder((previous) => {
          if (!previous) {
            return {
              ...firebaseOrder,
              orderNumber,
            };
          }

          return {
            ...previous,
            ...firebaseOrder,
            orderNumber:
              firebaseOrder.orderNumber ||
              previous.orderNumber ||
              orderNumber,
          };
        });

        setOrders((previousOrders) =>
          previousOrders.map((item) =>
            String(item.orderNumber) ===
            orderNumber
              ? {
                  ...item,
                  ...firebaseOrder,
                  orderNumber:
                    firebaseOrder.orderNumber ||
                    item.orderNumber,
                }
              : item
          )
        );

        // =================================
        // UPDATE LOCAL ORDERS
        // =================================

        try {
          const savedOrders = JSON.parse(
            localStorage.getItem("orders") ||
              "[]"
          );

          if (Array.isArray(savedOrders)) {
            const updatedOrders =
              savedOrders.map((item) =>
                String(item.orderNumber) ===
                orderNumber
                  ? {
                      ...item,
                      ...firebaseOrder,
                      orderNumber:
                        firebaseOrder.orderNumber ||
                        item.orderNumber,
                    }
                  : item
              );

            localStorage.setItem(
              "orders",
              JSON.stringify(updatedOrders)
            );

            // =================================
            // UPDATE LAST ORDER
            // =================================

            try {
              const lastOrder =
                JSON.parse(
                  localStorage.getItem(
                    "lastOrder"
                  ) || "null"
                );

              if (
                lastOrder &&
                String(
                  lastOrder.orderNumber
                ) === orderNumber
              ) {
                localStorage.setItem(
                  "lastOrder",
                  JSON.stringify({
                    ...lastOrder,
                    ...firebaseOrder,
                    orderNumber:
                      firebaseOrder.orderNumber ||
                      lastOrder.orderNumber,
                  })
                );
              }
            } catch (lastOrderError) {
              console.log(
                "Last Order Storage Error:",
                lastOrderError
              );
            }
          }
        } catch (error) {
          console.log(
            "Local Order Sync Error:",
            error
          );
        }
      },
      (error) => {
        console.log(
          "Firebase Order Sync Error:",
          error
        );
      }
    );

    // =================================
    // LIVE PUBLIC STATUS SYNC
    // =================================

    const unsubscribeStatus = onSnapshot(
      orderStatusRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          console.log(
            "Public Order Status موجود نہیں:",
            orderNumber
          );

          return;
        }

        const publicStatus =
          snapshot.data();

        // Customer Bill کے لیے public document کی values authoritative ہیں۔
        setLivePublicStatus(publicStatus);

        console.log(
          "Public Order Status Sync:",
          publicStatus
        );

        const newStatus =
          publicStatus.status || "نیا";

        const updatedAt =
          publicStatus.updatedAt || null;

        // =================================
        // PUBLIC DELIVERY / TOTAL DATA
        // =================================

        const publicDeliveryCharge =
          publicStatus.deliveryCharge ??
          publicStatus.deliveryCharges ??
          null;

        const publicSubtotal =
          publicStatus.subtotal ??
          publicStatus.totalBeforeDelivery ??
          null;

        const publicGrandTotal =
          publicStatus.grandTotal ??
          publicStatus.total ??
          null;

        // =================================
        // UPDATE SELECTED ORDER
        // =================================

        setSelectedOrder((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,
            status: newStatus,
            updatedAt,

            ...(publicDeliveryCharge !== null
              ? {
                  deliveryCharge:
                    Number(publicDeliveryCharge) || 0,
                  deliveryChargeManual:
                    publicStatus.deliveryChargeManual ??
                    previous.deliveryChargeManual,
                }
              : {}),

            ...(publicSubtotal !== null
              ? {
                  subtotal:
                    Number(publicSubtotal) || 0,
                  totalBeforeDelivery:
                    Number(publicSubtotal) || 0,
                }
              : {}),

            ...(publicGrandTotal !== null
              ? {
                  total:
                    Number(publicGrandTotal) || 0,
                  grandTotal:
                    Number(publicGrandTotal) || 0,
                }
              : {}),
          };
        });

        // =================================
        // UPDATE ORDER LIST
        // =================================

        setOrders((previousOrders) =>
          previousOrders.map((item) =>
            String(item.orderNumber) ===
            orderNumber
              ? {
                  ...item,
                  status: newStatus,
                  updatedAt,

                  ...(publicDeliveryCharge !== null
                    ? {
                        deliveryCharge:
                          Number(publicDeliveryCharge) || 0,
                        deliveryChargeManual:
                          publicStatus.deliveryChargeManual ??
                          item.deliveryChargeManual,
                      }
                    : {}),

                  ...(publicSubtotal !== null
                    ? {
                        subtotal:
                          Number(publicSubtotal) || 0,
                        totalBeforeDelivery:
                          Number(publicSubtotal) || 0,
                      }
                    : {}),

                  ...(publicGrandTotal !== null
                    ? {
                        total:
                          Number(publicGrandTotal) || 0,
                        grandTotal:
                          Number(publicGrandTotal) || 0,
                      }
                    : {}),
                }
              : item
          )
        );

        // =================================
        // UPDATE LOCAL STORAGE
        // =================================

        try {
          const savedOrders = JSON.parse(
            localStorage.getItem("orders") ||
              "[]"
          );

          if (Array.isArray(savedOrders)) {
            const updatedOrders =
              savedOrders.map((item) =>
                String(item.orderNumber) ===
                orderNumber
                  ? {
                      ...item,
                      status: newStatus,
                      updatedAt,

                      ...(publicDeliveryCharge !== null
                        ? {
                            deliveryCharge:
                              Number(publicDeliveryCharge) || 0,
                            deliveryChargeManual:
                              publicStatus.deliveryChargeManual ??
                              item.deliveryChargeManual,
                          }
                        : {}),

                      ...(publicSubtotal !== null
                        ? {
                            subtotal:
                              Number(publicSubtotal) || 0,
                            totalBeforeDelivery:
                              Number(publicSubtotal) || 0,
                          }
                        : {}),

                      ...(publicGrandTotal !== null
                        ? {
                            total:
                              Number(publicGrandTotal) || 0,
                            grandTotal:
                              Number(publicGrandTotal) || 0,
                          }
                        : {}),
                    }
                  : item
              );

            localStorage.setItem(
              "orders",
              JSON.stringify(updatedOrders)
            );

            // =================================
            // UPDATE LAST ORDER
            // =================================

            try {
              const lastOrder =
                JSON.parse(
                  localStorage.getItem(
                    "lastOrder"
                  ) || "null"
                );

              if (
                lastOrder &&
                String(
                  lastOrder.orderNumber
                ) === orderNumber
              ) {
                localStorage.setItem(
                  "lastOrder",
                  JSON.stringify({
                    ...lastOrder,
                    status: newStatus,
                    updatedAt,

                    ...(publicDeliveryCharge !== null
                      ? {
                          deliveryCharge:
                            Number(publicDeliveryCharge) || 0,
                          deliveryChargeManual:
                            publicStatus.deliveryChargeManual ??
                            lastOrder.deliveryChargeManual,
                        }
                      : {}),

                    ...(publicSubtotal !== null
                      ? {
                          subtotal:
                            Number(publicSubtotal) || 0,
                          totalBeforeDelivery:
                            Number(publicSubtotal) || 0,
                        }
                      : {}),

                    ...(publicGrandTotal !== null
                      ? {
                          total:
                            Number(publicGrandTotal) || 0,
                          grandTotal:
                            Number(publicGrandTotal) || 0,
                        }
                      : {}),
                  })
                );
              }
            } catch (lastOrderError) {
              console.log(
                "Last Order Status Storage Error:",
                lastOrderError
              );
            }
          }
        } catch (error) {
          console.log(
            "Local Order Status Sync Error:",
            error
          );
        }
      },
      (error) => {
        console.log(
          "Public Order Status Sync Error:",
          error
        );
      }
    );

    return () => {
      unsubscribeOrder();
      unsubscribeStatus();
    };
  }, [selectedOrder?.orderNumber]);

  // =================================
  // STATUS INFO
  // =================================

  function getStatusInfo(status) {
    switch (status) {
      case "تیاری میں":
        return {
          icon: "🔄",
          text:
            "آپ کا Order تیار کیا جا رہا ہے۔",
        };

      case "روانہ":
        return {
          icon: "🚚",
          text:
            "آپ کا Order Delivery کے لیے روانہ ہو گیا ہے۔",
        };

      case "مکمل":
        return {
          icon: "✅",
          text:
            "آپ کا Order مکمل ہو گیا ہے۔",
        };

      default:
        return {
          icon: "🆕",
          text:
            "آپ کا Order موصول ہو گیا ہے۔",
        };
    }
  }

  // =================================
  // PRODUCT HELPERS
  // =================================

  function getProductName(item) {
    return (
      item.productName ||
      item.name ||
      "Product"
    );
  }

  function getProductQuantity(item) {
    return Number(
      item.quantity ?? item.qty ?? 0
    ).toFixed(2);
  }

  function getItemTotal(item) {
    const quantity = Number(
      item.quantity ?? item.qty ?? 0
    );

    const price = Number(
      item.price || 0
    );

    if (
      Number.isFinite(quantity) &&
      Number.isFinite(price)
    ) {
      return quantity * price;
    }

    return 0;
  }

  // =================================
  // OPEN ORDER
  // =================================

  function openOrder(order) {
    if (!order?.orderNumber) {
      return;
    }

    const orderNumber = String(
      order.orderNumber
    );

    setSelectedOrder(order);

    try {
      localStorage.setItem(
        "selectedOrderNumber",
        orderNumber
      );
    } catch (error) {
      console.log(
        "Selected Order Save Error:",
        error
      );
    }

    try {
      const params =
        new URLSearchParams(
          window.location.search
        );

      params.set(
        "order",
        orderNumber
      );

      const newUrl =
        `${window.location.pathname}?${params.toString()}`;

      window.history.replaceState(
        {},
        "",
        newUrl
      );
    } catch (error) {
      console.log(
        "Order URL Save Error:",
        error
      );
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =================================
  // BACK TO ORDERS
  // =================================

  function backToOrders() {
    setSelectedOrder(null);

    try {
      localStorage.removeItem(
        "selectedOrderNumber"
      );
    } catch (error) {
      console.log(
        "Selected Order Remove Error:",
        error
      );
    }

    try {
      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    } catch (error) {
      console.log(
        "Order URL Remove Error:",
        error
      );
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =================================
  // LOADING
  // =================================

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingBoxStyle}>
          <h2 style={{ margin: 0 }}>
            📦 Orders لوڈ ہو رہے ہیں...
          </h2>
        </div>
      </main>
    );
  }

  // =================================
  // NO ORDERS
  // =================================

  if (orders.length === 0) {
    return (
      <main style={pageStyle}>
        <div style={headerStyle}>
          <h1
            style={{
              margin: 0,
              fontSize: 23,
            }}
          >
            📦 میرے Orders
          </h1>
        </div>

        <div style={emptyBoxStyle}>
          <div style={{ fontSize: 40 }}>
            📦
          </div>

          <p
            style={{
              margin: "10px 0 0",
              color: "#666",
            }}
          >
            ابھی کوئی Order موجود نہیں۔
          </p>

          <button
            type="button"
            onClick={() =>
              (window.location.href = "/")
            }
            style={homeButtonStyle}
          >
            🏠 Shopping پر جائیں
          </button>
        </div>
      </main>
    );
  }

  // =================================
  // ORDER LIST
  // =================================

  if (!selectedOrder) {
    return (
      <main style={pageStyle}>
        <div style={headerStyle}>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 23,
              }}
            >
              📦 میرے Orders
            </h1>

            <p
              style={{
                margin: "3px 0 0",
                color: "#666",
                fontSize: 12,
              }}
            >
              {orders.length} Orders
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              (window.location.href = "/")
            }
            style={smallButtonStyle}
          >
            🏠 Shopping
          </button>
        </div>

        <div>
          {orders.map((order) => {
            const status =
              order.status || "نیا";

            const subtotal = Number(
              order.subtotal ??
                order.totalBeforeDelivery ??
                order.total ??
                0
            );

            const delivery = Number(
              order.deliveryCharge ??
                order.deliveryCharges ??
                0
            );

            const grandTotal = Number(
              order.grandTotal ??
                order.total ??
                subtotal + delivery
            );

            return (
              <button
                key={order.orderNumber}
                type="button"
                onClick={() =>
                  openOrder(order)
                }
                style={orderCardStyle}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      textAlign: "right",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        marginBottom: 4,
                      }}
                    >
                      🔢 Order #
                      {order.orderNumber}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#666",
                      }}
                    >
                      📅 {order.date || "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: "left",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        marginBottom: 5,
                      }}
                    >
                      Rs. {grandTotal}
                    </div>

                    <StatusBadge
                      status={status}
                    />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 7,
                    borderTop:
                      "1px solid #eee",
                    display: "flex",
                    justifyContent:
                      "space-between",
                    fontSize: 11,
                    color: "#777",
                  }}
                >
                  <span>
                    📦{" "}
                    {(order.items || [])
                      .length}{" "}
                    Products
                  </span>

                  <span>
                    Order Details دیکھیں →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    );
  }

  // =================================
  // SELECTED ORDER
  // =================================

  const status =
    selectedOrder.status || "نیا";

  const statusInfo =
    getStatusInfo(status);

  // Customer Bill کے لیے ہمیشہ تازہ ترین source استعمال کریں۔
  const toMillis = (value) => {
    if (!value) return 0;

    if (
      typeof value === "object" &&
      typeof value.toMillis === "function"
    ) {
      return value.toMillis();
    }

    const parsed = new Date(value).getTime();

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  };

  const publicUpdatedAt = toMillis(
    livePublicStatus?.updatedAt
  );

  const orderUpdatedAt = toMillis(
    selectedOrder?.updatedAt
  );

  const usePublicValues =
    publicUpdatedAt > 0
      ? publicUpdatedAt >= orderUpdatedAt
      : Boolean(livePublicStatus);

  const billSource = usePublicValues
    ? livePublicStatus
    : selectedOrder;

  const subtotal = Number(
    billSource?.subtotal ??
      billSource?.totalBeforeDelivery ??
      selectedOrder.subtotal ??
      selectedOrder.totalBeforeDelivery ??
      selectedOrder.total ??
      0
  );

  const delivery = Number(
    billSource?.deliveryCharge ??
      billSource?.deliveryCharges ??
      selectedOrder.deliveryCharge ??
      selectedOrder.deliveryCharges ??
      0
  );

  const grandTotal = Number(
    billSource?.grandTotal ??
      billSource?.total ??
      selectedOrder.grandTotal ??
      selectedOrder.total ??
      subtotal + delivery
  );

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html,
          body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          .customer-print-receipt,
          .customer-print-receipt * {
            visibility: visible;
          }

          .customer-print-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            font-family: Arial, sans-serif !important;
            direction: rtl !important;
          }

          .customer-print-receipt h2 {
            font-size: 18px !important;
          }

          .customer-print-receipt h3 {
            font-size: 14px !important;
          }

          .customer-print-receipt p {
            font-size: 12px !important;
            line-height: 1.4 !important;
          }

          .customer-print-product {
            border: none !important;
            border-bottom: 1px dashed #000 !important;
            border-radius: 0 !important;
            padding: 7px 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          .customer-print-summary {
            border-top: 1px dashed #000 !important;
            border-bottom: 1px dashed #000 !important;
            padding: 8px 0 !important;
          }

          .customer-print-grand-total {
            font-size: 17px !important;
            font-weight: bold !important;
          }

          .customer-print-shop-header {
            border-bottom: 1px dashed #000 !important;
            padding-bottom: 8px !important;
          }

          .customer-print-logo {
            width: 55px !important;
            height: 55px !important;
          }

          .no-print {
            display: none !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <main
        style={pageStyle}
        className="no-print"
      >
        <button
          type="button"
          onClick={backToOrders}
          style={backButtonStyle}
        >
          ← واپس Orders
        </button>

        <div
          className="customer-print-receipt"
          style={receiptStyle}
        >
          {/* SHOP HEADER */}

          <div
            className="customer-print-shop-header"
            style={shopHeaderStyle}
          >
            {selectedOrder.shopImage && (
              <img
                src={selectedOrder.shopImage}
                alt="Shop"
                className="customer-print-logo"
                style={shopLogoStyle}
              />
            )}

            <h2
              style={{
                margin: 0,
                fontSize: 19,
              }}
            >
              {selectedOrder.shopName ||
                "دکان"}
            </h2>

            {selectedOrder.shopMobile && (
              <p
                style={{
                  margin: "3px 0 0",
                  color: "#555",
                  fontSize: 12,
                }}
              >
                📞{" "}
                {selectedOrder.shopMobile}
              </p>
            )}

            {selectedOrder.shopAddress && (
              <p
                style={{
                  margin: "3px 0 0",
                  color: "#555",
                  fontSize: 12,
                }}
              >
                📍{" "}
                {selectedOrder.shopAddress}
              </p>
            )}
          </div>

          {/* TITLE */}

          <div
            style={{
              textAlign: "center",
              padding: "8px 0",
              borderBottom:
                "1px dashed #222",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 15,
              }}
            >
              🧾 Order Receipt
            </h3>

            <p
              style={{
                margin: "3px 0 0",
                color: "#666",
                fontSize: 11,
              }}
            >
              Customer Copy
            </p>
          </div>

          {/* ORDER INFO */}

          <div style={orderInfoStyle}>
            <p style={receiptTextStyle}>
              <strong>
                Order Number:
              </strong>{" "}
              {selectedOrder.orderNumber ||
                "—"}
            </p>

            <p style={receiptTextStyle}>
              <strong>تاریخ:</strong>{" "}
              {selectedOrder.date || "—"}
            </p>
          </div>

          {/* LIVE STATUS */}

          <div style={statusBoxStyle}>
            <div
              style={{
                fontSize: 30,
              }}
            >
              {statusInfo.icon}
            </div>

            <h2
              style={{
                margin: "4px 0",
                fontSize: 18,
              }}
            >
              {status}
            </h2>

            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#555",
              }}
            >
              {statusInfo.text}
            </p>

            <div
              className="no-print"
              style={{
                marginTop: 7,
                fontSize: 10,
                color: "#16a34a",
              }}
            >
              ● Live Status
            </div>
          </div>

          {/* CUSTOMER */}

          <div style={customerBoxStyle}>
            <h3
              style={{
                margin: "0 0 6px",
                fontSize: 14,
              }}
            >
              👤 Customer معلومات
            </h3>

            <p style={receiptTextStyle}>
              <strong>نام:</strong>{" "}
              {selectedOrder.customerName ||
                "—"}
            </p>

            <p style={receiptTextStyle}>
              <strong>موبائل:</strong>{" "}
              {selectedOrder.customerMobile ||
                "—"}
            </p>

            <p style={receiptTextStyle}>
              <strong>پتہ:</strong>{" "}
              {selectedOrder.customerAddress ||
                "—"}
            </p>

            {selectedOrder.message && (
              <p style={receiptTextStyle}>
                <strong>
                  📝 Message:
                </strong>{" "}
                {selectedOrder.message}
              </p>
            )}
          </div>

          {/* PRODUCTS */}

          <div style={{ marginTop: 10 }}>
            <h3
              style={{
                margin: "0 0 7px",
                fontSize: 14,
              }}
            >
              🛒 Products
            </h3>

            {(selectedOrder.items || [])
              .length === 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                }}
              >
                کوئی Product موجود نہیں۔
              </p>
            ) : (
              selectedOrder.items.map(
                (item, index) => {
                  const itemTotal =
                    getItemTotal(item);

                  return (
                    <div
                      key={
                        item.id || index
                      }
                      className="customer-print-product"
                      style={productStyle}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 8,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 13,
                          }}
                        >
                          {getProductName(
                            item
                          )}
                        </strong>

                        <strong
                          style={{
                            fontSize: 13,
                          }}
                        >
                          Rs. {itemTotal}
                        </strong>
                      </div>

                      <p
                        style={{
                          margin:
                            "4px 0 0",
                          color: "#555",
                          fontSize: 11,
                        }}
                      >
                        مقدار:{" "}
                        {getProductQuantity(
                          item
                        )}{" "}
                        {item.unit || ""}
                      </p>

                      <p
                        style={{
                          margin:
                            "3px 0 0",
                          color: "#555",
                          fontSize: 11,
                        }}
                      >
                        فی یونٹ قیمت: Rs.{" "}
                        {Number(
                          item.price || 0
                        )}
                      </p>
                    </div>
                  );
                }
              )
            )}
          </div>

          {/* SUMMARY */}

          <div
            className="customer-print-summary"
            style={summaryStyle}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: 6,
                fontSize: 12,
              }}
            >
              <strong>
                سامان کا کل:
              </strong>

              <strong>
                Rs. {subtotal}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: 6,
                fontSize: 12,
              }}
            >
              <strong>
                Delivery Charges:
              </strong>

              <strong>
                {delivery === 0
                  ? "Free"
                  : `Rs. ${delivery}`}
              </strong>
            </div>

            <div
              className="customer-print-grand-total"
              style={grandTotalStyle}
            >
              <strong>
                Grand Total:
              </strong>

              <strong>
                Rs. {grandTotal}
              </strong>
            </div>
          </div>

          {selectedOrder.message && (
            <div
              style={{
                marginTop: 9,
                padding: 8,
                background: "#fff7ed",
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <strong>
                📝 Customer Message:
              </strong>

              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 11,
                }}
              >
                {selectedOrder.message}
              </p>
            </div>
          )}

          {/* PRINT */}

          <button
            type="button"
            onClick={() =>
              window.print()
            }
            className="no-print"
            style={printButtonStyle}
          >
            🖨️ Receipt Print کریں
          </button>
        </div>
      </main>
    </>
  );
}

// =================================
// STATUS BADGE
// =================================

function StatusBadge({ status }) {
  let background = "#fef3c7";
  let color = "#92400e";
  let icon = "🆕";

  if (status === "تیاری میں") {
    background = "#dbeafe";
    color = "#1d4ed8";
    icon = "🔄";
  }

  if (status === "روانہ") {
    background = "#e0e7ff";
    color = "#4338ca";
    icon = "🚚";
  }

  if (status === "مکمل") {
    background = "#dcfce7";
    color = "#166534";
    icon = "✅";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        borderRadius: 20,
        background,
        color,
        fontSize: 11,
        fontWeight: "bold",
        whiteSpace: "nowrap",
      }}
    >
      {icon} {status}
    </span>
  );
}

// =================================
// STYLES
// =================================

const pageStyle = {
  maxWidth: 700,
  margin: "20px auto",
  padding: "0 12px 30px",
  fontFamily: "Arial",
  direction: "rtl",
};

const loadingBoxStyle = {
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 25,
  textAlign: "center",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
  flexWrap: "wrap",
};

const smallButtonStyle = {
  padding: "7px 10px",
  border: "1px solid #ddd",
  borderRadius: 7,
  background: "#f8fafc",
  color: "#333",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: "bold",
};

const orderCardStyle = {
  width: "100%",
  display: "block",
  boxSizing: "border-box",
  textAlign: "right",
  direction: "rtl",
  padding: "11px 12px",
  marginBottom: 8,
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "Arial",
  boxShadow:
    "0 1px 4px rgba(0,0,0,0.04)",
};

const emptyBoxStyle = {
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 30,
  textAlign: "center",
};

const homeButtonStyle = {
  marginTop: 15,
  padding: "9px 14px",
  border: "none",
  borderRadius: 7,
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: "bold",
};

const backButtonStyle = {
  width: "100%",
  padding: 10,
  marginBottom: 10,
  background: "#f1f5f9",
  color: "#333",
  border: "1px solid #ddd",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: "bold",
};

const receiptStyle = {
  padding: 13,
  fontFamily: "Arial",
  direction: "rtl",
  background: "white",
  borderRadius: 9,
  boxShadow:
    "0 2px 8px rgba(0,0,0,0.07)",
};

const shopHeaderStyle = {
  textAlign: "center",
  paddingBottom: 8,
  borderBottom: "1px dashed #222",
};

const shopLogoStyle = {
  width: 55,
  height: 55,
  objectFit: "cover",
  borderRadius: 9,
  display: "block",
  margin: "0 auto 5px",
};

const orderInfoStyle = {
  marginTop: 8,
  padding: 7,
  background: "#f8fafc",
  borderRadius: 6,
};

const statusBoxStyle = {
  marginTop: 8,
  textAlign: "center",
  padding: 10,
  background: "#f8fafc",
  borderRadius: 7,
};

const customerBoxStyle = {
  marginTop: 9,
  padding: 9,
  border: "1px solid #ddd",
  borderRadius: 7,
};

const productStyle = {
  padding: 8,
  marginBottom: 6,
  border: "1px solid #eee",
  borderRadius: 7,
  background: "#fafafa",
};

const summaryStyle = {
  marginTop: 9,
  padding: 10,
  borderTop: "1px solid #222",
  borderBottom: "1px solid #222",
};

const grandTotalStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 8,
  paddingTop: 7,
  borderTop: "1px solid #ccc",
  fontSize: 17,
};

const receiptTextStyle = {
  margin: "4px 0",
  fontSize: 12,
};

const printButtonStyle = {
  width: "100%",
  padding: 10,
  marginTop: 12,
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 7,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: "bold",
};