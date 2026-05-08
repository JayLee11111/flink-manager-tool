(function () {
  const MODE_LOCAL = "local";
  const MODE_API = "api";
  const PARAM_MODE = "mode";
  const JOB_KEY = "flink_jobs_v1";
  const CLUSTER_KEY = "flink_clusters_v1";
  const UNKNOWN_TEXT = "未知";
  const CLUSTER_HEALTH_KEY = "flink_cluster_health_v1";

  function getMode() {
    const params = new URLSearchParams(window.location.search || "");
    const mode = String(params.get(PARAM_MODE) || "").trim().toLowerCase();
    return mode === MODE_API ? MODE_API : MODE_LOCAL;
  }

  function loadFromLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveToLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeBaseUrl(url) {
    return String(url || "").trim().replace(/\/+$/, "");
  }

  function toDurationText(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value <= 0) return UNKNOWN_TEXT;
    const total = Math.floor(value / 1000);
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const parts = [];
    if (d) parts.push(d + "d");
    if (h || d) parts.push(h + "h");
    if (m || h || d) parts.push(m + "m");
    parts.push(s + "s");
    return parts.join(" ");
  }

  function parseCheckpointTime(jobDetail) {
    const completed = Number(jobDetail && jobDetail.checkpoints && jobDetail.checkpoints.latest && jobDetail.checkpoints.latest.completed && jobDetail.checkpoints.latest.completed.latest_ack_timestamp);
    if (Number.isFinite(completed) && completed > 0) return completed;
    const restored = Number(jobDetail && jobDetail.checkpoints && jobDetail.checkpoints.latest && jobDetail.checkpoints.latest.restored && jobDetail.checkpoints.latest.restored.timestamp);
    if (Number.isFinite(restored) && restored > 0) return restored;
    return null;
  }

  function toRealtimeFallback() {
    return {
      status: UNKNOWN_TEXT,
      startTime: UNKNOWN_TEXT,
      uptime: UNKNOWN_TEXT,
      checkpointTime: UNKNOWN_TEXT,
      realtimeError: true
    };
  }

  function mergeJobRealtime(job, realtime) {
    return Object.assign({}, job, {
      realtime: realtime,
      status: realtime.status || UNKNOWN_TEXT,
      startTime: realtime.startTime || UNKNOWN_TEXT,
      uptime: realtime.uptime || UNKNOWN_TEXT,
      checkpointTime: realtime.checkpointTime || UNKNOWN_TEXT
    });
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP_" + res.status);
    return res.json();
  }

  async function loadJobsWithRealtimeFromApi() {
    const jobs = loadFromLocal(JOB_KEY);
    const clusters = loadFromLocal(CLUSTER_KEY);
    const clusterMap = {};
    clusters.forEach((c) => {
      const name = c && c.name;
      if (!name) return;
      clusterMap[name] = c;
    });

    const now = Date.now();
    const merged = await Promise.all(jobs.map(async (job) => {
      const cluster = clusterMap[job.cluster];
      const base = normalizeBaseUrl(cluster && cluster.url);
      const flinkJobId = (job.params && (job.params["job-id"] || job.params["jobId"] || job.params["flink-job-id"])) || job.flinkJobId || "";
      if (!base || !flinkJobId) return mergeJobRealtime(job, toRealtimeFallback());

      try {
        const detail = await fetchJson(base + "/jobs/" + encodeURIComponent(flinkJobId));
        const state = String(detail && detail.state || "").toUpperCase() || UNKNOWN_TEXT;
        const start = Number(detail && detail.start_time);
        const startTime = Number.isFinite(start) && start > 0 ? new Date(start).toLocaleString("zh-CN") : UNKNOWN_TEXT;
        const uptime = Number.isFinite(start) && start > 0 ? toDurationText(now - start) : UNKNOWN_TEXT;
        const checkpointTs = parseCheckpointTime(detail);
        const checkpointTime = checkpointTs ? new Date(checkpointTs).toLocaleString("zh-CN") : UNKNOWN_TEXT;

        return mergeJobRealtime(job, {
          status: state,
          startTime,
          uptime,
          checkpointTime,
          realtimeError: false
        });
      } catch (_) {
        return mergeJobRealtime(job, toRealtimeFallback());
      }
    }));

    return merged;
  }

  async function checkClusterConnectivity(cluster) {
    const base = normalizeBaseUrl(cluster && cluster.url);
    const checkedAt = Date.now();
    if (!base) {
      return {
        status: UNKNOWN_TEXT,
        checkedAt,
        error: "EMPTY_URL"
      };
    }

    try {
      await fetchJson(base + "/overview");
      return {
        status: "在线",
        checkedAt,
        error: ""
      };
    } catch (err) {
      return {
        status: "离线",
        checkedAt,
        error: err && err.message ? String(err.message) : "CHECK_FAILED"
      };
    }
  }

  async function checkClustersConnectivity(clusters) {
    const list = Array.isArray(clusters) ? clusters : loadFromLocal(CLUSTER_KEY);
    const resultMap = {};

    await Promise.all(list.map(async (item) => {
      const name = item && item.name;
      if (!name) return;
      resultMap[name] = await checkClusterConnectivity(item);
    }));

    saveToLocal(CLUSTER_HEALTH_KEY, resultMap);
    return resultMap;
  }

  function loadFromApi(key) {
    if (key === JOB_KEY) return loadJobsWithRealtimeFromApi();
    return loadFromLocal(key);
  }

  function saveToApi(key, value) {
    return saveToLocal(key, value);
  }

  function load(key) {
    const mode = getMode();
    if (mode === MODE_API) return loadFromApi(key);
    return loadFromLocal(key);
  }

  function save(key, value) {
    const mode = getMode();
    if (mode === MODE_API) return saveToApi(key, value);
    return saveToLocal(key, value);
  }

  window.DataAccess = {
    MODE_LOCAL,
    MODE_API,
    getMode,
    load,
    save,
    UNKNOWN_TEXT,
    CLUSTER_HEALTH_KEY,
    checkClusterConnectivity,
    checkClustersConnectivity
  };
})();
