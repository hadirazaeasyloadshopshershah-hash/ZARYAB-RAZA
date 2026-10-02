"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");

  function login() {
    if (password === "1234") {
      localStorage.setItem("adminLoggedIn", "true");
      window.location.href = "/orders";
    } else {
      alert("غلط Password ہے۔");
    }
  }

  return (
    <main
      style={{
        maxWidth: 450,
        margin: "80px auto",
        padding: 20,
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 25,
          background: "white",
        }}
      >
        <h1 style={{ textAlign: "center" }}>
          🔐 Admin Login
        </h1>

        <p style={{ textAlign: "center" }}>
          صرف Admin کے لیے
        </p>

        <input
          type="password"
          placeholder="Admin Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              login();
            }
          }}
          style={{
            width: "100%",
            padding: 12,
            boxSizing: "border-box",
            borderRadius: 8,
            border: "1px solid #ccc",
            marginBottom: 15,
          }}
        />

        <button
          onClick={login}
          style={{
            width: "100%",
            padding: 13,
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          🔓 Login
        </button>
      </div>
    </main>
  );
}