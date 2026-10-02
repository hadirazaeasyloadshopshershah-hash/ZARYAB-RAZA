"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import app from "../firebase";

const auth = getAuth(app);
const db = getFirestore(app);

const categories = [
  { value: "grocery", label: "🛒 کریانہ / راشن" },
  { value: "drinks", label: "🥤 مشروبات" },
  { value: "cleaning", label: "🧼 صفائی کا سامان" },
  { value: "personal-care", label: "🧴 پرسنل کیئر" },
  { value: "stationery", label: "📚 اسٹیشنری" },
  { value: "bakery-food", label: "🍞 بیکری / فوڈ" },
  { value: "clothing", label: "👕 کپڑے" },
  { value: "shoes", label: "👟 جوتے" },
  { value: "mobile", label: "📱 موبائل" },
  { value: "electronics", label: "💻 الیکٹرانکس" },
  { value: "hardware", label: "🛠️ ہارڈویئر" },
  { value: "cosmetics", label: "💄 کاسمیٹکس" },
  { value: "fruits-vegetables", label: "🥬 سبزی / پھل" },
  { value: "other", label: "📦 دیگر" },
];

function getCategoryLabel(categoryValue) {
  const category = categories.find(
    (item) => item.value === categoryValue
  );

  return category ? category.label : "📦 دیگر";
}

