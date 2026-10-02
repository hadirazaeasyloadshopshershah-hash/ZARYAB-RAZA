"use client";

import { useEffect, useState } from "react";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import app from "../firebase";

const db = getFirestore(app);
const auth = getAuth(app);

// =================================
// LOCAL STORAGE SAFE HELPERS
// =================================

function prepareOrdersForLocalStorage(orders) {
  return orders.map((order) => {
    const { shopImage, ...orderWithoutShopImage } = order;

    const compactItems = Array.isArray(orderWithoutShopImage.items)
      ? orderWithoutShopImage.items.map((item) => {
          const {
            image,
            productImage,
            imageUrl,
            ...itemWithoutImages
          } = item || {};

          return itemWithoutImages;
        })
      : orderWithoutShopImage.items;

    return {
      ...orderWithoutShopImage,
      items: compactItems,
    };
  });
}

function saveOrdersToLocalStorage(orders) {
  try {
    const safeOrders = prepareOrdersForLocalStorage(orders);
    const fullData = JSON.stringify(safeOrders);

    try {
      localStorage.setItem("orders", fullData);
      return true;
    } catch (firstError) {
      if (firstError?.name !== "QuotaExceededError") {
        console.error("Orders LocalStorage Save Error:", firstError);
        return false;
      }
    }

    try {
      localStorage.removeItem("orders");
      localStorage.setItem(
        "orders",
        JSON.stringify(safeOrders.slice(0, 10))
      );
      return true;
    } catch (secondError) {
      if (secondError?.name !== "QuotaExceededError") {
        console.error(
          "Compact Orders LocalStorage Save Error:",
          secondError
        );
        return false;
      }
    }

    try {
      localStorage.removeItem("orders");
      localStorage.setItem(
        "orders",
        JSON.stringify(safeOrders.slice(0, 3))
      );
      return true;
    } catch (thirdError) {
      if (thirdError?.name !== "QuotaExceededError") {
        console.error(
          "Small Orders LocalStorage Save Error:",
          thirdError
        );
        return false;
      }
    }

    try {
      localStorage.removeItem("orders");

      const minimalOrders = safeOrders.slice(0, 3).map((order) => ({
        orderNumber: order.orderNumber || "",
        storeId: order.storeId || "",
        status: order.status || "new",
        customerName: order.customerName || "",
        mobile: order.mobile || "",
        deliveryAddress:
          order.deliveryAddress || order.address || "",
        customerMessage: order.customerMessage || "",
        subtotal:
          order.subtotal ||
          order.totalBeforeDelivery ||
          0,
        totalBeforeDelivery:
          order.totalBeforeDelivery ||
          order.subtotal ||
          0,
        deliveryCharge:
          order.deliveryCharge ?? 0,
        deliveryCharges:
          order.deliveryCharges ?? order.deliveryCharge ?? 0,
        total:
          order.total ??
          order.grandTotal ??
          0,
        grandTotal:
          order.grandTotal ??
          order.total ??
          0,
        createdAt:
          order.createdAt ||
          order.orderDate ||
          "",
        updatedAt:
          order.updatedAt ||
          "",
        items: Array.isArray(order.items)
          ? order.items.slice(0, 20).map((item) => ({
              name:
                item?.name ||
                item?.productName ||
                "",
              quantity: item?.quantity || 0,
              price:
                item?.price ||
                item?.unitPrice ||
                0,
              total:
                item?.total ||
                item?.itemTotal ||
                0,
            }))
          : [],
      }));

      localStorage.setItem(
        "orders",
        JSON.stringify(minimalOrders)
      );

      return true;
    } catch (fourthError) {
      console.warn(
        "localStorage میں Orders محفوظ نہیں ہو سکے۔ Cache صاف کیا جا رہا ہے۔",
        fourthError
      );

      try {
        localStorage.removeItem("orders");
      } catch (removeError) {
        console.error(
          "Orders Cache Remove Error:",
          removeError
        );
      }

      return false;
    }
  } catch (error) {
    console.error(
      "Orders LocalStorage Preparation Error:",
      error
    );
    return false;
  }
}

function loadOrdersFromLocalStorage() {
  try {
    const savedOrders = JSON.parse(
      localStorage.getItem("orders") || "[]"
    );

    return Array.isArray(savedOrders)
      ? savedOrders
      : [];
  } catch (error) {
    console.error(
      "Orders LocalStorage Load Error:",
      error
    );
    return [];
  }
}

