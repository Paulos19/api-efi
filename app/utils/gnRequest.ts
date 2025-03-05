import axios from "axios";
import fs from "fs";
import path from "path";
import https from "https";

let accessToken: string | null = null;
const isDev = process.env.NODE_ENV !== "production";

const certPath = path.resolve(process.cwd(), `certs/${process.env.GN_CERT}`);
if (isDev) console.log("🔍 [Modo Dev] Certificado carregado de:", certPath);

const cert = fs.readFileSync(certPath);
const agent = new https.Agent({ pfx: cert, passphrase: "" });

const authenticate = async () => {
  console.log("🔑 [Autenticação] Gerando novo token...");
  const credentials = Buffer.from(
    `${process.env.GN_CLIENT_ID_DEV}:${process.env.GN_CLIENT_SECRET_DEV}`
  ).toString("base64");

  try {
    const response = await axios.post(
      `${process.env.GN_ENDPOINT_HOMOLOG}/oauth/token`,
      { grant_type: "client_credentials" },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        httpsAgent: agent,
      }
    );

    accessToken = response.data.access_token;
    console.log("✅ [Autenticação] Token gerado com sucesso!");

    setTimeout(() => {
      console.log("🕒 [Token Expirado] Renovando token...");
      accessToken = null;
    }, 5400 * 1000);

    return accessToken;
  } catch (error) {
    console.error("❌ [Erro Autenticação] Falha ao gerar token:", error);
    throw new Error("Erro ao autenticar com a API do Gerencianet");
  }
};

export const GNRequest = async () => {
  if (!accessToken) {
    await authenticate();
  }

  return axios.create({
    baseURL: process.env.GN_ENDPOINT_HOMOLOG,
    httpsAgent: agent,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
};
