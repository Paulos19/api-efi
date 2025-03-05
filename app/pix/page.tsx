"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function PixPage() {
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchQrcode = async () => {
      console.log("🔄 [Requisição] Buscando novo QR Code...");
      try {
        setLoading(true);
        setError(false);
        const response = await fetch("/api/pix");
        const data = await response.json();
        if (data.qrcodeImage) {
          setQrcode(data.qrcodeImage);
          console.log("✅ [Sucesso] QR Code atualizado!");
        } else {
          setError(true);
          console.error("❌ [Erro] QR Code não recebido.");
        }
      } catch (error) {
        setError(true);
        console.error("❌ [Erro] Falha na requisição:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQrcode();
    const interval = setInterval(fetchQrcode, 300000); // Atualiza a cada 5 min
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Pague com Pix</h1>
      {loading ? (
        <p>Gerando QR Code...</p>
      ) : error ? (
        <p className="text-red-500">Erro ao carregar QR Code.</p>
      ) : (
        qrcode && (
          <Image
            src={qrcode}
            alt="QR Code Pix"
            width={300}
            height={300}
            className="border p-2 bg-white shadow-lg rounded-md"
          />
        )
      )}
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
      >
        Recarregar QR Code
      </button>
    </div>
  );
}
