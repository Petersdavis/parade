# Elasticsearch on an OVHcloud VPS

This directory provisions the single external service in Parade's stack:
**Elasticsearch**, used for fuzzy profile matching. Everything else lives in
Firebase. The cluster runs in Docker on an **OVHcloud VPS** and is reachable
**only** over a private WireGuard VPN by Firebase Functions.

> **Why a VPS?** Elasticsearch needs ~2 GB RAM. Managed options (Bonsai,
> Searchly) start around $10/mo. A self-hosted OVHcloud VPS (e.g. **VPS-2**,
> ~$7–10/mo) gives full control and enough RAM.

---

## Files

| File | Purpose |
|------|---------|
| [`docker-compose.yml`](docker-compose.yml:1) | Elasticsearch 8.x single node, TLS + auth, persistent volume. |
| [`elasticsearch.yml`](elasticsearch.yml:1) | Node config mounted into the container. |
| [`setup.sh`](setup.sh:1) | Idempotent bootstrap: Docker, kernel tuning, certs, WireGuard, firewall, start. |
| [`.env.example`](.env.example:1) | Template for secrets + connection details. Copy to `.env`. |
| [`.gitignore`](.gitignore:1) | Keeps `.env`, `certs/`, and `data/` out of git. |

---

## What you need from OVHcloud

To configure the VPS to receive traffic, gather the following from the
**OVHcloud Manager** (or the order confirmation email):

| # | Item | Where to find it | Why it matters |
|---|------|------------------|----------------|
| 1 | **Public IPv4 address** | Manager → Bare Metal Cloud / VPS → your VPS → *IP* | The WireGuard `Endpoint` clients dial. |
| 2 | **SSH access** (user + key or password) | Order email / Manager → *SSH* tab | To log in and run `setup.sh`. Default user is usually `ubuntu` or `debian`. |
| 3 | **OS image** (Ubuntu 22.04/24.04 recommended) | Manager → *Reinstall* if needed | `setup.sh` targets Debian/Ubuntu (`apt`). |
| 4 | **Firewall mode** — *Network Firewall* enabled or disabled | Manager → VPS → *Firewall* | Determines whether you manage rules in the OVHcloud panel or on the host. |
| 5 | **Firewall rules** (if the OVHcloud Network Firewall is ON) | Manager → VPS → *Firewall* → add rules | Must allow **TCP 22** (SSH) and **UDP 51820** (WireGuard); deny everything else. |
| 6 | **VPS RAM / vCores** | Manager → VPS → *Characteristics* | Confirm ≥ 2 GB RAM (VPS-2 or higher) for the 1 GB ES heap. |
| 7 | **Region / datacenter** | Manager → VPS → *Datacenter* | Pick one near your Firebase region to minimize latency. |
| 8 | **Reverse DNS (optional)** | Manager → VPS → *Reverse DNS* | Nice-to-have for logs; not required. |
| 9 | **Rescue mode / snapshots** | Manager → VPS → *Snapshot* / *Rescue* | Useful for recovery before you have your own backups. |

> **Key point:** OVHcloud VPS instances have **no cloud-level security group by
> default** (unlike Oracle/AWS). If the *Network Firewall* is **disabled**, the
> VPS is fully exposed and you rely entirely on the host `ufw` rules that
> `setup.sh` installs. If it is **enabled**, you must add the two allow rules
> above in the OVHcloud panel *in addition to* the host firewall.

### Minimum you must provide

At a bare minimum, to proceed you need:

1. The **public IPv4** of the VPS.
2. **SSH credentials** (user + key/password).
3. Confirmation of the **firewall mode** (OVHcloud Network Firewall on/off).

Everything else is optional or discoverable once you're logged in.

---

## Step-by-step: OVHcloud VPS setup

### 1. Order / identify the VPS

