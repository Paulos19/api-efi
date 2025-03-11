"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";

export default function PixPage() {
  const [qrcode, setQrcode] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPix() {
      try {
        const response = await axios.get("/api/pix");
        setQrcode(response.data.qrcodeImage);
      } catch (error) {
        console.error("Erro ao buscar QR Code Pix:", error);
      }
    }

    fetchPix();
  }, []);

  return (
    <div className="p-4 text-center">
      <h2 className="text-xl font-bold mb-4">Pagamento via Pix</h2>
      {qrcode ? <Image src={qrcode} alt="QR Code Pix" className="mx-auto" /> : <p>Carregando...</p>}
    </div>
  );
}