export default function ProductsPage() {
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("piece");
  const [category, setCategory] = useState("other");

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [editingProductId, setEditingProductId] =
    useState(null);

  useEffect(() => {
    let unsubscribeProducts = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser) {
          setLoading(false);
          window.location.href = "/shopkeeper-login";
          return;
        }

        setUser(currentUser);

        const productsQuery = query(
          collection(db, "products"),
          where(
            "shopkeeperId",
            "==",
            currentUser.uid
          ),
          orderBy("createdAt", "desc")
        );

        unsubscribeProducts = onSnapshot(
          productsQuery,
          (snapshot) => {
            const productList = snapshot.docs.map(
              (productDoc) => ({
                id: productDoc.id,
                ...productDoc.data(),
              })
            );

            setProducts(productList);
            setLoading(false);
          },
          (error) => {
            console.log(
              "Products Firestore Error:",
              error
            );

            setLoading(false);

            if (
              error.code === "permission-denied"
            ) {
              alert(
                "Products کو Firestore میں پڑھنے کی اجازت نہیں ہے۔"
              );
            }
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();

      if (unsubscribeProducts) {
        unsubscribeProducts();
      }
    };
  }, []);

  async function saveProduct() {
    if (!productName.trim() || !price) {
      alert(
        "براہِ کرم Product کا نام اور قیمت درج کریں۔"
      );
      return;
    }

    if (!user) {
      alert("براہِ کرم پہلے Login کریں۔");
      return;
    }

    const productPrice = Number(price);

    if (
      Number.isNaN(productPrice) ||
      productPrice < 0
    ) {
      alert("Product کی قیمت درست درج کریں۔");
      return;
    }

    try {
      if (editingProductId) {
        const productRef = doc(
          db,
          "products",
          editingProductId
        );

        await updateDoc(productRef, {
          name: productName.trim(),
          price: productPrice,
          unit: unit,
          category: category,
          updatedAt: serverTimestamp(),
        });

        alert(
          "Product کامیابی سے update ہوگیا!"
        );
      } else {
        await addDoc(collection(db, "products"), {
          shopkeeperId: user.uid,
          name: productName.trim(),
          price: productPrice,
          unit: unit,
          category: category,
          createdAt: serverTimestamp(),
        });

        alert(
          "Product کامیابی سے محفوظ ہوگیا!"
        );
      }

      clearForm();
    } catch (error) {
      console.log(
        "Product Save Error:",
        error
      );

      if (
        error.code === "permission-denied"
      ) {
        alert(
          "Firestore میں Product محفوظ کرنے کی اجازت نہیں ہے۔"
        );
      } else {
        alert(
          "Product save نہیں ہو سکا۔ دوبارہ کوشش کریں۔"
        );
      }
    }
  }

  function editProduct(product) {
    setEditingProductId(product.id);

    setProductName(product.name || "");

    setPrice(
      product.price !== undefined
        ? String(product.price)
        : ""
    );

    setUnit(product.unit || "piece");

    setCategory(
      product.category || "other"
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function deleteProduct(productId) {
    const confirmDelete = window.confirm(
      "کیا آپ واقعی یہ Product حذف کرنا چاہتے ہیں؟"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, "products", productId)
      );

      alert("Product حذف ہوگیا!");

      if (editingProductId === productId) {
        clearForm();
      }
    } catch (error) {
      console.log(
        "Product Delete Error:",
        error
      );

      if (
        error.code === "permission-denied"
      ) {
        alert(
          "اس Product کو حذف کرنے کی اجازت نہیں ہے۔"
        );
      } else {
        alert(
          "Product حذف نہیں ہو سکا۔ دوبارہ کوشش کریں۔"
        );
      }
    }
  }

  function clearForm() {
    setProductName("");
    setPrice("");
    setUnit("piece");
    setCategory("other");
    setEditingProductId(null);
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name
        ?.toLowerCase()
        .includes(search.trim().toLowerCase())
  );

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={mainCardStyle}>
          <h2 style={{ margin: 0 }}>
            📦 Products
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              color: "#666",
              fontSize: 13,
            }}
          >
            Products لوڈ ہو رہے ہیں...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={mainCardStyle}>

        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>
              📦 Products
            </h1>

            <p style={subtitleStyle}>
              Products شامل، Edit یا Delete کریں
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/shopkeeper-dashboard")
            }
            style={smallBackButtonStyle}
          >
            ⬅️ Dashboard
          </button>
        </div>

        {/* New Product / Edit Form */}
        <div
          style={{
            ...formCardStyle,
            background: editingProductId
              ? "#fff7ed"
              : "#f8fafc",
          }}
        >
          <div style={sectionHeaderStyle}>
            <strong>
              {editingProductId
                ? "✏️ Product Edit کریں"
                : "➕ نیا Product شامل کریں"}
            </strong>

            {editingProductId && (
              <button
                type="button"
                onClick={clearForm}
                style={cancelSmallButtonStyle}
              >
                ❌ Cancel
              </button>
            )}
          </div>

          <div style={formGridStyle}>

            <div>
              <label style={labelStyle}>
                Product نام
              </label>

              <input
                type="text"
                value={productName}
                onChange={(e) =>
                  setProductName(e.target.value)
                }
                placeholder="مثلاً چینی"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                قیمت
              </label>

              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) =>
                  setPrice(e.target.value)
                }
                placeholder="180"
                style={{
                  ...inputStyle,
                  direction: "ltr",
                  textAlign: "left",
                }}
              />
            </div>

            <div>
              <label style={labelStyle}>
                یونٹ
              </label>

              <select
                value={unit}
                onChange={(e) =>
                  setUnit(e.target.value)
                }
                style={inputStyle}
              >
                <option value="piece">
                  Piece
                </option>

                <option value="pack">
                  Pack
                </option>

                <option value="kg">
                  Kg
                </option>

                <option value="liter">
                  Liter
                </option>

                <option value="dozen">
                  Dozen
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Category
              </label>

              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                style={inputStyle}
              >
                {categories.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <button
            type="button"
            onClick={saveProduct}
            style={saveButtonStyle}
          >
            {editingProductId
              ? "💾 تبدیلی محفوظ کریں"
              : "➕ Product شامل کریں"}
          </button>
        </div>

        {/* Search */}
        <div style={searchCardStyle}>
          <div style={sectionHeaderStyle}>
            <strong>
              🔎 Product Search
            </strong>

            <span style={countStyle}>
              {search.trim()
                ? `${filteredProducts.length} Result`
                : `${products.length} Products`}
            </span>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Product کا نام تلاش کریں..."
            style={{
              ...inputStyle,
              marginBottom: 0,
            }}
          />
        </div>

        {/* Search Result */}
        <div style={{ marginTop: 12 }}>

          {products.length === 0 ? (
            <div style={emptyStyle}>
              ابھی کوئی Product شامل نہیں کیا گیا۔
            </div>
          ) : search.trim() === "" ? (
            <div style={hintStyle}>
              🔎 کسی Product کا نام لکھ کر Search کریں۔
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={emptyStyle}>
              ❌ اس نام کا کوئی Product نہیں ملا۔
            </div>
          ) : (
            <div style={productListStyle}>
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  style={productCardStyle}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={productNameStyle}>
                      {product.name}
                    </div>

                    <div style={productInfoStyle}>
                      Rs {Number(product.price) || 0}
                      {" • "}
                      {product.unit}
                      {" • "}
                      {getCategoryLabel(
                        product.category
                      )}
                    </div>
                  </div>

                  <div style={actionButtonsStyle}>

                    <button
                      type="button"
                      onClick={() =>
                        editProduct(product)
                      }
                      style={editButtonStyle}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteProduct(product.id)
                      }
                      style={deleteButtonStyle}
                    >
                      🗑️ Delete
                    </button>

                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </main>
  );
}

