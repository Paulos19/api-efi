import axios from "axios";
import fs from "fs";
import https from "https";
import path from "path";

const certPath = path.resolve(process.cwd(), "certs");

const agent = new https.Agent({
  pfx: fs.readFileSync(`${certPath}/${process.env.GN_CERT}`),
  passphrase: "",
});

const authenticate = async () => {
  const credentials = Buffer.from(
    `${process.env.GN_CLIENT_ID_DEV}:${process.env.GN_CLIENT_SECRET_DEV}`
  ).toString("base64");

  const response = await axios.post(
    `${process.env.GN_ENDPOINT_HOMOLOG}/oauth/token`,
    { grant_type: "client_credentials" },
    {
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      httpsAgent: agent,
    }
  );

  return response.data.access_token;
};

export const GNRequest = async () => {
  const accessToken = await authenticate();
  return axios.create({
    baseURL: process.env.GN_ENDPOINT_HOMOLOG,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    httpsAgent: agent,
  });
};
