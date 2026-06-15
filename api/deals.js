export const config = { runtime: 'nodejs' };

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const SECRET = process.env.AUTH_SECRET || 'gioia2026';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const url = req.url || '';

  // Rota de login
  if (url.includes('/api/auth')) {
    if (req.method !== 'POST') return res.status(405).end();
    let body = '';
    for await (const chunk of req) body += chunk;
    const { user, pass } = JSON.parse(body || '{}');
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      return res.status(200).json({ token: SECRET });
    }
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Verificar token em todas as outras rotas
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${SECRET}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const TOKEN = process.env.RD_TOKEN;
  const PIPELINE_ID = process.env.RD_PIPELINE_ID;
  const BASE = 'https://crm.rdstation.com/api/v1';

  try {
    const [openRes, wonRes, lostRes] = await Promise.all([
      fetch(`${BASE}/deals?token=${TOKEN}&deal_pipeline_id=${PIPELINE_ID}&limit=200`),
      fetch(`${BASE}/deals?token=${TOKEN}&deal_pipeline_id=${PIPELINE_ID}&limit=200&win=true`),
      fetch(`${BASE}/deals?token=${TOKEN}&deal_pipeline_id=${PIPELINE_ID}&limit=200&win=false`),
    ]);

    const [openData, wonData, lostData] = await Promise.all([
      openRes.json(), wonRes.json(), lostRes.json(),
    ]);

    const mapDeal = d => ({
      id: d._id,
      name: d.name,
      stage: d.deal_stage?.name || 'Sem etapa',
      last_activity_at: d.last_activity_at,
      created_at: d.created_at,
      closed_at: d.closed_at,
      user: d.user?.name || '—',
      win: d.win,
      amount_total: d.amount_total || 0,
      interactions: d.interactions || 0,
      loss_reason: d.deal_lost_reason?.name || null,
      source: d.lead_source || d.source || 'Não informado',
    });

    const allDeals = [...(openData.deals||[]), ...(wonData.deals||[]), ...(lostData.deals||[])];
    const gioiaDealIds = new Set(allDeals.map(d => d._id));

    let allTasks = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 10) {
      const tRes = await fetch(`${BASE}/tasks?token=${TOKEN}&limit=200&page=${page}`);
      const tData = await tRes.json();
      const batch = (tData.tasks || []).filter(t => gioiaDealIds.has(t.deal_id));
      allTasks = allTasks.concat(batch);
      hasMore = tData.has_more;
      page++;
    }

    const tasks = allTasks.map(t => ({
      id: t._id,
      subject: t.subject,
      type: t.type,
      done: t.done,
      done_date: t.done_date,
      created_at: t.created_at,
      deal_id: t.deal_id,
      status: t.status,
    }));

    const openDeals = (openData.deals || []).filter(d => d.win === null || d.win === undefined);

    res.status(200).json({
      open: openDeals.map(mapDeal),
      open_total: openDeals.length,
      won: (wonData.deals || []).map(mapDeal),
      won_total: wonData.total,
      lost: (lostData.deals || []).map(mapDeal),
      lost_total: lostData.total,
      tasks,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