/* =========================
   STYLES
========================= */

const pageStyle = {
  minHeight: "100vh",
  background: "#f8fafc",
  padding: "12px 10px",
  boxSizing: "border-box",
  fontFamily: "Arial",
  direction: "rtl",
};

const mainCardStyle = {
  width: "100%",
  maxWidth: 800,
  margin: "0 auto",
  background: "white",
  padding: 14,
  boxSizing: "border-box",
  borderRadius: 12,
  boxShadow:
    "0 2px 8px rgba(0,0,0,0.06)",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 12,
};

const titleStyle = {
  margin: 0,
  fontSize: 21,
  lineHeight: 1.2,
};

const subtitleStyle = {
  margin: "4px 0 0",
  color: "#666",
  fontSize: 12,
};

const smallBackButtonStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 7,
  background: "white",
  padding: "7px 9px",
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const formCardStyle = {
  padding: 11,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
};

const searchCardStyle = {
  marginTop: 10,
  padding: 11,
  borderRadius: 10,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const sectionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: 8,
  fontSize: 14,
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: 8,
};

const labelStyle = {
  display: "block",
  marginBottom: 4,
  fontSize: 11,
  color: "#555",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 9px",
  borderRadius: 7,
  border: "1px solid #cbd5e1",
  background: "white",
  fontSize: 13,
  fontFamily: "Arial",
  outline: "none",
};

const saveButtonStyle = {
  width: "100%",
  marginTop: 9,
  padding: "9px 10px",
  border: "none",
  borderRadius: 7,
  background: "#16a34a",
  color: "white",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: "bold",
};

const cancelSmallButtonStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "white",
  padding: "5px 8px",
  fontSize: 11,
  cursor: "pointer",
};

const countStyle = {
  color: "#64748b",
  fontSize: 11,
};

const productListStyle = {
  display: "grid",
  gap: 7,
};

const productCardStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "9px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 9,
  background: "#ffffff",
};

const productNameStyle = {
  fontSize: 14,
  fontWeight: "bold",
  color: "#111827",
};

const productInfoStyle = {
  marginTop: 3,
  color: "#64748b",
  fontSize: 11,
  lineHeight: 1.4,
};

const actionButtonsStyle = {
  display: "flex",
  gap: 5,
  flexShrink: 0,
};

const editButtonStyle = {
  border: "1px solid #2563eb",
  borderRadius: 6,
  background: "#eff6ff",
  color: "#1d4ed8",
  padding: "6px 8px",
  cursor: "pointer",
  fontSize: 11,
};

const deleteButtonStyle = {
  border: "1px solid #dc2626",
  borderRadius: 6,
  background: "#fef2f2",
  color: "#dc2626",
  padding: "6px 8px",
  cursor: "pointer",
  fontSize: 11,
};

const emptyStyle = {
  textAlign: "center",
  padding: 14,
  color: "#777",
  background: "#f8fafc",
  borderRadius: 9,
  fontSize: 12,
};

const hintStyle = {
  textAlign: "center",
  padding: 10,
  color: "#64748b",
  fontSize: 11,
};