1. In the [OVHcloud Manager](https://www.ovh.com/manager/), go to
   **Bare Metal Cloud → VPS**.
2. Order a **VPS-2** (2 vCPU / 4 GB RAM / 80 GB SSD) or larger, or select an
   existing one. Choose **Ubuntu 22.04** (or 24.04) as the OS.
3. Note the **public IP** and the **SSH user** from the order email.

### 2. Configure the OVHcloud Network Firewall (if enabled)

Manager → your VPS → **Firewall** tab:

- If it shows **"Firewall disabled"**, leave it — the host `ufw` from
  `setup.sh` will handle filtering. (You may optionally enable it for
  defense-in-depth.)
- If you enable it, add exactly these rules and set the default to **deny**:

  | Priority | Action | Protocol | Port | Source |
  |----------|--------|----------|------|--------|
  | 0 | Allow | TCP | 22 | your admin IP |
  | 1 | Allow | UDP | 51820 | Firebase Functions egress IP |
  | 2 | Deny | any | any | any |

**Do not** open TCP 9200. Elasticsearch is reached only through the VPN.

### 3. Copy the repo to the VPS and run setup

```bash
# From your workstation (replace user/IP)
scp -r projects/parade/infra/elasticsearch ubuntu@<VPS_PUBLIC_IP>:~/elasticsearch

# On the VPS
ssh ubuntu@<VPS_PUBLIC_IP>
cd ~/elasticsearch
cp .env.example .env
$EDITOR .env          # set ELASTIC_PASSWORD and WG_CLIENT_PUBLIC_KEY
sudo ./setup.sh
```

`setup.sh` installs Docker, tunes the kernel, generates TLS certs, brings up
WireGuard, locks the host firewall (`ufw`), starts Elasticsearch, and prints
the connection details.

> **OVHcloud note:** If the OVHcloud Network Firewall is enabled, the host
> `ufw` rules and the panel rules are both applied — that's fine and
> intentional (defense-in-depth). Just make sure both allow SSH and WireGuard.

---

## The VPN (WireGuard)

Elasticsearch must never be exposed to the public internet. Instead of an IP
allow-list (fragile — Firebase Functions egress IPs change), we use a
**WireGuard tunnel**:

```
Firebase Function ──► WireGuard client (10.8.0.2) ══tunnel══► OVHcloud VPS (10.8.0.1) ──► Elasticsearch :9200
```

- The VPS is the WireGuard **server** (`10.8.0.1`).
- The Functions egress host is the **client** (`10.8.0.2`).
- Elasticsearch listens on the tunnel address only; the public interface is
  firewalled off.

### Client config (on the Functions egress host / laptop)

Generate a keypair. Use the two-step form — the common one-liner
`wg genkey | tee priv | wg pubkey > pub` can produce an **empty** public key
file because `tee` and `wg pubkey` race on the pipe:

```bash
priv=$(wg genkey)
echo "$priv" > ~/wg-client-private.key
printf '%s' "$priv" | wg pubkey | tee ~/wg-client-public.key
```

Put the **public** key in `.env` as `WG_CLIENT_PUBLIC_KEY` before running
`setup.sh` on the VPS. Then create `/etc/wireguard/wg0.conf` on the client:

```ini
[Interface]
Address = 10.8.0.2/24
PrivateKey = <contents of wg-client-private.key>

[Peer]
PublicKey = <WG server public key printed by setup.sh>
Endpoint = <VPS_PUBLIC_IP>:51820
AllowedIPs = 10.8.0.1/32
PersistentKeepalive = 25
```

Bring it up with `sudo wg-quick up wg0`.

> **Important:** `wg-quick` requires the **literal base64 private key** in the
> `PrivateKey` field — it does **not** accept a file path. `setup.sh` reads the
> persisted key from `/etc/wireguard/wg0.key` and embeds its value into
> `wg0.conf` (which is `chmod 600`). The key file remains the source of truth.

> **Snap/AppArmor gotcha:** if you run `wg-quick` from a terminal inside a
> **snap-packaged** app (e.g. the VS Code snap), the `snap-confine` AppArmor
> profile denies the raw netlink socket `wg` needs, and `wg-quick` **segfaults**.
> Run WireGuard commands from a normal terminal (or a TTY), not from inside the
> snap-confined VS Code.

> **Serverless caveat:** Firebase Functions (2nd gen, Cloud Run) cannot run a
> WireGuard client directly. Run the tunnel on a tiny always-on egress proxy
> (a second small OVHcloud VPS or a $3/mo box) and have Functions call
> Elasticsearch through it. The proxy holds the WireGuard client and forwards
> HTTPS to `10.8.0.1:9200`. This keeps the ES box fully private.

---

## Verifying the deployment

From the VPS (or the VPN client):

```bash
# Cluster health — expect "green" or "yellow" for a single node
curl --cacert certs/ca/ca.crt \
  -u "elastic:${ELASTIC_PASSWORD}" \
  https://10.8.0.1:9200/_cluster/health?pretty

# Container status — expect "healthy"
docker compose ps
```

The health endpoint is `GET /_cluster/health`. Firebase Functions should poll
it (or rely on the sync function's error handling) before indexing.

---

## Connecting Firebase Functions (public + mutual TLS)

Firebase Functions (Cloud Run) **cannot run a WireGuard client**, so for
serverless clients we expose the ES port publicly and gate it with **mutual
TLS (mTLS) + password auth**. A client must present a certificate signed by our
CA *and* valid credentials — a leaked password alone is not enough.

### Enable public + mTLS mode

In `.env` on the VPS:

```ini
ES_BIND_ADDRESS=0.0.0.0
ES_PUBLIC_ACCESS=true
```

Then re-run the relevant steps:

```bash
sudo ./setup.sh          # regenerates certs (incl. client cert), reopens ufw
docker compose up -d     # re-publishes the port on 0.0.0.0
```

> **Security note:** this opens `9200/tcp` to the internet. The only gate is
> mTLS + password. Keep the client key secret, rotate it if leaked, and prefer
> the VPN mode for non-serverless clients.

### Generate a client ("consumer") certificate

`setup.sh` already creates `certs/firebase-client/firebase-client.crt` and
`.key`. To mint an **additional** client cert later (e.g. a second consumer):

```bash
cd ~/dev/parade-elastic
docker run --rm -v "$PWD/certs:/certs" \
  docker.elastic.co/elasticsearch/elasticsearch:8.15.3 \
  bash -c '
    cd /usr/share/elasticsearch
    ./bin/elasticsearch-certutil cert --silent --pem \
      --ca-cert /certs/ca/ca.crt --ca-key /certs/ca/ca.key \
      --name firebase-client-2 \
      --out /certs/firebase-client-2.zip
    unzip -q /certs/firebase-client-2.zip -d /certs
    rm -f /certs/firebase-client-2.zip
  '
sudo chown -R 1000:0 certs && sudo chmod -R u+rwX,g+rwX certs
```

### Load the secrets into Firebase

Store these as **secrets** (Secret Manager), never in source:

| Secret | Value |
|--------|-------|
| `ES_NODE_URL` | `https://<VPS_PUBLIC_IP>:9200` (public mode) or `https://es.parade.internal:9200` (VPN mode) |
| `ES_USERNAME` | `elastic` |
| `ES_PASSWORD` | the value from `.env` |
| `ES_CA_CERT` | contents of `certs/ca/ca.crt` (pin this to verify the server) |
| `ES_CLIENT_CERT` | contents of `certs/firebase-client/firebase-client.crt` |
| `ES_CLIENT_KEY` | contents of `certs/firebase-client/firebase-client.key` |

```bash
# From the repo root, with the Firebase CLI logged in and a project selected:
firebase functions:secrets:set ES_PASSWORD
firebase functions:secrets:set ES_CA_CERT      < certs/ca/ca.crt
firebase functions:secrets:set ES_CLIENT_CERT  < certs/firebase-client/firebase-client.crt
firebase functions:secrets:set ES_CLIENT_KEY   < certs/firebase-client/firebase-client.key
```

In the Function, pass the client cert/key to the HTTPS agent:

```ts
import https from "https";
import { readFileSync } from "fs";

const agent = new https.Agent({
  ca: process.env.ES_CA_CERT,
  cert: process.env.ES_CLIENT_CERT,
  key: process.env.ES_CLIENT_KEY,
});
// fetch("https://<host>:9200/...", { agent, ... })
```

The sync functions in `functions/src/search/sync.ts` consume these. See the
[`functions-es-sync`](../plan/tasks/functions-es-sync.json:1) task.

---

## Operations

```bash
# Logs
docker compose logs -f elasticsearch

# Restart
docker compose restart elasticsearch

# Stop (data persists in the es-data volume)
docker compose down

# Upgrade Elasticsearch: bump the image tag, then
docker compose pull && docker compose up -d
```

### Backups

Snapshot the `es-data` volume, or use the Elasticsearch snapshot API to an
object store. At Parade's scale, a nightly `docker run --rm -v es-data:/data
alpine tar czf - /data` to object storage is sufficient. OVHcloud also offers
VPS **snapshots** in the Manager as a coarse safety net.

### Rotating the password

```bash
docker compose exec elasticsearch \
  curl -sS --cacert config/certs/ca/ca.crt -u "elastic:${OLD}" \
    -X POST https://localhost:9200/_security/user/elastic/_password \
    -H 'Content-Type: application/json' \
    -d "{\"password\":\"${NEW}\"}"
```

Then update the `ES_PASSWORD` secret used by Functions.

---

## Security checklist

- [x] TLS enabled for HTTP and transport layers.
- [x] Authentication required (`elastic` user + strong password).
- [x] Port 9200 bound to the WireGuard address (`10.8.0.1`), never the public IP.
- [x] Public access to 9200 denied by `ufw`.
- [x] OVHcloud Network Firewall (if enabled) allows only SSH + WireGuard.
- [x] Access restricted to the VPN subnet (`10.8.0.0/24`).
- [x] Secrets and certs git-ignored.
- [x] Bootstrap password rotated after first boot (done by `setup.sh`).
- [ ] Restrict SSH to `ADMIN_SSH_CIDR` in `.env` (recommended).
- [ ] Enable snapshot backups to object storage.