// =================================
// MAIN ORDERS PAGE
// =================================

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedCompleteOrders, setSelectedCompleteOrders] =
    useState([]);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ordersPerPage, setOrdersPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deliveryInputs, setDeliveryInputs] = useState({});
  const [savingDelivery, setSavingDelivery] = useState({});
  const [message, setMessage] = useState("");
  const [storeId, setStoreId] = useState("");

  // =================================
  // LOAD STORE ID
  // =================================

  useEffect(() => {
    try {
      const savedStoreId =
        localStorage.getItem("storeId") || "";

      setStoreId(savedStoreId);
    } catch (error) {
      console.error(
        "Store ID Load Error:",
        error
      );
    }
  }, []);

  // =================================
  // SAFE STATUS HELPER
  // =================================

  function getStatusSafe(order) {
    return order?.status || "new";
  }

  // =================================
  // FIREBASE ORDERS LISTENER
  // =================================

  useEffect(() => {
    if (!storeId) {
      setOrders(loadOrdersFromLocalStorage());
      setLoading(false);
      return;
    }

    const ordersRef = collection(db, "orders");

    const ordersQuery = query(
      ordersRef,
      where("storeId", "==", storeId)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        try {
          const firebaseOrders = snapshot.docs.map(
            (docSnapshot) => {
              const data = docSnapshot.data();

              return {
                ...data,
                orderNumber:
                  data.orderNumber ||
                  docSnapshot.id,
              };
            }
          );

          const localOrders =
            loadOrdersFromLocalStorage();

          const firebaseOrderNumbers =
            new Set(
              firebaseOrders.map((order) =>
                String(order.orderNumber)
              )
            );

          const localStoreOrders =
            localOrders.filter(
              (order) =>
                order.storeId === storeId
            );

          const localOnlyOrders =
            localStoreOrders.filter(
              (order) =>
                !firebaseOrderNumbers.has(
                  String(order.orderNumber)
                )
            );

          const mergedStoreOrders = [
            ...firebaseOrders,
            ...localOnlyOrders,
          ];

          mergedStoreOrders.sort(
            (a, b) => {
              const dateA = new Date(
                a.createdAt ||
                  a.orderDate ||
                  0
              ).getTime();

              const dateB = new Date(
                b.createdAt ||
                  b.orderDate ||
                  0
              ).getTime();

              return dateB - dateA;
            }
          );

          setOrders(mergedStoreOrders);

          const availableCompleteKeys =
            new Set(
              mergedStoreOrders
                .filter(
                  (order) =>
                    getStatusSafe(order) ===
                    "complete"
                )
                .map((order) =>
                  String(order.orderNumber)
                )
            );

          setSelectedCompleteOrders(
            (previous) =>
              previous.filter((orderKey) =>
                availableCompleteKeys.has(
                  orderKey
                )
              )
          );

          const deliveryMap = {};

          mergedStoreOrders.forEach(
            (order) => {
              deliveryMap[
                String(order.orderNumber)
              ] =
                order.deliveryCharge ??
                order.deliveryCharges ??
                0;
            }
          );

          setDeliveryInputs(
            deliveryMap
          );

          const otherStoreOrders =
            localOrders.filter(
              (order) =>
                order.storeId !==
                storeId
            );

          saveOrdersToLocalStorage([
            ...otherStoreOrders,
            ...mergedStoreOrders,
          ]);

          // =================================
          // KEEP OPEN ORDER IN SYNC
          // =================================

          setSelectedOrder(
            (previous) => {
              if (!previous) {
                return previous;
              }

              const latest = mergedStoreOrders.find(
                (order) =>
                  String(
                    order.orderNumber
                  ) ===
                  String(
                    previous.orderNumber
                  )
              );

              return latest || previous;
            }
          );

          setLoading(false);
        } catch (error) {
          console.error(
            "Firebase Orders Listener Error:",
            error
          );

          setLoading(false);
        }
      },
      (error) => {
        console.error(
          "Firebase Orders Snapshot Error:",
          error
        );

        const localOrders =
          loadOrdersFromLocalStorage();

        const localStoreOrders =
          localOrders.filter(
            (order) =>
              order.storeId ===
              storeId
          );

        setOrders(
          localStoreOrders
        );

        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [storeId]);

  // =================================
  // STATUS COUNTS
  // =================================

  const getStatus = (order) =>
    order.status || "new";

  const allCount = orders.length;

  const newCount =
    orders.filter(
      (order) =>
        getStatus(order) === "new"
    ).length;

  const preparingCount =
    orders.filter(
      (order) =>
        getStatus(order) === "preparing"
    ).length;

  const outForDeliveryCount =
    orders.filter(
      (order) =>
        getStatus(order) ===
        "out_for_delivery"
    ).length;

  const completeCount =
    orders.filter(
      (order) =>
        getStatus(order) === "complete"
    ).length;

  // =================================
  // FILTER ORDERS
  // =================================

  const filteredOrders =
    orders.filter((order) => {
      const status =
        getStatus(order);

      let statusMatches = true;

      if (statusFilter !== "all") {
        statusMatches =
          status === statusFilter;
      }

      const search =
        searchTerm
          .trim()
          .toLowerCase();

      if (!search) {
        return statusMatches;
      }

      const orderNumber =
        String(
          order.orderNumber || ""
        ).toLowerCase();

      const customerName =
        String(
          order.customerName || ""
        ).toLowerCase();

      const mobile =
        String(
          order.mobile || ""
        ).toLowerCase();

      return (
        statusMatches &&
        (
          orderNumber.includes(search) ||
          customerName.includes(search) ||
          mobile.includes(search)
        )
      );
    });

  // =================================
  // COMPLETE ORDERS
  // =================================

  const completeOrders =
    orders.filter(
      (order) =>
        getStatus(order) ===
        "complete"
    );

  const allCompleteSelected =
    completeOrders.length > 0 &&
    completeOrders.every(
      (order) =>
        selectedCompleteOrders.includes(
          String(order.orderNumber)
        )
    );

  // =================================
  // COMPLETE ORDER SELECTION
  // =================================

  function toggleCompleteOrderSelection(
    orderNumber
  ) {
    const orderKey =
      String(orderNumber);

    setSelectedCompleteOrders(
      (previous) => {
        if (
          previous.includes(orderKey)
        ) {
          return previous.filter(
            (key) =>
              key !== orderKey
          );
        }

        return [
          ...previous,
          orderKey,
        ];
      }
    );
  }

  function toggleSelectAllComplete() {
    if (completeOrders.length === 0) {
      return;
    }

    if (allCompleteSelected) {
      setSelectedCompleteOrders([]);
      return;
    }

    setSelectedCompleteOrders(
      completeOrders.map(
        (order) =>
          String(order.orderNumber)
      )
    );
  }

  // =================================
  // DELETE SELECTED HISTORY
  // =================================

  async function deleteSelectedHistory() {
    if (
      selectedCompleteOrders.length ===
      0
    ) {
      setMessage(
        "پہلے Complete Orders select کریں۔"
      );
      return;
    }

    const selectedKeys = [
      ...selectedCompleteOrders,
    ];

    const selectedCount =
      selectedKeys.length;

    const confirmed =
      window.confirm(
        `کیا آپ ${selectedCount} مکمل Orders کو History سے delete کرنا چاہتے ہیں؟`
      );

    if (!confirmed) {
      return;
    }

    setDeletingHistory(true);

    try {
      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        setMessage(
          "Firebase Auth User موجود نہیں ہے۔ دوبارہ Login کریں۔"
        );

        setDeletingHistory(false);
        return;
      }

      const ordersToDelete =
        orders.filter(
          (order) =>
            selectedKeys.includes(
              String(order.orderNumber)
            ) &&
            getStatus(order) ===
              "complete"
        );

      if (ordersToDelete.length === 0) {
        setMessage(
          "کوئی Complete Order delete کرنے کے لیے موجود نہیں ہے۔"
        );

        setSelectedCompleteOrders([]);
        setDeletingHistory(false);
        return;
      }

      for (const order of ordersToDelete) {
        const orderKey =
          String(order.orderNumber);

        await deleteDoc(
          doc(
            db,
            "orders",
            orderKey
          )
        );

        await deleteDoc(
          doc(
            db,
            "orderStatus",
            orderKey
          )
        );
      }

      const deletedKeys = new Set(
        ordersToDelete.map(
          (order) =>
            String(order.orderNumber)
        )
      );

      setOrders(
        (previousOrders) =>
          previousOrders.filter(
            (order) =>
              !deletedKeys.has(
                String(
                  order.orderNumber
                )
              )
          )
      );

      setSelectedCompleteOrders([]);

      setSelectedOrder(
        (previous) => {
          if (
            previous &&
            deletedKeys.has(
              String(
                previous.orderNumber
              )
            )
          ) {
            return null;
          }

          return previous;
        }
      );

      const localOrders =
        loadOrdersFromLocalStorage();

      const updatedLocalOrders =
        localOrders.filter(
          (order) =>
            !deletedKeys.has(
              String(
                order.orderNumber
              )
            )
        );

      saveOrdersToLocalStorage(
        updatedLocalOrders
      );

      setMessage(
        `${ordersToDelete.length} مکمل Orders کامیابی سے History سے delete ہو گئے۔`
      );
    } catch (error) {
      console.error(
        "Delete Selected History Error:",
        error
      );

      setMessage(
        "Selected History delete کرتے وقت مسئلہ آیا۔"
      );
    } finally {
      setDeletingHistory(false);
    }
  }

  // =================================
  // PAGINATION
  // =================================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredOrders.length /
        ordersPerPage
    )
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const startIndex =
    (safeCurrentPage - 1) *
    ordersPerPage;

  const paginatedOrders =
    filteredOrders.slice(
      startIndex,
      startIndex + ordersPerPage
    );

  // =================================
  // OPEN ORDER
  // =================================

  function openOrder(order) {
    setSelectedOrder(order);

    setDeliveryInputs(
      (previous) => ({
        ...previous,
        [String(order.orderNumber)]:
          order.deliveryCharge ??
          order.deliveryCharges ??
          0,
      })
    );
  }

  function closeOrder() {
    setSelectedOrder(null);
    setMessage("");
  }

  // =================================
  // DASHBOARD
  // =================================

  function goToDashboard() {
    window.location.href =
      "/shopkeeper-dashboard";
  }

  // =================================
  // STATUS LABEL
  // =================================

  function getStatusLabel(status) {
    if (status === "new") return "نیا";
    if (status === "preparing") return "تیاری";
    if (status === "out_for_delivery") return "روانہ";
    if (status === "complete") return "مکمل";

    return status || "نیا";
  }

  // =================================
  // CHANGE STATUS
  // =================================

  async function changeStatus(
    orderNumber,
    newStatus
  ) {
    try {
      const orderKey =
        String(orderNumber);

      const now =
        new Date().toISOString();

      setOrders(
        (previousOrders) =>
          previousOrders.map(
            (order) => {
              if (
                String(
                  order.orderNumber
                ) !== orderKey
              ) {
                return order;
              }

              return {
                ...order,
                status: newStatus,
                updatedAt: now,
              };
            }
          )
      );

      setSelectedOrder(
        (previous) =>
          previous &&
          String(
            previous.orderNumber
          ) === orderKey
            ? {
                ...previous,
                status: newStatus,
                updatedAt: now,
              }
            : previous
      );

      if (newStatus !== "complete") {
        setSelectedCompleteOrders(
          (previous) =>
            previous.filter(
              (key) =>
                key !== orderKey
            )
        );
      }

      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        setMessage(
          "Firebase Auth User موجود نہیں ہے۔ دوبارہ Login کریں۔"
        );
        return;
      }

      await setDoc(
        doc(
          db,
          "orders",
          orderKey
        ),
        {
          status: newStatus,
          storeId: storeId,
          updatedAt: now,
        },
        {
          merge: true,
        }
      );

      await setDoc(
        doc(
          db,
          "orderStatus",
          orderKey
        ),
        {
          status: newStatus,
          storeId: storeId,
          updatedAt: now,
        },
        {
          merge: true,
        }
      );

      setMessage(
        "Status کامیابی سے Firebase میں محفوظ ہو گیا ہے۔"
      );
    } catch (error) {
      console.error(
        "Change Status Error:",
        error
      );

      setMessage(
        "Status محفوظ نہیں ہو سکا۔"
      );
    }
  }

  // =================================
  // DELIVERY CHARGE INPUT
  // =================================

  function handleDeliveryChange(
    orderNumber,
    value
  ) {
    setDeliveryInputs(
      (previous) => ({
        ...previous,
        [String(orderNumber)]: value,
      })
    );
  }

  // =================================
  // SAVE DELIVERY CHARGE
  // =================================

  async function saveDeliveryCharge(
    order
  ) {
    const orderKey =
      String(order.orderNumber);

    // =================================
    // IMPORTANT:
    // ہمیشہ latest order استعمال کریں
    // =================================

    const latestOrder =
      orders.find(
        (currentOrder) =>
          String(
            currentOrder.orderNumber
          ) === orderKey
      ) ||
      selectedOrder ||
      order;

    const inputValue =
      deliveryInputs[orderKey];

    const numericValue =
      Math.max(
        0,
        Number(inputValue) || 0
      );

    // =================================
    // SUBTOTAL FIX
    // =================================

    const subtotal =
      Number(
        latestOrder?.subtotal ??
          latestOrder?.totalBeforeDelivery ??
          0
      ) || 0;

    const newGrandTotal =
      subtotal + numericValue;

    const currentStatus =
      latestOrder?.status ||
      order?.status ||
      "new";

    setSavingDelivery(
      (previous) => ({
        ...previous,
        [orderKey]: true,
      })
    );

    try {
      const now =
        new Date().toISOString();

      // =================================
      // COMPLETE BILL OBJECT
      // =================================

      const billData = {
        deliveryCharge:
          numericValue,

        // Compatibility alias
        deliveryCharges:
          numericValue,

        deliveryChargeManual:
          true,

        subtotal:
          subtotal,

        totalBeforeDelivery:
          subtotal,

        total:
          newGrandTotal,

        grandTotal:
          newGrandTotal,

        storeId:
          storeId,

        updatedAt:
          now,
      };

      // =================================
      // UI UPDATE - ORDERS
      // =================================

      setOrders(
        (previousOrders) =>
          previousOrders.map(
            (currentOrder) => {
              if (
                String(
                  currentOrder.orderNumber
                ) !== orderKey
              ) {
                return currentOrder;
              }

              return {
                ...currentOrder,

                ...billData,

                status:
                  currentOrder.status ||
                  currentStatus,
              };
            }
          )
      );

      // =================================
      // UI UPDATE - SELECTED ORDER
      // =================================

      setSelectedOrder(
        (previous) =>
          previous &&
          String(
            previous.orderNumber
          ) === orderKey
            ? {
                ...previous,
                ...billData,
                status:
                  previous.status ||
                  currentStatus,
              }
            : previous
      );

      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        setMessage(
          "Firebase Auth User موجود نہیں ہے۔"
        );
        return;
      }

      // =================================
      // FIREBASE ORDERS
      // =================================

      await setDoc(
        doc(
          db,
          "orders",
          orderKey
        ),
        {
          ...billData,
          orderNumber:
            latestOrder?.orderNumber ||
            orderKey,
          status:
            currentStatus,
        },
        {
          merge: true,
        }
      );

      // =================================
      // PUBLIC ORDER STATUS
      // CUSTOMER BILL DATA
      // =================================

      await setDoc(
        doc(
          db,
          "orderStatus",
          orderKey
        ),
        {
          orderNumber:
            latestOrder?.orderNumber ||
            orderKey,

          storeId:
            storeId,

          status:
            currentStatus,

          // Delivery
          deliveryCharge:
            numericValue,

          deliveryCharges:
            numericValue,

          deliveryChargeManual:
            true,

          // Subtotal
          subtotal:
            subtotal,

          totalBeforeDelivery:
            subtotal,

          // Final Total
          total:
            newGrandTotal,

          grandTotal:
            newGrandTotal,

          updatedAt:
            now,
        },
        {
          merge: true,
        }
      );

      // =================================
      // SAVE LOCAL SHOPKEEPER CACHE
      // =================================

      setOrders(
        (currentOrders) => {
          saveOrdersToLocalStorage(
            currentOrders
          );

          return currentOrders;
        }
      );

      setMessage(
        `Delivery Rs ${numericValue} محفوظ ہو گئی۔ Total Rs ${newGrandTotal} ہے۔`
      );
    } catch (error) {
      console.error(
        "Save Delivery Charge Error:",
        error
      );

      setMessage(
        "Delivery charges محفوظ نہیں ہو سکے۔"
      );
    } finally {
      setSavingDelivery(
        (previous) => ({
          ...previous,
          [orderKey]: false,
        })
      );
    }
  }

  // =================================
  // DELETE SINGLE ORDER
  // =================================

  async function deleteOrder(order) {
    const orderKey =
      String(order.orderNumber);

    const status =
      getStatus(order);

    if (status !== "complete") {
      setMessage(
        "صرف مکمل Orders delete کیے جا سکتے ہیں۔"
      );
      return;
    }

    const confirmed =
      window.confirm(
        `کیا آپ Order #${orderKey} کو delete کرنا چاہتے ہیں؟`
      );

    if (!confirmed) {
      return;
    }

    try {
      setOrders(
        (previousOrders) =>
          previousOrders.filter(
            (currentOrder) =>
              String(
                currentOrder.orderNumber
              ) !== orderKey
          )
      );

      setSelectedCompleteOrders(
        (previous) =>
          previous.filter(
            (key) =>
              key !== orderKey
          )
      );

      setSelectedOrder(null);

      const localOrders =
        loadOrdersFromLocalStorage();

      const updatedLocalOrders =
        localOrders.filter(
          (currentOrder) =>
            String(
              currentOrder.orderNumber
            ) !== orderKey
        );

      saveOrdersToLocalStorage(
        updatedLocalOrders
      );

      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        setMessage(
          "Order local cache سے remove ہو گیا، لیکن Firebase delete کے لیے دوبارہ Login کریں۔"
        );
        return;
      }

      await deleteDoc(
        doc(
          db,
          "orders",
          orderKey
        )
      );

      await deleteDoc(
        doc(
          db,
          "orderStatus",
          orderKey
        )
      );

      setMessage(
        `Order #${orderKey} کامیابی سے delete ہو گیا۔`
      );
    } catch (error) {
      console.error(
        "Delete Order Error:",
        error
      );

      setMessage(
        "Order delete کرتے وقت مسئلہ آیا۔"
      );
    }
  }

  // =================================
  // PRINT ORDER
  // =================================

  function printOrder(order) {
    if (!order) {
      return;
    }

    const shopName =
      order.shopName ||
      "General Store";

    const shopMobile =
      order.shopMobile ||
      order.mobileShop ||
      "";

    const shopAddress =
      order.shopAddress ||
      order.addressShop ||
      "";

    const orderNumber =
      order.orderNumber || "";

    const customerName =
      order.customerName || "";

    const customerMobile =
      order.mobile || "";

    const customerAddress =
      order.deliveryAddress ||
      order.address ||
      "";

    const customerMessage =
      order.customerMessage || "";

    const items =
      Array.isArray(order.items)
        ? order.items
        : [];

    const subtotal =
      Number(
        order.subtotal ??
          order.totalBeforeDelivery ??
          0
      );

    const deliveryCharge =
      Number(
        order.deliveryCharge ??
          order.deliveryCharges ??
          0
      );

    const grandTotal =
      Number(
        order.total ??
          order.grandTotal ??
          subtotal +
            deliveryCharge
      );

    const itemsHtml =
      items
        .map((item) => {
          const name =
            item.name ||
            item.productName ||
            "";

          const quantity =
            item.quantity || 0;

          const price =
            Number(
              item.price ||
                item.unitPrice ||
                0
            );

          const total =
            Number(
              item.total ||
                item.itemTotal ||
                quantity * price
            );

          return `
            <tr>
              <td>${name}</td>
              <td>${quantity}</td>
              <td>Rs ${price}</td>
              <td>Rs ${total}</td>
            </tr>
          `;
        })
        .join("");

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=400,height=700"
      );

    if (!printWindow) {
      setMessage(
        "Print window نہیں کھلی۔ Browser میں popup allow کریں۔"
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Order #${orderNumber}</title>

        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          body {
            width: 80mm;
            margin: 0;
            padding: 8px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #000;
          }

          .center {
            text-align: center;
          }

          .shop-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 4px;
          }

          .small {
            font-size: 10px;
          }

          .line {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }

          .row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin: 3px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }

          th,
          td {
            padding: 3px 1px;
            border-bottom: 1px dotted #000;
            text-align: left;
            font-size: 10px;
          }

          .total {
            font-weight: bold;
            font-size: 14px;
          }

          .message {
            margin-top: 8px;
            word-break: break-word;
          }

          @media print {
            body {
              width: 80mm;
            }
          }
        </style>
      </head>

      <body>

        <div class="center">
          <div class="shop-name">
            ${shopName}
          </div>

          ${
            shopMobile
              ? `<div>${shopMobile}</div>`
              : ""
          }

          ${
            shopAddress
              ? `<div class="small">${shopAddress}</div>`
              : ""
          }
        </div>

        <div class="line"></div>

        <div class="row">
          <span>Order #</span>
          <strong>${orderNumber}</strong>
        </div>

        <div class="row">
          <span>Customer</span>
          <span>${customerName}</span>
        </div>

        ${
          customerMobile
            ? `
              <div class="row">
                <span>Mobile</span>
                <span>${customerMobile}</span>
              </div>
            `
            : ""
        }

        ${
          customerAddress
            ? `
              <div>
                <strong>Address:</strong><br />
                ${customerAddress}
              </div>
            `
            : ""
        }

        <div class="line"></div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="line"></div>

        <div class="row">
          <span>Subtotal</span>
          <span>Rs ${subtotal}</span>
        </div>

        <div class="row">
          <span>Delivery</span>
          <span>Rs ${deliveryCharge}</span>
        </div>

        <div class="line"></div>

        <div class="row total">
          <span>Total</span>
          <span>Rs ${grandTotal}</span>
        </div>

        ${
          customerMessage
            ? `
              <div class="line"></div>
              <div class="message">
                <strong>Message:</strong><br />
                ${customerMessage}
              </div>
            `
            : ""
        }

        <div class="line"></div>

        <div class="center small">
          Thank you!
        </div>

      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  // =================================
  // RESET PAGE WHEN FILTER CHANGES
  // =================================

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    ordersPerPage,
  ]);

  // =================================
  // LOADING
  // =================================

  if (loading) {
    return (
      <main
        style={{
          padding: 20,
          fontFamily:
            "Arial, sans-serif",
          direction: "rtl",
        }}
      >
        <h2>
          Orders لوڈ ہو رہے ہیں...
        </h2>
      </main>
    );
  }

  // =================================
  // MAIN UI
  // =================================

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 14,
        fontFamily:
          "Arial, sans-serif",
        direction: "rtl",
        background: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <h1
            style={{
              margin: "0 0 4px",
              fontSize: 22,
            }}
          >
            Orders
          </h1>

          <div
            style={{
              fontSize: 12,
              color: "#666",
            }}
          >
            تمام Orders یہاں manage کریں
          </div>
        </div>

        <button
          onClick={goToDashboard}
          style={{
            border: "none",
            borderRadius: 8,
            padding: "8px 12px",
            background: "#222",
            color: "#fff",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ← Dashboard
        </button>
      </div>

      {/* MESSAGE */}

      {message && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 9,
            marginBottom: 10,
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}

      {/* SEARCH */}

      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          padding: 10,
          marginBottom: 10,
          boxShadow:
            "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        <input
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(
              event.target.value
            )
          }
          placeholder="Order نمبر، Customer نام یا Mobile تلاش کریں"
          style={{
            width: "100%",
            padding: "9px 10px",
            border: "1px solid #ddd",
            borderRadius: 7,
            outline: "none",
            fontSize: 13,
          }}
        />
      </div>

      {/* STATUS FILTERS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(5, 1fr)",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {[
          ["all", "سب", allCount],
          ["new", "نئے", newCount],
          ["preparing", "تیاری", preparingCount],
          [
            "out_for_delivery",
            "روانہ",
            outForDeliveryCount,
          ],
          ["complete", "مکمل", completeCount],
        ].map(([value, label, count]) => (
          <button
            key={value}
            onClick={() =>
              setStatusFilter(value)
            }
            style={{
              border:
                statusFilter === value
                  ? "2px solid #222"
                  : "1px solid #ddd",
              borderRadius: 8,
              background: "#fff",
              padding: 7,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontSize: 11,
              }}
            >
              {label}
            </div>

            <strong>{count}</strong>
          </button>
        ))}
      </div>

      {/* COMPLETE HISTORY CONTROLS */}

      {completeCount > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: 10,
            marginBottom: 10,
            border: "1px solid #e5e5e5",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={
                  allCompleteSelected
                }
                onChange={
                  toggleSelectAllComplete
                }
                style={{
                  width: 17,
                  height: 17,
                  cursor: "pointer",
                }}
              />

              <strong>
                تمام Complete Orders Select کریں
              </strong>
            </label>

            <button
              onClick={
                deleteSelectedHistory
              }
              disabled={
                selectedCompleteOrders.length ===
                  0 ||
                deletingHistory
              }
              style={{
                border: "none",
                borderRadius: 8,
                padding: "9px 13px",
                background:
                  selectedCompleteOrders.length >
                  0
                    ? "#b00020"
                    : "#ccc",
                color: "#fff",
                cursor:
                  selectedCompleteOrders.length >
                    0 &&
                  !deletingHistory
                    ? "pointer"
                    : "not-allowed",
                fontSize: 12,
                fontWeight: "bold",
              }}
            >
              {deletingHistory
                ? "Delete ہو رہا ہے..."
                : `🗑️ Selected History Delete (${selectedCompleteOrders.length})`}
            </button>
          </div>

          {selectedCompleteOrders.length >
            0 && (
            <div
              style={{
                marginTop: 7,
                fontSize: 11,
                color: "#b00020",
              }}
            >
              {selectedCompleteOrders.length} Complete Orders منتخب ہیں۔
            </div>
          )}
        </div>
      )}

      {/* PAGE SIZE */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          fontSize: 12,
        }}
      >
        <div>
          {filteredOrders.length} Orders
        </div>

        <select
          value={ordersPerPage}
          onChange={(event) =>
            setOrdersPerPage(
              Number(event.target.value)
            )
          }
          style={{
            padding: "6px 8px",
            borderRadius: 7,
            border: "1px solid #ddd",
          }}
        >
          <option value={5}>
            5 فی صفحہ
          </option>

          <option value={10}>
            10 فی صفحہ
          </option>
        </select>
      </div>

      {/* ORDERS LIST */}

      {paginatedOrders.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: 20,
            textAlign: "center",
            color: "#777",
          }}
        >
          کوئی Order نہیں ملا۔
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 7,
          }}
        >
          {paginatedOrders.map((order) => {
            const orderKey =
              String(order.orderNumber);

            const status =
              getStatus(order);

            const isComplete =
              status === "complete";

            const isSelected =
              selectedCompleteOrders.includes(
                orderKey
              );

            return (
              <div
                key={orderKey}
                style={{
                  width: "100%",
                  background: "#fff",
                  border:
                    isSelected
                      ? "2px solid #b00020"
                      : "1px solid #ddd",
                  borderRadius: 9,
                  padding: "10px 12px",
                  boxShadow:
                    "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  {isComplete && (
                    <div
                      style={{
                        paddingTop: 2,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          toggleCompleteOrderSelection(
                            orderKey
                          )
                        }
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        style={{
                          width: 18,
                          height: 18,
                          cursor: "pointer",
                        }}
                      />
                    </div>
                  )}

                  <button
                    onClick={() =>
                      openOrder(order)
                    }
                    style={{
                      flex: 1,
                      border: "none",
                      background: "transparent",
                      textAlign: "right",
                      padding: 0,
                      cursor: "pointer",
                    }}
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
                      <strong
                        style={{
                          fontSize: 14,
                        }}
                      >
                        Order #{orderKey}
                      </strong>

                      <span
                        style={{
                          fontSize: 11,
                          padding: "4px 7px",
                          borderRadius: 6,
                          background: "#f1f1f1",
                        }}
                      >
                        {getStatusLabel(
                          status
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 8,
                        marginTop: 5,
                        fontSize: 12,
                        color: "#555",
                      }}
                    >
                      <span>
                        {order.customerName ||
                          "Customer"}
                      </span>

                      <span>
                        Rs{" "}
                        {Number(
                          order.total ??
                            order.grandTotal ??
                            0
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10,
                        color: "#888",
                      }}
                    >
                      Order details دیکھنے کے لیے کلک کریں
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
          marginTop: 12,
        }}
      >
        <button
          disabled={safeCurrentPage <= 1}
          onClick={() =>
            setCurrentPage((page) =>
              Math.max(1, page - 1)
            )
          }
          style={{
            padding: "7px 12px",
            border: "1px solid #ddd",
            borderRadius: 7,
            background: "#fff",
            cursor:
              safeCurrentPage <= 1
                ? "not-allowed"
                : "pointer",
          }}
        >
          پچھلا
        </button>

        <span
          style={{
            fontSize: 12,
          }}
        >
          Page {safeCurrentPage} /{" "}
          {totalPages}
        </span>

        <button
          disabled={
            safeCurrentPage >= totalPages
          }
          onClick={() =>
            setCurrentPage((page) =>
              Math.min(
                totalPages,
                page + 1
              )
            )
          }
          style={{
            padding: "7px 12px",
            border: "1px solid #ddd",
            borderRadius: 7,
            background: "#fff",
            cursor:
              safeCurrentPage >= totalPages
                ? "not-allowed"
                : "pointer",
          }}
        >
          اگلا
        </button>
      </div>

      {/* OPENED ORDER DETAILS */}

      {selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.45)",
            zIndex: 9999,
            overflowY: "auto",
            padding: 12,
          }}
        >
          <div
            style={{
              maxWidth: 700,
              margin: "20px auto",
              background: "#fff",
              borderRadius: 12,
              padding: 14,
              direction: "rtl",
            }}
          >
            {/* DETAILS HEADER */}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                  }}
                >
                  Order #
                  {selectedOrder.orderNumber}
                </h2>

                <div
                  style={{
                    fontSize: 12,
                    color: "#777",
                    marginTop: 3,
                  }}
                >
                  {selectedOrder.customerName ||
                    "Customer"}
                </div>
              </div>

              <button
                onClick={closeOrder}
                style={{
                  border: "none",
                  background: "#eee",
                  borderRadius: 7,
                  padding: "7px 10px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* CUSTOMER INFO */}

            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 9,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: 5,
                }}
              >
                Customer Details
              </div>

              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.8,
                }}
              >
                <div>
                  نام:{" "}
                  {selectedOrder.customerName ||
                    "-"}
                </div>

                <div>
                  موبائل:{" "}
                  {selectedOrder.mobile ||
                    "-"}
                </div>

                <div>
                  پتہ:{" "}
                  {selectedOrder.deliveryAddress ||
                    selectedOrder.address ||
                    "-"}
                </div>

                {selectedOrder.customerMessage && (
                  <div>
                    پیغام:{" "}
                    {
                      selectedOrder.customerMessage
                    }
                  </div>
                )}
              </div>
            </div>

            {/* ITEMS */}

            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 9,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: 7,
                }}
              >
                Order Items
              </div>

              {Array.isArray(
                selectedOrder.items
              ) &&
              selectedOrder.items.length >
                0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                  }}
                >
                  {selectedOrder.items.map(
                    (item, index) => {
                      const quantity =
                        Number(
                          item.quantity || 0
                        );

                      const price =
                        Number(
                          item.price ||
                            item.unitPrice ||
                            0
                        );

                      const itemTotal =
                        Number(
                          item.total ||
                            item.itemTotal ||
                            quantity * price
                        );

                      return (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            gap: 8,
                            borderBottom:
                              "1px solid #f0f0f0",
                            paddingBottom: 6,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight:
                                  "bold",
                                fontSize: 12,
                              }}
                            >
                              {item.name ||
                                item.productName ||
                                "-"}
                            </div>

                            <div
                              style={{
                                fontSize: 10,
                                color: "#777",
                                marginTop: 2,
                              }}
                            >
                              Qty: {quantity} × Rs{" "}
                              {price}
                            </div>
                          </div>

                          <strong>
                            Rs {itemTotal}
                          </strong>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div
                  style={{
                    color: "#777",
                    fontSize: 12,
                  }}
                >
                  Items دستیاب نہیں ہیں۔
                </div>
              )}
            </div>

            {/* TOTALS */}

            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 9,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  marginBottom: 5,
                  fontSize: 13,
                }}
              >
                <span>Subtotal</span>

                <strong>
                  Rs{" "}
                  {Number(
                    selectedOrder.subtotal ??
                      selectedOrder.totalBeforeDelivery ??
                      0
                  )}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 5,
                  fontSize: 13,
                }}
              >
                <span>Delivery</span>

                <span
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="number"
                    min="0"
                    value={
                      deliveryInputs[
                        String(
                          selectedOrder.orderNumber
                        )
                      ] ??
                      selectedOrder.deliveryCharge ??
                      selectedOrder.deliveryCharges ??
                      0
                    }
                    onChange={(event) =>
                      handleDeliveryChange(
                        selectedOrder.orderNumber,
                        event.target.value
                      )
                    }
                    style={{
                      width: 90,
                      padding: "6px 7px",
                      border:
                        "1px solid #ddd",
                      borderRadius: 6,
                    }}
                  />

                  <button
                    onClick={() =>
                      saveDeliveryCharge(
                        selectedOrder
                      )
                    }
                    disabled={
                      savingDelivery[
                        String(
                          selectedOrder.orderNumber
                        )
                      ]
                    }
                    style={{
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 8px",
                      background: "#222",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    {savingDelivery[
                      String(
                        selectedOrder.orderNumber
                      )
                    ]
                      ? "..."
                      : "Save"}
                  </button>
                </span>
              </div>

              <div
                style={{
                  borderTop:
                    "1px solid #ddd",
                  paddingTop: 7,
                  marginTop: 7,
                  display: "flex",
                  justifyContent:
                    "space-between",
                  fontSize: 16,
                  fontWeight: "bold",
                }}
              >
                <span>Total</span>

                <span>
                  Rs{" "}
                  {Number(
                    selectedOrder.total ??
                      selectedOrder.grandTotal ??
                      0
                  )}
                </span>
              </div>
            </div>

            {/* STATUS */}

            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 9,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: 7,
                }}
              >
                Order Status
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(4, 1fr)",
                  gap: 5,
                }}
              >
                {[
                  ["new", "نیا"],
                  ["preparing", "تیاری"],
                  [
                    "out_for_delivery",
                    "روانہ",
                  ],
                  ["complete", "مکمل"],
                ].map(
                  ([value, label]) => (
                    <button
                      key={value}
                      onClick={() =>
                        changeStatus(
                          selectedOrder.orderNumber,
                          value
                        )
                      }
                      style={{
                        padding:
                          "8px 4px",
                        border:
                          "1px solid #ddd",
                        borderRadius: 7,
                        background:
                          selectedOrder.status ===
                          value
                            ? "#222"
                            : "#fff",
                        color:
                          selectedOrder.status ===
                          value
                            ? "#fff"
                            : "#222",
                        cursor:
                          "pointer",
                        fontSize: 11,
                      }}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* ACTIONS */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  getStatus(
                    selectedOrder
                  ) === "complete"
                    ? "1fr 1fr"
                    : "1fr",
                gap: 7,
              }}
            >
              <button
                onClick={() =>
                  printOrder(
                    selectedOrder
                  )
                }
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: 10,
                  background: "#222",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                🖨️ Print Receipt
              </button>

              {getStatus(
                selectedOrder
              ) === "complete" && (
                <button
                  onClick={() =>
                    deleteOrder(
                      selectedOrder
                    )
                  }
                  style={{
                    border: "none",
                    borderRadius: 8,
                    padding: 10,
                    background: "#b00020",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  🗑️ Delete Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}