# Deployment

The dashboard runs at **<https://infotool.cosite.thk.52north.org/umwelt-monitoring/>**.

## Part of the InfoTool

The dashboard has no reverse proxy and no TLS of its own. It hooks into the InfoTool deployment and runs behind its
Traefik.

- **InfoTool deployment:** server repo on remote VM
  compose project `cosite`.
- **InfoTool provides:** Traefik (`app-proxy`), TLS via Let's Encrypt (cert resolver `lets-encrypt`, entrypoint
  `websecure`, port 80 redirects to https) and the Docker network **`cosite_default`**.
- **This repo provides:** the image, the nginx configuration and the routing as Traefik labels in `compose.yml`.
  Nothing has to change in the InfoTool for this.
- **Neighbours on the same Traefik:**
    - `infotool.cosite.thk.52north.org/` → WordPress (CMS)
    - `cosite.thk.52north.org/` → GeoNode
    - `cosite.thk.52north.org/sensordata/v1.1` → STA (FROST)

## Files

| File                 | Purpose                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `compose.yml`        | service `umwelt-monitoring`, Traefik labels, network `cosite_default` as `external`                                                                                |
| `Dockerfile`         | build with Node 24 and pnpm from `packageManager` (`package.json`), then `dist/www` to `/usr/share/nginx/html/umwelt-monitoring` in the `nginx-unprivileged` image |
| `.dockerignore`      | keeps `node_modules`, `dist` and `.git` out of the build context                                                                                                   |
| `nginx_default.conf` | serves under `/umwelt-monitoring/` (port 8080), redirect to the trailing slash, proxy for services without CORS                                                    |

## Start and update

Prerequisite: the InfoTool is running, so the network exists.

```sh
docker network ls | grep cosite_default
```

Start and every update, in the checkout of this repo on the server VM:

```sh
git pull
docker compose up -d --build
```

- `up -d --build` rebuilds the image and replaces the running container. A `down` beforehand is not needed. Traefik
  picks up the new container by itself; the downtime lasts only until nginx has started.
- The build runs inside the container (`pnpm install`, `vite build`) and takes a few minutes. The server needs
  access to Docker Hub and the npm registry.
- `docker compose down` stops only the dashboard. `cosite_default` is `external` and stays; the InfoTool is not
  affected.
- Logs: `docker compose logs -f`. Status: `docker compose ps`.

Check:

```sh
curl -I https://infotool.cosite.thk.52north.org/umwelt-monitoring       # 301, Location: /umwelt-monitoring/
curl -I https://infotool.cosite.thk.52north.org/umwelt-monitoring/      # 200
curl -I https://infotool.cosite.thk.52north.org/umwelt-monitoring/proxy/leverkusen/application.jsp   # 404
curl -I https://infotool.cosite.thk.52north.org/                        # WordPress still reachable
```

Then check in the browser that the map, the Leverkusen layers and the STA sensors load.

Locally without Traefik:

```sh
docker build -t umwelt-monitoring .
docker run --rm -p 8081:8080 umwelt-monitoring
# http://localhost:8081/umwelt-monitoring/
```

`docker compose up` does not work locally, because `cosite_default` only exists on the server.

## Sub-path `/umwelt-monitoring`

- The path appears in **three places**: the COPY target in the `Dockerfile`, `nginx_default.conf` and the router
  rule in `compose.yml`. **Changing it means changing all three.**
- The app loads everything relatively (`base: "./"` in `vite.config.ts`, `./config/dataLayers.json`, `./proxy/...`).
  The Dockerfile must therefore not pass `--base` to `pnpm build`, otherwise the assets load from the wrong path
  (with `--base /` they end up at WordPress).
- Without the trailing slash, relative URLs resolve against `/`. nginx therefore redirects `/umwelt-monitoring` to
  `/umwelt-monitoring/`. `absolute_redirect off` makes the `Location` header relative, so host and scheme (https)
  come from the browser and not from the container.
- Unknown paths under `/umwelt-monitoring/` return `index.html` (SPA fallback).

## Routing in Traefik

```text
Host(`infotool.cosite.thk.52north.org`) && PathPrefix(`/umwelt-monitoring`)   → port 8080, websecure, lets-encrypt
```

- Without an explicit `priority`, Traefik picks the **longer rule**. The dashboard rule is longer than the CMS rule
  (``Host(...) && PathPrefix(`/`)``) and therefore wins. Without `Host(...)` it would be shorter and WordPress would
  catch everything. In that case the router needs a `priority`.
- Router and service names (`umwelt-monitoring`) must be unique across all compose projects on the same Traefik.
- `exposedbydefault=false`: without `traefik.enable=true`, Traefik ignores the container.
- No `ports` in `compose.yml`: Traefik reaches the container via `cosite_default`.

## Proxy for services without CORS

The browser calls services without `Access-Control-Allow-Origin` (currently the Geoportal Leverkusen) through nginx,
i.e. from the same origin as the dashboard. Background:
[DashboardWiring.md](./DashboardWiring.md#proxy-for-services-without-cors).

```nginx
location = /umwelt-monitoring/proxy/leverkusen/GCGisService {
    proxy_pass https://geoportal.leverkusen.de/GCGisService;
    proxy_ssl_server_name on;
}
location /umwelt-monitoring/proxy/ {
    return 404;
}
```

Pitfalls:

- **Exact endpoints only:** only what `dataLayers.json` uses is exposed (`location =`). A prefix such as
  `location /umwelt-monitoring/proxy/leverkusen/` would pass through the whole host, e.g. `application.jsp`.
- **New endpoint, two places:** its own `location` in `nginx_default.conf` and, if not yet covered, an entry in
  `SERVICE_PROXIES` (`vite.config.ts`). Locally everything then works, because Vite forwards the whole host, but not
  in production. So test in the Docker image as well.
- **404 for the rest:** without the `return 404` block, other proxy paths fall into the SPA fallback and return
  `index.html` with status 200. That looks like an open proxy.
- **Never take the target from the request:** host and path are fixed in the configuration, otherwise it is an open
  proxy.
- **`proxy_ssl_server_name on`:** without SNI the target server returns the wrong certificate and the handshake
  fails.
- **Custom WMS** (temporary, added by users) do not go through the proxy. Services without CORS cannot be used
  there.

The STA needs no proxy: FROST sends `Access-Control-Allow-Origin: *`, and the browser loads the datastreams directly
from `cosite.thk.52north.org`.

## Configuration

- **`dataLayers.json`** is part of the image (`/usr/share/nginx/html/umwelt-monitoring/config/dataLayers.json`).
  Changes in the running container are lost on the next `up --build`. The normal way is therefore: change the file
  in the repo, `git pull`, `docker compose up -d --build`.
  If the file should be editable on the server without a new build, a bind mount of the config directory would
  still have to be added to `compose.yml` (not present at the moment):

    ```yaml
    volumes:
        - ./src/public/config:/usr/share/nginx/html/umwelt-monitoring/config:ro
    ```

    Mount the directory, not the single file: `git pull` and most editors replace the file instead of writing into
    it, and a single-file mount keeps showing the old version until the container restarts.

- **`VITE_*` variables** (`VITE_DATA_LAYERS_URL`, `VITE_SENSOR_GROUPING`, `VITE_SENSOR_GROUPING_RADIUS`) take effect
  at build time, not at runtime. They come from `.env` files in the repo root that are part of the build context.
  Environment variables on the container have no effect.
