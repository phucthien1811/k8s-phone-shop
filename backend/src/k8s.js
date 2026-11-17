// Đọc thông tin cụm (Pod, HPA) qua Kubernetes API bằng ServiceAccount của Pod.
// Quyền đọc được cấp bằng Role/RoleBinding trong k8s/20-backend.yaml (RBAC).
const fs = require('fs');
const https = require('https');

const SA_DIR = '/var/run/secrets/kubernetes.io/serviceaccount';
const inCluster = fs.existsSync(`${SA_DIR}/token`);

function k8sGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: process.env.KUBERNETES_SERVICE_HOST,
        port: process.env.KUBERNETES_SERVICE_PORT || 443,
        path,
        method: 'GET',
        ca: fs.readFileSync(`${SA_DIR}/ca.crt`),
        headers: { Authorization: `Bearer ${fs.readFileSync(`${SA_DIR}/token`, 'utf8')}` },
        timeout: 3000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode >= 400) return reject(new Error(`K8s API ${res.statusCode}: ${body.slice(0, 200)}`));
          resolve(JSON.parse(body));
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('K8s API timeout')));
    req.on('error', reject);
    req.end();
  });
}

async function clusterStatus() {
  if (!inCluster) return { inCluster: false };
  const ns = fs.readFileSync(`${SA_DIR}/namespace`, 'utf8').trim();
  const [pods, hpa] = await Promise.all([
    k8sGet(`/api/v1/namespaces/${ns}/pods`),
    k8sGet(`/apis/autoscaling/v2/namespaces/${ns}/horizontalpodautoscalers/backend`).catch(() => null),
  ]);
  return {
    inCluster: true,
    namespace: ns,
    pods: pods.items.map((p) => ({
      name: p.metadata.name,
      app: p.metadata.labels?.app || '',
      node: p.spec.nodeName || '-',
      phase: p.metadata.deletionTimestamp ? 'Terminating' : p.status.phase,
      ready: (p.status.containerStatuses || []).every((c) => c.ready),
      restarts: (p.status.containerStatuses || []).reduce((s, c) => s + c.restartCount, 0),
      startedAt: p.status.startTime || null,
      podIP: p.status.podIP || '-',
    })),
    hpa: hpa && {
      min: hpa.spec.minReplicas,
      max: hpa.spec.maxReplicas,
      targetCpu: hpa.spec.metrics?.[0]?.resource?.target?.averageUtilization ?? null,
      currentCpu: hpa.status.currentMetrics?.[0]?.resource?.current?.averageUtilization ?? null,
      currentReplicas: hpa.status.currentReplicas,
      desiredReplicas: hpa.status.desiredReplicas,
    },
  };
}

module.exports = { clusterStatus };
