"use client";
import * as React from "react";
import Link from "next/link";

export default function ExchangePage({ params }) {
  const { gachaId: raw } = React.use(params);
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "min(900px,92vw)", maxHeight: "80vh", overflow: "auto",
          background: "rgba(20,20,24,0.95)", border: "1px solid #333",
          borderRadius: 16, padding: 20, color: "white",
        }}
      >
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h2 style={{margin:0}}>Exchange</h2>
          <Link href={`/${raw}`} prefetch aria-label="Close" style={{color:"#ccc",textDecoration:"none"}}>Close</Link>
        </div>
        {/* ... your exchange UI ... */}
      </div>
    </div>
  );
}
